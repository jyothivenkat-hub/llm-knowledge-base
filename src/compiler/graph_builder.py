"""Knowledge graph builder — incremental: only process new/modified sources."""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from ..config import Config
from ..llm import LLM
from ..utils import parse_llm_json, slugify, ensure_dir

logger = logging.getLogger(__name__)


def build_graph(
    config: Config,
    llm: LLM,
    source_texts: Dict[str, Dict],
    full: bool = False,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """Build or update the knowledge graph incrementally.

    If graph.json exists and full=False, only processes new/modified sources:
    - Preserves existing claims from unchanged papers
    - Chunks only new papers
    - Finds connections only for new claims
    - Updates clusters and insights

    Args:
        source_texts: {path: {title, text, source_url}} — only new/modified sources
        full: If True, rebuild everything from scratch
    """
    def progress(msg: str):
        logger.info(msg)
        if progress_callback:
            progress_callback(msg)

    if not source_texts:
        progress("No sources to process.")
        # Return existing stats if graph exists
        if config.graph_path.exists():
            graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
            m = graph.get("metadata", {})
            return {"claims": m.get("total_nodes", 0), "edges": m.get("total_edges", 0),
                    "clusters": m.get("total_clusters", 0), "ideas": m.get("total_product_ideas", 0)}
        return {"claims": 0, "edges": 0, "clusters": 0, "ideas": 0}

    claims_dir = ensure_dir(config.wiki_path / "claims")

    # ── Load existing graph ────────────────────────────────
    existing_nodes = []
    existing_edges = []
    existing_clusters = []
    existing_ideas = []

    if not full and config.graph_path.exists():
        progress("Loading existing graph...")
        old_graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
        existing_nodes = old_graph.get("nodes", [])
        existing_edges = old_graph.get("edges", [])
        existing_clusters = old_graph.get("clusters", [])
        existing_ideas = old_graph.get("product_ideas", [])
        progress(f"  Existing: {len(existing_nodes)} claims, {len(existing_edges)} edges, {len(existing_clusters)} clusters")

    # ── Identify what's new vs modified ────────────────────
    new_source_paths = set(source_texts.keys())

    # Find which existing nodes belong to sources being reprocessed
    stale_node_ids = set()
    preserved_nodes = []
    for node in existing_nodes:
        if node.get("source_paper", "") in new_source_paths:
            stale_node_ids.add(node["id"])
        else:
            preserved_nodes.append(node)

    # Remove stale edges (involve stale nodes)
    preserved_edges = [
        e for e in existing_edges
        if e.get("source_id") not in stale_node_ids and e.get("target_id") not in stale_node_ids
    ]

    # Delete stale claim wiki pages
    for nid in stale_node_ids:
        claim_file = claims_dir / f"{nid}.md"
        if claim_file.exists():
            claim_file.unlink()

    if full:
        # Full rebuild — clear everything
        for old in claims_dir.glob("*.md"):
            old.unlink()
        preserved_nodes = []
        preserved_edges = []
        existing_clusters = []

    progress(f"  Preserved: {len(preserved_nodes)} claims, {len(preserved_edges)} edges")
    progress(f"  Removed: {len(stale_node_ids)} stale claims")

    # ── Stage 1: Chunk ONLY new sources ────────────────────
    progress("Graph 1/6: Chunking new sources...")
    new_nodes = []
    for source_path, source_data in source_texts.items():
        paper_slug = slugify(source_data["title"])[:40]
        progress(f"  Chunking: {source_data['title']}")

        try:
            text_for_llm = source_data["text"][:8000]
            response = llm.call(
                prompt="",
                template="chunk_claims.md",
                template_vars={
                    "title": source_data["title"],
                    "source_path": source_path,
                    "content": text_for_llm,
                },
            )

            claims = parse_llm_json(response)
            if not isinstance(claims, list):
                claims = claims.get("claims", [])

            for i, claim in enumerate(claims):
                claim_id = f"{paper_slug}-{i+1:03d}"
                claim["id"] = claim_id
                claim["source_paper"] = source_path
                claim["source_title"] = source_data["title"]
                claim.setdefault("cluster", "")
                claim.setdefault("tags", [])
                claim.setdefault("type", "claim")
                claim.setdefault("evidence", "")
                new_nodes.append(claim)
                _save_claim_page(claims_dir, claim)

            progress(f"    -> {len(claims)} claims extracted")

        except Exception as e:
            logger.warning("Failed to chunk %s: %s", source_data["title"], e)
            progress(f"    Error: {e}")

    if not new_nodes and not preserved_nodes:
        progress("No claims. Check your sources.")
        return {"claims": 0, "edges": 0, "clusters": 0, "ideas": 0}

    # Merge: all nodes = preserved + new
    all_nodes = preserved_nodes + new_nodes
    new_node_ids = {n["id"] for n in new_nodes}
    progress(f"  Total: {len(all_nodes)} claims ({len(preserved_nodes)} preserved + {len(new_nodes)} new)")

    # ── Stage 2: Find connections (only involving new nodes) ──
    progress("Graph 2/7: Finding connections for new claims...")
    new_edges = _connect_new_claims(llm, all_nodes, new_node_ids, progress)
    all_edges = preserved_edges + new_edges
    progress(f"  Connections: {len(all_edges)} total ({len(preserved_edges)} preserved + {len(new_edges)} new)")

    # ── Stage 3: Update clusters ───────────────────────────
    progress("Graph 3/7: Updating clusters...")
    clusters = _update_clusters(llm, all_nodes, all_edges, existing_clusters, new_node_ids, progress)
    progress(f"  {len(clusters)} clusters")

    # Assign cluster to all nodes
    for cluster in clusters:
        for nid in cluster.get("node_ids", []):
            for node in all_nodes:
                if node["id"] == nid:
                    node["cluster"] = cluster["id"]

    # Update claim pages with cluster info for new nodes
    for node in new_nodes:
        if node["cluster"]:
            _save_claim_page(claims_dir, node)

    # ── Stage 4: Generate/update entity pages ────────────────
    progress("Graph 4/7: Updating entity pages...")
    entities_dir = ensure_dir(config.wiki_path / "entities")
    entity_count = _update_entity_pages(config, llm, all_nodes, entities_dir, progress)
    progress(f"  {entity_count} entity pages")

    # ── Stage 5: Enrich ────────────────────────────────────
    progress("Graph 5/7: Analyzing insights...")
    insights = _enrich_graph(llm, all_nodes, all_edges, clusters, progress)

    # ── Stage 6: Product ideas ─────────────────────────────
    progress("Graph 6/7: Generating product ideas...")
    product_ideas = _generate_product_ideas(config, llm, all_nodes, clusters, insights, progress)
    progress(f"  {len(product_ideas)} product ideas")

    # ── Stage 7: Save ──────────────────────────────────────
    progress("Graph 7/7: Saving graph...")
    # Count total papers from all nodes
    all_papers = set(n.get("source_paper", "") for n in all_nodes)

    graph = {
        "nodes": all_nodes,
        "edges": all_edges,
        "clusters": clusters,
        "product_ideas": product_ideas,
        "metadata": {
            "total_nodes": len(all_nodes),
            "total_edges": len(all_edges),
            "total_clusters": len(clusters),
            "total_product_ideas": len(product_ideas),
            "papers_processed": len(all_papers),
            "built_at": datetime.now().isoformat(),
            "last_update": {
                "new_papers": len(source_texts),
                "new_claims": len(new_nodes),
                "new_edges": len(new_edges),
                "preserved_claims": len(preserved_nodes),
                "preserved_edges": len(preserved_edges),
            },
        },
    }

    config.graph_path.write_text(json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8")
    config.graph_insights_path.write_text(json.dumps(insights, indent=2, ensure_ascii=False), encoding="utf-8")

    # ── Append to log ──────────────────────────────────────
    _append_log(config, source_texts, new_nodes, new_edges, clusters)

    progress(f"Done: {len(all_nodes)} claims ({len(new_nodes)} new), {len(all_edges)} connections, {len(clusters)} clusters")
    return {"claims": len(all_nodes), "edges": len(all_edges), "clusters": len(clusters), "ideas": len(product_ideas)}


# ─── Save claim as wiki page ────────────────────────────

def _save_claim_page(claims_dir: Path, claim: Dict):
    claim_path = claims_dir / f"{claim['id']}.md"
    cluster_line = f"cluster: \"{claim.get('cluster', '')}\"\n" if claim.get("cluster") else ""
    tags_str = ", ".join(f'"{t}"' for t in claim.get("tags", []))

    md = f"""---
id: "{claim['id']}"
type: "{claim.get('type', 'claim')}"
source: "{claim.get('source_paper', '')}"
source_title: "{claim.get('source_title', '')}"
{cluster_line}tags: [{tags_str}]
---

# {claim.get('text', '')}

**Type:** {claim.get('type', 'claim')}
**Source:** {claim.get('source_title', '')}
**Evidence:** {claim.get('evidence', '')}

## Tags
{chr(10).join(f'- [[{t}]]' for t in claim.get('tags', []))}
"""
    claim_path.write_text(md, encoding="utf-8")


# ─── Stage 2: Connect (only new nodes) ──────────────────

def _connect_new_claims(
    llm: LLM, all_nodes: List[Dict], new_node_ids: Set[str], progress: Callable
) -> List[Dict]:
    """Find connections only for new nodes — pair them with ALL existing nodes."""
    if not new_node_ids:
        return []

    node_map = {n["id"]: n for n in all_nodes}

    # Build tag index across ALL nodes
    tag_to_nodes = defaultdict(set)
    for node in all_nodes:
        for tag in node.get("tags", []):
            tag_to_nodes[tag.lower()].add(node["id"])

    # Find candidate nodes that share tags with new nodes
    candidates_for_batching = set(new_node_ids)  # always include new nodes
    for node in all_nodes:
        if node["id"] in new_node_ids:
            for tag in node.get("tags", []):
                # Include old nodes that share tags with new nodes
                for related_id in tag_to_nodes.get(tag.lower(), set()):
                    candidates_for_batching.add(related_id)

    # Build batches — each batch MUST contain at least 1 new node
    candidates = sorted(candidates_for_batching)
    batch_size = 18
    batches = []
    for i in range(0, len(candidates), batch_size):
        batch = candidates[i:i + batch_size]
        # Only process if batch has at least 1 new node
        if any(nid in new_node_ids for nid in batch) and len(batch) >= 2:
            batches.append(batch)

    if not batches:
        # Fallback: batch all new nodes together
        batches = [sorted(new_node_ids)]

    progress(f"  Processing {len(batches)} batches (only new claims + related)...")

    all_edges = []
    edge_id_start = 0
    # Find max existing edge ID to continue numbering
    try:
        if any(True for _ in []):
            pass
    except Exception:
        pass

    for batch_idx, batch_ids in enumerate(batches):
        batch_nodes = [node_map[nid] for nid in batch_ids if nid in node_map]
        if len(batch_nodes) < 2:
            continue

        try:
            response = llm.call(
                prompt="",
                template="connect_claims.md",
                template_vars={"claims": batch_nodes},
            )

            edges = parse_llm_json(response)
            if not isinstance(edges, list):
                edges = edges.get("edges", edges.get("relationships", []))

            for edge in edges:
                edge_id_start += 1
                edge["id"] = f"edge-new-{edge_id_start:04d}"
                edge.setdefault("strength", 0.5)
                edge.setdefault("relationship", "related-to")
                edge.setdefault("explanation", "")
                if edge.get("source_id") in node_map and edge.get("target_id") in node_map:
                    all_edges.append(edge)

        except Exception as e:
            logger.warning("Connection batch %d failed: %s", batch_idx, e)

    return all_edges


# ─── Stage 3: Update Clusters ───────────────────────────

def _update_clusters(
    llm: LLM,
    all_nodes: List[Dict],
    all_edges: List[Dict],
    existing_clusters: List[Dict],
    new_node_ids: Set[str],
    progress: Callable,
) -> List[Dict]:
    """Update clusters incrementally — assign new nodes to existing or new clusters."""
    if not new_node_ids or not existing_clusters:
        # No existing clusters or no new nodes — full cluster
        return _full_cluster(llm, all_nodes, all_edges, progress)

    # Ask LLM to assign new nodes to existing clusters (or create new ones)
    new_nodes = [n for n in all_nodes if n["id"] in new_node_ids]

    cluster_summary = "\n".join(
        f"- {c['id']}: {c.get('label', '')} — {c.get('description', '')[:100]}"
        for c in existing_clusters
    )

    prompt = f"""You are updating clusters in a knowledge graph. There are existing clusters and new claims to assign.

EXISTING CLUSTERS:
{cluster_summary}

NEW CLAIMS TO ASSIGN:
"""
    for n in new_nodes[:50]:
        prompt += f"[{n['id']}] ({n.get('type', 'claim')}): \"{n['text']}\"\n  Tags: {', '.join(n.get('tags', []))}\n"

    prompt += """
For each new claim, assign it to the BEST existing cluster. If a claim doesn't fit any existing cluster, create a new cluster for it.

Return JSON:
{
  "assignments": {"claim-id": "cluster-id", ...},
  "new_clusters": [
    {"id": "slug", "label": "Name", "description": "...", "color": "#hex"}
  ]
}
"""

    try:
        response = llm.call(prompt=prompt, max_tokens=4096)
        result = parse_llm_json(response)

        assignments = result.get("assignments", {})
        new_cluster_defs = result.get("new_clusters", [])

        # Update existing clusters with new nodes
        updated_clusters = []
        for cluster in existing_clusters:
            c = dict(cluster)
            node_ids = list(c.get("node_ids", []))
            for nid, cid in assignments.items():
                if cid == c["id"]:
                    node_ids.append(nid)
            c["node_ids"] = node_ids
            updated_clusters.append(c)

        # Add new clusters
        for nc in new_cluster_defs:
            nc_node_ids = [nid for nid, cid in assignments.items() if cid == nc["id"]]
            nc["node_ids"] = nc_node_ids
            updated_clusters.append(nc)

        # Catch unassigned
        all_assigned = set()
        for c in updated_clusters:
            all_assigned.update(c.get("node_ids", []))
        unassigned = [nid for nid in new_node_ids if nid not in all_assigned]
        if unassigned:
            # Add to "other" cluster or create one
            other = next((c for c in updated_clusters if c["id"] == "other"), None)
            if other:
                other["node_ids"].extend(unassigned)
            else:
                updated_clusters.append({
                    "id": "other", "label": "Other",
                    "description": "Uncategorized claims",
                    "node_ids": unassigned, "color": "#6a6a82",
                })

        return updated_clusters

    except Exception as e:
        logger.warning("Incremental clustering failed: %s. Falling back to full cluster.", e)
        return _full_cluster(llm, all_nodes, all_edges, progress)


def _full_cluster(llm: LLM, nodes: List[Dict], edges: List[Dict], progress: Callable) -> List[Dict]:
    """Full rebuild clustering (fallback)."""
    try:
        nodes_for_prompt = nodes if len(nodes) <= 100 else nodes[:100]
        edges_for_prompt = edges if len(edges) <= 200 else edges[:200]

        response = llm.call(
            prompt="",
            template="cluster_claims.md",
            template_vars={"nodes": nodes_for_prompt, "edges": edges_for_prompt},
            max_tokens=4096,
        )

        result = parse_llm_json(response)
        clusters = result.get("clusters", result) if isinstance(result, dict) else result
        if not isinstance(clusters, list):
            clusters = [clusters]

        assigned = set()
        for c in clusters:
            for nid in c.get("node_ids", []):
                assigned.add(nid)
        unassigned = [n["id"] for n in nodes if n["id"] not in assigned]
        if unassigned:
            clusters.append({"id": "other", "label": "Other", "description": "Uncategorized",
                            "node_ids": unassigned, "color": "#6a6a82"})
        return clusters

    except Exception as e:
        logger.warning("Clustering failed: %s", e)
        return _fallback_cluster(nodes)


def _fallback_cluster(nodes: List[Dict]) -> List[Dict]:
    tag_groups = defaultdict(list)
    for node in nodes:
        tag = node.get("tags", ["general"])[0] if node.get("tags") else "general"
        tag_groups[tag].append(node["id"])
    colors = ["#7c83ff", "#4ade80", "#fbbf24", "#f87171", "#38bdf8",
              "#c084fc", "#fb923c", "#34d399", "#f472b6", "#a78bfa"]
    return [{"id": slugify(tag), "label": tag.replace("-", " ").title(),
             "description": f"Claims about {tag}", "node_ids": nids,
             "color": colors[i % len(colors)]}
            for i, (tag, nids) in enumerate(tag_groups.items())]


# ─── Stage 4: Entity Pages ───────────────────────────────

def _update_entity_pages(
    config: Config, llm: LLM, nodes: List[Dict], entities_dir: Path, progress: Callable
) -> int:
    """Generate or update entity pages — synthesis pages that evolve across papers.

    Finds the most common tags across claims and creates a page for each major entity.
    Existing pages get updated with new claims, not rewritten from scratch.
    """
    from ..utils import read_markdown

    # Count tag frequency across all claims
    tag_counts = defaultdict(list)
    for node in nodes:
        for tag in node.get("tags", []):
            tag_counts[tag.lower()].append(node)

    # Only create entity pages for tags with 3+ claims
    entities_to_generate = {
        tag: claims for tag, claims in tag_counts.items()
        if len(claims) >= 3
    }

    if not entities_to_generate:
        return 0

    count = 0
    for entity_tag, entity_claims in sorted(entities_to_generate.items(), key=lambda x: -len(x[1])):
        entity_name = entity_tag.replace("-", " ").title()
        entity_path = entities_dir / f"{slugify(entity_tag)}.md"

        # Load existing content if page already exists
        existing_content = ""
        if entity_path.exists():
            existing_content = read_markdown(entity_path)

        # Get unique source papers
        source_papers = set(c.get("source_title", "") for c in entity_claims)
        claim_ids = ", ".join(f'"{c["id"]}"' for c in entity_claims)

        progress(f"  Entity: {entity_name} ({len(entity_claims)} claims from {len(source_papers)} papers)")

        try:
            article = llm.call(
                prompt="",
                template="generate_entity.md",
                template_vars={
                    "entity_name": entity_name,
                    "claims": entity_claims[:20],
                    "existing_content": existing_content[:2000] if existing_content else "",
                    "claim_ids": claim_ids,
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "source_count": len(source_papers),
                },
            )

            entity_path.write_text(article, encoding="utf-8")
            count += 1

        except Exception as e:
            logger.warning("Entity page failed for %s: %s", entity_name, e)

    return count


# ─── Stage 5: Enrich ─────────────────────────────────────

def _enrich_graph(llm: LLM, nodes: List[Dict], edges: List[Dict], clusters: List[Dict], progress: Callable) -> Dict:
    try:
        nodes_for_prompt = nodes if len(nodes) <= 80 else nodes[:80]
        edges_for_prompt = edges if len(edges) <= 150 else edges[:150]
        response = llm.call(prompt="", template="enrich_graph.md",
            template_vars={"nodes": nodes_for_prompt, "edges": edges_for_prompt, "clusters": clusters},
            max_tokens=4096)
        insights = parse_llm_json(response)
        c = len(insights.get("contradictions", []))
        g = len(insights.get("gaps", []))
        s = len(insights.get("synthesis", []))
        progress(f"  {c} contradictions, {g} gaps, {s} synthesis opportunities")
        return insights
    except Exception as e:
        logger.warning("Enrichment failed: %s", e)
        return {"contradictions": [], "gaps": [], "synthesis": [], "bridges": [], "key_questions": []}


# ─── Stage 5: Product Ideas ──────────────────────────────

def _generate_product_ideas(config: Config, llm: LLM, nodes: List[Dict], clusters: List[Dict], insights: Dict, progress: Callable) -> List[Dict]:
    try:
        findings = [n for n in nodes if n.get("type") == "finding"]
        if not findings:
            findings = nodes[:20]
        response = llm.call(prompt="", template="generate_product_ideas.md",
            template_vars={"clusters": clusters, "top_findings": findings[:25],
                          "gaps": insights.get("gaps", []), "synthesis": insights.get("synthesis", []),
                          "contradictions": insights.get("contradictions", [])},
            max_tokens=4096)
        ideas = parse_llm_json(response)
        if not isinstance(ideas, list):
            ideas = ideas.get("ideas", ideas.get("product_ideas", []))
        for i, idea in enumerate(ideas):
            idea["id"] = f"idea-{i+1:02d}"
        return ideas
    except Exception as e:
        logger.warning("Product ideas failed: %s", e)
        return []


# ─── Log ──────────────────────────────────────────────────

def _append_log(config: Config, source_texts: Dict, new_nodes: List[Dict], new_edges: List[Dict], clusters: List[Dict]):
    """Append an entry to wiki/log.md."""
    log_path = config.wiki_path / "log.md"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    papers = ", ".join(d["title"] for d in source_texts.values())

    entry = f"""## [{timestamp}] compile | {len(source_texts)} source(s)
- Papers: {papers}
- New claims: {len(new_nodes)}
- New connections: {len(new_edges)}
- Clusters: {len(clusters)}

"""
    if log_path.exists():
        existing = log_path.read_text(encoding="utf-8")
        log_path.write_text(existing + entry, encoding="utf-8")
    else:
        header = "# Knowledge Base Log\n\nChronological record of all compile actions.\n\n"
        log_path.write_text(header + entry, encoding="utf-8")
