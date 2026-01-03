
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, UserAccount, Graveyard } from './types';
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

const REGISTRY_VERSION = 16; 

const MONTHLY_CONTENT = {
  version: "March-2025-v16-Class-Expansion",
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy. They pick a single enemy that is exposed to deal extra damage against. They wear leather armor to stay well protected, and light on their feet.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Leather Armor', 'Bows', 'Fletching'], features: [
        { name: 'Sky Shot', description: 'Can shoot flying enemies out of the air with great accuracy.' },
        { name: 'Exposed Weakness', description: 'Pick a single exposed enemy to deal extra damage against.' },
        { name: 'Lightfoot', description: 'Movement speed increased while wearing light armor.' },
        { name: 'Special Arrows', description: 'Capable of crafting arrows with varied elemental and utility effects.' },
        { name: 'Rapid Fire', description: 'Once per turn, you can fire two arrows as a single action.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-arch-bow', 'itm-leather-armor']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth who wear leather armors and use dual daggers. They can instantly execute human-sized enemies grappled by allies or slip away in a cloud of smoke.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Leather Armor', 'Daggers', 'Stealth'], features: [
        { name: 'Dual Wielding', description: 'Can attack with two daggers as a single action.' },
        { name: 'Instant Execution', description: 'Can instantly execute a human-sized enemy or smaller that has been grappled by an ally.' },
        { name: 'Smoke Bomb', description: 'In a pinch, throw down a smoke bomb to slip away quietly.' },
        { name: 'Silent Footsteps', description: 'Advantage on stealth checks in shadows or dim light.' },
        { name: 'Poison Mastery', description: 'Can apply lethal toxins to daggers as a bonus action.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-daggers', 'itm-leather-armor']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Masters of magic wielding long staves and robed attire. They excel at destructive magic and can commit a single spell to memory for instant, free casting.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Robes', 'Staves', 'Arcana'], features: [
        { name: 'Destructive Magic', description: 'Spells that deal damage deal an additional 1d6 force damage.' },
        { name: 'Spell Memory', description: 'Commit a single spell to memory, making it free to cast instantly once per day.' },
        { name: 'Arcane Surge', description: 'Gain a temporary spell slot by sacrificing 5 HP.' },
        { name: 'Flowing Robes', description: 'AC equals 10 + Dex + Int while wearing robes and no shield.' },
        { name: 'Elemental Focus', description: 'Choose an element (Fire, Ice, Lightning); ignore resistance to that type.' }
      ], initialSpells: [
        { name: 'Fireball', level: 3, school: 'Evocation', description: 'A massive explosion of fire dealing 8d6 damage in a 20ft radius.' },
        { name: 'Magic Missile', level: 1, school: 'Evocation', description: 'Create three darts of force that strike targets automatically.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-staff', 'itm-robed-attire']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive spellcasters focused on healing and resonant buffs that target all nearby allies. They wear robes and use smaller staves as a casting focus.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Robes', 'Small Staves', 'Healing'], features: [
        { name: 'Resonant Buffs', description: 'Supportive spells target all allies within 30 feet instead of just one.' },
        { name: 'Divine Healing', description: 'Healing spells restore an additional 1d4 + Wisdom bonus.' },
        { name: 'Protective Aura', description: 'Grant allies within 10 feet +1 to all saving throws.' },
        { name: 'Staff Focus', description: 'Gain +1 to spell save DC while wielding a staff.' },
        { name: 'Beacon of Hope', description: 'Grant advantage on Wisdom saves and Death saves to one ally for 1 minute.' }
      ], initialSpells: [
        { name: 'Mass Healing Word', level: 3, school: 'Abjuration', description: 'Heals all allies within 60 feet for 1d4 + Wis.' },
        { name: 'Bless', level: 1, school: 'Enchantment', description: 'Grant three allies +1d4 to attack rolls and saves.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-staff', 'itm-robed-attire']
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Front-line powerhouses wielding two-handed weapons and heavy plate. They invigorate allies with roars and can charge up massive, devastating attacks.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Armor', '2H Weapons', 'Athletics'], features: [
        { name: 'Invigorating Roar', description: 'Roar to grant yourself and nearby allies 10 temporary HP.' },
        { name: 'Unstoppable Force', description: 'Naturally high resistance to being knocked prone.' },
        { name: 'Heavy Blows', description: 'Mighty blows easily knock even the toughest foes prone.' },
        { name: 'Charged Attack', description: 'Spend a turn charging; next attack grows stronger based on damage taken while readying.' },
        { name: 'Titan Guard', description: 'Can block physical damage with a 2H weapon as if it were a shield.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-war-greatsword', 'itm-full-plate']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Champions of the frontline who pair sword and shield with imposing plate armor. They can bash enemies to make them flinch, even the largest beasts.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['Plate Armor', 'Shields', 'Swords'], features: [
        { name: 'Shield Wall', description: 'Gain an additional +2 AC while wielding a shield.' },
        { name: 'Shield Bash', description: 'Bash with the shield for blunt damage, causing large beasts or smaller to flinch.' },
        { name: 'Frontline Guardian', description: 'As a reaction, take half damage meant for an adjacent ally.' },
        { name: 'Steel Resolve', description: 'Once per day, reroll a failed saving throw.' },
        { name: 'Master Duelist', description: 'Gain +2 to attack rolls while engaged with only one enemy.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-fig-sword', 'itm-fig-shield', 'itm-half-plate']
    }
  ],
  monsters: [
    { id: 'mon-goblin-scout', name: 'Goblin Scavenger', description: 'Wiry goblin scout.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Hide as bonus action.' }], authorId: 'system', size: 'Small' as const },
    { id: 'mon-bugbear-thug', name: 'Bugbear Brawler', description: 'Massive hairy goblinoid.', stats: { strength: 16, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 10, charisma: 8 }, hp: 35, ac: 15, abilities: [{ name: 'Surprise Attack', effect: '+2d6 on surprise.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-wraith', name: 'Spectral Wraith', description: 'A cold, flickering soul.', stats: { strength: 6, dexterity: 16, constitution: 10, intelligence: 12, wisdom: 12, charisma: 14 }, hp: 45, ac: 13, abilities: [{ name: 'Life Drain', effect: 'Target loses max HP.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-gorechimera', name: 'The Gorechimera', description: 'Legendary beast of the Marches.', stats: { strength: 22, dexterity: 12, constitution: 20, intelligence: 14, wisdom: 14, charisma: 12 }, hp: 220, ac: 19, isBoss: true, abilities: [{ name: 'Lions Roar', effect: 'AOE Fear.' }], authorId: 'system', size: 'Huge' as const }
  ],
  items: [
    { id: 'itm-arch-bow', name: 'Eagle-Sight Bow', type: 'Weapon' as const, description: 'A precision-crafted yew bow.', mechanics: [{ name: 'Sky-Shot Accuracy', description: '+2 to attack rolls against flying targets.' }], lore: 'Standard issue for elven marksmen.', authorId: 'system' },
    { id: 'itm-leather-armor', name: 'Treated Leather Scraps', type: 'Armor' as const, description: 'Lightweight armor providing flexibility.', mechanics: [{ name: 'Lightfoot', description: '+5ft to movement speed.' }], lore: 'Quiet and efficient.', authorId: 'system' },
    { id: 'itm-thief-daggers', name: 'Shadow Daggers', type: 'Weapon' as const, description: 'Paired obsidian daggers.', mechanics: [{ name: 'Executioner', description: '+2d6 sneak damage.' }], lore: 'For the quietest souls.', authorId: 'system' },
    { id: 'itm-sorc-staff', name: 'Archmage Staff', type: 'Weapon' as const, description: 'A long staff humming with mana.', mechanics: [{ name: 'Mana Flow', description: '+1 to spell attack rolls.' }], lore: 'Wielded by those who seek destruction.', authorId: 'system' },
    { id: 'itm-robed-attire', name: 'Aetheric Robes', type: 'Armor' as const, description: 'Silken robes that flow like water.', mechanics: [{ name: 'Arcane Warding', description: 'Resistance to magical force.' }], lore: 'Woven from moonthread.', authorId: 'system' },
    { id: 'itm-mage-staff', name: 'Resonant Rod', type: 'Weapon' as const, description: 'A small, ornate staff.', mechanics: [{ name: 'Healing Link', description: '+1d4 to healing spells.' }], lore: 'Radiates a calming aura.', authorId: 'system' },
    { id: 'itm-war-greatsword', name: 'Vanguard Greatsword', type: 'Weapon' as const, description: 'A massive blade requiring two hands.', mechanics: [{ name: 'Cleave', description: 'Deals 5 damage to adjacent enemies on a hit.' }], lore: 'Heavy and unyielding.', authorId: 'system' },
    { id: 'itm-full-plate', name: 'Royal Plate', type: 'Armor' as const, description: 'Complete set of steel plate armor.', mechanics: [{ name: 'Imposing Presence', description: 'Advantage on intimidation.' }], lore: 'Forged for heroes.', authorId: 'system' },
    { id: 'itm-fig-sword', name: 'Bastard Sword', type: 'Weapon' as const, description: 'A versatile steel sword.', mechanics: [{ name: 'Parry', description: '+1 AC against melee attacks.' }], lore: 'The weapon of a champion.', authorId: 'system' },
    { id: 'itm-fig-shield', name: 'Lion-Crest Shield', type: 'Armor' as const, description: 'A sturdy kite shield.', mechanics: [{ name: 'Block', description: '+2 AC.' }], lore: 'Held firm against the tide.', authorId: 'system' },
    { id: 'itm-half-plate', name: 'Steel Half-Plate', type: 'Armor' as const, description: 'Protective plate covering the vitals.', mechanics: [{ name: 'Reinforced', description: '+1 to AC.' }], lore: 'Balance of speed and defense.', authorId: 'system' }
  ],
  heroes: [
    { 
      id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "A timid human mage who clutches her holy symbol and worries for the party's safety. She speaks softly and seeks to heal every scratch.", level: 1, stats: { strength: 8, dexterity: 10, constitution: 12, intelligence: 13, wisdom: 16, charisma: 14 }, hp: 10, maxHp: 10, 
      feats: [], inventory: ['itm-mage-staff', 'itm-robed-attire'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf' as const, gender: 'Female' as const, gold: 50, 
      description: "An aloof and stoic elf archer. She is preternaturally calm and efficient, rarely speaking unless it concerns tactical advantage.", level: 1, stats: { strength: 10, dexterity: 16, constitution: 13, intelligence: 12, wisdom: 14, charisma: 8 }, hp: 11, maxHp: 11, 
      feats: [], inventory: ['itm-arch-bow', 'itm-leather-armor'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "A bold and energetic fighter. She is the first to charge into battle, shield held high, laughing in the face of danger.", level: 1, stats: { strength: 16, dexterity: 13, constitution: 14, intelligence: 8, wisdom: 12, charisma: 10 }, hp: 12, maxHp: 12, 
      feats: [], inventory: ['itm-fig-sword', 'itm-fig-shield', 'itm-half-plate'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    }
  ]
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('campaign');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const currentRegVersion = parseInt(localStorage.getItem('mythos_registry_version') || '0');
    if (currentRegVersion < REGISTRY_VERSION) {
      const accountsRaw = localStorage.getItem('mythos_accounts');
      if (accountsRaw) {
        const accounts: UserAccount[] = JSON.parse(accountsRaw);
        localStorage.setItem('mythos_accounts', JSON.stringify(accounts.map(a => ({...a, version: REGISTRY_VERSION}))));
      }
      localStorage.setItem('mythos_registry_version', REGISTRY_VERSION.toString());
      // On major version bump, we might want to clear old classes to force overwrite
      // But we merge instead in manifestBasics
    }
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
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
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

  const restoreFromCairn = (type: keyof Graveyard, entityId: string) => {
    const entity = graveyard[type].find((e: any) => e.id === entityId);
    if (!entity) return;
    const { deletedAt, ...restoredEntity } = entity as any;
    setGraveyard(prev => ({ ...prev, [type]: prev[type].filter((e: any) => e.id !== entityId) }));
    if (type === 'characters') setCharacters(prev => [...prev, restoredEntity]);
    if (type === 'classes') setClasses(prev => [...prev, restoredEntity]);
    if (type === 'monsters') setMonsters(prev => [...prev, restoredEntity]);
    if (type === 'items') setItems(prev => [...prev, restoredEntity]);
    notify(`${restoredEntity.name} manifest.`, 'success');
  };

  const purgeFromCairn = (type: keyof Graveyard, entityId: string) => {
    setGraveyard(prev => ({ ...prev, [type]: prev[type].filter((e: any) => e.id !== entityId) }));
    notify("Soul consumed.", "info");
  };

  const manifestBasics = useCallback(() => {
    setClasses(prev => {
      // Overwrite system classes, keep custom ones
      const systemIds = MONTHLY_CONTENT.classes.map(c => c.id);
      const filtered = prev.filter(c => !systemIds.includes(c.id));
      return [...filtered, ...MONTHLY_CONTENT.classes as any[]];
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
      // Overwrite system heroes, keep custom ones
      const heroIds = MONTHLY_CONTENT.heroes.map(h => h.id);
      const filtered = prev.filter(c => !heroIds.includes(c.id));
      return [...filtered, ...MONTHLY_CONTENT.heroes as any[]];
    });
    notify("Chronicle Manifested. Core Classes Overwritten.", "success");
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

  const initPeer = useCallback((id?: string) => {
    if (peerRef.current) peerRef.current.destroy();
    const p = id ? new Peer(id) : new Peer();
    peerRef.current = p;
    (p as any).on('open', setPeerId);
    (p as any).on('connection', (conn: any) => {
      conn.on('open', () => setConnections(prev => [...prev, conn]));
      conn.on('data', (data: any) => {
        const msg = data as SyncMessage;
        if (msg.type === 'STATE_UPDATE' && msg.payload.campaign) setCampaign(msg.payload.campaign);
        if (msg.type === 'NEW_LOG') setCampaign(prev => ({ ...prev, logs: [...prev.logs, msg.payload] }));
      });
    });
  }, []);

  useEffect(() => { if (currentUser) initPeer(); }, [currentUser, initPeer]);

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={handleSignOut} user={currentUser} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
      <main className="flex-1 relative overflow-y-auto pt-[calc(48px+var(--safe-top))] lg:pt-0">
        <div className="p-3 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} setCharacters={setCharacters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={true} dmModel="gemini-3-pro-preview" setDmModel={()=>{}} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={true} currentUser={currentUser} onBanish={(char) => banishToCairn('characters', char)} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} items={items} setItems={setItems} onBanish={(cls) => banishToCairn('classes', cls)} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} onBanish={(mon) => banishToCairn('monsters', mon)} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} onBanish={(itm) => banishToCairn('items', itm)} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={true} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'soul-cairn' && <SoulCairn graveyard={graveyard} onRestore={restoreFromCairn} onPurge={purgeFromCairn} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} onDeleteAccount={()=>{}} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={(id) => { setIsHost(false); initPeer(); peerRef.current?.connect(id); }} setIsHost={setIsHost} forceSync={()=>{}} kickSoul={()=>{}} rehostWithSigil={initPeer} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign }} onImport={()=>{}} onCloudSync={()=>{}} onMigrationExport={() => ''} onFileExport={()=>{}} manifestBasics={manifestBasics} />}
        </div>
      </main>
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">{notifications.map(n => (<div key={n.id} className={`p-4 border-l-4 rounded-sm shadow-2xl animate-notification pointer-events-auto bg-black border ${n.type === 'error' ? 'border-red-900 text-red-400' : 'border-[#b28a48] text-[#b28a48]'}`}><p className="text-[10px] font-black uppercase tracking-widest">{n.message}</p></div>))}</div>
    </div>
  );
};

export default App;
