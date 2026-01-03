
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, UserAccount, Graveyard, Stats } from './types';
import Sidebar from './components/Sidebar';
import CampaignView from './components/CampaignView';
import CharacterCreator from './components/CharacterCreator';
import Bestiary from './components/Bestiary';
import Armory from './components/Armory';
import ClassLibrary from './components/ClassLibrary';
import MultiplayerPanel from './components/MultiplayerPanel';
import LoginScreen from './components/LoginScreen';
import ArchivePanel from './components/ArchivePanel';
import SpellCodex from './components/SpellCodex';
import ProfilePanel from './components/ProfilePanel';
import RulesManifest from './components/RulesManifest';
import SoulCairn from './components/SoulCairn';
import { generateImage, generateRules } from './services/gemini';
import Peer, { DataConnection } from 'peerjs';

const REGISTRY_VERSION = 22; 

const MONTHLY_CONTENT = {
  version: "March-2025-v22-Complete-Tactical",
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Leather Armor', 'Bows', 'Fletching'], features: [
        { name: 'Sky Shot', description: 'Shoot flying enemies with perfect accuracy.' },
        { name: 'Exposed Weakness', description: 'Target an exposed enemy to deal an additional 1d8 damage.' },
        { name: 'Lightfoot', description: 'AC bonus (+2) while moving at least 20ft in light armor.' },
        { name: 'Special Arrows', description: 'Craft arrows with Fire, Ice, or Force effects.' },
        { name: 'Rapid Fire', description: 'Fire twice as a single action, but with -2 to each attack roll.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-arch-bow', 'itm-leather-armor']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth who wear leather armors and use dual daggers.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Leather Armor', 'Daggers', 'Stealth'], features: [
        { name: 'Dual Wielding', description: 'Attack with both daggers as one action.' },
        { name: 'Instant Execution', description: 'Instantly slay a human-sized enemy grappled by an ally.' },
        { name: 'Smoke Bomb', description: 'Create a cloud of smoke for instant invisibility.' },
        { name: 'Silent Footsteps', description: 'No penalty to stealth while running.' },
        { name: 'Poison Mastery', description: 'Apply neurotoxin to daggers for 1d4 DOT.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-daggers', 'itm-leather-armor']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Masters of magic wielding long staves and destructive energy.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Robes', 'Staves', 'Arcana'], features: [
        { name: 'Destructive Magic', description: 'Damaging spells deal an additional die of damage.' },
        { name: 'Spell Memory', description: 'Commit one spell to memory; it becomes free to cast once per day.' },
        { name: 'Arcane Surge', description: 'Boost spell DC by 2 for one turn.' },
        { name: 'Flowing Robes', description: 'Passive 13 AC + Dex while in robes.' },
        { name: 'Elemental Focus', description: 'Ignore resistances to your chosen element.' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: '10d6 fire damage.' },
        { name: 'Mana Burst', level: 1, school: 'Evocation', description: '2d8 force damage.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-staff', 'itm-robed-attire']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive spellcasters focused on healing and resonant buffs.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Robes', 'Small Staves', 'Healing'], features: [
        { name: 'Resonant Buffs', description: 'Single-target buffs spread to nearby allies.' },
        { name: 'Divine Healing', description: 'Restore max health to targets below 25% HP.' },
        { name: 'Protective Aura', description: 'Allies within 10ft gain +1 to saves.' },
        { name: 'Staff Focus', description: 'Wisdom modifier bonus to healing.' },
        { name: 'Beacon of Hope', description: 'Grant one ally advantage on all rolls for 2 rounds.' }
      ], initialSpells: [
        { name: 'Mass Regen', level: 3, school: 'Conjuration', description: 'Heal all allies for 1d8 every turn.' },
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield an ally from 10 points of damage.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-staff', 'itm-robed-attire']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Champion of the frontline, taking damage with their shield held firm.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['Plate Armor', 'Shields', 'Swords'], features: [
        { name: 'Shield Wall', description: 'Passive +2 AC bonus to yourself and adjacent allies.' },
        { name: 'Shield Bash', description: 'Bash for 1d6+Str damage.' },
        { name: 'Frontline Guardian', description: 'Intercept an attack meant for an ally.' },
        { name: 'Steel Resolve', description: 'Ignore status effects for 1 minute.' },
        { name: 'Master Duelist', description: 'Gain +2 to hit while no other allies are near.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-fig-sword', 'itm-fig-shield', 'itm-half-plate']
    }
  ],
  monsters: [
    { id: 'mon-goblin-scout', name: 'Goblin Scavenger', description: 'A wiry scout.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Disengage as bonus action.' }], authorId: 'system', size: 'Small' as const },
    { id: 'mon-skeleton', name: 'Crypt Skeleton', description: 'Undead guard.', stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 }, hp: 13, ac: 13, abilities: [{ name: 'Undead Resolve', effect: 'Resistant to piercing.' }], authorId: 'system', size: 'Medium' as const }
  ],
  items: [
    { id: 'itm-arch-bow', name: 'Weathered Yew Bow', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d8', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'Standard hunter\'s bow.', mechanics: [{ name: 'Steady Aim', description: '+1 to hit.' }], lore: 'Old but reliable.', authorId: 'system' },
    { id: 'itm-leather-armor', name: 'Cured Hide', type: 'Armor' as const, rarity: 'Common' as const, ac: 11, classRestrictions: ['cls-archer', 'cls-thief'], description: 'Flexible leather.', mechanics: [{ name: 'Quiet', description: 'No stealth penalty.' }], lore: 'Basic protection.', authorId: 'system' },
    { id: 'itm-thief-daggers', name: 'Void Fang Daggers', type: 'Weapon' as const, rarity: 'Rare' as const, damageRoll: '1d4', damageType: 'Piercing', classRestrictions: ['cls-thief'], description: 'Sharp obsidian.', mechanics: [{ name: 'Twin Strike', description: 'Advantage on first turn.' }], lore: 'Found in the void.', authorId: 'system' },
    { id: 'itm-sorc-staff', name: 'Oak Staff', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d6', damageType: 'Bludgeoning', classRestrictions: ['cls-sorcerer'], description: 'Magic focus.', mechanics: [{ name: 'Spark', description: '+1 Spell DC.' }], lore: 'Student gear.', authorId: 'system' },
    { id: 'itm-mage-staff', name: 'Willow Wand', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d4', damageType: 'Bludgeoning', classRestrictions: ['cls-mage'], description: 'Healing wand.', mechanics: [{ name: 'Mending', description: '+1d4 healing.' }], lore: 'White magic tool.', authorId: 'system' },
    { id: 'itm-fig-sword', name: 'Shortsword', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d6', damageType: 'Slashing', classRestrictions: ['cls-fighter'], description: 'Steel blade.', mechanics: [{ name: 'Fast', description: '+1 Initiative.' }], lore: 'Military issue.', authorId: 'system' },
    { id: 'itm-fig-shield', name: 'Round Shield', type: 'Armor' as const, rarity: 'Common' as const, ac: 2, classRestrictions: ['cls-fighter'], description: 'Wood/Iron.', mechanics: [{ name: 'Deflect', description: '+1 AC vs ranged.' }], lore: 'Basic defense.', authorId: 'system' },
    { id: 'itm-half-plate', name: 'Half Plate', type: 'Armor' as const, rarity: 'Common' as const, ac: 15, classRestrictions: ['cls-fighter'], description: 'Steel plates.', mechanics: [{ name: 'Solid', description: 'Adv vs push.' }], lore: 'Veteran gear.', authorId: 'system' },
    { id: 'itm-robed-attire', name: 'Sage Robes', type: 'Armor' as const, rarity: 'Common' as const, ac: 10, classRestrictions: ['cls-sorcerer', 'cls-mage'], description: 'Fine silk.', mechanics: [{ name: 'Aetheric', description: '+5 MP.' }], lore: 'Academy robes.', authorId: 'system' }
  ],
  heroes: [
    { 
      id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "A timid human mage with a soft voice.", level: 1, stats: { strength: 8, dexterity: 12, constitution: 13, intelligence: 14, wisdom: 16, charisma: 14 }, hp: 10, maxHp: 10, 
      feats: [{ name: 'Soothing Aura', description: 'Allies gain 1d4 temp HP.' }], knownSpells: [{ name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield 10 dmg.' }],
      inventory: ['itm-mage-staff', 'itm-robed-attire'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf' as const, gender: 'Female' as const, gold: 50, 
      description: "A stoic elf archer.", level: 1, stats: { strength: 10, dexterity: 18, constitution: 12, intelligence: 12, wisdom: 15, charisma: 8 }, hp: 11, maxHp: 11, 
      feats: [{ name: 'Sky Shot', description: 'Perfect accuracy on flyers.' }], 
      inventory: ['itm-arch-bow', 'itm-leather-armor'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "An energetic human fighter.", level: 1, stats: { strength: 16, dexterity: 14, constitution: 16, intelligence: 8, wisdom: 10, charisma: 12 }, hp: 12, maxHp: 12, 
      feats: [{ name: 'Shield Wall', description: '+2 AC to allies.' }], 
      inventory: ['itm-fig-sword', 'itm-fig-shield', 'itm-half-plate'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    }
  ],
  initialCampaign: {
    plot: "The hunting party starts in the Rusty Tankard Tavern. Goblins are harassing the village, but darker things lurk in the mist.",
    summary: "Miri, Lina, and Seris have invited you to join their goblin hunting party at the Rusty Tankard Tavern.",
    locationName: "Rusty Tankard Tavern",
    rules: [
      { id: 'rule-1', category: 'Combat', name: 'Momentum', content: 'Moving 10ft before attack adds +2 damage.' }
    ]
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('characters');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return JSON.parse(localStorage.getItem('mythos_active_session') || 'null');
  });

  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [graveyard, setGraveyard] = useState<Graveyard>({ characters: [], monsters: [], items: [], classes: [] });
  const [campaign, setCampaign] = useState<CampaignState>({ plot: '', summary: '', logs: [], party: [], rules: [], locationName: 'Orestara' });

  const [peerId, setPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const peerRef = useRef<Peer | null>(null);

  const notify = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Soul' } as SyncMessage;
    connections.forEach(conn => conn.open && conn.send(fullMsg));
  }, [connections, peerId, currentUser]);

  const handleSignOut = () => { localStorage.removeItem('mythos_active_session'); setCurrentUser(null); };

  const banishToCairn = (type: keyof Graveyard, entity: any) => {
    const entityWithMeta = { ...entity, deletedAt: Date.now() };
    setGraveyard(prev => ({ ...prev, [type]: [...prev[type], entityWithMeta] }));
    if (type === 'characters') setCharacters(prev => prev.filter(c => c.id !== entity.id));
    if (type === 'classes') setClasses(prev => prev.filter(c => c.id !== entity.id));
    if (type === 'monsters') setMonsters(prev => prev.filter(m => m.id !== entity.id));
    if (type === 'items') setItems(prev => prev.filter(i => i.id !== entity.id));
    notify(`${entity.name} severed.`, 'info');
  };

  const manifestBasics = useCallback(() => {
    setClasses(prev => {
      const systemIds = MONTHLY_CONTENT.classes.map(c => c.id);
      return [...prev.filter(c => !systemIds.includes(c.id)), ...MONTHLY_CONTENT.classes as any[]];
    });
    setMonsters(prev => {
      const merged = [...prev];
      MONTHLY_CONTENT.monsters.forEach(m => { if (!merged.find(x => x.id === m.id)) merged.push(m as any); });
      return merged;
    });
    setItems(prev => {
      const merged = [...prev];
      MONTHLY_CONTENT.items.forEach(i => { if (!merged.find(x => x.id === i.id)) merged.push(i as any); });
      return merged;
    });
    setCharacters(prev => {
      const heroIds = MONTHLY_CONTENT.heroes.map(h => h.id);
      return [...prev.filter(c => !heroIds.includes(c.id)), ...MONTHLY_CONTENT.heroes as any[]];
    });
    setCampaign(prev => ({
      ...prev,
      ...MONTHLY_CONTENT.initialCampaign,
      party: MONTHLY_CONTENT.heroes as any[],
      logs: [{ role: 'dm', content: MONTHLY_CONTENT.initialCampaign.summary, timestamp: Date.now() }]
    }));
    notify("Chronicle Synchronized.", "success");
  }, [notify]);

  useEffect(() => {
    if (currentUser) {
      const uPrefix = currentUser.username;
      const charsRaw = localStorage.getItem(`${uPrefix}_mythos_chars`);
      if (charsRaw) {
        setCharacters(JSON.parse(charsRaw));
        setClasses(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_classes`) || '[]'));
        setMonsters(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_monsters`) || '[]'));
        setItems(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_items`) || '[]'));
        setGraveyard(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_graveyard`) || '{"characters":[],"monsters":[],"items":[],"classes":[]}'));
        setCampaign(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_campaign`) || '{}'));
      } else manifestBasics();
    }
  }, [currentUser?.username, manifestBasics]);

  useEffect(() => {
    if (!currentUser) return;
    const uPrefix = currentUser.username;
    localStorage.setItem(`${uPrefix}_mythos_chars`, JSON.stringify(characters));
    localStorage.setItem(`${uPrefix}_mythos_classes`, JSON.stringify(classes));
    localStorage.setItem(`${uPrefix}_mythos_monsters`, JSON.stringify(monsters));
    localStorage.setItem(`${uPrefix}_mythos_items`, JSON.stringify(items));
    localStorage.setItem(`${uPrefix}_mythos_graveyard`, JSON.stringify(graveyard));
    localStorage.setItem(`${uPrefix}_mythos_campaign`, JSON.stringify(campaign));
  }, [currentUser, characters, classes, monsters, items, graveyard, campaign]);

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={handleSignOut} user={currentUser} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
      <main className="flex-1 relative overflow-y-auto pt-16 lg:pt-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} setCharacters={setCharacters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={true} dmModel="gemini-3-pro-preview" setDmModel={()=>{}} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={true} currentUser={currentUser} onBanish={(char) => banishToCairn('characters', char)} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} classes={classes} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={true} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'soul-cairn' && <SoulCairn graveyard={graveyard} onRestore={()=>{}} onPurge={()=>{}} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={()=>{}} setIsHost={setIsHost} forceSync={()=>{}} kickSoul={()=>{}} rehostWithSigil={()=>{}} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign }} onImport={()=>{}} manifestBasics={manifestBasics} />}
        </div>
      </main>
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">{notifications.map(n => (<div key={n.id} className={`p-4 border-l-4 rounded-sm shadow-2xl animate-notification pointer-events-auto bg-black border ${n.type === 'error' ? 'border-red-900 text-red-400' : 'border-[#b28a48] text-[#b28a48]'}`}><p className="text-[10px] font-black uppercase tracking-widest">{n.message}</p></div>))}</div>
    </div>
  );
};

export default App;
