import { useState } from 'react';
import { X, Clipboard, Check } from 'lucide-react';
import { clipContent } from '../services/api';

export default function WebClipperModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const filed = await clipContent(title, url, content);
      setResult(`Clipped to raw/articles/${filed}`);
      setTimeout(() => { setUrl(''); setTitle(''); setContent(''); setResult(''); }, 3000);
    } catch {
      setResult('Clip failed — is the backend running?');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded shadow-2xl border border-[#a2a9b1] w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#a2a9b1]">
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-[#3366cc]" />
            <h2 className="text-lg font-serif font-bold">Web Clipper</h2>
          </div>
          <button onClick={onClose} className="text-[#54595d] hover:text-[#202122]"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#54595d] uppercase tracking-wider mb-1">Title *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Article title"
              className="w-full border border-[#a2a9b1] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3366cc]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#54595d] uppercase tracking-wider mb-1">URL</label>
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-[#a2a9b1] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3366cc]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#54595d] uppercase tracking-wider mb-1">Content *</label>
            <textarea
              rows={6} value={content} onChange={e => setContent(e.target.value)}
              placeholder="Paste article content or markdown here..."
              className="w-full border border-[#a2a9b1] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3366cc] resize-none"
            />
          </div>

          {result && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-700">
              <Check className="w-4 h-4" /> {result}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-[#54595d] hover:text-[#202122]">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || submitting}
              className="px-6 py-2 bg-[#3366cc] text-white rounded font-bold text-sm hover:bg-[#2a4b8d] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Clipping...' : 'Clip to Knowledge Base'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
