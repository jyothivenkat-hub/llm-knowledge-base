import { useState, useRef, useEffect } from 'react';
import { AppState } from '../types';
import { Send, Bot, User, Sparkles, Database, ArrowRight, Network, RefreshCw, Zap } from 'lucide-react';
import { askQuestion, fileBack } from '../services/api';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  evidence?: any[];
  cached?: boolean;
  query?: string;
};

export default function ChatView({ state, initialQuery = '' }: { state: AppState, initialQuery?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Ask me anything about your research. I'll search across all papers, find relevant claims, and synthesize an answer.\n\nTry: **How do transformer layers map to brain regions?** or **What does FlashAttention do differently?**"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (initialQuery) {
      setInput(initialQuery);
    }
  }, [initialQuery]);

  const doSearch = async (query: string, skipCache = false) => {
    if (!query.trim() || isLoading) return;

    if (!skipCache) {
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: query }]);
    }
    setIsLoading(true);

    try {
      const result = await askQuestion(query, () => {}, skipCache);

      // If refreshing, replace the last assistant message
      if (skipCache) {
        setMessages(prev => {
          const updated = [...prev];
          const lastAssistantIdx = updated.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).pop();
          if (lastAssistantIdx !== undefined && lastAssistantIdx >= 0) {
            updated[lastAssistantIdx] = {
              role: 'assistant',
              content: result.answer || "I couldn't find a specific answer.",
              evidence: result.evidence,
              cached: result.cached,
              query,
            };
          }
          return updated;
        });
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.answer || "I couldn't find a specific answer in the research context.",
          evidence: result.evidence,
          cached: result.cached,
          query,
        }]);
      }
    } catch (error) {
      console.error("Chat failed:", error);
      if (!skipCache) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I encountered an error while processing your question."
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => doSearch(input);

  const handleFileBack = async (content: string) => {
    if (state.mode === 'demo') {
      alert('Public demo is read-only. File-back is available only in local full mode.');
      return;
    }
    try {
      const filed = await fileBack(input || 'Research Answer', content);
      if (filed) alert(`Filed to raw/${filed}`);
    } catch {
      alert('Filing failed — is the dashboard running?');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 md:px-8 py-6 md:py-8 space-y-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3 md:gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn(
                "w-8 h-8 rounded flex items-center justify-center shrink-0",
                msg.role === 'assistant' ? "bg-[#3366cc] text-white" : "bg-[#eaecf0] text-[#54595d]"
              )}>
                {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className={cn("flex flex-col gap-3 max-w-[85%] md:max-w-[80%]", msg.role === 'user' ? "items-end" : "")}>
                <div className={cn(
                  "p-4 rounded-xl text-sm leading-relaxed",
                  msg.role === 'assistant'
                    ? "bg-[#f8f9fa] border border-[#a2a9b1] text-[#202122]"
                    : "bg-[#3366cc] text-white"
                )}>
                  {msg.role === 'assistant' && msg.content.includes('<') ? (
                    <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>

                {msg.role === 'assistant' && msg.cached !== undefined && (
                  <div className="flex items-center gap-2">
                    {msg.cached && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        <Zap className="w-3 h-3" /> Cached
                      </span>
                    )}
                    {msg.cached && msg.query && (
                      <button
                        onClick={() => doSearch(msg.query!, true)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-0.5 border border-[#a2a9b1] rounded text-[10px] font-bold text-[#54595d] hover:text-[#202122] hover:border-[#3366cc] transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    )}
                  </div>
                )}

                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#54595d] uppercase tracking-widest flex items-center gap-2">
                      <Database className="w-3 h-3" />
                      Evidence Trail ({msg.evidence.length} claims)
                    </p>
                    <div className="flex flex-col gap-2">
                      {msg.evidence.slice(0, 5).map((ev: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#f8f9fa] border border-[#a2a9b1] rounded text-[11px] text-[#54595d]">
                          <span className="font-bold text-[#3366cc] mr-1">[{ev.type || 'claim'}]</span>
                          {ev.title || ev.text || ev.snippet || ''}
                          {ev.source_paper && <span className="block text-[10px] mt-1 opacity-60">{ev.source_paper}</span>}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleFileBack(msg.content)}
                      className="text-[10px] font-bold text-[#3366cc] hover:text-[#2a4b8d] uppercase tracking-widest flex items-center gap-1 mt-2"
                    >
                      File this answer into Knowledge Base
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 rounded bg-[#3366cc]/50 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white/50" />
              </div>
              <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#a2a9b1] w-32 h-10" />
            </div>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-8 border-t border-[#a2a9b1] bg-[#f8f9fa]">
        <div className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question about your research..."
            className="w-full bg-white border border-[#a2a9b1] rounded py-3 md:py-4 pl-4 md:pl-6 pr-14 md:pr-16 text-[#202122] focus:outline-none focus:border-[#3366cc] transition-all shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2 md:p-2.5 bg-[#3366cc] hover:bg-[#2a4b8d] disabled:opacity-50 text-white rounded transition-all"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div className="absolute -top-10 md:-top-12 left-0 flex items-center gap-2 md:gap-4">
            <button
              onClick={() => { setInput('Summarize all claims'); }}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-white border border-[#a2a9b1] rounded-full text-[10px] font-bold text-[#54595d] hover:text-[#202122] transition-all shadow-sm"
            >
              <Sparkles className="w-3 h-3 text-[#3366cc]" />
              <span className="hidden sm:inline">Summarize all claims</span>
              <span className="sm:hidden">Summarize</span>
            </button>
            <button
              onClick={() => { setInput('Find contradictions'); }}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-white border border-[#a2a9b1] rounded-full text-[10px] font-bold text-[#54595d] hover:text-[#202122] transition-all shadow-sm"
            >
              <Network className="w-3 h-3 text-[#3366cc]" />
              <span className="hidden sm:inline">Find contradictions</span>
              <span className="sm:hidden">Contradictions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
