
import React, { useState, useRef } from 'react';
import { UserAccount } from '../types';

interface LoginScreenProps {
  setCurrentUser: (user: UserAccount) => void;
  onMigrationImport?: (migrationString: string) => boolean;
}

const ADMIN_SECRET = "MYTHOS_ADMIN";
const CURRENT_SYSTEM_VERSION = 112;

const LoginScreen: React.FC<LoginScreenProps> = ({ setCurrentUser, onMigrationImport }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [migrationSigil, setMigrationSigil] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        user = { username: cleanUser, displayName: cloudAccount.displayName || cleanUser, isAdmin: cloudAccount.isAdmin || false, pin: cloudAccount.pin, version: cloudAccount.version || CURRENT_SYSTEM_VERSION, registryEra: cloudAccount.registryEra || 'Eternal' };
        localAccounts.push(user);
        localStorage.setItem('mythos_accounts', JSON.stringify(localAccounts));
      } else return setError("PIN mismatch.");
    }

    if (!user) return setError("Account not found on this device. Use Migration tab.");
    const isElevating = adminCode.trim().toUpperCase() === ADMIN_SECRET.toUpperCase();
    if (!isElevating && !user.isAdmin && pin !== user.pin) return setError("PIN mismatch.");
    if (isElevating) user.isAdmin = true;
    user.sessionId = Math.random().toString(36).substr(2, 9);
    localStorage.setItem('mythos_active_session', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanUser = username.trim().toLowerCase();
    const cleanDisplay = displayName.trim();
    if (!cleanUser || !cleanDisplay) return setError("Details required.");
    if (pin.length !== 4) return setError("4-digit PIN required.");
    const localAccounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    if (localAccounts.some(a => a.username.toLowerCase() === cleanUser)) return setError("Sigil already bound.");
    const isAdmin = adminCode.trim().toUpperCase() === ADMIN_SECRET.toUpperCase();
    const newUser: UserAccount = { username: cleanUser, displayName: cleanDisplay, isAdmin, pin, version: CURRENT_SYSTEM_VERSION, registryEra: 'Eternal', sessionId: Math.random().toString(36).substr(2, 9) };
    localAccounts.push(newUser);
    localStorage.setItem('mythos_accounts', JSON.stringify(localAccounts));
    localStorage.setItem('mythos_active_session', JSON.stringify(newUser));
    setCurrentUser(newUser);
  };

  const handleMigration = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!migrationSigil.trim()) return setError("Inscribe a sigil first.");
    const success = onMigrationImport?.(migrationSigil);
    if (!success) setError("Sigil resonance failed.");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (onMigrationImport?.(content)) {
        setError(null);
      } else setError("Scroll is corrupted.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] overflow-y-auto">
      <div className="max-w-md w-full px-6 py-10">
        <div className="grim-card p-8 md:p-10 text-center border-2 border-[#b28a48]/40 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black tracking-[0.3em] text-[#b28a48] mb-2">MYTHOS</h1>
            <p className="text-[9px] text-neutral-500 uppercase tracking-[0.5em] font-bold">Arcane Persistence Layer</p>
          </div>

          <div className="flex border-b border-[#1a1a1a] mb-8">
            <button onClick={() => { setIsRegistering(false); setIsMigrating(false); }} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest ${!isRegistering && !isMigrating ? 'text-[#b28a48] border-b-2 border-[#b28a48]' : 'text-neutral-700'}`}>Enter</button>
            <button onClick={() => { setIsRegistering(true); setIsMigrating(false); }} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest ${isRegistering ? 'text-[#b28a48] border-b-2 border-[#b28a48]' : 'text-neutral-700'}`}>New Soul</button>
            <button onClick={() => { setIsMigrating(true); setIsRegistering(false); }} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest ${isMigrating ? 'text-purple-400 border-b-2 border-purple-400' : 'text-neutral-700'}`}>Migrate</button>
          </div>

          {isMigrating ? (
            <div className="space-y-6">
              <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-sm text-left">
                <p className="text-[10px] text-purple-400 uppercase font-black mb-2 tracking-widest">New Device Transfer</p>
                <p className="text-[9px] text-neutral-500 italic leading-relaxed">
                  Accounts are stored locally. To carry your soul here, upload a .mythos scroll from your previous device.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-500/30 p-8 rounded-sm cursor-pointer hover:bg-purple-900/10 transition-all flex flex-col items-center gap-3"
              >
                <span className="text-3xl">📜</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Inscribe from Scroll (.mythos)</span>
                <input type="file" ref={fileInputRef} className="hidden" accept=".mythos" onChange={handleFileImport} />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-900"></div></div>
                <div className="relative flex justify-center text-[8px]"><span className="bg-black px-2 text-neutral-700 uppercase font-black tracking-widest">Or Sigil String</span></div>
              </div>

              <form onSubmit={handleMigration} className="space-y-4">
                <textarea 
                  value={migrationSigil} 
                  onChange={(e) => setMigrationSigil(e.target.value)} 
                  placeholder="PASTE SIGIL STRING..." 
                  className="w-full bg-black border border-purple-900/30 p-3 text-[9px] text-purple-300 outline-none font-mono h-24 resize-none" 
                />
                {error && <p className="text-[9px] text-red-600 font-bold uppercase animate-pulse">{error}</p>}
                <button type="submit" className="w-full bg-purple-950/20 hover:bg-purple-600 hover:text-white border border-purple-400/30 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 transition-all">Resonate Sigil</button>
              </form>
            </div>
          ) : (
            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
              {isRegistering && (
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name" className="w-full bg-black border border-[#1a1a1a] p-3 text-sm text-[#b28a48] outline-none transition-colors uppercase font-serif italic" />
              )}
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Sigil ID" className="w-full bg-black border border-[#1a1a1a] p-3 text-sm text-[#b28a48] outline-none transition-colors uppercase font-mono" />
              <input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4-Digit PIN" className="w-full bg-black border border-[#1a1a1a] p-3 text-sm text-[#b28a48] outline-none transition-colors font-mono" />
              {error && <p className="text-[9px] text-red-600 font-bold uppercase animate-pulse">{error}</p>}
              <button type="submit" className="w-full bg-[#1a1a1a] hover:bg-[#b28a48] hover:text-black border border-[#b28a48]/30 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] transition-all shadow-lg mt-4">{isRegistering ? 'Forge Soul' : 'Enter Archive'}</button>
            </form>
          )}
          
          <p className="mt-8 text-[7px] text-neutral-800 italic uppercase tracking-tighter">Your legend exists purely in the ether of this device unless solidified into a scroll.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
