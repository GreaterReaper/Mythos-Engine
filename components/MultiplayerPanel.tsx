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
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Portal of Souls</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2 font-black">AI DM is permanent. Designate a Party Leader.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className={`grim-card p-8 border-2 transition-all duration-500 rounded-sm ${isHost ? 'border-[#b28a48]/40 shadow-2xl' : 'border-neutral-900 opacity-60'}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">👑</span>
              <h3 className="text-xs font-black fantasy-font text-[#b28a48] tracking-widest uppercase">Party Leader (Host)</h3>
            </div>
            
            <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-4 italic font-serif leading-relaxed">
              As Leader, you control the campaign flow and world maps. AI remains the DM.
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
                className="bg-[#b28a48] hover:bg-[#cbb07a] text-black px-6 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl"
              >
                LEAD PARTY
              </button>
            </div>

            {peerId && (
              <div className="mt-6 p-4 bg-neutral-950 border border-neutral-900 rounded-sm">
                 <p className="text-[8px] text-neutral-600 font-black uppercase mb-1 tracking-widest">Active Shared Code:</p>
                 <div className="flex items-center justify-between">
                    <code className="text-sm font-black text-amber-500 font-mono tracking-widest">{peerId}</code>
                    <button onClick={() => navigator.clipboard.writeText(peerId)} className="text-[8px] text-[#b28a48] font-black underline uppercase tracking-widest">Copy Sigil</button>
                 </div>
              </div>
            )}
          </div>

          <div className={`grim-card p-8 border-2 transition-all duration-500 rounded-sm ${!isHost ? 'border-[#b28a48]/40 shadow-2xl' : 'border-neutral-900 opacity-60'}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🌌</span>
              <h3 className="text-xs font-black fantasy-font text-neutral-300 uppercase tracking-widest">Fellowship Member</h3>
            </div>
            
            <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-4 italic font-serif leading-relaxed">
              Enter the shared code of a Party Leader to join their chronicle.
            </p>

            <div className="flex gap-2">
              <input 
                value={targetId} 
                onChange={(e) => setTargetId(e.target.value)} 
                placeholder="LEADER'S SHARED CODE..." 
                className="flex-1 bg-black border border-neutral-800 p-4 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-mono" 
              />
              <button 
                onClick={() => { setIsHost(false); joinSession(targetId); }} 
                className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 px-6 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grim-card border-neutral-900 p-0 flex-1 flex flex-col shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-neutral-900 flex justify-between items-center bg-neutral-950/80">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${connections.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-600'}`}></span>
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Resonance logs</h3>
              </div>
              <span className="text-[10px] text-neutral-600 font-black uppercase tracking-tighter">{connections.length} Soul(s) Linked</span>
            </div>
            
            <div className="flex-1 p-6 font-mono text-[10px] overflow-y-auto bg-black/40 scrollbar-hide max-h-[500px]">
              <div className="space-y-4">
                {connections.length === 0 && <div className="text-neutral-800 italic uppercase tracking-widest text-center py-12">The portal is silent...</div>}
                {connections.map((conn) => (
                  <div key={conn.peer} className="flex gap-4 border-b border-white/5 pb-3">
                    <span className="text-[#b28a48] font-black uppercase tracking-tighter">SOUL BOUND: {conn.peer}</span>
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