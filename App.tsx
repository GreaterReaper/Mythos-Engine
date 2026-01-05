
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Character, Race, Archetype, GameState, Message, Campaign, 
  Item, Monster, Stats, Friend, ArchetypeInfo, Ability, MapToken, Currency, Shop, ShopItem
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
import ShopModal from './components/ShopModal';
import TavernScreen from './components/TavernScreen';
import { generateItemDetails, generateMonsterDetails, generateShopInventory, safeId, parseSoulSignature, hydrateState, manifestSoulLore } from './geminiService';

declare var Peer: any;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Fellowship');
  const [isShopLoading, setIsShopLoading] = useState(false);
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

  // Background Pre-fetching for Shop
  useEffect(() => {
    if (activeTab === 'Tavern' && !state.currentTavernShop && !isShopLoading) {
      handleOpenShop(true); // Pre-fetch silently
    }
  }, [activeTab]);

  // Soul Weaver Logic
  useEffect(() => {
    const activeCampaign = state.campaigns.find(c => c.id === state.activeCampaignId);
    if (activeCampaign && state.multiplayer.isHost) {
      const emptyChars = state.characters.filter(c => state.party.includes(c.id) && (!c.biography || c.biography.length < 5));
      if (emptyChars.length > 0) {
        const processLore = async () => {
          for (const char of emptyChars) {
            try {
              const lore = await manifestSoulLore(char, activeCampaign.prompt);
              updateCharacter(char.id, { biography: lore.biography, description: lore.description });
            } catch (e) {
              console.error("Aetheric weaver failed for", char.name);
            }
          }
        };
        processLore();
      }
    }
  }, [state.activeCampaignId]);

  const handleLogin = (username: string) => {
    const storageKey = `${STORAGE_PREFIX}${username}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hydrated = hydrateState(parsed, { ...DEFAULT_STATE, userAccount: { ...DEFAULT_STATE.userAccount, username, isLoggedIn: true } });
        setState(hydrated);
      } catch (e) {
        setState(p => ({ ...p, userAccount: { ...p.userAccount, username, isLoggedIn: true } }));
      }
    } else {
      setState(p => ({ ...p, userAccount: { ...p.userAccount, username, isLoggedIn: true } }));
    }
  };

  const handleMigrateSoul = (signature: string) => {
    const migratedState = parseSoulSignature(signature, DEFAULT_STATE);
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

      // Send local identity and current characters to ensure global roster sync
      conn.send({ 
        type: 'IDENTITY', 
        payload: { 
          username: state.userAccount.username,
          id: state.userAccount.id,
          characters: state.characters.filter(c => c.ownerName === state.userAccount.username || !c.ownerName)
        } 
      });

      if (state.multiplayer.isHost) {
        conn.send({ type: 'SYNC_STATE', payload: state });
      }
    });

    conn.on('data', (data: any) => {
      if (!data) return;
      switch (data.type) {
        case 'IDENTITY':
          setState(prev => {
            const existingFriend = prev.userAccount.friends.find(f => f.name === data.payload.username);
            const updatedFriend: Friend = {
              id: data.payload.id || safeId(),
              name: data.payload.username,
              active: true,
              peerId: conn.peer
            };
            const newFriends = existingFriend 
              ? prev.userAccount.friends.map(f => f.name === data.payload.username ? updatedFriend : f)
              : [...prev.userAccount.friends, updatedFriend];
            
            // Integrate remote characters into local roster
            const remoteChars = (data.payload.characters || []).map((c: Character) => ({
              ...c,
              ownerName: data.payload.username
            }));

            return {
              ...prev,
              userAccount: { ...prev.userAccount, friends: newFriends },
              characters: [...prev.characters.filter(c => c.ownerName !== data.payload.username), ...remoteChars]
            };
          });
          break;
        case 'SYNC_STATE':
          setState(prev => ({ ...data.payload, userAccount: prev.userAccount }));
          break;
        case 'ADD_CHARACTER':
          setState(prev => ({ ...prev, characters: [...prev.characters, data.payload] }));
          break;
        case 'UPDATE_CHARACTER':
          setState(prev => ({
            ...prev,
            characters: prev.characters.map(c => c.id === data.payload.id ? { ...c, ...data.payload.updates } : c),
            mentors: prev.mentors.map(m => m.id === data.payload.id ? { ...m, ...data.payload.updates } : m)
          }));
          break;
        case 'UPDATE_PARTY':
          setState(prev => ({ ...prev, party: data.payload }));
          break;
        case 'UPDATE_MAP':
          setState(prev => ({ ...prev, mapTokens: data.payload }));
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

    conn.on('close', () => {
      connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
      setState(prev => ({
        ...prev,
        multiplayer: {
          ...prev.multiplayer,
          connectedPeers: prev.multiplayer.connectedPeers.filter(p => p !== conn.peer)
        }
      }));
    });
  };

  const connectToSoul = (peerId: string) => {
    if (!peerRef.current || !peerId) return;
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
      if (mentor) {
        const newInventory = updates.inventory || mentor.inventory;
        const finalUpdates = { 
          ...updates, 
          equippedIds: newInventory.map(i => i.id) 
        };
        return { ...prev, mentors: prev.mentors.map(m => m.id === id ? { ...m, ...finalUpdates } : m) };
      }
      return prev;
    });
    broadcast('UPDATE_CHARACTER', { id, updates });
  };

  const handleLevelUp = (id: string) => {
    const allChars: Character[] = [...state.characters, ...state.mentors];
    const char = allChars.find(c => c.id === id);
    if (!char) return;

    const currentLevel = char.level || 1;
    const currentExp = char.exp || 0;
    const nextExp = currentLevel * 1000;

    if (currentExp >= nextExp) {
      const archName = char.archetype as string;
      const customArch = state.customArchetypes.find(a => a.name === archName);
      const defaultArch = ARCHETYPE_INFO[archName];
      const hpDie = (defaultArch?.hpDie || customArch?.hpDie || 8) as number;
      
      const newLevel = currentLevel + 1;
      const conValue = char.stats.con || 10;
      const hpGain = Math.floor(Math.random() * hpDie) + 1 + Math.floor((conValue - 10) / 2);
      const isASILevel = [4, 8, 12, 16, 19].includes(newLevel);
      
      let spellSlotsUpdate = {};
      const isCaster = [Archetype.Sorcerer, Archetype.Mage, Archetype.DarkKnight].includes(archName as Archetype) || 
                       (customArch?.spells && customArch.spells.length > 0) || 
                       (defaultArch?.spells && defaultArch.spells.length > 0);
      
      if (isCaster) {
        const slots = SPELL_SLOT_PROGRESSION[newLevel] || {};
        spellSlotsUpdate = { maxSpellSlots: slots, spellSlots: slots };
      }

      updateCharacter(id, {
        level: newLevel,
        exp: currentExp - nextExp,
        maxHp: char.maxHp + hpGain,
        currentHp: char.maxHp + hpGain,
        asiPoints: char.asiPoints + (isASILevel ? 2 : 0),
        ...spellSlotsUpdate
      });
    }
  };

  const addExpToParty = (amount: number) => {
    state.party.forEach(id => {
      const char = [...state.characters, ...state.mentors].find(c => c.id === id);
      if (char) {
        const currentExp = char.exp || 0;
        updateCharacter(id, { exp: currentExp + amount });
        handleLevelUp(id);
      }
    });
  };

  const addCurrencyToParty = (curr: Partial<Currency>) => {
    state.party.forEach(id => {
      const char = [...state.characters, ...state.mentors].find(c => c.id === id);
      if (char) {
        const updatedVault: Currency = {
          aurels: (char.currency.aurels || 0) + (curr.aurels || 0),
          shards: (char.currency.shards || 0) + (curr.shards || 0),
          ichor: (char.currency.ichor || 0) + (curr.ichor || 0),
        };
        updateCharacter(id, { currency: updatedVault });
      }
    });
  };

  const handleOpenShop = async (preFetch: boolean = false) => {
    const activeCampaign = state.campaigns.find(c => c.id === state.activeCampaignId);
    if (!preFetch && (activeCampaign?.activeShop || state.currentTavernShop)) return;

    setIsShopLoading(true);
    const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
    const avgLevel = partyChars.length > 0 ? partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length : 1;
    const context = activeCampaign?.prompt || "A warm, bustling tavern with an obsidian fireplace.";
    
    try {
      const shop = await generateShopInventory(context, Math.ceil(avgLevel));
      if (state.activeCampaignId) {
        setState(prev => ({
          ...prev,
          campaigns: prev.campaigns.map(c => 
            c.id === prev.activeCampaignId ? { ...c, activeShop: shop } : c
          )
        }));
      } else {
        setState(prev => ({ ...prev, currentTavernShop: shop }));
      }
    } catch (e) {
      console.error("Shop manifestation failed.");
    } finally {
      setIsShopLoading(false);
    }
  };

  const handleBuyItem = (shopItem: ShopItem, buyerId: string) => {
    const buyer = [...state.characters, ...state.mentors].find(c => c.id === buyerId);
    if (!buyer) return;

    const itemCost = shopItem.cost || { aurels: 0, shards: 0, ichor: 0 };

    // Deduct cost
    const updatedCurrency: Currency = {
      aurels: (buyer.currency.aurels || 0) - (itemCost.aurels || 0),
      shards: (buyer.currency.shards || 0) - (itemCost.shards || 0),
      ichor: (buyer.currency.ichor || 0) - (itemCost.ichor || 0),
    };

    // Strip cost for character inventory and global armory
    const { cost, ...standardItem } = shopItem;
    const newInventory = [...(buyer.inventory || []), standardItem];

    // Update character
    updateCharacter(buyerId, { 
      currency: updatedCurrency,
      inventory: newInventory 
    });

    // Populate armory if unique
    setState(prev => {
      const alreadyInArmory = prev.armory.some(i => i.name.toLowerCase() === standardItem.name.toLowerCase());
      if (!alreadyInArmory) {
        return { ...prev, armory: [...prev.armory, standardItem] };
      }
      return prev;
    });
  };

  const handleAIRuntimeSlotUsage = (level: number, characterName: string) => {
    const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
    const target = partyChars.find(c => c.name.toLowerCase() === characterName.toLowerCase());
    
    if (target && target.spellSlots && target.spellSlots[level] > 0) {
      const newSlots = { ...target.spellSlots, [level]: (target.spellSlots[level] || 1) - 1 };
      updateCharacter(target.id, { spellSlots: newSlots });
      return true;
    }
    return false;
  };

  const handleShortRest = () => {
    state.party.forEach(id => {
      const char = state.characters.find(c => c.id === id) || state.mentors.find(m => m.id === id);
      if (char) {
        const missingHp = char.maxHp - char.currentHp;
        const restoredHp = Math.ceil(missingHp / 2);
        
        let restoredSlots: Record<number, number> = char.spellSlots ? { ...char.spellSlots } : {};
        if (char.maxSpellSlots) {
          Object.entries(char.maxSpellSlots).forEach(([lvl, maxVal]) => {
            const level = parseInt(lvl);
            const max = maxVal as number;
            const current = (char.spellSlots?.[level] || 0) as number;
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
      const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      const avgLevel = partyChars.length > 0 ? partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length : 1;
      const context = "The party finds a treasure.";
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
        const newInventory = [...recipient.inventory, item];
        const isMentor = recipient.id.startsWith('mentor-');
        updateCharacter(recipientId, { 
          inventory: newInventory,
          equippedIds: isMentor ? newInventory.map(i => i.id) : recipient.equippedIds
        });
      }
    }
  };

  const handleAwardMonster = async (name: string) => {
    let monster = state.bestiary.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (!monster) {
      const partyChars = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      const avgLevel = partyChars.length > 0 ? partyChars.reduce((acc, c) => acc + c.level, 0) / partyChars.length : 1;
      const context = "A new threat emerges.";
      const generated = await generateMonsterDetails(name, context, Math.ceil(avgLevel));
      const newMonster: Monster = {
        id: safeId(),
        name,
        type: (generated.type as any) || 'Humanoid',
        hp: generated.hp || 20,
        ac: generated.ac || 10,
        expReward: generated.expReward || 100,
        description: generated.description || 'A mysterious horror.',
        abilities: generated.abilities || []
      };
      setState(prev => ({ ...prev, bestiary: [...prev.bestiary, newMonster] }));
      return newMonster;
    }
    return monster;
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
      participants: state.party,
      isCombatActive: false
    };
    setState(prev => ({ ...prev, campaigns: [...prev.campaigns, newCampaign], activeCampaignId: newCampaign.id }));
    setActiveTab('Chronicles');
  };

  const handleUpdateMap = (tokens: MapToken[]) => {
    setState(prev => ({ ...prev, mapTokens: tokens }));
    broadcast('UPDATE_MAP', tokens);
  };

  const activeCampaign = useMemo(() => state.campaigns.find(c => c.id === state.activeCampaignId) || null, [state.campaigns, state.activeCampaignId]);
  
  const showTacticsTab = activeCampaign?.isCombatActive || false;

  const handleSetCombatActive = (active: boolean) => {
    if (!state.activeCampaignId) return;
    setState(prev => ({
      ...prev,
      campaigns: prev.campaigns.map(c => 
        c.id === prev.activeCampaignId ? { ...c, isCombatActive: active } : c
      )
    }));
  };

  const handleAddCharacter = (c: Character) => {
    setState(p => {
      const isFirstChar = p.characters.length === 0;
      const newChar = { ...c, isPrimarySoul: isFirstChar, ownerName: p.userAccount.username };
      
      const updatedCharacters = [...p.characters, newChar];
      const updatedParty = isFirstChar ? [...p.party, newChar.id] : p.party;

      return {
        ...p,
        characters: updatedCharacters,
        party: updatedParty
      };
    });
    broadcast('ADD_CHARACTER', { ...c, ownerName: state.userAccount.username });
    if (state.characters.length === 0) {
      broadcast('UPDATE_PARTY', [...state.party, c.id]);
    }
  };

  const handleToggleParty = (id: string) => {
    setState(prev => {
      const newParty = prev.party.includes(id) 
        ? prev.party.filter(p => p !== id) 
        : [...prev.party, id];
      
      broadcast('UPDATE_PARTY', newParty);
      return { ...prev, party: newParty };
    });
  };

  if (!state.userAccount.isLoggedIn) {
    return <AccountPortal onLogin={handleLogin} onMigrate={handleMigrateSoul} />;
  }

  const currentShop = activeCampaign?.activeShop || state.currentTavernShop;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0c0a09] text-[#d6d3d1] selection:bg-red-900 overflow-hidden md:flex-row">
      <header className="z-[90] flex items-center justify-between border-b border-red-900/40 bg-[#0c0a09] px-4 py-3 md:hidden">
        <h1 className="font-cinzel text-lg font-bold text-[#a16207]">Mythos Engine</h1>
        <div 
          onClick={() => setActiveTab('Nexus')}
          className={`flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-[8px] font-bold transition-all ${
            state.multiplayer.connectedPeers.length > 0 ? 'border border-green-500/30 bg-green-900/20 text-green-500' : 'border border-red-900/30 bg-red-900/20 text-red-500'
          }`}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${state.multiplayer.connectedPeers.length > 0 ? 'animate-pulse bg-green-500' : 'bg-red-500'}`} />
          {state.multiplayer.connectedPeers.length > 0 ? 'SOULS BONDED' : 'ALONE'}
        </div>
      </header>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userAccount={state.userAccount} 
        multiplayer={state.multiplayer}
        showTactics={showTacticsTab}
      />
      
      <main className="relative flex-1 overflow-y-auto bg-leather">
        <div className="mx-auto min-h-full max-w-7xl p-4 pb-20 md:p-8 md:pb-8">
          {currentShop && (
            <ShopModal 
              shop={currentShop}
              characters={[...state.characters, ...state.mentors].filter(c => state.party.includes(c.id))}
              onClose={() => {
                if (activeCampaign) {
                  setState(prev => ({
                    ...prev,
                    campaigns: prev.campaigns.map(c => c.id === prev.activeCampaignId ? { ...c, activeShop: null } : c)
                  }));
                } else {
                  setState(prev => ({ ...prev, currentTavernShop: null }));
                }
              }}
              onBuy={handleBuyItem}
            />
          )}

          {activeTab === 'Tavern' && (
            <TavernScreen 
              party={[...state.characters, ...state.mentors].filter(c => state.party.includes(c.id))}
              onLongRest={handleLongRest}
              onOpenShop={() => handleOpenShop(false)}
              isHost={state.multiplayer.isHost}
              isShopLoading={isShopLoading}
            />
          )}

          {activeTab === 'Fellowship' && (
            <FellowshipScreen 
              characters={state.characters} 
              onAdd={handleAddCharacter} 
              onDelete={(id) => setState(p => ({...p, characters: p.characters.filter(c => c.id !== id)}))}
              onUpdate={updateCharacter}
              mentors={state.mentors}
              onUpdateMentor={updateCharacter}
              party={state.party}
              setParty={(party) => { setState(p => ({...p, party})); broadcast('UPDATE_PARTY', party); }}
              customArchetypes={state.customArchetypes}
              onAddCustomArchetype={handleAddCustomArchetype}
              username={state.userAccount.username}
            />
          )}
          {activeTab === 'Chronicles' && (
            <DMWindow 
              campaign={activeCampaign} 
              allCampaigns={state.campaigns}
              characters={[...state.characters, ...state.mentors].filter(c => state.party.includes(c.id))}
              bestiary={state.bestiary}
              mapTokens={state.mapTokens}
              onUpdateMap={handleUpdateMap}
              onMessage={(msg) => {
                if (!activeCampaign) return;
                setState(prev => ({ ...prev, campaigns: prev.campaigns.map(c => c.id === activeCampaign.id ? { ...c, history: [...c.history, msg] } : c) }));
                broadcast('NEW_MESSAGE', msg);
              }}
              onCreateCampaign={createCampaign}
              onSelectCampaign={(id) => setState(p => ({ ...p, activeCampaignId: id }))}
              onQuitCampaign={() => setState(p => ({ ...p, activeCampaignId: null }))}
              onAwardExp={addExpToParty}
              onAwardCurrency={addCurrencyToParty}
              onAwardItem={handleAwardItem}
              onAwardMonster={handleAwardMonster}
              onShortRest={handleShortRest}
              onLongRest={handleLongRest}
              onAIRuntimeUseSlot={handleAIRuntimeSlotUsage}
              onOpenShop={() => handleOpenShop(false)}
              onSetCombatActive={handleSetCombatActive}
              isHost={state.multiplayer.isHost}
              username={state.userAccount.username}
            />
          )}
          {activeTab === 'Tactics' && (
            <TacticalMap 
              tokens={state.mapTokens} 
              onUpdateTokens={handleUpdateMap} 
            />
          )}
          {activeTab === 'Nexus' && (
            <NexusScreen 
              peerId={state.userAccount.peerId || ''}
              connectedPeers={state.multiplayer.connectedPeers}
              isHost={state.multiplayer.isHost}
              onConnect={connectToSoul}
              username={state.userAccount.username}
              gameState={state}
              onClearFriends={() => setState(p => ({ ...p, userAccount: { ...p.userAccount, friends: [] } }))}
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
              <h2 className="font-cinzel text-3xl md:text-4xl text-[#a16207] border-b border-red-900 pb-2">Ancient Laws</h2>
              <div className="rune-border p-4 md:p-6 bg-[#0c0a09]/80 backdrop-blur whitespace-pre-wrap leading-loose text-xs md:text-sm">
                {RULES_MANIFEST}
              </div>
            </div>
          )}
          {activeTab === 'Tutorial' && (
            <TutorialScreen 
              characters={state.characters}
              onComplete={(partyIds, title, prompt) => {
                setState(p => ({...p, party: partyIds}));
                createCampaign(title, prompt);
              }} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
