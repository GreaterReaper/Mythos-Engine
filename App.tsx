
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Character, Race, Archetype, GameState, Message, Campaign, 
  Item, Monster, Stats, Friend, ArchetypeInfo, Ability, Currency, Shop, StatusEffect, MapToken
} from './types';
import { 
  MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, RULES_MANIFEST, ARCHETYPE_INFO, STORAGE_PREFIX, TUTORIAL_SCENARIO
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
import TavernScreen from './components/TavernScreen';
import QuotaBanner from './components/QuotaBanner';
import { generateItemDetails, generateMonsterDetails, safeId, hydrateState, parseSoulSignature, auditNarrativeEffect } from './geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Fellowship');
  const [showTutorial, setShowTutorial] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
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
    if (state.characters.length === 0) return;
    const avgLevel = Math.floor(state.characters.reduce((acc, c) => acc + c.level, 0) / state.characters.length);
    if (avgLevel > 5) {
      setState(prev => ({
        ...prev,
        mentors: prev.mentors.map(m => {
          if (m.level < avgLevel) {
            const archInfo = ARCHETYPE_INFO[m.archetype as Archetype];
            const levelDiff = avgLevel - m.level;
            const hpGain = levelDiff * (Math.floor((archInfo?.hpDie || 10) / 2) + 1);
            return {
              ...m,
              level: avgLevel,
              maxHp: m.maxHp + hpGain,
              currentHp: m.maxHp + hpGain,
              maxMana: m.maxMana + (levelDiff * 10),
              currentMana: m.maxMana + (levelDiff * 10),
              abilities: archInfo?.coreAbilities.filter(a => a.levelReq <= avgLevel) || [],
              spells: archInfo?.spells?.filter(s => s.levelReq <= avgLevel) || []
            };
          }
          return m;
        })
      }));
    }
  }, [state.characters]);

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_PREFIX + 'state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState(prev => {
          const hydrated = hydrateState(parsed, DEFAULT_STATE);
          const existingIds = new Set(hydrated.mentors.map(m => m.id));
          const missingMentors = MENTORS.filter(m => !existingIds.has(m.id));
          if (missingMentors.length > 0) {
            hydrated.mentors = [...hydrated.mentors, ...missingMentors];
          }
          return hydrated;
        });
      } catch (e) {
        console.error("Failed to rebind soul.", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const handleApiCall = () => {
      setState(prev => {
        const usage = prev.apiUsage || { count: 0, lastReset: Date.now() };
        return { ...prev, apiUsage: { ...usage, count: usage.count + 1 } };
      });
    };
    window.addEventListener('mythos_api_call', handleApiCall);
    return () => window.removeEventListener('mythos_api_call', handleApiCall);
  }, []);

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.map(c => c.id === id ? { ...c, ...updates } : c),
      mentors: prev.mentors.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  };

  const handleRefreshCharacters = () => {
    const getFallbackAc = (archetype: string, itemName: string): number => {
      const name = itemName.toLowerCase();
      if (name.includes('plate') || name.includes('heavy')) return 16;
      if (name.includes('leather') || name.includes('jerkin')) return 12;
      if (name.includes('robe') || name.includes('silk')) return 10;
      if (name.includes('shield')) return 2;
      return 10;
    };

    setState(prev => {
      const syncList = (list: Character[]) => list.map(c => {
        const archInfo = ARCHETYPE_INFO[c.archetype as Archetype] || prev.customArchetypes.find(a => a.name === c.archetype);
        if (!archInfo) return c;
        const classAbilityNames = new Set([...archInfo.coreAbilities, ...(archInfo.spells || [])].map(a => a.name));
        const updatedInventory = c.inventory.map(item => {
          if (item.type === 'Armor' && (!item.stats || !item.stats.ac)) {
            return { ...item, stats: { ...(item.stats || {}), ac: getFallbackAc(c.archetype as string, item.name) } };
          }
          return item;
        });
        return {
          ...c,
          inventory: updatedInventory,
          abilities: [...archInfo.coreAbilities.filter(a => a.levelReq <= c.level), ...c.abilities.filter(a => a.levelReq === 0)],
          spells: [...(archInfo.spells || []).filter(s => s.levelReq <= c.level), ...c.spells.filter(a => a.levelReq === 0)]
        };
      });
      return { ...prev, characters: syncList(prev.characters), mentors: syncList(prev.mentors) };
    });
    alert("Souls realigned and equipment repaired.");
  };

  const handleTutorialComplete = (partyIds: string[], title: string, prompt: string) => {
    const campId = safeId();
    setState(prev => {
      const newCampaign: Campaign = { id: campId, title, prompt, history: [], participants: partyIds, isRaid: false };
      return { ...prev, campaigns: [...prev.campaigns, newCampaign], activeCampaignId: campId, party: partyIds };
    });
    setShowTutorial(false);
    setActiveTab('Chronicles');
    handleMessage({ role: 'model', content: prompt, timestamp: Date.now() }, campId);
  };

  const handleMessage = async (msg: Message, campaignId?: string, overrideParty?: Character[]) => {
    const targetCampaignId = campaignId || state.activeCampaignId;
    if (!targetCampaignId) return;

    setState(prev => ({
      ...prev,
      campaigns: prev.campaigns.map(c => c.id === targetCampaignId ? { ...c, history: [...c.history, msg] } : c)
    }));

    if (msg.role === 'model') {
      const activePartyObjects = overrideParty || [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      setTimeout(async () => {
        try {
          const audit = await auditNarrativeEffect(msg.content, activePartyObjects);
          const logs: Message[] = [];
          
          if (audit.newEntities && audit.newEntities.length > 0) {
            for (const entity of audit.newEntities) {
              if (entity.category === 'monster') {
                const details = await generateMonsterDetails(entity.name, `Forged by Arbiter command in ${targetCampaignId}.`);
                const newMonster: Monster = {
                  id: safeId(),
                  name: details.name || entity.name,
                  type: details.type || 'Hybrid',
                  hp: details.hp || 50,
                  ac: details.ac || 15,
                  stats: details.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                  cr: details.cr || entity.cr || 1,
                  abilities: details.abilities || [],
                  activeStatuses: [],
                  description: details.description || "A horrific manifestation."
                };
                setState(prev => ({ ...prev, bestiary: [newMonster, ...prev.bestiary] }));
                logs.push({ role: 'system', content: `ARCHITECT: ${newMonster.name} manifest from the void.`, timestamp: Date.now() });
              } else if (entity.category === 'item') {
                const details = await generateItemDetails(entity.name, `Found during exploration in ${targetCampaignId}.`);
                const newItem: Item = {
                  id: safeId(),
                  name: details.name || entity.name,
                  description: details.description || "A discovered relic.",
                  type: details.type || 'Utility',
                  rarity: details.rarity || 'Uncommon',
                  stats: details.stats || {}
                };
                setState(prev => ({ ...prev, armory: [newItem, ...prev.armory] }));
                logs.push({ role: 'system', content: `ARCHITECT: ${newItem.name} discovery manifest in Armory.`, timestamp: Date.now() });
              }
            }
          }

          setState(prev => {
            let newCharacters = [...prev.characters];
            let newMentors = [...prev.mentors];

            if (audit.changes && audit.changes.length > 0) {
              audit.changes.forEach((change: any) => {
                const charIdx = newCharacters.findIndex(c => c.name.toLowerCase().includes(change.target.toLowerCase()));
                const mentorIdx = newMentors.findIndex(c => c.name.toLowerCase().includes(change.target.toLowerCase()));
                let target = charIdx !== -1 ? newCharacters[charIdx] : mentorIdx !== -1 ? newMentors[mentorIdx] : null;
                if (!target) return;
                
                const updates: Partial<Character> = {};
                if (change.type === 'damage') updates.currentHp = Math.max(0, target.currentHp - change.value);
                if (change.type === 'heal') updates.currentHp = Math.min(target.maxHp, target.currentHp + change.value);
                if (change.type === 'mana') updates.currentMana = Math.max(0, target.currentMana - change.value);
                if (change.type === 'exp') {
                  const gained = change.value;
                  const newTotalExp = target.exp + gained;
                  const expToLevel = target.level * 1000;
                  if (newTotalExp >= expToLevel && target.level < 20) {
                    updates.level = target.level + 1;
                    updates.exp = newTotalExp - expToLevel;
                    // Class appropriate HP gain
                    const archInfo = ARCHETYPE_INFO[target.archetype as Archetype];
                    if (archInfo) {
                       const hpGain = Math.floor(archInfo.hpDie / 2) + 1;
                       updates.maxHp = target.maxHp + hpGain;
                       updates.currentHp = updates.maxHp;
                       updates.maxMana = target.maxMana + 10;
                       updates.currentMana = updates.maxMana;
                    }
                    logs.push({ role: 'system', content: `SCRIBE: ${target.name} ascended to Level ${updates.level}! Resonance restores their Vitality.`, timestamp: Date.now() });
                  } else {
                    updates.exp = newTotalExp;
                  }
                }
                
                if (charIdx !== -1) newCharacters[charIdx] = { ...target, ...updates };
                else if (mentorIdx !== -1) newMentors[mentorIdx] = { ...target, ...updates };
              });
            }
            return {
              ...prev,
              characters: newCharacters,
              mentors: newMentors,
              campaigns: prev.campaigns.map(c => c.id === targetCampaignId ? { ...c, history: [...c.history, ...logs] } : c)
            };
          });
        } catch (e) { console.error("Audit Fail", e); }
      }, 300);
    }
  };

  const activePartyUnits = useMemo(() => {
    return [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
  }, [state.characters, state.mentors, state.party]);

  return (
    <div className="flex flex-col h-[var(--visual-height)] w-full bg-[#0c0a09] text-[#d6d3d1] overflow-hidden md:flex-row relative">
      <div className="flex flex-col w-full min-h-0">
        <QuotaBanner usage={state.apiUsage} />
        <div className="flex flex-col flex-1 min-h-0 md:flex-row overflow-hidden">
          {!state.userAccount.isLoggedIn && (
            <AccountPortal onLogin={u => setState(p => ({ ...p, userAccount: { ...p.userAccount, username: u, isLoggedIn: true } }))} onMigrate={sig => {
              const migrated = parseSoulSignature(sig, DEFAULT_STATE);
              if (migrated) {
                const fullState = hydrateState(migrated, DEFAULT_STATE);
                fullState.userAccount.isLoggedIn = true;
                setState(fullState);
                return true;
              }
              return false;
            }} />
          )}
          {showTutorial && <TutorialScreen characters={state.characters} mentors={state.mentors} onComplete={handleTutorialComplete} />}
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userAccount={state.userAccount} multiplayer={state.multiplayer} />
          <main className={`relative flex-1 bg-leather ${activeTab === 'Chronicles' ? 'overflow-hidden h-full' : 'overflow-y-auto'}`}>
            <div className={`mx-auto ${activeTab === 'Chronicles' ? 'h-full max-w-none p-0' : 'max-w-7xl p-4 md:p-8'}`}>
              {activeTab === 'Chronicles' && <DMWindow 
                campaign={state.campaigns.find(c => c.id === state.activeCampaignId) || null} 
                allCampaigns={state.campaigns} characters={activePartyUnits} bestiary={state.bestiary} 
                activeCharacter={[...state.characters, ...state.mentors].find(c => c.id === state.userAccount.activeCharacterId) || null} 
                onSelectActiveCharacter={id => setState(p => ({ ...p, userAccount: { ...p.userAccount, activeCharacterId: id } }))} 
                onMessage={handleMessage} 
                onCreateCampaign={(t, p, isRaid) => {
                  const campId = safeId();
                  const newCampaign: Campaign = { id: campId, title: t, prompt: p, history: [], participants: state.party, isRaid: !!isRaid };
                  setState(prev => ({ ...prev, campaigns: [...prev.campaigns, newCampaign], activeCampaignId: campId }));
                  handleMessage({ role: 'model', content: p, timestamp: Date.now() }, campId);
                }} 
                onSelectCampaign={id => setState(p => ({ ...p, activeCampaignId: id }))} 
                onDeleteCampaign={id => setState(p => ({ ...p, campaigns: p.campaigns.filter(c => c.id !== id) }))} 
                onQuitCampaign={() => setState(p => ({ ...p, activeCampaignId: null }))} 
                onShortRest={() => {}} isHost={true} isKeyboardOpen={isKeyboardOpen}
                apiUsage={state.apiUsage}
              />}
              {activeTab === 'Fellowship' && <FellowshipScreen 
                characters={state.characters} 
                onAdd={(c, items) => setState(p => ({ ...p, characters: [...p.characters, { ...c, isPrimarySoul: p.characters.length === 0 }], armory: [...p.armory, ...items] }))} 
                onDelete={id => setState(p => ({ ...p, characters: p.characters.filter(c => c.id !== id) }))} 
                onUpdate={updateCharacter} mentors={state.mentors} party={state.party} setParty={p => setState(s => ({ ...s, party: p }))} 
                customArchetypes={state.customArchetypes} onAddCustomArchetype={a => setState(p => ({ ...p, customArchetypes: [...p.customArchetypes, a] }))} 
                username={state.userAccount.username} onStartTutorial={() => setShowTutorial(true)} hasCampaigns={state.campaigns.length > 0} 
                onRefreshCharacters={handleRefreshCharacters}
              />}
              {activeTab === 'Tavern' && <TavernScreen 
                party={activePartyUnits} mentors={state.mentors} partyIds={state.party} 
                onToggleParty={id => setState(p => ({ ...p, party: p.party.includes(id) ? p.party.filter(x => x !== id) : [...p.party, id] }))} 
                onLongRest={() => {}} isHost={true} activeRumors={state.activeRumors} onFetchRumors={() => {}} isRumorLoading={false} 
                isBetweenCampaigns={!state.activeCampaignId}
              />}
              {activeTab === 'Bestiary' && <BestiaryScreen monsters={state.bestiary} onClear={() => setState(p => ({ ...p, bestiary: [] }))} onAddMonster={m => setState(p => ({ ...p, bestiary: [m, ...p.bestiary] }))} />}
              {activeTab === 'Armory' && <ArmoryScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onShare={() => {}} userId={state.userAccount.id} />}
              {activeTab === 'Alchemy' && <AlchemyScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onShare={() => {}} userId={state.userAccount.id} party={activePartyUnits} />}
              {activeTab === 'Nexus' && <NexusScreen 
                peerId={state.userAccount.peerId || ''} 
                connectedPeers={state.multiplayer.connectedPeers} 
                isHost={state.multiplayer.isHost} 
                onConnect={() => {}} 
                username={state.userAccount.username} 
                gameState={state} 
                onClearFriends={() => setState(p => ({ ...p, userAccount: { ...p.userAccount, friends: [] } }))}
                onDeleteAccount={() => {
                   if(confirm("Art thou certain? Reset all local data?")) {
                      localStorage.removeItem(STORAGE_PREFIX + 'state');
                      window.location.reload();
                   }
                }}
              />}
              {activeTab === 'Rules' && <RulesScreen />}
              {activeTab === 'Spells' && <SpellsScreen playerCharacters={state.characters} customArchetypes={state.customArchetypes} mentors={state.mentors} />}
              {activeTab === 'Archetypes' && <ArchetypesScreen customArchetypes={state.customArchetypes} onShare={() => {}} userId={state.userAccount.id} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
export default App;
