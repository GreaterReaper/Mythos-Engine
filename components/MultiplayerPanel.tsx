
import React, { useState } from 'react';
import { DataConnection } from 'peerjs';

interface MultiplayerPanelProps {
  peerId: string;
  isHost: boolean;
  connections: DataConnection[];
  serverLogs: any[];
  joinSession: (id: string) => void;
  setIsHost: (val: boolean) => void;
  forceSync: (selection: Record<string, boolean>) => void;
  kickSoul: (id: string) => void;
  rehostWithSigil: (id: string) => void;
}

const MultiplayerPanel: React.FC<MultiplayerPanelProps> = ({ 
  peerId, isHost, connections, joinSession, setIsHost, rehostWithSigil
}) => {
  const [targetId, setTargetId] = useState('');
  
  const copyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?join=${peerId}`;
    navigator.clipboard.writeText(url);
    alert("Invite Link Copied to Clipboard!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 pt-8">
      <div className="text-center">
        <h2 className="text-3xl font-black fantasy-font text-[#b28a48]">Soul Portal</h2>
        <p className="text-neutral-500 text-[10px] uppercase tracking-[0.4em] mt-2 font-black">Sync your legends across the ether</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="grim-card p-8 border-2 border-neutral-900 rounded-sm space-y-6">
          <h3 className="text-sm font-black uppercase text-[#b28a48] tracking-widest border-b border-neutral-900 pb-2">Host Session</h3>
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-sm">
             <p className="text-[8px] text-neutral-600 font-black uppercase mb-2">Portal Sigil</p>
             <code className="text-lg font-black text-amber-500 font-mono tracking-widest">{peerId || '...'}</code>
          </div>
          <button onClick={copyInvite} className="w-full bg-[#b28a48] text-black py-4 font-black text-[10px] uppercase tracking-[0.4em] active:scale-95">Generate Invite Link</button>
        </div>

        <div className="grim-card p-8 border-2 border-neutral-900 rounded-sm space-y-6">
          <h3 className="text-sm font-black uppercase text-neutral-400 tracking-widest border-b border-neutral-900 pb-2">Join Fellowship</h3>
          <input 
            value={targetId} onChange={(e) => setTargetId(e.target.value)} 
            placeholder="ENTER SIGIL CODE..." 
            className="w-full bg-black border border-neutral-800 p-4 text-xs font-mono text-amber-500 outline-none"
          />
          <button onClick={() => joinSession(targetId)} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-4 font-black text-[10px] uppercase tracking-[0.4em] active:scale-95">Pierce Portal</button>
        </div>
      </div>
      
      <div className="grim-card p-6 border border-neutral-900 rounded-sm">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-neutral-600">
          <span>Resonating Souls</span>
          <span>{connections.length} Bound</span>
        </div>
        <div className="mt-4 space-y-2">
          {connections.map(c => (
            <div key={c.peer} className="p-3 bg-neutral-900/50 border border-neutral-800 flex justify-between items-center rounded-sm">
              <span className="text-[10px] font-mono text-blue-400">{c.peer}</span>
              <span className="text-[8px] text-green-500 font-black">STABLE</span>
            </div>
          ))}
          {connections.length === 0 && <p className="text-center text-neutral-800 italic text-xs py-8">No other souls have manifest...</p>}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerPanel;
