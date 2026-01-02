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

const COMMON_SPELLS: Spell[] = [
  { name: 'Guidance', level: 0, school: 'Divination', description: 'Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.' },
  { name: 'Light', level: 0, school: 'Evocation', description: 'Touch an object; it sheds bright light in a 20ft radius for 1 hour.' },
  { name: 'Mage Hand', level: 0, school: 'Conjuration', description: 'A spectral, floating hand appears at a point you choose within 30ft. It can manipulate objects up to 10lbs.' },
  { name: 'Healing Word', level: 1, school: 'Evocation', description: 'A creature of your choice regains HP equal to 1d4 + Spellcasting Modifier as a bonus action.' },
  { name: 'Shield of Faith', level: 1, school: 'Abjuration', description: 'A shimmering field surrounds a creature, granting it +2 AC for up to 10 minutes.' },
  { name: 'Magic Missile', level: 1, school: 'Evocation', description: 'Three darts of force strike targets unerringly. Each dart deals 1d4 + 1 force damage.' },
  { name: 'Cure Wounds', level: 1, school: 'Evocation', description: 'A creature you touch regains HP equal to 1d8 + Spellcasting Modifier.' },
  { name: 'Detect Magic', level: 1, school: 'Divination', description: 'For up to 10 minutes, you sense the presence of magic within 30 feet of you.' },
  { name: 'Misty Step', level: 2, school: 'Conjuration', description: 'Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see.' },
  { name: 'Lesser Restoration', level: 2, school: 'Abjuration', description: 'Touch a creature and end either one disease or one condition: blinded, deafened, paralyzed, or poisoned.' },
  { name: 'Spiritual Weapon', level: 2, school: 'Evocation', description: 'Create a spectral weapon. Make a melee spell attack to deal 1d8 + Modifier force damage as a bonus action.' },
  { name: 'Fireball', level: 3, school: 'Evocation', description: 'A massive explosion of flame. Each creature in a 20ft radius takes 8d6 fire damage (DEX save for half).' },
  { name: 'Revivify', level: 3, school: 'Necromancy', description: 'Touch a creature that has died within the last minute. The creature returns to life with 1 hit point.' },
];

const SYSTEM_MONSTERS: Monster[] = [
  {
    id: 'sys-goblin',
    name: 'Goblin Scavenger',
    description: 'A small, green-skinned humanoid with sharp teeth and a malicious grin. They hunt in packs and prefer the shadows.',
    stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
    hp: 7,
    ac: 13,
    abilities: [{ name: 'Nimble Escape', effect: 'Can Disengage or Hide as a bonus action.' }],
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-skeleton',
    name: 'Dread Skeleton',
    description: 'Bones knit together by dark necromancy, eyes glowing with cold blue fire. It feels no pain and knows no fear.',
    stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 },
    hp: 13,
    ac: 13,
    abilities: [{ name: 'Undead Fortitude', effect: 'If reduced to 0 HP, stay at 1 HP on a successful CON save.' }],
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-orc',
    name: 'Orc Marauder',
    description: 'A hulking brute with grey skin and teeth, wielding a rusted greataxe and driven by bloodlust.',
    stats: { strength: 16, dexterity: 12, constitution: 16, intelligence: 7, wisdom: 11, charisma: 10 },
    hp: 18,
    ac: 14,
    abilities: [{ name: 'Aggressive', effect: 'As a bonus action, move up to its speed toward a hostile creature it can see.' }],
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-gorechimera',
    name: 'Gorechimera',
    description: 'A terrifying legendary beast with the head and shoulders of a lion, the body and head of a goat, and a serpent tail that spews venom. Its skin is a ghastly pallid shade compared to standard chimeras.',
    isBoss: true,
    stats: { strength: 22, dexterity: 12, constitution: 20, intelligence: 12, wisdom: 16, charisma: 14 },
    hp: 240,
    ac: 18,
    abilities: [
      { name: 'Venomous Serpent', effect: 'Tail spray deals 4d6 poison damage and target is Poisoned (DC 16 CON half).' },
      { name: 'Lion Head Rend', effect: 'Melee weapon attack: +10 to hit, 10ft reach. Deals 3d10+6 slashing damage.' },
      { name: 'Goat Head Restoration', effect: 'Goat head can use its action to revive one slain non-boss monster within 30ft to half HP, or fully heal its other heads.' }
    ],
    legendaryActions: [
      { name: 'Triple Strike', effect: 'Each head makes one attack against a different target.' },
      { name: 'Goat\'s Bleat', effect: 'Allied creatures within 40ft regain 4d8 hit points.' }
    ],
    authorId: 'Orestara', authorName: 'Orestara'
  }
];

const SYSTEM_ITEMS: Item[] = [
  {
    id: 'sys-iron-longsword',
    name: 'Standard Longsword',
    type: 'Weapon',
    description: 'A well-balanced one-handed blade of cold-forged iron.',
    mechanics: [{ name: 'Parry', description: 'As a reaction, add +2 to AC against one melee attack.' }],
    lore: 'Standard issue for the King\'s Guard, forged under the eye of Orestara.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-gargantuan-greatsword',
    name: 'Titan Zweihänder',
    type: 'Weapon',
    description: 'A massive two-handed sword that hums with the roar of a Warrior.',
    mechanics: [{ name: 'Heavy Impact', description: 'Deals 2d6 slashing damage. On a critical hit, the target is knocked Prone.' }],
    lore: 'Forged for Warriors who serve as the vanguard. Focuses on pure physical devastation.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-dark-executioner',
    name: 'Abyssal Executioner',
    type: 'Weapon',
    description: 'A jagged greatsword that bleeds black smoke. Signature weapon of the Dark Knight.',
    mechanics: [{ name: 'Siphon Soul', description: 'Deals 1d10 slashing + 1d6 necrotic damage. Restore HP equal to half the necrotic damage dealt.' }],
    lore: 'A blade that requires one to gaze into the void to master. Focuses on magical life-drain.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-evening-shield',
    name: 'Daughter of the Evening',
    type: 'Armor',
    description: 'A legendary mirrored shield that reflects the silver light of a dying sun.',
    mechanics: [
      { name: 'Gaze Reflection', description: 'When targeted by a gaze-based attack, the wielder can reflect the effect back at the source (DC 15 Dexterity save to activate).' },
      { name: 'Silvery Guard', description: 'Grants +2 AC and resistance to Radiant damage.' }
    ],
    lore: 'Forged to hunt the Gorgon queens in the twilight of the first age.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-order-kite-shield',
    name: 'Order Kite Shield',
    type: 'Armor',
    description: 'A heavy steel shield bearing the insignia of the Royal Order.',
    mechanics: [{ name: 'Bastion', description: 'While holding this shield, you can use your reaction to grant an adjacent ally +2 AC until the start of your next turn.' }],
    lore: 'Standard protection for the frontline guardians of the realm.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-ebon-cuirass',
    name: 'Cuirass of the Ebon Void',
    type: 'Armor',
    description: 'Heavy plate armor for Dark Knights that resonates with the wearer\'s conviction.',
    mechanics: [{ name: 'Soul Resonance', description: 'While wearing this armor, add your Charisma modifier to your Armor Class (max +2).' }],
    lore: 'Forged from meteorite iron cooled in the blood of shadows.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-warrior-plate',
    name: 'Titan\'s Full Plate',
    type: 'Armor',
    description: 'Imposing full plate armor for Warriors who stand immovable.',
    mechanics: [{ name: 'Unshakeable', description: 'Base AC 18. Advantage on saving throws against being moved or knocked Prone.' }],
    lore: 'The literal wall between the party and death.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-menders-staff',
    name: 'Crest of Mercy',
    type: 'Weapon',
    description: 'A white-ash staff that pulses with soft golden light.',
    mechanics: [{ name: 'Mercy Aura', description: 'Increases all healing spells cast by the wielder by 2 per die rolled.' }],
    lore: 'A gift from Orestara to the first Mages of the Order.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-sky-piercer-bow',
    name: 'Sky-Piercer Bow',
    type: 'Weapon',
    description: 'A masterfully crafted bow that can ground flying beasts.',
    mechanics: [{ name: 'Aerial Mastery', description: 'Deals 1d8 piercing. Advantage against flying enemies or targets further than 60ft away.' }],
    lore: 'Heavens are no sanctuary from an Archer\'s arrow.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-assassin-daggers',
    name: 'Assassin\'s Twin Daggers',
    type: 'Weapon',
    description: 'A pair of thin, black-steel daggers designed for silent lethality.',
    mechanics: [{ name: 'Finesse Striking', description: 'Deals 1d4 piercing. On a surprise attack, deal an extra 2d6 poison damage.' }],
    lore: 'Tools for the Thief who strikes from the unseen dark.',
    authorId: 'Orestara', authorName: 'Orestara'
  },
  {
    id: 'sys-archsorcerer-staff',
    name: 'Staff of Destructive Will',
    type: 'Weapon',
    description: 'A tall staff capped with a burning ruby, used by high Sorcerers.',
    mechanics: [{ name: 'Arcane Explosion', description: 'Once per rest, double the area of effect of your next destructive spell.' }],
    lore: 'A channel for raw elemental power that tests the wielder\'s spirit.',
    authorId: 'Orestara', authorName: 'Orestara'
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive' | 'spells'>('campaign');
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

  const syncAllClassesToSpells = useCallback((classList: ClassDef[]): ClassDef[] => {
    return classList.map(cls => {
      const hasSlots = cls.spellSlots && cls.spellSlots.some(s => s > 0);
      if (!hasSlots) return { ...cls, initialSpells: [] };

      const classKeywords = (cls.name + ' ' + cls.description).toLowerCase();
      const isArcane = classKeywords.includes('mage') || classKeywords.includes('wizard') || classKeywords.includes('sorcerer') || classKeywords.includes('arcan') || classKeywords.includes('void') || classKeywords.includes('blood') || classKeywords.includes('weaver') || classKeywords.includes('warlock') || classKeywords.includes('spell');
      const isDivine = classKeywords.includes('cleric') || classKeywords.includes('paladin') || classKeywords.includes('priest') || classKeywords.includes('holy') || classKeywords.includes('light') || classKeywords.includes('templar') || classKeywords.includes('divine') || classKeywords.includes('sacred');
      const isDruidic = classKeywords.includes('druid') || classKeywords.includes('ranger') || classKeywords.includes('nature') || classKeywords.includes('wild') || classKeywords.includes('primal') || classKeywords.includes('beast') || classKeywords.includes('flora');
      
      let currentSpells = (cls.initialSpells || []).filter(s => {
          const sName = s.name.toLowerCase();
          if (isArcane && !isDivine && !isDruidic && (sName.includes('cure') || sName.includes('heal') || sName.includes('revivify') || sName.includes('restoration'))) return false;
          const isOffensiveArcane = sName.includes('fireball') || sName.includes('missile') || sName.includes('lightning') || sName.includes('acid');
          if (isDivine && !isArcane && isOffensiveArcane && !classKeywords.includes('wrath') && !classKeywords.includes('war') && !classKeywords.includes('vengeance')) return false;
          if (isDruidic && !isArcane && !isDivine && (sName.includes('mage hand') || sName.includes('spiritual weapon'))) return false;
          return true;
      });
      
      COMMON_SPELLS.forEach(common => {
        const alreadyKnown = currentSpells.some(s => s.name.toLowerCase() === common.name.toLowerCase());
        if (alreadyKnown) return;
        let shouldAdd = false;
        const cName = common.name.toLowerCase();
        if ((isDivine || isDruidic) && (cName.includes('heal') || cName.includes('restoration') || cName.includes('revivify') || cName.includes('cure'))) shouldAdd = true;
        if (isArcane && (common.school === 'Evocation' || common.school === 'Conjuration' || common.school === 'Divination')) {
             if (!cName.includes('healing')) shouldAdd = true;
        }
        if (['Guidance', 'Light', 'Detect Magic'].includes(common.name)) shouldAdd = true;
        if (['Mage Hand'].includes(common.name) && isArcane) shouldAdd = true;
        if (shouldAdd) {
            if (isArcane && !isDivine && (cName.includes('healing') || cName.includes('cure'))) shouldAdd = false;
            if (shouldAdd) currentSpells.push(common);
        }
      });
      return { ...cls, initialSpells: currentSpells };
    });
  }, []);

  const manifestBasics = (scope: 'all' | 'monsters' | 'items' | 'heroes' = 'all') => {
    if (scope === 'all' || scope === 'monsters') {
      const existingIds = new Set(monsters.map(m => m.id));
      const monstersToAdd = SYSTEM_MONSTERS.filter(m => !existingIds.has(m.id));
      setMonsters(prev => [...prev, ...monstersToAdd]);
    }
    if (scope === 'all' || scope === 'items') {
      const existingIds = new Set(items.map(i => i.id));
      const itemsToAdd = SYSTEM_ITEMS.filter(i => !existingIds.has(i.id));
      setItems(prev => [...prev, ...itemsToAdd]);
    }
    if (scope === 'all' || scope === 'heroes') {
        const heroes: Character[] = [
            {
                id: 'hero-miri',
                name: 'Miri',
                classId: 'basic-fighter',
                race: 'Human',
                gender: 'Female',
                description: "An energetic swordswoman with a playful personality. Loud and restless. Miri, Lina, and Seris are traveling companions and will always be found together.",
                level: 1,
                stats: { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 14 },
                hp: 12, maxHp: 12,
                feats: [
                    { name: 'Restless Spirit', description: 'Gains +2 to Initiative and cannot be surprised while conscious.' },
                    { name: 'Sword Waltz', description: 'Bonus action to give an enemy disadvantage on their next attack.' }
                ],
                inventory: ['sys-iron-longsword', 'sys-order-kite-shield'],
                isPlayer: true
            },
            {
                id: 'hero-seris',
                name: 'Seris',
                classId: 'basic-archer',
                race: 'Elf',
                gender: 'Female',
                description: "A reserved Elven archer who keeps a cool façade. Easily flustered. Part of the inseparable trio with Miri and Lina; they are never found apart.",
                level: 1,
                stats: { strength: 8, dexterity: 17, constitution: 12, intelligence: 16, wisdom: 14, charisma: 10 },
                hp: 10, maxHp: 10,
                feats: [
                    { name: 'Aloof Precision', description: 'Extra 1d6 damage to targets further than 40ft away.' },
                    { name: 'Defensive Sarcasm', description: 'Force a DC 12 WIS save or Charm an enemy that misses you.' }
                ],
                inventory: ['sys-sky-piercer-bow'],
                isPlayer: false
            },
            {
                id: 'hero-lina',
                name: 'Lina',
                classId: 'basic-mage',
                race: 'Human',
                gender: 'Female',
                description: "A gentle priestess from a rural chapel. Shy and overwhelmed easily. Inseparably bound to her companions Miri and Seris; where one is, all are.",
                level: 1,
                stats: { strength: 9, dexterity: 11, constitution: 15, intelligence: 14, wisdom: 16, charisma: 13 },
                hp: 12, maxHp: 12,
                feats: [
                    { name: 'Rural Kindness', description: 'Healing grants the target a +2 bonus to their next save.' },
                    { name: 'Quiet Devotion', description: 'Can cast supportive spells silently once per rest.' }
                ],
                inventory: ['sys-menders-staff'],
                knownSpells: [
                  { name: 'Blessing of the Chapel', level: 1, school: 'Abjuration', description: 'Target gains +1 AC and Necrotic resistance for 1 minute.' }
                ],
                isPlayer: false
            }
        ];
        const existingHeroIds = new Set(characters.map(c => c.id));
        const heroesToAdd = heroes.filter(h => !existingHeroIds.has(h.id));
        setCharacters(prev => [...prev, ...heroesToAdd]);
    }
    if (scope === 'all') {
      const basicClasses: ClassDef[] = [
        {
          id: 'basic-warrior',
          name: 'Warrior',
          description: 'Mighty physical vanguards who focus on heavy weapons and unbreakable defense.',
          hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Full Plate Armor Proficiency', 'Heavy Weapon Mastery'], 
          features: [
            { name: 'Mighty Roar', description: 'Unleash a roar granting 1d8+Level temporary hit points.' }, 
            { name: 'Crushing Blow', description: 'Critical hits knock enemies prone.' }
          ], 
          initialSpells: [], 
          authorId: 'Orestara', authorName: 'Orestara'
        },
        {
          id: 'basic-fighter',
          name: 'Fighter',
          description: 'Balanced masters of combat techniques and defensive shielding.',
          hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Shield Mastery', 'Heavy Armor Proficiency'], 
          features: [
            { name: 'Shield Bash', description: 'Strike with a shield for blunt damage and flinching.' }, 
            { name: 'Firm Bastion', description: 'Protect adjacent allies as a reaction.' }
          ], 
          initialSpells: [], 
          authorId: 'Orestara', authorName: 'Orestara'
        },
        {
          id: 'basic-sorcerer',
          name: 'Sorcerer',
          description: 'Masters of raw elemental magic who turn the tide of battle with destruction.',
          hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 2, 0], preferredStats: ['Intelligence', 'Charisma'], bonuses: ['Staff Mastery', 'Arcane Destruction'], 
          features: [
            { name: 'Spell Memory', description: 'Cast a memorized spell without a slot once per rest.' }, 
            { name: 'Destructive Tide', description: 'Offensive spells deal extra damage based on Charisma.' }
          ], 
          initialSpells: [
            { name: 'Arcane Ruin', level: 1, school: 'Evocation', description: 'A burst of raw energy dealing 3d6 force damage.' }
          ], 
          authorId: 'Orestara', authorName: 'Orestara'
        },
        {
          id: 'basic-mage',
          name: 'Mage',
          description: 'Supportive aether-users who heal wounds and shield the fellowship.',
          hitDie: 'd8', startingHp: 10, hpPerLevel: 6, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Supportive Aura', 'Healing Mastery'], 
          features: [
            { name: 'Resonant Benediction', description: 'Healing spells affect one additional nearby ally.' }, 
            { name: 'Vital Flow', description: 'Bonus action to restore 1d10 + WIS hit points.' }
          ], 
          initialSpells: [
            { name: 'Aetheric Aegis', level: 1, school: 'Abjuration', description: 'Shimmering barrier for allies for 2 rounds.' }
          ], 
          authorId: 'Orestara', authorName: 'Orestara'
        },
        {
          id: 'basic-thief',
          name: 'Thief',
          description: 'Masters of stealth and precision strikes who excel at unseen lethality.',
          hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Dual Dagger Mastery', 'Stealth Proficiency'], 
          features: [
            { name: 'Executioner\'s Strike', description: 'Execute a grappled or surprised human-sized enemy.' }, 
            { name: 'Smoke Escape', description: 'Reaction to vanish and disengage instantly.' }
          ], 
          initialSpells: [], 
          authorId: 'Orestara', authorName: 'Orestara'
        },
        {
          id: 'basic-archer',
          name: 'Archer',
          description: 'Deadly marksmen who ground aerial threats with supernatural accuracy.',
          hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Longbow Accuracy', 'Aerial Sniper'], 
          features: [
            { name: 'Exposed Weakness', description: 'Extra damage against isolated enemies.' }, 
            { name: 'Sky Guard', description: 'Advantage on attack rolls against flying enemies.' }
          ], 
          initialSpells: [], 
          authorId: 'Orestara', authorName: 'Orestara'
        },
        {
          id: 'basic-dark-knight',
          name: 'Dark Knight',
          description: 'Warriors who channel forbidden aether to siphon life and shield with shadows.',
          hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [2, 0, 0], preferredStats: ['Strength', 'Charisma'], bonuses: ['Two-Handed Mastery', 'Soul-Resonance'],
          features: [
            { name: 'Living Shadow', description: 'Conjure a shadowy simulacrum to fight alongside you.' },
            { name: 'Living Dead', description: 'Stay active at 0 HP for 10 seconds with tripled lifesteal.' }
          ],
          initialSpells: [
            { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 2d6 health from nearby enemies, healing for half.' }
          ],
          authorId: 'Orestara', authorName: 'Orestara'
        }
      ];
      const syncedClasses = syncAllClassesToSpells([...classes.filter(c => !c.id.startsWith('basic')), ...basicClasses]);
      setClasses(syncedClasses);
    }
    notify("Arcanum Synchronized.", "success");
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
      
      if (currentUser.isAdmin) {
        const allChars = aggregateAllResources('_mythos_chars');
        const allClasses = aggregateAllResources('_mythos_classes');
        const allMonsters = aggregateAllResources('_mythos_monsters');
        const allItems = aggregateAllResources('_mythos_items');
        
        setCharacters(allChars);
        setClasses(allClasses);
        setMonsters(allMonsters);
        setItems(allItems);
        
        notify("Omniscience Enabled.", "success");
      } else {
        const savedChars = localStorage.getItem(`${uPrefix}_mythos_chars`);
        setCharacters(savedChars ? JSON.parse(savedChars) : []);
        const savedClasses = localStorage.getItem(`${uPrefix}_mythos_classes`);
        setClasses(savedClasses ? JSON.parse(savedClasses) : []);
        const savedMonsters = localStorage.getItem(`${uPrefix}_mythos_monsters`);
        setMonsters(savedMonsters ? JSON.parse(savedMonsters) : []);
        const savedItems = localStorage.getItem(`${uPrefix}_mythos_items`);
        setItems(savedItems ? JSON.parse(savedItems) : []);
      }

      const savedCampaign = localStorage.getItem(`${uPrefix}_mythos_campaign`);
      const campaignData = savedCampaign ? JSON.parse(savedCampaign) : { plot: '', summary: '', logs: [], party: [], rules: [] };
      if (!campaignData.rules) campaignData.rules = [];
      setCampaign(campaignData);

      const today = new Date().toDateString();
      const lastReset = localStorage.getItem(`${uPrefix}_mythos_last_reset_day`);
      if (lastReset === today) {
        setDailyProUsed(parseInt(localStorage.getItem(`${uPrefix}_mythos_daily_pro_used`) || '0'));
        setDailyFlashUsed(parseInt(localStorage.getItem(`${uPrefix}_mythos_daily_flash_used`) || '0'));
      } else {
        localStorage.setItem(`${uPrefix}_mythos_last_reset_day`, today);
        setDailyProUsed(0); setDailyFlashUsed(0);
      }
    } else {
      (window as any).isMythosAdmin = false;
    }
  }, [currentUser, aggregateAllResources, notify]);

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
      const { type, cost } = e.detail;
      if (type === 'dm') {
        setArcaneTokens(prev => Math.max(prev - 1, 0));
        setDmModel(currentModel => {
          if (currentModel.includes('pro')) setDailyProUsed(p => p + 1);
          else setDailyFlashUsed(p => p + 1);
          return currentModel;
        });
      }
      if (type === 'utility') {
        setReservoir(prev => Math.max(prev - cost, 0));
        setDailyFlashUsed(p => p + 1);
      }
    };

    const handleError = (e: any) => {
      if (currentUser?.isAdmin) return;
      if (e.detail.isRateLimit) {
        setLockoutTime(LOCKOUT_DURATION);
        notify("Ley Lines Overloaded.", "error");
      }
      if (e.detail.isQuotaExceeded) {
        setIsQuotaExhausted(true);
        setLocalResetTime(new Date(Date.now() + 86400000).toLocaleTimeString());
      }
    };

    window.addEventListener('mythos:arcane_use' as any, handleUsage);
    window.addEventListener('mythos:arcane_error' as any, handleError);
    return () => {
      clearInterval(regenInterval);
      window.removeEventListener('mythos:arcane_use' as any, handleUsage);
      window.removeEventListener('mythos:arcane_error' as any, handleError);
    };
  }, [notify, currentUser]);

  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      setConnections(prev => [...prev, conn]);
      setServerLogs(prev => [...prev, { id: Math.random().toString(36), message: `Resonance with ${conn.peer}`, type: 'success', timestamp: Date.now() }]);
    });
    conn.on('data', (data: any) => {
      const msg = data as SyncMessage;
      switch (msg.type) {
        case 'SHARE_RESOURCE':
          const { resourceType, resourceData } = msg.payload;
          if (resourceType === 'class') setClasses(prev => prev.some(c => c.id === resourceData.id) ? prev : [...prev, resourceData]);
          else if (resourceType === 'monster') setMonsters(prev => prev.some(m => m.id === resourceData.id) ? prev : [...prev, resourceData]);
          else if (resourceType === 'item') setItems(prev => prev.some(i => i.id === resourceData.id) ? prev : [...prev, resourceData]);
          notify(`Resource received: ${resourceData.name}`, 'success');
          break;
        case 'NEW_LOG': setCampaign(prev => ({ ...prev, logs: [...prev.logs, msg.payload] })); break;
        case 'SUMMARY_UPDATE': setCampaign(prev => ({ ...prev, summary: msg.payload })); break;
        case 'GIVE_LOOT': setItems(prev => [...prev, msg.payload]); notify(`Loot received: ${msg.payload.name}`, 'info'); break;
        case 'STATE_UPDATE':
          if (msg.payload.campaign) setCampaign(msg.payload.campaign);
          if (msg.payload.classes) setClasses(msg.payload.classes);
          if (msg.payload.monsters) setMonsters(msg.payload.monsters);
          if (msg.payload.items) setItems(msg.payload.items);
          if (msg.payload.characters) setCharacters(msg.payload.characters);
          notify("Chronicle synchronized", "info");
          break;
      }
    });
    conn.on('close', () => {
      setConnections(prev => prev.filter(c => c.peer !== conn.peer));
      setServerLogs(prev => [...prev, { id: Math.random().toString(36), message: `Connection lost with ${conn.peer}`, type: 'warn', timestamp: Date.now() }]);
    });
  }, [notify]);

  const initPeer = useCallback((customId?: string) => {
    if (peerRef.current) peerRef.current.destroy();
    const peer = customId ? new Peer(customId) : new Peer();
    peerRef.current = peer;
    peer.on('open', (id) => {
      setPeerId(id);
      setServerLogs(prev => [...prev, { id: Math.random().toString(36), message: `Local sigil: ${id}`, type: 'info', timestamp: Date.now() }]);
    });
    peer.on('connection', (conn) => setupConnection(conn));
    peer.on('error', (err) => {
      setServerLogs(prev => [...prev, { id: Math.random().toString(36), message: `Instability: ${err.type}`, type: 'error', timestamp: Date.now() }]);
    });
  }, [setupConnection, notify]);

  const connectToHost = useCallback((hostSigil: string) => {
    if (!peerRef.current || !peerRef.current.open) { notify("Portal not ready.", "error"); return; }
    const conn = peerRef.current.connect(hostSigil);
    setupConnection(conn);
  }, [setupConnection, notify]);

  useEffect(() => {
    if (!currentUser) return;
    initPeer();
    return () => { peerRef.current?.destroy(); };
  }, [currentUser, initPeer]);

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  const isExhausted = lockoutTime > 0;
  const proPercent = (dailyProUsed / DAILY_PRO_LIMIT) * 100;
  const flashPercent = (dailyFlashUsed / DAILY_FLASH_LIMIT) * 100;

  const arcadeReady = currentUser.isAdmin || (arcaneTokens >= 1 && !isExhausted);
  const reservoirReady = currentUser.isAdmin || (reservoir >= 1 && !isExhausted);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={() => setCurrentUser(null)} user={currentUser} />
      
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-[calc(80px+var(--safe-bottom))] lg:pb-0 pt-[calc(64px+var(--safe-top))] lg:pt-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={arcadeReady} dmModel={dmModel} setDmModel={setDmModel} isQuotaExhausted={isQuotaExhausted} localResetTime={localResetTime} items={items} user={currentUser} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={reservoirReady} currentUser={currentUser} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} syncSpells={syncAllClassesToSpells} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={serverLogs} joinSession={(id) => { setIsHost(false); connectToHost(id); }} setIsHost={setIsHost} forceSync={(selection) => {
              if (connections.length === 0) return;
              const state: any = {};
              if (selection.characters) state.characters = characters;
              if (selection.classes) state.classes = classes;
              if (selection.monsters) state.monsters = monsters;
              if (selection.items) state.items = items;
              if (selection.campaign) state.campaign = campaign;
              broadcast({ type: 'STATE_UPDATE', payload: state });
          }} kickSoul={(id) => {}} rehostWithSigil={(id) => { setIsHost(true); initPeer(id); }} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName: currentUser.displayName }} onImport={(d) => { setCharacters(d.characters); setClasses(d.classes); setMonsters(d.monsters); setItems(d.items); setCampaign(d.campaign); }} manifestBasics={() => manifestBasics('all')} />}
        </div>
      </main>

      <div className="fixed top-[calc(70px+var(--safe-top))] right-4 z-[100] flex flex-col gap-2 pointer-events-none w-[calc(100%-32px)] md:w-auto items-end">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-sm border shadow-2xl animate-notification pointer-events-auto min-w-[240px] max-w-full md:min-w-[280px] ${n.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-100' : n.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-100' : 'bg-black/90 border-[#b28a48]/50 text-[#b28a48]'}`}>
            <p className="text-[10px] leading-relaxed font-bold opacity-90">{n.message}</p>
          </div>
        ))}
      </div>

      <div className="fixed top-0 right-0 left-0 lg:left-64 h-[calc(64px+var(--safe-top))] z-[60] bg-black/80 backdrop-blur-md border-b border-neutral-900 px-6 flex items-center justify-between pt-[var(--safe-top)]">
        <div className="flex items-center gap-4 md:gap-8">
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Resonance</span>
              <span className={`text-sm font-black ${currentUser.isAdmin ? 'text-blue-400' : (arcaneTokens < 1 ? 'text-red-500' : 'text-[#b28a48]')}`}>{currentUser.isAdmin ? '∞' : Math.floor(arcaneTokens)} / 3</span>
           </div>
           <div className="w-20 md:w-32 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative shadow-inner">
              <div className={`h-full transition-all duration-700 ${currentUser.isAdmin ? 'bg-blue-500' : (isExhausted ? 'bg-red-600' : 'bg-[#b28a48]')}`} style={{ width: `${currentUser.isAdmin ? 100 : (isExhausted ? (lockoutTime / LOCKOUT_DURATION) * 100 : reservoir)}%` }}></div>
           </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 md:gap-8">
           <div className="flex flex-col items-start gap-1">
              <div className="flex justify-between w-20 md:w-24">
                <span className="text-[7px] font-black text-neutral-500 uppercase tracking-tighter">Fidelity</span>
                <span className={`text-[7px] font-bold ${proPercent > 80 ? 'text-red-500' : 'text-[#b28a48]'}`}>{currentUser.isAdmin ? '∞' : `${dailyProUsed}/${DAILY_PRO_LIMIT}`}</span>
              </div>
              <div className="w-20 md:w-24 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div className={`h-full transition-all duration-1000 ${currentUser.isAdmin ? 'bg-blue-500' : (proPercent > 80 ? 'bg-red-500' : 'bg-[#b28a48]')}`} style={{ width: `${currentUser.isAdmin ? 100 : proPercent}%` }}></div>
              </div>
           </div>

           <div className="hidden md:flex flex-col items-start gap-1">
              <div className="flex justify-between w-24">
                <span className="text-[7px] font-black text-neutral-500 uppercase tracking-tighter">Velocity</span>
                <span className={`text-[7px] font-bold ${flashPercent > 80 ? 'text-red-500' : 'text-[#b28a48]'}`}>{currentUser.isAdmin ? '∞' : `${dailyFlashUsed}/${DAILY_FLASH_LIMIT}`}</span>
              </div>
              <div className="w-24 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div className={`h-full transition-all duration-1000 ${currentUser.isAdmin ? 'bg-blue-500' : (flashPercent > 80 ? 'bg-red-500' : 'bg-[#b28a48]')}`} style={{ width: `${currentUser.isAdmin ? 100 : flashPercent}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      <div className="fixed bottom-[calc(90px+var(--safe-bottom))] lg:bottom-4 right-4 z-[90] flex flex-col items-end gap-3 pointer-events-none">
        {diceTrayOpen && (
          <div className="grim-card w-64 p-4 border border-[#b28a48]/40 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-[#b28a48]/10 pb-2">
              <h4 className="text-[10px] font-black fantasy-font text-[#b28a48] tracking-widest">CHRONICLE FATES</h4>
              <button onClick={() => setDiceTrayOpen(false)} className="text-neutral-600 hover:text-red-500 transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[4, 6, 8, 10, 12, 20, 100].map(d => (
                <button key={d} onClick={() => handleRollDice(d)} className="bg-neutral-950 border border-neutral-900 hover:border-[#b28a48] hover:text-[#b28a48] p-2 rounded-sm transition-all flex flex-col items-center justify-center gap-1 group active:scale-95">
                  <span className="text-sm font-black">d{d}</span>
                </button>
              ))}
            </div>
            {lastRoll && (
              <div className="text-center mb-6">
                <div className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1">Result d{lastRoll.sides}</div>
                <div className={`text-5xl font-black fantasy-font ${lastRoll.result === lastRoll.sides && lastRoll.sides >= 10 ? 'text-amber-500 animate-pulse' : 'text-neutral-200'}`}>{lastRoll.result}</div>
              </div>
            )}
          </div>
        )}
        {(diceTrayOpen || diceNeeded) && (
          <button onClick={() => setDiceTrayOpen(!diceTrayOpen)} className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.8)] border ${diceTrayOpen ? 'bg-[#b28a48] text-black border-amber-300' : 'bg-neutral-900 text-[#b28a48] border-[#b28a48]/30 hover:border-[#b28a48] hover:bg-black'} ${diceNeeded && !diceTrayOpen ? 'animate-bounce border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : ''}`}>🎲</button>
        )}
      </div>
    </div>
  );
};

export default App;