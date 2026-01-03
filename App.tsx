
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, ServerLog, UserAccount, Spell, MigrationData, Trait } from './types';
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
// Added missing imports: generateWorldMap, generateLocalTiles
import { generateImage, generateCharacterFeats, generateWorldMap, generateLocalTiles } from './services/gemini';
import Peer, { DataConnection } from 'peerjs';

interface Notification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

const REGISTRY_VERSION = 6; 

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
  darkKnight: [
    { name: 'Grave Touch', level: 1, school: 'Necromancy', description: 'Melee spell attack deals 1d10 necrotic damage; target cannot take reactions until your next turn.' },
    { name: 'Void Shield', level: 1, school: 'Abjuration', description: 'Shadows coil around you, granting +2 AC and dealing 1d4 cold damage to attackers who hit you.' }
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
    id: 'sys-oak-staff',
    name: 'Gnarled Oak Staff',
    type: 'Weapon',
    description: 'A sturdy wooden staff etched with minor protective runes.',
    mechanics: [{ name: 'Arcane Focus', description: 'Can be used as a focus for casting spells.' }],
    lore: 'Passed down through generations of village elders.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-leather-armor',
    name: 'Reinforced Leather',
    type: 'Armor',
    description: 'Boiled leather armor reinforced with iron studs.',
    mechanics: [{ name: 'Light Mobility', description: 'Does not impose disadvantage on Stealth checks.' }],
    lore: 'Lightweight protection for the agile wanderer.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-ebony-greatsword',
    name: 'Ebony Greatsword',
    type: 'Weapon',
    description: 'A massive blade of pitch-black metal that seems to drink the light.',
    mechanics: [{ name: 'Heavy Cleave', description: 'On a critical hit, the target is knocked prone.' }],
    lore: 'Forged in the heart of the Shadowfell for the first Dark Knights.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-dread-plate',
    name: 'Dread Plate',
    type: 'Armor',
    description: 'Menacing plate armor etched with runes of suffering.',
    mechanics: [{ name: 'Aura of Fear', description: 'Enemies within 5ft have -1 to attack rolls against you.' }],
    lore: 'Armor that hums with the resonance of lost souls.',
    authorId: 'system', authorName: 'Orestara'
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive' | 'spells' | 'profile' | 'rules'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const currentRegVersion = parseInt(localStorage.getItem('mythos_registry_version') || '0');
    if (currentRegVersion < REGISTRY_VERSION) {
      localStorage.removeItem('mythos_accounts');
      localStorage.removeItem('mythos_active_session');
      localStorage.setItem('mythos_registry_version', REGISTRY_VERSION.toString());
      return null;
    }
    const saved = localStorage.getItem('mythos_active_session');
    const user = saved ? JSON.parse(saved) : null;
    if (user) (window as any).isMythosAdmin = !!user.isAdmin;
    return user;
  });

  const [reservoir, setReservoir] = useState<number>(100); 
  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [campaign, setCampaign] = useState<CampaignState>({ plot: '', summary: '', logs: [], party: [], rules: [], locationName: 'The Nameless Keep' });

  const [peerId, setPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<string[]>([]);
  const peerRef = useRef<Peer | null>(null);

  const notify = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 7000);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('mythos_active_session');
    setCurrentUser(null);
  };

  const handleMigrationImport = useCallback((migrationString: string) => {
    try {
      const data: MigrationData = JSON.parse(atob(migrationString));
      if (!data.user || !data.user.username) throw new Error("Invalid Migration Sigil");
      
      const uPrefix = data.user.username;
      const localAccounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
      const filteredAccounts = localAccounts.filter(a => a.username !== data.user.username);
      filteredAccounts.push(data.user);
      localStorage.setItem('mythos_accounts', JSON.stringify(filteredAccounts));

      localStorage.setItem(`${uPrefix}_mythos_chars`, JSON.stringify(data.characters || []));
      localStorage.setItem(`${uPrefix}_mythos_classes`, JSON.stringify(data.classes || []));
      localStorage.setItem(`${uPrefix}_mythos_monsters`, JSON.stringify(data.monsters || []));
      localStorage.setItem(`${uPrefix}_mythos_items`, JSON.stringify(data.items || []));
      localStorage.setItem(`${uPrefix}_mythos_campaign`, JSON.stringify(data.campaign || { plot: '', summary: '', logs: [], party: [], rules: [] }));
      localStorage.setItem('mythos_active_session', JSON.stringify(data.user));

      setCurrentUser(data.user);
      setCharacters(data.characters || []);
      setClasses(data.classes || []);
      setMonsters(data.monsters || []);
      setItems(data.items || []);
      setCampaign(data.campaign || { plot: '', summary: '', logs: [], party: [], rules: [] });

      notify("Soul Migration Complete. Legend Restored.", "success");
      return true;
    } catch (e) {
      notify("Migration Failed: Sigil Corrupted.", "error");
      return false;
    }
  }, [notify]);

  // Background Restoration Pulse for Spectral Souls
  useEffect(() => {
    if (!currentUser || characters.length === 0) return;
    
    const interval = setInterval(async () => {
      const spectralChar = characters.find(c => c.isSpectral);
      if (!spectralChar) return;

      console.log(`Restoration Pulse: Attempting to heal spectral soul ${spectralChar.name}...`);
      
      const selectedClass = classes.find(cls => cls.id === spectralChar.classId);
      
      try {
        let imageUrl = spectralChar.imageUrl;
        let classFeats = spectralChar.feats.filter(f => (f as any).isInnate); // Keep innate feats
        
        // Attempt portrait if missing
        if (!imageUrl || imageUrl.startsWith('data:image/svg')) {
          const prompt = `Fantasy TTRPG character portrait. A ${spectralChar.gender} ${spectralChar.race} ${selectedClass?.name}. Appearance: ${spectralChar.description}. Atmosphere: dark fantasy.`;
          imageUrl = await generateImage(prompt);
        }

        // Attempt class feats
        const generatedFeats = await generateCharacterFeats(selectedClass?.name || 'Adventurer', selectedClass?.description || '');
        classFeats = [...classFeats, ...generatedFeats];

        setCharacters(prev => prev.map(c => 
          c.id === spectralChar.id 
            ? { ...c, imageUrl, feats: classFeats, isSpectral: false } 
            : c
        ));
        
        notify(`${spectralChar.name}'s soul has fully manifested!`, "success");
      } catch (e) {
        // Quota still hit, will retry next pulse
        console.warn(`Restoration Pulse: ${spectralChar.name} remains spectral. Quota limited.`);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentUser, characters, classes, notify]);

  const handleMigrationExport = useCallback(() => {
    if (!currentUser) return "";
    const data: MigrationData = {
      user: currentUser,
      characters,
      classes,
      monsters,
      items,
      campaign
    };
    return btoa(JSON.stringify(data));
  }, [currentUser, characters, classes, monsters, items, campaign]);

  const handleFileExport = useCallback(() => {
    const sigil = handleMigrationExport();
    if (!sigil) return;
    const blob = new Blob([sigil], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentUser?.username || 'soul'}_migration.mythos`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify("Soul Scroll Solidified.", "success");
  }, [currentUser, handleMigrationExport, notify]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const presence = JSON.parse(localStorage.getItem('mythos_presence') || '{}');
      presence[currentUser.username] = Date.now();
      localStorage.setItem('mythos_presence', JSON.stringify(presence));
      const friends = currentUser.friends || [];
      const now = Date.now();
      const online = friends.filter(f => presence[f] && (now - presence[f] < 30000));
      setOnlineFriends(online);
    }, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const addFriend = useCallback((sigil: string) => {
    if (!currentUser || sigil === currentUser.username) return;
    const currentFriends = currentUser.friends || [];
    if (currentFriends.includes(sigil)) return;
    const updatedUser = { ...currentUser, friends: [...currentFriends, sigil] };
    setCurrentUser(updatedUser);
    localStorage.setItem('mythos_active_session', JSON.stringify(updatedUser));
    const accounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    const newAccounts = accounts.map(a => a.username === currentUser.username ? updatedUser : a);
    localStorage.setItem('mythos_accounts', JSON.stringify(newAccounts));
  }, [currentUser]);

  const handleCloudSync = useCallback(async (action: 'push' | 'pull') => {
    if (!currentUser) return;
    const uPrefix = currentUser.username.toLowerCase();
    const etherArchive = JSON.parse(localStorage.getItem('mythos_ether_archive') || '{}');
    if (action === 'push') {
      etherArchive[uPrefix] = { ...etherArchive[uPrefix], data: { characters, classes, monsters, items, campaign }, friends: currentUser.friends, pin: currentUser.pin, displayName: currentUser.displayName };
      localStorage.setItem('mythos_ether_archive', JSON.stringify(etherArchive));
      notify("Saga preserved in the Ether.", "success");
    } else {
      const entry = etherArchive[uPrefix];
      if (entry?.data) {
        setCharacters(entry.data.characters); setClasses(entry.data.classes); setMonsters(entry.data.monsters); setItems(entry.data.items); setCampaign(entry.data.campaign);
        if (entry.friends) {
          const updatedUser = { ...currentUser, friends: entry.friends };
          setCurrentUser(updatedUser);
          localStorage.setItem('mythos_active_session', JSON.stringify(updatedUser));
        }
        notify("Saga restored from the Ether.", "success");
      } else {
        notify("No chronicle found.", "error");
      }
    }
  }, [currentUser, characters, classes, monsters, items, campaign, notify]);

  const manifestBasics = async (scope: 'all' | 'monsters' | 'items' | 'heroes' | 'adventure' = 'all') => {
    notify("Channeling Archive...", "info");
    let updatedMonsters = [...monsters];
    let updatedItems = [...items];
    let updatedChars = [...characters];
    let updatedClasses = [...classes];

    if (scope === 'all' || scope === 'monsters') {
      const existingIds = new Set(monsters.map(m => m.id));
      const monstersToAdd = [...SYSTEM_MONSTERS].filter(m => !existingIds.has(m.id));
      for (let m of monstersToAdd) {
        if (!m.imageUrl) {
          try { m.imageUrl = await generateImage(`Official TTRPG creature art: ${m.name}. Appearance: ${m.description}.`); setMonsters(prev => [...prev.filter(pm => pm.id !== m.id), m]); } catch(e) {}
        }
      }
      updatedMonsters = [...updatedMonsters.filter(m => !existingIds.has(m.id)), ...monstersToAdd];
    }

    if (scope === 'all' || scope === 'items') {
      const existingIds = new Set(items.map(i => i.id));
      const itemsToAdd = [...SYSTEM_ITEMS].filter(i => !existingIds.has(i.id));
      for (let i of itemsToAdd) {
        if (!i.imageUrl) {
          try { i.imageUrl = await generateImage(`High-quality TTRPG artifact: ${i.name}. Appearance: ${i.description}.`); setItems(prev => [...prev.filter(pi => pi.id !== i.id), i]); } catch(e) {}
        }
      }
      updatedItems = [...updatedItems.filter(i => !existingIds.has(i.id)), ...itemsToAdd];
    }

    if (scope === 'all') {
      const basicClasses: ClassDef[] = [
        {
          id: 'basic-warrior', name: 'Warrior', description: 'Mighty physical vanguards.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Armor Proficiency'], startingItemIds: ['sys-iron-longsword', 'sys-leather-armor'], features: [
            { name: 'Mighty Roar', description: 'Bonus action: 1d8 temporary HP.' },
            { name: 'Cleaving Strike', description: 'When you drop a creature to 0 HP with a melee attack, you can make an additional attack as a bonus action.' },
            { name: 'Indomitable Will', description: 'Advantage on saves against being Frightened or Charmed.' },
            { name: 'Battle Cry', description: 'Grant all allies within 30ft advantage on their next attack roll (Once per short rest).' },
            { name: 'Shield Bash', description: 'As a bonus action, shove a creature with your shield if you hit them with a melee attack.' }
          ], initialSpells: [], authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-mage', name: 'Mage', description: 'Supportive aether-users.', hitDie: 'd8', startingHp: 10, hpPerLevel: 6, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Healing Mastery'], startingItemIds: ['sys-oak-staff', 'sys-leather-armor'], features: [
            { name: 'Vital Flow', description: 'Restore 1d10 hit points.' },
            { name: 'Arcane Recovery', description: 'Regain half your level in spell slots once per day during a short rest.' },
            { name: 'Elemental Attunement', description: 'Resistance to one damage type (Cold, Fire, or Lightning) chosen at the end of a long rest.' },
            { name: 'Spell Shield', description: 'As a reaction, add your proficiency bonus to your AC against a spell attack.' },
            { name: 'Focused Mind', description: 'Advantage on concentration checks to maintain spells.' }
          ], initialSpells: THEMATIC_SPELLS.mage, authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-dark-knight', name: 'Dark Knight', description: 'Vanguards of the void who trade vitality for ruinous power.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [2, 0, 0], preferredStats: ['Charisma', 'Strength'], bonuses: ['Heavy Armor Proficiency', 'Necrotic Affinity'], startingItemIds: ['sys-ebony-greatsword', 'sys-dread-plate'], features: [
            { name: 'Soul-Resonance (Abyssal)', description: 'Gain Resonance stacks on kills or saves. Spend stacks to heal or deal necrotic ruin.' },
            { name: 'Abyssal Pact', description: 'Immune to Frightened condition.' },
            { name: 'Dreadful Aspect', description: 'As an action, force enemies within 30ft to make a WIS save or be frightened for 1 minute.' },
            { name: 'Vampiric Blade', description: 'Once per turn, deal an extra 1d6 necrotic damage and gain the same amount in HP.' },
            { name: 'Shadow Step', description: 'Teleport up to 30ft to an unoccupied space you can see in dim light or darkness.' }
          ], initialSpells: THEMATIC_SPELLS.darkKnight, authorId: 'system', authorName: 'Orestara'
        }
      ];
      updatedClasses = [...updatedClasses.filter(c => !c.id.startsWith('basic')), ...basicClasses];
      setClasses(updatedClasses);
    }

    if (scope === 'all' || scope === 'heroes') {
        const heroes: Character[] = [
            { 
              id: 'hero-miri', name: 'Miri', classId: 'basic-warrior', race: 'Human', gender: 'Female', gold: 100, 
              description: "A vibrant warrior clad in etched leather and weathered iron.", 
              level: 1, stats: { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 14 }, hp: 12, maxHp: 12, 
              feats: [{ name: 'Restless Spirit', description: 'Gains +2 to Initiative.' }], inventory: ['sys-iron-longsword', 'sys-leather-armor'], isPlayer: true, authorId: 'system', authorName: 'Orestara' 
            },
            { 
              id: 'hero-lina', name: 'Lina', classId: 'basic-warrior', race: 'Elf', gender: 'Female', gold: 120, 
              description: "Dressed in muted greens and silvers. Forest ghost.", 
              level: 1, stats: { strength: 12, dexterity: 18, constitution: 12, intelligence: 14, wisdom: 15, charisma: 12 }, hp: 10, maxHp: 10, 
              feats: [{ name: 'Wild Senses', description: 'Advantage on Perception.' }], inventory: ['sys-iron-longsword', 'sys-leather-armor'], isPlayer: false, authorId: 'system', authorName: 'Orestara' 
            },
            { 
              id: 'hero-seris', name: 'Seris', classId: 'basic-mage', race: 'Tiefling', gender: 'Female', gold: 150, 
              description: "Skin the color of polished obsidian. Flows in deep violet robes.", 
              level: 1, stats: { strength: 8, dexterity: 16, constitution: 12, intelligence: 15, wisdom: 16, charisma: 10 }, hp: 10, maxHp: 10, 
              feats: [{ name: 'Abyssal Spark', description: 'Fire damage ignores minor resistance.' }], inventory: ['sys-oak-staff', 'sys-leather-armor'], isPlayer: false, authorId: 'system', authorName: 'Orestara' 
            },
            { 
              id: 'hero-vane', name: 'Vane', classId: 'basic-dark-knight', race: 'Variant Human', gender: 'Male', gold: 80, 
              description: "A somber figure in heavy ebony plate. His eyes glow with a faint violet light when he channels his Soul-Resonance.", 
              level: 1, stats: { strength: 15, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 12, charisma: 16 }, hp: 10, maxHp: 10, 
              feats: [{ name: 'Abyssal Pact', description: 'Immune to Frightened condition.' }], inventory: ['sys-ebony-greatsword', 'sys-dread-plate'], isPlayer: false, authorId: 'system', authorName: 'Orestara' 
            }
        ];
        for (let h of heroes) {
          if (!h.imageUrl) {
            try { h.imageUrl = await generateImage(`TTRPG portrait: ${h.name}, a ${h.gender} ${h.race}. Appearance: ${h.description}.`); setCharacters(prev => [...prev.filter(pc => pc.id !== h.id), h]); } catch(e) {}
          }
        }
        updatedChars = [...updatedChars.filter(c => !heroes.some(h => h.id === c.id)), ...heroes];
    }

    if (scope === 'adventure') {
      const plot = "The Obsidian Spire has returned to the Grey Marches.";
      const mapUrl = await generateWorldMap(plot);
      const tiles = await generateLocalTiles("Grey Marches", 3);
      setCampaign(prev => {
        const updated = { ...prev, plot, worldMapUrl: mapUrl, localMapTiles: tiles, locationName: "The Grey Marches" };
        broadcast({ type: 'STATE_UPDATE', payload: { campaign: updated } });
        return updated;
      });
    }

    setCharacters(updatedChars); setClasses(updatedClasses); setMonsters(updatedMonsters); setItems(updatedItems);
    notify("Archive Manifested.", "success");
  };

  useEffect(() => {
    if (currentUser) {
      const uPrefix = currentUser.username;
      const savedChars = localStorage.getItem(`${uPrefix}_mythos_chars`);
      const savedClasses = localStorage.getItem(`${uPrefix}_mythos_classes`);
      const savedMonsters = localStorage.getItem(`${uPrefix}_mythos_monsters`);
      const savedItems = localStorage.getItem(`${uPrefix}_mythos_items`);
      const savedCampaign = localStorage.getItem(`${uPrefix}_mythos_campaign`);
      if (savedChars) setCharacters(JSON.parse(savedChars));
      if (savedClasses) setClasses(JSON.parse(savedClasses));
      if (savedMonsters) setMonsters(JSON.parse(savedMonsters));
      if (savedItems) setItems(JSON.parse(savedItems));
      if (savedCampaign) setCampaign(JSON.parse(savedCampaign));
    }
  }, [currentUser?.username]);

  useEffect(() => {
    if (!currentUser) return;
    const uPrefix = currentUser.username;
    localStorage.setItem(`${uPrefix}_mythos_chars`, JSON.stringify(characters));
    localStorage.setItem(`${uPrefix}_mythos_classes`, JSON.stringify(classes));
    localStorage.setItem(`${uPrefix}_mythos_monsters`, JSON.stringify(monsters));
    localStorage.setItem(`${uPrefix}_mythos_items`, JSON.stringify(items));
    localStorage.setItem(`${uPrefix}_mythos_campaign`, JSON.stringify(campaign));
  }, [currentUser, characters, classes, monsters, items, campaign]);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Unknown' } as SyncMessage;
    connections.forEach(conn => { if (conn.open) conn.send(fullMsg); });
  }, [connections, peerId, currentUser]);

  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => { setConnections(prev => [...prev, conn]); if (conn.peer) addFriend(conn.peer); });
    conn.on('data', (data: any) => {
      const msg = data as SyncMessage;
      if (msg.senderId) addFriend(msg.senderId);
      switch (msg.type) {
        case 'NEW_LOG': setCampaign(prev => ({ ...prev, logs: [...prev.logs, msg.payload] })); break;
        case 'STATE_UPDATE':
          if (msg.payload.campaign) setCampaign(msg.payload.campaign);
          if (msg.payload.characters) setCharacters(msg.payload.characters);
          break;
      }
    });
    conn.on('close', () => setConnections(prev => prev.filter(c => c.peer !== conn.peer)));
  }, [addFriend]);

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

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} onMigrationImport={handleMigrationImport} />;

  const reservoirReady = currentUser.isAdmin || reservoir >= 1;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setMobileSidebarOpen(false); }} 
        onSignOut={handleSignOut} 
        user={currentUser} 
        onlineFriends={onlineFriends} 
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />
      
      <main className={`flex-1 relative overflow-y-auto transition-all duration-300 pb-[calc(60px+var(--safe-bottom))] lg:pb-0 pt-[calc(48px+var(--safe-top))] lg:pt-0`}>
        <div className="p-3 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} setCharacters={setCharacters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={true} dmModel="gemini-3-pro-preview" setDmModel={()=>{}} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} manifestBasics={manifestBasics} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={reservoirReady} currentUser={currentUser} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={reservoirReady} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} onlineFriends={onlineFriends} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={(id) => { setIsHost(false); const conn = peerRef.current!.connect(id); setupConnection(conn); }} setIsHost={setIsHost} forceSync={(sel) => {
              const state: any = {};
              if (sel.characters) state.characters = characters;
              if (sel.campaign) state.campaign = campaign;
              broadcast({ type: 'STATE_UPDATE', payload: state });
          }} kickSoul={() => {}} rehostWithSigil={(id) => { setIsHost(true); initPeer(id); }} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName: currentUser.displayName }} onImport={() => {}} manifestBasics={() => manifestBasics('all')} onCloudSync={handleCloudSync} onMigrationExport={handleMigrationExport} onMigrationImport={handleMigrationImport} onFileExport={handleFileExport} />}
        </div>
      </main>
      
      {/* resonance header */}
      <div className={`fixed top-0 right-0 left-0 transition-all duration-300 lg:left-${sidebarCollapsed ? '20' : '64'} h-[calc(48px+var(--safe-top))] z-[60] bg-black/85 backdrop-blur-lg border-b border-neutral-900 px-4 md:px-6 flex items-center justify-between pt-[var(--safe-top)]`}>
        <div className="flex items-center gap-3 md:gap-8">
           <button 
             onClick={() => setMobileSidebarOpen(true)}
             className="lg:hidden p-2 -ml-2 text-[#b28a48] hover:text-white transition-colors"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
             </svg>
           </button>
           <div className="flex flex-col items-end">
              <span className="text-[7px] font-black text-neutral-600 uppercase tracking-widest leading-none mb-0.5">Resonance</span>
              <span className={`text-[11px] font-black leading-none ${currentUser.isAdmin ? 'text-blue-400' : 'text-[#b28a48]'}`}>{currentUser.isAdmin ? '∞' : reservoir} / 100</span>
           </div>
           <div className="w-16 md:w-32 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative shadow-inner">
              <div className={`h-full transition-all duration-700 ${currentUser.isAdmin ? 'bg-blue-500' : 'bg-[#b28a48]'}`} style={{ width: `${currentUser.isAdmin ? 100 : reservoir}%` }}></div>
           </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="fantasy-font text-[10px] text-[#b28a48] font-black tracking-widest uppercase hidden md:block">Mythos Engine</div>
          {currentUser.isAdmin && (
             <span className="text-[7px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/30 px-2 py-1 rounded-sm tracking-widest uppercase">Admin Conduit</span>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 border-l-4 rounded-sm shadow-2xl animate-notification pointer-events-auto bg-black border ${n.type === 'error' ? 'border-red-900 text-red-400' : n.type === 'success' ? 'border-green-900 text-green-400' : 'border-[#b28a48] text-[#b28a48]'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
