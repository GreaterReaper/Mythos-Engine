
export enum Race {
  Human = 'Human',
  Elf = 'Elf',
  Vesperian = 'Vesperian',
  Dwarf = 'Dwarf',
  Orc = 'Orc',
  Tiefling = 'Tiefling',
  Dragonborn = 'Dragonborn',
  Gnome = 'Gnome',
  Halfling = 'Halfling',
  Leonin = 'Leonin',
  Tabaxi = 'Tabaxi',
  Firbolg = 'Firbolg',
  Goliath = 'Goliath',
  Aasimar = 'Aasimar',
  Shifter = 'Shifter'
}

export enum Archetype {
  Archer = 'Archer',
  Thief = 'Thief',
  Sorcerer = 'Sorcerer',
  Mage = 'Mage',
  Warrior = 'Warrior',
  Fighter = 'Fighter',
  DarkKnight = 'Dark Knight',
  Alchemist = 'Alchemist',
  BloodArtist = 'Blood Artist',
  Custom = 'Custom'
}

export type Role = 'Tank' | 'DPS' | 'Support';

export type StatusEffect = 'Poisoned' | 'Blinded' | 'Stunned' | 'Charmed' | 'Frightened' | 'Paralyzed' | 'Exhausted' | 'Bleeding';

export interface Stats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Currency {
  aurels: number;
  shards: number;
  ichor: number;
}

export interface Ability {
  name: string;
  description: string;
  type: 'Passive' | 'Active' | 'Feat' | 'Spell';
  levelReq: number;
  baseLevel?: number;
  scaling?: string;
}

export interface ArchetypeInfo {
  name: string;
  description: string;
  hpDie: number;
  role: Role;
  coreAbilities: Ability[];
  spells?: Ability[];
  startingItem?: Partial<Item>;
  themedItems?: Item[];
  authorId?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'Weapon' | 'Armor' | 'Utility' | 'Quest';
  stats?: Partial<Stats> & { ac?: number; damage?: string };
  imageUrl?: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  archetypes?: Archetype[] | string[];
  authorId?: string;
  quantity?: number;
  isUnique?: boolean;
}

export interface ShopItem extends Item {
  cost: Currency;
}

export interface Shop {
  id: string;
  merchantName: string;
  merchantAura: string;
  inventory: ShopItem[];
}

export interface MapToken {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  type: 'Hero' | 'Enemy' | 'NPC';
}

export interface Character {
  id: string;
  name: string;
  age: number;
  gender: string;
  race: Race;
  archetype: Archetype | string;
  role: Role;
  level: number;
  exp: number;
  maxHp: number;
  currentHp: number;
  stats: Stats;
  currency: Currency;
  inventory: Item[];
  equippedIds: string[];
  spells: Ability[];
  abilities: Ability[];
  activeStatuses: StatusEffect[];
  spellSlots?: Record<number, number>;
  maxSpellSlots?: Record<number, number>;
  description: string;
  biography?: string;
  imageUrl?: string;
  asiPoints: number;
  isAiControlled?: boolean;
  isPrimarySoul?: boolean;
  ownerName?: string;
}

export interface Monster {
  id: string;
  name: string;
  type: 'Goblinoid' | 'Beast' | 'Undead' | 'Humanoid' | 'Draconian' | 'Hybrid';
  hp: number;
  ac: number;
  stats: Stats; 
  cr: number;
  abilities: Ability[];
  activeStatuses: StatusEffect[];
  description: string;
  imageUrl?: string;
  resistances?: string[];
  vulnerabilities?: string[];
}

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
}

export interface Campaign {
  id: string;
  title: string;
  prompt: string;
  history: Message[];
  participants: string[];
  activeShop?: Shop | null;
  isCombatActive?: boolean;
}

export interface Friend {
  id: string;
  name: string;
  active: boolean;
  peerId?: string;
}

export interface Rumor {
  id: string;
  hook: string;
  length: 'Short' | 'Medium' | 'Long' | 'Epic';
  danger: 'Trivial' | 'Perilous' | 'Mortal' | 'Cataclysmic';
  rewardTier: number;
}

export interface ApiUsage {
  count: number;
  lastReset: number;
}

export interface GameState {
  characters: Character[];
  mentors: Character[];
  activeCampaignId: string | null;
  campaigns: Campaign[];
  armory: Item[];
  bestiary: Monster[];
  customArchetypes: ArchetypeInfo[];
  mapTokens: MapToken[];
  userAccount: {
    username: string;
    id: string;
    activeCharacterId?: string;
    friends: Friend[];
    sharedCreations: string[];
    isLoggedIn: boolean;
    peerId?: string;
  };
  party: string[];
  multiplayer: {
    isHost: boolean;
    connectedPeers: string[];
  };
  currentTavernShop?: Shop | null;
  slainMonsterTypes: string[];
  activeRumors: Rumor[];
  apiUsage?: ApiUsage;
}
