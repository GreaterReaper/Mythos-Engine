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
import { generateItemDetails, generateMonsterDetails, generateShopInventory, safeId, hydrateState, generateRumors, parseDMCommand, parseSoulSignature, auditNarrativeEffect } from './geminiService';

declare var Peer: any;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Fellowship');
  const [isShopLoading, setIsShopLoading] = useState(false);
  const [isRumorLoading, setIsRumorLoading] = useState(false);
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

  const handleMessage = async (msg: Message) => {
    // 1. Add Message to History
    setState(prev => {
      if (!prev.activeCampaignId) return prev;
      return {
        ...prev,
        campaigns: prev.campaigns.map(c => 
          c.id === prev.activeCampaignId ? { ...c, history: [...c.history, msg] } : c
        )
      };
    });

    if (msg.role === 'model') {
      const activePartyObjects = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
      
      // 2. RUN THE SCRIBE (Mechanical Audit)
      const audit = await auditNarrativeEffect(msg.content, activePartyObjects);
      
      // 3. Apply Changes from Audit
      if (audit.changes) {
        audit.changes.forEach((change: any) => {
          const target = activePartyObjects.find(c => c.name.toLowerCase() === change.target.toLowerCase());
          if (!target) return;

          const updates: Partial<Character> = {};
          if (change.type === 'damage') updates.currentHp = Math.max(0, target.currentHp - change.value);
          if (change.type === 'heal') updates.currentHp = Math.min(target.maxHp, target.currentHp + change.value);
          if (change.type === 'exp') updates.exp = target.exp + change.value;
          
          if (Object.keys(updates).length > 0) {
            updateCharacter(target.id, updates);
          }
        });
      }

      // 4. RUN THE ARCHITECT (Entity Forging)
      if (audit.newEntities) {
        for (const entity of audit.newEntities) {
          if (entity.category === 'item') {
            const itemData = await generateItemDetails(entity.name, msg.content);
            const newItem: Item = {
              id: safeId(),
              name: itemData.name || entity.name,
              description: itemData.description || "A mysterious object.",
              type: (itemData.type as any) || 'Quest',
              rarity: (itemData.rarity as any) || 'Common',
              stats: itemData.stats
            };
            setState(prev => ({ ...prev, armory: [...prev.armory, newItem] }));
          } else if (entity.category === 'monster') {
            const monData = await generateMonsterDetails(entity.name, msg.content);
            const newMon: Monster = {
              id: safeId(),
              name: monData.name || entity.name,
              description: monData.description || "A threat manifests.",
              hp: monData.hp || 20,
              ac: monData.ac || 10,
              cr: monData.cr || 1,
              stats: monData.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
              type: 'Hybrid',
              abilities: monData.abilities || [],
              activeStatuses: []
            };
            setState(prev => ({ ...prev, bestiary: [...prev.bestiary, newMon] }));
          }
        }
      }
    }
  };

  const activePartyObjects = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
  const isChronicles = activeTab === 'Chronicles';

  return (
    <div className="flex flex-col h-[var(--visual-height)] w-full bg-[#0c0a09] text-[#d6d3d1] overflow-hidden md:flex-row relative">
      <div className="flex flex-col w-full min-h-0">
        <QuotaBanner usage={state.apiUsage} />
        <div className="flex flex-col flex-1 min-h-0 md:flex-row overflow-hidden">
          {!state.userAccount.isLoggedIn && (
            <AccountPortal onLogin={u => setState(p => ({ ...p, userAccount: { ...p.userAccount, username: u, isLoggedIn: true } }))} onMigrate={() => false} />
          )}
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userAccount={state.userAccount} multiplayer={state.multiplayer} />
          <main className={`relative flex-1 bg-leather ${isChronicles ? 'overflow-hidden h-full' : 'overflow-y-auto'}`}>
            <div className={`mx-auto ${isChronicles ? 'h-full max-w-none p-0' : 'max-w-7xl p-4 md:p-8'}`}>
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
              {activeTab === 'Fellowship' && <FellowshipScreen 
                characters={state.characters} onAdd={c => setState(p => ({ ...p, characters: [...p.characters, c] }))} 
                onDelete={id => setState(p => ({ ...p, characters: p.characters.filter(c => c.id !== id) }))} 
                onUpdate={updateCharacter} mentors={state.mentors} party={state.party} setParty={p => setState(s => ({ ...s, party: p }))} 
                customArchetypes={state.customArchetypes} onAddCustomArchetype={a => setState(p => ({ ...p, customArchetypes: [...p.customArchetypes, a] }))} 
                username={state.userAccount.username} hasCampaigns={state.campaigns.length > 0}
              />}
              {/* Other tabs remain identical */}
              {activeTab === 'Tavern' && <TavernScreen party={activePartyObjects} mentors={state.mentors} partyIds={state.party} onToggleParty={id => setState(p => ({ ...p, party: p.party.includes(id) ? p.party.filter(x => x !== id) : [...p.party, id] }))} onLongRest={() => {}} onOpenShop={() => {}} onUpgradeItem={() => {}} isHost={true} activeRumors={state.activeRumors} onFetchRumors={() => {}} isRumorLoading={false} />}
              {activeTab === 'Tactics' && <TacticalMap tokens={state.mapTokens} onUpdateTokens={t => setState(p => ({ ...p, mapTokens: t }))} characters={state.characters} monsters={state.bestiary} />}
              {activeTab === 'Archetypes' && <ArchetypesScreen customArchetypes={state.customArchetypes} onShare={() => {}} userId={state.userAccount.id} />}
              {activeTab === 'Bestiary' && <BestiaryScreen monsters={state.bestiary} onUpdateMonster={() => {}} />}
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