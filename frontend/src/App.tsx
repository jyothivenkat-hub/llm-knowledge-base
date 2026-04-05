import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Cpu,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { AppState, ResearchSource } from './types';
import { mockData } from './mockData';
import { cn } from './lib/utils';
import WikiView from './components/WikiView';
import GraphView from './components/GraphView';
import ResearchView from './components/ResearchView';
import IdeasView from './components/IdeasView';
import ChatView from './components/ChatView';
import { loadState, runCompile } from './services/api';

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
              disabled={state.isProcessing || (!isLocalHost && isDemo)}
              title={isDemo ? 'Public demo: compile is available only in local full mode.' : undefined}
            />
            <SidebarLink
              label="Add sources"
              icon={<Plus className="w-3 h-3" />}
              onClick={() => setActiveView('research')}
              disabled={!isLocalHost && isDemo}
              title={isDemo ? 'Public demo: adding sources is available only in local full mode.' : undefined}
            />
            <SidebarLink label="Ask question" icon={<MessageSquare className="w-3 h-3" />} onClick={() => setActiveView('chat')} />
            <SidebarLink label="Refresh" icon={<RefreshCw className="w-3 h-3" />} onClick={refreshState} />
          </SidebarSection>

          <div className="mt-8 pt-4 border-t border-[#a2a9b1]">
            <div className={cn(
              "w-full flex flex-col items-start p-2 rounded text-[11px] transition-colors",
              effectiveMode === 'demo' ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-200"
            )}>
              <span className="font-bold uppercase tracking-widest opacity-70 mb-1">Mode</span>
              <span className="font-medium">{effectiveMode === 'demo' ? 'Demo Mode' : 'Full Mode'}</span>
              <span className="mt-1 opacity-80 break-all">{state.backendConnected ? state.model : 'Backend unavailable'}</span>
            </div>
            <div className="mt-3 border border-[#c8ccd1] rounded bg-white p-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#54595d] mb-2">View Mode</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPreferredMode('demo')}
                  className={cn(
                    "px-2 py-1.5 text-[11px] border rounded font-bold transition-colors",
                    effectiveMode === 'demo'
                      ? "bg-[#fff8dc] border-[#d6c37a] text-[#6b5600]"
                      : "bg-[#f8f9fa] border-[#c8ccd1] text-[#54595d] hover:bg-white"
                  )}
                >
                  Demo
                </button>
                <button
                  onClick={() => (isLocalHost || backendSupportsFull) && setPreferredMode('full')}
                  disabled={!isLocalHost && !backendSupportsFull}
                  title={
                    backendSupportsFull
                      ? 'Switch to local full authoring mode.'
                      : isLocalHost
                        ? 'Switch UI to full mode. Backend authoring still requires a real local API key.'
                        : 'Full mode requires a real local API key and backend restart.'
                  }
                  className={cn(
                    "px-2 py-1.5 text-[11px] border rounded font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    effectiveMode === 'full'
                      ? "bg-[#eaf3ff] border-[#7aa6e8] text-[#1d4f91]"
                      : "bg-[#f8f9fa] border-[#c8ccd1] text-[#54595d] hover:bg-white"
                  )}
                >
                  Full
                </button>
              </div>
              <div className="mt-2 text-[10px] text-[#54595d]">
                {backendSupportsFull
                  ? 'This local backend supports both read-only demo and full authoring.'
                  : isLocalHost
                    ? 'You can preview both modes locally. Full authoring actions still require a real local API key.'
                    : 'This environment only supports demo mode right now.'}
              </div>
            </div>
            {compileLog.length > 0 && (
              <div className="mt-3 bg-white border border-[#c8ccd1] rounded p-2 text-[11px] space-y-1">
                {compileLog.slice(-4).map((line, idx) => (
                  <div key={`${line}-${idx}`} className="text-[#54595d]">{line}</div>
                ))}
              </div>
            )}
            {!state.backendConnected && (
              <div className="mt-3 text-[11px] text-[#8b5e00] bg-[#fff8e1] border border-[#f1d37a] rounded p-2">
                This shell needs the Flask API to enable compile, ingest, and graph-backed answers.
              </div>
            )}
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

          {state.isProcessing && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-[#3366cc] px-4 py-2 rounded shadow-lg flex items-center gap-3 z-50">
              <Cpu className="w-4 h-4 text-[#3366cc] animate-spin" />
              <span className="text-[13px] font-bold text-[#3366cc]">Compiling Research...</span>
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
