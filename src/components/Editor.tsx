import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Save } from 'lucide-react';

export default function CodeEditor({ activeFile }: { activeFile: string | null }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeFile) return;
    
    const loadFile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(activeFile)}`);
        const data = await res.json();
        setContent(data.content || '');
      } catch (error) {
        console.error('Failed to load file', error);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [activeFile]);

  const handleSave = async () => {
    if (!activeFile) return;
    
    setSaving(true);
    try {
      await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content }),
      });
    } catch (error) {
      console.error('Failed to save file', error);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.java')) return 'java';
    if (filename.endsWith('.kt') || filename.endsWith('.kts')) return 'kotlin';
    if (filename.endsWith('.xml')) return 'xml';
    if (filename.endsWith('.gradle')) return 'groovy';
    if (filename.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center h-full bg-bg text-text-dim">
        <p>Select a file from the Files tab to edit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-4 h-[36px] border-b border-border-theme bg-surface">
        <span className="text-[11px] font-semibold text-text-dim uppercase tracking-wider truncate">Editor — {activeFile}</span>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-1.5 px-2 py-1 bg-accent-dim text-accent border border-accent hover:bg-accent hover:text-bg text-[11px] font-semibold uppercase tracking-wider rounded-full transition-colors disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="flex-1 relative bg-[#0D0E12]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/50 z-10">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : null}
        <Editor
          height="100%"
          language={getLanguage(activeFile)}
          theme="vs-dark"
          value={content}
          onChange={(val) => setContent(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            wordWrap: 'on',
            padding: { top: 16 },
          }}
        />
      </div>
    </div>
  );
}
