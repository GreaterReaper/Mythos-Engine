
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

const REGISTRY_VERSION = 17; 

const MONTHLY_CONTENT = {
  version: "March-2025-v17-Dark-Knight-Order",
  classes: [
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Knights who cast away shields for heavy two-handed swords, igniting their inner aether with raw emotions to fuel dark magic and barriers.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 2, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Plate', '2H Swords', 'Dark Arcanum'], features: [
        { name: 'Living Dead', description: 'Survive fatal damage at 1 HP for 1 round. Gain massive health sap. If total healing received < Max HP by turn end, succeed a DC 15 Death Save or fall.' },
        { name: 'Living Shadow', description: 'Create a shadowy simulacrum that fights at your side for 2 rounds, mimicking your attacks.' },
        { name: 'Unstoppable Momentum', description: 'The weight of your greatsword allows you to move up to 10ft as part of an attack action.' },
        { name: 'Dark Arts Mastery', description: 'Enhance your next spell or ability with a burst of dark energy, dealing 1d10 extra necrotic damage.' },
        { name: 'Blackest Barrier', description: 'Grant yourself or an ally a temporary shield of darkness equal to 20% of your maximum health.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 1d8 necrotic damage from all adjacent foes and heal for half the total damage.' },
        { name: 'Edge of Shadow', level: 2, school: 'Evocation', description: 'A ranged wave of dark energy dealing 3d6 necrotic damage in a 15ft line.' },
        { name: 'The Blackest Night', level: 3, school: 'Abjuration', description: 'A powerful barrier that absorbs magical damage and bursts for force damage when broken.' }
      ], authorId: 'system', startingItemIds: ['itm-dk-greatsword', 'itm-dk-plate']
    },
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy. They pick a single enemy that is exposed to deal extra damage against.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Leather Armor', 'Bows', 'Fletching'], features: [
        { name: 'Sky Shot', description: 'Can shoot flying enemies out of the air with great accuracy, ignoring penalties for range or altitude.' },
        { name: 'Exposed Weakness', description: 'Designate one enemy as exposed. Deal an extra 1d8 damage on all hits against them this turn.' },
        { name: 'Lightfoot', description: 'Movement speed increased while wearing light armor. Can disengage as a bonus action.' },
        { name: 'Special Arrows', description: 'Can craft and use utility arrows (Fire, Ice, or Snaring) twice per encounter.' },
        { name: 'Rapid Fire', description: 'Once per turn, you can fire two arrows as a single action at the cost of -2 to accuracy.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-arch-bow', 'itm-leather-armor']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth who wear leather armors and use dual daggers. They can instantly execute human-sized enemies grappled by allies.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Leather Armor', 'Daggers', 'Stealth'], features: [
        { name: 'Dual Wielding', description: 'When attacking with a dagger, you can make an off-hand attack as a bonus action.' },
        { name: 'Instant Execution', description: 'Instantly slay a human-sized or smaller enemy that is currently grappled or restrained by an ally.' },
        { name: 'Smoke Bomb', description: 'Throw a bomb to create a 10ft cloud of heavily obscured terrain and move 15ft without provoking opportunity.' },
        { name: 'Silent Footsteps', description: 'Advantage on Stealth checks. While hidden, your first attack deals 2d6 extra damage.' },
        { name: 'Weak Point Insight', description: 'Attacks against enemies with less than half health have advantage.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-daggers', 'itm-leather-armor']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Masters of magic wielding long staves and robed attire. They excel at destructive magic and can commit a single spell to memory.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Robes', 'Staves', 'Arcana'], features: [
        { name: 'Destructive Magic', description: 'When you roll fire or force damage, you can reroll any 1s or 2s.' },
        { name: 'Spell Memory', description: 'Commit one spell to memory. Once per day, you may cast that spell without expending a slot.' },
        { name: 'Arcane Surge', description: 'Add your Intelligence modifier to the damage of any evocation spell.' },
        { name: 'Flowing Robes', description: 'While wearing robes, your AC is 12 + your Dexterity modifier.' },
        { name: 'Staff Resonance', description: 'While holding a staff, you gain +2 to your Spell Save DC.' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: 'A blinding explosion dealing 10d6 fire damage. Targets are blinded for 1 round.' },
        { name: 'Mana Burst', level: 1, school: 'Evocation', description: 'A cone of raw mana dealing 2d8 force damage.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', description: 'Create 3 duplicates of yourself to confuse attackers.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-staff', 'itm-robed-attire']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive spellcasters focused on healing and resonant buffs that target all nearby allies. They wear robes and use smaller staves.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Robes', 'Small Staves', 'Healing'], features: [
        { name: 'Resonant Buffs', description: 'When you cast a buff spell on one ally, it also affects all allies within 15 feet.' },
        { name: 'Divine Healing', description: 'Healing spells restore an additional 1d6 + Wisdom bonus.' },
        { name: 'Purification', description: 'As a bonus action, remove one negative status effect from an ally within 30 feet.' },
        { name: 'Soothing Aura', description: 'Allies within 20 feet gain 1d4 temporary HP at the start of their turn.' },
        { name: 'Saintly Resolve', description: 'Gain advantage on Concentration checks to maintain spells.' }
      ], initialSpells: [
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Grant an ally resistance to the next attack they receive.' },
        { name: 'Benediction', level: 3, school: 'Conjuration', description: 'Restore all HP to a single target. Usable once per day.' },
        { name: 'Regen', level: 2, school: 'Conjuration', description: 'Target heals 1d8 at the start of their next 3 turns.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-staff', 'itm-robed-attire']
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Front-line powerhouses wielding two-handed weapons and heavy plate. They invigorate allies with roars and can charge up massive attacks.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Armor', '2H Weapons', 'Athletics'], features: [
        { name: 'Invigorating Roar', description: 'Roar to grant yourself and allies within 30ft +2 to attack and damage rolls for 2 rounds.' },
        { name: 'Unstoppable Force', description: 'Naturally high resistance to being knocked prone or moved against your will.' },
        { name: 'Heavy Blows', description: 'Attacks with 2H weapons knock the target prone if they fail a Strength save.' },
        { name: 'Charged Attack', description: 'Spend one turn charging; your next attack deals double damage plus damage taken while charging.' },
        { name: 'Warrior Spirit', description: 'While below half health, gain resistance to bludgeoning, piercing, and slashing damage.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-war-greatsword', 'itm-full-plate']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Champions of the frontline who pair sword and shield with imposing plate armor. They can bash enemies to make them flinch.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['Plate Armor', 'Shields', 'Swords'], features: [
        { name: 'Shield Wall', description: 'As a reaction, grant yourself or an adjacent ally +5 AC against a single attack.' },
        { name: 'Shield Bash', description: 'Bash with the shield for 1d6 damage. Targets (except Gargantuan) must flinch (lose their next reaction).' },
        { name: 'Frontline Guardian', description: 'Enemies within 5ft have disadvantage on attacks against your allies.' },
        { name: 'Steel Resolve', description: 'Reroll a failed save against being Charmed or Frightened.' },
        { name: 'Master Duelist', description: 'Gain +2 to AC and Attack rolls when wielding a sword and shield.' }
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
    { id: 'itm-dk-greatsword', name: 'Claymore of the Order', type: 'Weapon' as const, description: 'A massive black sword that hums with aetheric resonance.', mechanics: [{ name: 'Vicious Strike', description: 'Crit on 19-20.' }], lore: 'Standard issue for the Dark Knight Order.', authorId: 'system' },
    { id: 'itm-dk-plate', name: 'Obsidian Guard', type: 'Armor' as const, description: 'Heavy plate armor that reflects no light.', mechanics: [{ name: 'Spirit Warding', description: 'Resistance to necrotic damage.' }], lore: 'Forged from the volcanic shards of the Grey Marches.', authorId: 'system' },
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
      const heroIds = MONTHLY_CONTENT.heroes.map(h => h.id);
      const filtered = prev.filter(c => !heroIds.includes(c.id));
      return [...filtered, ...MONTHLY_CONTENT.heroes as any[]];
    });
    notify("Chronicle Manifested. The Order has been Restored.", "success");
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
