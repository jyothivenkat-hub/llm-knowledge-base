import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Cpu,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Presentation,
  Clipboard,
} from 'lucide-react';
import { AppState, ResearchSource } from './types';
import { mockData } from './mockData';
import { cn } from './lib/utils';
import WikiView from './components/WikiView';
import GraphView from './components/GraphView';
import ResearchView from './components/ResearchView';
import IdeasView from './components/IdeasView';
import ChatView from './components/ChatView';
import { loadState, runCompile, runLint } from './services/api';

type View = 'wiki' | 'graph' | 'ideas' | 'research' | 'chat';

export default function App() {
  const [state, setState] = useState<AppState>(mockData);
  const [activeView, setActiveView] = useState<View>('wiki');
  const [compileLog, setCompileLog] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [preferredMode, setPreferredMode] = useState<'demo' | 'full'>('demo');
  const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const backendSupportsFull = state.authoringEnabled;
  const effectiveMode = isLocalHost ? preferredMode : (backendSupportsFull ? preferredMode : 'demo');
  const isDemo = effectiveMode === 'demo';
  const viewState: AppState = { ...state, mode: effectiveMode };

  // Load real data from Flask backend on mount
  useEffect(() => {
    loadState()
      .then(data => setState(data))
      .catch(() => console.log('Using empty state — backend not available'));
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem('jyothipedia-mode');
    if (stored === 'demo' || stored === 'full') {
      setPreferredMode(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('jyothipedia-mode', preferredMode);
  }, [preferredMode]);

  const handleCompile = async () => {
    if (effectiveMode === 'demo') {
      setCompileLog([
        'Compile is disabled in demo mode.',
        'Set a real ANTHROPIC_API_KEY in .env, restart the Flask dashboard, then refresh this page.',
      ]);
      return;
    }
    if (!backendSupportsFull) {
      setCompileLog([
        'Full mode UI is enabled locally, but the backend is still in demo mode.',
        'Add a real ANTHROPIC_API_KEY in .env and restart the Flask dashboard to enable compile.',
      ]);
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true }));
    setCompileLog([]);

    try {
      await runCompile((msg) => {
        setCompileLog(prev => [...prev, msg]);
      });
      // Reload state after compile
      const newState = await loadState();
      setState(newState);
    } catch (error) {
      console.error("Compile failed:", error);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const addSource = (source: ResearchSource) => {
    setState(prev => ({
      ...prev,
      sources: [source, ...prev.sources]
    }));
  };

  const refreshState = async () => {
    try {
      const data = await loadState();
      setState(prev => ({ ...data, isProcessing: prev.isProcessing }));
    } catch {
      console.log('Refresh skipped — backend not available');
    }
  };

  const runGlobalSearch = () => {
    if (!globalSearch.trim()) return;
    setActiveView('chat');
  };

  const handleLint = async () => {
    if (isDemo) { setCompileLog(['Health checks require Full mode.']); return; }
    setCompileLog(['Running health checks...']);
    try {
      const report = await runLint((msg) => setCompileLog(prev => [...prev, msg]));
      setCompileLog(prev => [...prev, 'Done! Report generated.']);
    } catch (e: any) {
      setCompileLog(prev => [...prev, `Error: ${e.message}`]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-[#202122] overflow-hidden">
      {/* Header */}
      <header className="h-[72px] flex items-center px-4 border-b border-[#a2a9b1] bg-white shrink-0">
        <div className="flex items-center gap-3 w-64">
          <div className="w-10 h-10 bg-[#3366cc] rounded-full flex items-center justify-center text-white font-serif text-2xl font-bold">
            K
          </div>
          <div>
            <h1 className="text-[1.4em] font-serif leading-none">Jyothipedia</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#54595d] font-bold mt-1">A LLM Research Knowledge Base</p>
          </div>
        </div>

        <div className="flex-1 flex justify-center px-8">
          <div className="flex w-full max-w-2xl">
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runGlobalSearch()}
              placeholder="Search Jyothipedia"
              className="flex-1 border border-[#a2a9b1] px-3 py-1.5 text-sm focus:outline-none focus:border-[#3366cc] focus:ring-1 focus:ring-[#3366cc]"
            />
            <button onClick={runGlobalSearch} className="bg-[#f8f9fa] border border-[#a2a9b1] border-l-0 px-4 py-1.5 text-sm font-bold hover:bg-white transition-colors">
              Search
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 text-[13px]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#eaecf0] rounded-full flex items-center justify-center overflow-hidden border border-[#a2a9b1]">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=jyothi" alt="User" className="w-full h-full object-cover" />
            </div>
            <span className="text-[12px] font-medium">Jyothi</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="h-10 flex items-end px-4 border-b border-[#a2a9b1] bg-white shrink-0">
        <div className="w-44 shrink-0" />
        <div className="flex gap-1">
          <Tab label="Main Page" active={activeView === 'wiki'} onClick={() => setActiveView('wiki')} />
          <Tab label="Knowledge Graph" active={activeView === 'graph'} onClick={() => setActiveView('graph')} />
          <Tab label="Search" active={activeView === 'chat'} onClick={() => setActiveView('chat')} />
          <Tab label="Research Ideas" active={activeView === 'ideas'} onClick={() => setActiveView('ideas')} />
          <Tab label="Sources" active={activeView === 'research'} onClick={() => setActiveView('research')} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-44 border-r border-[#a2a9b1] bg-[#f6f6f6] overflow-y-auto shrink-0 p-4">
          <SidebarSection title="Navigation">
            <SidebarLink label="Main page" active={activeView === 'wiki'} onClick={() => setActiveView('wiki')} />
            <SidebarLink label="Sources" active={activeView === 'research'} onClick={() => setActiveView('research')} />
            <SidebarLink label="All claims" onClick={() => setActiveView('graph')} />
            <SidebarLink label="Search" active={activeView === 'chat'} onClick={() => setActiveView('chat')} />
          </SidebarSection>

          <SidebarSection title="Tools">
            <SidebarLink
              label="Compile"
              icon={<Cpu className="w-3 h-3" />}
              onClick={handleCompile}
              disabled={state.isProcessing}
            />
            <SidebarLink
              label="Add sources"
              icon={<Plus className="w-3 h-3" />}
              onClick={() => setActiveView('research')}
            />
            <SidebarLink label="Ask question" icon={<MessageSquare className="w-3 h-3" />} onClick={() => setActiveView('chat')} />
            <SidebarLink label="Health check" icon={<ShieldCheck className="w-3 h-3" />} onClick={handleLint} />
            <SidebarLink label="Refresh data" icon={<RefreshCw className="w-3 h-3" />} onClick={refreshState} />
          </SidebarSection>

          <div className="mt-8 pt-4 border-t border-[#a2a9b1]">
            <button
              onClick={() => {
                const next = effectiveMode === 'demo' ? 'full' : 'demo';
                if (next === 'full' && !isLocalHost && !backendSupportsFull) return;
                setPreferredMode(next);
              }}
              className={cn(
                "w-full p-2 rounded text-[11px] transition-colors cursor-pointer text-left",
                effectiveMode === 'demo'
                  ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              )}
            >
              <span className="font-bold">{effectiveMode === 'demo' ? 'Demo Mode' : 'Full Mode'}</span>
              <span className="block mt-0.5 opacity-70">Click to switch</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 bg-white overflow-y-auto relative">
          {isDemo && (
            <div className="border-b border-[#d6c37a] bg-[#fff8dc] px-6 py-3 text-[13px] text-[#6b5600]">
              <span className="font-bold">Public demo:</span> compiled data only. Browse the wiki, graph, ideas, and cached answers here.
              Authoring actions like compile, upload, and ingest stay local.
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeView === 'wiki' && <WikiView state={viewState} />}
              {activeView === 'graph' && <GraphView state={viewState} />}
              {activeView === 'ideas' && <IdeasView state={viewState} />}
              {activeView === 'research' && <ResearchView state={viewState} onAdd={addSource} onRefresh={refreshState} />}
              {activeView === 'chat' && <ChatView state={viewState} initialQuery={globalSearch} />}
            </motion.div>
          </AnimatePresence>

          {(state.isProcessing || compileLog.length > 0) && (
            <div className="absolute top-4 right-4 w-96 bg-white/95 backdrop-blur border border-[#3366cc] rounded shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#3366cc]/20">
                <div className="flex items-center gap-2">
                  {state.isProcessing && <Cpu className="w-4 h-4 text-[#3366cc] animate-spin" />}
                  <span className="text-[13px] font-bold text-[#3366cc]">
                    {state.isProcessing ? 'Processing...' : 'Complete'}
                  </span>
                </div>
                {!state.isProcessing && (
                  <button onClick={() => setCompileLog([])} className="text-[11px] text-[#54595d] hover:text-[#202122]">dismiss</button>
                )}
              </div>
              <div className="px-4 py-2 max-h-60 overflow-y-auto text-[12px] font-mono text-[#54595d] space-y-0.5">
                {compileLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string, active?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 text-[13px] font-medium cursor-pointer border border-b-0 transition-colors",
        active
          ? "bg-white border-[#a2a9b1] text-[#202122] relative z-10"
          : "bg-[#f6f6f6] border-transparent text-[#0645ad] hover:bg-white hover:border-[#a2a9b1]"
      )}
    >
      {label}
    </button>
  );
}

function SidebarSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[12px] text-[#54595d] font-bold border-b border-[#a2a9b1] mb-2 pb-0.5">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarLink({ label, active, onClick, icon, disabled, title }: { label: string, active?: boolean, onClick?: () => void, icon?: React.ReactNode, disabled?: boolean, title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-full text-left text-[13px] cursor-pointer flex items-center gap-2 py-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        active ? "text-[#202122] font-bold" : "text-[#0645ad] hover:underline"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
