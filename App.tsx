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
import { generateImage, generateWorldMap, generateLocalTiles } from './services/gemini';
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
const SYSTEM_VERSION = 115; 
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
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive' | 'spells' | 'profile'>('campaign');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [diceTrayOpen, setDiceTrayOpen] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);

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

  const [arcaneTokens, setArcaneTokens] = useState<number>(3); 
  const [reservoir, setReservoir] = useState<number>(100); 
  const [lockoutTime, setLockoutTime] = useState<number>(0);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);
  const [dmModel, setDmModel] = useState<string>('gemini-3-pro-preview');
  
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

  // Presence Heartbeat & Friend Discovery
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
    notify(`Soul ${sigil} Bound to Known List.`, 'success');
  }, [currentUser, notify]);

  const handleCloudSync = useCallback(async (action: 'push' | 'pull') => {
    if (!currentUser) return;
    const uPrefix = currentUser.username.toLowerCase();
    const etherArchive = JSON.parse(localStorage.getItem('mythos_ether_archive') || '{}');

    if (action === 'push') {
      etherArchive[uPrefix] = { ...etherArchive[uPrefix], data: { characters, classes, monsters, items, campaign }, friends: currentUser.friends };
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
        notify("No chronicle found in the Ether.", "error");
      }
    }
  }, [currentUser, characters, classes, monsters, items, campaign, notify]);

  const manifestBasics = async (scope: 'all' | 'monsters' | 'items' | 'heroes' | 'adventure' = 'all') => {
    notify("Channeling the Eternal Archive...", "info");
    let updatedMonsters = [...monsters];
    let updatedItems = [...items];
    let updatedChars = [...characters];
    let updatedClasses = [...classes];

    if (scope === 'all' || scope === 'monsters') {
      const existingIds = new Set(monsters.map(m => m.id));
      const monstersToAdd = [...SYSTEM_MONSTERS].filter(m => !existingIds.has(m.id));
      for (let m of monstersToAdd) {
        if (!m.imageUrl) {
          try { m.imageUrl = await generateImage(`Official TTRPG creature art: ${m.name}.`); setMonsters(prev => [...prev.filter(pm => pm.id !== m.id), m]); } catch(e) {}
        }
      }
      updatedMonsters = [...updatedMonsters.filter(m => !existingIds.has(m.id)), ...monstersToAdd];
    }

    if (scope === 'all' || scope === 'items') {
      const existingIds = new Set(items.map(i => i.id));
      const itemsToAdd = [...SYSTEM_ITEMS].filter(i => !existingIds.has(i.id));
      for (let i of itemsToAdd) {
        if (!i.imageUrl) {
          try { i.imageUrl = await generateImage(`High-quality TTRPG artifact: ${i.name}.`); setItems(prev => [...prev.filter(pi => pi.id !== i.id), i]); } catch(e) {}
        }
      }
      updatedItems = [...updatedItems.filter(i => !existingIds.has(i.id)), ...itemsToAdd];
    }

    if (scope === 'all') {
      const basicClasses: ClassDef[] = [
        {
          id: 'basic-warrior', name: 'Warrior', description: 'Mighty physical vanguards.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Armor Proficiency'], startingItemIds: ['sys-iron-longsword'], features: [{ name: 'Mighty Roar', description: 'Bonus action: 1d8 temporary HP.' }], initialSpells: [], authorId: 'system', authorName: 'Orestara'
        },
        {
          id: 'basic-mage', name: 'Mage', description: 'Supportive aether-users.', hitDie: 'd8', startingHp: 10, hpPerLevel: 6, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Healing Mastery'], startingItemIds: [], features: [{ name: 'Vital Flow', description: 'Restore 1d10 hit points.' }], initialSpells: THEMATIC_SPELLS.mage, authorId: 'system', authorName: 'Orestara'
        }
      ];
      updatedClasses = [...updatedClasses.filter(c => !c.id.startsWith('basic')), ...basicClasses];
      setClasses(updatedClasses);
    }

    if (scope === 'all' || scope === 'heroes') {
        const heroes: Character[] = [
            {
                id: 'hero-miri', name: 'Miri', classId: 'basic-warrior', race: 'Human', gender: 'Female', gold: 100, description: "Swordswoman with copper hair.", level: 1, stats: { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 14 }, hp: 12, maxHp: 12, feats: [{ name: 'Restless Spirit', description: 'Gains +2 to Initiative.' }], inventory: ['sys-iron-longsword'], isPlayer: true, authorId: 'system', authorName: 'Orestara'
            },
            {
                id: 'hero-zola', name: 'Zola', classId: 'basic-mage', race: 'Bat Person', gender: 'Female', gold: 150, description: "Vesperian mage with leathery wings.", level: 1, stats: { strength: 8, dexterity: 16, constitution: 12, intelligence: 15, wisdom: 16, charisma: 10 }, hp: 10, maxHp: 10, feats: [{ name: 'Leathery Wings', description: 'Gains flying speed.' }], inventory: [], isPlayer: false, authorId: 'system', authorName: 'Orestara'
            }
        ];
        for (let h of heroes) {
          if (!h.imageUrl) {
            try { h.imageUrl = await generateImage(`Fated hero portrait: ${h.name}, ${h.race}.`); setCharacters(prev => [...prev.filter(pc => pc.id !== h.id), h]); } catch(e) {}
          }
        }
        updatedChars = [...updatedChars.filter(c => !heroes.some(h => h.id === c.id)), ...heroes];
    }

    if (scope === 'adventure') {
      const plot = "The Obsidian Spire has returned to the Grey Marches.";
      const mapUrl = await generateWorldMap(plot);
      const tiles = await generateLocalTiles("The Shattered Perimeter", 3);
      setCampaign(prev => {
        const updated = { ...prev, plot, worldMapUrl: mapUrl, localMapTiles: tiles, locationName: "The Grey Marches" };
        broadcast({ type: 'STATE_UPDATE', payload: { campaign: updated } });
        return updated;
      });
    }

    setCharacters(updatedChars); setClasses(updatedClasses); setMonsters(updatedMonsters); setItems(updatedItems);
    notify("Eternal Archive Manifested.", "success");
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
    conn.on('open', () => {
      setConnections(prev => [...prev, conn]);
      if (conn.peer) addFriend(conn.peer);
    });
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

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  const reservoirReady = currentUser.isAdmin || reservoir >= 1;
  const arcadeReady = currentUser.isAdmin || arcaneTokens >= 1;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={handleSignOut} user={currentUser} onlineFriends={onlineFriends} />
      <main className="flex-1 relative overflow-y-auto scrollbar-hide pb-[calc(60px+var(--safe-bottom))] lg:pb-0 pt-[calc(48px+var(--safe-top))] lg:pt-0">
        <div className="p-3 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={arcadeReady} dmModel={dmModel} setDmModel={setDmModel} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} manifestBasics={manifestBasics} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={reservoirReady} currentUser={currentUser} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={reservoirReady} manifestBasics={manifestBasics} currentUser={currentUser} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} onlineFriends={onlineFriends} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={(id) => { setIsHost(false); const conn = peerRef.current!.connect(id); setupConnection(conn); }} setIsHost={setIsHost} forceSync={(sel) => {
              const state: any = {};
              if (sel.characters) state.characters = characters;
              if (sel.campaign) state.campaign = campaign;
              broadcast({ type: 'STATE_UPDATE', payload: state });
          }} kickSoul={() => {}} rehostWithSigil={(id) => { setIsHost(true); initPeer(id); }} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign, playerName: currentUser.displayName }} onImport={() => {}} manifestBasics={() => manifestBasics('all')} onCloudSync={handleCloudSync} />}
        </div>
      </main>
      <div className="fixed top-0 right-0 left-0 lg:left-64 h-[calc(48px+var(--safe-top))] z-[60] bg-black/85 backdrop-blur-lg border-b border-neutral-900 px-4 md:px-6 flex items-center justify-between pt-[var(--safe-top)]">
        <div className="flex items-center gap-3 md:gap-8">
           <div className="flex flex-col items-end">
              <span className="text-[7px] font-black text-neutral-600 uppercase tracking-widest leading-none mb-0.5">Resonance</span>
              <span className={`text-[11px] font-black leading-none ${currentUser.isAdmin ? 'text-blue-400' : 'text-[#b28a48]'}`}>{currentUser.isAdmin ? '∞' : Math.floor(arcaneTokens)} / 3</span>
           </div>
           <div className="w-16 md:w-32 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative shadow-inner">
              <div className={`h-full transition-all duration-700 ${currentUser.isAdmin ? 'bg-blue-500' : 'bg-[#b28a48]'}`} style={{ width: `${currentUser.isAdmin ? 100 : reservoir}%` }}></div>
           </div>
        </div>
        <div className="lg:hidden flex items-center gap-3">
          <div className="fantasy-font text-[10px] text-[#b28a48] font-black tracking-widest uppercase">Mythos</div>
        </div>
      </div>
    </div>
  );
};

export default App;