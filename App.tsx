
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
import { generateImage, generateRules } from './services/gemini';
import Peer, { DataConnection } from 'peerjs';

interface Notification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

const REGISTRY_VERSION = 11; 

const MONTHLY_CONTENT = {
  version: "March-2025-v5-Emotions-Of-Darkness",
  classes: [
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'These knights cast away shields for heavy two-handed swords. They ignite aether in their bodies with raw emotions—lore tells of Love as the strongest—to use dark aspected magics to drain life or create barriers. They maintain a cold, chilling bite in their tone to keep their inner darkness controlled.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 2, 0], preferredStats: ['Strength', 'Charisma'], bonuses: ['Heavy Armor Proficiency', 'Two-Handed Weapon Mastery', 'Dark Magic Focus'], features: [
        { name: 'Living Dead', description: 'Temporarily survive fatal damage for 1 round while greatly boosting health sap. If total healing received is less than max HP by the end of the effect, you must succeed a DC 15 Death Save.' },
        { name: 'Shadow Simulacrum', description: 'Create a shadowy simulacrum of yourself to fight at your side for 1 minute.' },
        { name: 'Dark Arts', description: 'Spend a bonus action to augment your next spell or attack with dark energy, adding your Charisma modifier to the damage or shield amount.' },
        { name: 'Dark Barrier', description: 'As a reaction, create a barrier of dark aspected magic to protect yourself or an ally from incoming magical damage.' },
        { name: 'Cold Bite', description: 'Your controlled emotional state chills the air around you; enemies within 10ft take a -2 penalty to attack rolls and have their movement speed reduced by 5ft.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Deal 1d8 necrotic damage to all enemies within 5ft; heal yourself for half the total damage dealt.' },
        { name: 'The Blackest Night', level: 2, school: 'Abjuration', description: 'Wrap yourself or an ally in a shield of darkness that absorbs 15 points of damage.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, capable of shooting flying enemies out of the air with great accuracy. They deal extra damage to exposed foes and use special arrows while staying light on their feet in leather armor.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [2, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Leather Armor Proficiency', 'Ranged Precision'], features: [
        { name: 'Sky Shot', description: 'Gain advantage and bonus damage when attacking flying or elevated enemies.' },
        { name: 'Expose Weakness', description: 'Mark an exposed enemy; your next attack against them deals an extra 1d8 damage.' },
        { name: 'Special Arrows', description: 'Access to fire, entangling, or piercing arrows that can bypass specific resistances or cause status effects.' },
        { name: 'Skirmish Step', description: 'When an enemy moves within 5ft of you, you can move 10ft as a reaction without provoking attacks of opportunity.' },
        { name: 'Eagle Eye', description: 'Ignore penalties for half and three-quarters cover at long range.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth who use leather armor and dual daggers. They can execute grappled enemies and use smoke bombs to pick off weaker targets quietly.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Dual Wielding Proficiency', 'Stealth Expertise'], features: [
        { name: 'Instant Execution', description: 'Instantly kill a human-sized or smaller enemy that is currently being grappled by an ally.' },
        { name: 'Smoke Bomb', description: 'Throw a bomb to immediately Disengage and become invisible until the start of your next turn.' },
        { name: 'Dual Fang Strike', description: 'When you hit with a dagger, you may make an immediate second strike with your off-hand dagger as a free action.' },
        { name: 'Shadow Step', description: 'Teleport up to 30ft from one area of shadow to another as a bonus action.' },
        { name: 'Cunning Infiltrator', description: 'Advantage on all checks involving lockpicking, trap-disarming, and sleight of hand.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Destructive spellcasters wielding long staves and robes. They excel at grand, tide-turning magic and can commit spells to memory for instant, free casting.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Staff Specialization', 'Arcane Destruction'], features: [
        { name: 'Spell Memory', description: 'Designate one known spell to memory; it becomes free and instant to cast once per long rest.' },
        { name: 'Grand Cataclysm', description: 'Increase the damage dice and area of your next destructive spell by 50% for one cast.' },
        { name: 'Staff Channeling', description: 'While holding a long staff, your spell save DC and spell attack bonus increase by +1.' },
        { name: 'Robed Alacrity', description: 'While wearing robes and no armor, your base AC is 13 + your Intelligence modifier.' },
        { name: 'Mana Flow', description: 'As a bonus action, spend health points to regain a 1st or 2nd level spell slot.' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: 'Unleash a massive explosion dealing 8d6 fire damage in a 20ft radius.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive casters focused on healing and party buffs. They target all allies with their supportive arts, ensuring a balanced and protected party.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Healing Mastery', 'Small Staff Focus'], features: [
        { name: 'Group Resonance', description: 'Buff spells that normally target one ally now target all allies within a 30ft radius.' },
        { name: 'Celestial Mending', description: 'A healing burst that restores 2d8 + Wisdom modifier HP to all party members in range.' },
        { name: 'Aetheric Shielding', description: 'Grant the entire party a temporary shield that reduces the next instance of incoming damage by 10.' },
        { name: 'Vitality Surge', description: 'Target ally gains 10 temporary HP and their next attack has advantage.' },
        { name: 'Prayer of Haste', description: 'Increase the movement speed of all allies by 10ft and grant them +2 to AC for 3 rounds.' }
      ], initialSpells: [
        { name: 'Benediction', level: 1, school: 'Abjuration', description: 'Instantly restore an ally to half their maximum HP.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Imposing front-liners in full plate wielding 2H swords and hammers. They invigorate allies with roars and unleash devastating charged-up downward swings.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Full Plate Mastery', 'Prone Resistance'], features: [
        { name: 'Vanguard Roar', description: 'Unleash a roar that grants 1d10 temporary HP and clears the Fear status from yourself and all allies within 30ft.' },
        { name: 'Charged Swing', description: 'Ready an attack; you are more likely to be targeted this turn. Next turn, unleash quadruple damage in a mighty downward swing.' },
        { name: 'Iron Roots', description: 'While wearing heavy armor, you have advantage on checks to resist being pushed or knocked prone.' },
        { name: 'Crushing Momentum', description: 'Attacks force a DC 14 STR save or the target is knocked prone.' },
        { name: 'Brutal Blow', description: 'Critical hits with two-handed weapons deal triple damage instead of double.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Champions of the frontline who hold shields firm to take the brunt of damage. They use swords or maces paired with shields for superior protection.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['Shield Mastery', 'Heavy Plate Mastery'], features: [
        { name: 'Shield Bash', description: 'Deal 1d6 blunt damage with your shield; the target must pass a CON save or be stunned until the end of their next turn.' },
        { name: 'Bulwark', description: 'While your shield is raised, add your shield bonus to any Dexterity saving throws.' },
        { name: 'Defender\'s Reflex', description: 'Take the damage for an adjacent ally as a reaction once per turn.' },
        { name: 'Interception', description: 'As a reaction when an ally is hit, reduce incoming damage by 1d10 + your character level.' },
        { name: 'Mace Mastery', description: 'Blunt weapons deal an extra 2 damage to armored targets and constructs.' }
      ], authorId: 'system', authorName: 'Orestara'
    }
  ],
  monsters: [
    {
      id: 'mon-shadow-stalker', name: 'Shadow Stalker', description: 'A lean, pitch-black humanoid that flickers in and out of the fog of the Grey Marches.', stats: { strength: 12, dexterity: 18, constitution: 12, intelligence: 10, wisdom: 14, charisma: 8 }, hp: 45, ac: 16, abilities: [{ name: 'Fog Ambush', effect: 'Deals 2d6 extra damage if it starts its turn hidden from the target.' }], authorId: 'system'
    },
    {
      id: 'mon-grey-harpy', name: 'Grey Harpy', description: 'Avian horrors with wings of tattered silk and razor-sharp claws that dive from the cliffs.', stats: { strength: 10, dexterity: 16, constitution: 14, intelligence: 8, wisdom: 12, charisma: 10 }, hp: 55, ac: 15, abilities: [{ name: 'Dive Strike', effect: 'Moves 30ft and attacks with advantage; the target must succeed a DC 13 DEX save or be knocked prone.' }], authorId: 'system'
    },
    {
      id: 'sys-gorechimera', name: 'The Gorechimera', description: 'A terrifying fusion of Lion, Goat, and Serpent guarding the ruins of the Grey Marches.', stats: { strength: 22, dexterity: 12, constitution: 20, intelligence: 14, wisdom: 14, charisma: 12 }, hp: 180, ac: 18, isBoss: true, abilities: [{ name: 'Lion\'s Roar', effect: 'AOE Fear effect; DC 16 WIS save or be Frightened for 1 minute.' }, { name: 'Serpent Lash', effect: 'Poisonous tail strike dealing 4d6 poison damage on hit.' }], legendaryActions: [{ name: 'Multiattack', effect: 'Makes three attacks: one Bite, one Claw, and one Horn strike.' }], authorId: 'system'
    }
  ],
  items: [
    { id: 'itm-dk-claymore', name: 'Order Claymore', type: 'Weapon' as const, description: 'A massive two-handed blade used by the Dark Knight Order.', mechanics: [{ name: 'Aetheric Link', description: 'Restore 2 HP on every successful hit.' }], lore: 'The blade of a Dark Knight, cold to the touch.', authorId: 'system' },
    { id: 'itm-war-plate', name: 'Vanguard Plate', type: 'Armor' as const, description: 'Full plate armor inscribed with symbols of the roar.', mechanics: [{ name: 'Heavy Frame', description: 'Reduces all physical damage taken by 2.' }], lore: 'Imposing protection for front-line warriors.', authorId: 'system' },
    { id: 'itm-mage-staff', name: 'Resonant Staff', type: 'Weapon' as const, description: 'A small staff of light-wood capped with a resonant crystal.', mechanics: [{ name: 'Healer\'s Pulse', description: 'Healing spells restore an extra 1d4 HP.' }], lore: 'Standard issue for Mages of the Guild.', authorId: 'system' },
    { id: 'itm-silver-bow', name: 'Silver-Strung Bow', type: 'Weapon' as const, description: 'A fine elven bow with a string made of enchanted silver.', mechanics: [{ name: 'Precision', description: 'Ignores partial cover when attacking.' }], lore: 'Seris\'s favorite weapon for long-range hunting.', authorId: 'system' },
    { id: 'itm-guild-blade', name: 'Guild-Issue Sword', type: 'Weapon' as const, description: 'A reliable one-handed arming sword.', mechanics: [{ name: 'Balanced', description: '+1 bonus to attack rolls.' }], lore: 'Standard gear for Miri and other guild fighters.', authorId: 'system' },
    { id: 'itm-oak-shield', name: 'Heraldic Shield', type: 'Armor' as const, description: 'A heavy iron-bound oak shield.', mechanics: [{ name: 'Bulwark', description: 'Grants an extra +2 bonus to AC when held firm.' }], lore: 'Miri\'s primary defense against the horrors of the marches.', authorId: 'system' }
  ],
  heroes: [
    { 
      id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human' as const, gender: 'Female' as const, gold: 150, 
      description: "An energetic human swordswoman in polished iron plate. She wears a wide, confident grin and carries a classic blade and shield.", 
      level: 5, stats: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 12, charisma: 14 }, hp: 55, maxHp: 55, 
      feats: [{ name: 'Brave Heart', description: 'Advantage on saves against fear.' }], inventory: ['itm-guild-blade', 'itm-oak-shield'], isPlayer: false, authorId: 'system', isSpectral: true 
    },
    { 
      id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human' as const, gender: 'Female' as const, gold: 180, 
      description: "A timid human priestess clutching a crystal holy symbol. Her white robes are slightly oversized, and her magic glows with a soft, warm amber light.", 
      level: 5, stats: { strength: 8, dexterity: 14, constitution: 14, intelligence: 14, wisdom: 18, charisma: 16 }, hp: 42, maxHp: 42, 
      feats: [{ name: 'Saintly Aura', description: 'Allies within 10ft gain +2 to death saves.' }], inventory: ['itm-mage-staff'], isPlayer: false, authorId: 'system', isSpectral: true 
    },
    { 
      id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf' as const, gender: 'Female' as const, gold: 120, 
      description: "An aloof elf archer with piercing silver eyes and long silver hair. She speaks rarely, letting her arrows do the talking.", 
      level: 5, stats: { strength: 10, dexterity: 20, constitution: 14, intelligence: 12, wisdom: 16, charisma: 10 }, hp: 48, maxHp: 48, 
      feats: [{ name: 'Elven Accuracy', description: 'Reroll one ranged attack die per turn if you have advantage.' }], inventory: ['itm-silver-bow'], isPlayer: false, authorId: 'system', isSpectral: true 
    }
  ]
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'characters' | 'classes' | 'bestiary' | 'armory' | 'multiplayer' | 'archive' | 'spells' | 'profile' | 'rules'>('characters');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const currentRegVersion = parseInt(localStorage.getItem('mythos_registry_version') || '0');
    if (currentRegVersion < REGISTRY_VERSION) {
      // Migrate accounts instead of removing them
      const accountsRaw = localStorage.getItem('mythos_accounts');
      if (accountsRaw) {
        try {
          const accounts: UserAccount[] = JSON.parse(accountsRaw);
          const migratedAccounts = accounts.map(acc => ({
            ...acc,
            version: REGISTRY_VERSION, // Update version
            registryEra: acc.registryEra || 'Eternal' // Ensure new fields exist
          }));
          localStorage.setItem('mythos_accounts', JSON.stringify(migratedAccounts));
        } catch (e) {
          console.error("Account migration failed", e);
        }
      }
      
      // Migrate the active session if it exists
      const sessionRaw = localStorage.getItem('mythos_active_session');
      if (sessionRaw) {
        try {
          const session = JSON.parse(sessionRaw);
          session.version = REGISTRY_VERSION;
          localStorage.setItem('mythos_active_session', JSON.stringify(session));
        } catch (e) {}
      }

      localStorage.setItem('mythos_registry_version', REGISTRY_VERSION.toString());
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
    notify("Soul record expunged from the Engine.", "success");
  }, [currentUser, notify]);

  const manifestBasics = async (scope: 'all' | 'adventure' = 'all') => {
    notify("Manifesting Monthly Saga...", "info");
    setClasses(MONTHLY_CONTENT.classes);
    setMonsters(MONTHLY_CONTENT.monsters);
    setItems(MONTHLY_CONTENT.items as Item[]);
    setCharacters(MONTHLY_CONTENT.heroes);
    
    const firstLog: GameLog = {
      role: 'dm',
      content: "The Adventurers Guild of Orestara is alive with the clink of mugs. You sit at a stained oak table. Suddenly, three figures approach. Miri, an energetic swordswoman, grins. 'Hey! You look capable. We've got a lead on the Gorechimera contract in the Grey Marches, but it requires a quartet of heroes. Lina—our timid mage—and Seris here are in, but we need one more. You game?'",
      timestamp: Date.now()
    };
    const plot = "Quest for the Grey Marches: Slay the legendary Gorechimera. Level 5 recommended.";
    const rules = await generateRules(plot);
    setCampaign({ plot, summary: "Met Miri, Lina, and Seris at the Guild. Level 5 party formed for the Gorechimera quest.", logs: [firstLog], party: [], rules, locationName: "Adventurers Guild" });
    notify("Chronicle Synchronized. Welcome to the Grey Marches.", "success");
  };

  useEffect(() => {
    if (!currentUser || characters.length === 0) return;
    const interval = setInterval(async () => {
      const spectralChar = characters.find(c => c.isSpectral);
      if (!spectralChar) return;
      const cls = classes.find(cl => cl.id === spectralChar.classId);
      try {
        const prompt = `Fantasy character portrait: ${spectralChar.name}. ${spectralChar.gender} ${spectralChar.race} ${cls?.name}. Appearance: ${spectralChar.description}. Cinematic dark fantasy.`;
        const imageUrl = await generateImage(prompt);
        setCharacters(prev => prev.map(c => c.id === spectralChar.id ? { ...c, imageUrl, isSpectral: false } : c));
      } catch (e) {}
    }, 45000);
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
      } else manifestBasics('all');
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
      notify("Legend Archived.", "success");
    } else {
      const archive = JSON.parse(localStorage.getItem('mythos_ether_archive') || '{}');
      const data = archive[uPrefix];
      if (data) {
        setCharacters(data.characters); setClasses(data.classes); setMonsters(data.monsters); setItems(data.items); setCampaign(data.campaign);
        notify("Legend Restored.", "success");
      } else notify("No Archive Found.", "error");
    }
  }, [currentUser, characters, classes, monsters, items, campaign, notify]);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Soul' } as SyncMessage;
    connections.forEach(conn => (conn as any).open && (conn as any).send(fullMsg));
  }, [connections, peerId, currentUser]);

  const setupConnection = useCallback((conn: any) => {
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
    const peer: any = customId ? new Peer(customId) : new Peer();
    peerRef.current = peer;
    peer.on('open', (id: string) => setPeerId(id));
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
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={true} manifestBasics={() => manifestBasics()} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={true} manifestBasics={() => manifestBasics()} currentUser={currentUser} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={true} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} onlineFriends={onlineFriends} onDeleteAccount={handleDeleteAccount} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={(id) => { setIsHost(false); setupConnection(peerRef.current!.connect(id)); }} setIsHost={setIsHost} forceSync={(s) => broadcast({ type: 'STATE_UPDATE', payload: s })} kickSoul={()=>{}} rehostWithSigil={initPeer} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign }} onImport={()=>{}} manifestBasics={()=>manifestBasics('all')} onCloudSync={handleCloudSync} onMigrationExport={() => btoa(JSON.stringify({user: currentUser, characters, classes, monsters, items, campaign}))} onFileExport={()=>{}} />}
        </div>
      </main>
      <div className="fixed top-0 right-0 left-0 lg:left-64 h-[calc(48px+var(--safe-top))] z-[60] bg-black/85 backdrop-blur-lg border-b border-neutral-900 px-4 md:px-6 flex items-center justify-between pt-[var(--safe-top)]">
        <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 text-[#b28a48]"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
        <div className="flex items-center gap-3">
          <span className="text-[7px] font-black text-neutral-600 uppercase tracking-widest leading-none">Monthly Cycle</span>
          <div className="w-16 md:w-32 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800"><div className="h-full bg-[#b28a48] w-full"></div></div>
        </div>
        <div className="fantasy-font text-[10px] text-[#b28a48] font-black tracking-widest uppercase">Mythos March 2025</div>
      </div>
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">{notifications.map(n => (<div key={n.id} className={`p-4 border-l-4 rounded-sm shadow-2xl animate-notification pointer-events-auto bg-black border ${n.type === 'error' ? 'border-red-900 text-red-400' : 'border-[#b28a48] text-[#b28a48]'}`}><p className="text-[10px] font-black uppercase tracking-widest">{n.message}</p></div>))}</div>
    </div>
  );
};

export default App;
