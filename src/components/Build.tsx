import { useState, useEffect, useRef } from 'react';
import { Play, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export default function Build() {
  const [building, setBuilding] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('build:log', (log: string) => {
      setLogs((prev) => [...prev, log]);
    });

    socket.on('build:success', () => {
      setBuilding(false);
      setStatus('success');
    });

    socket.on('build:error', () => {
      setBuilding(false);
      setStatus('error');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const startBuild = () => {
    if (!socketRef.current) return;
    setLogs([]);
    setBuilding(true);
    setStatus('building');
    socketRef.current.emit('build:start');
  };

  const downloadApk = () => {
    window.open('/api/download-apk', '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="h-[36px] px-4 border-b border-border-theme bg-surface flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-text-dim uppercase tracking-wider">Build Controls</h2>
      </div>

      <div className="p-5 flex flex-col gap-5">
        <div className="bg-surface rounded-xl p-4 border border-border-theme">
          <span className="text-[11px] text-text-dim uppercase tracking-wider">Current Build</span>
          <h3 className="m-0 mt-2 mb-2 text-base font-semibold text-text-main">Debug APK</h3>
          
          <button
            onClick={startBuild}
            disabled={building}
            className={`w-full py-3 rounded-lg font-bold text-sm uppercase transition-all mt-2.5 flex items-center justify-center gap-2 ${
              building
                ? 'bg-surface-light text-text-dim cursor-not-allowed'
                : 'bg-accent text-bg hover:opacity-90'
            }`}
          >
            {building ? (
              <>
                <div className="w-4 h-4 border-2 border-text-dim border-t-transparent rounded-full animate-spin"></div>
                Building...
              </>
            ) : (
              'Start Gradle Build'
            )}
          </button>
        </div>

        {status === 'success' && (
          <div className="border border-dashed border-accent bg-accent-dim p-4 rounded-xl text-center">
            <span className="text-2xl block mb-2">📦</span>
            <p className="font-semibold m-0 text-text-main">app-debug.apk</p>
            <p className="text-xs opacity-70 mb-3 text-text-dim">Build completed successfully</p>
            <button
              onClick={downloadApk}
              className="bg-white text-black border-none px-4 py-2 rounded-md font-semibold cursor-pointer text-sm"
            >
              Download to Device
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="border border-dashed border-red-500 bg-red-500/10 p-4 rounded-xl text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="font-semibold text-red-500">Build Failed</p>
            <p className="text-xs text-text-dim mt-1">Check terminal logs for details.</p>
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#050505] p-3 overflow-y-auto font-mono text-xs border-t border-border-theme">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-dim opacity-50">
            $ ./gradlew assembleDebug
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-[#00FF9C] whitespace-pre-wrap">
                {log.includes('BUILD SUCCESSFUL') ? (
                  <span className="font-bold text-white">{log}</span>
                ) : log.includes('FAILED') || log.includes('Error') ? (
                  <span className="text-red-500">{log}</span>
                ) : (
                  <span className="opacity-80">{log}</span>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
