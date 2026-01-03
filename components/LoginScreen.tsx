import React, { useState } from 'react';
import { UserAccount } from '../types';

interface LoginScreenProps {
  setCurrentUser: (user: UserAccount) => void;
}

const ADMIN_SECRET = "MYTHOS_ADMIN";

const LoginScreen: React.FC<LoginScreenProps> = ({ setCurrentUser }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const accounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    // Ensure case-insensitive username lookup with trimming
    const user = accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase());

    if (!user) {
      setError("This soul has not been inscribed.");
      return;
    }

    // Case-insensitive Admin override check
    const isElevating = adminCode.trim().toUpperCase() === ADMIN_SECRET.toUpperCase();
    
    // Status transfer: Admins bypass PIN check
    if (!isElevating && !user.isAdmin && pin !== user.pin) {
      setError("Arcane PIN mismatch.");
      return;
    }

    if (isElevating) {
      user.isAdmin = true;
    }

    localStorage.setItem('mythos_active_session', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !displayName) {
      setError("The grimoire requires all details.");
      return;
    }

    if (pin.length !== 4 || isNaN(Number(pin))) {
      setError("A 4-digit PIN is required for the Ether-Link.");
      return;
    }

    const accounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    if (accounts.some(a => a.username.toLowerCase() === username.trim().toLowerCase())) {
      setError("This sigil is already bound.");
      return;
    }

    const newUser: UserAccount = {
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      isAdmin: adminCode.trim().toUpperCase() === ADMIN_SECRET.toUpperCase(),
      pin: pin
    };

    accounts.push(newUser);
    localStorage.setItem('mythos_accounts', JSON.stringify(accounts));
    localStorage.setItem('mythos_active_session', JSON.stringify(newUser));
    setCurrentUser(newUser);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] overflow-y-auto pt-10">
      <div className="max-w-md w-full px-6 py-10">
        <div className="grim-card p-8 md:p-10 text-center border-2 border-[#b28a48]/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-[0.3em] text-[#b28a48] drop-shadow-[0_2px_10px_rgba(178,138,72,0.5)] mb-2">MYTHOS</h1>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#b28a48] to-transparent mx-auto opacity-50"></div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.5em] mt-4 font-bold">Arcane TTRPG Engine</p>
          </div>

          <div className="flex border-b border-[#1a1a1a] mb-8">
            <button 
              onClick={() => { setIsRegistering(false); setError(null); }}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${!isRegistering ? 'text-[#b28a48] border-b-2 border-[#b28a48]' : 'text-neutral-700'}`}
            >
              Enter Grimoire
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(null); }}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isRegistering ? 'text-[#b28a48] border-b-2 border-[#b28a48]' : 'text-neutral-700'}`}
            >
              Inscribe Soul
            </button>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Soul Name (Display)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alistair the Bold"
                  className="w-full bg-black border border-[#1a1a1a] focus:border-[#b28a48] p-3 text-sm tracking-widest text-[#b28a48] outline-none transition-colors uppercase font-serif italic"
                />
              </div>
            )}
            
            <div className="space-y-1 text-left">
              <label className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Sigil (Username)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="USERNAME"
                className="w-full bg-black border border-[#1a1a1a] focus:border-[#b28a48] p-3 text-sm tracking-widest text-[#b28a48] outline-none transition-colors uppercase font-mono"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Arcane PIN (4-Digits)</label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-black border border-[#1a1a1a] focus:border-[#b28a48] p-3 text-sm tracking-widest text-[#b28a48] outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[8px] font-black uppercase tracking-widest text-neutral-600 opacity-40">Admin Access Code (Optional)</label>
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black border border-[#1a1a1a] focus:border-[#b28a48] p-3 text-sm tracking-widest text-neutral-700 outline-none transition-colors uppercase font-mono"
              />
            </div>

            {error && <p className="text-[9px] text-red-600 font-bold uppercase tracking-tight py-2 animate-pulse">{error}</p>}

            <button
              type="submit"
              className="w-full bg-[#1a1a1a] hover:bg-[#b28a48] hover:text-black border border-[#b28a48]/30 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] transition-all shadow-lg mt-4"
            >
              {isRegistering ? 'Sacrifice Identity' : 'Bind Session'}
            </button>
          </form>

          <p className="mt-8 text-[7px] text-neutral-800 italic uppercase tracking-tighter">
            By inscribing, your saga is forever bound to the Mythos Archive.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;