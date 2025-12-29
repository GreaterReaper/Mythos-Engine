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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Arcane Resonance (Rate Limit Tracking)
  const [arcaneTokens, setArcaneTokens] = useState<number>(3); // For DM Pro Calls (RPM ~2-3)
  const [reservoir, setReservoir] = useState<number>(100); // For Utility Flash Calls (RPM ~15)
  const [isExhausted, setIsExhausted] = useState<boolean>(false);

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
      // Faster regeneration: 0.07 tokens per sec (~14s for full token)
      setArcaneTokens(prev => Math.min(prev + 0.07, 3)); 
      // Doubled utility regeneration: 3.0% per sec (~33s for full reservoir)
      setReservoir(prev => Math.min(prev + 3.0, 100)); 
    }, 1000);

    // Listen for AI usage events from gemini.ts
    const handleUsage = (e: any) => {
      const { type, cost } = e.detail;
      if (type === 'dm') setArcaneTokens(prev => Math.max(prev - 1, 0));
      if (type === 'utility') setReservoir(prev => Math.max(prev - cost, 0));
    };

    const handleError = (e: any) => {
      if (e.detail.isRateLimit) {
        setIsExhausted(true);
        setArcaneTokens(0);
        setReservoir(0);
        // Reduced lockdown time from 15s to 8s
        setTimeout(() => setIsExhausted(false), 8000);
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

  const addServerLog = (message: string, type: ServerLog['type'] = 'info') => {
    const newLog: ServerLog = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: Date.now()
    };
    setServerLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const logout = () => {
    if (confirm("Are you sure you wish to sever your bond with the Mythos? Your local saga will remain, but your identity will be forgotten on this device.")) {
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
    connections.forEach(conn => {
      if (conn.open) conn.send(fullMsg);
    });
    if (isHost && msg.type !== 'PULSE') {
      addServerLog(`Broadcasting ${msg.type}`, 'success');
    }
  }, [connections, peerId, playerName, isHost]);

  const handleIncomingData = useCallback((data: SyncMessage) => {
    switch (data.type) {
      case 'STATE_UPDATE':
        if (!isHost) {
          if (data.payload.campaign) setCampaign(data.payload.campaign);
          if (data.payload.monsters) setMonsters(data.payload.monsters);
          if (data.payload.items) setItems(data.payload.items);
          if (data.payload.classes) setClasses(data.payload.classes);
          if (data.payload.characters) setCharacters(data.payload.characters);
          notify("The Grimoire has been synchronized", "success");
        } else {
          if (data.payload.campaign) setCampaign(data.payload.campaign);
          if (data.payload.monsters) setMonsters(data.payload.monsters);
          if (data.payload.items) setItems(data.payload.items);
          if (data.payload.classes) setClasses(data.payload.classes);
          if (data.payload.characters) setCharacters(data.payload.characters);
          addServerLog(`Received grimoire update from ${data.senderName}`, 'info');
          notify(`World knowledge updated by ${data.senderName}`, "info");
          broadcast({ 
            type: 'STATE_UPDATE', 
            payload: data.payload,
            senderId: peerId,
            senderName: data.senderName
          });
        }
        break;
      case 'NEW_LOG':
        setCampaign(prev => ({ ...prev, logs: [...prev.logs, data.payload] }));
        break;
      case 'GIVE_LOOT':
        setItems(prev => [...prev, data.payload]);
        notify("A new artifact has entered your possession", "info");
        break;
      case 'SUMMARY_UPDATE':
        setCampaign(prev => ({ ...prev, summary: data.payload }));
        break;
      case 'KICK':
        if (!isHost) {
          notify("Host has severed your connection", "error");
          window.location.reload();
        }
        break;
    }
  }, [isHost, peerId, broadcast]);

  const initPeer = useCallback((customId?: string) => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    const peer = customId ? new Peer(customId) : new Peer();
    peerRef.current = peer;
    peer.on('open', (id) => {
      setPeerId(id);
      addServerLog(`Sigil active: ${id}`, 'success');
      if (customId) notify(`Ancestral Sigil "${id}" Bound`, "success");
    });
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        addServerLog(`Soul connected: ${conn.peer}`, 'success');
        if (isHost) {
          conn.send({ 
            type: 'STATE_UPDATE', 
            payload: { campaign, monsters, items, classes, characters },
            senderId: peer.id, senderName: playerName
          });
        }
      });
      conn.on('data', (data: any) => handleIncomingData(data));
      conn.on('close', () => {
        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
      });
    });
    peer.on('error', (err) => {
      addServerLog(`Portal Error: ${err.type}`, 'error');
      if (err.type === 'peer-unavailable') notify("Target Sigil not found", "error");
      if (err.type === 'unavailable-id') notify("Sigil already bound to another portal", "error");
    });
  }, [isHost, campaign, monsters, items, classes, characters, playerName, handleIncomingData]);

  useEffect(() => {
    if (!playerName) return;
    initPeer();
    return () => { peerRef.current?.destroy(); };
  }, [playerName]);

  const rehostWithSigil = (id: string) => {
    setIsHost(true);
    initPeer(id);
  };

  const joinSession = (id: string) => {
    if (!peerRef.current || !id) return;
    setIsHost(false);
    addServerLog(`Binding to Sigil: ${id}...`, 'info');
    const conn = peerRef.current.connect(id);
    conn.on('open', () => {
      setConnections([conn]);
      notify("Bound to Host Soul", "success");
    });
    conn.on('data', (data: any) => handleIncomingData(data));
    conn.on('error', () => notify("Connection failed", "error"));
  };

  const handleImportData = (data: any) => {
    if (data.characters) setCharacters(data.characters);
    if (data.classes) setClasses(data.classes);
    if (data.monsters) setMonsters(data.monsters);
    if (data.items) setItems(data.items);
    if (data.campaign) setCampaign(data.campaign);
    notify("Archive restored", "success");
  };

  const handleSyncSelection = (selection: Record<string, boolean>) => {
    const payload: any = {};
    if (selection.campaign) payload.campaign = campaign;
    if (selection.monsters) payload.monsters = monsters;
    if (selection.items) payload.items = items;
    if (selection.classes) payload.classes = classes;
    if (selection.characters) payload.characters = characters;
    broadcast({ type: 'STATE_UPDATE', payload });
    notify(`Transmitting selected knowledge categories...`, "info");
  };

  if (!playerName) return <LoginScreen setPlayerName={setPlayerName} />;

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={logout} />
      
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-24 lg:pb-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={playerName} notify={notify} arcadeReady={arcaneTokens >= 1} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={reservoir >= 3} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 8} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} notify={notify} reservoirReady={reservoir >= 8} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={reservoir >= 5} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={serverLogs} joinSession={joinSession} setIsHost={setIsHost} forceSync={handleSyncSelection} kickSoul={(id) => { const c = connections.find(x => x.peer === id); if (c) { c.send({ type: 'KICK' }); c.close(); setConnections(prev => prev.filter(x => x.peer !== id)); } }} rehostWithSigil={rehostWithSigil} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName }} onImport={handleImportData} />}
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
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs">{n.type === 'error' ? '💀' : n.type === 'success' ? '✨' : '📜'}</span>
              <p className="text-[10px] font-black uppercase tracking-widest">System Message</p>
            </div>
            <p className="text-[10px] leading-relaxed font-bold opacity-90">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Arcane Status Bar (Foci Orb) */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex items-center gap-4 bg-black/60 backdrop-blur border border-[#b28a48]/20 px-4 py-2 rounded-sm pointer-events-auto">
          {/* Arcane Tokens (DM Pro) */}
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-3 rounded-sm transform rotate-12 transition-all duration-500 ${
                  i < Math.floor(arcaneTokens) 
                    ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' 
                    : 'bg-neutral-800'
                }`}
                title="Arcane Tokens: Ready for DM intervention"
              ></div>
            ))}
          </div>
          
          {/* The Foci Orb */}
          <div className="relative group">
            <div className={`w-8 h-8 rounded-full border-2 transition-all duration-700 flex items-center justify-center ${
              isExhausted 
                ? 'border-red-900 bg-red-950/20 shadow-[0_0_20px_#7f1d1d] animate-pulse' 
                : reservoir > 5 
                  ? 'border-[#b28a48] bg-amber-950/10 shadow-[0_0_15px_rgba(178,138,72,0.3)]' 
                  : 'border-neutral-800 bg-black'
            }`}>
              <span className={`text-[10px] font-black ${isExhausted ? 'text-red-500' : reservoir > 5 ? 'text-[#b28a48]' : 'text-neutral-700'}`}>
                {isExhausted ? '!' : Math.round(reservoir)}
              </span>
            </div>
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 p-3 bg-black border border-[#b28a48]/40 invisible group-hover:visible w-48 shadow-2xl z-[110]">
               <h5 className="text-[9px] font-black text-[#b28a48] uppercase tracking-widest mb-1">Arcane Stability</h5>
               <div className="h-1 w-full bg-neutral-900 mb-2">
                 <div className="h-full bg-amber-600 transition-all" style={{ width: `${reservoir}%` }}></div>
               </div>
               <p className="text-[8px] text-neutral-500 uppercase leading-tight font-bold">
                 Tokens: {Math.floor(arcaneTokens)}/3<br/>
                 Resonance: {Math.round(reservoir)}%<br/>
                 {isExhausted ? 'STABILIZING LEY LINES...' : 'FOCI CHARGED'}
               </p>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-[9px] uppercase font-black text-neutral-500">
              Soul: <span className="text-[#b28a48]">{playerName}</span>
            </div>
            <div className="text-[7px] text-neutral-700 font-bold uppercase tracking-tighter">
              LEY LINE RESONANCE
            </div>
          </div>
        </div>

        {connections.length > 0 && (
          <div className="bg-black/60 backdrop-blur border border-[#b28a48]/40 px-3 py-1 rounded-full text-[10px] uppercase font-black text-[#b28a48] animate-pulse pointer-events-auto">
            {connections.length} {connections.length === 1 ? 'Link' : 'Links'} Active
          </div>
        )}
      </div>
    </div>
  );
};

export default App;