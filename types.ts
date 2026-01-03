
export interface UserAccount {
  username: string;
  displayName: string;
  isAdmin?: boolean;
  pin?: string; // 4-digit pin for cloud sync
  version: number; // For tracking persistence and migrations
  registryEra: string; // "Eternal" for accounts created today+
  sessionId?: string; // Unique token to track the current active device/session
  friends?: string[]; // Array of usernames (sigils) previously played with
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
  usageCheck?: string; // e.g. "Strength Save", "Acrobatics", "CON Save"
  dc?: number; // The Difficulty Class for the check
}

export type RaceType = 
  | 'Human' 
  | 'Variant Human' 
  | 'Dwarf' 
  | 'Elf' 
  | 'Half-Elf' 
  | 'Orc' 
  | 'Goblin' 
  | 'Kobold' 
  | 'Tiefling' 
  | 'Dragonborn'
  | 'Tabaxi' 
  | 'Lizardfolk' 
  | 'Minotaur' 
  | 'Satyr'
  | 'Vesperian';

export type GenderType = 'Male' | 'Female' | 'Non-binary' | 'Other';

export interface Spell {
  name: string;
  level: number;
  school: string;
  description: string;
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
  feats: Trait[];
  imageUrl?: string;
  isPlayer: boolean;
  inventory: string[]; // Array of item IDs
  knownSpells?: Spell[];
  lockedStats?: (keyof Stats)[];
  authorId?: string;
  authorName?: string;
  usedAsiPoints?: number; // Total +1s added to stats via ASI
  isSpectral?: boolean; // True if created while quota was exhausted
}

export interface ClassFeature extends Trait {}

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  hitDie: string;
  startingHp: number;
  hpPerLevel: number;
  spellSlots: number[];
  features: ClassFeature[];
  initialSpells?: Spell[];
  preferredStats?: string[];
  bonuses?: string[];
  startingItemIds?: string[];
  authorId?: string;
  authorName?: string;
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
}

export interface ItemMechanic extends Trait {}

export interface Item {
  id: string;
  name: string;
  type: 'Weapon' | 'Armor';
  description: string;
  mechanics: ItemMechanic[];
  lore: string;
  imageUrl?: string;
  authorId?: string;
  authorName?: string;
}

export interface GameLog {
  role: 'dm' | 'player';
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
}

export interface MigrationData {
  user: UserAccount;
  characters: Character[];
  classes: ClassDef[];
  monsters: Monster[];
  items: Item[];
  campaign: CampaignState;
}

export type SyncMessageType = 
  | 'STATE_UPDATE' 
  | 'NEW_LOG' 
  | 'GIVE_LOOT' 
  | 'SHARE_RESOURCE' 
  | 'SUMMARY_UPDATE'
  | 'KICK' 
  | 'PULSE' 
  | 'HANDSHAKE'
  | 'QUOTA_SYNC'
  | 'MAP_UPDATE'
  | 'FRIEND_BEAT';

export interface ServerLog {
  id: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
  timestamp: number;
}

export interface SyncMessage {
  type: SyncMessageType;
  payload: any;
  senderId: string;
  senderName: string;
}
