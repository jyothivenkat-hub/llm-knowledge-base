import { AppState } from './types';

// Empty initial state — real data loads from API via loadState()
export const mockData: AppState = {
  sources: [],
  claims: [],
  concepts: [],
  ideas: [],
  links: [],
  isProcessing: false,
  mode: 'demo',
  model: 'Unavailable',
  backendConnected: false,
  authoringEnabled: false,
};
