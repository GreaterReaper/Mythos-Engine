
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
import { generateImage, generateCharacterFeats, generateWorldMap, generateLocalTiles, generateRules } from './services/gemini';
import Peer, { DataConnection } from 'peerjs';

interface Notification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

const REGISTRY_VERSION = 6; 

const THEMATIC_SPELLS: Record<string, Spell[]> = {
  priestess: [
    { name: 'Divine Mending', level: 1, school: 'Abjuration', description: 'A soft glow seals wounds, restoring 1d8 + Spell Modifier HP.' },
    { name: 'Sanctuary of Light', level: 1, school: 'Abjuration', description: 'Creatures must pass a WIS save to attack the target for 1 minute.' },
    { name: 'Guiding Bolt', level: 1, school: 'Evocation', description: 'A flash of light deals 4d6 radiant damage; next attack against target has advantage.' }
  ],
  archer: [
    { name: 'Hunter\'s Mark', level: 1, school: 'Divination', description: 'Deal an extra 1d6 damage to the target whenever you hit it with a weapon attack.' },
    { name: 'Piercing Breeze', level: 1, school: 'Transmutation', description: 'Your arrows ignore physical cover for 1 minute.' }
  ]
};

const SYSTEM_MONSTERS: Monster[] = [
  {
    id: 'sys-goblin',
    name: 'Guild-Task Goblin',
    description: 'Nuisance creatures infesting the local cellars.',
    stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
    hp: 7, ac: 13,
    abilities: [{ name: 'Nimble Escape', effect: 'Can Disengage or Hide as a bonus action.' }],
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-gorechimera',
    name: 'The Gorechimera',
    description: 'A terrifying fusion of lion, goat, and serpent, its scales stained with the blood of failed heroes. It guards the heart of the Grey Marches.',
    stats: { strength: 20, dexterity: 12, constitution: 18, intelligence: 14, wisdom: 14, charisma: 10 },
    hp: 140, ac: 17,
    isBoss: true,
    abilities: [
      { name: 'Multiattack', effect: 'The Gorechimera makes three attacks: one with its bite, one with its claws, and one with its horns.' },
      { name: 'Lion\'s Roar', effect: 'Creatures within 60ft must pass a DC 15 WIS save or be Frightened for 1 minute.' }
    ],
    legendaryActions: [
      { name: 'Serpent Lash', effect: 'The tail makes a venomous strike (3d6 poison damage).' },
      { name: 'Goat\'s Breath', effect: 'Exhale a cloud of debilitating miasma in a 20ft cone.' }
    ],
    authorId: 'system', authorName: 'Orestara'
  }
];

const SYSTEM_ITEMS: Item[] = [
  {
    id: 'sys-iron-longsword',
    name: 'Guild-Issue Blade',
    type: 'Weapon',
    description: 'Standard steel for guild recruits.',
    mechanics: [{ name: 'Trusty', description: '+1 to hit when used by a Guild member.' }],
    lore: 'Miri\'s favorite starting weapon.',
    authorId: 'system', authorName: 'Orestara'
  },
  {
    id: 'sys-recurve-bow',
    name: 'Elven Whisper-Bow',
    type: 'Weapon',
    description: 'A bow that produces no sound when drawn.',
    mechanics: [{ name: 'Silent Shot', description: 'Attacking while hidden does not automatically reveal your location.' }],
    lore: 'Carried by Seris from the deep woods.',
    authorId: 'system', authorName: 'Orestara'
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive' | 'spells' | 'profile' | 'rules'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('mythos_active_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [reservoir, setReservoir] = useState<number>(100); 
  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [campaign, setCampaign] = useState<CampaignState>({ plot: '', summary: '', logs: [], party: [], rules: [], locationName: 'Adventurers Guild' });

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

  const handleDeleteAccount = useCallback(() => {
    if (!currentUser) return;
    const uPrefix = currentUser.username;
    localStorage.removeItem(`${uPrefix}_mythos_chars`);
    localStorage.removeItem(`${uPrefix}_mythos_classes`);
    localStorage.removeItem(`${uPrefix}_mythos_monsters`);
    localStorage.removeItem(`${uPrefix}_mythos_items`);
    localStorage.removeItem(`${uPrefix}_mythos_campaign`);
    const accounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    localStorage.setItem('mythos_accounts', JSON.stringify(accounts.filter(a => a.username !== uPrefix)));
    localStorage.removeItem('mythos_active_session');
    setCurrentUser(null);
    notify("Account Purged.", "success");
  }, [currentUser, notify]);

  const manifestBasics = async (scope: 'all' | 'monsters' | 'items' | 'heroes' | 'adventure' = 'all') => {
    notify("Manifesting Chronicle...", "info");
    let updatedMonsters = [...monsters];
    let updatedItems = [...items];
    let updatedChars = [...characters];
    let updatedClasses = [...classes];

    if (scope === 'all' || scope === 'monsters') {
      const existingIds = new Set(monsters.map(m => m.id));
      updatedMonsters = [...updatedMonsters.filter(m => !existingIds.has(m.id)), ...SYSTEM_MONSTERS];
    }

    if (scope === 'all' || scope === 'items') {
      const existingIds = new Set(items.map(i => i.id));
      updatedItems = [...updatedItems.filter(i => !existingIds.has(i.id)), ...SYSTEM_ITEMS];
    }

    if (scope === 'all') {
      const basicClasses: ClassDef[] = [
        {
          id: 'basic-warrior', name: 'Warrior', description: 'Energetic vanguards who thrive in the thick of melee combat.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Armor Proficiency'], startingItemIds: ['sys-iron-longsword'], features: [
            { name: 'Second Wind', description: 'As a bonus action, regain 1d10 + level HP.' },
            { name: 'Action Surge', description: 'Take one additional action on your turn.' }
          ], authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-priestess', name: 'Priestess', description: 'Timid but devoted channelers of divine light and healing.', hitDie: 'd8', startingHp: 10, hpPerLevel: 5, spellSlots: [4, 2, 0], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Healing Mastery'], startingItemIds: ['sys-oak-staff'], features: [
            { name: 'Channel Divinity', description: 'Turn undead or restore vitality to the broken.' },
            { name: 'Divine Radiance', description: 'Melee attacks deal an extra 1d8 radiant damage.' }
          ], initialSpells: THEMATIC_SPELLS.priestess, authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-archer', name: 'Archer', description: 'Aloof precision masters who command the battlefield from afar.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [2, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Ranged Mastery'], startingItemIds: ['sys-recurve-bow'], features: [
            { name: 'Deadeye Shot', description: 'Ignore cover when making ranged attacks.' },
            { name: 'Vanish', description: 'Can Hide as a bonus action.' }
          ], initialSpells: THEMATIC_SPELLS.archer, authorId: 'system', authorName: 'Orestara'
        }
      ];
      updatedClasses = [...updatedClasses.filter(c => !c.id.startsWith('basic')), ...basicClasses];
    }

    if (scope === 'all' || scope === 'heroes') {
        const heroes: Character[] = [
            { 
              id: 'hero-miri', name: 'Miri', classId: 'basic-warrior', race: 'Human', gender: 'Female', gold: 100, 
              description: "An energetic human swordswoman with a bright smile and a massive blade.", 
              level: 5, stats: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 12, charisma: 14 }, hp: 52, maxHp: 52, 
              feats: [{ name: 'Brave Heart', description: 'Advantage on saves against fear.' }], inventory: ['sys-iron-longsword'], isPlayer: false, authorId: 'system', isSpectral: true 
            },
            { 
              id: 'hero-lina', name: 'Lina', classId: 'basic-priestess', race: 'Human', gender: 'Female', gold: 120, 
              description: "A timid human priestess who clutches her holy symbol tightly, her magic glowing with soft amber light.", 
              level: 5, stats: { strength: 8, dexterity: 14, constitution: 14, intelligence: 14, wisdom: 18, charisma: 16 }, hp: 38, maxHp: 38, 
              feats: [{ name: 'Saintly Aura', description: 'Allies within 10ft gain +2 to death saves.' }], inventory: ['sys-oak-staff'], isPlayer: false, authorId: 'system', isSpectral: true 
            },
            { 
              id: 'hero-seris', name: 'Seris', classId: 'basic-archer', race: 'Elf', gender: 'Female', gold: 80, 
              description: "An aloof elf archer with silver hair. She speaks rarely, letting her arrows do the talking.", 
              level: 5, stats: { strength: 10, dexterity: 20, constitution: 14, intelligence: 12, wisdom: 16, charisma: 10 }, hp: 44, maxHp: 44, 
              feats: [{ name: 'Elven Accuracy', description: 'Reroll one ranged attack die per turn.' }], inventory: ['sys-recurve-bow'], isPlayer: false, authorId: 'system', isSpectral: true 
            }
        ];
        updatedChars = [...updatedChars.filter(c => !heroes.some(h => h.id === c.id)), ...heroes];
    }

    if (scope === 'all' || scope === 'adventure') {
      const firstLog: GameLog = {
        role: 'dm',
        content: "You are sitting at a weathered oak table in the bustling Adventurers Guild of Orestara. The air is thick with the scent of roasted meat and nervous excitement. Suddenly, three figures approach you. Miri, a vibrant woman in polished iron, grins widely. 'Hey there! You look like you can handle yourself. We've got a contract for the Grey Marches—requires a party of four minimum. Our timid priestess Lina and aloof archer Seris here are in, but we need one more. You game?'",
        timestamp: Date.now()
      };
      const plot = "The hunt for the Gorechimera: A quest requiring a quartet of heroes to slay the beast of the Grey Marches.";
      const rules = await generateRules(plot);
      setCampaign({ plot, summary: "Met Miri, Lina, and Seris at the Guild.", logs: [firstLog], party: [], rules, locationName: "Adventurers Guild" });
    }

    setCharacters(updatedChars); setClasses(updatedClasses); setMonsters(updatedMonsters); setItems(updatedItems);
    notify("World Manifested.", "success");
  };

  // Background Restoration Pulse for Spectral Souls (Avatars/Lore)
  useEffect(() => {
    if (!currentUser || characters.length === 0) return;
    const interval = setInterval(async () => {
      const spectralChar = characters.find(c => c.isSpectral);
      if (!spectralChar) return;
      const cls = classes.find(cl => cl.id === spectralChar.classId);
      try {
        const prompt = `TTRPG portrait: ${spectralChar.name}, ${spectralChar.gender} ${spectralChar.race} ${cls?.name}. ${spectralChar.description}. Dark fantasy art style.`;
        const imageUrl = await generateImage(prompt);
        setCharacters(prev => prev.map(c => c.id === spectralChar.id ? { ...c, imageUrl, isSpectral: false } : c));
      } catch (e) {}
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, characters, classes]);

  useEffect(() => {
    if (currentUser) {
      const uPrefix = currentUser.username;
      const savedChars = localStorage.getItem(`${uPrefix}_mythos_chars`);
      if (savedChars) {
        setCharacters(JSON.parse(savedChars));
        setClasses(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_classes`) || '[]'));
        setMonsters(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_monsters`) || '[]'));
        setItems(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_items`) || '[]'));
        setCampaign(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_campaign`) || '{}'));
      } else {
        manifestBasics('all');
      }
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

  const handleCloudSync = useCallback((action: 'push' | 'pull') => {
    if (!currentUser) return;
    const uPrefix = currentUser.username;
    if (action === 'push') {
      const archive = JSON.parse(localStorage.getItem('mythos_ether_archive') || '{}');
      archive[uPrefix] = { user: currentUser, characters, classes, monsters, items, campaign };
      localStorage.setItem('mythos_ether_archive', JSON.stringify(archive));
      notify("Archived.", "success");
    } else {
      const archive = JSON.parse(localStorage.getItem('mythos_ether_archive') || '{}');
      const data = archive[uPrefix];
      if (data) {
        setCharacters(data.characters); setClasses(data.classes); setMonsters(data.monsters); setItems(data.items); setCampaign(data.campaign);
        notify("Restored.", "success");
      } else notify("No Archive.", "error");
    }
  }, [currentUser, characters, classes, monsters, items, campaign, notify]);

  const handleMigrationExport = useCallback(() => currentUser ? btoa(JSON.stringify({ user: currentUser, characters, classes, monsters, items, campaign })) : "", [currentUser, characters, classes, monsters, items, campaign]);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Soul' } as SyncMessage;
    connections.forEach(conn => conn.open && conn.send(fullMsg));
  }, [connections, peerId, currentUser]);

  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => setConnections(prev => [...prev, conn]));
    conn.on('data', (data: any) => {
      const msg = data as SyncMessage;
      if (msg.type === 'NEW_LOG') setCampaign(prev => ({ ...prev, logs: [...prev.logs, msg.payload] }));
      if (msg.type === 'STATE_UPDATE') {
        if (msg.payload.campaign) setCampaign(msg.payload.campaign);
        if (msg.payload.characters) setCharacters(msg.payload.characters);
      }
    });
    conn.on('close', () => setConnections(prev => prev.filter(c => c.peer !== conn.peer)));
  }, []);

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

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} onMigrationImport={(s) => { try { const d = JSON.parse(atob(s)); setCurrentUser(d.user); return true; } catch { return false; } }} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={handleSignOut} user={currentUser} onlineFriends={onlineFriends} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
      <main className="flex-1 relative overflow-y-auto pt-[calc(48px+var(--safe-top))] lg:pt-0">
        <div className="p-3 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} setCharacters={setCharacters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={true} dmModel="gemini-3-pro-preview" setDmModel={()=>{}} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} manifestBasics={manifestBasics} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={true} currentUser={currentUser} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={true} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={true} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={true} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} onlineFriends={onlineFriends} onDeleteAccount={handleDeleteAccount} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={(id) => { setIsHost(false); setupConnection(peerRef.current!.connect(id)); }} setIsHost={setIsHost} forceSync={(s) => broadcast({ type: 'STATE_UPDATE', payload: s })} kickSoul={()=>{}} rehostWithSigil={initPeer} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign }} onImport={()=>{}} manifestBasics={()=>manifestBasics('all')} onCloudSync={handleCloudSync} onMigrationExport={handleMigrationExport} onFileExport={()=>{}} />}
        </div>
      </main>
      <div className="fixed top-0 right-0 left-0 lg:left-64 h-[calc(48px+var(--safe-top))] z-[60] bg-black/85 backdrop-blur-lg border-b border-neutral-900 px-4 md:px-6 flex items-center justify-between pt-[var(--safe-top)]">
        <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 text-[#b28a48]"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
        <div className="flex items-center gap-3">
          <span className="text-[7px] font-black text-neutral-600 uppercase tracking-widest leading-none">Resonance</span>
          <div className="w-16 md:w-32 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800"><div className="h-full bg-[#b28a48] w-full"></div></div>
        </div>
        <div className="fantasy-font text-[10px] text-[#b28a48] font-black tracking-widest uppercase">Mythos Core</div>
      </div>
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">{notifications.map(n => (<div key={n.id} className={`p-4 border-l-4 rounded-sm shadow-2xl animate-notification pointer-events-auto bg-black border ${n.type === 'error' ? 'border-red-900 text-red-400' : 'border-[#b28a48] text-[#b28a48]'}`}><p className="text-[10px] font-black uppercase tracking-widest">{n.message}</p></div>))}</div>
    </div>
  );
};

export default App;
