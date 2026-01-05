
import React, { useState } from 'react';

interface MatchmakingModalProps {
  onClose: () => void;
  onConnect: (id: string) => void;
  peerId: string;
  connectedPeers: string[];
}

const MatchmakingModal: React.FC<MatchmakingModalProps> = ({ onClose, onConnect, peerId, connectedPeers }) => {
  const [targetId, setTargetId] = useState('');

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur flex items-center justify-center p-4">
      <div className="max-w-md w-full rune-border p-8 bg-black space-y-8">
        <div className="flex justify-between items-center border-b border-red-900 pb-2">
          <h2 className="text-2xl font-cinzel text-gold">Soul Resonance</h2>
          <button onClick={onClose} className="text-red-900 text-xl font-bold hover:text-red-500">×</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-cinzel text-red-900 uppercase">Thy Resonance ID (Share this)</label>
            <div className="flex gap-2">
              <input readOnly value={peerId} className="flex-1 bg-black/40 border border-red-900/30 p-2 text-gold font-mono text-xs outline-none" />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(peerId);
                  alert('ID Bound to Clipboard');
                }}
                className="px-3 bg-red-900/20 border border-red-900 text-[10px] font-cinzel text-gold"
              >
                COPY
              </button>
            </div>
          </div>

          <div className="h-0.5 bg-red-900/20" />

          <div className="space-y-1">
            <label className="text-[10px] font-cinzel text-red-900 uppercase">Connect to External Soul</label>
            <div className="flex gap-2">
              <input 
                value={targetId} 
                onChange={e => setTargetId(e.target.value)} 
                placeholder="ENTER PEER ID..."
                className="flex-1 bg-black/40 border border-red-900/30 p-2 text-gold font-mono text-xs outline-none focus:border-gold" 
              />
              <button 
                onClick={() => targetId && onConnect(targetId)}
                className="px-6 py-2 bg-red-900 text-white font-cinzel text-xs border border-gold hover:bg-red-800"
              >
                BIND
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
           <h3 className="text-[10px] font-cinzel text-red-900 uppercase">Connected Bonds ({connectedPeers.length})</h3>
           <div className="max-h-32 overflow-y-auto space-y-1">
             {connectedPeers.map(p => (
               <div key={p} className="flex items-center justify-between p-2 bg-red-900/5 border border-red-900/20">
                 <span className="text-[10px] text-gray-500 font-mono truncate">{p}</span>
                 <span className="text-[8px] text-green-500 font-bold uppercase">Active</span>
               </div>
             ))}
             {connectedPeers.length === 0 && <p className="text-[8px] text-gray-700 italic text-center py-4">Alone in the void...</p>}
           </div>
        </div>

        <p className="text-[8px] text-gray-600 font-cinzel text-center">Multiplayer syncing uses peer-to-peer soul resonance. Host controls the DM.</p>
      </div>
    </div>
  );
};

export default MatchmakingModal;
