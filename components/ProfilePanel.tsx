import React, { useState } from 'react';
import { UserAccount } from '../types';

interface ProfilePanelProps {
  user: UserAccount;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ user }) => {
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-8 md:space-y-12 pb-24 pt-8 md:pt-16 px-4 md:px-0">
      <div className="text-center">
        <h2 className="text-2xl md:text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Soul Inscription</h2>
        <p className="text-neutral-600 text-[9px] md:text-xs uppercase tracking-[0.4em] mt-1 md:mt-2 font-black">Identity Bound to the Mythos Engine</p>
      </div>

      <div className="grim-card p-6 md:p-12 border-2 border-[#b28a48]/20 rounded-sm shadow-2xl relative overflow-hidden bg-black/60">
        {/* Subtle background icon */}
        <div className="absolute -top-10 -right-10 text-[120px] md:text-[180px] opacity-5 pointer-events-none grayscale">🆔</div>
        
        <div className="space-y-6 md:space-y-10 relative z-10 text-left">
          <section>
            <label className="text-[7px] md:text-[8px] font-black text-neutral-600 uppercase tracking-[0.3em] block mb-1 md:mb-2">Soul Identity</label>
            <h3 className="text-2xl md:text-5xl font-black fantasy-font text-[#b28a48] tracking-widest break-words">{user.displayName}</h3>
            {user.isAdmin && (
              <div className="mt-1.5 md:mt-2 inline-block px-2 md:px-3 py-0.5 md:py-1 bg-amber-500/10 border border-amber-500/30 rounded-sm">
                <span className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Eternal Architect Enabled</span>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pt-6 md:pt-8 border-t border-[#b28a48]/10">
            <section>
              <label className="text-[7px] md:text-[8px] font-black text-neutral-600 uppercase tracking-[0.3em] block mb-1">Sigil (Username)</label>
              <div className="bg-black/40 border border-neutral-900 p-3 md:p-4 rounded-sm">
                <code className="text-base md:text-lg font-black text-neutral-300 font-mono tracking-widest uppercase">{user.username}</code>
              </div>
              <p className="text-[6px] md:text-[7px] text-neutral-700 uppercase mt-1 md:mt-2 font-bold italic">Your unique identifier across the Ether.</p>
            </section>

            <section>
              <label className="text-[7px] md:text-[8px] font-black text-neutral-600 uppercase tracking-[0.3em] block mb-1">Arcane PIN</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-black/40 border border-neutral-900 p-3 md:p-4 rounded-sm flex items-center justify-between">
                  <code className="text-base md:text-lg font-black text-amber-600 font-mono tracking-[0.4em] md:tracking-[0.5em]">
                    {showPin ? user.pin : '••••'}
                  </code>
                  <button 
                    onClick={() => setShowPin(!showPin)}
                    className="text-[8px] md:text-[10px] font-black text-neutral-600 hover:text-[#b28a48] uppercase tracking-widest transition-colors"
                  >
                    {showPin ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              </div>
              <p className="text-[6px] md:text-[7px] text-red-900/60 uppercase mt-1 md:mt-2 font-bold italic">Required for Ether-Restoration.</p>
            </section>
          </div>
        </div>

        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-[#b28a48]/10 text-center opacity-40">
           <p className="text-[8px] md:text-[9px] text-neutral-500 font-serif italic leading-relaxed">
             This soul was inscribed on the Mythos Engine Archive. 
             <br />Its essence is transient but preserved through the Ether.
           </p>
        </div>
      </div>
      
      <div className="mt-8 md:mt-12 text-center">
        <p className="text-[7px] md:text-[8px] text-neutral-800 uppercase tracking-[0.4em] font-black">Sigil Inscription Ver 1.0.5</p>
      </div>
    </div>
  );
};

export default ProfilePanel;