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
    const savedState = localStorage.getItem(STORAGE_PREFIX + 'state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState(prev => {
          const hydrated = hydrateState(parsed, DEFAULT_STATE);
          // Auto-sync missing mentors on load for convenience
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
    setState(prev => {
      const syncList = (list: Character[]) => list.map(c => {
        const archInfo = ARCHETYPE_INFO[c.archetype as Archetype] || prev.customArchetypes.find(a => a.name === c.archetype);
        if (!archInfo) return c;
        
        // Preserve any custom abilities already on the character that aren't in the class manifest
        const classAbilityNames = new Set([...archInfo.coreAbilities, ...(archInfo.spells || [])].map(a => a.name));
        const customAbilities = c.abilities.filter(a => !classAbilityNames.has(a.name) && a.levelReq === 0);
        const customSpells = c.spells.filter(a => !classAbilityNames.has(a.name) && a.levelReq === 0);

        return {
          ...c,
          abilities: [...archInfo.coreAbilities.filter(a => a.levelReq <= c.level), ...customAbilities],
          spells: [...(archInfo.spells || []).filter(s => s.levelReq <= c.level), ...customSpells]
        };
      });

      return {
        ...prev,
        characters: syncList(prev.characters),
        mentors: syncList(prev.mentors)
      };
    });
    alert("The Engine has realigned thy Fellowship's power. All manifestations now strictly obey thy Level.");
  };

  const handleSummonMentors = () => {
    setState(prev => {
      const updatedMentors = MENTORS.map(sourceMentor => {
        const existing = prev.mentors.find(m => m.id === sourceMentor.id);
        if (existing) {
          return {
            ...existing,
            stats: sourceMentor.stats,
            inventory: sourceMentor.inventory,
            equippedIds: sourceMentor.equippedIds,
            description: sourceMentor.description,
            biography: sourceMentor.biography,
            abilities: sourceMentor.abilities.filter(a => a.levelReq <= existing.level),
            spells: sourceMentor.spells.filter(s => s.levelReq <= existing.level)
          };
        }
        return sourceMentor;
      });

      alert(`The Ritual is complete. ${MENTORS.length} souls have been realigned with the latest manifest.`);
      return { ...prev, mentors: updatedMentors };
    });
  };

  const handleMigrateState = (signature: string): boolean => {
    const migrated = parseSoulSignature(signature, DEFAULT_STATE);
    if (migrated) {
      const fullState = hydrateState(migrated, DEFAULT_STATE);
      fullState.userAccount.isLoggedIn = true;
      setState(fullState);
      return true;
    }
    return false;
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
                  
                  if (newTotalExp >= expToLevel) {
                    updates.level = target.level + 1;
                    updates.exp = newTotalExp - expToLevel;
                    const archInfo = ARCHETYPE_INFO[target.archetype as Archetype];
                    
                    if (archInfo) {
                      const hpGain = Math.floor(archInfo.hpDie / 2) + 1;
                      updates.maxHp = target.maxHp + hpGain;
                      updates.currentHp = updates.maxHp;
                      updates.maxMana = target.maxMana + 10;
                      updates.currentMana = updates.maxMana;
                      
                      // Filter and merge custom abilities (levelReq 0) with class progression
                      const classAbilityNames = new Set([...archInfo.coreAbilities, ...(archInfo.spells || [])].map(a => a.name));
                      const customAbilities = target.abilities.filter(a => !classAbilityNames.has(a.name) && a.levelReq === 0);
                      const customSpells = target.spells.filter(a => !classAbilityNames.has(a.name) && a.levelReq === 0);

                      updates.abilities = [...archInfo.coreAbilities.filter(a => a.levelReq <= updates.level!), ...customAbilities];
                      updates.spells = [...(archInfo.spells || []).filter(s => s.levelReq <= updates.level!), ...customSpells];
                    }
                    
                    logs.push({ role: 'system', content: `SCRIBE: ${target.name} ASCENDED TO LEVEL ${updates.level}!`, timestamp: Date.now() });
                  } else {
                    updates.exp = newTotalExp;
                  }
                }

                if (charIdx !== -1) newCharacters[charIdx] = { ...target, ...updates };
                else if (mentorIdx !== -1) newMentors[mentorIdx] = { ...target, ...updates };
              });
            }

            if (audit.newEntities && audit.newEntities.length > 0) {
              for (const entity of audit.newEntities) {
                if (entity.category === 'monster') {
                  const exists = prev.bestiary.find(m => m.name.toLowerCase() === entity.name.toLowerCase());
                  if (!exists) {
                    generateMonsterDetails(entity.name, msg.content).then(m => {
                      setState(p => ({ ...p, bestiary: [...p.bestiary, { ...m, id: safeId(), type: 'Hybrid', abilities: [], activeStatuses: [] } as Monster] }));
                    });
                  }
                }
                if (entity.category === 'item') {
                  generateItemDetails(entity.name, msg.content).then(itemData => {
                    const newItem: Item = { 
                      id: safeId(), 
                      name: itemData.name || entity.name, 
                      description: itemData.description || "Found in the depths.", 
                      type: (itemData.type as any) || 'Utility', 
                      rarity: (itemData.rarity as any) || 'Common', 
                      isUnique: itemData.isUnique || false, 
                      stats: itemData.stats || {} 
                    };
                    
                    setState(p => {
                      const newArmory = [...p.armory, newItem];
                      if (entity.target) {
                        const targetName = entity.target.toLowerCase();
                        const updateList = (chars: Character[]) => chars.map(c => c.name.toLowerCase().includes(targetName) ? { ...c, inventory: [...c.inventory, newItem] } : c);
                        return { ...p, armory: newArmory, characters: updateList(p.characters), mentors: updateList(p.mentors) };
                      }
                      return { ...p, armory: newArmory };
                    });
                  });
                }
                if (entity.category === 'ability' && entity.target) {
                  const targetName = entity.target.toLowerCase();
                  const newAbility: Ability = {
                    name: entity.name,
                    description: entity.entityData?.description || "A gift from the Arbiter.",
                    type: 'Feat',
                    levelReq: 0, // 0 marks custom awarded abilities
                    scaling: entity.entityData?.scaling,
                    manaCost: entity.entityData?.manaCost,
                    hpCost: entity.entityData?.hpCost
                  };
                  
                  const updateList = (chars: Character[]) => chars.map(c => c.name.toLowerCase().includes(targetName) ? { ...c, abilities: [...c.abilities, newAbility] } : c);
                  setState(p => ({ ...p, characters: updateList(p.characters), mentors: updateList(p.mentors) }));
                  logs.push({ role: 'system', content: `SCRIBE: ${entity.target} Manifested unique power: ${entity.name}!`, timestamp: Date.now() });
                }
              }
            }

            return {
              ...prev,
              characters: newCharacters,
              mentors: newMentors,
              campaigns: prev.campaigns.map(c => c.id === targetCampaignId ? { ...c, history: [...c.history, ...logs] } : c)
            };
          });
        } catch (e) {
          console.error("Audit Fail", e);
        }
      }, 300);
    }
  };

  const activePartyObjects = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
  const isChronicles = activeTab === 'Chronicles';

  const handleTutorialComplete = (partyIds: string[], title: string, prompt: string) => {
    const campId = safeId();
    const newCampaign: Campaign = { 
      id: campId, 
      title: title, 
      prompt: prompt, 
      history: [], 
      participants: partyIds 
    };

    const primaryChar = state.characters.find(c => c.isPrimarySoul) || state.characters[0];

    setState(prev => ({
      ...prev,
      campaigns: [...prev.campaigns, newCampaign],
      activeCampaignId: campId,
      party: partyIds,
      userAccount: {
        ...prev.userAccount,
        activeCharacterId: primaryChar ? primaryChar.id : partyIds[0]
      }
    }));

    setShowTutorial(false);
    setActiveTab('Chronicles');
    handleMessage({ role: 'model', content: prompt, timestamp: Date.now() }, campId);
  };

  return (
    <div className="flex flex-col h-[var(--visual-height)] w-full bg-[#0c0a09] text-[#d6d3d1] overflow-hidden md:flex-row relative">
      <div className="flex flex-col w-full min-h-0">
        <QuotaBanner usage={state.apiUsage} />
        <div className="flex flex-col flex-1 min-h-0 md:flex-row overflow-hidden">
          {!state.userAccount.isLoggedIn && (
            <AccountPortal onLogin={u => setState(p => ({ ...p, userAccount: { ...p.userAccount, username: u, isLoggedIn: true } }))} onMigrate={handleMigrateState} />
          )}
          {showTutorial && <TutorialScreen characters={state.characters} mentors={state.mentors} onComplete={handleTutorialComplete} />}
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userAccount={state.userAccount} multiplayer={state.multiplayer} />
          <main className={`relative flex-1 bg-leather ${isChronicles ? 'overflow-hidden h-full' : 'overflow-y-auto'}`}>
            <div className={`mx-auto ${isChronicles ? 'h-full max-w-none p-0' : 'max-w-7xl p-4 md:p-8'}`}>
              {activeTab === 'Chronicles' && <DMWindow 
                campaign={state.campaigns.find(c => c.id === state.activeCampaignId) || null} 
                allCampaigns={state.campaigns} characters={activePartyObjects} bestiary={state.bestiary} 
                activeCharacter={activePartyObjects.find(c => c.id === state.userAccount.activeCharacterId) || activePartyObjects[0] || null} 
                onSelectActiveCharacter={id => setState(p => ({ ...p, userAccount: { ...p.userAccount, activeCharacterId: id } }))} 
                onMessage={handleMessage} 
                onCreateCampaign={(t, p) => {
                  const campId = safeId();
                  const newCampaign: Campaign = { id: campId, title: t, prompt: p, history: [], participants: state.party };
                  const primaryChar = state.characters.find(c => c.isPrimarySoul) || state.characters[0];
                  setState(prev => ({ 
                    ...prev, 
                    campaigns: [...prev.campaigns, newCampaign], 
                    activeCampaignId: campId,
                    userAccount: { ...prev.userAccount, activeCharacterId: primaryChar?.id || state.party[0] }
                  }));
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
                onAdd={(c: Character, items: Item[]) => setState(p => ({ ...p, characters: [...p.characters, { ...c, isPrimarySoul: p.characters.length === 0 }], armory: [...p.armory, ...items] }))} 
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
                onSummonMentors={handleSummonMentors}
                onRefreshCharacters={handleRefreshCharacters}
              />}
              {activeTab === 'Tavern' && <TavernScreen 
                party={activePartyObjects} 
                mentors={state.mentors} 
                partyIds={state.party} 
                onToggleParty={id => setState(p => ({ ...p, party: p.party.includes(id) ? p.party.filter(x => x !== id) : [...p.party, id] }))} 
                onLongRest={() => {}} 
                isHost={true} 
                activeRumors={state.activeRumors} 
                onFetchRumors={() => {}} 
                isRumorLoading={false} 
                isBetweenCampaigns={!state.activeCampaignId}
                onBuyItem={(item, buyerId, cost) => {
                  const char = [...state.characters, ...state.mentors].find(c => c.id === buyerId);
                  if (char) {
                     updateCharacter(buyerId, { 
                       inventory: [...char.inventory, item], 
                       currency: { aurels: Math.max(0, char.currency.aurels - (cost?.aurels || 0)) } 
                     });
                     setState(p => ({ ...p, armory: [...p.armory, item] }));
                  }
                }}
              />}
              {activeTab === 'Tactics' && <TacticalMap tokens={state.mapTokens} onUpdateTokens={t => setState(p => ({ ...p, mapTokens: t }))} characters={activePartyObjects} monsters={state.bestiary} />}
              {activeTab === 'Archetypes' && <ArchetypesScreen customArchetypes={state.customArchetypes} onShare={() => {}} userId={state.userAccount.id} />}
              {activeTab === 'Bestiary' && <BestiaryScreen monsters={state.bestiary} onClear={() => setState(p => ({ ...p, bestiary: [] }))} />}
              {activeTab === 'Armory' && <ArmoryScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onShare={() => {}} userId={state.userAccount.id} />}
              {activeTab === 'Alchemy' && <AlchemyScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onShare={() => {}} userId={state.userAccount.id} party={activePartyObjects} />}
              {activeTab === 'Spells' && <SpellsScreen playerCharacters={state.characters} customArchetypes={state.customArchetypes} mentors={state.mentors} />}
              {activeTab === 'Rules' && <RulesScreen />}
              {activeTab === 'Nexus' && <NexusScreen peerId="" connectedPeers={[]} isHost={true} onConnect={() => {}} username={state.userAccount.username} gameState={state} onClearFriends={() => {}} onDeleteAccount={() => {
                if (confirm("Dissolve soul?")) { localStorage.removeItem(STORAGE_PREFIX + 'state'); window.location.reload(); }
              }} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
export default App;