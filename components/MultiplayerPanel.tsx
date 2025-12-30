
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
  forceSync: (selection: Record<string, boolean>) => void;
  kickSoul: (id: string) => void;
  rehostWithSigil: (id: string) => void;
}

const MultiplayerPanel: React.FC<MultiplayerPanelProps> = ({ 
  peerId, isHost, connections, serverLogs, joinSession, setIsHost, forceSync, kickSoul, rehostWithSigil
}) => {
  const [targetId, setTargetId] = useState('');
  const [customSigil, setCustomSigil] = useState('');
  
  const [syncSelection, setSyncSelection] = useState<Record<string, boolean>>({
    characters: true,
    classes: true,
    monsters: isHost,
    items: true,
    campaign: isHost
  });

  const toggleSync = (key: string) => {
    setSyncSelection(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const categories = [
    { id: 'characters', label: 'Fellowship' },
    { id: 'classes', label: 'Archetypes' },
    { id: 'monsters', label: 'Bestiary' },
    { id: 'items', label: 'Armory' },
    { id: 'campaign', label: 'Chronicle' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-12">
      <div className="text-center pt-8">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Chronicle Portal</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2 font-black">Resonate with other souls across the ether</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Connection Tools */}
        <div className="space-y-8">
          {/* Section: Establish a Room (Host) */}
          <div className={`grim-card p-8 border-2 transition-all duration-500 rounded-sm ${isHost ? 'border-[#b28a48]/40 shadow-2xl' : 'border-neutral-900 opacity-60'}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🏛️</span>
              <h3 className="text-xs font-black fantasy-font text-[#b28a48] tracking-widest uppercase">Master of Fates</h3>
            </div>
            
            <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-4 italic font-serif leading-relaxed">
              Inscribe a unique shared code to create a destination for other souls.
            </p>

            <div className="flex gap-2">
              <input 
                value={customSigil} 
                onChange={(e) => setCustomSigil(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} 
                placeholder="UNIQUE SHARED CODE..." 
                className="flex-1 bg-black border border-neutral-800 p-4 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-mono" 
              />
              <button 
                onClick={() => { setIsHost(true); rehostWithSigil(customSigil); }} 
                disabled={!customSigil || customSigil === peerId}
                className="bg-[#b28a48] hover:bg-[#cbb07a] text-black px-6 font-black text-[10px] uppercase tracking-widest disabled:opacity-20 transition-all shadow-xl"
              >
                HOST
              </button>
            </div>

            {peerId && (
              <div className="mt-6 p-4 bg-neutral-950 border border-neutral-900 rounded-sm">
                 <p className="text-[8px] text-neutral-600 font-black uppercase mb-1 tracking-widest">Active Shared Code:</p>
                 <div className="flex items-center justify-between">
                    <code className="text-sm font-black text-amber-500 font-mono tracking-widest">{peerId}</code>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(peerId); alert("Code copied to clipboard."); }}
                      className="text-[8px] text-[#b28a48] hover:text-white font-black underline uppercase tracking-widest"
                    >
                      Copy Sigil
                    </button>
                 </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-neutral-900">
               <div className="space-y-4">
                 <p className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Synchronized Knowledge</p>
                 <div className="grid grid-cols-2 gap-2">
                   {categories.map(cat => (
                     <button
                       key={cat.id}
                       onClick={() => toggleSync(cat.id)}
                       className={`px-3 py-3 text-[9px] font-black uppercase tracking-tighter border transition-all rounded-sm ${
                         syncSelection[cat.id] 
                           ? 'border-[#b28a48]/50 text-[#b28a48] bg-amber-950/20' 
                           : 'border-neutral-900 text-neutral-700 hover:border-neutral-800'
                       }`}
                     >
                       {cat.label}
                     </button>
                   ))}
                 </div>
                 <button 
                  onClick={() => forceSync(syncSelection)} 
                  disabled={connections.length === 0 || !Object.values(syncSelection).some(v => v)}
                  className="w-full bg-neutral-900 hover:bg-[#111] border border-amber-950/30 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-amber-600 transition-all shadow-xl active:scale-95 disabled:opacity-10"
                 >
                   Push Selected State
                 </button>
               </div>
            </div>
          </div>

          {/* Section: Join a Room (Client) */}
          <div className={`grim-card p-8 border-2 transition-all duration-500 rounded-sm ${!isHost ? 'border-[#b28a48]/40 shadow-2xl' : 'border-neutral-900 opacity-60'}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🌌</span>
              <h3 className="text-xs font-black fantasy-font text-neutral-300 uppercase tracking-widest">Wandering Soul</h3>
            </div>
            
            <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-4 italic font-serif leading-relaxed">
              Enter the shared code of a Master of Fates to join their chronicle.
            </p>

            <div className="flex gap-2">
              <input 
                value={targetId} 
                onChange={(e) => setTargetId(e.target.value)} 
                placeholder="HOST'S SHARED CODE..." 
                className="flex-1 bg-black border border-neutral-800 p-4 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-mono" 
              />
              <button 
                onClick={() => { setIsHost(false); joinSession(targetId); }} 
                disabled={!targetId}
                className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 px-6 font-black text-[10px] uppercase tracking-widest disabled:opacity-20 transition-all"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Logs and Connections */}
        <div className="flex flex-col gap-6">
          <div className="grim-card border-neutral-900 p-0 flex-1 flex flex-col shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-neutral-900 flex justify-between items-center bg-neutral-950/80">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${connections.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-600'}`}></span>
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Arcane Resonance Logs</h3>
              </div>
              <span className="text-[10px] text-neutral-600 font-black uppercase tracking-tighter">{connections.length} Soul(s) Linked</span>
            </div>
            
            <div className="flex-1 p-6 font-mono text-[10px] overflow-y-auto bg-black/40 scrollbar-hide max-h-[500px]">
              <div className="space-y-4">
                {serverLogs.length === 0 && (
                  <div className="text-neutral-800 italic uppercase tracking-widest text-center py-12">
                    The portal hums with silent energy...
                  </div>
                )}
                {serverLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 border-b border-white/5 pb-3">
                    <span className="text-neutral-700 whitespace-nowrap opacity-40">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                    <span className={`${
                      log.type === 'error' ? 'text-red-500' : 
                      log.type === 'success' ? 'text-green-500' : 
                      log.type === 'warn' ? 'text-amber-500' : 
                      'text-neutral-400'
                    } font-black uppercase tracking-tighter`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-neutral-900 bg-neutral-950/50">
               <p className="text-[8px] text-center text-neutral-700 uppercase font-black tracking-widest">
                  P2P Portals are directly established. No data is stored on external realms.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerPanel;
