/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Folder, Code2, Terminal as TerminalIcon, Play } from 'lucide-react';
import Files from './components/Files';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import Build from './components/Build';

export default function App() {
  const [activeTab, setActiveTab] = useState('files');
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const handleFileSelect = (path: string) => {
    setActiveFile(path);
    setActiveTab('editor');
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-text-main font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-[60px] bg-surface border-b border-border-theme">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-black font-black text-lg">
            D
          </div>
          <div>
            <h1 className="text-base font-semibold m-0 text-text-main">Cloud Android Builder</h1>
            <span className="text-[10px] text-text-dim">Detected: Android Project</span>
          </div>
        </div>
        <div className="bg-accent-dim text-accent px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase border border-accent">
          System Ready
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-border-theme">
        <div className={`absolute inset-0 bg-bg ${activeTab === 'files' ? 'block' : 'hidden'}`}>
          <Files onFileSelect={handleFileSelect} />
        </div>
        <div className={`absolute inset-0 bg-bg ${activeTab === 'editor' ? 'block' : 'hidden'}`}>
          <Editor activeFile={activeFile} />
        </div>
        <div className={`absolute inset-0 bg-bg ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
          <Terminal />
        </div>
        <div className={`absolute inset-0 bg-bg ${activeTab === 'build' ? 'block' : 'hidden'}`}>
          <Build />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="flex items-center justify-around h-[64px] bg-surface border-t border-border-theme pb-safe">
        <NavItem
          icon={<Folder className="w-5 h-5" />}
          label="Files"
          isActive={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
        />
        <NavItem
          icon={<Code2 className="w-5 h-5" />}
          label="Editor"
          isActive={activeTab === 'editor'}
          onClick={() => setActiveTab('editor')}
        />
        <NavItem
          icon={<TerminalIcon className="w-5 h-5" />}
          label="Terminal"
          isActive={activeTab === 'terminal'}
          onClick={() => setActiveTab('terminal')}
        />
        <NavItem
          icon={<Play className="w-5 h-5" />}
          label="Build"
          isActive={activeTab === 'build'}
          onClick={() => setActiveTab('build')}
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${
        isActive ? 'text-accent' : 'text-text-dim hover:text-text-main'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}
