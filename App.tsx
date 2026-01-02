import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, ServerLog, UserAccount, Rule, Spell } from './types';
import Sidebar from './components/Sidebar';
import CampaignView from './components/CampaignView';
import CharacterCreator from './components/CharacterCreator';
import Bestiary from './components/Bestiary';
import Armory from './components/Armory';
import ClassLibrary from './components/ClassLibrary';
import MultiplayerPanel from './components/MultiplayerPanel';
import LoginScreen from './components/LoginScreen';
import ArchivePanel from './components/ArchivePanel';
import SpellCodex from './components/SpellCodex';
import RulesManifest from './components/RulesManifest';
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
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive' | 'spells' | 'rules'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [diceTrayOpen, setDiceTrayOpen] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('mythos_active_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [arcaneTokens, setArcaneTokens] = useState<number>(3); 
  const [reservoir, setReservoir] = useState<number>(100); 
  const [lockoutTime, setLockoutTime] = useState<number>(0);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);
  const [dmModel, setDmModel] = useState<string>('gemini-3-pro-preview');
  const [localResetTime, setLocalResetTime] = useState<string>('');
  
  const [dailyProUsed, setDailyProUsed] = useState<number>(0);
  const [dailyFlashUsed, setDailyFlashUsed] = useState<number>(0);

  const lastLockoutTriggered = useRef<number>(0);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [campaign, setCampaign] = useState<CampaignState>({ plot: '', summary: '', logs: [], party: [], rules: [] });

  const [peerId, setPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const peerRef = useRef<Peer | null>(null);

  const notify = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 7000);
  }, []);

  const diceNeeded = useMemo(() => {
    if (campaign.logs.length === 0) return false;
    const lastLog = campaign.logs[campaign.logs.length - 1];
    if (lastLog.role !== 'dm') return false;
    const triggerWords = ['roll', 'die', 'dice', 'd20', 'd100', 'd12', 'd10', 'd8', 'd6', 'd4'];
    return triggerWords.some(word => lastLog.content.toLowerCase().includes(word));
  }, [campaign.logs]);

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
    if (result === sides && sides >= 10) {
      notify(`CRITICAL! Natural ${result} on d${sides}`, 'success');
    }
  };

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
      setCampaign(savedCampaign ? JSON.parse(savedCampaign) : { plot: '', summary: '', logs: [], party: [], rules: [] });

      const today = new Date().toDateString();
      const lastReset = localStorage.getItem(`${uPrefix}_mythos_last_reset_day`);
      if (lastReset === today) {
        setDailyProUsed(parseInt(localStorage.getItem(`${uPrefix}_mythos_daily_pro_used`) || '0'));
        setDailyFlashUsed(parseInt(localStorage.getItem(`${uPrefix}_mythos_daily_flash_used`) || '0'));
      } else {
        localStorage.setItem(`${uPrefix}_mythos_last_reset_day`, today);
        setDailyProUsed(0);
        setDailyFlashUsed(0);
      }
    }
  }, [currentUser]);

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

  useEffect(() => {
    const regenInterval = setInterval(() => {
      setArcaneTokens(prev => Math.min(prev + 0.016, 3)); 
      setReservoir(prev => Math.min(prev + 1.1, 100)); 
      setLockoutTime(prev => Math.max(prev - 1, 0));
    }, 1000);

    const handleUsage = (e: any) => {
      const { type, cost } = e.detail;
      if (type === 'dm') {
        setArcaneTokens(prev => Math.max(prev - 1, 0));
        setDmModel(currentModel => {
          if (currentModel.includes('pro')) {
            setDailyProUsed(p => p + 1);
          } else {
            setDailyFlashUsed(p => p + 1);
          }
          return currentModel;
        });
      }
      if (type === 'utility') {
        setReservoir(prev => Math.max(prev - cost, 0));
        setDailyFlashUsed(p => p + 1);
      }
    };

    const handleError = (e: any) => {
      if (e.detail.isRateLimit) {
        setLockoutTime(LOCKOUT_DURATION);
        notify("Ley Lines Overloaded.", "error");
      }
      if (e.detail.isQuotaExceeded) {
        setIsQuotaExhausted(true);
        setLocalResetTime(new Date(Date.now() + 86400000).toLocaleTimeString());
      }
    };

    window.addEventListener('mythos:arcane_use' as any, handleUsage);
    window.addEventListener('mythos:arcane_error' as any, handleError);
    return () => {
      clearInterval(regenInterval);
      window.removeEventListener('mythos:arcane_use' as any, handleUsage);
      window.removeEventListener('mythos:arcane_error' as any, handleError);
    };
  }, [notify]);

  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      setConnections(prev => [...prev, conn]);
      setServerLogs(prev => [...prev, {
        id: Math.random().toString(36),
        message: `Resonance established with ${conn.peer}`,
        type: 'success',
        timestamp: Date.now()
      }]);
    });

    conn.on('data', (data: any) => {
      const msg = data as SyncMessage;
      switch (msg.type) {
        case 'SHARE_RESOURCE':
          const { resourceType, resourceData } = msg.payload;
          if (resourceType === 'class') {
            setClasses(prev => prev.some(c => c.id === resourceData.id) ? prev : [...prev, resourceData]);
            notify(`New Archetype received: ${resourceData.name}`, 'success');
          } else if (resourceType === 'monster') {
            setMonsters(prev => prev.some(m => m.id === resourceData.id) ? prev : [...prev, resourceData]);
            notify(`New Horror added to Bestiary: ${resourceData.name}`, 'success');
          } else if (resourceType === 'item') {
            setItems(prev => prev.some(i => i.id === resourceData.id) ? prev : [...prev, resourceData]);
            notify(`New Relic received: ${resourceData.name}`, 'success');
          }
          break;
        case 'NEW_LOG':
          setCampaign(prev => ({ ...prev, logs: [...prev.logs, msg.payload] }));
          break;
        case 'SUMMARY_UPDATE':
          setCampaign(prev => ({ ...prev, summary: msg.payload }));
          break;
        case 'GIVE_LOOT':
          setItems(prev => [...prev, msg.payload]);
          notify(`The party received loot: ${msg.payload.name}`, 'info');
          break;
        case 'STATE_UPDATE':
          if (msg.payload.campaign) setCampaign(msg.payload.campaign);
          if (msg.payload.classes) setClasses(msg.payload.classes);
          if (msg.payload.monsters) setMonsters(msg.payload.monsters);
          if (msg.payload.items) setItems(msg.payload.items);
          if (msg.payload.characters) setCharacters(msg.payload.characters);
          notify("Chronicle state synchronized", "info");
          break;
      }
    });

    conn.on('close', () => {
      setConnections(prev => prev.filter(c => c.peer !== conn.peer));
      setServerLogs(prev => [...prev, {
        id: Math.random().toString(36),
        message: `Connection lost with ${conn.peer}`,
        type: 'warn',
        timestamp: Date.now()
      }]);
    });
  }, [notify]);

  const initPeer = useCallback((customId?: string) => {
    if (peerRef.current) peerRef.current.destroy();
    const peer = customId ? new Peer(customId) : new Peer();
    peerRef.current = peer;
    
    peer.on('open', (id) => {
      setPeerId(id);
      setServerLogs(prev => [...prev, {
        id: Math.random().toString(36),
        message: `Local sigil manifested: ${id}`,
        type: 'info',
        timestamp: Date.now()
      }]);
    });

    peer.on('connection', (conn) => {
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.error("PeerJS Error:", err);
      setServerLogs(prev => [...prev, {
        id: Math.random().toString(36),
        message: `Ether instability: ${err.type}`,
        type: 'error',
        timestamp: Date.now()
      }]);
      if (err.type === 'unavailable-id') {
        notify("This shared code is already taken.", "error");
      }
    });
  }, [setupConnection, notify]);

  const connectToHost = useCallback((hostSigil: string) => {
    if (!peerRef.current || !peerRef.current.open) {
      notify("Portal not ready. Inscribe your sigil first.", "error");
      return;
    }
    const conn = peerRef.current.connect(hostSigil);
    setupConnection(conn);
  }, [setupConnection, notify]);

  useEffect(() => {
    if (!currentUser) return;
    initPeer();
    return () => { peerRef.current?.destroy(); };
  }, [currentUser, initPeer]);

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  const isExhausted = lockoutTime > 0;
  const proPercent = (dailyProUsed / DAILY_PRO_LIMIT) * 100;
  const flashPercent = (dailyFlashUsed / DAILY_FLASH_LIMIT) * 100;

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={() => setCurrentUser(null)} user={currentUser} />
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-24 lg:pb-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={arcaneTokens >= 1 && !isExhausted} dmModel={dmModel} setDmModel={setDmModel} isQuotaExhausted={isQuotaExhausted} localResetTime={localResetTime} items={items} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={reservoir >= 1 && !isExhausted} broadcast={broadcast} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={serverLogs} joinSession={(id) => { setIsHost(false); connectToHost(id); }} setIsHost={setIsHost} forceSync={(selection) => {
              if (connections.length === 0) return;
              const state: any = {};
              if (selection.characters) state.characters = characters;
              if (selection.classes) state.classes = classes;
              if (selection.monsters) state.monsters = monsters;
              if (selection.items) state.items = items;
              if (selection.campaign) state.campaign = campaign;
              broadcast({ type: 'STATE_UPDATE', payload: state });
          }} kickSoul={(id) => {}} rehostWithSigil={(id) => { setIsHost(true); initPeer(id); }} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName: currentUser.displayName }} onImport={(d) => { setCharacters(d.characters); setClasses(d.classes); setMonsters(d.monsters); setItems(d.items); setCampaign(d.campaign); }} />}
        </div>
      </main>

      <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-sm border shadow-2xl animate-notification pointer-events-auto min-w-[280px] ${n.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-100' : n.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-100' : 'bg-black/90 border-[#b28a48]/50 text-[#b28a48]'}`}>
            <p className="text-[10px] leading-relaxed font-bold opacity-90">{n.message}</p>
          </div>
        ))}
      </div>

      <div className="fixed top-0 right-0 left-0 lg:left-64 h-16 z-[60] bg-black/80 backdrop-blur-md border-b border-neutral-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Resonance</span>
              <span className={`text-sm font-black ${arcaneTokens < 1 ? 'text-red-500' : 'text-[#b28a48]'}`}>{Math.floor(arcaneTokens)} / 3</span>
           </div>
           <div className="w-32 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative shadow-inner">
              <div className={`h-full transition-all duration-700 ${isExhausted ? 'bg-red-600' : 'bg-[#b28a48]'}`} style={{ width: `${isExhausted ? (lockoutTime / LOCKOUT_DURATION) * 100 : reservoir}%` }}></div>
           </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
           <div className="flex flex-col items-start gap-1">
              <div className="flex justify-between w-24">
                <span className="text-[7px] font-black text-neutral-500 uppercase tracking-tighter">Fidelity (Pro)</span>
                <span className={`text-[7px] font-bold ${proPercent > 80 ? 'text-red-500' : 'text-[#b28a48]'}`}>{dailyProUsed}/{DAILY_PRO_LIMIT}</span>
              </div>
              <div className="w-24 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div className={`h-full transition-all duration-1000 ${proPercent > 80 ? 'bg-red-500' : 'bg-[#b28a48]'}`} style={{ width: `${proPercent}%` }}></div>
              </div>
           </div>

           <div className="flex flex-col items-start gap-1">
              <div className="flex justify-between w-24">
                <span className="text-[7px] font-black text-neutral-500 uppercase tracking-tighter">Velocity (Flash)</span>
                <span className={`text-[7px] font-bold ${flashPercent > 80 ? 'text-red-500' : 'text-[#b28a48]'}`}>{dailyFlashUsed}/{DAILY_FLASH_LIMIT}</span>
              </div>
              <div className="w-24 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div className={`h-full transition-all duration-1000 ${flashPercent > 80 ? 'bg-red-500' : 'bg-[#b28a48]'}`} style={{ width: `${flashPercent}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      <div className="fixed bottom-24 lg:bottom-4 right-4 z-[90] flex flex-col items-end gap-3 pointer-events-none">
        {diceTrayOpen && (
          <div className="grim-card w-64 p-4 border border-[#b28a48]/40 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-[#b28a48]/10 pb-2">
              <h4 className="text-[10px] font-black fantasy-font text-[#b28a48] tracking-widest">CHRONICLE FATES</h4>
              <button onClick={() => setDiceTrayOpen(false)} className="text-neutral-600 hover:text-red-500 transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[4, 6, 8, 10, 12, 20, 100].map(d => (
                <button key={d} onClick={() => handleRollDice(d)} className="bg-neutral-950 border border-neutral-900 hover:border-[#b28a48] hover:text-[#b28a48] p-2 rounded-sm transition-all flex flex-col items-center justify-center gap-1 group active:scale-95">
                  <span className="text-sm font-black">d{d}</span>
                </button>
              ))}
            </div>
            {lastRoll && (
              <div className="text-center mb-6">
                <div className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1">Result d{lastRoll.sides}</div>
                <div className={`text-5xl font-black fantasy-font ${lastRoll.result === lastRoll.sides && lastRoll.sides >= 10 ? 'text-amber-500 animate-pulse' : 'text-neutral-200'}`}>{lastRoll.result}</div>
              </div>
            )}
          </div>
        )}
        {(diceTrayOpen || diceNeeded) && (
          <button onClick={() => setDiceTrayOpen(!diceTrayOpen)} className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.8)] border ${diceTrayOpen ? 'bg-[#b28a48] text-black border-amber-300' : 'bg-neutral-900 text-[#b28a48] border-[#b28a48]/30 hover:border-[#b28a48] hover:bg-black'} ${diceNeeded && !diceTrayOpen ? 'animate-bounce border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : ''}`}>🎲</button>
        )}
      </div>
    </div>
  );
};

export default App;