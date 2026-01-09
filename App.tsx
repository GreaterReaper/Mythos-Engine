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

  const updateMonster = (id: string, updates: Partial<Monster>) => {
    setState(prev => ({ ...prev, bestiary: prev.bestiary.map(m => m.id === id ? { ...m, ...updates } : m) }));
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

  const activePartyObjects = [...state.characters, ...state.mentors].filter(c => state.party.includes(c.id));
  const currentShop = (state.campaigns.find(c => c.id === state.activeCampaignId)?.activeShop) || state.currentTavernShop;

  return (
    <div className="flex flex-col h-[var(--visual-height)] w-full bg-[#0c0a09] text-[#d6d3d1] overflow-hidden md:flex-row relative">
      <div className="flex flex-col w-full min-h-0">
        <QuotaBanner usage={state.apiUsage} />
        <div className="flex flex-col flex-1 min-h-0 md:flex-row overflow-hidden">
          {!state.userAccount.isLoggedIn && (
            <AccountPortal onLogin={u => setState(p => ({ ...p, userAccount: { ...p.userAccount, username: u, isLoggedIn: true } }))} onMigrate={() => false} />
          )}
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userAccount={state.userAccount} multiplayer={state.multiplayer} />
          <main className="relative flex-1 overflow-y-auto bg-leather">
            <div className="mx-auto max-w-7xl p-4 md:p-8">
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
              {activeTab === 'Fellowship' && <FellowshipScreen characters={state.characters} onAdd={c => setState(p => ({ ...p, characters: [...p.characters, c] }))} onDelete={id => setState(p => ({ ...p, characters: p.characters.filter(c => c.id !== id) }))} onUpdate={updateCharacter} mentors={state.mentors} party={state.party} setParty={p => setState(s => ({ ...s, party: p }))} customArchetypes={state.customArchetypes} onAddCustomArchetype={a => setState(p => ({ ...p, customArchetypes: [...p.customArchetypes, a] }))} username={state.userAccount.username} />}
              {activeTab === 'Chronicles' && <DMWindow campaign={state.campaigns.find(c => c.id === state.activeCampaignId) || null} allCampaigns={state.campaigns} characters={activePartyObjects} bestiary={state.bestiary} activeCharacter={activePartyObjects.find(c => c.id === state.userAccount.activeCharacterId) || null} onSelectActiveCharacter={id => setState(p => ({ ...p, userAccount: { ...p.userAccount, activeCharacterId: id } }))} onMessage={m => setState(p => ({ ...p, campaigns: p.campaigns.map(c => c.id === p.activeCampaignId ? { ...c, history: [...c.history, m] } : c) }))} onCreateCampaign={(t, p) => {
                const newCampaign: Campaign = { 
                  id: safeId(), 
                  title: t, 
                  prompt: p, 
                  history: [{ role: 'model', content: p, timestamp: Date.now() }], 
                  participants: state.party 
                };
                setState(prev => ({ ...prev, campaigns: [...prev.campaigns, newCampaign], activeCampaignId: newCampaign.id }));
              }} onSelectCampaign={id => setState(p => ({ ...p, activeCampaignId: id }))} onDeleteCampaign={id => setState(p => ({ ...p, campaigns: p.campaigns.filter(c => c.id !== id) }))} onQuitCampaign={() => setState(p => ({ ...p, activeCampaignId: null }))} onShortRest={() => {}} isHost={true} />}
              {activeTab === 'Bestiary' && <BestiaryScreen monsters={state.bestiary} onUpdateMonster={updateMonster} />}
              {activeTab === 'Armory' && <ArmoryScreen armory={state.armory} setArmory={a => setState(p => ({ ...p, armory: a }))} onShare={() => {}} userId={state.userAccount.id} />}
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