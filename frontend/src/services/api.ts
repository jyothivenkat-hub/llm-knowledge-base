/**
 * API service — replaces Gemini with our Flask backend.
 * All calls go to the Flask API at /api/*
 */

import { AppState, AtomicClaim, Concept, ProductIdea, ResearchSource } from '../types';

const API_BASE = '';  // Same origin, proxied by Vite in dev

// ─── Load state from backend ────────────────────────────

export async function loadState(): Promise<AppState> {
  const [modeRes, graphRes] = await Promise.all([
    fetch(`${API_BASE}/api/mode`),
    fetch(`${API_BASE}/api/graph`),
  ]);

  const mode = await modeRes.json();
  const graph = await graphRes.json();

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const clusters = graph.clusters || [];
  const ideas = graph.product_ideas || [];

  // Convert graph nodes to claims
  const claims: AtomicClaim[] = nodes.map((n: any) => ({
    id: n.id,
    sourceId: n.source_paper || '',
    text: n.text || '',
    category: n.cluster || n.type || '',
    confidence: 0.9,
  }));

  // Convert clusters to concepts
  const concepts: Concept[] = clusters.map((c: any) => ({
    id: c.id,
    title: c.label || c.id,
    summary: c.description || '',
    claims: c.node_ids || [],
    relatedConcepts: [],
  }));

  // Convert product ideas
  const productIdeas: ProductIdea[] = ideas.map((i: any) => ({
    id: i.id,
    title: i.name || i.title || '',
    problem: i.problem || '',
    solution: i.solution || '',
    audience: i.target_audience || i.audience || '',
    difficulty: i.difficulty || 'medium',
    backingClaims: i.evidence || [],
  }));

  // Convert edges to links
  const links = edges.map((e: any) => ({
    source: e.source_id,
    target: e.target_id,
    type: e.relationship || 'supports',
  }));

  // Get sources from manifest via ingest page data
  // For now, derive from unique source_paper values in nodes
  const sourceMap = new Map<string, ResearchSource>();
  nodes.forEach((n: any) => {
    const sp = n.source_paper || '';
    const st = n.source_title || sp;
    if (sp && !sourceMap.has(sp)) {
      sourceMap.set(sp, {
        id: sp,
        title: st,
        type: sp.endsWith('.pdf') ? 'pdf' : 'article',
        content: '',
        status: 'completed',
        dateAdded: '',
      });
    }
  });

  return {
    sources: Array.from(sourceMap.values()),
    claims,
    concepts,
    ideas: productIdeas,
    links,
    isProcessing: false,
    mode: mode.demo ? 'demo' : 'full',
    model: mode.model || 'Unknown',
    backendConnected: true,
  };
}

// ─── Compile (triggers backend pipeline) ────────────────

export async function runCompile(
  onProgress: (msg: string) => void
): Promise<{ claims: number; edges: number; clusters: number }> {
  return new Promise((resolve, reject) => {
    const source = new EventSource(`${API_BASE}/api/compile/stream`);

    source.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done) {
        source.close();
        resolve(data.stats || { claims: 0, edges: 0, clusters: 0 });
      } else if (data.error) {
        source.close();
        reject(new Error(data.error));
      } else {
        onProgress(data.message || '');
      }
    };

    source.onerror = () => {
      source.close();
      reject(new Error('Connection lost'));
    };
  });
}

// ─── Smart Search ───────────────────────────────────────

export async function askQuestion(
  query: string,
  onProgress: (msg: string) => void
): Promise<{ answer: string; evidence: any[] }> {
  // Try cached first
  const cachedRes = await fetch(`${API_BASE}/api/cached-search?q=${encodeURIComponent(query)}`);
  const cached = await cachedRes.json();
  if (cached.answer) {
    return { answer: cached.answer, evidence: cached.evidence || [] };
  }

  // Fall back to live SSE
  return new Promise((resolve, reject) => {
    const source = new EventSource(`${API_BASE}/api/smart-search?q=${encodeURIComponent(query)}`);

    source.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done) {
        source.close();
        resolve({
          answer: data.answer_html || data.answer || '',
          evidence: data.evidence || [],
        });
      } else if (data.error) {
        source.close();
        reject(new Error(data.error));
      } else {
        onProgress(data.message || '');
      }
    };

    source.onerror = () => {
      source.close();
      reject(new Error('Search connection lost'));
    };
  });
}

// ─── Upload ─────────────────────────────────────────────

export async function uploadFiles(files: FileList): Promise<number> {
  const formData = new FormData();
  for (const f of files) formData.append('files', f);
  const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
  const data = await res.json();
  return data.count || 0;
}

export async function runIngest(): Promise<{ new: number; modified: number; unchanged: number }> {
  const res = await fetch(`${API_BASE}/api/ingest`, { method: 'POST' });
  return res.json();
}

// ─── File Back ──────────────────────────────────────────

export async function fileBack(title: string, content: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/file-back`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  const data = await res.json();
  return data.filed || '';
}

// ─── Graph Insights ─────────────────────────────────────

export async function getInsights(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/graph/insights`);
  return res.json();
}
