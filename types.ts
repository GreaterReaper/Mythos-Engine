
export interface UserAccount {
  username: string;
  displayName: string;
  isAdmin?: boolean;
  pin?: string;
  version: number;
  registryEra: string;
  sessionId?: string;
  friends?: string[];
}

export interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface Trait {
  name: string;
  description: string;
  locked?: boolean;
  usageCheck?: string;
  dc?: number;
}

export type EntitySize = 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

export type RaceType = 
  | 'Human' | 'Variant Human' | 'Dwarf' | 'Elf' | 'Half-Elf' | 'Orc' | 'Goblin' 
  | 'Kobold' | 'Tiefling' | 'Dragonborn' | 'Tabaxi' | 'Lizardfolk' | 'Minotaur' 
  | 'Satyr' | 'Vesperian';

export type GenderType = 'Male' | 'Female' | 'Non-binary' | 'Other';

export interface Spell {
  name: string;
  level: number;
  school: string;
  description: string;
}

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  hitDie: string;
  startingHp: number;
  hpPerLevel: number;
  spellSlots: number[];
  preferredStats: string[];
  bonuses: string[];
  features: Trait[];
  initialSpells: Spell[];
  authorId?: string;
  authorName?: string;
  startingItemIds?: string[];
  deletedAt?: number;
}

export interface Character {
  id: string;
  name: string;
  classId: string;
  race: RaceType;
  gender: GenderType;
  description: string;
  level: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  gold: number;
  exp: number;
  expToNextLevel: number;
  feats: Trait[];
  imageUrl?: string;
  isPlayer: boolean;
  isMentor?: boolean;
  inventory: string[];
  knownSpells?: Spell[];
  lockedStats?: (keyof Stats)[];
  authorId?: string;
  authorName?: string;
  usedAsiPoints?: number;
  unspentAsiPoints?: number;
  isSpectral?: boolean;
  size: EntitySize;
  position?: { x: number, y: number };
  deletedAt?: number;
}

export interface MonsterAbility {
  name: string;
  effect: string;
  locked?: boolean;
}

export interface Monster {
  id: string;
  name: string;
  description: string;
  stats: Stats;
  hp: number;
  ac: number;
  abilities: MonsterAbility[];
  legendaryActions?: MonsterAbility[];
  imageUrl?: string;
  isBoss?: boolean;
  authorId?: string;
  authorName?: string;
  size: EntitySize;
  position?: { x: number, y: number };
  deletedAt?: number;
}

export interface ItemMechanic {
  name: string;
  description: string;
  locked?: boolean;
}

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface Item {
  id: string;
  name: string;
  type: 'Weapon' | 'Armor';
  rarity: Rarity;
  description: string;
  mechanics: ItemMechanic[];
  lore: string;
  imageUrl?: string;
  authorId?: string;
  authorName?: string;
  deletedAt?: number;
  damageRoll?: string;
  damageType?: string;
  ac?: number;
  classRestrictions?: string[];
}

export interface Graveyard {
  characters: Character[];
  monsters: Monster[];
  items: Item[];
  classes: ClassDef[];
}

export interface GameLog {
  role: 'dm' | 'player' | 'system';
  content: string;
  timestamp: number;
  senderId?: string;
  senderName?: string;
}

export interface Rule {
  id: string;
  category: string;
  name: string;
  content: string;
}

export interface CampaignState {
  plot: string;
  summary: string;
  logs: GameLog[];
  party: Character[];
  rules: Rule[];
  locationName?: string;
  worldMapUrl?: string;
  localMapTiles?: string[];
  activeEnemies?: Monster[];
  combatActive?: boolean;
}

export interface SyncMessage {
  type: 'STATE_UPDATE' | 'NEW_LOG' | 'GIVE_LOOT' | 'SHARE_RESOURCE' | 'SUMMARY_UPDATE' | 'COMBAT_SYNC' | 'EXP_REWARD';
  payload: any;
  senderId: string;
  senderName: string;
}
