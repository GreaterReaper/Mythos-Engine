import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Character, Race, Archetype, GameState, Message, Campaign, 
  Item, Monster, Stats, Friend, ArchetypeInfo, Ability, Currency, Shop, StatusEffect, MapToken
} from './types';
import { 
  MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, RULES_MANIFEST, ARCHETYPE_INFO, SPELL_SLOT_PROGRESSION, STORAGE_PREFIX, MENTOR_UNIQUE_GEAR, TUTORIAL_SCENARIO
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
import QuotaBanner from './components/QuotaBanner';
import { generateItemDetails, generateMonsterDetails, generateShopInventory, safeId, hydrateState, generateRumors, parseDMCommand, parseSoulSignature } from './geminiService';

declare var Peer: any;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Fellowship');
  const [isShopLoading, setIsShopLoading] = useState(false);
  const [isRumorLoading, setIsRumorLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<any[]>([]);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const isCurrentlyKeyboard = window.visualViewport.height < window.innerHeight * 0.85;
        setIsKeyboardOpen(isCurrentlyKeyboard);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

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
    apiUsage: { count: 0, lastReset: Date.now() },
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
    const handleApiCall = () => {
      setState(prev => {
        const now = Date.now();
        const usage = prev.apiUsage || { count: 0, lastReset: now };
        const lastDate = new Date(usage.lastReset).getUTCDate();
        const currentDate = new Date(now).getUTCDate();
        const updatedUsage = lastDate !== currentDate ? { count: 1, lastReset: now } : { ...usage, count: usage.count + 1 };
        return { ...prev, apiUsage: updatedUsage };
      });
    };
    window.addEventListener('mythos_api_call', handleApiCall);
    return () => window.removeEventListener('mythos_api_call', handleApiCall);
  }, []);

  useEffect(() => {
    if (state.userAccount.isLoggedIn) {
      localStorage.setItem(`${STORAGE_PREFIX}${state.userAccount.username}`, JSON.stringify(state));
    }
  }, [state]);

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.map(c => c.id === id ? { ...c, ...updates } : c),
      mentors: prev.mentors.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  };

  const handleMessage = (msg: Message) => {
    setState(prev => {
      if (!prev.activeCampaignId) return prev;
      let newState = { ...prev };

      newState.campaigns = prev.campaigns.map(c => 
        c.id === prev.activeCampaignId ? { ...c, history: [...c.history, msg] } : c
      );

      if (msg.role === 'model') {
        const commands = parseDMCommand(msg.content);

        if (commands.usedSlot) {
          const { level, characterName } = commands.usedSlot;
          const applySlotUsage = (c: Character) => {
            if (c.name.toLowerCase() === characterName.toLowerCase() && c.spellSlots) {
              const newSlots = { ...c.spellSlots };
              if (newSlots[level] > 0) newSlots[level]--;
              return { ...c, spellSlots: newSlots };
            }
            return c;
          };
          newState.characters = newState.characters.map(applySlotUsage);
          newState.mentors = newState.mentors.map(applySlotUsage);
        }

        if (commands.shortRest || commands.longRest) {
          const applyRest = (c: Character) => {
            if (!newState.party.includes(c.id)) return c;
            const updates: Partial<Character> = { currentHp: c.maxHp };
            if (commands.longRest) {
              if (c.maxSpellSlots) updates.spellSlots = { ...c.maxSpellSlots };
              updates.deathSaves = { successes: 0, failures: 0 };
            } else if (commands.shortRest && c.maxSpellSlots && c.spellSlots) {
              const newSlots = { ...c.spellSlots };
              Object.keys(c.maxSpellSlots).forEach(lvlStr => {
                const lvl = parseInt(lvlStr);
                const max = c.maxSpellSlots![lvl];
                newSlots[lvl] = Math.min(max, newSlots[lvl] + Math.ceil(max / 2));
              });
              updates.spellSlots = newSlots;
            }
            return { ...c, ...updates };
          };
          newState.characters = newState.characters.map(applyRest);
          newState.mentors = newState.mentors.map(applyRest);
        }

        commands.setHp.forEach(sync => {
          const applySet = (c: Character) => c.name.toLowerCase() === sync.targetName.toLowerCase() ? { ...c, currentHp: sync.amount } : c;
          newState.characters = newState.characters.map(applySet);
          newState.mentors = newState.mentors.map(applySet);
        });

        commands.takeDamage.forEach(dmg => {
          const applyDmg = (c: Character) => {
            if (c.name.toLowerCase() === dmg.targetName.toLowerCase()) {
              const nextHp = Math.max(0, c.currentHp - dmg.amount);
              const updates: Partial<Character> = { currentHp: nextHp };
              if (nextHp === 0 && (!c.deathSaves || (c.deathSaves.successes === 0 && c.deathSaves.failures === 0))) {
                updates.deathSaves = { successes: 0, failures: 0 };
              }
              return { ...c, ...updates };
            }
            return c;
          };
          newState.characters = newState.characters.map(applyDmg);
          newState.mentors = newState.mentors.map(applyDmg);
        });

        commands.heals.forEach(h => {
          const applyHeal = (c: Character) => {
            if (c.name.toLowerCase() === h.targetName.toLowerCase()) {
               const nextHp = Math.min(c.maxHp, c.currentHp + h.amount);
               const updates: Partial<Character> = { currentHp: nextHp };
               if (nextHp > 0) updates.deathSaves = { successes: 0, failures: 0 };
               return { ...c, ...updates };
            }
            return c;
          };
          newState.characters = newState.characters.map(applyHeal);
          newState.mentors = newState.mentors.map(applyHeal);
        });

        commands.currencyRewards.forEach(reward => {
          if (reward.target.toLowerCase() === 'party') {
            const activeVesselsCount = newState.party.length || 1;
            const perPerson = Math.floor(reward.amount / activeVesselsCount);
            newState.characters = newState.characters.map(c => newState.party.includes(c.id) ? { ...c, currency: { aurels: c.currency.aurels + perPerson } } : c);
            newState.mentors = newState.mentors.map(c => newState.party.includes(c.id) ? { ...c, currency: { aurels: c.currency.aurels + perPerson } } : c);
          } else {
            const applyTargetReward = (c: Character) => c.name.toLowerCase() === reward.target.toLowerCase() ? { ...c, currency: { aurels: c.currency.aurels + reward.amount } } : c;
            newState.characters = newState.characters.map(applyTargetReward);
            newState.mentors = newState.mentors.map(applyTargetReward);
          }
        });

        if (commands.exp > 0) {
          const activeVesselsCount = newState.party.length || 1;
          const perPerson = Math.floor(commands.exp / activeVesselsCount);
          const applyExp = (c: Character) => {
            if (!newState.party.includes(c.id)) return c;
            let newExp = c.exp + perPerson;
            let newLevel = c.level;
            let newMaxHp = c.maxHp;
            let newCurrentHp = c.currentHp;
            while (newExp >= newLevel * 1000) {
              newExp -= newLevel * 1000;
              newLevel++;
              newMaxHp += 5;
              newCurrentHp = newMaxHp;
            }
            return { ...c, exp: newExp, level: newLevel, maxHp: newMaxHp, currentHp: newCurrentHp };
          };
          newState.characters = newState.characters.map(applyExp);
          newState.mentors = newState.mentors.map(applyExp);
        }
      }

      return newState;
    });
  };

  const handleOpenShop = async () => {
    setIsShopLoading(true);
    try {
      const avg = state.party.length > 0 ? 5 : 1; 
      const shop = await generateShopInventory("Encounter", avg);
      setState(prev => ({ ...prev, currentTavernShop: shop }));
    } finally { setIsShopLoading(false); }
  };

  const handleFetchRumors = async () => {
    setIsRumorLoading(true);
    try {
      const rumors = await generateRumors(5);
      setState(prev => ({ ...prev, activeRumors: rumors }));
    } finally { setIsRumorLoading(false); }
  };

  const handleTutorialComplete = (partyIds: string[], campaignTitle: string, campaignPrompt: string) => {
    const newCampaign: Campaign = { 
      id: safeId(), 
      title: campaignTitle, 
      prompt: campaignPrompt, 
      history: [{ role: 'model', content: campaignPrompt, timestamp: Date.now() }], 
      participants: partyIds 
    };

    setState(prev => ({ 
      ...prev, 
      campaigns: [...prev.campaigns, newCampaign], 
      activeCampaignId: newCampaign.id,
      party: partyIds,
      userAccount: {
        ...prev.userAccount,
        activeCharacterId: partyIds.find(id => prev.characters.some(c => c.id === id)) || partyIds[0]
      }
    }));
    
    setShowTutorial(false);
    setActiveTab('Chronicles');
  };

  const activePartyObjects = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
  const currentShop = (state.campaigns.find(c => c.id === state.activeCampaignId)?.activeShop) || state.currentTavernShop;

  // Chronicles mode needs a lock-height layout to keep sidebar visible
  const isChronicles = activeTab === 'Chronicles';

  return (
    <div className="flex flex-col h-[var(--visual-height)] w-full bg-[#0c0a09] text-[#d6d3d1] overflow-hidden md:flex-row relative">
      <div className="flex flex-col w-full min-h-0">
        <QuotaBanner usage={state.apiUsage} />
        <div className="flex flex-col flex-1 min-h-0 md:flex-row overflow-hidden">
          {!state.userAccount.isLoggedIn && (
            <AccountPortal onLogin={u => setState(p => ({ ...p, userAccount: { ...p.userAccount, username: u, isLoggedIn: true } }))} onMigrate={() => false} />
          )}
          
          {showTutorial && (
            <TutorialScreen characters={state.characters} onComplete={handleTutorialComplete} />
          )}

          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userAccount={state.userAccount} multiplayer={state.multiplayer} />
          
          <main className={`relative flex-1 bg-leather ${isChronicles ? 'overflow-hidden h-full' : 'overflow-y-auto'}`}>
            <div className={`mx-auto ${isChronicles ? 'h-full max-w-none p-0' : 'max-w-7xl p-4 md:p-8'}`}>
              {currentShop && <ShopModal shop={currentShop} characters={activePartyObjects} onClose={() => setState(p => ({ ...p, currentTavernShop: null }))} onBuy={(item, buyerId) => {
                const buyer = activePartyObjects.find(c => c.id === buyerId);
                if (!buyer || buyer.currency.aurels < item.cost.aurels) return;
                updateCharacter(buyerId, { 
                  currency: { aurels: buyer.currency.aurels - item.cost.aurels }, 
                  inventory: [...buyer.inventory, item] 
                });
              }} />}
              
              {activeTab === 'Tavern' && <TavernScreen party={activePartyObjects} mentors={state.mentors} partyIds={state.party} onToggleParty={id => setState(p => ({ ...p, party: p.party.includes(id) ? p.party.filter(x => x !== id) : [...p.party, id] }))} onLongRest={() => {}} onOpenShop={handleOpenShop} onUpgradeItem={(cid, iid, cost) => {
                const char = activePartyObjects.find(c => c.id === cid);
                if (!char || char.currency.aurels < cost.aurels) return;
                const item = char.inventory.find(i => i.id === iid);
                if (!item) return;
                const newName = `${item.name.split(' +')[0]} +${parseInt(item.name.match(/\+(\d+)/)?.[1] || '0') + 1}`;
                updateCharacter(cid, { inventory: char.inventory.map(i => i.id === iid ? { ...i, name: newName } : i), currency: { aurels: char.currency.aurels - cost.aurels } });
              }} onBuyItem={(item, bid, cost) => {
                const b = activePartyObjects.find(c => c.id === bid);
                if (b && b.currency.aurels >= cost.aurels) updateCharacter(bid, { currency: { aurels: b.currency.aurels - cost.aurels }, inventory: [...b.inventory, item] });
              }} isHost={true} activeRumors={state.activeRumors} onFetchRumors={handleFetchRumors} isRumorLoading={isRumorLoading} />}
              
              {activeTab === 'Fellowship' && <FellowshipScreen 
                characters={state.characters} 
                onAdd={c => setState(p => ({ ...p, characters: [...p.characters, c] }))} 
                onDelete={id => setState(p => ({ ...p, characters: p.characters.filter(c => c.id !== id) }))} 
                onUpdate={updateCharacter} 
                mentors={state.mentors} 
                party={state.party} 
                setParty={p => setState(s => ({ ...s, party: p }))} 
                customArchetypes={state.customArchetypes} 
                onAddCustomArchetype={a => setState(p => ({ ...p, customArchetypes: [...p.customArchetypes, a] }))} 
                username={state.userAccount.username}
                onStartTutorial={() => setShowTutorial(true)}
                hasCampaigns={state.campaigns.length > 0}
              />}
              
              {activeTab === 'Chronicles' && <DMWindow 
                campaign={state.campaigns.find(c => c.id === state.activeCampaignId) || null} 
                allCampaigns={state.campaigns} 
                characters={activePartyObjects} 
                bestiary={state.bestiary} 
                activeCharacter={activePartyObjects.find(c => c.id === state.userAccount.activeCharacterId) || null} 
                onSelectActiveCharacter={id => setState(p => ({ ...p, userAccount: { ...p.userAccount, activeCharacterId: id } }))} 
                onMessage={handleMessage} 
                onCreateCampaign={(t, p) => {
                  const newCampaign: Campaign = { 
                    id: safeId(), 
                    title: t, 
                    prompt: p, 
                    history: [{ role: 'model', content: p, timestamp: Date.now() }], 
                    participants: state.party 
                  };
                  setState(prev => ({ ...prev, campaigns: [...prev.campaigns, newCampaign], activeCampaignId: newCampaign.id }));
                }} 
                onSelectCampaign={id => setState(p => ({ ...p, activeCampaignId: id }))} 
                onDeleteCampaign={id => setState(p => ({ ...p, campaigns: p.campaigns.filter(c => c.id !== id) }))} 
                onQuitCampaign={() => setState(p => ({ ...p, activeCampaignId: null }))} 
                onShortRest={() => {}} 
                isHost={true} 
                isKeyboardOpen={isKeyboardOpen}
              />}
              
              {activeTab === 'Tactics' && <TacticalMap tokens={state.mapTokens} onUpdateTokens={t => setState(p => ({ ...p, mapTokens: t }))} characters={state.characters} monsters={state.bestiary} />}
              {activeTab === 'Archetypes' && <ArchetypesScreen customArchetypes={state.customArchetypes} onShare={() => {}} userId={state.userAccount.id} />}
              {activeTab === 'Bestiary' && <BestiaryScreen monsters={state.bestiary} onUpdateMonster={(id, updates) => setState(prev => ({ ...prev, bestiary: prev.bestiary.map(m => m.id === id ? { ...m, ...updates } : m) }))} />}
              {activeTab === 'Armory' && <ArmoryScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onShare={() => {}} userId={state.userAccount.id} />}
              {activeTab === 'Alchemy' && <AlchemyScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onShare={() => {}} userId={state.userAccount.id} party={activePartyObjects} />}
              {activeTab === 'Spells' && <SpellsScreen playerCharacters={state.characters} customArchetypes={state.customArchetypes} mentors={state.mentors} />}
              {activeTab === 'Rules' && <RulesScreen />}
              {activeTab === 'Nexus' && <NexusScreen peerId="" connectedPeers={[]} isHost={true} onConnect={() => {}} username={state.userAccount.username} gameState={state} onClearFriends={() => {}} onDeleteAccount={() => {}} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
export default App;