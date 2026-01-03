import React, { useState } from 'react';
import { UserAccount } from '../types';

interface LoginScreenProps {
  setCurrentUser: (user: UserAccount) => void;
}

const ADMIN_SECRET = "MYTHOS_ADMIN";
const CURRENT_SYSTEM_VERSION = 112;

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
    
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) return setError("Identify thy soul.");

    const etherArchive: Record<string, any> = JSON.parse(localStorage.getItem('mythos_ether_archive') || '{}');
    const cloudAccount = etherArchive[cleanUser];

    const localAccounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    let user = localAccounts.find(a => a.username.toLowerCase() === cleanUser);

    if (!user && cloudAccount) {
      if (cloudAccount.pin === pin) {
        user = {
          username: cleanUser,
          displayName: cloudAccount.displayName || cleanUser,
          isAdmin: cloudAccount.isAdmin || false,
          pin: cloudAccount.pin,
          version: cloudAccount.version || CURRENT_SYSTEM_VERSION,
          registryEra: cloudAccount.registryEra || 'Eternal'
        };
        localAccounts.push(user);
        localStorage.setItem('mythos_accounts', JSON.stringify(localAccounts));
      } else {
        return setError("Arcane PIN mismatch.");
      }
    }

    if (!user) {
      setError("Soul not inscribed.");
      return;
    }

    const isElevating = adminCode.trim().toUpperCase() === ADMIN_SECRET.toUpperCase();
    if (!isElevating && !user.isAdmin && pin !== user.pin) {
      return setError("Arcane PIN mismatch.");
    }

    if (isElevating) user.isAdmin = true;

    // Session Management: Generate new session ID to invalidate other devices
    const newSessionId = Math.random().toString(36).substr(2, 9);
    user.sessionId = newSessionId;

    // Update global Ether registry with new session
    if (etherArchive[cleanUser]) {
      etherArchive[cleanUser].sessionId = newSessionId;
      localStorage.setItem('mythos_ether_archive', JSON.stringify(etherArchive));
    }

    localStorage.setItem('mythos_active_session', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanDisplay = displayName.trim();

    if (!cleanUser || !cleanDisplay) return setError("Details required.");
    if (pin.length !== 4 || isNaN(Number(pin))) return setError("4-digit PIN required.");

    const localAccounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    const etherArchive: Record<string, any> = JSON.parse(localStorage.getItem('mythos_ether_archive') || '{}');

    if (localAccounts.some(a => a.username.toLowerCase() === cleanUser) || etherArchive[cleanUser]) {
      return setError("Sigil already bound.");
    }

    const isAdmin = adminCode.trim().toUpperCase() === ADMIN_SECRET.toUpperCase();
    const newSessionId = Math.random().toString(36).substr(2, 9);
    
    const newUser: UserAccount = {
      username: cleanUser,
      displayName: cleanDisplay,
      isAdmin,
      pin: pin,
      version: CURRENT_SYSTEM_VERSION,
      registryEra: 'Eternal',
      sessionId: newSessionId
    };

    localAccounts.push(newUser);
    localStorage.setItem('mythos_accounts', JSON.stringify(localAccounts));
    
    etherArchive[cleanUser] = {
        ...newUser,
        data: { characters: [], classes: [], monsters: [], items: [], campaign: { plot: '', summary: '', logs: [], party: [], rules: [] } }
    };
    localStorage.setItem('mythos_ether_archive', JSON.stringify(etherArchive));

    localStorage.setItem('mythos_active_session', JSON.stringify(newUser));
    setCurrentUser(newUser);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] overflow-y-auto pt-10">
      <div className="max-w-md w-full px-6 py-10">
        <div className="grim-card p-8 md:p-10 text-center border-2 border-[#b28a48]/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-[0.3em] text-[#b28a48] mb-2">MYTHOS</h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.5em] mt-4 font-bold italic">Eternal Persistence Layer</p>
          </div>

          <div className="flex border-b border-[#1a1a1a] mb-8">
            <button onClick={() => setIsRegistering(false)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${!isRegistering ? 'text-[#b28a48] border-b-2 border-[#b28a48]' : 'text-neutral-700'}`}>Enter</button>
            <button onClick={() => setIsRegistering(true)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${isRegistering ? 'text-[#b28a48] border-b-2 border-[#b28a48]' : 'text-neutral-700'}`}>Inscribe</button>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {isRegistering && (
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name" className="w-full bg-black border border-[#1a1a1a] p-3 text-sm text-[#b28a48] outline-none transition-colors uppercase font-serif italic" />
            )}
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Sigil ID (Username)" className="w-full bg-black border border-[#1a1a1a] p-3 text-sm text-[#b28a48] outline-none transition-colors uppercase font-mono" />
            <input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4-Digit PIN" className="w-full bg-black border border-[#1a1a1a] p-3 text-sm text-[#b28a48] outline-none transition-colors font-mono" />
            <input type="password" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} placeholder="Override (Optional)" className="w-full bg-black border border-[#1a1a1a] p-3 text-sm text-neutral-700 outline-none transition-colors uppercase font-mono" />
            {error && <p className="text-[9px] text-red-600 font-bold uppercase py-2 animate-pulse">{error}</p>}
            <button type="submit" className="w-full bg-[#1a1a1a] hover:bg-[#b28a48] hover:text-black border border-[#b28a48]/30 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] transition-all shadow-lg mt-4">{isRegistering ? 'Inscribe Forever' : 'Resonate Soul'}</button>
          </form>
          <p className="mt-8 text-[7px] text-neutral-800 italic uppercase tracking-tighter">Eternal Era: Accounts created from v112 onward are immune to deletion.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;