export type ResearchSource = {
  id: string;
  title: string;
  type: 'pdf' | 'article' | 'note' | 'web';
  content: string;
  source_url?: string;
  status: 'pending' | 'processing' | 'completed';
  dateAdded: string;
  claimCount?: number;
  wiki_slug?: string;
};

export type AtomicClaim = {
  id: string;
  sourceId: string;
  text: string;
  category: string;
  confidence: number;
};

export type Concept = {
  id: string;
  title: string;
  summary: string;
  claims: string[];
  relatedConcepts: string[];
};

export type GraphNode = {
  id: string;
  label: string;
  type: 'claim' | 'concept' | 'source';
  group?: string;
};

export type GraphLink = {
  source: string;
  target: string;
  type: 'supports' | 'contradicts' | 'extends' | 'mentions';
};

export type ProductIdea = {
  id: string;
  title: string;
  tagline?: string;
  problem: string;
  solution: string;
  audience: string;
  difficulty: 'easy' | 'medium' | 'hard';
  novelty?: string;
  revenue_model?: string;
  backingClaims: string[];
};

export type AppState = {
  sources: ResearchSource[];
  claims: AtomicClaim[];
  concepts: Concept[];
  ideas: ProductIdea[];
  links: GraphLink[];
  isProcessing: boolean;
  mode: 'demo' | 'full';
  model: string;
  backendConnected: boolean;
  authoringEnabled: boolean;
};
