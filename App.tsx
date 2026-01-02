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
    abilities: [{ name: 'Nimble Escape', effect: 'Can Disengage or Hide as a bonus action.' }]
  },
  {
    id: 'sys-skeleton',
    name: 'Dread Skeleton',
    description: 'Bones knit together by dark necromancy, eyes glowing with cold blue fire. It feels no pain and knows no fear.',
    stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 },
    hp: 13,
    ac: 13,
    abilities: [{ name: 'Undead Fortitude', effect: 'If reduced to 0 HP, stay at 1 HP on a successful CON save.' }]
  },
  {
    id: 'sys-orc',
    name: 'Orc Marauder',
    description: 'A hulking brute with grey skin and teeth, wielding a rusted greataxe and driven by bloodlust.',
    stats: { strength: 16, dexterity: 12, constitution: 16, intelligence: 7, wisdom: 11, charisma: 10 },
    hp: 15,
    ac: 13,
    abilities: [{ name: 'Aggressive', effect: 'As a bonus action, move up to its speed toward a hostile creature it can see.' }]
  },
  {
    id: 'sys-boss-sentinel',
    name: 'The Obsidian Sentinel',
    description: 'A towering construct of dark stone and glowing ley-veins, guarding ancient vaults from intruders.',
    isBoss: true,
    stats: { strength: 20, dexterity: 8, constitution: 20, intelligence: 3, wisdom: 11, charisma: 1 },
    hp: 120,
    ac: 18,
    abilities: [
      { name: 'Immutable Form', effect: 'Immune to any effect that would alter its form.' },
      { name: 'Magic Resistance', effect: 'Advantage on saving throws against spells and other magical effects.' }
    ],
    legendaryActions: [
      { name: 'Obsidian Smash', effect: 'Make one slam attack (+8 to hit, 3d10+5 bludgeoning).' },
      { name: 'Ley Pulse', effect: 'Emanate a wave of force. Nearby creatures must succeed a DC 15 STR save or be knocked prone.' }
    ]
  },
  {
    id: 'sys-boss-malakor',
    name: 'Malakor the Betrayer',
    description: 'A fallen wizard whose soul is bound to a necrotic shroud. He seeks the erasure of all history to end his eternal pain.',
    isBoss: true,
    stats: { strength: 8, dexterity: 14, constitution: 16, intelligence: 20, wisdom: 14, charisma: 18 },
    hp: 95,
    ac: 15,
    abilities: [
      { name: 'Ethereal Jaunt', effect: 'As a bonus action, magically shift from the Material Plane to the Ethereal Plane, or vice-versa.' },
      { name: 'Grasp of the Grave', effect: 'Melee weapon attack deals 4d6 necrotic damage and the target is grappled (DC 15 ESC).' }
    ],
    legendaryActions: [
      { name: 'Cantrip', effect: 'Cast a cantrip or level 1 spell.' },
      { name: 'Siphon Vitality', effect: 'A creature within 60ft must make a DC 16 CON save or take 3d8 necrotic damage, healing Malakor for half.' }
    ]
  }
];

const SYSTEM_ITEMS: Item[] = [
  {
    id: 'sys-iron-longsword',
    name: 'Iron Longsword',
    type: 'Weapon',
    description: 'A well-balanced blade of cold-forged iron. Reliable and versatile.',
    mechanics: [{ name: 'Slashing', description: 'Deals 1d8 slashing damage (1d10 if used with two hands).' }],
    lore: 'Standard issue for the King\'s Guard, forged in the royal foundry.'
  },
  {
    id: 'sys-healing-potion',
    name: 'Lesser Healing Potion',
    type: 'Weapon', 
    description: 'A bubbling red liquid that smells of medicinal cherries.',
    mechanics: [{ name: 'Restoration', description: 'Regain 2d4 + 2 hit points as an action.' }],
    lore: 'Brewed in the temple of the Dawn Mother to aid travelers.'
  },
  {
    id: 'sys-plate-armor',
    name: 'Steel Plate Armor',
    type: 'Armor',
    description: 'Interlocking metal plates covering the entire body over a suit of chain mail.',
    mechanics: [{ name: 'Heavy Protection', description: 'Grants an AC of 18. Disadvantage on Stealth checks.' }],
    lore: 'Worn by knights of the highest order, polished to a mirror finish.'
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

  const manifestBasics = (scope: 'all' | 'monsters' | 'items' = 'all') => {
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
    if (scope === 'all') {
      const basicClasses: ClassDef[] = [
        {
          id: 'basic-warrior',
          name: 'Warrior',
          description: 'A master of martial combat, relying on strength and steel.',
          hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Armor Proficiency', 'Martial Weapon Mastery'], features: [{ name: 'Second Wind', description: 'Once per rest, regain 1d10 + Level HP as a bonus action.' }, { name: 'Action Surge', description: 'Push past limits to take one additional action this turn.' }], initialSpells: [], authorId: 'system', authorName: 'Ancient Grimoire'
        },
        {
          id: 'basic-arcanist',
          name: 'Arcanist',
          description: 'A wielder of the fundamental forces of the universe.',
          hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 2, 0], preferredStats: ['Intelligence', 'Wisdom'], bonuses: ['Arcane Recovery', 'Spell Sniper'], features: [{ name: 'Spellbook', description: 'Maintain a collection of recorded incantations.' }, { name: 'Arcane Focus', description: 'Use a staff or orb to channel destructive energies.' }], initialSpells: [], authorId: 'system', authorName: 'Ancient Grimoire'
        },
        {
          id: 'basic-dark-knight',
          name: 'Dark Knight',
          description: 'A grim order of knights who discard shields for massive two-handed blades. They fuel their dark aether with raw emotion—most notably Love—to drain life from enemies and shield allies with barriers of shadows.',
          hitDie: 'd12',
          startingHp: 12,
          hpPerLevel: 7,
          spellSlots: [2, 0, 0],
          preferredStats: ['Strength', 'Charisma'],
          bonuses: ['Two-Handed Mastery', 'Heavy Armor Proficiency', 'Intimidation Mastery'],
          features: [
            { 
              name: 'Living Shadow', 
              description: 'Spend an action to conjure a shadowy simulacrum. It fights at your side for 1 minute, dealing half your weapon damage as necrotic damage.',
              locked: true 
            },
            { 
              name: 'Living Dead', 
              description: 'When reduced to 0 HP, you do not fall. Instead, for 10 seconds, you cannot be killed and your lifesteal is tripled. If you do not receive healing equal to your Maximum HP by the end, you must succeed a DC 15 Death Saving Throw or die instantly.',
              locked: true 
            },
            { 
              name: 'Cold Bite', 
              description: 'Your controlled darkness chills the air. Enemies within 10ft take a -2 penalty to attack rolls as the air freezes around them.',
              locked: true 
            }
          ],
          initialSpells: [
            { name: 'The Black Night', level: 1, school: 'Abjuration', description: 'Create a barrier of darkness around yourself or an ally equal to your level + CHA modifier.' },
            { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 2d6 health from all enemies within 5ft, healing yourself for half the total damage.' },
            { name: 'Dark Mind', level: 1, school: 'Abjuration', description: 'Fortify your mind against magic, gaining resistance to all elemental and arcane damage for 2 rounds.' },
            { name: 'Shadow Wall', level: 2, school: 'Evocation', description: 'A wall of absolute shadow erupts. Enemies passing through take necrotic damage and are Chilled.' }
          ],
          authorId: 'Orestara',
          authorName: 'Orestara'
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

  /**
   * Admin-Only Aggregation Helper
   * Scans localStorage to find all resources created by all users on this machine.
   */
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
        // Master Librarian Mode: Collect everything from everyone
        const allChars = aggregateAllResources('_mythos_chars');
        const allClasses = aggregateAllResources('_mythos_classes');
        const allMonsters = aggregateAllResources('_mythos_monsters');
        const allItems = aggregateAllResources('_mythos_items');
        
        setCharacters(allChars);
        setClasses(allChars);
        setMonsters(allMonsters);
        setItems(allItems);
        
        notify("Omniscience Enabled: All local archives merged.", "success");
      } else {
        // Standard Mode: Only load own data
        const savedChars = localStorage.getItem(`${uPrefix}_mythos_chars`);
        setCharacters(savedChars ? JSON.parse(savedChars) : []);
        const savedClasses = localStorage.getItem(`${uPrefix}_mythos_classes`);
        setClasses(savedClasses ? JSON.parse(savedClasses) : []);
        const savedMonsters = localStorage.getItem(`${uPrefix}_mythos_monsters`);
        setMonsters(savedMonsters ? JSON.parse(savedMonsters) : []);
        const savedItems = localStorage.getItem(`${uPrefix}_mythos_items`);
        setItems(savedItems ? JSON.parse(savedItems) : []);
      }

      // Campaign loading is still prefix-specific (unique sagas)
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
      setServerLogs(prev => [...prev, { id: Math.random().toString(36), message: `Resonance established with ${conn.peer}`, type: 'success', timestamp: Date.now() }]);
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
      <main className="flex-1 relative overflow-y-auto scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pb-24 lg:pb-0">
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

      <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-sm border shadow-2xl animate-notification pointer-events-auto min-w-[280px] ${n.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-100' : n.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-100' : 'bg-black/90 border-[#b28a48]/50 text-[#b28a48]'}`}>
            <p className="text-[10px] leading-relaxed font-bold opacity-90">{n.message}</p>
          </div>
        ))}
      </div>

      <div className="fixed top-0 right-0 left-0 lg:left-64 h-16 z-[60] bg-black/80 backdrop-blur-md border-b border-neutral-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Resonance</span>
              <span className={`text-sm font-black ${currentUser.isAdmin ? 'text-blue-400' : (arcaneTokens < 1 ? 'text-red-500' : 'text-[#b28a48]')}`}>{currentUser.isAdmin ? '∞' : Math.floor(arcaneTokens)} / 3</span>
           </div>
           <div className="w-32 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative shadow-inner">
              <div className={`h-full transition-all duration-700 ${currentUser.isAdmin ? 'bg-blue-500' : (isExhausted ? 'bg-red-600' : 'bg-[#b28a48]')}`} style={{ width: `${currentUser.isAdmin ? 100 : (isExhausted ? (lockoutTime / LOCKOUT_DURATION) * 100 : reservoir)}%` }}></div>
           </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
           <div className="flex flex-col items-start gap-1">
              <div className="flex justify-between w-24">
                <span className="text-[7px] font-black text-neutral-500 uppercase tracking-tighter">Fidelity (Pro)</span>
                <span className={`text-[7px] font-bold ${proPercent > 80 ? 'text-red-500' : 'text-[#b28a48]'}`}>{currentUser.isAdmin ? '∞' : `${dailyProUsed}/${DAILY_PRO_LIMIT}`}</span>
              </div>
              <div className="w-24 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div className={`h-full transition-all duration-1000 ${currentUser.isAdmin ? 'bg-blue-500' : (proPercent > 80 ? 'bg-red-500' : 'bg-[#b28a48]')}`} style={{ width: `${currentUser.isAdmin ? 100 : proPercent}%` }}></div>
              </div>
           </div>

           <div className="flex flex-col items-start gap-1">
              <div className="flex justify-between w-24">
                <span className="text-[7px] font-black text-neutral-500 uppercase tracking-tighter">Velocity (Flash)</span>
                <span className={`text-[7px] font-bold ${flashPercent > 80 ? 'text-red-500' : 'text-[#b28a48]'}`}>{currentUser.isAdmin ? '∞' : `${dailyFlashUsed}/${DAILY_FLASH_LIMIT}`}</span>
              </div>
              <div className="w-24 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div className={`h-full transition-all duration-1000 ${currentUser.isAdmin ? 'bg-blue-500' : (flashPercent > 80 ? 'bg-red-500' : 'bg-[#b28a48]')}`} style={{ width: `${currentUser.isAdmin ? 100 : flashPercent}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      <div className="fixed bottom-24 lg:bottom-4 right-4 z-[90] flex flex-col items-end gap-3 pointer-events-none">
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