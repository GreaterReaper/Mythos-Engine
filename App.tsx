import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, ServerLog, UserAccount, Spell } from './types';
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
import { generateImage } from './services/gemini';
import Peer, { DataConnection } from 'peerjs';

interface Notification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface DiceRoll {
  id: string;
  sides: number;
  result: number;
  timestamp: number;
}

const LOCKOUT_DURATION = 65; 
const DAILY_PRO_LIMIT = 50;
const DAILY_FLASH_LIMIT = 1500;
const SYSTEM_VERSION = 107; // Incremented for archive auto-update logic

const THEMATIC_SPELLS: Record<string, Spell[]> = {
  sorcerer: [
    { name: 'Arcane Ruin', level: 1, school: 'Evocation', description: 'A burst of raw energy dealing 3d6 force damage to an area.' },
    { name: 'Burning Veins', level: 1, school: 'Transmutation', description: 'Your next destructive spell ignores fire resistance and deals 1d6 extra fire damage.' },
    { name: 'Elemental Surge', level: 2, school: 'Evocation', description: 'Release a 15ft cone of frost or flame (3d8 damage, DEX save half).' },
    { name: 'Mage Hand', level: 0, school: 'Conjuration', description: 'Manipulate objects up to 10lbs from 30ft away.' },
    { name: 'Magic Missile', level: 1, school: 'Evocation', description: 'Three darts of force strike unerringly for 1d4+1 damage each.' }
  ],
  mage: [
    { name: 'Cure Wounds', level: 1, school: 'Evocation', description: 'A creature you touch regains HP equal to 1d8 + Spellcasting Modifier.' },
    { name: 'Aetheric Aegis', level: 1, school: 'Abjuration', description: 'Surrounds all allies within 20ft with a shimmering barrier (+1 AC) for 2 rounds.' },
    { name: 'Revitalizing Mist', level: 2, school: 'Evocation', description: 'Heals all allies in a 30ft radius for 2d8 + WIS modifier.' },
    { name: 'Guidance', level: 0, school: 'Divination', description: 'Target can roll a d4 and add it to one ability check.' },
    { name: 'Lesser Restoration', level: 2, school: 'Abjuration', description: 'End one disease or condition (blinded, deafened, paralyzed, poisoned).' }
  ],
  dark_knight: [
    { name: 'The Black Night', level: 1, school: 'Abjuration', description: 'Create a barrier of darkness around yourself equal to your level + CHA modifier.' },
    { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 2d6 health from all enemies within 5ft, healing yourself for half.' },
    { name: 'Shadow Siphon', level: 2, school: 'Necromancy', description: 'Curse a target; when they take damage, you regain 1d4 HP.' },
    { name: 'Grim Visage', level: 1, school: 'Illusion', description: 'Force a target to make a WIS save or be Frightened for 1 minute.' }
  ]
};

const SYSTEM_MONSTERS: Monster[] = [
  {
    id: 'sys-goblin',
    name: 'Goblin Scavenger',
    description: 'Small, green-skinned humanoids that hunt in packs. They thrive on ambush tactics.',
    stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
    hp: 7, ac: 13,
    abilities: [{ name: 'Nimble Escape', effect: 'Can Disengage or Hide as a bonus action.' }],
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-skeleton',
    name: 'Dread Skeleton',
    description: 'Bones knit by dark necromancy. They feel no pain and know no fear.',
    stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 },
    hp: 13, ac: 13,
    abilities: [{ name: 'Undead Fortitude', effect: 'If reduced to 0 HP, stay at 1 HP on a successful CON save.' }],
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-orc',
    name: 'Orc Marauder',
    description: 'A hulking brute driven by bloodlust and raw physical power.',
    stats: { strength: 16, dexterity: 12, constitution: 16, intelligence: 7, wisdom: 11, charisma: 10 },
    hp: 18, ac: 14,
    abilities: [{ name: 'Aggressive', effect: 'Move toward a hostile creature as a bonus action.' }],
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-gorechimera',
    name: 'Pallid Gorechimera',
    description: 'A terrifying legendary beast with the head of a lion, body of a goat, and a serpent tail. It exudes a deathly pallor.',
    isBoss: true,
    stats: { strength: 22, dexterity: 12, constitution: 20, intelligence: 12, wisdom: 16, charisma: 14 },
    hp: 240, ac: 18,
    abilities: [
      { name: 'Venomous Serpent', effect: 'Tail spray deals 4d6 poison damage and target is Poisoned (DC 16 CON half).' },
      { name: 'Lion Head Rend', effect: 'Melee weapon attack: +10 to hit. Deals 3d10+6 slashing damage.' },
      { name: 'Goat Head Restoration', effect: 'Action to fully heal its other heads or revive a minor monster.' }
    ],
    legendaryActions: [
      { name: 'Triple Strike', effect: 'Each head makes one attack against a different target.' },
      { name: 'Goat\'s Bleat', effect: 'Allied creatures within 40ft regain 4d8 hit points.' }
    ],
    authorId: 'system', authorName: 'Orestara'
  }
];

const SYSTEM_ITEMS: Item[] = [
  {
    id: 'sys-iron-longsword',
    name: 'Standard Longsword',
    type: 'Weapon',
    description: 'A well-balanced one-handed blade of cold-forged iron.',
    mechanics: [{ name: 'Parry', description: 'As a reaction, add +2 to AC against one melee attack.' }],
    lore: 'Standard issue for the King\'s Guard.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-gargantuan-greatsword',
    name: 'Titan Zweihänder',
    type: 'Weapon',
    description: 'A massive two-handed sword that hums with raw power.',
    mechanics: [{ name: 'Heavy Impact', description: 'Deals 2d6 slashing. On a crit, the target is knocked Prone.' }],
    lore: 'Forged for Warriors who serve as the vanguard.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-dark-executioner',
    name: 'Abyssal Executioner',
    type: 'Weapon',
    description: 'A jagged greatsword that bleeds black smoke.',
    mechanics: [{ name: 'Siphon Soul', description: 'Deals 1d10 slashing + 1d6 necrotic. Restore HP equal to half necrotic damage.' }],
    lore: 'A blade that requires one to gaze into the void to master.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-evening-shield',
    name: 'Daughter of the Evening',
    type: 'Armor',
    description: 'A legendary mirrored shield that reflects dying sunlight.',
    mechanics: [{ name: 'Gaze Reflection', description: 'Reflect gaze-based attacks on a successful DC 15 Dex save.' }],
    lore: 'Forged to hunt Gorgon queens in the first age.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-menders-staff',
    name: 'Crest of Mercy',
    type: 'Weapon',
    description: 'A white-ash staff that pulses with soft golden light.',
    mechanics: [{ name: 'Mercy Aura', description: 'Increases all healing spells cast by 2 per die rolled.' }],
    lore: 'A gift from Orestara to the first Mages.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-sky-piercer-bow',
    name: 'Sky-Piercer Bow',
    type: 'Weapon',
    description: 'A bow that can ground flying beasts with incredible accuracy.',
    mechanics: [{ name: 'Aerial Mastery', description: 'Deals 1d8 piercing. Advantage against flying enemies.' }],
    lore: 'Heavens are no sanctuary from an Archer\'s arrow.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-assassin-daggers',
    name: 'Twin Shadow Daggers',
    type: 'Weapon',
    description: 'Serrated obsidian blades that hum with a silent, lethal vibration.',
    mechanics: [{ name: 'Silent Strike', description: 'Attacks made while hidden deal an additional 2d6 piercing damage.' }],
    lore: 'Favored by the Thieves of the Unseen Hand.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-archsorcerer-staff',
    name: 'Staff of the Burning Void',
    type: 'Weapon',
    description: 'A staff of charred wood capped with a flickering violet flame.',
    mechanics: [{ name: 'Void Channel', description: 'Add +2 to damage rolls for spells that deal Force or Fire damage.' }],
    lore: 'Wielded by those who trade their sanity for raw arcane might.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-warrior-plate',
    name: 'Vanguard Plate Armor',
    type: 'Armor',
    description: 'Thick, overlapping plates of heavy steel etched with runes of protection.',
    mechanics: [{ name: 'Immovable', description: 'Grants advantage on saves against being pushed or knocked prone. Base AC 18.' }],
    lore: 'The literal wall between civilization and the darkness.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-thief-leathers',
    name: 'Midnight Studded Leather',
    type: 'Armor',
    description: 'Reinforced leather armor dyed deep black, designed for maximum mobility.',
    mechanics: [{ name: 'Fluid Motion', description: 'Grants +2 to Dexterity (Stealth) checks. Base AC 12 + Dex.' }],
    lore: 'Light enough to be forgotten, tough enough to save a life.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-sorcerer-robes',
    name: 'Robes of the Aether Weaver',
    type: 'Armor',
    description: 'Silk robes woven with threads of pure mana, shimmering with an inner light.',
    mechanics: [{ name: 'Mana Shield', description: 'Once per rest, reduce incoming damage from a spell by half. Base AC 10 + Dex.' }],
    lore: 'Traditional garb for the high mages of the Silver Citadel.',
    authorId: 'system', authorName: 'Orestara'
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive' | 'spells' | 'profile'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [diceTrayOpen, setDiceTrayOpen] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('mythos_active_session');
    const user = saved ? JSON.parse(saved) : null;
    if (user) (window as any).isMythosAdmin = !!user.isAdmin;
    return user;
  });

  const [arcaneTokens, setArcaneTokens] = useState<number>(3); 
  const [reservoir, setReservoir] = useState<number>(100); 
  const [lockoutTime, setLockoutTime] = useState<number>(0);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);
  const [dmModel, setDmModel] = useState<string>('gemini-3-pro-preview');
  const [localResetTime, setLocalResetTime] = useState<string>('');
  
  const [dailyProUsed, setDailyProUsed] = useState<number>(0);
  const [dailyFlashUsed, setDailyFlashUsed] = useState<number>(0);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [campaign, setCampaign] = useState<CampaignState>({ plot: '', summary: '', logs: [], party: [], rules: [] });

  const [peerId, setPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const peerRef = useRef<Peer | null>(null);

  const notify = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 7000);
  }, []);

  const deduplicateAndMergeItems = useCallback((itemList: Item[]): Item[] => {
    const merged: Record<string, Item> = {};
    itemList.forEach(item => {
      const key = item.name.trim().toLowerCase();
      if (!merged[key]) {
        merged[key] = { ...item };
      } else {
        const existing = merged[key];
        if (!existing.description.toLowerCase().includes(item.description.toLowerCase().trim())) {
          existing.description = existing.description.trim() + " " + item.description.trim();
        }
        const existingMechNames = new Set(existing.mechanics.map(m => m.name.toLowerCase().trim()));
        item.mechanics.forEach(m => {
          const mName = m.name.toLowerCase().trim();
          if (!existingMechNames.has(mName)) {
            existing.mechanics.push(m);
            existingMechNames.add(mName);
          }
        });
        if (!existing.lore.toLowerCase().includes(item.lore.toLowerCase().trim())) {
          existing.lore = existing.lore.trim() + " " + item.lore.trim();
        }
      }
    });
    return Object.values(merged);
  }, []);

  // Global System Sync: Ensures 'system' content remains constant for all users
  const syncGlobalSystemArchive = useCallback((localChars: Character[], localClasses: ClassDef[], localMonsters: Monster[], localItems: Item[]) => {
    const globalKey = 'mythos_ether_system_master';
    const rawGlobal = localStorage.getItem(globalKey);
    let masterArchive = rawGlobal ? JSON.parse(rawGlobal) : { version: 0, monsters: [], items: [], classes: [], heroes: [] };

    // Architect check: If hardcoded constants have newer version or admin forces manifest, update master
    if (currentUser?.isAdmin && masterArchive.version < SYSTEM_VERSION) {
      masterArchive = {
        version: SYSTEM_VERSION,
        monsters: [...SYSTEM_MONSTERS],
        items: [...SYSTEM_ITEMS],
        classes: classes.filter(c => c.authorId === 'system'), // Should be handled in manifestBasics
        heroes: characters.filter(c => c.authorId === 'system')
      };
      localStorage.setItem(globalKey, JSON.stringify(masterArchive));
      notify("Master Grimoire resonating with the latest Arcane Truths.", "success");
    }

    // Integrity enforcement: replace any 'system' items with Master Archive copies
    const ensureIntegrity = <T extends { authorId?: string; id: string }>(localList: T[], masterList: T[]): T[] => {
      const masterMap = new Map(masterList.map(m => [m.id, m]));
      return localList.map(item => (item.authorId === 'system' && masterMap.has(item.id)) ? masterMap.get(item.id)! : item);
    };

    const newChars = ensureIntegrity(localChars, masterArchive.heroes);
    const newClasses = ensureIntegrity(localClasses, masterArchive.classes);
    const newMonsters = ensureIntegrity(localMonsters, masterArchive.monsters);
    const newItems = ensureIntegrity(localItems, masterArchive.items);

    return { newChars, newClasses, newMonsters, newItems };
  }, [currentUser, notify, characters, classes]);

  const handleCloudSync = useCallback(async (action: 'push' | 'pull') => {
    if (!currentUser) return;
    const etherKey = 'mythos_ether_archive';
    const cloudArchive: Record<string, any> = JSON.parse(localStorage.getItem(etherKey) || '{}');

    if (action === 'push') {
      const payload = {
        pin: currentUser.pin,
        isAdmin: currentUser.isAdmin,
        data: { characters, classes, monsters, items, campaign, playerName: currentUser.displayName }
      };
      cloudArchive[currentUser.username] = payload;
      localStorage.setItem(etherKey, JSON.stringify(cloudArchive));
      notify("Saga Synchronized with the Ether.", "success");
    } else {
      const entry = cloudArchive[currentUser.username];
      if (!entry) {
        notify("No chronicle found for this sigil in the Ether.", "error");
        return;
      }
      if (currentUser.isAdmin || entry.pin === currentUser.pin) {
        const d = entry.data;
        const synced = syncGlobalSystemArchive(d.characters, d.classes, d.monsters, d.items);
        setCharacters(synced.newChars);
        setClasses(synced.newClasses);
        setMonsters(synced.newMonsters);
        setItems(deduplicateAndMergeItems(synced.newItems));
        setCampaign(d.campaign);
        notify("Chronicle Restored & Resonated from the Ether.", "success");
      } else {
        notify("Arcane PIN mismatch. Access Denied.", "error");
      }
    }
  }, [currentUser, characters, classes, monsters, items, campaign, notify, deduplicateAndMergeItems, syncGlobalSystemArchive]);

  const manifestBasics = async (scope: 'all' | 'monsters' | 'items' | 'heroes' | 'adventure' = 'all') => {
    notify("Manifesting archetypes and fated gear...", "info");
    
    let updatedMonsters = [...monsters];
    let updatedItems = [...items];
    let updatedChars = [...characters];
    let updatedClasses = [...classes];

    if (scope === 'all' || scope === 'monsters') {
      const existingIds = new Set(monsters.map(m => m.id));
      const monstersToAdd = [...SYSTEM_MONSTERS].filter(m => !existingIds.has(m.id));
      for (let m of monstersToAdd) {
        if (!m.imageUrl) {
          try { m.imageUrl = await generateImage(`Bestiary portrait: ${m.name}. Description: ${m.description}. Dark fantasy oil painting style.`); } catch(e) {}
        }
      }
      updatedMonsters = [...updatedMonsters, ...monstersToAdd];
    }

    if (scope === 'all' || scope === 'items') {
      const existingIds = new Set(items.map(i => i.id));
      const itemsToAdd = [...SYSTEM_ITEMS].filter(i => !existingIds.has(i.id));
      for (let i of itemsToAdd) {
        if (!i.imageUrl) {
          try { i.imageUrl = await generateImage(`Relic artifact: ${i.name}. Description: ${i.description}. Obsidian, iron, and gold filigree.`); } catch(e) {}
        }
      }
      updatedItems = deduplicateAndMergeItems([...updatedItems, ...itemsToAdd]);
    }

    if (scope === 'all') {
      const basicClasses: ClassDef[] = [
        {
          id: 'basic-warrior',
          name: 'Warrior',
          description: 'Mighty physical vanguards who focus on heavy weapons and unbreakable defense.',
          hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Full Plate Armor Proficiency', 'Heavy Weapon Mastery'], 
          startingItemIds: ['sys-gargantuan-greatsword', 'sys-warrior-plate'],
          features: [
            { name: 'Mighty Roar', description: 'Unleash a roar granting 1d8+Level temporary hit points.' }, 
            { name: 'Crushing Blow', description: 'Critical hits knock enemies prone.' }
          ], 
          initialSpells: [], 
          authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-fighter',
          name: 'Fighter',
          description: 'Balanced masters of combat techniques and defensive shielding.',
          hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Shield Mastery', 'Heavy Armor Proficiency'], 
          startingItemIds: ['sys-iron-longsword', 'sys-evening-shield', 'sys-warrior-plate'],
          features: [
            { name: 'Shield Bash', description: 'Strike with a shield for blunt damage and flinching.' }, 
            { name: 'Firm Bastion', description: 'Protect adjacent allies as a reaction.' }
          ], 
          initialSpells: [], 
          authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-sorcerer',
          name: 'Sorcerer',
          description: 'Masters of raw elemental magic who turn the tide of battle with destruction.',
          hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 2, 0], preferredStats: ['Intelligence', 'Charisma'], bonuses: ['Staff Mastery', 'Arcane Destruction'], 
          startingItemIds: ['sys-archsorcerer-staff', 'sys-sorcerer-robes'],
          features: [
            { name: 'Spell Memory', description: 'Cast a memorized spell without a slot once per rest.' }, 
            { name: 'Destructive Tide', description: 'Offensive spells deal extra damage based on Charisma.' }
          ], 
          initialSpells: THEMATIC_SPELLS.sorcerer, 
          authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-mage',
          name: 'Mage',
          description: 'Supportive aether-users who heal wounds and shield the fellowship.',
          hitDie: 'd8', startingHp: 10, hpPerLevel: 6, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Supportive Aura', 'Healing Mastery'], 
          startingItemIds: ['sys-menders-staff', 'sys-sorcerer-robes'],
          features: [
            { name: 'Resonant Benediction', description: 'Healing spells affect one additional nearby ally.' }, 
            { name: 'Vital Flow', description: 'Bonus action to restore 1d10 + WIS hit points.' }
          ], 
          initialSpells: THEMATIC_SPELLS.mage, 
          authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-thief',
          name: 'Thief',
          description: 'Masters of stealth and dual-daggers who strike from the shadows.',
          hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Dual Dagger Mastery', 'Stealth Proficiency'], 
          startingItemIds: ['sys-assassin-daggers', 'sys-thief-leathers'],
          features: [
            { name: 'Executioner\'s Strike', description: 'Instantly execute a human-sized enemy that is currently grappled or surprised.' }, 
            { name: 'Smoke Escape', description: 'Vanish and disengage instantly as a reaction or bonus action.' }
          ], 
          initialSpells: [], 
          authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-archer',
          name: 'Archer',
          description: 'Masters of the bow who can ground flying enemies with incredible accuracy.',
          hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Longbow Accuracy', 'Aerial Sniper'], 
          startingItemIds: ['sys-sky-piercer-bow', 'sys-thief-leathers'],
          features: [
            { name: 'Exposed Weakness', description: 'Deal extra 2d6 damage against a single enemy that is isolated.' }, 
            { name: 'Sky Guard', description: 'You have advantage on attack rolls against flying enemies.' }
          ], 
          initialSpells: [], 
          authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-dark-knight',
          name: 'Dark Knight',
          description: 'Warriors who channel forbidden aether to siphon life and shield with shadows.',
          hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [2, 0, 0], preferredStats: ['Strength', 'Charisma'], bonuses: ['Two-Handed Mastery', 'Soul-Resonance'],
          startingItemIds: ['sys-dark-executioner', 'sys-warrior-plate'],
          features: [
            { name: 'Living Shadow', description: 'Conjure a shadowy simulacrum to fight alongside you.' },
            { name: 'Living Dead', description: 'Stay active at 0 HP for one combat round with tripled lifesteal.' }
          ],
          initialSpells: THEMATIC_SPELLS.dark_knight,
          authorId: 'system', authorName: 'Orestara'
        }
      ];
      updatedClasses = [...updatedClasses.filter(c => !c.id.startsWith('basic')), ...basicClasses];
    }

    if (scope === 'all' || scope === 'heroes') {
        const heroes: Character[] = [
            {
                id: 'hero-miri',
                name: 'Miri',
                classId: 'basic-fighter',
                race: 'Human',
                gender: 'Female',
                description: "An energetic swordswoman with a playful personality. Part of an inseparable trio with Seris and Lina.",
                level: 1,
                stats: { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 14 },
                hp: 12, maxHp: 12,
                feats: [
                    { name: 'Restless Spirit', description: 'Gains +2 to Initiative and cannot be surprised.' },
                    { name: 'Sword Waltz', description: 'Bonus action to give an enemy disadvantage on their next attack.' }
                ],
                inventory: ['sys-iron-longsword', 'sys-evening-shield', 'sys-warrior-plate'],
                isPlayer: true,
                authorId: 'system',
                authorName: 'Orestara'
            },
            {
                id: 'hero-seris',
                name: 'Seris',
                classId: 'basic-archer',
                race: 'Elf',
                gender: 'Female',
                description: "A reserved Elven archer who prefers distance. Member of the inseparable trio with Miri and Lina.",
                level: 1,
                stats: { strength: 8, dexterity: 17, constitution: 12, intelligence: 16, wisdom: 14, charisma: 10 },
                hp: 10, maxHp: 10,
                feats: [
                    { name: 'Aloof Precision', description: 'Deals extra 1d6 damage to targets further than 40ft away.' },
                    { name: 'Defensive Sarcasm', description: 'Force a DC 12 WIS save or Charm an enemy that misses you.' }
                ],
                inventory: ['sys-sky-piercer-bow', 'sys-thief-leathers'],
                isPlayer: false,
                authorId: 'system',
                authorName: 'Orestara'
            },
            {
                id: 'hero-lina',
                name: 'Lina',
                classId: 'basic-mage',
                race: 'Human',
                gender: 'Female',
                description: "A gentle priestess from a rural chapel. Member of the inseparable trio with Miri and Seris.",
                level: 1,
                stats: { strength: 9, dexterity: 11, constitution: 15, intelligence: 14, wisdom: 16, charisma: 13 },
                hp: 12, maxHp: 12,
                feats: [
                    { name: 'Rural Kindness', description: 'Healing grants the target a +2 bonus to their next save.' },
                    { name: 'Quiet Devotion', description: 'Can cast supportive spells silently once per rest.' }
                ],
                inventory: ['sys-menders-staff', 'sys-sorcerer-robes'],
                knownSpells: THEMATIC_SPELLS.mage.slice(0, 3),
                isPlayer: false,
                authorId: 'system',
                authorName: 'Orestara'
            }
        ];
        const existingHeroIds = new Set(updatedChars.map(c => c.id));
        const heroesToAdd = heroes.filter(h => !existingHeroIds.has(h.id));
        for (let h of heroesToAdd) {
          if (!h.imageUrl) {
            try { h.imageUrl = await generateImage(`Hero portrait: ${h.name}, ${h.race} ${h.classId}. ${h.description}. Masterpiece dark fantasy portrait.`); } catch(e) {}
          }
        }
        updatedChars = [...updatedChars, ...heroesToAdd];
    }

    if (scope === 'all' || scope === 'adventure') {
      const adventurePlot = "The Silvermarsh is dying. A ghastly pallor has infected the wildlife, turning them into aggressive aberrations. Local legends speak of a Gorechimera reborn from the filth of a forgotten battlefield. The party must venture into the heart of the mire to sever the source of the corruption before it reaches the capital.";
      const starterLog: GameLog = {
        role: 'dm',
        content: "You stand at the edge of the Silvermarsh. The air is thick with the scent of damp earth and something metallic. A pale, sickly mist clings to the twisted trees. Ahead, a group of frantic Goblins are fleeing from a Dread Skeleton that seems to be oozing the same white ichor infecting the plants. What do you do?",
        timestamp: Date.now()
      };
      setCampaign({
        plot: adventurePlot,
        summary: "The fellowship has arrived at the Silvermarsh to investigate a spreading blight linked to a Gorechimera.",
        logs: [starterLog],
        party: updatedChars.slice(0, 3), 
        rules: []
      });
    }

    // Auto-Sync with Master Repository to ensure integrity
    const synced = syncGlobalSystemArchive(updatedChars, updatedClasses, updatedMonsters, updatedItems);
    setCharacters(synced.newChars);
    setClasses(synced.newClasses);
    setMonsters(synced.newMonsters);
    setItems(deduplicateAndMergeItems(synced.newItems));

    notify("Arcanum Synchronized. Sigils manifest with Global Integrity.", "success");
  };

  const diceNeeded = useMemo(() => {
    if (campaign.logs.length === 0) return false;
    const lastLog = campaign.logs[campaign.logs.length - 1];
    if (lastLog.role !== 'dm') return false;
    const triggerWords = ['roll', 'die', 'dice', 'd20', 'd100', 'd12', 'd10', 'd8', 'd6', 'd4'];
    return triggerWords.some(word => lastLog.content.toLowerCase().includes(word));
  }, [campaign.logs]);

  const handleRollDice = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const roll: DiceRoll = { id: Math.random().toString(36).substr(2, 9), sides, result, timestamp: Date.now() };
    setLastRoll(roll);
    setRollHistory(prev => [roll, ...prev].slice(0, 10));
    if (result === sides && sides >= 10) notify(`CRITICAL! Natural ${result} on d${sides}`, 'success');
  };

  const aggregateAllResources = useCallback((suffix: string) => {
    const aggregated: any[] = [];
    const seenIds = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith(suffix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (item.id && !seenIds.has(item.id)) {
                aggregated.push(item);
                seenIds.add(item.id);
              }
            });
          }
        } catch (e) {
          console.error(`Aggregator: Corrupted data in ${key}`, e);
        }
      }
    }
    return aggregated;
  }, []);

  useEffect(() => {
    if (currentUser) {
      const uPrefix = currentUser.username;
      (window as any).isMythosAdmin = !!currentUser.isAdmin;
      
      let loadedChars = [], loadedClasses = [], loadedMonsters = [], loadedItems = [];

      if (currentUser.isAdmin) {
        loadedChars = aggregateAllResources('_mythos_chars');
        loadedClasses = aggregateAllResources('_mythos_classes');
        loadedMonsters = aggregateAllResources('_mythos_monsters');
        loadedItems = aggregateAllResources('_mythos_items');
        notify("Omniscience Enabled.", "success");
      } else {
        const savedChars = localStorage.getItem(`${uPrefix}_mythos_chars`);
        loadedChars = savedChars ? JSON.parse(savedChars) : [];
        const savedClasses = localStorage.getItem(`${uPrefix}_mythos_classes`);
        loadedClasses = savedClasses ? JSON.parse(savedClasses) : [];
        const savedMonsters = localStorage.getItem(`${uPrefix}_mythos_monsters`);
        loadedMonsters = savedMonsters ? JSON.parse(savedMonsters) : [];
        const savedItems = localStorage.getItem(`${uPrefix}_mythos_items`);
        loadedItems = savedItems ? JSON.parse(savedItems) : [];
      }

      // Automatically sync system content with Master Archive for all users on load
      const synced = syncGlobalSystemArchive(loadedChars, loadedClasses, loadedMonsters, loadedItems);
      setCharacters(synced.newChars);
      setClasses(synced.newClasses);
      setMonsters(synced.newMonsters);
      setItems(deduplicateAndMergeItems(synced.newItems));

      const savedCampaign = localStorage.getItem(`${uPrefix}_mythos_campaign`);
      setCampaign(savedCampaign ? JSON.parse(savedCampaign) : { plot: '', summary: '', logs: [], party: [], rules: [] });

      const today = new Date().toDateString();
      if (localStorage.getItem(`${uPrefix}_mythos_last_reset_day`) === today) {
        setDailyProUsed(parseInt(localStorage.getItem(`${uPrefix}_mythos_daily_pro_used`) || '0'));
        setDailyFlashUsed(parseInt(localStorage.getItem(`${uPrefix}_mythos_daily_flash_used`) || '0'));
      } else {
        localStorage.setItem(`${uPrefix}_mythos_last_reset_day`, today);
        setDailyProUsed(0); setDailyFlashUsed(0);
      }
    }
  }, [currentUser, aggregateAllResources, notify, deduplicateAndMergeItems, syncGlobalSystemArchive]);

  useEffect(() => {
    if (!currentUser) return;
    const uPrefix = currentUser.username;
    localStorage.setItem(`${uPrefix}_mythos_chars`, JSON.stringify(characters));
    localStorage.setItem(`${uPrefix}_mythos_classes`, JSON.stringify(classes));
    localStorage.setItem(`${uPrefix}_mythos_monsters`, JSON.stringify(monsters));
    localStorage.setItem(`${uPrefix}_mythos_items`, JSON.stringify(items));
    localStorage.setItem(`${uPrefix}_mythos_campaign`, JSON.stringify(campaign));
    localStorage.setItem(`${uPrefix}_mythos_daily_pro_used`, dailyProUsed.toString());
    localStorage.setItem(`${uPrefix}_mythos_daily_flash_used`, dailyFlashUsed.toString());
  }, [currentUser, characters, classes, monsters, items, campaign, dailyProUsed, dailyFlashUsed]);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Unknown' } as SyncMessage;
    connections.forEach(conn => { if (conn.open) conn.send(fullMsg); });
  }, [connections, peerId, currentUser]);

  useEffect(() => {
    const regenInterval = setInterval(() => {
      setArcaneTokens(prev => Math.min(prev + 0.016, 3)); 
      setReservoir(prev => Math.min(prev + 1.1, 100)); 
      setLockoutTime(prev => Math.max(prev - 1, 0));
    }, 1000);

    const handleUsage = (e: any) => {
      if (currentUser?.isAdmin) return;
      const { type } = e.detail;
      if (type === 'dm') {
        setArcaneTokens(prev => Math.max(prev - 1, 0));
        setDmModel(currentModel => {
          if (currentModel.includes('pro')) setDailyProUsed(p => p + 1);
          else setDailyFlashUsed(p => p + 1);
          return currentModel;
        });
      }
      if (type === 'utility') {
        setReservoir(prev => Math.max(prev - e.detail.cost, 0));
        setDailyFlashUsed(p => p + 1);
      }
    };

    const handleError = (e: any) => {
      if (currentUser?.isAdmin) return;
      if (e.detail.isRateLimit) setLockoutTime(LOCKOUT_DURATION);
      if (e.detail.isQuotaExceeded) setIsQuotaExhausted(true);
    };

    window.addEventListener('mythos:arcane_use' as any, handleUsage);
    window.addEventListener('mythos:arcane_error' as any, handleError);
    return () => {
      clearInterval(regenInterval);
      window.removeEventListener('mythos:arcane_use' as any, handleUsage);
      window.removeEventListener('mythos:arcane_error' as any, handleError);
    };
  }, [currentUser]);

  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => setConnections(prev => [...prev, conn]));
    conn.on('data', (data: any) => {
      const msg = data as SyncMessage;
      switch (msg.type) {
        case 'NEW_LOG': setCampaign(prev => ({ ...prev, logs: [...prev.logs, msg.payload] })); break;
        case 'GIVE_LOOT': setItems(prev => deduplicateAndMergeItems([...prev, msg.payload])); break;
        case 'STATE_UPDATE':
          if (msg.payload.campaign) setCampaign(msg.payload.campaign);
          if (msg.payload.classes) setClasses(msg.payload.classes);
          if (msg.payload.monsters) setMonsters(msg.payload.monsters);
          if (msg.payload.items) setItems(deduplicateAndMergeItems(msg.payload.items));
          if (msg.payload.characters) setCharacters(msg.payload.characters);
          break;
      }
    });
    conn.on('close', () => setConnections(prev => prev.filter(c => c.peer !== conn.peer)));
  }, [deduplicateAndMergeItems]);

  const initPeer = useCallback((customId?: string) => {
    if (peerRef.current) peerRef.current.destroy();
    const peer = customId ? new Peer(customId) : new Peer();
    peerRef.current = peer;
    peer.on('open', id => setPeerId(id));
    peer.on('connection', setupConnection);
  }, [setupConnection]);

  useEffect(() => {
    if (currentUser) initPeer();
    return () => peerRef.current?.destroy();
  }, [currentUser, initPeer]);

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  const reservoirReady = currentUser.isAdmin || (reservoir >= 1 && lockoutTime === 0);
  const arcadeReady = currentUser.isAdmin || (arcaneTokens >= 1 && lockoutTime === 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={() => setCurrentUser(null)} user={currentUser} />
      
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-[calc(60px+var(--safe-bottom))] lg:pb-0 pt-[calc(48px+var(--safe-top))] lg:pt-0">
        <div className="p-3 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={arcadeReady} dmModel={dmModel} setDmModel={setDmModel} isQuotaExhausted={isQuotaExhausted} localResetTime={localResetTime} items={items} user={currentUser} manifestBasics={manifestBasics} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={reservoirReady} currentUser={currentUser} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={serverLogs} joinSession={(id) => { setIsHost(false); const conn = peerRef.current!.connect(id); setupConnection(conn); }} setIsHost={setIsHost} forceSync={(sel) => {
              const state: any = {};
              if (sel.characters) state.characters = characters;
              if (sel.classes) state.classes = classes;
              if (sel.monsters) state.monsters = monsters;
              if (sel.items) state.items = items;
              if (sel.campaign) state.campaign = campaign;
              broadcast({ type: 'STATE_UPDATE', payload: state });
          }} kickSoul={() => {}} rehostWithSigil={(id) => { setIsHost(true); initPeer(id); }} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName: currentUser.displayName }} onImport={(d) => { setCharacters(d.characters); setClasses(d.classes); setMonsters(d.monsters); setItems(d.items); setCampaign(d.campaign); }} manifestBasics={() => manifestBasics('all')} onCloudSync={handleCloudSync} />}
        </div>
      </main>

      <div className="fixed top-[calc(56px+var(--safe-top))] right-3 z-[100] flex flex-col gap-2 pointer-events-none w-[calc(100%-24px)] md:w-auto items-end">
        {notifications.map(n => (
          <div key={n.id} className={`p-3 md:p-4 rounded-sm border shadow-2xl animate-notification pointer-events-auto min-w-[200px] max-w-full md:min-w-[280px] ${n.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-100' : n.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-100' : 'bg-black/90 border-[#b28a48]/50 text-[#b28a48]'}`}>
            <p className="text-[9px] leading-relaxed font-bold opacity-90">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Slimmed Top Bar for Mobile */}
      <div className="fixed top-0 right-0 left-0 lg:left-64 h-[calc(48px+var(--safe-top))] z-[60] bg-black/85 backdrop-blur-lg border-b border-neutral-900 px-4 md:px-6 flex items-center justify-between pt-[var(--safe-top)]">
        <div className="flex items-center gap-3 md:gap-8">
           <div className="flex flex-col items-end">
              <span className="text-[7px] font-black text-neutral-600 uppercase tracking-widest leading-none mb-0.5">Resonance</span>
              <span className={`text-[11px] font-black leading-none ${currentUser.isAdmin ? 'text-blue-400' : (arcaneTokens < 1 ? 'text-red-500' : 'text-[#b28a48]')}`}>{currentUser.isAdmin ? '∞' : Math.floor(arcaneTokens)} / 3</span>
           </div>
           <div className="w-16 md:w-32 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative shadow-inner">
              <div className={`h-full transition-all duration-700 ${currentUser.isAdmin ? 'bg-blue-500' : (lockoutTime > 0 ? 'bg-red-600' : 'bg-[#b28a48]')}`} style={{ width: `${currentUser.isAdmin ? 100 : (lockoutTime > 0 ? (lockoutTime / LOCKOUT_DURATION) * 100 : reservoir)}%` }}></div>
           </div>
        </div>
        <div className="lg:hidden fantasy-font text-[10px] text-[#b28a48] font-black tracking-widest">
          MYTHOS
        </div>
      </div>

      <div className="fixed bottom-[calc(70px+var(--safe-bottom))] lg:bottom-4 right-4 z-[90] flex flex-col items-end gap-3 pointer-events-none">
        {diceTrayOpen && (
          <div className="grim-card w-56 md:w-64 p-3 md:p-4 border border-[#b28a48]/40 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-3 border-b border-[#b28a48]/10 pb-1.5">
              <h4 className="text-[9px] font-black fantasy-font text-[#b28a48] tracking-widest">CHRONICLE FATES</h4>
              <button onClick={() => setDiceTrayOpen(false)} className="text-neutral-600 hover:text-red-500 transition-colors text-sm">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {[4, 6, 8, 10, 12, 20, 100].map(d => (
                <button key={d} onClick={() => handleRollDice(d)} className="bg-neutral-950 border border-neutral-900 hover:border-[#b28a48] hover:text-[#b28a48] p-1.5 md:p-2 rounded-sm transition-all flex flex-col items-center justify-center gap-1 group active:scale-95">
                  <span className="text-xs font-black">d{d}</span>
                </button>
              ))}
            </div>
            {lastRoll && (
              <div className="text-center mb-4">
                <div className="text-[7px] font-black text-neutral-600 uppercase tracking-widest mb-0.5">Result d{lastRoll.sides}</div>
                <div className={`text-4xl md:text-5xl font-black fantasy-font ${lastRoll.result === lastRoll.sides && lastRoll.sides >= 10 ? 'text-amber-500 animate-pulse' : 'text-neutral-200'}`}>{lastRoll.result}</div>
              </div>
            )}
          </div>
        )}
        {(diceTrayOpen || diceNeeded) && (
          <button onClick={() => setDiceTrayOpen(!diceTrayOpen)} className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl md:text-2xl transition-all pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.8)] border ${diceTrayOpen ? 'bg-[#b28a48] text-black border-amber-300' : 'bg-neutral-900 text-[#b28a48] border-[#b28a48]/30 hover:border-[#b28a48] hover:bg-black'} ${diceNeeded && !diceTrayOpen ? 'animate-bounce border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : ''}`}>🎲</button>
        )}
      </div>
    </div>
  );
};

export default App;