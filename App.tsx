
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

const REGISTRY_VERSION = 29; 

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
  version: "March-2025-v29-Solo-Pioneer",
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy. They pick a single enemy that is exposed to deal extra damage against. They wear leather armor to stay protected and light. They use special arrows for utility.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Bows', 'Leather Armor', 'Perception'], features: [
        { name: 'Sky Shot', description: 'Perfect accuracy against flying targets, ignoring range penalties.' },
        { name: 'Exposed Weakness', description: 'Once per turn, deal 1d10 bonus damage to a target engaged by an ally.' },
        { name: 'Lightfoot Reflex', description: '+2 AC while in light armor if you have moved at least 15ft this turn.' },
        { name: 'Trick Shot: Ricochet', description: 'If you hit, the arrow bounces to another target within 10ft for half damage.' },
        { name: 'Volley of Thorns', description: 'Action: Fire a spray of arrows in a 15ft cone, dealing 3d6 piercing damage.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-arch-bow-1', 'itm-scout-leather']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Stealth masters using dual daggers. They can execute grappled targets and use smoke bombs to vanish.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Daggers', 'Stealth', 'Leather Armor'], features: [
        { name: 'Cunning Infiltration', description: 'Gain advantage on Stealth checks and lockpicking.' },
        { name: 'Instant Execution', description: 'As an action, instantly kill a human-sized or smaller target grappled by an ally.' },
        { name: 'Smoke Screen', description: 'Bonus Action: Drop smoke. Become invisible and move 15ft without provoking opportunity attacks.' },
        { name: 'Blade Waltz', description: 'When you hit with a dagger, you may make an off-hand attack as a free action.' },
        { name: 'Vile Toxin', description: 'Your daggers deal an extra 1d6 poison damage to targets with missing health.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-dags-1', 'itm-scout-leather']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Destructive spellcasters wielding long staves. They can memorize spells for instant, free casting.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Long Staves', 'Robes', 'Arcana'], features: [
        { name: 'Destructive Overload', description: 'Add your Intelligence modifier twice to any damaging spell rolls.' },
        { name: 'Spell Memory', description: 'Commit one spell to memory; it becomes free to cast once per long rest.' },
        { name: 'Arcane Surge', description: 'Expend half your movement to increase your next spell DC by 3.' },
        { name: 'Aura of Arcane Shielding', description: 'While casting, gain temporary HP equal to 5 + Spell Level.' },
        { name: 'Chaos Bolt', description: 'When you crit with a spell, the target is stunned for 1 turn.' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: '10d6 fire damage in a 20ft radius.' },
        { name: 'Mana Burst', level: 1, school: 'Evocation', description: '2d8 force damage in a 15ft cone.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', description: 'Create 3 duplicates.' },
        { name: 'Shatter Breath', level: 2, school: 'Evocation', description: 'Line of sound dealing 4d8 thunder damage.' },
        { name: 'Void Singularity', level: 3, school: 'Conjuration', description: 'Pull all enemies within 30ft to a point; deal 6d6 force.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-staff-1', 'itm-sage-robes']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive casters focused on healing and group buffs.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Small Staves', 'Robes', 'Insight'], features: [
        { name: 'Resonant Buffs', description: 'Any single-target buff you cast spreads to all allies within 15ft.' },
        { name: 'Divine Healing', description: 'Healing spells restore an additional 2d8 HP if the target is below half health.' },
        { name: 'Beacon of Aura', description: 'Allies within 20ft are immune to being Charmed or Frightened.' },
        { name: 'Mana Font', description: 'Recover one used Level 1 spell slot as a bonus action (1/day).' },
        { name: 'Etheric Bond', description: 'Link your soul to an ally; you both share 50% of all incoming damage.' }
      ], initialSpells: [
        { name: 'Mass Regen', level: 3, school: 'Conjuration', description: 'Heal all allies for 1d8 every turn for 3 turns.' },
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Absorb 15 damage from one target.' },
        { name: 'Benediction', level: 3, school: 'Evocation', description: 'Instantly restore all HP to one target.' },
        { name: 'Celestial Light', level: 1, school: 'Evocation', description: 'Heal 2d8+Wis; grants target +2 AC for 1 turn.' },
        { name: 'Aegis of Grace', level: 2, school: 'Abjuration', description: 'Allies gain resistance to magic damage for 2 turns.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-wand-1', 'itm-healer-robes']
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Brutal frontliners with two-handed weapons and plate armor.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Weapons', 'Heavy Armor', 'Athletics'], features: [
        { name: 'Invigorating Roar', description: 'Action: All allies gain 15 Temp HP and Advantage on their next attack.' },
        { name: 'Unstoppable Bulk', description: 'Immune to being knocked prone or pushed. Gain +1 AC for every 2 enemies adjacent.' },
        { name: 'Concussive Blow', description: 'Successful hits force a DC 16 Str save or the target is knocked prone.' },
        { name: 'Charged Devastation', description: 'Spend a turn charging. Your next hit deals 4x damage and creates a 10ft shockwave.' },
        { name: 'Bloodlust Vanguard', description: 'Each time you take damage, your next attack deals +3 damage (stacks up to 15).' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-war-claymore-1', 'itm-full-plate-1']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Shield-bearing masters of defense and crowd control.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['1H Weapons', 'Shields', 'Heavy Armor'], features: [
        { name: 'Shield Wall', description: 'Gain +2 AC and grant +2 AC to all adjacent allies while holding a shield.' },
        { name: 'Shield Bash', description: 'Bonus Action: Hit for 1d8+Str. Target is stunned until end of their turn.' },
        { name: 'Guardian Intercept', description: 'Reaction: Move up to 10ft to take the damage for an ally within reach.' },
        { name: 'Steel Focus', description: 'Gain advantage on all Constitution saving throws to maintain concentration or resist exhaustion.' },
        { name: 'Master Duelist', description: 'In 1v1 combat, you cannot be crit and you deal +5 damage.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-fig-sword-1', 'itm-fig-shield-1', 'itm-half-plate-1']
    },
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Heavy knights wielding 2H swords and life-draining dark magic.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 3, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Swords', 'Heavy Armor', 'Intimidation'], features: [
        { name: 'Momentum Reaper', description: 'Successful hits grant a 10ft free dash that ignores opportunity attacks.' },
        { name: 'Living Dead', description: 'Survive fatal damage at 1 HP for 1 full combat turn (Until start of your next turn). Must be healed for your Max HP total by end of turn or die.' },
        { name: 'Living Shadow', description: 'Summon a twin of shadow. It mimics your attacks for 2 turns at 50% damage.' },
        { name: 'Ignite Aether', description: 'Sacrifice 10 HP to deal 2d10 necrotic damage on your next hit.' },
        { name: 'Chill of the Abyss', description: 'Enemies within 5ft have -2 to all attack rolls and -10ft movement.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 1d8 HP from all adjacent enemies.' },
        { name: 'Edge of Shadow', level: 2, school: 'Evocation', description: '30ft line of darkness dealing 4d8 damage.' },
        { name: 'The Blackest Night', level: 3, school: 'Abjuration', description: 'Absorb damage = 25% Max HP. If broken, grant Dark Arts.' },
        { name: 'Soul Grind', level: 1, school: 'Necromancy', description: 'Target takes 2d6 necrotic damage; you heal half.' },
        { name: 'Dark Passenger', level: 2, school: 'Evocation', description: 'Wave of dark energy Blinds all in a 15ft cone.' }
      ], authorId: 'system', startingItemIds: ['itm-dk-blade-1', 'itm-dk-plate-1']
    }
  ],
  monsters: [
    { id: 'mon-gob-scout', name: 'Goblin Skirmisher', description: 'A fast goblin with a shortbow.', stats: { strength: 8, dexterity: 16, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 15, ac: 14, abilities: [{ name: 'Nimble Escape', effect: 'Disengage as bonus action.' }], authorId: 'system', size: 'Small' as const },
    { id: 'mon-gob-shaman', name: 'Goblin Witch-doctor', description: 'Casts primitive fire magic.', stats: { strength: 6, dexterity: 12, constitution: 12, intelligence: 14, wisdom: 14, charisma: 10 }, hp: 20, ac: 12, abilities: [{ name: 'Fire Spit', effect: 'Ranged attack 2d6 fire.' }], authorId: 'system', size: 'Small' as const },
    { id: 'mon-wolf-shadow', name: 'Shadow Panther', description: 'A sleek beast that hunts in the dark.', stats: { strength: 14, dexterity: 18, constitution: 12, intelligence: 4, wisdom: 14, charisma: 6 }, hp: 35, ac: 15, abilities: [{ name: 'Pounce', effect: 'Jump 20ft and knock target prone.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-boar-iron', name: 'Iron-hide Boar', description: 'A massive tusker with metallic fur.', stats: { strength: 18, dexterity: 8, constitution: 18, intelligence: 2, wisdom: 10, charisma: 4 }, hp: 50, ac: 16, abilities: [{ name: 'Tusk Charge', effect: 'Double damage on straight line moves.' }], authorId: 'system', size: 'Large' as const },
    { id: 'mon-skeleton', name: 'Crypt Skeleton', description: 'Rattling bones in ancient armor.', stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 }, hp: 13, ac: 13, abilities: [{ name: 'Undead Resolve', effect: 'Resistant to piercing.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-revenant', name: 'Vengeful Revenant', description: 'A tireless knight brought back by hate.', stats: { strength: 18, dexterity: 12, constitution: 20, intelligence: 10, wisdom: 12, charisma: 8 }, hp: 80, ac: 18, abilities: [{ name: 'Grip of Hate', effect: 'Target cannot move if hit.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-mercenary', name: 'Iron Hand Mercenary', description: 'Professional soldier with a halberd.', stats: { strength: 16, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 }, hp: 45, ac: 15, abilities: [{ name: 'Cleave', effect: 'Hit 2 adjacent targets.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-cultist', name: 'Void Cultist', description: 'Fanatic obsessed with the Eye.', stats: { strength: 10, dexterity: 12, constitution: 10, intelligence: 14, wisdom: 8, charisma: 16 }, hp: 25, ac: 11, abilities: [{ name: 'Self Sacrifice', effect: 'Explode on death dealing 3d6 void.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-drake-vanguard', name: 'Drake-Vanguard', description: 'A half-dragon warrior with a molten blade.', stats: { strength: 20, dexterity: 10, constitution: 18, intelligence: 10, wisdom: 12, charisma: 14 }, hp: 110, ac: 19, abilities: [{ name: 'Flame Breath', effect: '4d6 fire cone.' }], authorId: 'system', size: 'Large' as const },
    { 
      id: 'mon-gorechimera', 
      name: 'Gorechimera', 
      isBoss: true,
      description: 'A terrifying hybrid with the head of a lion, body of a goat, and a venomous serpent tail. Its pallid skin shimmers with dark energy.', 
      stats: { strength: 24, dexterity: 14, constitution: 22, intelligence: 12, wisdom: 16, charisma: 14 }, 
      hp: 350, 
      ac: 20, 
      size: 'Huge' as const,
      abilities: [
        { name: 'Goat: Echo of Life', effect: 'Heals itself for 40 HP and revives one slain non-boss ally nearby.' },
        { name: 'Lion: King\'s Roar', effect: 'Frightens all enemies within 60ft and deals 4d8 thunder damage.' },
        { name: 'Serpent: Venomous Lash', effect: 'Tail strike deals 2d10 piercing + 4d6 poison (Ongoing).' }
      ],
      legendaryActions: [
        { name: 'Triple Strike', effect: 'Attacks with Lion, Goat, and Serpent in sequence.' },
        { name: 'Pallid Mist', effect: 'Creates fog; become invisible until next action.' }
      ],
      authorId: 'system'
    }
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
  heroes: MENTOR_TEMPLATES as Character[],
  initialCampaign: {
    plot: "The Grey Marches have been swallowed by a spectral fog. Shadows move within.",
    summary: "You meet Miri, Lina, and Seris at the Rusty Tankard Tavern. They are veteran hunters who will mentor you as you seek to clear the mist.",
    locationName: "Rusty Tankard Tavern",
    rules: [
      { id: 'rule-1', category: 'Combat', name: 'Momentum', content: 'Moving 10ft adds +2 damage.' },
      { id: 'rule-2', category: 'Progression', name: 'Experience', content: 'Gain EXP by defeating foes. Reach your threshold to ascend in power.' }
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
          {activeTab === 'profile' && <ProfilePanel user={currentUser} />}
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
