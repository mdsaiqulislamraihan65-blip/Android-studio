import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new XTerm({
      theme: {
        background: '#050505',
        foreground: '#00FF9C',
        cursor: '#00FF9C',
      },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect to Socket.io
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      term.writeln('\x1b[32mConnected to Cloud Terminal\x1b[0m');
      socket.emit('terminal:start');
    });

    socket.on('terminal:data', (data: string) => {
      term.write(data);
    });

    socket.on('disconnect', () => {
      term.writeln('\r\n\x1b[31mDisconnected from server\x1b[0m');
    });

    term.onData((data) => {
      socket.emit('terminal:data', data);
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, []);

  // Fit terminal when tab becomes visible
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);
    return () => clearTimeout(timer);
  });

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="h-[36px] px-4 border-b border-border-theme bg-surface flex items-center">
        <h2 className="text-[11px] font-semibold text-text-dim uppercase tracking-wider">Web Terminal</h2>
      </div>
      <div className="flex-1 p-3 overflow-hidden bg-[#050505]" ref={terminalRef}></div>
    </div>
  );
}
