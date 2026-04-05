/**
 * API service — replaces Gemini with our Flask backend.
 * All calls go to the Flask API at /api/*
 */

import { AppState, AtomicClaim, Concept, Domain, ProductIdea, ResearchSource, WikiEntity } from '../types';

const API_BASE = '';  // Same origin, proxied by Vite in dev

// ─── Load state from backend ────────────────────────────

export async function loadState(): Promise<AppState> {
  const [modeRes, graphRes, sourcesRes] = await Promise.all([
    fetch(`${API_BASE}/api/mode`),
    fetch(`${API_BASE}/api/graph`),
    fetch(`${API_BASE}/api/sources`),
  ]);

  const mode = await modeRes.json();
  const graph = await graphRes.json();
  const sourcesPayload = await sourcesRes.json();

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const clusters = graph.clusters || [];
  const ideas = graph.product_ideas || [];
  const rawSources = sourcesPayload.sources || [];

  // Convert graph nodes to claims
  const claims: AtomicClaim[] = nodes.map((n: any) => ({
    id: n.id,
    sourceId: n.source_paper || '',
    text: n.text || '',
    category: n.cluster || n.type || '',
    confidence: 0.9,
  }));

  // Convert sources with claim counts and URLs
  const sources: ResearchSource[] = rawSources.map((s: any) => ({
    id: s.id || '',
    title: s.title || '',
    type: (s.type === 'pdf' ? 'pdf' : s.type === 'web' ? 'web' : 'article') as ResearchSource['type'],
    content: s.content || '',
    source_url: s.source_url || '',
    status: (s.status || 'completed') as ResearchSource['status'],
    dateAdded: s.dateAdded || '',
    claimCount: nodes.filter((n: any) => n.source_paper === s.id).length,
    wiki_slug: s.wiki_slug || '',
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
    tagline: i.tagline || '',
    problem: i.problem || '',
    solution: i.solution || '',
    audience: i.target_audience || i.audience || '',
    difficulty: i.difficulty || 'medium',
    novelty: i.novelty || '',
    revenue_model: i.revenue_model || '',
    backingClaims: i.evidence || [],
  }));

  // Convert edges to links
  const links = edges.map((e: any) => ({
    source: e.source_id,
    target: e.target_id,
    type: e.relationship || 'supports',
  }));

  return {
    sources,
    claims,
    concepts,
    ideas: productIdeas,
    links,
    isProcessing: false,
    mode: mode.demo ? 'demo' : 'full',
    model: mode.model || 'Unknown',
    backendConnected: true,
    authoringEnabled: !mode.demo,
  };
}

// ─── Domains ───────────────────────────────────────────

export async function getDomainPage(domainId: string): Promise<Domain | null> {
  try {
    const res = await fetch(`${API_BASE}/api/domain/${encodeURIComponent(domainId)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Entities ──────────────────────────────────────────

export async function getEntities(): Promise<WikiEntity[]> {
  try {
    const res = await fetch(`${API_BASE}/api/entities`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.entities || [];
  } catch {
    return [];
  }
}

export async function getEntity(slug: string): Promise<WikiEntity | null> {
  try {
    const res = await fetch(`${API_BASE}/api/entity/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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
  onProgress: (msg: string) => void,
  skipCache = false
): Promise<{ answer: string; evidence: any[]; cached: boolean }> {
  // Try cached first (unless skipped)
  if (!skipCache) {
    const cachedRes = await fetch(`${API_BASE}/api/cached-search?q=${encodeURIComponent(query)}`);
    const cached = await cachedRes.json();
    if (cached.answer) {
      return { answer: cached.answer, evidence: cached.evidence || [], cached: true };
    }
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
          cached: false,
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

export async function createSource(input: {
  title: string;
  content: string;
  type: ResearchSource['type'];
}): Promise<ResearchSource> {
  const res = await fetch(`${API_BASE}/api/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();

  return {
    id: data.path || input.title,
    title: data.title || input.title,
    type: data.type || input.type,
    content: input.content,
    status: 'pending',
    dateAdded: data.dateAdded || '',
  };
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

// ─── Lint / Health Check ────────────────────────────────

export async function runLint(
  onProgress: (msg: string) => void,
  checkName?: string
): Promise<string> {
  const url = checkName ? `${API_BASE}/api/lint?check=${checkName}` : `${API_BASE}/api/lint`;
  return new Promise((resolve, reject) => {
    const source = new EventSource(url);
    source.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done) {
        source.close();
        resolve(data.report_html || '');
      } else if (data.error) {
        source.close();
        reject(new Error(data.error));
      } else {
        onProgress(data.message || '');
      }
    };
    source.onerror = () => { source.close(); reject(new Error('Connection lost')); };
  });
}

// ─── Render (slides/charts) ─────────────────────────────

export async function renderArticle(file: string, format: 'slides' | 'chart'): Promise<{ output: string; preview?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, format }),
  });
  return res.json();
}

// ─── Wiki Editor ────────────────────────────────────────

export async function getWikiRaw(path: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/wiki/raw?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  return data.content || '';
}

export async function saveWiki(path: string, content: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/wiki/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  const data = await res.json();
  return !!data.saved;
}

// ─── Wiki Page Data ─────────────────────────────────────

export async function getWikiPage(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/wiki-page`);
  return res.json();
}

// ─── Web Clipper ────────────────────────────────────────

export async function clipContent(title: string, url: string, content: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/clip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, url, content }),
  });
  const data = await res.json();
  return data.clipped || '';
}
