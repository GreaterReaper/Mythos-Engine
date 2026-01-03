
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

const REGISTRY_VERSION = 31; 

export const MENTOR_TEMPLATES: Partial<Character>[] = [
  { 
    id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human', gender: 'Female', gold: 50, exp: 0, expToNextLevel: 1000,
    description: "A timid human mage with a soft voice. She is an AI mentor here to guide you.", level: 1, stats: { strength: 8, dexterity: 12, constitution: 13, intelligence: 14, wisdom: 16, charisma: 14 }, hp: 10, maxHp: 10, 
    feats: [
      { name: 'Resonant Buffs', description: 'Buffs spread to allies within 15ft.' },
      { name: 'Divine Healing', description: 'Heals restore extra to low targets.' },
      { name: 'Beacon of Aura', description: 'Immunity to fear for nearby allies.' },
      { name: 'Mana Font', description: 'Recover a Level 1 spell slot.' },
      { name: 'Etheric Bond', description: 'Share damage with a linked ally.' }
    ], 
    knownSpells: [
      { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield 15 damage.' },
      { name: 'Bless', level: 1, school: 'Enchantment', description: '+1d4 to rolls.' },
      { name: 'Celestial Light', level: 1, school: 'Evocation', description: 'Heal and grant +2 AC.' }
    ],
    inventory: ['itm-mage-wand-1', 'itm-healer-robes'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  },
  { 
    id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf', gender: 'Female', gold: 50, exp: 0, expToNextLevel: 1000,
    description: "A stoic elf archer. She is an AI mentor who analyzes tactical weaknesses.", level: 1, stats: { strength: 10, dexterity: 18, constitution: 12, intelligence: 12, wisdom: 15, charisma: 8 }, hp: 11, maxHp: 11, 
    feats: [
      { name: 'Sky Shot', description: 'Perfect accuracy on flyers.' },
      { name: 'Exposed Weakness', description: '+1d10 bonus damage.' },
      { name: 'Lightfoot Reflex', description: '+2 AC while moving.' },
      { name: 'Trick Shot: Ricochet', description: 'Hit secondary target.' },
      { name: 'Volley of Thorns', description: 'Cone of arrow damage.' }
    ], 
    inventory: ['itm-arch-bow-1', 'itm-scout-leather'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  },
  { 
    id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human', gender: 'Female', gold: 50, exp: 0, expToNextLevel: 1000,
    description: "An energetic human fighter. She is an AI mentor focused on frontline bravery.", level: 1, stats: { strength: 16, dexterity: 14, constitution: 16, intelligence: 8, wisdom: 10, charisma: 12 }, hp: 12, maxHp: 12, 
    feats: [
      { name: 'Shield Wall', description: '+2 AC to self and allies.' },
      { name: 'Shield Bash', description: '1d8 damage and stun.' },
      { name: 'Guardian Intercept', description: 'Take hits for allies.' },
      { name: 'Steel Focus', description: 'Advantage on Con saves.' },
      { name: 'Master Duelist', description: 'Crit immune in 1v1.' }
    ], 
    inventory: ['itm-fig-sword-1', 'itm-fig-shield-1', 'itm-half-plate-1'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  }
];

const MONTHLY_CONTENT = {
  version: "March-2025-v31-Final-Polished",
  heroes: MENTOR_TEMPLATES,
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Precision strikers who excel at distance and mobility.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [2, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Bows', 'Perception'], features: [
        { name: 'Sky Shot', description: 'Ignore penalties for long range and flying targets.' },
        { name: 'Exposed Weakness', description: '+1d10 damage to enemies engaged by allies.' },
        { name: 'Lightfoot Reflex', description: '+2 AC after moving 15ft.' },
        { name: 'Trick Shot', description: 'Bounce arrows to hit secondary targets.' },
        { name: 'Volley of Thorns', description: '15ft cone attack dealing 3d6 piercing.' }
      ], initialSpells: [
        { name: 'Pinning Shot', level: 1, school: 'Conjuration', description: 'Reduce target speed to 0.' },
        { name: 'Hunter\'s Mark', level: 1, school: 'Divination', description: '+1d6 damage to specific target.' }
      ], authorId: 'system', startingItemIds: ['itm-arch-bow-1', 'itm-scout-leather']
    },
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Gloom-armored warriors who trade life force for catastrophic power.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 2, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Swords', 'Intimidation'], features: [
        { name: 'Momentum Reaper', description: 'Move 10ft free after a kill.' },
        { name: 'Living Dead', description: 'When hit by fatal damage, survive at 1 HP for one full combat turn. You must be healed for your Max HP total by the end of that turn or you perish.' },
        { name: 'Living Shadow', description: 'A shadow duplicate copies 50% of your damage.' },
        { name: 'Ignite Aether', description: 'Spend 10 HP for 2d10 necrotic damage.' },
        { name: 'Chill of the Abyss', description: 'Enemies within 5ft suffer -2 to attacks.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 1d8 HP from all adjacent foes.' },
        { name: 'The Blackest Night', level: 2, school: 'Abjuration', description: 'Absorb shield = 25% Max HP.' }
      ], authorId: 'system', startingItemIds: ['itm-dk-blade-1', 'itm-dk-plate-1']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Wielders of raw, chaotic magical essence.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Staves', 'Arcana'], features: [
        { name: 'Destructive Overload', description: 'Double Int mod on spell damage.' },
        { name: 'Spell Memory', description: 'One spell cast per rest is free.' },
        { name: 'Arcane Surge', description: 'Half movement for +3 Spell DC.' },
        { name: 'Arcane Shielding', description: 'Gain Temp HP while casting.' },
        { name: 'Chaos Bolt', description: 'Crits stun for 1 turn.' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: 'Massive fire explosion.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', description: 'Create 3 distracting clones.' }
      ], authorId: 'system'
    }
  ],
  monsters: [
    { id: 'mon-gob-1', name: 'Goblin Prowler', description: 'A sneaky goblin with a jagged blade.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Backstab', effect: '+1d6 damage on advantage.' }], size: 'Small', authorId: 'system' },
    { id: 'mon-und-3', name: 'Spectral Knight', description: 'Armor filled with spiteful fog.', stats: { strength: 16, dexterity: 10, constitution: 18, intelligence: 10, wisdom: 12, charisma: 10 }, hp: 75, ac: 18, abilities: [{ name: 'Ghostly Blade', effect: 'Ignore 5 AC of target.' }], size: 'Medium', authorId: 'system' },
    { 
      id: 'mon-gorechimera', 
      name: 'Gorechimera', 
      isBoss: true,
      description: 'A terrifying hybrid with the head and shoulders of a lion, the body and head of a goat, and a venomous serpent tail. It has more pallid skin compared to its weaker variant.', 
      stats: { strength: 24, dexterity: 14, constitution: 22, intelligence: 12, wisdom: 18, charisma: 14 }, 
      hp: 400, 
      ac: 20, 
      size: 'Huge',
      abilities: [
        { name: 'Lion: Kingly Roar', effect: '4d8 thunder damage + Frightened in 30ft.' },
        { name: 'Serpent: Venomous Spray', effect: '30ft cone, 4d6 poison + blindness.' },
        { name: 'Goat: Necrotic Mending', effect: 'Heals 50 HP and resurrects an ally at 1 HP.' }
      ],
      legendaryActions: [
        { name: 'Triple Fury', effect: 'One attack from each head in sequence.' }
      ],
      authorId: 'system'
    }
  ],
  items: [
    { id: 'itm-dk-blade-1', name: 'Soul-Reaper', type: 'Weapon', rarity: 'Rare', damageRoll: '2d6', damageType: 'Necrotic', classRestrictions: ['cls-dark-knight'], description: 'Absorbs the dying light.', mechanics: [], lore: 'Forged in the Abyss.', authorId: 'system' },
    { id: 'itm-arch-bow-1', name: 'Composite Longbow', type: 'Weapon', rarity: 'Common', damageRoll: '1d8', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'Reinforced wood.', mechanics: [], lore: 'Standard scout issue.', authorId: 'system' }
  ],
  initialCampaign: {
    plot: "The Grey Marches have been swallowed by a spectral fog. Shadows move within.",
    summary: "The Mentor Trio (Miri, Lina, Seris) awaits you at the Rusty Tankard.",
    locationName: "Rusty Tankard Tavern",
    rules: [{ id: 'r-1', category: 'Combat', name: 'Momentum', content: 'Moving 10ft adds +2 damage.' }]
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('campaign');
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

  const notify = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Soul' } as SyncMessage;
    connections.forEach(conn => conn.open && conn.send(fullMsg));
  }, [connections, peerId, currentUser]);

  const handleSignOut = () => { 
    localStorage.removeItem('mythos_active_session'); 
    setCurrentUser(null); 
  };

  const handleDeleteAccount = useCallback(() => {
    if (!currentUser) return;
    if (!window.confirm("Permanently sever your soul and erase all locally stored legends? This cannot be undone.")) return;

    const username = currentUser.username;
    const localAccounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    const updatedAccounts = localAccounts.filter(a => a.username !== username);
    
    localStorage.setItem('mythos_accounts', JSON.stringify(updatedAccounts));
    localStorage.removeItem(`${username}_mythos_chars`);
    localStorage.removeItem(`${username}_mythos_classes`);
    localStorage.removeItem(`${username}_mythos_monsters`);
    localStorage.removeItem(`${username}_mythos_items`);
    localStorage.removeItem(`${username}_mythos_graveyard`);
    localStorage.removeItem(`${username}_mythos_campaign`);
    localStorage.removeItem('mythos_active_session');

    setCurrentUser(null);
    notify("Soul bond severed. Identity erased from the Engine.", "error");
  }, [currentUser, notify]);

  const banishToCairn = useCallback((type: keyof Graveyard, entity: any) => {
    const deletedAt = Date.now();
    const entityWithTimestamp = { ...entity, deletedAt };
    setGraveyard(prev => ({ ...prev, [type]: [...prev[type], entityWithTimestamp] }));
    
    if (type === 'characters') setCharacters(prev => prev.filter(c => c.id !== entity.id));
    if (type === 'monsters') setMonsters(prev => prev.filter(m => m.id !== entity.id));
    if (type === 'items') setItems(prev => prev.filter(i => i.id !== entity.id));
    if (type === 'classes') setClasses(prev => prev.filter(c => c.id !== entity.id));
    
    notify(`${entity.name} cast into the Cairn.`, "info");
  }, [notify]);

  const restoreFromCairn = useCallback((type: keyof Graveyard, id: string) => {
    const entity = graveyard[type].find((e: any) => e.id === id);
    if (!entity) return;
    setGraveyard(prev => ({ ...prev, [type]: prev[type].filter((e: any) => e.id !== id) }));
    if (type === 'characters') setCharacters(prev => [...prev, entity as Character]);
    if (type === 'monsters') setMonsters(prev => [...prev, entity as Monster]);
    if (type === 'items') setItems(prev => [...prev, entity as Item]);
    if (type === 'classes') setClasses(prev => [...prev, entity as ClassDef]);
    notify(`${entity.name} resurrected.`, "success");
  }, [graveyard, notify]);

  const purgeFromCairn = useCallback((type: keyof Graveyard, id: string) => {
    const entity = graveyard[type].find((e: any) => e.id === id);
    setGraveyard(prev => ({ ...prev, [type]: prev[type].filter((e: any) => e.id !== id) }));
    if (entity) notify(`${entity.name} purged from existence.`, "error");
  }, [graveyard, notify]);

  const manifestBasics = useCallback(() => {
    setClasses(prev => {
      const systemIds = MONTHLY_CONTENT.classes.map(c => c.id);
      return [...prev.filter(c => !systemIds.includes(c.id)), ...MONTHLY_CONTENT.classes as any[]];
    });
    setMonsters(prev => {
      const systemIds = MONTHLY_CONTENT.monsters.map(m => m.id);
      return [...prev.filter(m => !systemIds.includes(m.id)), ...MONTHLY_CONTENT.monsters as any[]];
    });
    setItems(prev => {
      const merged = [...prev];
      MONTHLY_CONTENT.items.forEach(i => { if (!merged.find(x => x.id === i.id)) merged.push(i as any); });
      return merged;
    });
    setCharacters(prev => {
      const heroIds = MONTHLY_CONTENT.heroes.map(h => h.id!);
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
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-black/80 border-b border-[#b28a48]/20 backdrop-blur-md z-[100] h-16 shrink-0">
        <button onClick={() => setMobileSidebarOpen(true)} className="text-[#b28a48] text-2xl p-2 active:scale-90 transition-transform">
          ☰
        </button>
        <h1 className="text-lg font-black tracking-widest text-[#b28a48] fantasy-font truncate max-w-[60%]">
          {campaign.locationName || 'Mythos Engine'}
        </h1>
        <div className="w-8"></div>
      </header>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSignOut={handleSignOut} 
        user={currentUser} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        mobileOpen={mobileSidebarOpen} 
        setMobileOpen={setMobileSidebarOpen} 
      />

      <main className={`flex-1 relative overflow-y-auto lg:h-full transition-all duration-300`}>
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-[calc(100vh-64px)] lg:min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} setCharacters={setCharacters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={true} dmModel="gemini-3-pro-preview" setDmModel={()=>{}} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={true} currentUser={currentUser} onBanish={(char) => banishToCairn('characters', char)} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} classes={classes} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={true} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'soul-cairn' && <SoulCairn graveyard={graveyard} onRestore={restoreFromCairn} onPurge={purgeFromCairn} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} onDeleteAccount={handleDeleteAccount} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={()=>{}} setIsHost={setIsHost} forceSync={()=>{}} kickSoul={()=>{}} rehostWithSigil={()=>{}} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign }} onImport={()=>{}} manifestBasics={manifestBasics} />}
        </div>
      </main>

      <div className="fixed top-20 lg:top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 border-l-4 rounded-sm shadow-2xl animate-notification pointer-events-auto bg-black/95 border ${n.type === 'error' ? 'border-red-900 text-red-400' : 'border-[#b28a48] text-[#b28a48]'} max-w-[280px] md:max-w-md`}>
            <p className="text-[10px] font-black uppercase tracking-widest">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
