
import React, { useState } from 'react';
import { UserAccount } from '../types';

interface ProfilePanelProps {
  user: UserAccount;
  onlineFriends?: string[];
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ user, onlineFriends = [] }) => {
  const [showPin, setShowPin] = useState(false);
  
  const friends = user.friends || [];
  const buildDate = new Date().toLocaleDateString();

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 pb-24 pt-8 md:pt-16 px-4 md:px-0">
      <div className="text-center">
        <h2 className="text-2xl md:text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Soul Inscription</h2>
        <p className="text-neutral-600 text-[9px] md:text-xs uppercase tracking-[0.4em] mt-1 md:mt-2 font-black">Identity Bound to the Mythos Engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grim-card p-6 md:p-12 border-2 border-[#b28a48]/20 rounded-sm shadow-2xl relative overflow-hidden bg-black/60">
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
              </section>
            </div>

            <section className="pt-8 border-t border-[#b28a48]/10">
              <div className="flex items-center justify-between text-neutral-700">
                <div className="text-left">
                  <p className="text-[7px] font-black uppercase tracking-widest">Deployment Resonance</p>
                  <p className="text-[10px] font-black text-neutral-600">v1.0.7-stable</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-black uppercase tracking-widest">Last Inscription</p>
                  <p className="text-[10px] font-black text-neutral-600">{buildDate}</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Known Souls (Friends List) */}
        <div className="grim-card border-2 border-[#b28a48]/10 bg-black/40 flex flex-col rounded-sm shadow-xl overflow-hidden">
          <div className="p-4 border-b border-[#b28a48]/10 bg-neutral-950/80">
            <h3 className="text-[10px] font-black text-[#b28a48] uppercase tracking-[0.3em] text-left">Resonating Souls</h3>
            <p className="text-[7px] text-neutral-600 uppercase tracking-widest mt-1 text-left">Previously encountered playmates</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide max-h-[400px]">
            {friends.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-3xl opacity-10">🕯️</span>
                <p className="text-[8px] text-neutral-700 uppercase tracking-widest mt-4 font-black">Lone wanderer... no souls bound yet.</p>
              </div>
            ) : (
              friends.map(sigil => {
                const isOnline = onlineFriends.includes(sigil);
                return (
                  <div key={sigil} className="flex items-center justify-between p-3 bg-neutral-900/40 border border-neutral-800 rounded-sm group hover:border-[#b28a48]/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-black border border-neutral-800 flex items-center justify-center text-xs opacity-50">👤</div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-neutral-800'}`}></div>
                      </div>
                      <div className="text-left">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-[#b28a48]' : 'text-neutral-600'}`}>{sigil}</p>
                        <p className="text-[7px] text-neutral-700 font-bold uppercase">{isOnline ? 'Resonating Now' : 'Echoing in Void'}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="p-4 border-t border-[#b28a48]/10 bg-neutral-950/30">
            <p className="text-[7px] text-center text-neutral-700 uppercase font-black tracking-widest italic">
              Souls are manifest through the Portal. Join a party to bind their sigil.
            </p>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-[7px] md:text-[8px] text-neutral-800 uppercase tracking-[0.4em] font-black">Mythos Core Engine v1.0.7</p>
      </div>
    </div>
  );
};

export default ProfilePanel;
