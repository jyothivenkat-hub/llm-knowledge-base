import { AppState } from '../types';
import { Lightbulb, Users, Zap, ArrowRight, Target, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

export default function IdeasView({ state }: { state: AppState }) {
  return (
    <div className="max-w-6xl mx-auto py-12 px-8 bg-white">
      <div className="mb-12 border-b border-[#a2a9b1] pb-4">
        <h1 className="text-3xl font-serif font-bold text-[#202122] mb-2 tracking-tight">Product Ideas</h1>
        <p className="text-[#54595d]">Actionable opportunities synthesized from your research corpus.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {state.ideas.map(idea => (
          <div key={idea.id} className="group flex flex-col bg-[#f8f9fa] border border-[#a2a9b1] rounded shadow-sm hover:shadow-md transition-all">
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 bg-[#3366cc] rounded flex items-center justify-center shadow-sm">
                  <Zap className="w-6 h-6 text-white" />
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
              <h2 className="text-2xl font-serif font-bold text-[#202122] mb-2 group-hover:text-[#3366cc] transition-colors">{idea.title}</h2>
              {idea.tagline && <p className="text-[14px] text-[#54595d] italic mb-4">{idea.tagline}</p>}
              <div className="space-y-6 mb-8">
                <div>
                  <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-2 flex items-center gap-2"><Target className="w-3 h-3" />The Problem</h3>
                  <p className="text-[#202122] leading-relaxed text-[14px]">{idea.problem}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-2 flex items-center gap-2"><Zap className="w-3 h-3" />The Solution</h3>
                  <p className="text-[#202122] leading-relaxed text-[14px]">{idea.solution}</p>
                </div>
                <div className="flex items-start gap-8">
                  <div>
                    <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-2 flex items-center gap-2"><Users className="w-3 h-3" />Audience</h3>
                    <p className="text-sm text-[#202122] font-medium">{idea.audience}</p>
                  </div>
                  {idea.revenue_model && (
                    <div>
                      <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-2">Revenue</h3>
                      <p className="text-sm text-[#202122]">{idea.revenue_model}</p>
                    </div>
                  )}
                </div>
              </div>
              {idea.backingClaims.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest mb-4 flex items-center gap-2"><Layers className="w-3 h-3" />Research Backing</h3>
                  <div className="flex flex-wrap gap-2">
                    {idea.backingClaims.map((evidence, idx) => {
                      // evidence could be a claim ID or a text string
                      const claim = state.claims.find(c => c.id === evidence);
                      const displayText = claim ? claim.text : evidence;
                      return (
                        <div key={idx} className="px-3 py-1.5 bg-white border border-[#a2a9b1] rounded text-[10px] text-[#54595d] hover:text-[#202122] hover:border-[#3366cc] transition-all cursor-help">
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

        {state.ideas.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-[#a2a9b1] border-2 border-dashed border-[#eaecf0] rounded">
            <Lightbulb className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No product ideas generated yet.</p>
            <p className="text-sm opacity-60">Run the compiler to synthesize ideas from your research.</p>
          </div>
        )}
      </div>
    </div>
  );
}
