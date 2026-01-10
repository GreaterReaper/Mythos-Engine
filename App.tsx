
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
    mapTokens: [],
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
        setState(prev => hydrateState(parsed, DEFAULT_STATE));
      } catch (e) { console.error("Rebind failed", e); }
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

  const refreshLineage = () => {
    setState(prev => {
      const syncCharacter = (c: Character): Character => {
        const info = ARCHETYPE_INFO[c.archetype as Archetype] || prev.customArchetypes.find(a => a.name === c.archetype);
        if (!info) return c;
        const unlockedAbilities = info.coreAbilities.filter(a => a.levelReq <= c.level);
        const unlockedSpells = (info.spells || []).filter(s => s.levelReq <= c.level);
        const customBoons = (c.abilities || []).filter(a => a.levelReq === 0);
        return {
          ...c,
          abilities: [...unlockedAbilities, ...customBoons],
          spells: unlockedSpells
        };
      };
      return {
        ...prev,
        characters: prev.characters.map(syncCharacter),
        mentors: prev.mentors.map(syncCharacter)
      };
    });
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.map(c => c.id === id ? { ...c, ...updates } : c),
      mentors: prev.mentors.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
    setTimeout(refreshLineage, 100);
  };

  const handleTutorialComplete = (primaryId: string, title: string, prompt: string) => {
    const campId = safeId();
    setState(prev => {
      const newCampaign: Campaign = { id: campId, title, prompt, history: [], participants: [primaryId], isRaid: false };
      return { ...prev, campaigns: [...prev.campaigns, newCampaign], activeCampaignId: campId, party: [primaryId] };
    });
    setShowTutorial(false);
    setActiveTab('Chronicles');
    handleMessage({ role: 'user', content: `start ${title}`, timestamp: Date.now() }, campId);
  };

  const handleMessage = async (msg: Message, campaignId?: string) => {
    const targetCampaignId = campaignId || state.activeCampaignId;
    if (!targetCampaignId) return;

    setState(prev => ({
      ...prev,
      campaigns: prev.campaigns.map(c => c.id === targetCampaignId ? { ...c, history: [...c.history, msg] } : c)
    }));

    if (msg.role === 'model') {
      const activePartyObjects = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      setTimeout(async () => {
        try {
          const audit = await auditNarrativeEffect(msg.content, activePartyObjects);
          const logs: Message[] = [];
          
          if (audit.newEntities && audit.newEntities.length > 0) {
            for (const entity of audit.newEntities) {
              if (entity.category === 'monster') {
                const details = await generateMonsterDetails(entity.name, `Forged in ${targetCampaignId}`);
                const newMonster: Monster = {
                  id: safeId(),
                  name: details.name || entity.name,
                  hp: details.hp || 50,
                  ac: details.ac || 15,
                  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                  cr: details.cr || 1,
                  abilities: [],
                  activeStatuses: [],
                  description: details.description || "A manifest horror.",
                  type: 'Hybrid'
                };
                setState(prev => ({ ...prev, bestiary: [newMonster, ...prev.bestiary] }));
                logs.push({ role: 'system', content: `ARCHITECT: ${newMonster.name} manifest from the void.`, timestamp: Date.now() });
              } else if (entity.category === 'item') {
                const details = await generateItemDetails(entity.name, `Discovered in ${targetCampaignId}`);
                const newItem: Item = {
                  id: safeId(),
                  name: details.name || entity.name,
                  description: details.description || "A relic discovered.",
                  type: details.type || 'Utility',
                  rarity: details.rarity || 'Uncommon',
                  stats: details.stats || {}
                };
                setState(prev => ({ ...prev, armory: [newItem, ...prev.armory] }));
                logs.push({ role: 'system', content: `ARCHITECT: ${newItem.name} manifested in thy Armory.`, timestamp: Date.now() });
              }
            }
          }

          if (audit.changes && audit.changes.length > 0) {
            setState(prev => {
              let newCharacters = [...prev.characters];
              let newMentors = [...prev.mentors];
              let newParty = [...prev.party];

              audit.changes.forEach((change: any) => {
                // SPECIAL CASE: Summoning a Mentor
                if (change.type === 'summon') {
                  const mentor = newMentors.find(m => m.name.toLowerCase().includes(change.target.toLowerCase()));
                  if (mentor && !newParty.includes(mentor.id)) {
                    newParty.push(mentor.id);
                    logs.push({ role: 'system', content: `FELLOWSHIP: ${mentor.name} has joined thy resonance.`, timestamp: Date.now() });
                  }
                  return;
                }

                const targetChar = [...newCharacters, ...newMentors].find(c => 
                  change.target && (
                    c.name.toLowerCase().includes(change.target.toLowerCase()) || 
                    change.target.toLowerCase().includes(c.name.toLowerCase())
                  )
                );
                
                if (!targetChar) return;
                const targetId = targetChar.id;
                
                const updateMapper = (c: Character): Character => {
                  if (c.id !== targetId) return c;
                  const charUpdate = { ...c };
                  if (change.type === 'damage') charUpdate.currentHp = Math.max(0, (charUpdate.currentHp || 0) - (change.value || 0));
                  if (change.type === 'heal') charUpdate.currentHp = Math.min(charUpdate.maxHp || 100, (charUpdate.currentHp || 0) + (change.value || 0));
                  if (change.type === 'exp') charUpdate.exp = (charUpdate.exp || 0) + (change.value || 0);
                  if (change.type === 'mana') charUpdate.currentMana = Math.max(0, (charUpdate.currentMana || 0) - (change.value || 0));
                  if (change.type === 'ability') {
                    const newAbility: Ability = {
                      name: change.description?.split('|')[0]?.trim() || "New Power",
                      description: change.description?.split('|')[1]?.trim() || "A unique soul-manifestation.",
                      type: 'Active',
                      levelReq: 0
                    };
                    charUpdate.abilities = [...(charUpdate.abilities || []), newAbility];
                    logs.push({ role: 'system', content: `LEGENDARY: ${c.name} has manifest a unique power: ${newAbility.name}.`, timestamp: Date.now() });
                  }
                  return charUpdate;
                };

                newCharacters = newCharacters.map(updateMapper);
                newMentors = newMentors.map(updateMapper);
              });
              
              return { 
                ...prev, 
                characters: newCharacters, 
                mentors: newMentors,
                party: newParty,
                campaigns: prev.campaigns.map(c => c.id === targetCampaignId ? { ...c, history: [...c.history, ...logs], participants: newParty } : c)
              };
            });
            setTimeout(refreshLineage, 100);
          } else if (logs.length > 0) {
            setState(prev => ({
              ...prev,
              campaigns: prev.campaigns.map(c => c.id === targetCampaignId ? { ...c, history: [...c.history, ...logs] } : c)
            }));
          }
        } catch (e) { console.error("Audit Fail", e); }
      }, 500);
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
              if (migrated) { setState(migrated); return true; }
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
                  handleMessage({ role: 'user', content: `start ${t}`, timestamp: Date.now() }, campId);
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
                onRefreshCharacters={refreshLineage}
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
                peerId={state.userAccount.peerId || ''} connectedPeers={state.multiplayer.connectedPeers} 
                isHost={state.multiplayer.isHost} onConnect={() => {}} username={state.userAccount.username} 
                gameState={state} onClearFriends={() => {}} onDeleteAccount={() => {}}
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
