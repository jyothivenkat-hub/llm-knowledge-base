import { useState, useEffect } from 'react';
import { getWikiRaw, saveWiki } from '../services/api';
import { Eye, Edit3, Save, X, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function WikiEditor({ path, onClose, onSave }: {
  path: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getWikiRaw(path).then(raw => {
      setContent(raw);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [path]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveWiki(path, content);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => { setSaved(false); onSave(); }, 1200);
    }
  };

  if (loading) return <div className="p-6 text-[#54595d]">Loading editor...</div>;

  return (
    <div className="border border-[#a2a9b1] rounded bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#a2a9b1] bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#54595d] uppercase tracking-wider">Editing: {path}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold border border-[#a2a9b1] hover:bg-[#eaecf0] transition-colors"
          >
            {preview ? <><Edit3 className="w-3 h-3" /> Edit</> : <><Eye className="w-3 h-3" /> Preview</>}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold bg-[#3366cc] text-white hover:bg-[#2a4b8d] disabled:opacity-50 transition-colors"
          >
            {saved ? <><Check className="w-3 h-3" /> Saved!</> : <><Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}</>}
          </button>
          <button onClick={onClose} className="p-1 text-[#54595d] hover:text-[#202122]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {preview ? (
        <div className="prose-wiki p-6 text-[15px] leading-[1.8] max-h-[70vh] overflow-y-auto">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full p-6 font-mono text-[13px] leading-relaxed text-[#202122] focus:outline-none resize-none min-h-[50vh] max-h-[70vh]"
          spellCheck={false}
        />
      )}
    </div>
  );
}
