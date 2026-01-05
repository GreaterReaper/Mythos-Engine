
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
      <div className="max-w-md w-full rune-border p-8 bg-black/80 space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-cinzel text-gold animate-pulse">Mythos Engine</h1>
          <p className="text-[10px] text-red-900 font-cinzel tracking-[0.3em] uppercase">Soul Gateway</p>
        </div>

        <div className="flex border-b border-red-900/30">
          <button 
            onClick={() => setActiveTab('Forge')}
            className={`flex-1 py-2 text-[10px] font-cinzel transition-all ${activeTab === 'Forge' ? 'text-gold border-b border-gold' : 'text-gray-600'}`}
          >
            FORGE ACCOUNT
          </button>
          <button 
            onClick={() => setActiveTab('Rebind')}
            className={`flex-1 py-2 text-[10px] font-cinzel transition-all ${activeTab === 'Rebind' ? 'text-gold border-b border-gold' : 'text-gray-600'}`}
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
                className="w-full bg-transparent border-b border-red-900 text-center text-gold font-cinzel p-2 focus:border-gold outline-none"
              />
              <button 
                onClick={() => name && onLogin(name)}
                className="w-full py-4 bg-red-900 text-white font-cinzel border border-gold hover:bg-red-800 transition-all shadow-[0_0_15px_rgba(127,29,29,0.5)]"
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
                className="w-full h-32 bg-black/40 border border-red-900/30 p-3 text-gold font-mono text-[10px] focus:border-gold outline-none resize-none"
              />
              {error && <p className="text-[8px] text-red-500 font-cinzel uppercase">{error}</p>}
              <button 
                onClick={handleMigrate}
                disabled={!signature}
                className="w-full py-4 bg-gold/10 text-gold font-cinzel border border-gold hover:bg-gold/20 transition-all disabled:opacity-30"
              >
                REBIND EXISTENCE
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-[8px] text-gray-600 font-cinzel uppercase">BY ENTERING, THOU ART BOUND BY THE ANCIENT LAWS OF THE ENGINE.</p>
          <button 
            onClick={handlePurge}
            className="text-[7px] text-red-900/40 hover:text-red-900 font-cinzel uppercase tracking-widest transition-colors"
          >
            Purge Ancient Fragments (Reset All Local Data)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountPortal;
