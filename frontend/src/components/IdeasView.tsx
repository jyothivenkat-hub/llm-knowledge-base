import { useState, useEffect } from 'react';
import { AppState, Domain } from '../types';
import { Lightbulb, Users, Zap, Target, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

type IdeaGroup = { label: string; ideas: AppState['ideas'] };

export default function IdeasView({ state }: { state: AppState }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  useEffect(() => {
    fetch('/api/wiki-page').then(r => r.json()).then(data => {
      if (data.domains) setDomains(data.domains);
    }).catch(() => {});
  }, []);

  // Group ideas by domain using evidence text matching against graph nodes
  const [nodeToDomain, setNodeToDomain] = useState<Record<string, string>>({});

  useEffect(() => {
    if (domains.length === 0) return;
    fetch('/api/graph').then(r => r.json()).then(graphData => {
      const clusterToDomain: Record<string, string> = {};
      for (const d of domains) {
        for (const cid of d.cluster_ids || []) {
          clusterToDomain[cid] = d.label;
        }
      }
      const mapping: Record<string, string> = {};
      for (const node of graphData.nodes || []) {
        if (node.cluster && clusterToDomain[node.cluster]) {
          // Map first 60 chars of node text to domain (for evidence matching)
          mapping[node.text?.substring(0, 60) || ''] = clusterToDomain[node.cluster];
        }
      }
      setNodeToDomain(mapping);
    }).catch(() => {});
  }, [domains]);

  // Apply difficulty filter
  const filtered = filterDifficulty === 'all'
    ? state.ideas
    : state.ideas.filter(i => i.difficulty === filterDifficulty);

  // Group by domain
  const groups: IdeaGroup[] = [];
  if (domains.length > 0 && Object.keys(nodeToDomain).length > 0) {
    const domainGroups: Record<string, AppState['ideas']> = {};
    const ungrouped: AppState['ideas'] = [];

    for (const idea of filtered) {
      let matched = '';
      for (const ev of idea.backingClaims) {
        const evText = typeof ev === 'string' ? ev.substring(0, 60) : '';
        for (const [nodeText, domainLabel] of Object.entries(nodeToDomain)) {
          if (evText && nodeText && evText.substring(0, 40) === nodeText.substring(0, 40)) {
            matched = domainLabel;
            break;
          }
        }
        if (matched) break;
      }
      if (matched) {
        if (!domainGroups[matched]) domainGroups[matched] = [];
        domainGroups[matched].push(idea);
      } else {
        ungrouped.push(idea);
      }
    }
    for (const [label, ideas] of Object.entries(domainGroups)) {
      groups.push({ label, ideas });
    }
    if (ungrouped.length > 0) {
      groups.push({ label: 'Cross-Domain', ideas: ungrouped });
    }
  } else {
    groups.push({ label: '', ideas: filtered });
  }

  const difficulties = ['all', ...new Set(state.ideas.map(i => i.difficulty))];

  return (
    <div className="max-w-6xl mx-auto py-8 md:py-12 px-4 md:px-8 bg-white">
      <div className="flex items-center justify-between mb-8 border-b border-[#a2a9b1] pb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#202122] mb-2 tracking-tight">Ideas</h1>
          <p className="text-[#54595d]">Actionable opportunities synthesized from your research.</p>
        </div>
        {/* Difficulty filter */}
        <div className="flex gap-1.5">
          {difficulties.map(d => (
            <button
              key={d}
              onClick={() => setFilterDifficulty(d)}
              className={cn(
                "px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition-all",
                filterDifficulty === d
                  ? "bg-[#3366cc] text-white border-[#3366cc]"
                  : "bg-white text-[#54595d] border-[#a2a9b1] hover:border-[#3366cc]"
              )}
            >
              {d === 'all' ? `All (${state.ideas.length})` : d}
            </button>
          ))}
        </div>
      </div>

      {groups.map(group => (
        <div key={group.label} className="mb-10">
          {group.label && domains.length > 0 && (
            <div className="border-b border-[#a2a9b1] mb-4 pb-2">
              <h2 className="text-lg font-serif font-bold text-[#202122]">{group.label}</h2>
              <p className="text-[12px] text-[#72777d]">{group.ideas.length} idea{group.ideas.length !== 1 ? 's' : ''}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {group.ideas.map(idea => (
              <div key={idea.id} className="group flex flex-col bg-[#f8f9fa] border border-[#a2a9b1] rounded shadow-sm hover:shadow-md transition-all">
                <div className="p-6 md:p-8 flex-1">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 bg-[#3366cc] rounded flex items-center justify-center shadow-sm">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        idea.difficulty === 'easy' || idea.difficulty === 'low' as any ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        idea.difficulty === 'medium' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {idea.difficulty}
                      </span>
                      {idea.novelty && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-blue-50 text-blue-700 border-blue-200">
                          {idea.novelty}
                        </span>
                      )}
                    </div>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-[#202122] mb-1 group-hover:text-[#3366cc] transition-colors">{idea.title}</h2>
                  {idea.tagline && <p className="text-[13px] text-[#54595d] italic mb-4">{idea.tagline}</p>}
                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-1 flex items-center gap-2"><Target className="w-3 h-3" />Problem</h3>
                      <p className="text-[#202122] leading-relaxed text-[13px]">{idea.problem}</p>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-1 flex items-center gap-2"><Zap className="w-3 h-3" />Solution</h3>
                      <p className="text-[#202122] leading-relaxed text-[13px]">{idea.solution}</p>
                    </div>
                    <div className="flex items-start gap-6">
                      <div>
                        <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-1 flex items-center gap-2"><Users className="w-3 h-3" />Audience</h3>
                        <p className="text-[13px] text-[#202122]">{idea.audience}</p>
                      </div>
                      {idea.revenue_model && (
                        <div>
                          <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-1">Revenue</h3>
                          <p className="text-[13px] text-[#202122]">{idea.revenue_model}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {idea.backingClaims.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-3 flex items-center gap-2"><Layers className="w-3 h-3" />Research Backing</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {idea.backingClaims.map((evidence, idx) => {
                          const claim = state.claims.find(c => c.id === evidence);
                          const displayText = claim ? claim.text : evidence;
                          return (
                            <div key={idx} className="px-2.5 py-1 bg-white border border-[#a2a9b1] rounded text-[10px] text-[#54595d] hover:text-[#202122] hover:border-[#3366cc] transition-all cursor-help">
                              {typeof displayText === 'string' ? displayText.substring(0, 60) + (displayText.length > 60 ? '...' : '') : String(displayText)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {state.ideas.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-[#a2a9b1] border-2 border-dashed border-[#eaecf0] rounded">
          <Lightbulb className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium">No ideas generated yet.</p>
          <p className="text-sm opacity-60">Run the compiler to synthesize ideas from your research.</p>
        </div>
      )}
    </div>
  );
}
