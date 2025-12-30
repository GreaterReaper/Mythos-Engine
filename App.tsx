
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, ServerLog, UserAccount } from './types';
import Sidebar from './components/Sidebar';
import CampaignView from './components/CampaignView';
import CharacterCreator from './components/CharacterCreator';
import Bestiary from './components/Bestiary';
import Armory from './components/Armory';
import ClassLibrary from './components/ClassLibrary';
import MultiplayerPanel from './components/MultiplayerPanel';
import LoginScreen from './components/LoginScreen';
import ArchivePanel from './components/ArchivePanel';
import Peer, { DataConnection } from 'peerjs';

interface Notification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface DiceRoll {
  id: string;
  sides: number;
  result: number;
  timestamp: number;
}

const LOCKOUT_DURATION = 65; 
const DAILY_PRO_LIMIT = 50;
const DAILY_FLASH_LIMIT = 1500;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Dice Roller State
  const [diceTrayOpen, setDiceTrayOpen] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);

  // Current Session User
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('mythos_active_session');
    return saved ? JSON.parse(saved) : null;
  });

  // User-Scoped Storage Helper
  const getUserKey = (key: string) => currentUser ? `${currentUser.username}_${key}` : `guest_${key}`;

  // Arcane Resonance (Rate Limit Tracking)
  const [arcaneTokens, setArcaneTokens] = useState<number>(3); 
  const [reservoir, setReservoir] = useState<number>(100); 
  const [lockoutTime, setLockoutTime] = useState<number>(0);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);
  const [dmModel, setDmModel] = useState<string>('gemini-3-pro-preview');
  const [localResetTime, setLocalResetTime] = useState<string>('');
  
  const [dailyProUsed, setDailyProUsed] = useState<number>(0);
  const [dailyFlashUsed, setDailyFlashUsed] = useState<number>(0);

  const lastLockoutTriggered = useRef<number>(0);

  // State initialization depends on currentUser
  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [campaign, setCampaign] = useState<CampaignState>({ plot: '', summary: '', logs: [], party: [] });

  // Multiplayer State
  const [peerId, setPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const peerRef = useRef<Peer | null>(null);

  const notify = (message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 7000);
  };

  const handleRollDice = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const roll: DiceRoll = {
      id: Math.random().toString(36).substr(2, 9),
      sides,
      result,
      timestamp: Date.now()
    };
    setLastRoll(roll);
    setRollHistory(prev => [roll, ...prev].slice(0, 10));
    
    // Aesthetic haptic feedback feel
    if (result === sides && sides >= 10) {
      notify(`CRITICAL! Natural ${result} on d${sides}`, 'success');
    }
  };

  // Load user data on login
  useEffect(() => {
    if (currentUser) {
      const uPrefix = currentUser.username;
      
      const savedChars = localStorage.getItem(`${uPrefix}_mythos_chars`);
      setCharacters(savedChars ? JSON.parse(savedChars) : []);
      
      const savedClasses = localStorage.getItem(`${uPrefix}_mythos_classes`);
      setClasses(savedClasses ? JSON.parse(savedClasses) : []);
      
      const savedMonsters = localStorage.getItem(`${uPrefix}_mythos_monsters`);
      setMonsters(savedMonsters ? JSON.parse(savedMonsters) : []);
      
      const savedItems = localStorage.getItem(`${uPrefix}_mythos_items`);
      setItems(savedItems ? JSON.parse(savedItems) : []);
      
      const savedCampaign = localStorage.getItem(`${uPrefix}_mythos_campaign`);
      setCampaign(savedCampaign ? JSON.parse(savedCampaign) : { plot: '', summary: '', logs: [], party: [] });

      const savedPro = localStorage.getItem(`${uPrefix}_mythos_daily_pro_used`);
      const savedFlash = localStorage.getItem(`${uPrefix}_mythos_daily_flash_used`);
      const lastReset = localStorage.getItem(`${uPrefix}_mythos_last_reset_day`);
      const today = new Date().toDateString();

      if (lastReset === today) {
        setDailyProUsed(savedPro ? parseInt(savedPro) : 0);
        setDailyFlashUsed(savedFlash ? parseInt(savedFlash) : 0);
      } else {
        setDailyProUsed(0);
        setDailyFlashUsed(0);
        localStorage.setItem(`${uPrefix}_mythos_last_reset_day`, today);
      }
    }
  }, [currentUser]);

  // Sync state to user-scoped storage
  useEffect(() => {
    if (!currentUser) return;
    const uPrefix = currentUser.username;
    localStorage.setItem(`${uPrefix}_mythos_chars`, JSON.stringify(characters));
    localStorage.setItem(`${uPrefix}_mythos_classes`, JSON.stringify(classes));
    localStorage.setItem(`${uPrefix}_mythos_monsters`, JSON.stringify(monsters));
    localStorage.setItem(`${uPrefix}_mythos_items`, JSON.stringify(items));
    localStorage.setItem(`${uPrefix}_mythos_campaign`, JSON.stringify(campaign));
    localStorage.setItem(`${uPrefix}_mythos_daily_pro_used`, dailyProUsed.toString());
    localStorage.setItem(`${uPrefix}_mythos_daily_flash_used`, dailyFlashUsed.toString());
  }, [currentUser, characters, classes, monsters, items, campaign, dailyProUsed, dailyFlashUsed]);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Unknown' } as SyncMessage;
    connections.forEach(conn => { if (conn.open) conn.send(fullMsg); });
  }, [connections, peerId, currentUser]);

  const calculateReset = useCallback(() => {
    try {
      const now = new Date();
      const ptStr = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
      const ptNow = new Date(ptStr);
      const ptMidnight = new Date(ptNow);
      ptMidnight.setHours(24, 0, 0, 0);
      const msUntilReset = ptMidnight.getTime() - ptNow.getTime();
      const resetDate = new Date(now.getTime() + msUntilReset);
      
      setLocalResetTime(resetDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));

      if (currentUser) {
        const uPrefix = currentUser.username;
        const lastResetCheck = localStorage.getItem(`${uPrefix}_mythos_last_reset_day`);
        if (lastResetCheck !== now.toDateString()) {
          setDailyProUsed(0);
          setDailyFlashUsed(0);
          setIsQuotaExhausted(false);
          localStorage.setItem(`${uPrefix}_mythos_last_reset_day`, now.toDateString());
        }
      }
    } catch (e) {
      setLocalResetTime("Midnight PT");
    }
  }, [currentUser]);

  useEffect(() => {
    calculateReset();
    const regenInterval = setInterval(() => {
      setArcaneTokens(prev => Math.min(prev + 0.016, 3)); 
      setReservoir(prev => Math.min(prev + 1.1, 100)); 
      setLockoutTime(prev => Math.max(prev - 1, 0));
    }, 1000);

    const resetRefreshInterval = setInterval(calculateReset, 60000);

    const handleUsage = (e: any) => {
      const { type, cost } = e.detail;
      if (type === 'dm') {
        setArcaneTokens(prev => Math.max(prev - 1, 0));
        if (dmModel.includes('pro')) {
          setDailyProUsed(prev => {
            const next = prev + 1;
            if (next >= DAILY_PRO_LIMIT) setIsQuotaExhausted(true);
            broadcast({ type: 'QUOTA_SYNC', payload: { pro: next, flash: dailyFlashUsed } });
            return next;
          });
        } else {
          setDailyFlashUsed(prev => {
            const next = prev + 1;
            broadcast({ type: 'QUOTA_SYNC', payload: { pro: dailyProUsed, flash: next } });
            return next;
          });
        }
      }
      if (type === 'utility') {
        setReservoir(prev => Math.max(prev - cost, 0));
        setDailyFlashUsed(prev => {
          const next = prev + 1;
          broadcast({ type: 'QUOTA_SYNC', payload: { pro: dailyProUsed, flash: next } });
          return next;
        });
      }
    };

    const handleError = (e: any) => {
      if (e.detail.isRateLimit) {
        if (e.detail.isQuotaExceeded) {
          setIsQuotaExhausted(true);
          setDailyProUsed(DAILY_PRO_LIMIT);
          notify(`GLOBAL QUOTA REACHED. Resets at ${localResetTime}.`, "error");
          return;
        }
        const now = Date.now();
        if (now - lastLockoutTriggered.current > 10000) {
          lastLockoutTriggered.current = now;
          setLockoutTime(LOCKOUT_DURATION);
          notify("Ley Lines Overloaded. Recalibrating (65s).", "error");
        }
      }
    };

    window.addEventListener('mythos:arcane_use' as any, handleUsage);
    window.addEventListener('mythos:arcane_error' as any, handleError);

    return () => {
      clearInterval(regenInterval);
      clearInterval(resetRefreshInterval);
      window.removeEventListener('mythos:arcane_use' as any, handleUsage);
      window.removeEventListener('mythos:arcane_error' as any, handleError);
    };
  }, [calculateReset, localResetTime, dmModel, dailyProUsed, dailyFlashUsed, broadcast]);

  const logout = () => {
    if (confirm("Sever bond with Mythos?")) {
      setCurrentUser(null);
      localStorage.removeItem('mythos_active_session');
    }
  };

  const handleIncomingData = useCallback((data: SyncMessage) => {
    switch (data.type) {
      case 'STATE_UPDATE':
        if (!isHost) {
          if (data.payload.campaign) setCampaign(data.payload.campaign);
          if (data.payload.monsters) setMonsters(data.payload.monsters);
          if (data.payload.items) setItems(data.payload.items);
          if (data.payload.classes) setClasses(data.payload.classes);
          if (data.payload.characters) setCharacters(data.payload.characters);
        }
        break;
      case 'NEW_LOG':
        setCampaign(prev => ({ ...prev, logs: [...prev.logs, data.payload] }));
        break;
      case 'GIVE_LOOT':
        setItems(prev => [...prev, data.payload]);
        break;
      case 'SUMMARY_UPDATE':
        setCampaign(prev => ({ ...prev, summary: data.payload }));
        break;
      case 'QUOTA_SYNC':
        if (data.payload.pro > dailyProUsed) setDailyProUsed(data.payload.pro);
        if (data.payload.flash > dailyFlashUsed) setDailyFlashUsed(data.payload.flash);
        break;
      case 'KICK':
        if (!isHost) window.location.reload();
        break;
    }
  }, [isHost, dailyProUsed, dailyFlashUsed]);

  const initPeer = useCallback((customId?: string) => {
    if (peerRef.current) peerRef.current.destroy();
    const peer = customId ? new Peer(customId) : new Peer();
    peerRef.current = peer;
    peer.on('open', (id) => setPeerId(id));
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        conn.send({ 
          type: 'QUOTA_SYNC', 
          payload: { pro: dailyProUsed, flash: dailyFlashUsed },
          senderId: peer.id, senderName: currentUser?.displayName || 'Unknown'
        });
        if (isHost) {
          conn.send({ 
            type: 'STATE_UPDATE', 
            payload: { campaign, monsters, items, classes, characters },
            senderId: peer.id, senderName: currentUser?.displayName || 'Unknown'
          });
        }
      });
      conn.on('data', (data: any) => handleIncomingData(data));
      conn.on('close', () => setConnections(prev => prev.filter(c => c.peer !== conn.peer)));
    });
  }, [isHost, campaign, monsters, items, classes, characters, currentUser, handleIncomingData, dailyProUsed, dailyFlashUsed]);

  useEffect(() => {
    if (!currentUser) return;
    initPeer();
    return () => { peerRef.current?.destroy(); };
  }, [currentUser, initPeer]);

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  const isExhausted = lockoutTime > 0;
  const proRemaining = Math.max(0, DAILY_PRO_LIMIT - dailyProUsed);
  const flashRemaining = Math.max(0, DAILY_FLASH_LIMIT - dailyFlashUsed);

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSignOut={logout} 
        user={currentUser}
      />
      
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-24 lg:pb-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={arcaneTokens >= 1 && !isExhausted} dmModel={dmModel} setDmModel={setDmModel} isQuotaExhausted={isQuotaExhausted} localResetTime={localResetTime} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={serverLogs} joinSession={(id) => { setIsHost(false); initPeer(); }} setIsHost={setIsHost} forceSync={() => {}} kickSoul={(id) => {}} rehostWithSigil={(id) => { setIsHost(true); initPeer(id); }} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName: currentUser.displayName }} onImport={(d) => { setCharacters(d.characters); setClasses(d.classes); setMonsters(d.monsters); setItems(d.items); setCampaign(d.campaign); }} />}
        </div>
      </main>

      {/* Global Notifications */}
      <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-sm border shadow-2xl animate-notification pointer-events-auto min-w-[280px] ${
            n.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-100' : 
            n.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-100' : 
            'bg-black/90 border-[#b28a48]/50 text-[#b28a48]'
          }`}>
            <p className="text-[10px] leading-relaxed font-bold opacity-90">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Persistent Global Status Bar */}
      <div className="fixed top-0 right-0 left-0 lg:left-64 h-16 z-[60] bg-black/80 backdrop-blur-md border-b border-neutral-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Daily Quota Tracking */}
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Global Pro</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black ${proRemaining < 10 ? 'text-red-500' : 'text-amber-500'}`}>{proRemaining}</span>
                <span className="text-[8px] text-neutral-700 font-bold uppercase">Left</span>
              </div>
            </div>
            <div className="w-px h-8 bg-neutral-900 self-center"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Global Flash</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black ${flashRemaining < 100 ? 'text-red-500' : 'text-amber-500'}`}>{flashRemaining}</span>
                <span className="text-[8px] text-neutral-700 font-bold uppercase">Left</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* DM Token Tracking */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">DM Resonance</span>
              <span className={`text-sm font-black ${arcaneTokens < 1 ? 'text-red-500' : 'text-[#b28a48]'}`}>
                {Math.floor(arcaneTokens)} / 3 <span className="text-[8px] text-neutral-700">Tokens</span>
              </span>
            </div>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-4 rounded-sm transition-all duration-500 ${
                    i < Math.floor(arcaneTokens) 
                      ? (isQuotaExhausted && dmModel.includes('pro') ? 'bg-red-900' : 'bg-[#b28a48] shadow-[0_0_5px_#b28a48]') 
                      : 'bg-neutral-800'
                  }`}
                ></div>
              ))}
            </div>
          </div>

          <div className="w-px h-8 bg-neutral-900"></div>

          {/* Arcane Energy (Reservoir) Tracking */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Arcane Energy</span>
              <span className={`text-sm font-black ${isExhausted ? 'text-red-500 animate-pulse' : 'text-[#b28a48]'}`}>
                {isExhausted ? `Lock: ${lockoutTime}s` : `${Math.round(reservoir)}%`}
              </span>
            </div>
            <div className="w-32 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative shadow-inner">
              <div 
                className={`h-full transition-all duration-700 ${isExhausted ? 'bg-red-600' : 'bg-[#b28a48]'}`} 
                style={{ width: `${isExhausted ? (lockoutTime / LOCKOUT_DURATION) * 100 : reservoir}%` }}
              ></div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end">
            <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Next Reset</span>
            <span className="text-[10px] font-black text-neutral-400 uppercase">{localResetTime}</span>
          </div>
        </div>
      </div>

      {/* Dice Roller Tray */}
      <div className="fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-3 pointer-events-none">
        {diceTrayOpen && (
          <div className="grim-card w-64 p-4 border border-[#b28a48]/40 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-[#b28a48]/10 pb-2">
              <h4 className="text-[10px] font-black fantasy-font text-[#b28a48] tracking-widest">CHRONICLE FATES</h4>
              <button onClick={() => setDiceTrayOpen(false)} className="text-neutral-600 hover:text-red-500 transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {[4, 6, 8, 10, 12, 20, 100].map(d => (
                <button 
                  key={d} 
                  onClick={() => handleRollDice(d)}
                  className="bg-neutral-950 border border-neutral-900 hover:border-[#b28a48] hover:text-[#b28a48] p-2 rounded-sm transition-all flex flex-col items-center justify-center gap-1 group active:scale-95"
                >
                  <span className="text-sm font-black">d{d}</span>
                </button>
              ))}
              <button 
                onClick={() => setRollHistory([])} 
                className="bg-neutral-950 border border-neutral-900 text-neutral-700 hover:text-red-900 p-2 rounded-sm text-[8px] font-black uppercase tracking-tighter"
              >
                Clear
              </button>
            </div>

            {lastRoll && (
              <div className="text-center mb-6 animate-in zoom-in-75 duration-300">
                <div className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1">Result d{lastRoll.sides}</div>
                <div className={`text-5xl font-black fantasy-font drop-shadow-[0_0_10px_rgba(178,138,72,0.3)] ${lastRoll.result === lastRoll.sides && lastRoll.sides >= 10 ? 'text-amber-500 animate-pulse' : 'text-neutral-200'}`}>
                  {lastRoll.result}
                </div>
              </div>
            )}

            <div className="space-y-1.5 h-24 overflow-y-auto scrollbar-hide border-t border-neutral-900 pt-3">
              {rollHistory.map((roll) => (
                <div key={roll.id} className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-neutral-600 uppercase">d{roll.sides}</span>
                  <span className={`text-[10px] font-black ${roll.result === roll.sides && roll.sides >= 10 ? 'text-amber-600' : 'text-neutral-400'}`}>{roll.result}</span>
                </div>
              ))}
              {rollHistory.length === 0 && (
                <div className="text-[8px] text-neutral-800 italic uppercase text-center py-4">The fates await...</div>
              )}
            </div>
          </div>
        )}

        <button 
          onClick={() => setDiceTrayOpen(!diceTrayOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.8)] border ${
            diceTrayOpen 
              ? 'bg-[#b28a48] text-black border-amber-300' 
              : 'bg-neutral-900 text-[#b28a48] border-[#b28a48]/30 hover:border-[#b28a48] hover:bg-black'
          }`}
        >
          🎲
        </button>
      </div>
    </div>
  );
};

export default App;
