import React, { useState, useEffect } from 'react';
import { Upload, Folder as FolderIcon, File as FileIcon, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export default function Files({ onFileSelect }: { onFileSelect: (path: string) => void }) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('projectZip', file);

    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchFiles();
      } else {
        const err = await res.json();
        alert('Upload failed: ' + err.error);
      }
    } catch (error) {
      console.error('Upload error', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="h-[36px] px-4 border-b border-border-theme bg-surface flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-text-dim uppercase tracking-wider">Files</h2>
        <button onClick={fetchFiles} className="text-text-dim hover:text-text-main rounded-md">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-3">
        <label className="flex items-center justify-center w-full p-6 border border-dashed border-border-theme rounded-xl hover:border-accent hover:bg-surface-light transition-colors cursor-pointer group">
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-text-dim group-hover:text-accent transition-colors" />
            <span className="text-sm font-medium text-text-main">
              {uploading ? 'Uploading & Extracting...' : 'Upload Project ZIP'}
            </span>
          </div>
          <input type="file" accept=".zip" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-[13px]">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-dim space-y-2 opacity-50">
            <FolderIcon className="w-12 h-12" />
            <p className="text-sm font-sans">No project loaded</p>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file, i) => (
              <FileTreeNode key={i} node={file} onFileSelect={onFileSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const FileTreeNode: React.FC<{ node: FileNode; onFileSelect: (path: string) => void; depth?: number }> = ({ node, onFileSelect, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center w-full py-1.5 px-2 hover:bg-surface-light rounded-md text-text-main transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? <ChevronDown className="w-4 h-4 mr-1 opacity-50" /> : <ChevronRight className="w-4 h-4 mr-1 opacity-50" />}
          <FolderIcon className="w-4 h-4 mr-2 text-accent" />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children.map((child, i) => (
              <FileTreeNode key={i} node={child} onFileSelect={onFileSelect} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className="flex items-center w-full py-1.5 px-2 hover:bg-surface-light rounded-md text-text-main transition-colors"
      style={{ paddingLeft: `${depth * 12 + 28}px` }}
    >
      <FileIcon className="w-4 h-4 mr-2 text-text-dim" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
