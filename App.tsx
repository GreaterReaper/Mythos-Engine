
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Character, Race, Archetype, GameState, Message, Campaign, 
  Item, Monster, Stats, Friend, ArchetypeInfo, Ability 
} from './types';
import { 
  MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, RULES_MANIFEST, ARCHETYPE_INFO, SPELL_SLOT_PROGRESSION, STARTER_CAMPAIGN_PROMPT, STORAGE_PREFIX
} from './constants';
import Sidebar from './components/Sidebar';
import FellowshipScreen from './components/FellowshipScreen';
import DMWindow from './components/DMWindow';
import TacticalMap from './components/TacticalMap';
import BestiaryScreen from './components/BestiaryScreen';
import ArmoryScreen from './components/ArmoryScreen';
import ArchetypesScreen from './components/ArchetypesScreen';
import TutorialScreen from './components/TutorialScreen';
import AccountPortal from './components/AccountPortal';
import NexusScreen from './components/NexusScreen';
import SpellsScreen from './components/SpellsScreen';
import { generateItemDetails, safeId, parseSoulSignature } from './geminiService';

declare var Peer: any;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Fellowship');
  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<any[]>([]);

  // Default Initial State
  const DEFAULT_STATE: GameState = {
    characters: [],
    mentors: MENTORS,
    activeCampaignId: null,
    campaigns: [],
    armory: INITIAL_ITEMS,
    bestiary: INITIAL_MONSTERS,
    customArchetypes: [],
    party: [],
    userAccount: {
      username: 'Nameless Soul',
      id: safeId(),
      friends: [],
      sharedCreations: [],
      isLoggedIn: false
    },
    multiplayer: {
      isHost: true,
      connectedPeers: []
    }
  };

  const [state, setState] = useState<GameState>(DEFAULT_STATE);

  // Persistence logic keyed by username
  useEffect(() => {
    if (state.userAccount.isLoggedIn) {
      const storageKey = `${STORAGE_PREFIX}${state.userAccount.username}`;
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [state]);

  const handleLogin = (username: string) => {
    const storageKey = `${STORAGE_PREFIX}${username}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState({
          ...DEFAULT_STATE,
          ...parsed,
          userAccount: { ...parsed.userAccount, isLoggedIn: true }
        });
      } catch (e) {
        console.error("Failed to rebind soul from local memory:", e);
        setState(p => ({ ...p, userAccount: { ...p.userAccount, username, isLoggedIn: true } }));
      }
    } else {
      setState(p => ({ ...p, userAccount: { ...p.userAccount, username, isLoggedIn: true } }));
    }
  };

  const handleMigrateSoul = (signature: string) => {
    const migratedState = parseSoulSignature(signature);
    if (migratedState) {
      setState({
        ...migratedState,
        userAccount: { ...migratedState.userAccount, isLoggedIn: true }
      });
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (state.userAccount.isLoggedIn && !peerRef.current && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
      script.async = true;
      script.onload = () => {
        if (typeof Peer !== 'undefined') {
          const peer = new Peer();
          peerRef.current = peer;
          peer.on('open', (id: string) => {
            setState(prev => ({
              ...prev,
              userAccount: { ...prev.userAccount, peerId: id }
            }));
          });
          peer.on('connection', (conn: any) => {
            handleIncomingConnection(conn);
          });
        }
      };
      document.body.appendChild(script);
    }
  }, [state.userAccount.isLoggedIn]);

  const handleIncomingConnection = (conn: any) => {
    conn.on('open', () => {
      connectionsRef.current.push(conn);
      setState(prev => ({
        ...prev,
        multiplayer: {
          ...prev.multiplayer,
          connectedPeers: [...prev.multiplayer.connectedPeers, conn.peer]
        }
      }));
      if (state.multiplayer.isHost) {
        conn.send({ type: 'SYNC_STATE', payload: state });
      }
    });

    conn.on('data', (data: any) => {
      if (!data) return;
      switch (data.type) {
        case 'SYNC_STATE':
          setState(prev => ({ ...data.payload, userAccount: prev.userAccount }));
          break;
        case 'ADD_CHARACTER':
          setState(prev => ({ ...prev, characters: [...prev.characters, data.payload] }));
          break;
        case 'SHARE_ARCHETYPE':
          setState(prev => ({ ...prev, customArchetypes: [...prev.customArchetypes.filter(a => a.name !== data.payload.name), data.payload] }));
          break;
        case 'SHARE_ITEM':
          setState(prev => ({ ...prev, armory: [...prev.armory.filter(i => i.id !== data.payload.id), data.payload] }));
          break;
        case 'NEW_MESSAGE':
          onMessageFromPeer(data.payload);
          break;
      }
    });
  };

  const connectToSoul = (peerId: string) => {
    if (!peerRef.current) return;
    const conn = peerRef.current.connect(peerId);
    handleIncomingConnection(conn);
    setState(prev => ({ ...prev, multiplayer: { ...prev.multiplayer, isHost: false } }));
  };

  const broadcast = (type: string, payload: any) => {
    connectionsRef.current.forEach(conn => {
      if (conn.open) {
        conn.send({ type, payload });
      }
    });
  };

  const onMessageFromPeer = (msg: Message) => {
    setState(prev => ({
      ...prev,
      campaigns: prev.campaigns.map(c => 
        c.id === prev.activeCampaignId ? { ...c, history: [...c.history, msg] } : c
      )
    }));
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setState(prev => {
      const char = prev.characters.find(c => c.id === id);
      if (char) return { ...prev, characters: prev.characters.map(c => c.id === id ? { ...c, ...updates } : c) };
      const mentor = prev.mentors.find(m => m.id === id);
      if (mentor) return { ...prev, mentors: prev.mentors.map(m => m.id === id ? { ...m, ...updates } : m) };
      return prev;
    });
  };

  const handleLevelUp = (id: string) => {
    const char = state.characters.find(c => c.id === id) || state.mentors.find(m => m.id === id);
    if (!char) return;
    const nextExp = char.level * 1000;
    if (char.exp >= nextExp) {
      const archName = char.archetype;
      const archInfo = ARCHETYPE_INFO[archName as string] || state.customArchetypes.find(a => a.name === archName) || { hpDie: 8, spells: [] };
      const newLevel = char.level + 1;
      const hpGain = Math.floor(Math.random() * archInfo.hpDie) + 1 + Math.floor((char.stats.con - 10) / 2);
      const isASILevel = [4, 8, 12, 16, 19].includes(newLevel);
      
      let spellSlotsUpdate = {};
      const isCaster = [Archetype.Sorcerer, Archetype.Mage, Archetype.DarkKnight].includes(archName as Archetype) || (archInfo.spells && archInfo.spells.length > 0);
      if (isCaster) {
        const slots = SPELL_SLOT_PROGRESSION[newLevel] || {};
        spellSlotsUpdate = { maxSpellSlots: slots, spellSlots: slots };
      }

      updateCharacter(id, {
        level: newLevel,
        exp: char.exp - nextExp,
        maxHp: char.maxHp + hpGain,
        currentHp: char.maxHp + hpGain,
        asiPoints: char.asiPoints + (isASILevel ? 2 : 0),
        ...spellSlotsUpdate
      });
    }
  };

  const addExpToParty = (amount: number) => {
    state.party.forEach(id => {
      const char = state.characters.find(c => c.id === id) || state.mentors.find(m => m.id === id);
      if (char) {
        // Explicitly cast char.exp to number to resolve unknown type inference errors during addition
        const newExp = (char.exp as number) + amount;
        updateCharacter(id, { exp: newExp });
        handleLevelUp(id);
      }
    });
  };

  const handleShortRest = () => {
    state.party.forEach(id => {
      const char = state.characters.find(c => c.id === id) || state.mentors.find(m => m.id === id);
      if (char) {
        const missingHp = char.maxHp - char.currentHp;
        const restoredHp = Math.ceil(missingHp / 2);
        
        let restoredSlots = { ...char.spellSlots };
        if (char.maxSpellSlots) {
          Object.entries(char.maxSpellSlots).forEach(([lvl, max]) => {
            const level = parseInt(lvl);
            const current = char.spellSlots?.[level] || 0;
            restoredSlots[level] = Math.min(max, current + Math.ceil(max / 2));
          });
        }

        updateCharacter(id, {
          currentHp: Math.min(char.maxHp, char.currentHp + restoredHp),
          spellSlots: restoredSlots
        });
      }
    });
  };

  const handleLongRest = () => {
    state.party.forEach(id => {
      const char = state.characters.find(c => c.id === id) || state.mentors.find(m => m.id === id);
      if (char) {
        updateCharacter(id, {
          currentHp: char.maxHp,
          spellSlots: char.maxSpellSlots ? { ...char.maxSpellSlots } : undefined
        });
      }
    });
  };

  const handleAwardItem = async (name: string, data?: Partial<Item>) => {
    let item = state.armory.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (!item) {
      const activeCampaign = state.campaigns.find(c => c.id === state.activeCampaignId);
      const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      const avgLevel = partyChars.length > 0 ? partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length : 1;
      const context = activeCampaign?.history.slice(-5).map(m => m.content).join(' ') || "The party finds a treasure.";
      const generatedStats = await generateItemDetails(name, context, Math.ceil(avgLevel));
      item = {
        id: safeId(),
        name,
        description: generatedStats.description || 'A shimmering item.',
        type: (generatedStats.type as any) || 'Utility',
        rarity: (generatedStats.rarity as any) || 'Common',
        stats: generatedStats.stats || {},
        archetypes: (generatedStats.archetypes as string[]) || [],
        authorId: state.userAccount.id
      };
      setState(prev => ({ ...prev, armory: [...prev.armory, item!] }));
    }
    if (item && state.party.length > 0) {
      const recipientId = state.party[0];
      const recipient = state.characters.find(c => c.id === recipientId) || state.mentors.find(m => m.id === recipientId);
      if (recipient) updateCharacter(recipientId, { inventory: [...recipient.inventory, item] });
    }
  };

  const handleAddCustomArchetype = (arch: ArchetypeInfo) => {
    setState(prev => {
      const newArches = [...prev.customArchetypes.filter(a => a.name !== arch.name), arch];
      const newItems = arch.themedItems || [];
      const updatedArmory = [...prev.armory];
      newItems.forEach(item => { if (!updatedArmory.some(i => i.name === item.name)) updatedArmory.push(item); });
      return { ...prev, customArchetypes: newArches, armory: updatedArmory };
    });
    broadcast('SHARE_ARCHETYPE', arch);
  };

  const createCampaign = (title: string, prompt: string) => {
    const newCampaign: Campaign = {
      id: safeId(),
      title,
      prompt,
      history: [{ role: 'system', content: `Campaign Started: ${title}. ${prompt}`, timestamp: Date.now() }],
      participants: state.party
    };
    setState(prev => ({ ...prev, campaigns: [...prev.campaigns, newCampaign], activeCampaignId: newCampaign.id }));
    setActiveTab('Chronicles');
  };

  const activeCampaign = useMemo(() => state.campaigns.find(c => c.id === state.activeCampaignId) || null, [state.campaigns, state.activeCampaignId]);

  if (!state.userAccount.isLoggedIn) {
    return <AccountPortal onLogin={handleLogin} onMigrate={handleMigrateSoul} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[#0c0a09] text-[#d6d3d1] selection:bg-red-900 overflow-hidden">
      {/* Mobile Top Header */}
      <header className="md:hidden flex justify-between items-center px-4 py-3 bg-[#0c0a09] border-b border-red-900/40 z-[90]">
        <h1 className="text-lg font-cinzel font-bold text-[#a16207]">Mythos Engine</h1>
        <div 
          onClick={() => setActiveTab('Nexus')}
          className={`flex items-center gap-2 px-2 py-1 rounded-full text-[8px] font-bold transition-all cursor-pointer ${
            state.multiplayer.connectedPeers.length > 0 ? 'bg-green-900/20 text-green-500 border border-green-500/30' : 'bg-red-900/20 text-red-500 border border-red-900/30'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${state.multiplayer.connectedPeers.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {state.multiplayer.connectedPeers.length > 0 ? 'SOULS BONDED' : 'ALONE'}
        </div>
      </header>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userAccount={state.userAccount} 
        multiplayer={state.multiplayer}
      />
      
      <main className="flex-1 relative overflow-y-auto bg-leather">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full pb-20 md:pb-8">
          {activeTab === 'Fellowship' && (
            <FellowshipScreen 
              characters={state.characters} 
              onAdd={(c) => { setState(p => ({ ...p, characters: [...p.characters, c] })); broadcast('ADD_CHARACTER', c); }} 
              onDelete={(id) => setState(p => ({...p, characters: p.characters.filter(c => c.id !== id)}))}
              onUpdate={updateCharacter}
              mentors={state.mentors}
              onUpdateMentor={updateCharacter}
              party={state.party}
              setParty={(party) => setState(p => ({...p, party}))}
              customArchetypes={state.customArchetypes}
              onAddCustomArchetype={handleAddCustomArchetype}
            />
          )}
          {activeTab === 'Chronicles' && (
            <DMWindow 
              campaign={activeCampaign} 
              allCampaigns={state.campaigns}
              characters={[...state.characters, ...state.mentors].filter(c => state.party.includes(c.id))}
              onMessage={(msg) => {
                if (!activeCampaign) return;
                setState(prev => ({ ...prev, campaigns: prev.campaigns.map(c => c.id === activeCampaign.id ? { ...c, history: [...c.history, msg] } : c) }));
                broadcast('NEW_MESSAGE', msg);
              }}
              onCreateCampaign={createCampaign}
              onSelectCampaign={(id) => setState(p => ({ ...p, activeCampaignId: id }))}
              onQuitCampaign={() => setState(p => ({ ...p, activeCampaignId: null }))}
              onAwardExp={addExpToParty}
              onAwardItem={handleAwardItem}
              onShortRest={handleShortRest}
              onLongRest={handleLongRest}
              isHost={state.multiplayer.isHost}
            />
          )}
          {activeTab === 'Tactics' && <TacticalMap />}
          {activeTab === 'Nexus' && (
            <NexusScreen 
              peerId={state.userAccount.peerId || ''}
              connectedPeers={state.multiplayer.connectedPeers}
              isHost={state.multiplayer.isHost}
              onConnect={connectToSoul}
              username={state.userAccount.username}
              gameState={state}
            />
          )}
          {activeTab === 'Archetypes' && (
            <ArchetypesScreen 
              customArchetypes={state.customArchetypes} 
              onShare={(item) => broadcast('SHARE_ARCHETYPE', item)}
              userId={state.userAccount.id}
            />
          )}
          {activeTab === 'Spells' && (
            <SpellsScreen 
              mentors={state.mentors} 
              playerCharacters={state.characters} 
              customArchetypes={state.customArchetypes}
            />
          )}
          {activeTab === 'Bestiary' && <BestiaryScreen monsters={state.bestiary} onUpdateMonster={() => {}} />}
          {activeTab === 'Armory' && (
            <ArmoryScreen 
              armory={state.armory} 
              setArmory={(a) => setState(p => ({...p, armory: a}))} 
              onUpdateItem={() => {}} 
              onShare={(item) => broadcast('SHARE_ITEM', item)}
              userId={state.userAccount.id}
            />
          )}
          {activeTab === 'Rules' && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-cinzel text-[#a16207] border-b border-red-900 pb-2">Ancient Laws</h2>
              <div className="rune-border p-4 md:p-6 bg-[#0c0a09]/80 backdrop-blur whitespace-pre-wrap leading-loose text-xs md:text-sm">
                {RULES_MANIFEST}
              </div>
            </div>
          )}
          {activeTab === 'Tutorial' && (
            <TutorialScreen onComplete={(partyIds, title, prompt) => {
              setState(p => ({...p, party: partyIds}));
              createCampaign(title, prompt);
            }} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
