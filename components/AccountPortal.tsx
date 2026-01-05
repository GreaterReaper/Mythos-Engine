
import React, { useState } from 'react';

interface AccountPortalProps {
  onLogin: (username: string) => void;
}

const AccountPortal: React.FC<AccountPortalProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full rune-border p-8 bg-black/80 space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-cinzel text-gold animate-pulse">Mythos Engine</h1>
          <p className="text-[10px] text-red-900 font-cinzel tracking-[0.3em]">INITIATE SOUL BINDING</p>
        </div>

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
            FORGE ACCOUNT
          </button>
        </div>

        <p className="text-[8px] text-gray-600 font-cinzel">BY ENTERING, THOU ART BOUND BY THE ANCIENT LAWS OF THE ENGINE.</p>
      </div>
    </div>
  );
};

export default AccountPortal;
