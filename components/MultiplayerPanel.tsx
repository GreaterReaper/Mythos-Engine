
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
  rehostWithSigil: (id: string) => void;
}

const MultiplayerPanel: React.FC<MultiplayerPanelProps> = ({ 
  peerId, isHost, connections, serverLogs, joinSession, setIsHost, forceSync, kickSoul, rehostWithSigil
}) => {
  const [targetId, setTargetId] = useState('');
  const [customSigil, setCustomSigil] = useState('');

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-12">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Chronicle Portal</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">P2P Multi-device synchronization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className={`grim-card p-6 border-2 transition-all duration-500 ${isHost ? 'border-[#b28a48]/40 shadow-lg' : 'border-neutral-900'}`}>
            <h3 className="text-xs font-black fantasy-font text-[#b28a48] tracking-widest uppercase mb-6">Current Sigil</h3>
            <div className="bg-black/80 border border-neutral-800 p-4 rounded-sm flex items-center justify-between cursor-pointer group" onClick={() => navigator.clipboard.writeText(peerId)}>
              <code className="text-[#b28a48] font-mono text-xs tracking-wider truncate group-hover:text-white transition-colors">
                {peerId || 'Summoning...'}
              </code>
              <span className="text-[8px] text-neutral-600 font-bold ml-2">COPY</span>
            </div>
            
            <div className="mt-8 pt-8 border-t border-neutral-900 space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black uppercase text-neutral-600">Local Presence</span>
                 <span className={`text-[10px] font-black uppercase ${isHost ? 'text-amber-700' : 'text-blue-500'}`}>
                   {isHost ? 'Master of Fates' : 'Wandering Soul'}
                 </span>
               </div>
               
               {isHost && (
                 <button onClick={forceSync} className="w-full bg-[#1a1a1a] border border-[#b28a48]/20 hover:border-[#b28a48]/60 py-3 text-[9px] font-black uppercase tracking-[0.3em] text-[#b28a48] transition-all">
                   Force World Sync
                 </button>
               )}
            </div>
          </div>

          <div className={`grim-card p-6 border-2 ${isHost ? 'border-[#b28a48]/40' : 'border-neutral-900'}`}>
            <h3 className="text-xs font-black mb-6 fantasy-font text-neutral-300 uppercase tracking-widest">Ancestral Binding</h3>
            <p className="text-[9px] text-neutral-600 uppercase mb-4 leading-relaxed italic font-serif">Bind your portal to a memorable word to make it easier for other souls to find you.</p>
            <input 
              value={customSigil} 
              onChange={(e) => setCustomSigil(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} 
              placeholder="e.g. dragonquest" 
              className="w-full bg-black border border-neutral-800 p-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] mb-4 outline-none font-mono" 
            />
            <button 
              onClick={() => rehostWithSigil(customSigil)} 
              disabled={!customSigil || customSigil === peerId}
              className="w-full bg-gradient-to-b from-neutral-900 to-black border border-[#b28a48]/30 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] hover:border-[#b28a48] disabled:opacity-30 transition-all shadow-xl"
            >
              Establish Sigil
            </button>
          </div>

          <div className={`grim-card p-6 border-2 ${!isHost ? 'border-[#b28a48]/40 shadow-lg' : 'border-neutral-900 opacity-50'}`}>
            <h3 className="text-xs font-black mb-6 fantasy-font text-neutral-300 uppercase tracking-widest">Enter Portal</h3>
            <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="ENTER TARGET SIGIL..." className="w-full bg-black border border-neutral-800 p-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] mb-4 outline-none font-mono" />
            <button onClick={() => joinSession(targetId)} className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48]">Enter Portal</button>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grim-card border-neutral-900 p-6 flex-1 min-h-[400px] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-900 flex justify-between items-center bg-[#050505]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${connections.length > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Arcane Resonance Logs</h3>
              </div>
              <span className="text-[9px] text-neutral-600 font-black">{connections.length} Linked Souls</span>
            </div>
            <div className="flex-1 p-6 font-mono text-[10px] overflow-y-auto bg-black/40 scrollbar-hide">
              <div className="space-y-2">
                {serverLogs.length === 0 && <div className="text-neutral-800 italic">The ether is currently silent...</div>}
                {serverLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 border-b border-white/5 pb-1">
                    <span className="text-neutral-700 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-500' : 'text-neutral-400'}`}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerPanel;
