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
  const [isOffline, setIsOffline] = useState((window as any).MYTHOS_OFFLINE_MODE || false);

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);
  }, []);

  const handleManifestSignature = () => {
    const sig = generateSoulSignature(gameState);
    setSignature(sig);
  };

  const toggleOfflineMode = () => {
    const newState = !isOffline;
    (window as any).MYTHOS_OFFLINE_MODE = newState;
    setIsOffline(newState);
    alert(newState 
      ? "Aether Link Severed. The Clockwork Arbiter is now in control. (No API usage, deterministic logic)." 
      : "Aether Link Restored. The Great Well (AI) now guides thy path."
    );
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="space-y-8 pb-24 max-w-2xl mx-auto px-2">
      <div className="border-b border-emerald-900 pb-4">
        <h2 className="text-4xl font-cinzel text-gold">The Nexus</h2>
        <p className="text-emerald-500/60 italic text-sm">"Where separate realities bleed into one."</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Aether Link Toggle (API vs LOCAL) */}
        <div className={`rune-border p-6 transition-all duration-500 ${isOffline ? 'bg-orange-950/10 border-orange-900/60 shadow-[0_0_20px_rgba(154,52,18,0.1)]' : 'bg-emerald-950/20 border-emerald-500/40'}`}>
           <div className="flex justify-between items-center border-b border-emerald-900/20 pb-3 mb-4">
              <h3 className={`text-xs font-cinzel uppercase tracking-[0.3em] font-black ${isOffline ? 'text-orange-500' : 'text-emerald-500'}`}>
                {isOffline ? 'Aether Link: SEVERED' : 'Aether Link: ACTIVE'}
              </h3>
              <div 
                onClick={toggleOfflineMode}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isOffline ? 'bg-orange-900' : 'bg-emerald-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isOffline ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
           </div>
           
           <div className="space-y-3">
             <p className="text-[10px] text-gray-400 leading-relaxed italic">
               {isOffline 
                 ? "Thou art operating under 'Clockwork Mode'. The DM uses local deterministic logic. Creative prose is sacrificed for absolute reliability and zero API strain."
                 : "Thou art connected to the 'Great Well'. The Arbiter (Gemini) provides cinematic narrative and creative world-building via the aetheric API."}
             </p>
             {!isOffline && (
               <div className="flex items-center gap-4 mt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Resonating with Cloud Engine</span>
               </div>
             )}
             {isOffline && (
               <div className="flex items-center gap-4 mt-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[9px] font-black text-orange-700 uppercase tracking-widest">Local Gears Grinding</span>
               </div>
             )}
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
             </div>

             <div className="space-y-2 pt-2">
                <button 
                  onClick={handleManifestSignature}
                  className="w-full py-4 bg-emerald-900 text-white font-cinzel text-[10px] font-black border border-gold hover:bg-emerald-800 transition-all uppercase tracking-[0.2em] shadow-lg"
                >
                  Manifest Soul Signature
                </button>
             </div>

             {signature && (
               <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
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
               </div>
             )}
           </div>
        </div>

        {/* Account Deletion */}
        <div className="rune-border p-6 bg-black/60 border-emerald-900/40 space-y-4">
           <h3 className="text-xs font-cinzel text-emerald-700 uppercase tracking-widest">Ritual of Severance</h3>
           <button 
             onClick={onDeleteAccount}
             className="w-full py-3 border border-emerald-900/50 text-emerald-900 hover:bg-emerald-900 hover:text-white transition-all font-cinzel text-[10px] font-black uppercase tracking-widest"
           >
             SEVER ALL BONDS (DELETE ACCOUNT)
           </button>
        </div>
      </div>
    </div>
  );
};

export default NexusScreen;