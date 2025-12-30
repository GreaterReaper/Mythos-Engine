
import React, { useState } from 'react';
import { UserAccount } from '../types';

interface LoginScreenProps {
  setCurrentUser: (user: UserAccount) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ setCurrentUser }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<UserAccount | null>(null);
  const [copied, setCopied] = useState(false);

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'MYTH-';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i === 4 || i === 9 || i === 14) result += '-';
    }
    return result;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const accounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    const user = accounts.find(a => a.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      setError("This soul has not been inscribed.");
      return;
    }

    if (user.passwordHash !== password) {
      setError("Incorrect sigil credentials.");
      return;
    }

    // Success
    localStorage.setItem('mythos_active_session', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password || !displayName) {
      setError("The grimoire requires all details.");
      return;
    }

    const accounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
      setError("This sigil is already bound.");
      return;
    }

    const newUser: UserAccount = {
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      passwordHash: password, 
      hasKeyBound: false,
      apiKey: generateApiKey()
    };

    accounts.push(newUser);
    localStorage.setItem('mythos_accounts', JSON.stringify(accounts));
    setRegisteredUser(newUser);
  };

  const copyKey = () => {
    if (registeredUser) {
      navigator.clipboard.writeText(registeredUser.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const finalizeRegistration = () => {
    if (registeredUser) {
      localStorage.setItem('mythos_active_session', JSON.stringify(registeredUser));
      setCurrentUser(registeredUser);
    }
  };

  if (registeredUser) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
        <div className="max-w-md w-full px-6">
          <div className="grim-card p-10 text-center border-2 border-amber-500/50 shadow-[0_0_50px_rgba(178,138,72,0.3)] animate-in fade-in zoom-in duration-500">
            <h2 className="text-3xl font-black tracking-widest text-amber-500 fantasy-font mb-4">Soul Inscribed</h2>
            <div className="h-px w-24 bg-amber-500/30 mx-auto mb-6"></div>
            
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-8 leading-relaxed">
              Your identity has been bound to the Mythos. Below is your unique <span className="text-amber-500">Divine Sigil API Key</span>. Keep it safe to access external chronicle tools.
            </p>

            <div className="bg-black/80 border border-amber-900/40 p-5 rounded-sm mb-8 relative group cursor-pointer" onClick={copyKey}>
              <div className="text-[8px] text-amber-900 font-black uppercase tracking-widest absolute -top-2 left-4 bg-black px-2">Mythos API Key</div>
              <code className="text-lg font-mono text-amber-500 break-all tracking-tighter">
                {registeredUser.apiKey}
              </code>
              <div className="mt-3 text-[7px] text-neutral-600 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                {copied ? 'Copied to Memory' : 'Click Sigil to Copy'}
              </div>
            </div>

            <button
              onClick={finalizeRegistration}
              className="w-full bg-amber-600 hover:bg-amber-500 text-black py-4 text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-lg active:scale-95"
            >
              Enter the Grimoire
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
      <div className="max-w-md w-full px-6">
        <div className="grim-card p-10 text-center border-2 border-[#b28a48]/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          <div className="mb-8">
            <h1 className="text-5xl font-black tracking-[0.3em] text-[#b28a48] drop-shadow-[0_2px_10px_rgba(178,138,72,0.5)] mb-2">MYTHOS</h1>
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
              <label className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Warding Sigil (Password)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black border border-[#1a1a1a] focus:border-[#b28a48] p-3 text-sm tracking-widest text-[#b28a48] outline-none transition-colors"
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
