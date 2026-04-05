import { useState } from 'react';
import { AppState, ResearchSource } from '../types';
import { Upload, Link as LinkIcon, FileText, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { uploadFiles, runIngest } from '../services/api';
import { cn } from '../lib/utils';

export default function ResearchView({ state, onAdd }: { state: AppState, onAdd: (s: ResearchSource) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSource, setNewSource] = useState({ title: '', content: '', type: 'article' as const });
  const [uploadMsg, setUploadMsg] = useState('');

  const handleAdd = () => {
    if (!newSource.title || !newSource.content) return;
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      title: newSource.title,
      content: newSource.content,
      type: newSource.type,
      status: 'pending',
      dateAdded: new Date().toISOString().split('T')[0]
    });
    setNewSource({ title: '', content: '', type: 'article' });
    setIsAdding(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    if (state.mode === 'demo') { setUploadMsg('Demo mode — clone the repo to upload files.'); return; }
    const count = await uploadFiles(e.target.files);
    setUploadMsg(`Uploaded ${count} file(s). Run Compile to process.`);
  };

  const handleIngest = async () => {
    if (state.mode === 'demo') { setUploadMsg('Demo mode — clone the repo to ingest.'); return; }
    const stats = await runIngest();
    setUploadMsg(`Ingest: ${stats.new} new, ${stats.modified} modified, ${stats.unchanged} unchanged`);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-8 bg-white">
      <div className="flex items-center justify-between mb-12 border-b border-[#a2a9b1] pb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#202122] mb-2 tracking-tight">Research Library</h1>
          <p className="text-[#54595d]">Manage your sources and prepare them for synthesis.</p>
        </div>
        <div className="flex gap-2">
          <label className="bg-[#eaecf0] hover:bg-[#d1d4d9] text-[#202122] px-4 py-2.5 rounded font-bold flex items-center gap-2 transition-all cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            Upload Files
            <input type="file" multiple accept=".md,.pdf,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={handleIngest} className="bg-[#eaecf0] hover:bg-[#d1d4d9] text-[#202122] px-4 py-2.5 rounded font-bold text-sm transition-all">
            Scan raw/
          </button>
          <button onClick={() => setIsAdding(true)} className="bg-[#3366cc] hover:bg-[#2a4b8d] text-white px-6 py-2.5 rounded font-bold flex items-center gap-2 transition-all shadow-sm">
            <Plus className="w-5 h-5" />
            Add Research
          </button>
        </div>
      </div>

      {uploadMsg && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">{uploadMsg}</div>
      )}

      {isAdding && (
        <div className="mb-12 p-8 bg-[#f8f9fa] border border-[#a2a9b1] rounded shadow-lg">
          <h2 className="text-xl font-serif font-bold text-[#202122] mb-6">New Research Source</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#54595d] uppercase tracking-widest mb-2">Title</label>
              <input type="text" value={newSource.title} onChange={e => setNewSource(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. The Impact of Quantum Computing on Cryptography"
                className="w-full bg-white border border-[#a2a9b1] rounded py-3 px-4 text-[#202122] focus:outline-none focus:border-[#3366cc] transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#54595d] uppercase tracking-widest mb-2">Content / Notes</label>
              <textarea rows={6} value={newSource.content} onChange={e => setNewSource(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Paste the article content, paper abstract, or your own research notes here..."
                className="w-full bg-white border border-[#a2a9b1] rounded py-3 px-4 text-[#202122] focus:outline-none focus:border-[#3366cc] transition-all resize-none" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-[#54595d] uppercase tracking-widest mb-2">Type</label>
                <div className="flex gap-2">
                  {['pdf', 'article', 'note', 'web'].map(type => (
                    <button key={type} onClick={() => setNewSource(prev => ({ ...prev, type: type as any }))}
                      className={cn("px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-all",
                        newSource.type === type ? "bg-[#3366cc] text-white" : "bg-[#eaecf0] text-[#54595d] hover:bg-[#d1d4d9]")}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-3">
                <button onClick={() => setIsAdding(false)} className="px-6 py-2.5 rounded text-sm font-bold text-[#54595d] hover:text-[#202122] transition-colors">Cancel</button>
                <button onClick={handleAdd} className="bg-[#3366cc] hover:bg-[#2a4b8d] text-white px-8 py-2.5 rounded font-bold transition-all">Save Source</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {state.sources.map(source => (
          <div key={source.id} className="group p-6 bg-[#f8f9fa] border border-[#a2a9b1] rounded hover:border-[#3366cc] transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#eaecf0] rounded group-hover:bg-[#3366cc]/10 group-hover:text-[#3366cc] transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                source.status === 'completed' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                source.status === 'processing' ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse" :
                "bg-amber-50 text-amber-700 border border-amber-200"
              )}>
                {source.status === 'completed' ? <CheckCircle className="w-3 h-3" /> :
                 source.status === 'processing' ? <Clock className="w-3 h-3" /> :
                 <AlertCircle className="w-3 h-3" />}
                {source.status}
              </div>
            </div>
            <h3 className="text-lg font-serif font-bold text-[#202122] mb-2 group-hover:text-[#3366cc] transition-colors line-clamp-1">{source.title}</h3>
            <p className="text-sm text-[#54595d] mb-6 line-clamp-2 leading-relaxed">{source.content || 'No preview available'}</p>
            <div className="flex items-center justify-between pt-4 border-t border-[#a2a9b1]/50">
              <span className="text-[10px] font-bold text-[#a2a9b1] uppercase tracking-widest">
                {source.dateAdded ? `Added ${source.dateAdded}` : source.type}
              </span>
            </div>
          </div>
        ))}

        {state.sources.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-[#a2a9b1] border-2 border-dashed border-[#eaecf0] rounded">
            <Upload className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No research sources added yet.</p>
            <p className="text-sm opacity-60">Upload a PDF or paste an article to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
