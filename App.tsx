import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Character, Race, Archetype, GameState, Message, Campaign, 
  Item, Monster, Stats, Friend, ArchetypeInfo, Ability, MapToken, Currency, Shop, ShopItem
} from './types';
import { 
  MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, RULES_MANIFEST, ARCHETYPE_INFO, SPELL_SLOT_PROGRESSION, STORAGE_PREFIX, MENTOR_UNIQUE_GEAR
} from './constants';
import Sidebar from './components/Sidebar';
import FellowshipScreen from './components/FellowshipScreen';
import DMWindow from './components/DMWindow';
import TacticalMap from './components/TacticalMap';
import BestiaryScreen from './components/BestiaryScreen';
import ArmoryScreen from './components/ArmoryScreen';
import AlchemyScreen from './components/AlchemyScreen';
import ArchetypesScreen from './components/ArchetypesScreen';
import TutorialScreen from './components/TutorialScreen';
import AccountPortal from './components/AccountPortal';
import NexusScreen from './components/NexusScreen';
import SpellsScreen from './components/SpellsScreen';
import RulesScreen from './components/RulesScreen';
import ShopModal from './components/ShopModal';
import TavernScreen from './components/TavernScreen';
import { generateItemDetails, generateMonsterDetails, generateShopInventory, safeId, parseSoulSignature, hydrateState, manifestSoulLore, generateRumors } from './geminiService';

declare var Peer: any;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Fellowship');
  const [isShopLoading, setIsShopLoading] = useState(false);
  const [isRumorLoading, setIsRumorLoading] = useState(false);
  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<any[]>([]);

  const DEFAULT_STATE: GameState = {
    characters: [],
    mentors: MENTORS,
    activeCampaignId: null,
    campaigns: [],
    armory: INITIAL_ITEMS,
    bestiary: INITIAL_MONSTERS,
    customArchetypes: [],
    mapTokens: [
      { id: 'mentor-lina', name: 'Lina', x: 5, y: 5, color: 'border-blue-500', type: 'Hero' },
      { id: 'monster-shadow-wolf', name: 'Shadow Wolf', x: 10, y: 10, color: 'border-red-500', type: 'Enemy' }
    ],
    party: [],
    slainMonsterTypes: [],
    activeRumors: [],
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

  useEffect(() => {
    if (state.userAccount.isLoggedIn) {
      const storageKey = `${STORAGE_PREFIX}${state.userAccount.username}`;
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [state]);

  // Global Mentor Scaling Logic (Level & Unique Scaling Gear)
  useEffect(() => {
    // Calculate average level of current ACTIVE party (local + remote)
    const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
    // If party is empty, scale with local user's highest or default to 5
    const baselineChars = state.characters.filter(c => c.ownerName === state.userAccount.username);
    const avgLevel = partyChars.length > 0 
      ? Math.max(5, Math.ceil(partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length))
      : (baselineChars.length > 0 ? Math.max(5, Math.ceil(baselineChars.reduce((acc, c) => acc + c.level, 0) / baselineChars.length)) : 5);
    
    const updatedMentors = state.mentors.map(m => {
      // Force scaling if level is mismatch or gear is missing
      const needsScaling = (m.level !== avgLevel || m.inventory.length === 0);
      
      if (needsScaling) {
        const archInfo = ARCHETYPE_INFO[m.archetype as Archetype];
        const hpDie = archInfo?.hpDie || 8;
        const conMod = Math.floor(((m.stats.con || 10) - 10) / 2);
        const newMaxHp = hpDie + conMod + ((avgLevel - 1) * (Math.floor(hpDie/2) + 1 + conMod));
        const slots = SPELL_SLOT_PROGRESSION[avgLevel] || {};
        
        // Auto-populate or Update Gear with Unique scaling templates
        let scaledInventory: Item[] = [];
        const uniqueTemplates = MENTOR_UNIQUE_GEAR[m.id] || [];
        
        if (uniqueTemplates.length > 0) {
          scaledInventory = uniqueTemplates.map(t => {
            const gearBonus = Math.floor(avgLevel / 4);
            const stats = { ...t.stats };
            if (t.type === 'Armor' && stats.ac !== undefined) stats.ac += gearBonus;
            if (t.type === 'Weapon') {
               // Primary stat scaling for mentors based on archetype
               const arch = m.archetype as Archetype;
               const primary = [Archetype.Archer, Archetype.Thief, Archetype.Alchemist].includes(arch) ? 'dex' : 
                               [Archetype.Mage, Archetype.Sorcerer, Archetype.BloodArtist].includes(arch) ? 'int' : 'str';
               
               if (stats[primary as keyof Stats] !== undefined) {
                 stats[primary as keyof Stats] = (stats[primary as keyof Stats] as number) + gearBonus;
               }
            }
            return {
              ...t,
              id: `${t.id || safeId()}-${m.id}`,
              name: `${t.name}${gearBonus > 0 ? ` +${gearBonus}` : ''}`,
              stats,
              isUnique: true
            } as Item;
          });
        } else {
          // Fallback to standard gear if no unique template
          const templates = INITIAL_ITEMS.filter(i => 
            i.archetypes?.includes(m.archetype as Archetype) && i.rarity === 'Common'
          );
          scaledInventory = templates.map(t => ({ ...t, id: `${t.id}-mentor-${m.id}`, isUnique: true }));
        }

        const attributeBonus = Math.floor((avgLevel - 5) / 4);
        const originalMentor = MENTORS.find(init => init.id === m.id);
        const baseStats = originalMentor?.stats || m.stats;
        const scaledStats = { ...baseStats };
        (Object.keys(scaledStats) as Array<keyof Stats>).forEach(key => { 
          scaledStats[key] = (baseStats[key] || 10) + Math.max(0, attributeBonus); 
        });

        return { 
          ...m, 
          level: avgLevel, 
          maxHp: newMaxHp, 
          currentHp: m.currentHp > newMaxHp ? newMaxHp : m.currentHp, 
          stats: scaledStats, 
          inventory: scaledInventory, 
          equippedIds: scaledInventory.map(i => i.id), 
          spellSlots: m.spellSlots || slots, 
          maxSpellSlots: slots 
        };
      }
      return m;
    });

    if (JSON.stringify(updatedMentors) !== JSON.stringify(state.mentors)) {
      setState(prev => ({ ...prev, mentors: updatedMentors }));
    }
  }, [state.party, state.characters]);

  const handleLogin = (username: string) => {
    const storageKey = `${STORAGE_PREFIX}${username}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hydrated = hydrateState(parsed, { ...DEFAULT_STATE, userAccount: { ...DEFAULT_STATE.userAccount, username, isLoggedIn: true } });
        setState(hydrated);
      } catch (e) { setState(p => ({ ...p, userAccount: { ...p.userAccount, username, isLoggedIn: true } })); }
    } else { setState(p => ({ ...p, userAccount: { ...p.userAccount, username, isLoggedIn: true } })); }
  };

  const handleMigrateSoul = (signature: string) => {
    const migratedState = parseSoulSignature(signature, DEFAULT_STATE);
    if (migratedState) {
      setState({ ...migratedState, userAccount: { ...migratedState.userAccount, isLoggedIn: true } });
      return true;
    }
    return false;
  };

  const handleDeleteAccount = () => {
    if (confirm("Sever all bonds? This action shall dissolve thy memories and return thy essence to the void.")) {
      const currentUsername = state.userAccount.username;
      localStorage.removeItem(`${STORAGE_PREFIX}${currentUsername}`);
      setState(prev => ({ ...DEFAULT_STATE, userAccount: { ...DEFAULT_STATE.userAccount, isLoggedIn: false } }));
      window.location.reload();
    }
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
          peer.on('open', (id: string) => { setState(prev => ({ ...prev, userAccount: { ...prev.userAccount, peerId: id } })); });
          peer.on('connection', handleIncomingConnection);
        }
      };
      document.body.appendChild(script);
    }
  }, [state.userAccount.isLoggedIn]);

  const handleIncomingConnection = (conn: any) => {
    conn.on('open', () => {
      connectionsRef.current.push(conn);
      setState(prev => ({ ...prev, multiplayer: { ...prev.multiplayer, connectedPeers: [...prev.multiplayer.connectedPeers, conn.peer] } }));
      conn.send({ type: 'IDENTITY', payload: { username: state.userAccount.username, id: state.userAccount.id, characters: state.characters.filter(c => c.ownerName === state.userAccount.username || !c.ownerName) } });
      if (state.multiplayer.isHost) conn.send({ type: 'SYNC_STATE', payload: state });
    });

    conn.on('data', (data: any) => {
      if (!data) return;
      switch (data.type) {
        case 'IDENTITY':
          setState(prev => {
            const updatedFriend: Friend = { id: data.payload.id || safeId(), name: data.payload.username, active: true, peerId: conn.peer };
            const newFriends = [...prev.userAccount.friends.filter(f => f.name !== data.payload.username), updatedFriend];
            const remoteChars = (data.payload.characters || []).map((c: Character) => ({ ...c, ownerName: data.payload.username }));
            return { ...prev, userAccount: { ...prev.userAccount, friends: newFriends }, characters: [...prev.characters.filter(c => c.ownerName !== data.payload.username), ...remoteChars] };
          });
          break;
        case 'SYNC_STATE': setState(prev => ({ ...data.payload, userAccount: prev.userAccount })); break;
        case 'ADD_CHARACTER': setState(prev => ({ ...prev, characters: [...prev.characters, data.payload] })); break;
        case 'UPDATE_CHARACTER':
          setState(prev => ({
            ...prev,
            characters: prev.characters.map(c => c.id === data.payload.id ? { ...c, ...data.payload.updates } : c),
            mentors: prev.mentors.map(m => m.id === data.payload.id ? { ...m, ...data.payload.updates } : m)
          }));
          break;
        case 'UPDATE_PARTY': setState(prev => ({ ...prev, party: data.payload })); break;
        case 'UPDATE_MAP': setState(prev => ({ ...prev, mapTokens: data.payload })); break;
        case 'SHARE_ARCHETYPE': setState(prev => ({ ...prev, customArchetypes: [...prev.customArchetypes.filter(a => a.name !== data.payload.name), data.payload] })); break;
        case 'SHARE_ITEM': setState(prev => ({ ...prev, armory: [...prev.armory.filter(i => i.id !== data.payload.id), data.payload] })); break;
        case 'SHARE_MONSTER': setState(prev => ({ ...prev, bestiary: [...prev.bestiary.filter(m => m.id !== data.payload.id), data.payload] })); break;
        case 'NEW_MESSAGE': onMessageFromPeer(data.payload); break;
        case 'UPDATE_RUMORS': setState(prev => ({ ...prev, activeRumors: data.payload })); break;
      }
    });

    conn.on('close', () => {
      connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
      setState(prev => ({ ...prev, multiplayer: { ...prev.multiplayer, connectedPeers: prev.multiplayer.connectedPeers.filter(p => p !== conn.peer) } }));
    });
  };

  const connectToSoul = (peerId: string) => {
    if (!peerRef.current || !peerId) return;
    const conn = peerRef.current.connect(peerId);
    handleIncomingConnection(conn);
    setState(prev => ({ ...prev, multiplayer: { ...prev.multiplayer, isHost: false } }));
  };

  const broadcast = (type: string, payload: any) => { connectionsRef.current.forEach(conn => { if (conn.open) conn.send({ type, payload }); }); };

  const onMessageFromPeer = (msg: Message) => {
    setState(prev => ({ ...prev, campaigns: prev.campaigns.map(c => c.id === prev.activeCampaignId ? { ...c, history: [...c.history, msg] } : c) }));
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setState(prev => {
      const char = prev.characters.find(c => c.id === id);
      if (char) return { ...prev, characters: prev.characters.map(c => c.id === id ? { ...c, ...updates } : c) };
      const mentor = prev.mentors.find(m => m.id === id);
      if (mentor) return { ...prev, mentors: prev.mentors.map(m => m.id === id ? { ...m, ...updates } : m) };
      return prev;
    });
    broadcast('UPDATE_CHARACTER', { id, updates });
  };

  const handleLongRest = () => {
    setState(prev => {
      const updateRest = (c: Character) => {
        if (!prev.party.includes(c.id)) return c;
        return {
          ...c,
          currentHp: c.maxHp,
          spellSlots: c.maxSpellSlots ? { ...c.maxSpellSlots } : c.spellSlots
        };
      };
      return { 
        ...prev, 
        characters: prev.characters.map(updateRest), 
        mentors: prev.mentors.map(updateRest) 
      };
    });
  };

  const handleShortRest = () => {
    setState(prev => {
      const updateRest = (c: Character) => {
        if (!prev.party.includes(c.id)) return c;
        const newSlots = c.spellSlots ? { ...c.spellSlots } : undefined;
        if (newSlots && c.maxSpellSlots) {
          Object.keys(c.maxSpellSlots).forEach(lvlStr => {
            const lvl = Number(lvlStr);
            const max = c.maxSpellSlots![lvl];
            newSlots[lvl] = Math.min(max, newSlots[lvl] + Math.ceil(max / 2));
          });
        }
        return {
          ...c,
          currentHp: Math.min(c.maxHp, c.currentHp + Math.floor(c.maxHp * 0.25)),
          spellSlots: newSlots
        };
      };
      return { 
        ...prev, 
        characters: prev.characters.map(updateRest), 
        mentors: prev.mentors.map(updateRest) 
      };
    });
  };

  const handleLevelUp = (id: string) => {
    const char = [...state.characters, ...state.mentors].find(c => c.id === id);
    if (!char || char.exp < char.level * 1000) return;
    const archInfo = ARCHETYPE_INFO[char.archetype] || state.customArchetypes.find(a => a.name === char.archetype);
    const hpDie = archInfo?.hpDie || 8;
    const hpGain = Math.floor(Math.random() * hpDie) + 1 + Math.floor(((char.stats.con || 10) - 10) / 2);
    const newLevel = char.level + 1;
    const isASI = [4, 8, 12, 16, 19].includes(newLevel);
    let slots = {};
    if ([Archetype.Sorcerer, Archetype.Mage, Archetype.DarkKnight].includes(char.archetype as Archetype) || (archInfo as any)?.spells?.length > 0) {
      slots = { maxSpellSlots: SPELL_SLOT_PROGRESSION[newLevel], spellSlots: SPELL_SLOT_PROGRESSION[newLevel] };
    }
    updateCharacter(id, { level: newLevel, exp: char.exp - (char.level * 1000), maxHp: char.maxHp + hpGain, currentHp: char.maxHp + hpGain, asiPoints: char.asiPoints + (isASI ? 2 : 0), ...slots });
  };

  const addExpToParty = (amount: number) => state.party.forEach(id => { 
    const char = [...state.characters, ...state.mentors].find(x => x.id === id); 
    if (char) { 
      const newExp = char.exp + amount;
      updateCharacter(id, { exp: newExp }); 
      setTimeout(() => handleLevelUp(id), 100);
    } 
  });
  
  const addCurrencyToParty = (curr: Partial<Currency>) => state.party.forEach(id => { const c = [...state.characters, ...state.mentors].find(x => x.id === id); if (c) { const v = c.currency || { aurels: 0, shards: 0, ichor: 0 }; updateCharacter(id, { currency: { aurels: v.aurels + (curr.aurels || 0), shards: v.shards + (curr.shards || 0), ichor: v.ichor + (curr.ichor || 0) } }); } });

  const handleOpenShop = async () => {
    setIsShopLoading(true);
    try {
      const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      const avg = partyChars.length > 0 ? partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length : 1;
      const shop = await generateShopInventory("Encounter", Math.ceil(avg));
      setState(prev => ({ ...prev, campaigns: prev.campaigns.map(c => c.id === prev.activeCampaignId ? { ...c, activeShop: shop } : c), currentTavernShop: prev.activeCampaignId ? null : shop }));
    } finally { setIsShopLoading(false); }
  };

  const handleFetchRumors = async () => {
    setIsRumorLoading(true);
    try {
      const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      const avg = partyChars.length > 0 ? Math.ceil(partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length) : 1;
      const rumors = await generateRumors(avg);
      setState(prev => ({ ...prev, activeRumors: rumors }));
      broadcast('UPDATE_RUMORS', rumors);
    } finally { setIsRumorLoading(false); }
  };

  const handleAwardItem = async (name: string, data?: Partial<Item>) => {
    let item = state.armory.find(i => i.name.toLowerCase() === name.toLowerCase());
    
    if (!item) {
      const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      const avgLevel = partyChars.length > 0 ? partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length : 1;
      const stats = await generateItemDetails(name, "Unique Reward", Math.ceil(avgLevel));
      
      item = { 
        id: safeId(), 
        name, 
        description: stats.description || 'A unique artifact awarded by the Engine.', 
        type: (stats.type as any) || 'Weapon', 
        rarity: (stats.rarity as any) || 'Legendary', 
        stats: stats.stats || {}, 
        archetypes: (stats.archetypes as string[]) || [], 
        authorId: state.userAccount.id,
        isUnique: false 
      };
      
      setState(prev => ({ ...prev, armory: [...prev.armory, item!] }));
      broadcast('SHARE_ITEM', item);
    }

    if (state.party.length > 0) {
      const recipientId = state.party[0]; 
      const character = state.characters.find(c => c.id === recipientId) || state.mentors.find(m => m.id === recipientId);
      if (character) {
        const hasItem = character.inventory.some(i => i.name === item!.name);
        if (!hasItem) {
          updateCharacter(recipientId, { inventory: [...character.inventory, item!] });
        }
      }
    }
  };

  const handleAwardMonster = async (name: string) => {
    let monster = state.bestiary.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (!monster) {
      const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      const avgLevel = partyChars.length > 0 ? partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length : 1;
      const gen = await generateMonsterDetails(name, "Encounter", Math.ceil(avgLevel));
      monster = { id: safeId(), name, type: (gen.type as any) || 'Humanoid', hp: gen.hp || 20, ac: gen.ac || 10, stats: gen.stats as any, cr: gen.cr || 1, description: gen.description || '', abilities: gen.abilities || [] };
      setState(prev => ({ ...prev, bestiary: [...prev.bestiary, monster!] }));
      broadcast('SHARE_MONSTER', monster);
    }
    return monster!;
  };

  const createCampaign = (title: string, prompt: string) => {
    const c: Campaign = { id: safeId(), title, prompt, history: [{ role: 'system', content: `Started: ${title}`, timestamp: Date.now() }], participants: state.party };
    setState(prev => ({ ...prev, campaigns: [...prev.campaigns, c], activeCampaignId: c.id }));
    setActiveTab('Chronicles');
  };

  const handleAddCharacter = (c: Character) => {
    const newChar = { ...c, ownerName: state.userAccount.username, isPrimarySoul: state.characters.length === 0 };
    setState(p => ({ ...p, characters: [...p.characters, newChar], party: newChar.isPrimarySoul ? [...p.party, newChar.id] : p.party }));
  };

  const activePartyObjects = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
  const currentShop = (state.campaigns.find(c => c.id === state.activeCampaignId)?.activeShop) || state.currentTavernShop;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0c0a09] text-[#d6d3d1] overflow-hidden md:flex-row">
      {!state.userAccount.isLoggedIn && (
        <AccountPortal onLogin={handleLogin} onMigrate={handleMigrateSoul} />
      )}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userAccount={state.userAccount} multiplayer={state.multiplayer} showTactics={!!state.campaigns.find(c => c.id === state.activeCampaignId)?.isCombatActive} />
      <main className="relative flex-1 overflow-y-auto bg-leather">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          {currentShop && <ShopModal shop={currentShop} characters={activePartyObjects} onClose={() => setState(prev => ({ ...prev, currentTavernShop: null, campaigns: prev.campaigns.map(c => ({...c, activeShop: null})) }))} onBuy={(item, buyerId) => {
            const buyer = [...state.characters, ...state.mentors].find(c => c.id === buyerId);
            if (!buyer) return;
            const cost = item.cost;
            const buyerCurr = buyer.currency || { aurels: 0, shards: 0, ichor: 0 };
            updateCharacter(buyerId, { currency: { aurels: buyerCurr.aurels - cost.aurels, shards: buyerCurr.shards - cost.shards, ichor: buyerCurr.ichor - cost.ichor }, inventory: [...buyer.inventory, item] });
          }} />}
          {activeTab === 'Tavern' && <TavernScreen party={activePartyObjects} mentors={state.mentors} partyIds={state.party} onToggleParty={id => setState(p => ({ ...p, party: p.party.includes(id) ? p.party.filter(x => x !== id) : [...p.party, id] }))} onLongRest={handleLongRest} onOpenShop={handleOpenShop} onUpgradeItem={(cid, iid, cost) => {
            const char = [...state.characters, ...state.mentors].find(c => c.id === cid);
            if (!char) return;
            const item = char.inventory.find(i => i.id === iid);
            if (!item) return;
            const currentPlus = parseInt(item.name.match(/\+(\d+)/)?.[1] || '0');
            const newName = `${item.name.split(' +')[0]} +${currentPlus + 1}`;
            const updatedStats = { ...item.stats };
            if (item.type === 'Armor' && updatedStats.ac !== undefined) updatedStats.ac += 1;
            const updatedInventory = char.inventory.map(i => i.id === iid ? { ...i, name: newName, stats: updatedStats } : i);
            updateCharacter(cid, { inventory: updatedInventory, currency: { aurels: char.currency.aurels - cost.aurels, shards: char.currency.shards - cost.shards, ichor: char.currency.ichor - cost.ichor } });
          }} isHost={state.multiplayer.isHost} activeRumors={state.activeRumors} onFetchRumors={handleFetchRumors} isRumorLoading={isRumorLoading} slainMonsterTypes={state.slainMonsterTypes} />}
          {activeTab === 'Fellowship' && <FellowshipScreen characters={state.characters} onAdd={handleAddCharacter} onDelete={id => setState(p => ({ ...p, characters: p.characters.filter(c => c.id !== id) }))} onUpdate={updateCharacter} mentors={state.mentors} onUpdateMentor={updateCharacter} party={state.party} setParty={p => setState(s => ({ ...s, party: p }))} customArchetypes={state.customArchetypes} onAddCustomArchetype={a => setState(p => ({ ...p, customArchetypes: [...p.customArchetypes, a] }))} username={state.userAccount.username} />}
          {activeTab === 'Chronicles' && <DMWindow campaign={state.campaigns.find(c => c.id === state.activeCampaignId) || null} allCampaigns={state.campaigns} characters={activePartyObjects} bestiary={state.bestiary} mapTokens={state.mapTokens} activeRumors={state.activeRumors} onUpdateMap={m => setState(p => ({ ...p, mapTokens: m }))} onMessage={m => setState(p => ({ ...p, campaigns: p.campaigns.map(c => c.id === p.activeCampaignId ? { ...c, history: [...c.history, m] } : c) }))} onCreateCampaign={createCampaign} onSelectCampaign={id => setState(p => ({ ...p, activeCampaignId: id }))} onQuitCampaign={() => setState(p => ({ ...p, activeCampaignId: null }))} onAwardExp={addExpToParty} onAwardCurrency={addCurrencyToParty} onAwardItem={handleAwardItem} onAwardMonster={handleAwardMonster} onShortRest={handleShortRest} onLongRest={handleLongRest} onAIRuntimeUseSlot={(l, n) => { const t = [...state.characters, ...state.mentors].find(x => x.name.toLowerCase() === n.toLowerCase()); if (t && t.spellSlots?.[l]) { updateCharacter(t.id, { spellSlots: { ...t.spellSlots, [l]: t.spellSlots[l] - 1 } }); return true; } return false; }} onOpenShop={handleOpenShop} onSetCombatActive={a => setState(p => ({ ...p, campaigns: p.campaigns.map(c => c.id === p.activeCampaignId ? { ...c, isCombatActive: a } : c) }))} isHost={state.multiplayer.isHost} username={state.userAccount.username} onOpenCombatMap={() => setActiveTab('Tactics')} />}
          {activeTab === 'Tactics' && <TacticalMap tokens={state.mapTokens} onUpdateTokens={m => setState(p => ({ ...p, mapTokens: m }))} characters={[...state.characters, ...state.mentors]} monsters={state.bestiary} />}
          {activeTab === 'Archetypes' && <ArchetypesScreen customArchetypes={state.customArchetypes} onShare={a => broadcast('SHARE_ARCHETYPE', a)} userId={state.userAccount.id} />}
          {activeTab === 'Spells' && <SpellsScreen mentors={state.mentors} playerCharacters={state.characters} customArchetypes={state.customArchetypes} />}
          {activeTab === 'Bestiary' && <BestiaryScreen monsters={state.bestiary} onUpdateMonster={() => {}} />}
          {activeTab === 'Armory' && <ArmoryScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onUpdateItem={() => {}} onShare={i => broadcast('SHARE_ITEM', i)} userId={state.userAccount.id} />}
          {activeTab === 'Alchemy' && <AlchemyScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onUpdateItem={() => {}} onShare={i => broadcast('SHARE_ITEM', i)} userId={state.userAccount.id} party={activePartyObjects} />}
          {activeTab === 'Rules' && <RulesScreen />}
          {activeTab === 'Nexus' && <NexusScreen peerId={state.userAccount.peerId || ''} connectedPeers={state.multiplayer.connectedPeers} isHost={state.multiplayer.isHost} onConnect={connectToSoul} username={state.userAccount.username} gameState={state} onClearFriends={() => setState(p => ({ ...p, userAccount: { ...p.userAccount, friends: [] } }))} onDeleteAccount={handleDeleteAccount} />}
        </div>
      </main>
    </div>
  );
};
export default App;