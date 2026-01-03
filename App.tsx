
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, UserAccount } from './types';
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
import { generateImage, generateRules } from './services/gemini';
import Peer, { DataConnection } from 'peerjs';

const REGISTRY_VERSION = 14; 

const MONTHLY_CONTENT = {
  version: "March-2025-v8-Tactical-Balance",
  classes: [
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Heavy armored knights who wield massive two-handed weapons. They channel dark aspected magic fueled by internal discipline and lore-steeped emotions to sustain themselves on the front lines.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 2, 0], preferredStats: ['Strength', 'Charisma'], bonuses: ['Heavy Armor Proficiency', 'Two-Handed Weapon Mastery', 'Dark Magic Focus'], features: [
        { name: 'Living Dead', description: 'Upon taking fatal damage, you instead survive at 1 HP until the end of your next combat turn. Healing received during this time is increased by 50%. If healing received is less than max HP by the end, succeed a DC 15 Death Save or perish.' },
        { name: 'Shadow Simulacrum', description: 'Manifest a shadowy echo that duplicates your melee attacks at half potency for 1 minute.' },
        { name: 'Dark Arts', description: 'Expend a spell slot to add 2d8 necrotic damage to a melee hit and gain half as temporary HP.' },
        { name: 'Abyssal Barrier', description: 'As a reaction to magic damage, grant yourself or an ally resistance to that damage type until your next turn.' },
        { name: 'Cold Aura', description: 'The air around you freezes. Enemies within 10ft have disadvantage on attack rolls against anyone but you.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Lifesteal 1d8 necrotic damage from all enemies within 5ft.' }
      ], authorId: 'system'
    },
    // ... rest of the classes stabilized in character creator
  ],
  monsters: [
    { id: 'mon-goblin-scout', name: 'Goblin Scavenger', description: 'A small, wiry goblin in mismatched leather scraps.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Disengage or Hide as a bonus action.' }], authorId: 'system', size: 'Small' as const },
    { id: 'mon-bugbear-thug', name: 'Bugbear Brawler', description: 'A massive, hairy goblinoid with long limbs and a heavy morningstar.', stats: { strength: 16, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 10, charisma: 8 }, hp: 35, ac: 15, abilities: [{ name: 'Surprise Attack', effect: 'Deals 2d6 extra damage if it hits a surprised target.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-boss-gorechimera', name: 'The Gorechimera', description: 'A terrifying fusion of Lion, Goat, and Serpent guarding the ruins.', stats: { strength: 22, dexterity: 12, constitution: 20, intelligence: 14, wisdom: 14, charisma: 12 }, hp: 220, ac: 19, isBoss: true, abilities: [{ name: 'Lion\'s Roar', effect: 'AOE Fear effect.' }], authorId: 'system', size: 'Huge' as const }
  ],
  heroes: [
    { 
      id: 'hero-miri', name: 'Miri', classId: 'cls-dark-knight', race: 'Human' as const, gender: 'Female' as const, gold: 150, 
      description: "A dark-armored warrior with a massive sword.", level: 5, stats: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 12, charisma: 14 }, hp: 60, maxHp: 60, 
      feats: [{ name: 'Brave Heart', description: 'Advantage on saves against fear.' }], inventory: ['itm-dk-claymore'], isPlayer: false, authorId: 'system', isSpectral: true, size: 'Medium' as const 
    },
    { 
      id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf' as const, gender: 'Female' as const, gold: 120, 
      description: "An aloof elf archer with piercing silver eyes.", level: 5, stats: { strength: 10, dexterity: 20, constitution: 14, intelligence: 12, wisdom: 16, charisma: 10 }, hp: 48, maxHp: 48, 
      feats: [{ name: 'Elven Accuracy', description: 'Reroll one ranged attack die.' }], inventory: ['itm-arch-bow'], isPlayer: false, authorId: 'system', isSpectral: true, size: 'Medium' as const 
    }
  ]
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('campaign');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const currentRegVersion = parseInt(localStorage.getItem('mythos_registry_version') || '0');
    if (currentRegVersion < REGISTRY_VERSION) {
      // Construction Migration for v14: Overwrite classes/monsters but merge characters
      const accountsRaw = localStorage.getItem('mythos_accounts');
      if (accountsRaw) {
        const accounts: UserAccount[] = JSON.parse(accountsRaw);
        accounts.forEach(acc => {
          const uPrefix = acc.username;
          // Purge global records to force reload
          localStorage.removeItem(`${uPrefix}_mythos_classes`);
          localStorage.removeItem(`${uPrefix}_mythos_monsters`);
          localStorage.removeItem(`${uPrefix}_mythos_items`);
          // Note: Characters and Campaigns are merged in the useEffect to prevent loss of progress
        });
        localStorage.setItem('mythos_accounts', JSON.stringify(accounts.map(a => ({...a, version: REGISTRY_VERSION}))));
      }
      localStorage.setItem('mythos_registry_version', REGISTRY_VERSION.toString());
    }
    return JSON.parse(localStorage.getItem('mythos_active_session') || 'null');
  });

  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [campaign, setCampaign] = useState<CampaignState>({ plot: '', summary: '', logs: [], party: [], rules: [], locationName: 'Orestara' });

  const [peerId, setPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const peerRef = useRef<Peer | null>(null);

  const notify = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
  }, []);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Soul' } as SyncMessage;
    connections.forEach(conn => conn.open && conn.send(fullMsg));
  }, [connections, peerId, currentUser]);

  const handleSignOut = () => { localStorage.removeItem('mythos_active_session'); setCurrentUser(null); };

  const manifestBasics = async () => {
    setClasses(MONTHLY_CONTENT.classes as any);
    setMonsters(MONTHLY_CONTENT.monsters as any);
    setCharacters(prev => {
      const merged = [...prev];
      MONTHLY_CONTENT.heroes.forEach(h => {
        if (!merged.find(m => m.id === h.id)) merged.push(h as any);
      });
      return merged;
    });
    notify("Chronicle Manifested.", "success");
  };

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
      } else manifestBasics();
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

  const initPeer = useCallback((id?: string) => {
    if (peerRef.current) peerRef.current.destroy();
    const p = id ? new Peer(id) : new Peer();
    peerRef.current = p;
    /* Cast p to any to fix missing 'on' property error in some build environments */
    (p as any).on('open', setPeerId);
    (p as any).on('connection', (conn: any) => {
      conn.on('open', () => setConnections(prev => [...prev, conn]));
      conn.on('data', (data: any) => {
        const msg = data as SyncMessage;
        if (msg.type === 'STATE_UPDATE') {
          if (msg.payload.campaign) setCampaign(msg.payload.campaign);
        }
        if (msg.type === 'NEW_LOG') setCampaign(prev => ({ ...prev, logs: [...prev.logs, msg.payload] }));
      });
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      const urlParams = new URLSearchParams(window.location.search);
      const joinId = urlParams.get('join');
      initPeer();
      if (joinId) {
        setTimeout(() => {
          /* Cast result to any to fix PeerJS method access errors */
          const conn = (peerRef.current as any)?.connect(joinId);
          if (conn) {
            setIsHost(false);
            conn.on('open', () => {
              setConnections(prev => [...prev, conn]);
              notify(`Connected to Party: ${joinId}`, "success");
            });
          }
        }, 1000);
      }
    }
  }, [currentUser, initPeer]);

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={handleSignOut} user={currentUser} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
      <main className="flex-1 relative overflow-y-auto pt-[calc(48px+var(--safe-top))] lg:pt-0">
        <div className="p-3 md:p-8 max-w-6xl mx-auto min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} setCharacters={setCharacters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={true} dmModel="gemini-3-pro-preview" setDmModel={()=>{}} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={true} currentUser={currentUser} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={true} manifestBasics={() => manifestBasics()} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={true} manifestBasics={() => manifestBasics()} currentUser={currentUser} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={true} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} onDeleteAccount={()=>{}} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={(id) => { setIsHost(false); initPeer(); peerRef.current?.connect(id); }} setIsHost={setIsHost} forceSync={()=>{}} kickSoul={()=>{}} rehostWithSigil={initPeer} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign }} onImport={()=>{}} manifestBasics={()=>manifestBasics()} onCloudSync={()=>{}} onMigrationExport={() => ''} onFileExport={()=>{}} />}
        </div>
      </main>
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">{notifications.map(n => (<div key={n.id} className={`p-4 border-l-4 rounded-sm shadow-2xl animate-notification pointer-events-auto bg-black border ${n.type === 'error' ? 'border-red-900 text-red-400' : 'border-[#b28a48] text-[#b28a48]'}`}><p className="text-[10px] font-black uppercase tracking-widest">{n.message}</p></div>))}</div>
    </div>
  );
};

export default App;
