
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive'>('campaign');
  
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

  // Persistence
  useEffect(() => {
    localStorage.setItem('mythos_chars', JSON.stringify(characters));
    localStorage.setItem('mythos_classes', JSON.stringify(classes));
    localStorage.setItem('mythos_monsters', JSON.stringify(monsters));
    localStorage.setItem('mythos_items', JSON.stringify(items));
    localStorage.setItem('mythos_campaign', JSON.stringify(campaign));
    if (playerName) {
      localStorage.setItem('mythos_player_name', playerName);
    }
  }, [characters, classes, monsters, items, campaign, playerName]);

  const addServerLog = (message: string, type: ServerLog['type'] = 'info') => {
    const newLog: ServerLog = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: Date.now()
    };
    setServerLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: playerName } as SyncMessage;
    connections.forEach(conn => {
      if (conn.open) conn.send(fullMsg);
    });
    if (isHost && msg.type !== 'PULSE') {
      addServerLog(`Broadcasting ${msg.type} to all souls`, 'success');
    }
  }, [connections, peerId, playerName, isHost]);

  const handleIncomingData = useCallback((data: SyncMessage) => {
    if (isHost) {
      addServerLog(`Pulse received from ${data.senderName}: ${data.type}`, 'info');
    }

    switch (data.type) {
      case 'STATE_UPDATE':
        if (!isHost) {
          setCampaign(data.payload.campaign);
          setMonsters(data.payload.monsters);
          setItems(data.payload.items);
          setClasses(data.payload.classes);
          addServerLog(`Received world update from Host`, 'success');
        }
        break;
      case 'NEW_LOG':
        setCampaign(prev => ({ ...prev, logs: [...prev.logs, data.payload] }));
        break;
      case 'GIVE_LOOT':
        setItems(prev => [...prev, data.payload]);
        break;
      case 'SHARE_RESOURCE':
        if (data.payload.type === 'item') setItems(prev => [...prev, data.payload.data]);
        if (data.payload.type === 'class') setClasses(prev => [...prev, data.payload.data]);
        break;
      case 'SUMMARY_UPDATE':
        setCampaign(prev => ({ ...prev, summary: data.payload }));
        break;
      case 'KICK':
        if (!isHost) {
          addServerLog(`Host has severed your connection.`, 'error');
          peerRef.current?.destroy();
          window.location.reload();
        }
        break;
    }
  }, [isHost]);

  // PeerJS Setup
  useEffect(() => {
    if (!playerName) return;

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      addServerLog(`Chronicle Server Online at Sigil: ${id}`, 'success');
    });
    
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        addServerLog(`Soul Connected: ${conn.peer}`, 'success');
        
        if (isHost) {
          conn.send({ 
            type: 'STATE_UPDATE', 
            payload: { campaign, monsters, items, classes },
            senderId: peer.id,
            senderName: playerName
          });
        }
      });

      conn.on('data', (data: any) => handleIncomingData(data));
      
      conn.on('close', () => {
        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
        addServerLog(`Soul Disconnected: ${conn.peer}`, 'warn');
      });

      conn.on('error', (err) => {
        addServerLog(`Connection Error with ${conn.peer}: ${err}`, 'error');
      });
    });

    return () => {
      peer.destroy();
    };
  }, [isHost, playerName, campaign, monsters, items, classes]);

  const joinSession = (id: string) => {
    const peer = peerRef.current;
    if (!peer) return;
    setIsHost(false);
    addServerLog(`Attempting to bind with Sigil: ${id}...`, 'info');
    const conn = peer.connect(id);
    conn.on('open', () => {
      setConnections([conn]);
      addServerLog(`Successfully bound to Host Soul`, 'success');
    });
    conn.on('data', (data: any) => handleIncomingData(data));
  };

  const forceSync = () => {
    if (!isHost) return;
    broadcast({
      type: 'STATE_UPDATE',
      payload: { campaign, monsters, items, classes }
    });
    addServerLog('Forced manual world synchronization', 'success');
  };

  const kickSoul = (id: string) => {
    const conn = connections.find(c => c.peer === id);
    if (conn) {
      conn.send({ type: 'KICK', senderId: peerId, senderName: playerName, payload: null });
      conn.close();
      setConnections(prev => prev.filter(c => c.peer !== id));
      addServerLog(`Banished Soul: ${id}`, 'warn');
    }
  };

  const handleImportData = (data: any) => {
    if (data.characters) setCharacters(data.characters);
    if (data.classes) setClasses(data.classes);
    if (data.monsters) setMonsters(data.monsters);
    if (data.items) setItems(data.items);
    if (data.campaign) setCampaign(data.campaign);
    if (data.playerName) setPlayerName(data.playerName);
    addServerLog('Imported Grimoire from Archive', 'success');
  };

  if (!playerName) {
    return <LoginScreen setPlayerName={setPlayerName} />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-24 lg:pb-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && (
            <CampaignView 
              campaign={campaign} 
              setCampaign={setCampaign} 
              characters={characters}
              broadcast={broadcast}
              isHost={isHost}
              classes={classes}
              playerName={playerName}
            />
          )}
          {activeTab === 'characters' && (
            <CharacterCreator 
              characters={characters} 
              setCharacters={setCharacters} 
              classes={classes}
              items={items}
            />
          )}
          {activeTab === 'classes' && (
            <ClassLibrary 
              classes={classes} 
              setClasses={setClasses} 
              broadcast={broadcast}
            />
          )}
          {activeTab === 'bestiary' && (
            <Bestiary 
              monsters={monsters} 
              setMonsters={setMonsters} 
            />
          )}
          {activeTab === 'armory' && (
            <Armory 
              items={items} 
              setItems={setItems} 
              broadcast={broadcast}
            />
          )}
          {activeTab === 'multiplayer' && (
            <MultiplayerPanel 
              peerId={peerId}
              isHost={isHost}
              connections={connections}
              serverLogs={serverLogs}
              joinSession={joinSession}
              setIsHost={setIsHost}
              forceSync={forceSync}
              kickSoul={kickSoul}
            />
          )}
          {activeTab === 'archive' && (
            <ArchivePanel 
              data={{ characters, classes, monsters, items, campaign, playerName }}
              onImport={handleImportData}
            />
          )}
        </div>
      </main>

      {/* Connection Indicator */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur border border-[#b28a48]/20 px-3 py-1 rounded-sm text-[9px] uppercase font-black text-neutral-500">
          Player: <span className="text-[#b28a48]">{playerName}</span>
        </div>
        {connections.length > 0 && (
          <div className="bg-black/60 backdrop-blur border border-[#b28a48]/40 px-3 py-1 rounded-full text-[10px] uppercase font-black text-[#b28a48] animate-pulse">
            Linked to {connections.length} {connections.length === 1 ? 'Soul' : 'Souls'}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
