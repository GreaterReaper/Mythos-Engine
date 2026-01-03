
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

const REGISTRY_VERSION = 25; 

const MONTHLY_CONTENT = {
  version: "March-2025-v25-Archetype-Overhaul",
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy. They pick a single enemy that is exposed to deal extra damage against. They wear leather armor to stay well protected, and light on their feet. They have special arrows capable of many things.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Bows', 'Leather Armor', 'Perception'], features: [
        { name: 'Sky Shot', description: 'Shoot flying enemies with perfect accuracy, ignoring range penalties.' },
        { name: 'Exposed Weakness', description: 'Once per turn, deal 1d8 bonus damage to a target currently engaged by an ally.' },
        { name: 'Lightfoot', description: '+2 AC while moving at least 20ft in light armor.' },
        { name: 'Special Arrows', description: 'As a bonus action, coat an arrow in Fire (AOE), Ice (Slow), or Force (Knockback) energy.' },
        { name: 'Rapid Fire', description: 'Fire two arrows as a single action, but with -2 to each attack roll.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-arch-1', 'itm-arch-2']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth who use dual daggers. They can instantly execute human-sized enemies or smaller that have been grappled by an ally. In a pinch they can throw down a smoke bomb to slip sway quietly to pick off weaker targets.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Daggers', 'Stealth', 'Leather Armor'], features: [
        { name: 'Cunning Stealth', description: 'Bonus action to Hide even while in plain sight using nearby shadows.' },
        { name: 'Instant Execution', description: 'If a human-sized enemy is grappled by an ally, use an action to instantly slay them (DC 15 Dex save for boss).' },
        { name: 'Smoke Bomb', description: 'Drop a smoke cloud; gain instant invisibility and move 15ft without provoking attacks.' },
        { name: 'Dual Wielding', description: 'When attacking with a dagger, make a second attack with your off-hand dagger for free.' },
        { name: 'Poison Mastery', description: 'Coated blades deal 1d4 poison damage per turn for 3 turns on hit.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-1', 'itm-thief-2']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Masters of magic wielding long staves and robes. They excel at highly destructive magic and can commit a single spell to memory making it free to cast instantly.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Long Staves', 'Robes', 'Arcana'], features: [
        { name: 'Destructive Magic', description: 'Damaging spells deal an additional die of damage.' },
        { name: 'Spell Memory', description: 'Commit one spell to memory; it becomes free to cast once per day (No Slot Cost).' },
        { name: 'Arcane Surge', description: 'Sacrifice 5 HP to increase the DC of your next spell by 3.' },
        { name: 'Flowing Robes', description: 'AC equals 13 + Dexterity modifier while wearing only robes.' },
        { name: 'Elemental Focus', description: 'Ignore resistances to your chosen primary element (Fire, Ice, or Storm).' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: '10d6 fire damage in a 20ft radius.' },
        { name: 'Mana Burst', level: 1, school: 'Evocation', description: '2d8 force damage in a 15ft cone.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', description: 'Create 3 duplicates to confuse attackers.' },
        { name: 'Chain Lightning', level: 3, school: 'Evocation', description: 'Arc electricity between 3 targets for 8d6 damage.' },
        { name: 'Arcane Shield', level: 1, school: 'Abjuration', description: 'Reaction: +5 AC until start of next turn.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-1', 'itm-sorc-2']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive spellcasters focused on healing and resonant buffs that target all nearby allies. They wear robes and use smaller staves.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Small Staves', 'Robes', 'Insight'], features: [
        { name: 'Resonant Buffs', description: 'Single-target buffs automatically spread to all allies within 15ft.' },
        { name: 'Divine Healing', description: 'Healing spells restore an additional 2d6 HP to targets below 25% health.' },
        { name: 'Protective Aura', description: 'Allies within 10ft gain a +1 bonus to all Saving Throws.' },
        { name: 'Staff Focus', description: 'Add your Wisdom modifier to all healing done with a staff focus.' },
        { name: 'Beacon of Hope', description: 'Grant one ally advantage on all rolls for 2 rounds (1/day).' }
      ], initialSpells: [
        { name: 'Mass Regen', level: 3, school: 'Conjuration', description: 'Heal all allies for 1d8 every turn for 3 turns.' },
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield an ally from 10 points of damage.' },
        { name: 'Benediction', level: 3, school: 'Evocation', description: 'Target recovers all health instantly (1/day).' },
        { name: 'Bless', level: 1, school: 'Enchantment', description: '+1d4 to attack and saves for 3 allies.' },
        { name: 'Spirit Link', level: 2, school: 'Divination', description: 'Share half of damage taken between two linked allies.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-1', 'itm-mage-2']
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Warriors wield mighty two-handed swords and hammers. They invigorate themselves and allies with a mighty roar. They wear full plate and are resistant to being knocked prone.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Weapons', 'Heavy Armor', 'Athletics'], features: [
        { name: 'Invigorating Roar', description: 'Action: All allies within 30ft gain 10 Temp HP and Fear immunity.' },
        { name: 'Unstoppable Force', description: 'Immunity to being knocked prone or pushed by Large or smaller foes.' },
        { name: 'Heavy Blows', description: 'Melee hits knock Medium or smaller targets prone (DC 15 Str save).' },
        { name: 'Charged Attack', description: 'Charge for 1 turn; triple damage next hit. Targeted more while charging.' },
        { name: 'Warrior Spirit', description: 'Heal 1d10 HP whenever you reduce an enemy to 0 HP.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-war-1', 'itm-war-2']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Champion of the frontline, taking the brunt of the damage with their shield held firm. They wield one-handed swords and maces with a shield.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['1H Weapons', 'Shields', 'Heavy Armor'], features: [
        { name: 'Shield Wall', description: 'Passive +2 AC bonus to yourself and any adjacent ally.' },
        { name: 'Shield Bash', description: 'Bash for 1d6+Str damage and cause "Flinch" (target loses next reaction).' },
        { name: 'Frontline Guardian', description: 'Intercept an attack meant for an ally within 5ft once per round.' },
        { name: 'Steel Resolve', description: 'Ignore effects of one status condition for 1 minute (1/day).' },
        { name: 'Master Duelist', description: 'Gain +2 to hit while no other allies are within 5ft of your target.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-fig-1', 'itm-fig-2', 'itm-fig-3']
    },
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Knights who preference heavy two-handed swords and dark magic. They ignite inner aether with raw emotions to fuel barriers and life-draining strikes.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 2, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Swords', 'Heavy Armor', 'Intimidation'], features: [
        { name: 'Momentum Blade', description: 'Move 10ft for free after every successful melee hit.' },
        { name: 'Living Dead', description: 'Survive fatal damage at 1 HP. Receive healing = Max HP or die (DC 15 save).' },
        { name: 'Living Shadow', description: 'Summon a shadowy twin for 2 rounds that repeats your damaging actions.' },
        { name: 'Dark Arts Mastery', description: 'Sacrifice 5 HP to guarantee your next melee hit deals maximum damage.' },
        { name: 'Blackest Barrier', description: 'Grant an ally a dark barrier that absorbs 20 damage and heals you for half.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 1d8 HP from all enemies within 5ft.' },
        { name: 'Edge of Shadow', level: 2, school: 'Evocation', description: '30ft line of necrotic energy dealing 4d6 damage.' },
        { name: 'The Blackest Night', level: 3, school: 'Abjuration', description: 'Shield = 25% Max HP. Grant Dark Arts if broken.' },
        { name: 'Soul Tether', level: 1, school: 'Necromancy', description: 'Link to an enemy; they take 2 necrotic damage whenever you take damage.' },
        { name: 'Dark Passenger', level: 2, school: 'Evocation', description: 'Wave of darkness blinds all targets in a 15ft cone.' }
      ], authorId: 'system', startingItemIds: ['itm-dk-1', 'itm-dk-2']
    }
  ],
  monsters: [
    { id: 'mon-goblin-scout', name: 'Goblin Scavenger', description: 'A wiry scout with a rusted blade.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Disengage/Hide as bonus action.' }], authorId: 'system', size: 'Small' as const },
    { id: 'mon-skeleton', name: 'Crypt Skeleton', description: 'Rattling bones in ancient armor.', stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 }, hp: 13, ac: 13, abilities: [{ name: 'Undead Resolve', effect: 'Resistant to piercing.' }], authorId: 'system', size: 'Medium' as const }
  ],
  items: [
    // Archer Gear
    { id: 'itm-arch-1', name: 'Recurve Bow', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d8', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'Standard infantry bow.', mechanics: [], lore: 'Mass produced for the scouts.', authorId: 'system' },
    { id: 'itm-arch-2', name: 'Scout Leathers', type: 'Armor' as const, rarity: 'Common' as const, ac: 11, classRestrictions: ['cls-archer', 'cls-thief'], description: 'Light cured hide.', mechanics: [], lore: 'Flexible and quiet.', authorId: 'system' },
    { id: 'itm-arch-rare', name: 'Eagle-Sight Longbow', type: 'Weapon' as const, rarity: 'Rare' as const, damageRoll: '1d10', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'Blessed by the wind.', mechanics: [{ name: 'Farshot', description: 'Ignore long-range disadvantage.' }], lore: 'Wielded by elven kings.', authorId: 'system' },
    
    // Thief Gear
    { id: 'itm-thief-1', name: 'Dual Wakizashi', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d6', damageType: 'Slashing', classRestrictions: ['cls-thief'], description: 'Paired steel blades.', mechanics: [], lore: 'Silent and sharp.', authorId: 'system' },
    { id: 'itm-thief-2', name: 'Nightshade Cloak', type: 'Armor' as const, rarity: 'Rare' as const, ac: 12, classRestrictions: ['cls-thief'], description: 'A cloak that eats light.', mechanics: [{ name: 'Shadow-Meld', description: 'Advantage on Stealth in darkness.' }], lore: 'Belonged to a master assassin.', authorId: 'system' },
    
    // Sorcerer Gear
    { id: 'itm-sorc-1', name: 'Crystal Staff', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d6', damageType: 'Bludgeoning', classRestrictions: ['cls-sorcerer'], description: 'Quartz tipped oak.', mechanics: [], lore: 'A student\'s focus.', authorId: 'system' },
    { id: 'itm-sorc-2', name: 'Arcane Robes', type: 'Armor' as const, rarity: 'Common' as const, ac: 10, classRestrictions: ['cls-sorcerer', 'cls-mage'], description: 'Plain blue silk.', mechanics: [], lore: 'Academy standard.', authorId: 'system' },
    { id: 'itm-sorc-epic', name: 'Staff of Eternal Flare', type: 'Weapon' as const, rarity: 'Epic' as const, damageRoll: '1d8', damageType: 'Fire', classRestrictions: ['cls-sorcerer'], description: 'Always warm to the touch.', mechanics: [{ name: 'Fire-Eater', description: 'Fire spells deal +5 damage.' }], lore: 'Forged in a volcanic heart.', authorId: 'system' },
    
    // Mage Gear
    { id: 'itm-mage-1', name: 'Willow Wand', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d4', damageType: 'Force', classRestrictions: ['cls-mage'], description: 'Supple wand.', mechanics: [], lore: 'Healer\'s tool.', authorId: 'system' },
    { id: 'itm-mage-2', name: 'Healer\'s Attire', type: 'Armor' as const, rarity: 'Uncommon' as const, ac: 11, classRestrictions: ['cls-mage'], description: 'Reinforced vestments.', mechanics: [{ name: 'Life-Channel', description: '+2 to all healing rolls.' }], lore: 'Blessed by the Order.', authorId: 'system' },
    
    // Warrior Gear
    { id: 'itm-war-1', name: 'Steel Claymore', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '2d6', damageType: 'Slashing', classRestrictions: ['cls-warrior', 'cls-dark-knight'], description: 'Massive blade.', mechanics: [], lore: 'Standard vanguard sword.', authorId: 'system' },
    { id: 'itm-war-2', name: 'Vanguard Plate', type: 'Armor' as const, rarity: 'Common' as const, ac: 18, classRestrictions: ['cls-warrior', 'cls-dark-knight', 'cls-fighter'], description: 'Heavy steel plates.', mechanics: [], lore: 'Full body protection.', authorId: 'system' },
    
    // Fighter Gear
    { id: 'itm-fig-1', name: 'Gladius', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d8', damageType: 'Slashing', classRestrictions: ['cls-fighter'], description: 'Reliable shortsword.', mechanics: [], lore: 'Iron age military.', authorId: 'system' },
    { id: 'itm-fig-2', name: 'Tower Shield', type: 'Armor' as const, rarity: 'Uncommon' as const, ac: 3, classRestrictions: ['cls-fighter'], description: 'Full body shield.', mechanics: [{ name: 'Solid Cover', description: '+2 to Dex saves vs AOE.' }], lore: 'Heavy and protective.', authorId: 'system' },
    { id: 'itm-fig-3', name: 'Half Plate', type: 'Armor' as const, rarity: 'Common' as const, ac: 15, classRestrictions: ['cls-fighter'], description: 'Partial plate.', mechanics: [], lore: 'Mercenary standard.', authorId: 'system' },
    
    // Dark Knight Gear
    { id: 'itm-dk-1', name: 'Sunder of Souls', type: 'Weapon' as const, rarity: 'Epic' as const, damageRoll: '2d6', damageType: 'Necrotic', classRestrictions: ['cls-dark-knight'], description: 'Blackened edge.', mechanics: [{ name: 'Soul-Reap', description: 'Deals 2 necrotic on hit.' }], lore: 'Relic of the Dark Order.', authorId: 'system' },
    { id: 'itm-dk-2', name: 'Gloom Armor', type: 'Armor' as const, rarity: 'Rare' as const, ac: 18, classRestrictions: ['cls-dark-knight'], description: 'Absorbs all color.', mechanics: [{ name: 'Intimidating', description: '+2 to Intimidation.' }], lore: 'Frightening visage.', authorId: 'system' },
    
    // Legendary Multi-class Gear
    { id: 'itm-leg-1', name: 'Sunder of Eternity', type: 'Weapon' as const, rarity: 'Legendary' as const, damageRoll: '3d10', damageType: 'Force', classRestrictions: [], description: 'A blade from two timelines.', mechanics: [{ name: 'Chronoshift', description: 'Attack twice on a critical hit.' }], lore: 'Architect\'s own weapon.', authorId: 'system' }
  ],
  heroes: [
    { 
      id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "A timid human mage with a soft voice. She clutches her willow wand tightly when nervous.", level: 1, stats: { strength: 8, dexterity: 12, constitution: 13, intelligence: 14, wisdom: 16, charisma: 14 }, hp: 10, maxHp: 10, 
      feats: [
        { name: 'Resonant Buffs', description: 'Single-target buffs automatically spread to all allies within 15ft.' },
        { name: 'Divine Healing', description: 'Healing spells restore an additional 2d6 HP to targets below 25% health.' },
        { name: 'Protective Aura', description: 'Allies within 10ft gain a +1 bonus to all Saving Throws.' },
        { name: 'Staff Focus', description: 'Add your Wisdom modifier to all healing done with a staff focus.' },
        { name: 'Beacon of Hope', description: 'Grant one ally advantage on all rolls for 2 rounds (1/day).' }
      ], 
      knownSpells: [
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield an ally from 10 points of damage.' },
        { name: 'Bless', level: 1, school: 'Enchantment', description: '+1d4 to attack and saves for 3 allies.' },
        { name: 'Spirit Link', level: 2, school: 'Divination', description: 'Share half of damage taken between two linked allies.' }
      ],
      inventory: ['itm-mage-1', 'itm-mage-2'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf' as const, gender: 'Female' as const, gold: 50, 
      description: "A stoic elf archer. Aloof and logical, she views combat as a simple equation of distance and precision.", level: 1, stats: { strength: 10, dexterity: 18, constitution: 12, intelligence: 12, wisdom: 15, charisma: 8 }, hp: 11, maxHp: 11, 
      feats: [
        { name: 'Sky Shot', description: 'Shoot flying enemies with perfect accuracy, ignoring range penalties.' },
        { name: 'Exposed Weakness', description: 'Once per turn, deal 1d8 bonus damage to a target currently engaged by an ally.' },
        { name: 'Lightfoot', description: '+2 AC while moving at least 20ft in light armor.' },
        { name: 'Special Arrows', description: 'As a bonus action, coat an arrow in Fire (AOE), Ice (Slow), or Force (Knockback) energy.' },
        { name: 'Rapid Fire', description: 'Fire two arrows as a single action, but with -2 to each attack roll.' }
      ], 
      inventory: ['itm-arch-1', 'itm-arch-2'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "An energetic human fighter. She loves the thrill of the front line and emboldens her friends with her bravery.", level: 1, stats: { strength: 16, dexterity: 14, constitution: 16, intelligence: 8, wisdom: 10, charisma: 12 }, hp: 12, maxHp: 12, 
      feats: [
        { name: 'Shield Wall', description: 'Passive +2 AC bonus to yourself and any adjacent ally.' },
        { name: 'Shield Bash', description: 'Bash for 1d6+Str damage and cause "Flinch" (target loses next reaction).' },
        { name: 'Frontline Guardian', description: 'Intercept an attack meant for an ally within 5ft once per round.' },
        { name: 'Steel Resolve', description: 'Ignore effects of one status condition for 1 minute (1/day).' },
        { name: 'Master Duelist', description: 'Gain +2 to hit while no other allies are within 5ft of your target.' }
      ], 
      inventory: ['itm-fig-1', 'itm-fig-2', 'itm-fig-3'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    }
  ],
  initialCampaign: {
    plot: "The Grey Marches have been swallowed by a spectral fog. Shadows move within, led by the Eye of the Void. A band of heroes must unite to purge the darkness.",
    summary: "Miri, Lina, and Seris have approached you at the Rusty Tankard Tavern. They seek a fourth for a goblin hunting contract.",
    locationName: "Rusty Tankard Tavern",
    rules: [
      { id: 'rule-1', category: 'Combat', name: 'Momentum', content: 'Moving at least 10ft before an attack adds +2 damage to the roll.' }
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
