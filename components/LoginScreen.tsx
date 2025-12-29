
import React, { useState } from 'react';

interface LoginScreenProps {
  setPlayerName: (name: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ setPlayerName }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setPlayerName(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
      <div className="max-w-md w-full px-6">
        <div className="grim-card p-10 text-center border-2 border-[#b28a48]/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          <div className="mb-8">
            <h1 className="text-5xl font-black tracking-[0.3em] text-[#b28a48] drop-shadow-[0_2px_10px_rgba(178,138,72,0.5)] mb-2">MYTHOS</h1>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#b28a48] to-transparent mx-auto opacity-50"></div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.5em] mt-4 font-bold">Arcane TTRPG Engine</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600 block">Identity</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ENTER PLAYER NAME..."
                className="w-full bg-black border-b-2 border-[#1a1a1a] focus:border-[#b28a48] p-4 text-center text-sm tracking-widest text-[#b28a48] outline-none transition-colors uppercase font-serif italic"
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-[#1a1a1a] hover:bg-[#b28a48] hover:text-black border border-[#b28a48]/30 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg"
            >
              Step into the Grimoire
            </button>
          </form>

          <p className="mt-10 text-[8px] text-neutral-700 italic uppercase tracking-tighter">
            By entering, you bind your saga to the Mythos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
