
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
  type: 'error' | 'success' | 'info' | 'quota';
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
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
    
    // Check for specific error types
    let finalType = type;
    let finalMessage = message;
    
    if (message.includes("ARCANE_FATIGUE")) {
      finalType = 'quota';
      finalMessage = message.replace("ARCANE_FATIGUE: ", "");
    }

    setNotifications(prev => [...prev, { id, message: finalMessage, type: finalType }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 7000); // Quota errors stay longer
  };

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

  // Persistence
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
          setCampaign(data.payload.campaign);
          setMonsters(data.payload.monsters);
          setItems(data.payload.items);
          setClasses(data.payload.classes);
          notify("World synced with Host", "success");
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
        if (!isHost) {
          notify("Host has severed your connection", "error");
          window.location.reload();
        }
        break;
    }
  }, [isHost]);

  // PeerJS Stable Setup
  useEffect(() => {
    if (!playerName) return;

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      addServerLog(`Sigil active: ${id}`, 'success');
    });
    
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        addServerLog(`Soul connected: ${conn.peer}`, 'success');
        if (isHost) {
          conn.send({ 
            type: 'STATE_UPDATE', 
            payload: { campaign, monsters, items, classes },
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
      addServerLog(`Server Error: ${err.type}`, 'error');
      if (err.type === 'peer-unavailable') notify("Target Sigil not found", "error");
    });

    return () => { peer.destroy(); };
  }, [playerName]); // Stable peer

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

  if (!playerName) return <LoginScreen setPlayerName={setPlayerName} />;

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={logout} />
      
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-24 lg:pb-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={playerName} notify={notify} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} notify={notify} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={serverLogs} joinSession={joinSession} setIsHost={setIsHost} forceSync={() => broadcast({ type: 'STATE_UPDATE', payload: { campaign, monsters, items, classes } })} kickSoul={(id) => { const c = connections.find(x => x.peer === id); if (c) { c.send({ type: 'KICK' }); c.close(); setConnections(prev => prev.filter(x => x.peer !== id)); } }} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName }} onImport={handleImportData} />}
        </div>
      </main>

      {/* Global Notifications */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-sm border shadow-2xl animate-notification pointer-events-auto min-w-[280px] ${
            n.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-100' : 
            n.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-100' : 
            n.type === 'quota' ? 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]' :
            'bg-black/90 border-[#b28a48]/50 text-[#b28a48]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs">{n.type === 'quota' ? '⏳' : n.type === 'error' ? '💀' : n.type === 'success' ? '✨' : '📜'}</span>
              <p className="text-[10px] font-black uppercase tracking-widest">{n.type === 'quota' ? 'Rate Limit Reached' : 'System Message'}</p>
            </div>
            <p className="text-[10px] leading-relaxed font-bold opacity-90">{n.message}</p>
          </div>
        ))}
      </div>

      <div className="fixed top-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur border border-[#b28a48]/20 px-3 py-1 rounded-sm text-[9px] uppercase font-black text-neutral-500">
          Soul: <span className="text-[#b28a48]">{playerName}</span>
        </div>
        {connections.length > 0 && (
          <div className="bg-black/60 backdrop-blur border border-[#b28a48]/40 px-3 py-1 rounded-full text-[10px] uppercase font-black text-[#b28a48] animate-pulse">
            {connections.length} {connections.length === 1 ? 'Link' : 'Links'} Active
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
