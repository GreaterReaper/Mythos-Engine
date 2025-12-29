
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, ServerLog } from './types';
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

const LOCKOUT_DURATION = 65; 

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Arcane Resonance (Rate Limit Tracking)
  const [arcaneTokens, setArcaneTokens] = useState<number>(3); 
  const [reservoir, setReservoir] = useState<number>(100); 
  const [lockoutTime, setLockoutTime] = useState<number>(0);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);
  const [dmModel, setDmModel] = useState<string>('gemini-3-pro-preview');
  const lastLockoutTriggered = useRef<number>(0);

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('mythos_player_name') || '';
  });

  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = localStorage.getItem('mythos_chars');
    return saved ? JSON.parse(saved) : [];
  });
  const [classes, setClasses] = useState<ClassDef[]>(() => {
    const saved = localStorage.getItem('mythos_classes');
    return saved ? JSON.parse(saved) : [];
  });
  const [monsters, setMonsters] = useState<Monster[]>(() => {
    const saved = localStorage.getItem('mythos_monsters');
    return saved ? JSON.parse(saved) : [];
  });
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('mythos_items');
    return saved ? JSON.parse(saved) : [];
  });
  const [campaign, setCampaign] = useState<CampaignState>(() => {
    const saved = localStorage.getItem('mythos_campaign');
    return saved ? JSON.parse(saved) : { plot: '', summary: '', logs: [], party: [] };
  });

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

  // Arcane Regeneration Logic
  useEffect(() => {
    const regenInterval = setInterval(() => {
      setArcaneTokens(prev => Math.min(prev + 0.016, 3)); 
      setReservoir(prev => Math.min(prev + 1.1, 100)); 
      
      setLockoutTime(prev => {
        const next = Math.max(prev - 1, 0);
        if (next === 0) {
          window.sessionStorage.setItem('mythos_lockout_active', 'false');
        }
        return next;
      });
    }, 1000);

    const handleUsage = (e: any) => {
      const { type, cost } = e.detail;
      if (type === 'dm') setArcaneTokens(prev => Math.max(prev - 1, 0));
      if (type === 'utility') setReservoir(prev => Math.max(prev - cost, 0));
    };

    const handleError = (e: any) => {
      if (e.detail.isRateLimit) {
        if (e.detail.isQuotaExceeded) {
          setIsQuotaExhausted(true);
          notify("DAILY QUOTA REACHED: The 'Pro' ley line is exhausted (50 msg limit). Switch to 'High Velocity' in Play tab to continue.", "error");
          return;
        }

        const now = Date.now();
        if (now - lastLockoutTriggered.current > 10000) {
          lastLockoutTriggered.current = now;
          setLockoutTime(LOCKOUT_DURATION);
          window.sessionStorage.setItem('mythos_lockout_active', 'true');
          notify("Ley Lines Severely Overloaded. Hard recalibration initiated (65s).", "error");
        }
      }
    };

    window.addEventListener('mythos:arcane_use' as any, handleUsage);
    window.addEventListener('mythos:arcane_error' as any, handleError);

    return () => {
      clearInterval(regenInterval);
      window.removeEventListener('mythos:arcane_use' as any, handleUsage);
      window.removeEventListener('mythos:arcane_error' as any, handleError);
    };
  }, []);

  const logout = () => {
    if (confirm("Sever bond with Mythos?")) {
      setPlayerName('');
      localStorage.removeItem('mythos_player_name');
    }
  };

  useEffect(() => {
    localStorage.setItem('mythos_chars', JSON.stringify(characters));
    localStorage.setItem('mythos_classes', JSON.stringify(classes));
    localStorage.setItem('mythos_monsters', JSON.stringify(monsters));
    localStorage.setItem('mythos_items', JSON.stringify(items));
    localStorage.setItem('mythos_campaign', JSON.stringify(campaign));
    if (playerName) localStorage.setItem('mythos_player_name', playerName);
  }, [characters, classes, monsters, items, campaign, playerName]);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: playerName } as SyncMessage;
    connections.forEach(conn => { if (conn.open) conn.send(fullMsg); });
  }, [connections, peerId, playerName]);

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
      case 'KICK':
        if (!isHost) window.location.reload();
        break;
    }
  }, [isHost]);

  const initPeer = useCallback((customId?: string) => {
    if (peerRef.current) peerRef.current.destroy();
    const peer = customId ? new Peer(customId) : new Peer();
    peerRef.current = peer;
    peer.on('open', (id) => setPeerId(id));
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        if (isHost) {
          conn.send({ 
            type: 'STATE_UPDATE', 
            payload: { campaign, monsters, items, classes, characters },
            senderId: peer.id, senderName: playerName
          });
        }
      });
      conn.on('data', (data: any) => handleIncomingData(data));
      conn.on('close', () => setConnections(prev => prev.filter(c => c.peer !== conn.peer)));
    });
  }, [isHost, campaign, monsters, items, classes, characters, playerName, handleIncomingData]);

  useEffect(() => {
    if (!playerName) return;
    initPeer();
    return () => { peerRef.current?.destroy(); };
  }, [playerName]);

  if (!playerName) return <LoginScreen setPlayerName={setPlayerName} />;

  const isExhausted = lockoutTime > 0;

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={logout} />
      
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-24 lg:pb-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={playerName} notify={notify} arcadeReady={arcaneTokens >= 1 && !isExhausted} dmModel={dmModel} setDmModel={setDmModel} isQuotaExhausted={isQuotaExhausted} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 1 && !isExhausted} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={serverLogs} joinSession={(id) => { setIsHost(false); initPeer(); }} setIsHost={setIsHost} forceSync={() => {}} kickSoul={(id) => {}} rehostWithSigil={(id) => { setIsHost(true); initPeer(id); }} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName }} onImport={(d) => { setCharacters(d.characters); setClasses(d.classes); setMonsters(d.monsters); setItems(d.items); setCampaign(d.campaign); }} />}
        </div>
      </main>

      {/* Global Notifications */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
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

      {/* Arcane Status Bar (Foci Orb) */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
        <div className={`flex items-center gap-4 bg-black/60 backdrop-blur border px-4 py-2 rounded-sm pointer-events-auto transition-colors duration-1000 ${isExhausted || isQuotaExhausted ? 'border-red-600' : 'border-[#b28a48]/20'}`}>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-3 rounded-sm transform rotate-12 transition-all duration-500 ${
                  i < Math.floor(arcaneTokens) 
                    ? (isQuotaExhausted && dmModel.includes('pro') ? 'bg-red-900' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]') 
                    : 'bg-neutral-800'
                }`}
              ></div>
            ))}
          </div>
          
          <div className="relative group">
            <div className={`w-10 h-10 rounded-full border-2 transition-all duration-700 flex items-center justify-center ${
              isExhausted || (isQuotaExhausted && dmModel.includes('pro'))
                ? 'border-red-600 bg-red-950/20 shadow-[0_0_25px_#7f1d1d] animate-pulse' 
                : reservoir > 5 
                  ? 'border-[#b28a48] bg-amber-950/10 shadow-[0_0_15px_rgba(178,138,72,0.3)]' 
                  : 'border-neutral-800 bg-black'
            }`}>
              <span className={`text-[12px] font-black ${isExhausted || isQuotaExhausted ? 'text-red-500' : reservoir > 5 ? 'text-[#b28a48]' : 'text-neutral-700'}`}>
                {isExhausted ? lockoutTime : isQuotaExhausted && dmModel.includes('pro') ? '!' : Math.round(reservoir)}
              </span>
            </div>
            <div className="absolute top-full right-0 mt-2 p-3 bg-black border border-[#b28a48]/40 invisible group-hover:visible w-48 shadow-2xl z-[110]">
               <h5 className="text-[9px] font-black text-[#b28a48] uppercase tracking-widest mb-1">
                 {isExhausted ? 'RECALIBRATION' : isQuotaExhausted ? 'QUOTA EXHAUSTED' : 'ARCANE STABILITY'}
               </h5>
               <div className="h-1 w-full bg-neutral-900 mb-2">
                 <div className={`h-full transition-all ${isExhausted || isQuotaExhausted ? 'bg-red-600' : 'bg-amber-600'}`} style={{ width: `${isExhausted ? (lockoutTime / LOCKOUT_DURATION) * 100 : reservoir}%` }}></div>
               </div>
               <p className="text-[8px] text-neutral-500 uppercase leading-tight font-bold">
                 DM: {dmModel.includes('pro') ? 'High Fidelity (50/day)' : 'High Velocity (1500/day)'}<br/>
                 Tokens: {Math.floor(arcaneTokens)}/3<br/>
                 {isQuotaExhausted && dmModel.includes('pro') ? 'DAILY PRO QUOTA HIT' : isExhausted ? `RECALIBRATING: ${lockoutTime}S` : 'LEY LINES STABLE'}
               </p>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-[9px] uppercase font-black text-neutral-500">
              Soul: <span className="text-[#b28a48]">{playerName}</span>
            </div>
            <div className={`text-[7px] font-bold uppercase tracking-tighter transition-colors ${isExhausted || isQuotaExhausted ? 'text-red-700' : 'text-neutral-700'}`}>
              {isExhausted ? 'LOCKOUT' : isQuotaExhausted ? 'QUOTA DEPLETED' : 'RESONANCE ONLINE'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
