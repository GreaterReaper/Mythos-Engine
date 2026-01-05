
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Character, Race, Archetype, GameState, Message, Campaign, 
  Item, Monster, Stats, Friend, ArchetypeInfo, Ability 
} from './types';
import { 
  MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, RULES_MANIFEST, ARCHETYPE_INFO, SPELL_SLOT_PROGRESSION, STARTER_CAMPAIGN_PROMPT
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
import MatchmakingModal from './components/MatchmakingModal';
import SpellsScreen from './components/SpellsScreen';
import { generateItemDetails, safeId } from './geminiService';

declare var Peer: any;

const STORAGE_KEY = 'mythos_engine_v3';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Fellowship');
  const [showMatchmaking, setShowMatchmaking] = useState(false);
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

  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Ensure critical arrays and objects exist to avoid crashes
        return {
          ...DEFAULT_STATE,
          ...parsed,
          characters: Array.isArray(parsed.characters) ? parsed.characters : [],
          campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
          customArchetypes: Array.isArray(parsed.customArchetypes) ? parsed.customArchetypes : [],
          party: Array.isArray(parsed.party) ? parsed.party : [],
          armory: Array.isArray(parsed.armory) ? parsed.armory : INITIAL_ITEMS,
          mentors: MENTORS, // Always use fresh mentor data
          bestiary: INITIAL_MONSTERS, // Always use fresh bestiary data
        } as GameState;
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }, [state]);

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
      if (char) {
        return {
          ...prev,
          characters: prev.characters.map(c => c.id === id ? { ...c, ...updates } : c)
        };
      }
      const mentor = prev.mentors.find(m => m.id === id);
      if (mentor) {
        return {
          ...prev,
          mentors: prev.mentors.map(m => m.id === id ? { ...m, ...updates } : m)
        };
      }
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
        spellSlotsUpdate = {
          maxSpellSlots: slots,
          spellSlots: slots
        };
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
        const newExp = char.exp + amount;
        updateCharacter(id, { exp: newExp });
        handleLevelUp(id);
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
      if (recipient) {
        updateCharacter(recipientId, { inventory: [...recipient.inventory, item] });
      }
    }
  };

  const handleAddCustomArchetype = (arch: ArchetypeInfo) => {
    setState(prev => {
      const newArches = [...prev.customArchetypes.filter(a => a.name !== arch.name), arch];
      const newItems = arch.themedItems || [];
      const updatedArmory = [...prev.armory];
      newItems.forEach(item => {
        if (!updatedArmory.some(i => i.name === item.name)) {
          updatedArmory.push(item);
        }
      });
      return {
        ...prev,
        customArchetypes: newArches,
        armory: updatedArmory
      };
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
    setState(prev => ({
      ...prev,
      campaigns: [...prev.campaigns, newCampaign],
      activeCampaignId: newCampaign.id
    }));
    setActiveTab('Chronicles');
  };

  const activeCampaign = useMemo(() => 
    state.campaigns.find(c => c.id === state.activeCampaignId) || null
  , [state.campaigns, state.activeCampaignId]);

  if (!state.userAccount.isLoggedIn) {
    return <AccountPortal onLogin={(name) => setState(p => ({...p, userAccount: {...p.userAccount, username: name, isLoggedIn: true}}))} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[#0c0a09] text-[#d6d3d1] selection:bg-red-900 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userAccount={state.userAccount} 
        multiplayer={state.multiplayer}
        onMatchmaking={() => setShowMatchmaking(true)}
      />
      
      <main className="flex-1 relative overflow-y-auto bg-leather">
        {/* pb-20 on mobile to clear the fixed bottom nav */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full pb-20 md:pb-8">
          {activeTab === 'Fellowship' && (
            <FellowshipScreen 
              characters={state.characters} 
              onAdd={(c) => {
                setState(p => ({ ...p, characters: [...p.characters, c] }));
                broadcast('ADD_CHARACTER', c);
              }} 
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
                setState(prev => ({
                  ...prev,
                  campaigns: prev.campaigns.map(c => 
                    c.id === activeCampaign.id ? { ...c, history: [...c.history, msg] } : c
                  )
                }));
                broadcast('NEW_MESSAGE', msg);
              }}
              onCreateCampaign={createCampaign}
              onSelectCampaign={(id) => setState(p => ({ ...p, activeCampaignId: id }))}
              onQuitCampaign={() => setState(p => ({ ...p, activeCampaignId: null }))}
              onAwardExp={addExpToParty}
              onAwardItem={handleAwardItem}
              isHost={state.multiplayer.isHost}
            />
          )}
          {activeTab === 'Tactics' && <TacticalMap />}
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

      {showMatchmaking && (
        <MatchmakingModal 
          onClose={() => setShowMatchmaking(false)} 
          onConnect={connectToSoul} 
          peerId={state.userAccount.peerId || 'Aetherizing...'}
          connectedPeers={state.multiplayer.connectedPeers}
        />
      )}
    </div>
  );
};

export default App;
