
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

const REGISTRY_VERSION = 26; 

const MONTHLY_CONTENT = {
  version: "March-2025-v26-Tactical-Overhaul",
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy. They may pick a single enemy that is exposed to deal extra damage against. They wear leather armor to stay well protected, and light on their feet. They have special arrows capable of many things.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Bows', 'Leather Armor', 'Perception'], features: [
        { name: 'Sky Shot', description: 'Shoot flying enemies with perfect accuracy, ignoring range penalties.' },
        { name: 'Exposed Weakness', description: 'Deal +1d8 damage to a target currently engaged by an ally.' },
        { name: 'Lightfoot', description: '+2 AC while moving at least 20ft in light armor.' },
        { name: 'Special Arrows', description: 'Action: Use Fire (AOE), Ice (Slow), or Force (Knockback) arrows.' },
        { name: 'Rapid Fire', description: 'Fire twice as a single action, but with -2 to each attack roll.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-arch-bow-1', 'itm-scout-leather']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth the thief wears leather armors and uses dual daggers. They can instantly execute a human sized enemy or smaller that have been grappled by an ally. In a pinch they can throw down a smoke bomb to slip sway quietly to pick off weaker targets.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Daggers', 'Stealth', 'Leather Armor'], features: [
        { name: 'Cunning Stealth', description: 'Hide as a bonus action even if partially observed.' },
        { name: 'Instant Execution', description: 'Instantly slay a human-sized or smaller enemy grappled by an ally.' },
        { name: 'Smoke Bomb', description: 'Drop a cloud to gain instant invisibility and move 15ft.' },
        { name: 'Dual Wielding', description: 'When attacking with a dagger, make an off-hand attack for free.' },
        { name: 'Poison Mastery', description: 'Coated blades deal 1d4 periodic damage for 3 turns on hit.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-dags-1', 'itm-scout-leather']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Masters of magic wielding a long staff and robed attire. They excel at highly destructive magic. They can commit a single spell to memory making it free to cast instantly including the grandest of their spells.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Staves', 'Robes', 'Arcana'], features: [
        { name: 'Destructive Magic', description: 'Damaging spells deal an additional die of damage.' },
        { name: 'Spell Memory', description: 'Commit one spell to memory; it becomes free to cast once per day.' },
        { name: 'Arcane Surge', description: 'Sacrifice 5 HP to increase spell DC by 3 for one turn.' },
        { name: 'Flowing Robes', description: 'AC is 13 + Dex modifier while wearing only robes.' },
        { name: 'Elemental Focus', description: 'Ignore resistances to your chosen primary element.' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: '10d6 fire damage in a 20ft radius.' },
        { name: 'Mana Burst', level: 1, school: 'Evocation', description: '2d8 force damage in a 15ft cone.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', description: 'Create 3 duplicates of yourself.' },
        { name: 'Chain Lightning', level: 3, school: 'Evocation', description: 'Arc electricity between 3 targets.' },
        { name: 'Arcane Shield', level: 1, school: 'Abjuration', description: '+5 AC until start of next turn.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-staff-1', 'itm-sage-robes']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Spell casters focusing on supportive magics and healing their allies. While casting buffs they target all allies within range. They primarily wear robes and use smaller staves.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Small Staves', 'Robes', 'Medicine'], features: [
        { name: 'Resonant Buffs', description: 'Single-target buffs automatically spread to all allies within 15ft.' },
        { name: 'Divine Healing', description: 'Heals restore max health to targets below 25% HP.' },
        { name: 'Protective Aura', description: 'Allies within 10ft gain +1 to all Saving Throws.' },
        { name: 'Staff Focus', description: 'Add your Wisdom modifier to all healing done.' },
        { name: 'Beacon of Hope', description: 'Grant one ally advantage on all rolls for 2 rounds.' }
      ], initialSpells: [
        { name: 'Mass Regen', level: 3, school: 'Conjuration', description: 'Heal all allies for 1d8 every turn.' },
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield an ally from 10 points of damage.' },
        { name: 'Benediction', level: 3, school: 'Evocation', description: 'Restore all HP to one target.' },
        { name: 'Bless', level: 1, school: 'Enchantment', description: '+1d4 to attack/saves for 3 allies.' },
        { name: 'Spirit Link', level: 2, school: 'Divination', description: 'Share damage between two allies.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-wand-1', 'itm-healer-robes']
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Warriors wield mighty two-handed swords and hammers. They take to the front line invigorating themselves and allies with a mighty roar. They wear equally imposing full plate armor and have naturally higher resistance to being knocked prone.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Weapons', 'Heavy Armor', 'Athletics'], features: [
        { name: 'Invigorating Roar', description: 'Allies within 30ft gain 10 Temp HP and Fear immunity.' },
        { name: 'Unstoppable Force', description: 'Immunity to being knocked prone by Large or smaller foes.' },
        { name: 'Heavy Blows', description: 'Melee hits knock Medium/Smaller foes prone (DC 15 Str save).' },
        { name: 'Charged Attack', description: 'Triple damage next turn; more likely to be targeted while charging.' },
        { name: 'Warrior Spirit', description: 'Heal 1d10 HP whenever you kill a worthy foe.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-war-claymore-1', 'itm-full-plate-1']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Champion of the frontline, taking the brunt of the damage with their shield held firm. They wield one handed swords and maces paired with a shield. they wear full or half plate armor and get bonus armor from the shield.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['1H Weapons', 'Shields', 'Plate Armor'], features: [
        { name: 'Shield Wall', description: 'Passive +2 AC bonus to yourself and adjacent allies.' },
        { name: 'Shield Bash', description: 'Bash for 1d6+Str damage; target flinches (loses reaction).' },
        { name: 'Frontline Guardian', description: 'Intercept an attack meant for an ally within 5ft.' },
        { name: 'Steel Resolve', description: 'Ignore effects of one status condition for 1 minute.' },
        { name: 'Master Duelist', description: 'Gain +2 to hit while no other allies are within 5ft of your target.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-fig-sword-1', 'itm-fig-shield-1', 'itm-half-plate-1']
    },
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Knights who prefer heavy two-handed swords. They ignite the aether in their bodies with raw emotions, allowing them to use dark magic to drain life or create barriers. Trained to control emotions, they have a cold, chilling tone.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 2, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Swords', 'Heavy Armor', 'Intimidation'], features: [
        { name: 'Momentum Blade', description: 'Move 10ft for free after every successful melee hit.' },
        { name: 'Living Dead', description: 'Survive fatal damage at 1 HP. Receive healing = Max HP or die.' },
        { name: 'Living Shadow', description: 'Summon a shadowy twin for 2 rounds to repeat your actions.' },
        { name: 'Dark Arts Mastery', description: 'Sacrifice 5 HP to guarantee your next hit deals max damage.' },
        { name: 'Blackest Barrier', description: 'Grant an ally a 20 HP barrier that heals you if broken.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 1d8 HP from all enemies within 5ft.' },
        { name: 'Edge of Shadow', level: 2, school: 'Evocation', description: '30ft line of necrotic energy (4d6).' },
        { name: 'The Blackest Night', level: 3, school: 'Abjuration', description: 'Shield = 25% Max HP. Grant Dark Arts if broken.' },
        { name: 'Soul Tether', level: 1, school: 'Necromancy', description: 'Link to enemy; they take damage when you do.' },
        { name: 'Dark Passenger', level: 2, school: 'Evocation', description: 'Wave of darkness blinds targets in a 15ft cone.' }
      ], authorId: 'system', startingItemIds: ['itm-dk-blade-1', 'itm-dk-plate-1']
    }
  ],
  monsters: [
    { id: 'mon-goblin-scout', name: 'Goblin Scavenger', description: 'A wiry scout.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Disengage/Hide as bonus action.' }], authorId: 'system', size: 'Small' as const },
    { id: 'mon-skeleton', name: 'Crypt Skeleton', description: 'Rattling bones.', stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 }, hp: 13, ac: 13, abilities: [{ name: 'Undead Resolve', effect: 'Resistant to piercing.' }], authorId: 'system', size: 'Medium' as const }
  ],
  items: [
    { id: 'itm-arch-bow-1', name: 'Huntsman Bow', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d8', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'Reliable ash wood.', mechanics: [], lore: 'Scout issue.', authorId: 'system' },
    { id: 'itm-thief-dags-1', name: 'Twin Stingers', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d4', damageType: 'Piercing', classRestrictions: ['cls-thief'], description: 'Lightweight blades.', mechanics: [], lore: 'Silent tools.', authorId: 'system' },
    { id: 'itm-scout-leather', name: 'Scout Leathers', type: 'Armor' as const, rarity: 'Common' as const, ac: 11, classRestrictions: ['cls-archer', 'cls-thief'], description: 'Flexible hide.', mechanics: [], lore: 'Mass produced.', authorId: 'system' },
    { id: 'itm-sorc-staff-1', name: 'Long Oak Staff', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d6', damageType: 'Bludgeoning', classRestrictions: ['cls-sorcerer'], description: 'Focus staff.', mechanics: [], lore: 'Student focus.', authorId: 'system' },
    { id: 'itm-sage-robes', name: 'Sage Robes', type: 'Armor' as const, rarity: 'Common' as const, ac: 10, classRestrictions: ['cls-sorcerer', 'cls-mage'], description: 'Plain blue silk.', mechanics: [], lore: 'Academic wear.', authorId: 'system' },
    { id: 'itm-mage-wand-1', name: 'Willow Wand', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d4', damageType: 'Force', classRestrictions: ['cls-mage'], description: 'Supple wand.', mechanics: [], lore: 'Healer focus.', authorId: 'system' },
    { id: 'itm-healer-robes', name: 'Healer Vestments', type: 'Armor' as const, rarity: 'Common' as const, ac: 11, classRestrictions: ['cls-mage'], description: 'Blessed cloth.', mechanics: [], lore: 'Order issue.', authorId: 'system' },
    { id: 'itm-war-claymore-1', name: 'Steel Claymore', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '2d6', damageType: 'Slashing', classRestrictions: ['cls-warrior', 'cls-dark-knight'], description: 'Massive sword.', mechanics: [], lore: 'Vanguard standard.', authorId: 'system' },
    { id: 'itm-full-plate-1', name: 'Full Plate', type: 'Armor' as const, rarity: 'Common' as const, ac: 18, classRestrictions: ['cls-warrior', 'cls-dark-knight', 'cls-fighter'], description: 'Solid steel.', mechanics: [], lore: 'Heavy protection.', authorId: 'system' },
    { id: 'itm-fig-sword-1', name: 'Arming Sword', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d8', damageType: 'Slashing', classRestrictions: ['cls-fighter'], description: 'Reliable blade.', mechanics: [], lore: 'Military standard.', authorId: 'system' },
    { id: 'itm-fig-shield-1', name: 'Heater Shield', type: 'Armor' as const, rarity: 'Common' as const, ac: 2, classRestrictions: ['cls-fighter'], description: 'Reinforced steel.', mechanics: [], lore: 'Fighter basic.', authorId: 'system' },
    { id: 'itm-half-plate-1', name: 'Half Plate', type: 'Armor' as const, rarity: 'Common' as const, ac: 15, classRestrictions: ['cls-fighter'], description: 'Partial coverage.', mechanics: [], lore: 'Veteran gear.', authorId: 'system' },
    { id: 'itm-dk-blade-1', name: 'Soul-Reaper', type: 'Weapon' as const, rarity: 'Rare' as const, damageRoll: '2d6', damageType: 'Necrotic', classRestrictions: ['cls-dark-knight'], description: 'Blackened edge.', mechanics: [], lore: 'Order relic.', authorId: 'system' },
    { id: 'itm-dk-plate-1', name: 'Gloom Plate', type: 'Armor' as const, rarity: 'Rare' as const, ac: 18, classRestrictions: ['cls-dark-knight'], description: 'Void-stained steel.', mechanics: [], lore: 'Dark Knight uniform.', authorId: 'system' }
  ],
  heroes: [
    { 
      id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "A timid human mage with a soft voice.", level: 1, stats: { strength: 8, dexterity: 12, constitution: 13, intelligence: 14, wisdom: 16, charisma: 14 }, hp: 10, maxHp: 10, 
      feats: [
        { name: 'Resonant Buffs', description: 'Buffs spread to allies within 15ft.' },
        { name: 'Divine Healing', description: 'Heals restore max HP to low targets.' },
        { name: 'Protective Aura', description: '+1 to saves for allies near you.' },
        { name: 'Staff Focus', description: 'Wisdom bonus to healing.' },
        { name: 'Beacon of Hope', description: 'Grant advantage to one ally.' }
      ], 
      knownSpells: [
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield 10 damage.' },
        { name: 'Bless', level: 1, school: 'Enchantment', description: '+1d4 to rolls.' }
      ],
      inventory: ['itm-mage-wand-1', 'itm-healer-robes'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf' as const, gender: 'Female' as const, gold: 50, 
      description: "A stoic elf archer.", level: 1, stats: { strength: 10, dexterity: 18, constitution: 12, intelligence: 12, wisdom: 15, charisma: 8 }, hp: 11, maxHp: 11, 
      feats: [
        { name: 'Sky Shot', description: 'Perfect accuracy on flyers.' },
        { name: 'Exposed Weakness', description: '+1d8 bonus damage.' },
        { name: 'Lightfoot', description: '+2 AC while moving.' },
        { name: 'Special Arrows', description: 'Fire/Ice/Force effects.' },
        { name: 'Rapid Fire', description: 'Fire twice with penalty.' }
      ], 
      inventory: ['itm-arch-bow-1', 'itm-scout-leather'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "An energetic human fighter.", level: 1, stats: { strength: 16, dexterity: 14, constitution: 16, intelligence: 8, wisdom: 10, charisma: 12 }, hp: 12, maxHp: 12, 
      feats: [
        { name: 'Shield Wall', description: '+2 AC to self and allies.' },
        { name: 'Shield Bash', description: '1d6 damage and flinch.' },
        { name: 'Frontline Guardian', description: 'Intercept attacks.' },
        { name: 'Steel Resolve', description: 'Ignore status effects.' },
        { name: 'Master Duelist', description: '+2 to hit 1v1.' }
      ], 
      inventory: ['itm-fig-sword-1', 'itm-fig-shield-1', 'itm-half-plate-1'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    }
  ],
  initialCampaign: {
    plot: "The Grey Marches have been swallowed by a spectral fog. Shadows move within.",
    summary: "You meet Miri, Lina, and Seris at the Rusty Tankard Tavern. They need a fourth to hunt goblins in the mist.",
    locationName: "Rusty Tankard Tavern",
    rules: [
      { id: 'rule-1', category: 'Combat', name: 'Momentum', content: 'Moving 10ft adds +2 damage.' }
    ]
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

  // Implemented banishToCairn, restoreFromCairn, and purgeFromCairn to handle the Soul Cairn mechanics.
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
      <main className={`flex-1 relative overflow-y-auto pt-16 lg:pt-0 transition-all duration-300`}>
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} setCharacters={setCharacters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={true} dmModel="gemini-3-pro-preview" setDmModel={()=>{}} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={true} currentUser={currentUser} onBanish={(char) => banishToCairn('characters', char)} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} classes={classes} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={true} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'soul-cairn' && <SoulCairn graveyard={graveyard} onRestore={restoreFromCairn} onPurge={purgeFromCairn} />}
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
