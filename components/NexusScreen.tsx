
import React, { useState, useEffect } from 'react';
import { GameState, Friend } from '../types';
import { generateSoulSignature } from '../geminiService';

interface NexusScreenProps {
  peerId: string;
  connectedPeers: string[];
  isHost: boolean;
  onConnect: (id: string) => void;
  username: string;
  gameState: GameState;
  onClearFriends: () => void;
  onDeleteAccount: () => void;
}

const NexusScreen: React.FC<NexusScreenProps> = ({ 
  peerId, connectedPeers, isHost, onConnect, username, gameState, onClearFriends, onDeleteAccount 
}) => {
  const [targetId, setTargetId] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const [signature, setSignature] = useState('');

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);
  }, []);

  const handleManifestSignature = () => {
    const sig = generateSoulSignature(gameState);
    setSignature(sig);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="space-y-8 pb-24 max-w-2xl mx-auto px-2">
      <div className="border-b border-emerald-900 pb-4">
        <h2 className="text-4xl font-cinzel text-gold">The Nexus</h2>
        <p className="text-emerald-500/60 italic text-sm">"Where separate realities bleed into one."</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Global Aether State */}
        <div className="rune-border p-6 bg-emerald-950/20 border-emerald-500/40 space-y-4 animate-in fade-in duration-700">
           <h3 className="text-xs font-cinzel text-emerald-500 uppercase tracking-[0.3em] font-black">Global Aetheric Equilibrium</h3>
           <div className="p-4 bg-black/60 border border-emerald-900/30 rounded-sm">
              <p className="text-xs text-gray-300 leading-relaxed italic">
                "The Aether is not infinite. Every soul that awakens, every spell that manifests, draws from the Great Well. Should the Convergence reach zero, the Engine enters a state of high turbulence until the Turning of the Stars (UTC Midnight)."
              </p>
              <div className="mt-4 flex items-center gap-4">
                 <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                 <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Spectral Connection: STABLE</span>
              </div>
           </div>
        </div>

        {/* Migration Section */}
        <div className="rune-border p-6 bg-emerald-900/5 border-gold/40 space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center border-b border-gold/20 pb-3">
              <h3 className="text-sm font-cinzel text-gold uppercase tracking-[0.2em] font-black">Ritual of Transmigration</h3>
              <span className="text-[7px] bg-gold text-black px-1.5 py-0.5 rounded font-black">ACCOUNT SYNC</span>
           </div>
           
           <div className="space-y-4">
             <div className="space-y-1">
               <label className="text-[10px] font-cinzel text-emerald-500 uppercase font-black">Thy Engine ID</label>
               <div className="p-3 bg-black/60 border border-emerald-900/30 font-mono text-gold text-lg text-center tracking-[0.5em] rounded-sm">
                  {gameState.userAccount.id}
               </div>
               <p className="text-[8px] text-gray-600 italic">This 10-character key uniquely identifies thy vessel within the Engine.</p>
             </div>

             <div className="space-y-2 pt-2">
                <p className="text-[10px] text-gray-400 leading-relaxed font-medium">To migrate thy soul to another device (PC or Mobile), thou must manifest thy complete **Soul Signature**.</p>
                <button 
                  onClick={handleManifestSignature}
                  className="w-full py-4 bg-emerald-900 text-white font-cinzel text-[10px] font-black border border-gold hover:bg-emerald-800 transition-all uppercase tracking-[0.2em] shadow-lg"
                >
                  Manifest Soul Signature
                </button>
             </div>

             {signature && (
               <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                 <label className="text-[10px] font-cinzel text-gold uppercase font-black tracking-widest">Encoded Soul Essence</label>
                 <div className="relative">
                    <textarea 
                      readOnly 
                      value={signature} 
                      className="w-full h-24 bg-black border border-gold/40 p-3 text-gold font-mono text-[9px] outline-none resize-none custom-scrollbar" 
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(signature);
                        alert("Thy Soul Essence has been bound to the clipboard.");
                      }}
                      className="absolute bottom-2 right-2 px-3 py-1 bg-gold text-black text-[8px] font-black uppercase rounded shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      Copy Essence
                    </button>
                 </div>
                 <p className="text-[8px] text-red-900 font-black uppercase text-center animate-pulse tracking-tighter">Warning: This signature contains all thy memories. Keep it secret.</p>
               </div>
             )}
           </div>
        </div>

        {/* Multiplayer Section */}
        <div className="rune-border p-6 bg-black/60 backdrop-blur space-y-6 border-emerald-900/60">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest">Thy Resonance Signature (Session Code)</label>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={peerId || 'Manifesting...'} 
                  className="flex-1 bg-black/40 border border-emerald-900/30 p-3 text-gold font-mono text-xs outline-none" 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(peerId);
                    alert('Signature Bound to Clipboard');
                  }}
                  className="px-4 bg-emerald-900/20 border border-emerald-900 text-[10px] font-cinzel text-gold hover:bg-emerald-900/40 transition-all"
                >
                  COPY
                </button>
              </div>
              <p className="text-[9px] text-gray-600 italic">Share this code for multiplayer soul-binding in the current session.</p>
            </div>

            <div className="h-px bg-emerald-900/20" />

            <div className="space-y-1">
              <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest">Bind to External Engine</label>
              <div className="flex gap-2">
                <input 
                  value={targetId} 
                  onChange={e => setTargetId(e.target.value)} 
                  placeholder="ENTER SESSION CODE..."
                  className="flex-1 bg-black/40 border border-emerald-900/30 p-3 text-gold font-mono text-xs outline-none focus:border-gold transition-all" 
                />
                <button 
                  onClick={() => targetId && onConnect(targetId)}
                  className="px-6 py-2 bg-emerald-900 text-white font-cinzel text-xs border border-gold hover:bg-emerald-800 disabled:opacity-30 transition-all"
                >
                  BIND
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Deletion */}
        <div className="rune-border p-6 bg-black/60 border-emerald-900/40 space-y-4">
           <h3 className="text-xs font-cinzel text-emerald-700 uppercase tracking-widest">Ritual of Severance</h3>
           <p className="text-[10px] text-gray-500 leading-relaxed italic">"Abandon thy vessel and let thy fragments return to the void."</p>
           <button 
             onClick={onDeleteAccount}
             className="w-full py-3 border border-emerald-900/50 text-emerald-900 hover:bg-emerald-900 hover:text-white transition-all font-cinzel text-[10px] font-black uppercase tracking-widest"
           >
             SEVER ALL BONDS (DELETE ACCOUNT)
           </button>
        </div>

        {/* Installation Instructions */}
        {!isStandalone && (
          <div className="rune-border p-5 bg-gold/5 border-gold/30 space-y-3">
            <h3 className="text-xs font-cinzel text-gold uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Manifestation Ritual (Install)
            </h3>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Manifest the Mythos Engine directly to thy home screen for a full-screen, immersive experience.
            </p>
            <div className="p-3 bg-black/40 border border-gold/10 rounded">
              <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">
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
      </div>
    </div>
  );
};

export default NexusScreen;
