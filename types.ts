
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
  Custom = 'Custom'
}

export interface Stats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Ability {
  name: string;
  description: string;
  type: 'Passive' | 'Active' | 'Feat' | 'Spell';
  levelReq: number;
  baseLevel?: number; // Spell level 1-9
  scaling?: string; // Description of upcasting benefits
}

export interface ArchetypeInfo {
  name: string;
  description: string;
  hpDie: number;
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
  quantity?: number; // Added for stackable items
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
  level: number;
  exp: number;
  maxHp: number;
  currentHp: number;
  stats: Stats;
  inventory: Item[];
  equippedIds: string[];
  spells: Ability[];
  abilities: Ability[];
  spellSlots?: Record<number, number>;
  maxSpellSlots?: Record<number, number>;
  description: string;
  biography?: string;
  imageUrl?: string;
  asiPoints: number;
  isAiControlled?: boolean;
}

export interface Monster {
  id: string;
  name: string;
  type: 'Goblinoid' | 'Beast' | 'Undead' | 'Humanoid' | 'Draconian' | 'Hybrid';
  hp: number;
  ac: number;
  abilities: Ability[];
  description: string;
  imageUrl?: string;
  expReward: number;
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
}

export interface Friend {
  id: string;
  name: string;
  active: boolean;
  peerId?: string;
}

export interface GameState {
  characters: Character[];
  mentors: Character[];
  activeCampaignId: string | null;
  campaigns: Campaign[];
  armory: Item[];
  bestiary: Monster[];
  customArchetypes: ArchetypeInfo[];
  mapTokens: MapToken[]; // NEW: For combat synchronization
  userAccount: {
    username: string;
    id: string;
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
}
