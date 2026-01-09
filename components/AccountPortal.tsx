
import React, { useState } from 'react';
import { STORAGE_PREFIX } from '../constants';

interface AccountPortalProps {
  onLogin: (username: string) => void;
  onMigrate: (signature: string) => boolean;
}

const AccountPortal: React.FC<AccountPortalProps> = ({ onLogin, onMigrate }) => {
  const [activeTab, setActiveTab] = useState<'Forge' | 'Rebind'>('Forge');
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');

  const handleMigrate = () => {
    setError('');
    const success = onMigrate(signature);
    if (!success) {
      setError("Soul resonance failed. The signature is corrupted.");
    }
  };

  const handlePurge = () => {
    if (confirm("Art thou certain? This ritual shall dissolve all soul fragments stored in this vessel's memory. This action is irreversible.")) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      alert("Local memory purged. The aether is clear.");
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full rune-border p-8 bg-black/80 space-y-8 text-center shadow-2xl shadow-emerald-500/20 border-emerald-500">
        <div className="space-y-2">
          <h1 className="text-4xl font-cinzel text-gold animate-pulse">Mythos Engine</h1>
          <p className="text-[10px] text-emerald-500 font-cinzel tracking-[0.3em] uppercase font-black">Soul Gateway</p>
        </div>

        <div className="flex border-b border-emerald-500/30">
          <button 
            onClick={() => setActiveTab('Forge')}
            className={`flex-1 py-2 text-[10px] font-cinzel font-black transition-all ${activeTab === 'Forge' ? 'text-gold border-b-2 border-gold' : 'text-emerald-500/40'}`}
          >
            FORGE ACCOUNT
          </button>
          <button 
            onClick={() => setActiveTab('Rebind')}
            className={`flex-1 py-2 text-[10px] font-cinzel font-black transition-all ${activeTab === 'Rebind' ? 'text-gold border-b-2 border-gold' : 'text-emerald-500/40'}`}
          >
            REBIND SOUL
          </button>
        </div>

        <div className="space-y-6 min-h-[160px] flex flex-col justify-center">
          {activeTab === 'Forge' ? (
            <div className="space-y-4">
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ENTER THY NAME"
                className="w-full bg-black/40 border-b border-emerald-500 text-center text-gold font-cinzel p-2 focus:border-gold outline-none placeholder:text-emerald-900/40"
              />
              <button 
                onClick={() => name && onLogin(name)}
                className="w-full py-4 bg-emerald-900 text-white font-cinzel border border-gold hover:bg-emerald-800 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] font-black tracking-widest"
              >
                AWAKEN SOUL
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea 
                value={signature}
                onChange={e => setSignature(e.target.value)}
                placeholder="PASTE SOUL SIGNATURE..."
                className="w-full h-32 bg-black/40 border border-emerald-500/30 p-3 text-gold font-mono text-[10px] focus:border-gold outline-none resize-none placeholder:text-emerald-900/40"
              />
              {error && <p className="text-[8px] text-emerald-500 font-cinzel uppercase font-black">{error}</p>}
              <button 
                onClick={handleMigrate}
                disabled={!signature}
                className="w-full py-4 bg-gold/10 text-gold font-cinzel border border-gold hover:bg-gold/20 transition-all disabled:opacity-30 font-black tracking-widest"
              >
                REBIND EXISTENCE
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-[8px] text-emerald-500/60 font-cinzel uppercase font-black">BY ENTERING, THOU ART BOUND BY THE ANCIENT LAWS OF THE ENGINE.</p>
          <button 
            onClick={handlePurge}
            className="text-[7px] text-emerald-500/40 hover:text-emerald-500 font-cinzel uppercase tracking-widest transition-colors font-black"
          >
            Purge Ancient Fragments (Reset All Local Data)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountPortal;
