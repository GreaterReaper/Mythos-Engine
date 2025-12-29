
import React, { useState } from 'react';
import { ServerLog } from '../types';
import { DataConnection } from 'peerjs';

interface MultiplayerPanelProps {
  peerId: string;
  isHost: boolean;
  connections: DataConnection[];
  serverLogs: ServerLog[];
  joinSession: (id: string) => void;
  setIsHost: (val: boolean) => void;
  forceSync: () => void;
  kickSoul: (id: string) => void;
}

const MultiplayerPanel: React.FC<MultiplayerPanelProps> = ({ 
  peerId, 
  isHost, 
  connections, 
  serverLogs, 
  joinSession, 
  setIsHost, 
  forceSync,
  kickSoul
}) => {
  const [targetId, setTargetId] = useState('');

  const copyId = () => {
    navigator.clipboard.writeText(peerId);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-12">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Chronicle Server</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Manage your bound world and connected souls</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connection Center */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`grim-card p-6 border-2 transition-all h-fit ${isHost ? 'border-[#b28a48]/40 shadow-[0_0_20px_rgba(178,138,72,0.1)]' : 'border-neutral-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black fantasy-font text-[#b28a48] tracking-widest uppercase">Identity Sigil</h3>
              <div className={`w-2 h-2 rounded-full ${peerId ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
            </div>
            
            <div className="bg-black/80 border border-neutral-800 p-4 rounded-sm flex items-center justify-between group cursor-pointer" onClick={copyId}>
              <code className="text-[#b28a48] font-mono text-sm tracking-wider select-all">{peerId || 'Summoning...'}</code>
              <span className="text-[8px] text-neutral-600 font-bold uppercase tracking-tighter">Copy Sigil</span>
            </div>

            <div className="mt-8 pt-8 border-t border-neutral-900 space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black uppercase text-neutral-600">Soul Status</span>
                 <span className="text-[10px] font-black uppercase text-amber-700">{isHost ? 'Great Host' : 'Wanderer'}</span>
               </div>
               
               {isHost ? (
                 <button 
                  onClick={forceSync}
                  className="w-full bg-[#1a1a1a] border border-[#b28a48]/20 hover:border-[#b28a48]/60 py-3 text-[9px] font-black uppercase tracking-[0.3em] text-[#b28a48] transition-all"
                 >
                   Force World Sync
                 </button>
               ) : (
                 <button 
                  onClick={() => setIsHost(true)}
                  className="w-full bg-neutral-900 hover:bg-[#b28a48] hover:text-black py-3 text-[9px] font-black uppercase tracking-[0.3em] transition-all"
                 >
                   Assume Host Throne
                 </button>
               )}
            </div>
          </div>

          <div className={`grim-card p-6 border-2 transition-all ${!isHost ? 'border-[#b28a48]/40' : 'border-neutral-900 opacity-50'}`}>
            <h3 className="text-sm font-black mb-6 fantasy-font text-neutral-300 uppercase tracking-widest">Join Another World</h3>
            <input 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="ENTER REMOTE SIGIL..."
              className="w-full bg-black/50 border border-neutral-800 p-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] mb-4 outline-none font-mono"
            />
            <button 
              onClick={() => joinSession(targetId)}
              className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] hover:border-[#b28a48] transition-all"
            >
              Step Through Portal
            </button>
          </div>
        </div>

        {/* Server Console & Lobby */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Linked Souls List */}
          <div className="grim-card border-neutral-900 p-6">
            <h3 className="text-sm font-black fantasy-font text-neutral-500 mb-6 uppercase tracking-widest flex items-center justify-between">
              Linked Souls 
              <span className="text-[10px] text-[#b28a48] font-black">{connections.length} Online</span>
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
              {connections.map((conn) => (
                <div key={conn.peer} className="flex items-center justify-between bg-black/40 border border-neutral-900 p-3 rounded-sm group">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <div className="text-[10px] font-black text-neutral-300 font-mono tracking-widest uppercase">{conn.peer}</div>
                      <div className="text-[8px] text-neutral-600 uppercase font-bold">Active Link</div>
                    </div>
                  </div>
                  {isHost && (
                    <button 
                      onClick={() => kickSoul(conn.peer)}
                      className="text-[8px] font-black text-red-900/60 hover:text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Sever Link
                    </button>
                  )}
                </div>
              ))}
              {connections.length === 0 && (
                <div className="text-center py-8 text-[10px] uppercase tracking-widest text-neutral-700 border border-dashed border-neutral-900">
                  No other souls are bound to this grimoire...
                </div>
              )}
            </div>
          </div>

          {/* Live Server Console */}
          <div className="grim-card bg-black border-neutral-900 flex-1 min-h-[400px] flex flex-col">
            <div className="p-4 border-b border-neutral-900 flex justify-between items-center bg-[#050505]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Pulse Console v1.0.4</h3>
              </div>
              <span className="text-[8px] text-neutral-700 font-mono uppercase">Status: Operating Nominally</span>
            </div>
            <div className="flex-1 p-6 font-mono text-[10px] overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              <div className="space-y-2">
                {serverLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 group">
                    <span className="text-neutral-700 select-none whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`
                      ${log.type === 'info' ? 'text-neutral-500' : ''}
                      ${log.type === 'success' ? 'text-green-500/80' : ''}
                      ${log.type === 'warn' ? 'text-amber-500/80' : ''}
                      ${log.type === 'error' ? 'text-red-500' : ''}
                      break-all
                    `}>
                      <span className="mr-2">{log.type === 'info' ? '›' : log.type === 'success' ? '✔' : log.type === 'warn' ? '!' : '✖'}</span>
                      {log.message}
                    </span>
                  </div>
                ))}
                {serverLogs.length === 0 && (
                  <div className="text-neutral-800 italic">Waiting for arcane activity...</div>
                )}
              </div>
            </div>
            <div className="p-2 border-t border-neutral-900 text-center bg-[#050505]">
               <span className="text-[8px] text-neutral-700 uppercase font-bold tracking-[0.4em]">Chronicle Stream Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-20 opacity-20 text-center">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-neutral-500">Ancient Server Protocols • Peer-to-Peer Necromancy • v1.0.4</p>
      </div>
    </div>
  );
};

export default MultiplayerPanel;
