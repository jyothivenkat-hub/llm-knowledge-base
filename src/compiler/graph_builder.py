"""Knowledge graph builder — chunks raw sources into claims, connects, clusters, enriches."""

from __future__ import annotations

import json
import logging
import shutil
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from ..config import Config
from ..llm import LLM
from ..utils import parse_llm_json, slugify, ensure_dir

logger = logging.getLogger(__name__)


def build_graph(
    config: Config,
    llm: LLM,
    source_texts: Dict[str, Dict],
    progress_callback: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """Build the full knowledge graph from raw source texts.

    Pipeline:
    1. Chunk each source into atomic claims → save as wiki/claims/*.md
    2. Connect claims across sources
    3. Cluster into themes
    4. Enrich with insights
    5. Save graph.json

    Args:
        source_texts: {path: {title, text, source_url}} from compiler
    """
    def progress(msg: str):
        logger.info(msg)
        if progress_callback:
            progress_callback(msg)

    if not source_texts:
        progress("No sources to process.")
        return {"claims": 0, "edges": 0, "clusters": 0}

    # ── Stage 1: Chunk into atomic claims ──────────────────
    progress("Graph 1/5: Chunking sources into atomic claims...")
    claims_dir = ensure_dir(config.wiki_path / "claims")
    # Clear old claims for full rebuild
    for old in claims_dir.glob("*.md"):
        old.unlink()

    nodes = []
    for source_path, source_data in source_texts.items():
        paper_slug = slugify(source_data["title"])[:40]
        progress(f"  Chunking: {source_data['title']}")

        try:
            # Send raw text to LLM for chunking (truncate to fit context)
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
                nodes.append(claim)

                # Save each claim as a wiki page
                _save_claim_page(claims_dir, claim)

            progress(f"    → {len(claims)} claims extracted")

        except Exception as e:
            logger.warning("Failed to chunk %s: %s", source_data["title"], e)
            progress(f"    Error chunking: {e}")

    if not nodes:
        progress("No claims extracted. Check your sources.")
        return {"claims": 0, "edges": 0, "clusters": 0}

    progress(f"  Total: {len(nodes)} claims from {len(source_texts)} sources")

    # ── Stage 2: Find connections ──────────────────────────
    progress("Graph 2/6: Finding connections across claims...")
    edges = _connect_claims(llm, nodes, progress)
    progress(f"  Found {len(edges)} connections")

    # ── Stage 3: Cluster into themes ───────────────────────
    progress("Graph 3/6: Clustering into themes...")
    clusters = _cluster_claims(llm, nodes, edges, progress)
    progress(f"  Created {len(clusters)} clusters")

    # Assign cluster to nodes
    for cluster in clusters:
        for nid in cluster.get("node_ids", []):
            for node in nodes:
                if node["id"] == nid:
                    node["cluster"] = cluster["id"]

    # Update claim wiki pages with cluster info
    for node in nodes:
        if node["cluster"]:
            _save_claim_page(claims_dir, node)

    # ── Stage 4: Enrich ────────────────────────────────────
    progress("Graph 4/6: Finding contradictions, gaps, synthesis...")
    insights = _enrich_graph(llm, nodes, edges, clusters, progress)

    # ── Stage 5: Generate product ideas ─────────────────────
    progress("Graph 5/6: Generating product ideas from insights...")
    product_ideas = _generate_product_ideas(config, llm, nodes, clusters, insights, progress)
    progress(f"  Generated {len(product_ideas)} product ideas")

    # ── Stage 6: Save ──────────────────────────────────────
    progress("Graph 6/6: Saving knowledge graph...")
    graph = {
        "nodes": nodes,
        "edges": edges,
        "clusters": clusters,
        "product_ideas": product_ideas,
        "metadata": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "total_clusters": len(clusters),
            "total_product_ideas": len(product_ideas),
            "papers_processed": len(source_texts),
            "built_at": datetime.now().isoformat(),
        },
    }

    config.graph_path.write_text(
        json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    config.graph_insights_path.write_text(
        json.dumps(insights, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    progress(f"Done: {len(nodes)} claims, {len(edges)} connections, {len(clusters)} clusters, {len(product_ideas)} product ideas")
    return {"claims": len(nodes), "edges": len(edges), "clusters": len(clusters), "ideas": len(product_ideas)}


# ─── Save claim as wiki page ────────────────────────────

def _save_claim_page(claims_dir: Path, claim: Dict):
    """Save a claim as an individual wiki markdown page."""
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


# ─── Stage 2: Connect ────────────────────────────────────

def _connect_claims(llm: LLM, nodes: List[Dict], progress: Callable) -> List[Dict]:
    """Find relationships between claims using tag-overlap batching."""
    # Build tag index
    tag_to_nodes = defaultdict(set)
    for node in nodes:
        for tag in node.get("tags", []):
            tag_to_nodes[tag.lower()].add(node["id"])

    # Find candidate pairs — must share a tag
    candidate_ids = set()
    for tag, node_ids in tag_to_nodes.items():
        ids = list(node_ids)
        for nid in ids:
            candidate_ids.add(nid)

    # Build batches of 15-20 claims
    candidates = sorted(candidate_ids)
    batch_size = 18
    batches = [candidates[i:i + batch_size] for i in range(0, len(candidates), batch_size)]
    if not batches:
        batches = [[n["id"] for n in nodes]]

    progress(f"  Processing {len(batches)} connection batches...")

    all_edges = []
    edge_id = 0
    node_map = {n["id"]: n for n in nodes}

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
                edge_id += 1
                edge["id"] = f"edge-{edge_id:04d}"
                edge.setdefault("strength", 0.5)
                edge.setdefault("relationship", "related-to")
                edge.setdefault("explanation", "")
                # Validate IDs exist
                if edge.get("source_id") in node_map and edge.get("target_id") in node_map:
                    all_edges.append(edge)

        except Exception as e:
            logger.warning("Connection batch %d failed: %s", batch_idx, e)

    return all_edges


# ─── Stage 3: Cluster ────────────────────────────────────

def _cluster_claims(llm: LLM, nodes: List[Dict], edges: List[Dict], progress: Callable) -> List[Dict]:
    """Group claims into thematic clusters."""
    try:
        # For large graphs, only send a summary to fit context
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

        # Make sure all nodes are assigned
        assigned = set()
        for c in clusters:
            for nid in c.get("node_ids", []):
                assigned.add(nid)
        unassigned = [n["id"] for n in nodes if n["id"] not in assigned]
        if unassigned:
            clusters.append({
                "id": "other",
                "label": "Other",
                "description": "Uncategorized claims",
                "node_ids": unassigned,
                "color": "#6a6a82",
            })

        return clusters

    except Exception as e:
        logger.warning("Clustering failed: %s. Using tag-based fallback.", e)
        return _fallback_cluster(nodes)


def _fallback_cluster(nodes: List[Dict]) -> List[Dict]:
    """Simple tag-based clustering as fallback."""
    tag_groups = defaultdict(list)
    for node in nodes:
        tag = node.get("tags", ["general"])[0] if node.get("tags") else "general"
        tag_groups[tag].append(node["id"])

    colors = ["#7c83ff", "#4ade80", "#fbbf24", "#f87171", "#38bdf8",
              "#c084fc", "#fb923c", "#34d399", "#f472b6", "#a78bfa"]

    return [
        {
            "id": slugify(tag),
            "label": tag.replace("-", " ").title(),
            "description": f"Claims related to {tag}",
            "node_ids": nids,
            "color": colors[i % len(colors)],
        }
        for i, (tag, nids) in enumerate(tag_groups.items())
    ]


# ─── Stage 4: Enrich ─────────────────────────────────────

def _enrich_graph(
    llm: LLM, nodes: List[Dict], edges: List[Dict], clusters: List[Dict], progress: Callable
) -> Dict:
    """Find contradictions, gaps, synthesis opportunities."""
    try:
        # Limit context size
        nodes_for_prompt = nodes if len(nodes) <= 80 else nodes[:80]
        edges_for_prompt = edges if len(edges) <= 150 else edges[:150]

        response = llm.call(
            prompt="",
            template="enrich_graph.md",
            template_vars={
                "nodes": nodes_for_prompt,
                "edges": edges_for_prompt,
                "clusters": clusters,
            },
            max_tokens=4096,
        )

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

def _generate_product_ideas(
    config: Config,
    llm: LLM,
    nodes: List[Dict],
    clusters: List[Dict],
    insights: Dict,
    progress: Callable,
) -> List[Dict]:
    """Generate product ideas from the knowledge graph insights."""
    try:
        # Get top findings (highest-connected nodes or type=finding)
        findings = [n for n in nodes if n.get("type") == "finding"]
        if not findings:
            findings = nodes[:20]
        top_findings = findings[:25]

        gaps = insights.get("gaps", [])
        synthesis = insights.get("synthesis", [])
        contradictions = insights.get("contradictions", [])

        response = llm.call(
            prompt="",
            template="generate_product_ideas.md",
            template_vars={
                "clusters": clusters,
                "top_findings": top_findings,
                "gaps": gaps,
                "synthesis": synthesis,
                "contradictions": contradictions,
            },
            max_tokens=4096,
        )

        ideas = parse_llm_json(response)
        if not isinstance(ideas, list):
            ideas = ideas.get("ideas", ideas.get("product_ideas", []))

        # Add IDs
        for i, idea in enumerate(ideas):
            idea["id"] = f"idea-{i+1:02d}"

        return ideas

    except Exception as e:
        logger.warning("Product idea generation failed: %s", e)
        return []
