export interface UserAccount {
  username: string;
  displayName: string;
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
}

export type RaceType = 'Human' | 'Variant Human' | 'Dwarf' | 'Elf' | 'Half-Elf';
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
  feats: Trait[];
  imageUrl?: string;
  isPlayer: boolean;
  inventory: string[]; // Array of item IDs
  knownSpells?: Spell[];
  lockedStats?: (keyof Stats)[];
}

export interface Rule {
  id: string;
  category: string;
  name: string;
  content: string;
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
}

export interface GameLog {
  role: 'dm' | 'player';
  content: string;
  timestamp: number;
  senderId?: string;
  senderName?: string;
}

export interface CampaignState {
  plot: string;
  summary: string;
  logs: GameLog[];
  party: Character[];
  rules: Rule[];
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
  | 'QUOTA_SYNC';

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