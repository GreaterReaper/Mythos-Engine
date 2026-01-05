
import React, { useState, useEffect } from 'react';

interface NexusScreenProps {
  peerId: string;
  connectedPeers: string[];
  isHost: boolean;
  onConnect: (id: string) => void;
  username: string;
}

const NexusScreen: React.FC<NexusScreenProps> = ({ peerId, connectedPeers, isHost, onConnect, username }) => {
  const [targetId, setTargetId] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running as a PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);
  }, []);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="space-y-8 pb-24 max-w-2xl mx-auto px-2">
      <div className="border-b border-red-900 pb-4">
        <h2 className="text-4xl font-cinzel text-[#a16207]">The Nexus</h2>
        <p className="text-gray-500 italic text-sm">"Where separate realities bleed into one."</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* PWA Installation Ritual - Only show if not installed */}
        {!isStandalone && (
          <div className="rune-border p-5 bg-gold/5 border-gold/30 space-y-3 animate-in fade-in slide-in-from-top-4 duration-700">
            <h3 className="text-xs font-cinzel text-gold uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Ritual of Manifestation (Install)
            </h3>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Manifest the Mythos Engine directly to thy home screen for a full-screen, immersive experience.
            </p>
            <div className="p-3 bg-black/40 border border-gold/10 rounded">
              <p className="text-[10px] font-bold text-red-900 uppercase mb-1">
                {isIOS ? 'On iOS Safari:' : 'On Android Chrome:'}
              </p>
              <p className="text-[10px] text-gray-300">
                {isIOS 
                  ? 'Tap the Share icon (square with arrow) and select "Add to Home Screen".' 
                  : 'Tap the three dots (⋮) and select "Install App" or "Add to Home Screen".'}
              </p>
            </div>
          </div>
        )}

        {/* Connection Portal */}
        <div className="rune-border p-6 bg-black/60 backdrop-blur space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-cinzel text-red-900 uppercase tracking-widest">Thy Resonance Signature</label>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={peerId || 'Manifesting...'} 
                  className="flex-1 bg-black/40 border border-red-900/30 p-3 text-gold font-mono text-xs outline-none" 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(peerId);
                    alert('Signature Binded to Clipboard');
                  }}
                  className="px-4 bg-red-900/20 border border-red-900 text-[10px] font-cinzel text-gold hover:bg-red-900/40 transition-all"
                >
                  COPY
                </button>
              </div>
              <p className="text-[9px] text-gray-600 italic">Share this ID with other souls to invite them to thy Engine.</p>
            </div>

            <div className="h-px bg-red-900/20" />

            <div className="space-y-1">
              <label className="text-[10px] font-cinzel text-red-900 uppercase tracking-widest">Bind to External Engine</label>
              <div className="flex gap-2">
                <input 
                  value={targetId} 
                  onChange={e => setTargetId(e.target.value)} 
                  placeholder="ENTER PEER ID..."
                  className="flex-1 bg-black/40 border border-red-900/30 p-3 text-gold font-mono text-xs outline-none focus:border-gold transition-all" 
                />
                <button 
                  onClick={() => targetId && onConnect(targetId)}
                  disabled={!targetId}
                  className="px-6 py-2 bg-red-900 text-white font-cinzel text-xs border border-gold hover:bg-red-800 disabled:opacity-30 transition-all"
                >
                  BIND
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status and Connected Souls */}
        <div className="rune-border p-6 bg-black/40 space-y-4">
          <div className="flex justify-between items-center border-b border-red-900/30 pb-2">
            <h3 className="text-xs font-cinzel text-gold uppercase tracking-widest">Bonded Souls</h3>
            <span className="text-[10px] text-red-900 font-bold">{connectedPeers.length} ACTIVE</span>
          </div>

          <div className="space-y-2">
            {connectedPeers.map(p => (
              <div key={p} className="flex items-center justify-between p-3 bg-red-900/5 border border-red-900/20 group">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                   <span className="text-[10px] text-gray-300 font-mono truncate max-w-[150px]">{p}</span>
                </div>
                <span className="text-[8px] text-gold/40 uppercase font-cinzel group-hover:text-gold transition-colors">Stable Bond</span>
              </div>
            ))}

            {connectedPeers.length === 0 && (
              <div className="py-12 text-center opacity-30">
                <div className="w-12 h-12 border-2 border-dashed border-red-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 bg-red-900 rounded-full" />
                </div>
                <p className="font-cinzel italic text-xs text-gray-500 uppercase">Alone in the void. Manifest a bond.</p>
              </div>
            )}
          </div>
        </div>

        {/* Multiplayer Info */}
        <div className="p-4 bg-red-900/5 border border-red-900/10 text-[10px] text-gray-500 italic leading-relaxed">
          Multiplayer syncing uses peer-to-peer soul resonance. The Engine Host controls the Dungeon Master and tactical manifestations. All bonded souls will receive updates in real-time as the Chronicle unfolds.
        </div>
      </div>
    </div>
  );
};

export default NexusScreen;
