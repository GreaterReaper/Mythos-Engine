
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, UserAccount, Graveyard, Stats } from './types';
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
import SoulCairn from './components/SoulCairn';
import { generateImage, generateRules } from './services/gemini';
import Peer, { DataConnection } from 'peerjs';

const REGISTRY_VERSION = 32; 

export const MENTOR_TEMPLATES: Partial<Character>[] = [
  { 
    id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human', gender: 'Female', gold: 50, exp: 0, expToNextLevel: 1000,
    description: "A timid human mage with a soft voice. She is an AI mentor here to guide you.", level: 1, stats: { strength: 8, dexterity: 12, constitution: 13, intelligence: 14, wisdom: 16, charisma: 14 }, hp: 13, maxHp: 13, 
    feats: [
      { name: 'Harmonized Aether', description: 'Healing spells target all allies within 15ft.' },
      { name: 'Divine Salve', description: 'Heals grant a minor shield for 1 turn.' },
      { name: 'Beacon of Hope', description: 'Allies within 30ft immune to fear.' },
      { name: 'Mana Well', description: 'Recover a Level 1 spell slot as a bonus action.' },
      { name: 'Sacrificial Link', description: 'Share 50% damage with a chosen ally.' }
    ], 
    knownSpells: [
      { name: 'Celestial Light', level: 1, school: 'Evocation', description: 'Heal 2d8+Wis; grants target +2 AC for 1 turn.' },
      { name: 'Blessing of Might', level: 1, school: 'Enchantment', description: 'Allies within 30ft deal +1d4 damage.' },
      { name: 'Aegis of Grace', level: 1, school: 'Abjuration', description: 'Grants resistance to non-magical damage for 1 turn.' }
    ],
    inventory: ['itm-mage-staff-1', 'itm-sage-robes-1'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  },
  { 
    id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf', gender: 'Female', gold: 50, exp: 0, expToNextLevel: 1000,
    description: "A stoic elf archer. She is an AI mentor who analyzes tactical weaknesses.", level: 1, stats: { strength: 10, dexterity: 18, constitution: 12, intelligence: 12, wisdom: 15, charisma: 8 }, hp: 16, maxHp: 16, 
    feats: [
      { name: 'Sky Piercer', description: 'Ignore all cover and range penalties against flying targets.' },
      { name: 'Deadly Precision', description: '+2d6 damage to targets currently engaged by allies.' },
      { name: 'Fleet-Footed', description: '+2 AC while in light armor if you moved 15ft.' },
      { name: 'Master Fletcher', description: 'Can craft 3 Utility Arrows per short rest.' },
      { name: 'Eagle Eye', description: 'Advantage on all Perception and Long Range attacks.' }
    ], 
    inventory: ['itm-archer-bow-1', 'itm-scout-leather-1'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  },
  { 
    id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human', gender: 'Female', gold: 50, exp: 0, expToNextLevel: 1000,
    description: "An energetic human fighter. She is an AI mentor focused on frontline bravery.", level: 1, stats: { strength: 16, dexterity: 14, constitution: 16, intelligence: 8, wisdom: 10, charisma: 12 }, hp: 20, maxHp: 20, 
    feats: [
      { name: 'Shield Sentinel', description: 'While holding a shield, gain +3 AC and grant +2 to adjacent allies.' },
      { name: 'Concussive Bash', description: 'Bonus Action: Hit for 1d8 damage; target flinches and loses reaction.' },
      { name: 'Guardian’s Intercept', description: 'Reaction: Take a hit meant for an ally within 5ft.' },
      { name: 'Indomitable Focus', description: 'Advantage on Con saves to resist status effects.' },
      { name: 'Stalwart Counter', description: 'When missed, make one weapon attack as a reaction.' }
    ], 
    inventory: ['itm-fighter-sword-1', 'itm-fighter-shield-1', 'itm-half-plate-1'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  }
];

const MONTHLY_CONTENT = {
  version: "March-2025-v32-Full-Bestiary",
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy. They pick a single enemy that is exposed to deal extra damage against.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Bows', 'Light Armor', 'Perception'], features: [
        { name: 'Sky Piercer', description: 'Ignore all cover and range penalties against flying targets.' },
        { name: 'Exposed Weakness', description: '+1d10 damage to targets currently engaged by allies.' },
        { name: 'Fleet-Footed', description: '+2 AC while in light armor if you moved 15ft.' },
        { name: 'Utility Arrows', description: 'Choose per shot: Entangling (Restrain), Flare (Reveal), or Poison (1d6/rnd).' },
        { name: 'Barrage', description: 'Action: Fire 3 arrows at three different targets within range.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-archer-bow-1', 'itm-scout-leather-1']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth, wearing leather and using dual daggers to execute the weak.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Daggers', 'Stealth', 'Thieves Tools'], features: [
        { name: 'Stealth Mastery', description: 'Advantage on all Stealth checks. Sneak Attack deals +2d6 damage.' },
        { name: 'Cunning Execution', description: 'Instantly execute a human-sized or smaller target that is grappled by an ally.' },
        { name: 'Smoke Bomb', description: 'Bonus Action: Vanish. Become invisible and move 15ft without opportunity attacks.' },
        { name: 'Blade Waltz', description: 'When you hit with your main hand, make an off-hand attack as a free action.' },
        { name: 'Toxicant', description: 'Once per turn, apply a toxin that reduces target AC by 2 for 2 turns.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-dags-1', 'itm-scout-leather-1']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Masters of raw magic, wielding staves and destructive energy.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Charisma'], bonuses: ['Staves', 'Robes', 'Arcana'], features: [
        { name: 'Destructive Resonance', description: 'Add your Intelligence modifier twice to any damaging spell roll.' },
        { name: 'Arcane Memory', description: 'Once per day, cast any spell you know without expending a spell slot.' },
        { name: 'Aura of Shielding', description: 'While casting, gain temporary HP equal to 10 + your Level.' },
        { name: 'Unstable Surge', description: 'Spend a bonus action to increase next spell damage by 50%; take 1d6 damage.' },
        { name: 'Void Channeling', description: 'Your spells ignore damage resistance of monsters.' }
      ], initialSpells: [
        { name: 'Fireball', level: 3, school: 'Evocation', description: '8d6 fire in 20ft radius.' },
        { name: 'Mana Burst', level: 1, school: 'Evocation', description: '3d8 force damage in 15ft cone.' },
        { name: 'Arcane Ward', level: 1, school: 'Abjuration', description: 'Shield self from 15 damage.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', description: 'Create 3 copies to dodge attacks.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-staff-1', 'itm-sage-robes-1']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive spellcasters focused on healing and multi-target buffs.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Small Staves', 'Robes', 'Medicine'], features: [
        { name: 'Aetheric Buffet', description: 'Any buff you cast targets all allies within 30ft.' },
        { name: 'Divine Physician', description: 'Your heals restore an additional 2d8 HP to targets below half health.' },
        { name: 'Sanctuary Beacon', description: 'Allies within 20ft are immune to being Charmed or Frightened.' },
        { name: 'Mana Reservoir', description: 'Regain one Level 2 spell slot when an ally is healed to full.' },
        { name: 'Soul Bind', description: 'Link with an ally; both share 50% of incoming damage and heal together.' }
      ], initialSpells: [
        { name: 'Mass Restoration', level: 3, school: 'Conjuration', description: 'Heal all allies for 4d8.' },
        { name: 'Angelic Guard', level: 2, school: 'Abjuration', description: 'Grants +4 AC to one target.' },
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Absorb 15 damage from one target.' },
        { name: 'Divine Grace', level: 1, school: 'Enchantment', description: 'Target gains +1d4 to all rolls.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-staff-1', 'itm-healer-robes-1']
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Imposing frontliners who wield 2H weapons and plate armor.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Weapons', 'Heavy Armor', 'Athletics'], features: [
        { name: 'Lion’s Roar', description: 'Action: All allies gain 20 Temp HP and Advantage on next attack.' },
        { name: 'Unshakeable Bulk', description: 'Naturally resistant to being knocked prone or pushed. Gain +1 AC per adjacent foe.' },
        { name: 'Concussive Blows', description: 'Successful hits force DC 16 Str save or target is knocked prone.' },
        { name: 'Charged Devastation', description: 'Spend 1 turn charging. Next hit deals 4x damage. You are marked (Enemies more likely to hit you).' },
        { name: 'Bloodlust Vanguard', description: 'Each time you take damage, gain +2 damage stack (max +10) until next attack.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-war-claymore-1', 'itm-full-plate-1']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'The champion of the frontline with shield held firm.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['1H Weapons', 'Shields', 'Heavy Armor'], features: [
        { name: 'Shield Fortress', description: 'Gain +3 AC from shields. Adjacent allies gain +2 AC.' },
        { name: 'Heavy Bash', description: 'Bonus Action: Hit with shield for 1d10 damage; target is dazed (no reactions).' },
        { name: 'Guardian Intercept', description: 'Reaction: Move 10ft to take the damage for an ally.' },
        { name: 'Battle Focus', description: 'Advantage on saves vs fear, charm, and paralysis.' },
        { name: 'Combat Master', description: 'Gain +2 to hit against any target smaller than Large.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-fighter-sword-1', 'itm-fighter-shield-1', 'itm-half-plate-1']
    },
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Gloom-armored knights who trade life for catastrophic power.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [3, 2, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Swords', 'Intimidation'], features: [
        { name: 'Momentum Reaper', description: 'Heavy momentum carries you 10ft free toward a new target after a kill.' },
        { name: 'Living Dead', description: 'Lasts 1 turn. Survive fatal hits at 1 HP. Dealt damage heals you. If total healing received < Max HP by turn end, succeed a Death Save or die.' },
        { name: 'Living Shadow', description: 'Summon a shadow clone for 2 turns. It mimics your attacks at 50% damage.' },
        { name: 'Aether Ignition', description: 'Sacrifice 10 HP to deal 2d10 necrotic damage on next hit.' },
        { name: 'Abyssal Chill', description: 'A cold aura slows enemies within 10ft by 50% and reduces their damage by 3.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 2d8 HP from all adjacent enemies.' },
        { name: 'Blackest Night', level: 2, school: 'Abjuration', description: 'Create shield = 25% Max HP. If broken, next attack deals bonus 3d6.' },
        { name: 'Soul Reaper', level: 1, school: 'Necromancy', description: 'Heal for 50% of damage dealt on next hit.' }
      ], authorId: 'system', startingItemIds: ['itm-dk-blade-1', 'itm-dk-plate-1']
    }
  ],
  monsters: [
    // Goblinoids
    { id: 'mon-gob-1', name: 'Goblin Slasher', description: 'Fast, vicious, and cowardly.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 8, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Disengage as bonus action.' }], size: 'Small', authorId: 'system' },
    { id: 'mon-gob-2', name: 'Goblin Archer', description: 'Rains jagged arrows from above.', stats: { strength: 8, dexterity: 16, constitution: 10, intelligence: 10, wisdom: 10, charisma: 8 }, hp: 10, ac: 14, abilities: [{ name: 'Snipe', effect: 'Double damage on unaware targets.' }], size: 'Small', authorId: 'system' },
    { id: 'mon-gob-3', name: 'Goblin Witch', description: 'Casts crude fire magic.', stats: { strength: 6, dexterity: 12, constitution: 12, intelligence: 15, wisdom: 12, charisma: 10 }, hp: 20, ac: 12, abilities: [{ name: 'Flame Spit', effect: 'Ranged attack 3d6 fire.' }], size: 'Small', authorId: 'system' },
    // Beasts
    { id: 'mon-bst-1', name: 'Shadow Wolf', description: 'Hunts in packs, blending into the dark.', stats: { strength: 12, dexterity: 18, constitution: 12, intelligence: 4, wisdom: 14, charisma: 6 }, hp: 35, ac: 15, abilities: [{ name: 'Pounce', effect: 'Jump 20ft and knock target prone.' }], size: 'Medium', authorId: 'system' },
    { id: 'mon-bst-2', name: 'Iron-Hide Boar', description: 'A massive beast with metallic tusks.', stats: { strength: 18, dexterity: 8, constitution: 18, intelligence: 2, wisdom: 10, charisma: 4 }, hp: 60, ac: 17, abilities: [{ name: 'Tusk Charge', effect: 'Stun target and deal 4d6 damage.' }], size: 'Large', authorId: 'system' },
    // Undead
    { id: 'mon-und-1', name: 'Crypt Skeleton', description: 'Ancient remains in rusted mail.', stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 }, hp: 15, ac: 13, abilities: [{ name: 'Undead Resilience', effect: 'Resistant to piercing.' }], size: 'Medium', authorId: 'system' },
    { id: 'mon-und-2', name: 'Famine Ghoul', description: 'Paralyzing claws and endless hunger.', stats: { strength: 13, dexterity: 15, constitution: 12, intelligence: 7, wisdom: 10, charisma: 6 }, hp: 25, ac: 12, abilities: [{ name: 'Paralyzing Strike', effect: 'Con save DC 13 or paralyzed.' }], size: 'Medium', authorId: 'system' },
    { id: 'mon-und-3', name: 'Spectral Knight', description: 'Ghostly armor filled with spite.', stats: { strength: 16, dexterity: 10, constitution: 18, intelligence: 10, wisdom: 12, charisma: 10 }, hp: 80, ac: 18, abilities: [{ name: 'Ghostly Blade', effect: 'Ignore 5 AC of target.' }], size: 'Medium', authorId: 'system' },
    // Draconian
    { id: 'mon-dra-1', name: 'Cinder Drake', description: 'A small flightless dragon with molten skin.', stats: { strength: 18, dexterity: 12, constitution: 16, intelligence: 10, wisdom: 12, charisma: 14 }, hp: 110, ac: 18, abilities: [{ name: 'Cinder Breath', effect: '4d6 fire cone.' }], size: 'Large', authorId: 'system' },
    { id: 'mon-dra-2', name: 'Storm Wyvern', description: 'Soars on lightning wings.', stats: { strength: 16, dexterity: 20, constitution: 15, intelligence: 12, wisdom: 14, charisma: 12 }, hp: 130, ac: 19, abilities: [{ name: 'Thunder Dive', effect: 'Deals 6d8 thunder and knocks prone.' }], size: 'Huge', authorId: 'system' },
    // Boss
    { 
      id: 'mon-gorechimera', 
      name: 'Gorechimera', 
      isBoss: true,
      description: 'A terrifying hybrid with the head and shoulders of a lion, the body and head of a goat, and a venomous serpent tail. Its pallid skin shimmers with dark energy.', 
      stats: { strength: 24, dexterity: 14, constitution: 22, intelligence: 12, wisdom: 18, charisma: 14 }, 
      hp: 450, 
      ac: 21, 
      size: 'Huge',
      abilities: [
        { name: 'Lion: Kingly Roar', effect: 'Fear all within 60ft and deal 4d8 thunder damage.' },
        { name: 'Serpent: Venomous Spray', effect: '30ft cone, 4d6 poison + blinded for 1 turn.' },
        { name: 'Goat: Necrotic Mending', effect: 'Heals self for 50 HP and resurrects a slain non-boss monster at 50% HP.' }
      ],
      legendaryActions: [
        { name: 'Triple Fury', effect: 'Attacks with Lion, Goat, and Serpent in sequence.' },
        { name: 'Pallid Mist', effect: 'Creates fog; become invisible and teleport 30ft.' }
      ],
      authorId: 'system'
    }
  ],
  items: [
    { id: 'itm-dk-blade-1', name: 'Aether-Burned Greatsword', type: 'Weapon', rarity: 'Rare', damageRoll: '2d10', damageType: 'Necrotic', classRestrictions: ['cls-dark-knight'], description: 'A blackened blade that pulses with dark energy.', mechanics: [], lore: 'Standard issue for the Dark Knight Order.', authorId: 'system' },
    { id: 'itm-dk-plate-1', name: 'Gloom-Steel Plate', type: 'Armor', rarity: 'Rare', ac: 19, classRestrictions: ['cls-dark-knight'], description: 'Absorbs the light around it.', mechanics: [], lore: 'Order relic.', authorId: 'system' },
    { id: 'itm-archer-bow-1', name: 'Composite Scout Bow', type: 'Weapon', rarity: 'Common', damageRoll: '1d10', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'Lightweight and deadly.', mechanics: [], lore: 'Reliable ash wood.', authorId: 'system' },
    { id: 'itm-scout-leather-1', name: 'Scout Vanguard Leather', type: 'Armor', rarity: 'Common', ac: 13, classRestrictions: ['cls-archer', 'cls-thief'], description: 'Flexible and silent.', mechanics: [], lore: 'Camouflaged.', authorId: 'system' },
    { id: 'itm-fighter-sword-1', name: 'Steel Arming Sword', type: 'Weapon', rarity: 'Common', damageRoll: '1d8', damageType: 'Slashing', classRestrictions: ['cls-fighter'], description: 'Military grade.', mechanics: [], lore: 'Forged in the Royal Foundries.', authorId: 'system' },
    { id: 'itm-fighter-shield-1', name: 'Iron Heater Shield', type: 'Armor', rarity: 'Common', ac: 3, classRestrictions: ['cls-fighter'], description: 'Solid iron.', mechanics: [], lore: 'A wall in your hand.', authorId: 'system' },
    { id: 'itm-half-plate-1', name: 'Standard Half-Plate', type: 'Armor', rarity: 'Common', ac: 15, classRestrictions: ['cls-fighter'], description: 'Effective protection.', mechanics: [], lore: 'Veteran issue.', authorId: 'system' },
    { id: 'itm-war-claymore-1', name: 'Vanguard Claymore', type: 'Weapon', rarity: 'Rare', damageRoll: '3d6', damageType: 'Slashing', classRestrictions: ['cls-warrior'], description: 'A massive blade for massive men.', mechanics: [], lore: 'Takes two to carry, one to wield.', authorId: 'system' },
    { id: 'itm-full-plate-1', name: 'Lionheart Plate', type: 'Armor', rarity: 'Rare', ac: 18, classRestrictions: ['cls-warrior', 'cls-fighter'], description: 'Maximum protection.', mechanics: [], lore: 'Forged for kings.', authorId: 'system' }
  ],
  initialCampaign: {
    plot: "The spectral fog of the Grey Marches is deepening. A Gorechimera has been sighted near the old ruins.",
    summary: "Your fellowship gathers at the Rusty Tankard. The Mentor Trio—Miri, Lina, and Seris—are ready to guide you.",
    locationName: "Rusty Tankard Tavern",
    rules: [
      { id: 'r-1', category: 'Combat', name: 'Momentum', content: 'Moving 10ft adds +2 damage.' },
      { id: 'r-2', category: 'Progression', name: 'Essence Ascension', content: 'ASI points granted at levels 4, 8, 12, 16, and 19.' }
    ]
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('characters');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return JSON.parse(localStorage.getItem('mythos_active_session') || 'null');
  });

  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [graveyard, setGraveyard] = useState<Graveyard>({ characters: [], monsters: [], items: [], classes: [] });
  const [campaign, setCampaign] = useState<CampaignState>({ plot: '', summary: '', logs: [], party: [], rules: [], locationName: 'Orestara' });

  const [peerId, setPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [connections, setConnections] = useState<DataConnection[]>([]);

  const notify = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const broadcast = useCallback((msg: Partial<SyncMessage>) => {
    const fullMsg = { ...msg, senderId: peerId, senderName: currentUser?.displayName || 'Soul' } as SyncMessage;
    connections.forEach(conn => conn.open && conn.send(fullMsg));
  }, [connections, peerId, currentUser]);

  const handleSignOut = () => { 
    localStorage.removeItem('mythos_active_session'); 
    setCurrentUser(null); 
  };

  const handleDeleteAccount = useCallback(() => {
    if (!currentUser) return;
    if (!window.confirm("Permanently sever your soul and erase all locally stored legends? This cannot be undone.")) return;

    const username = currentUser.username;
    const localAccounts: UserAccount[] = JSON.parse(localStorage.getItem('mythos_accounts') || '[]');
    const updatedAccounts = localAccounts.filter(a => a.username !== username);
    
    localStorage.setItem('mythos_accounts', JSON.stringify(updatedAccounts));
    localStorage.removeItem(`${username}_mythos_chars`);
    localStorage.removeItem(`${username}_mythos_classes`);
    localStorage.removeItem(`${username}_mythos_monsters`);
    localStorage.removeItem(`${username}_mythos_items`);
    localStorage.removeItem(`${username}_mythos_graveyard`);
    localStorage.removeItem(`${username}_mythos_campaign`);
    localStorage.removeItem('mythos_active_session');

    setCurrentUser(null);
    notify("Soul bond severed. Identity erased from the Engine.", "error");
  }, [currentUser, notify]);

  const banishToCairn = useCallback((type: keyof Graveyard, entity: any) => {
    const deletedAt = Date.now();
    const entityWithTimestamp = { ...entity, deletedAt };
    setGraveyard(prev => ({ ...prev, [type]: [...prev[type], entityWithTimestamp] }));
    
    if (type === 'characters') setCharacters(prev => prev.filter(c => c.id !== entity.id));
    if (type === 'monsters') setMonsters(prev => prev.filter(m => m.id !== entity.id));
    if (type === 'items') setItems(prev => prev.filter(i => i.id !== entity.id));
    if (type === 'classes') setClasses(prev => prev.filter(c => c.id !== entity.id));
    
    notify(`${entity.name} cast into the Cairn.`, "info");
  }, [notify]);

  const restoreFromCairn = useCallback((type: keyof Graveyard, id: string) => {
    const entity = graveyard[type].find((e: any) => e.id === id);
    if (!entity) return;
    setGraveyard(prev => ({ ...prev, [type]: prev[type].filter((e: any) => e.id !== id) }));
    if (type === 'characters') setCharacters(prev => [...prev, entity as Character]);
    if (type === 'monsters') setMonsters(prev => [...prev, entity as Monster]);
    if (type === 'items') setItems(prev => [...prev, entity as Item]);
    if (type === 'classes') setClasses(prev => [...prev, entity as ClassDef]);
    notify(`${entity.name} resurrected.`, "success");
  }, [graveyard, notify]);

  const purgeFromCairn = useCallback((type: keyof Graveyard, id: string) => {
    const entity = graveyard[type].find((e: any) => e.id === id);
    setGraveyard(prev => ({ ...prev, [type]: prev[type].filter((e: any) => e.id !== id) }));
    if (entity) notify(`${entity.name} purged from existence.`, "error");
  }, [graveyard, notify]);

  const manifestBasics = useCallback(() => {
    setClasses(prev => {
      const systemIds = MONTHLY_CONTENT.classes.map(c => c.id);
      return [...prev.filter(c => !systemIds.includes(c.id)), ...MONTHLY_CONTENT.classes as any[]];
    });
    setMonsters(prev => {
      const systemIds = MONTHLY_CONTENT.monsters.map(m => m.id);
      return [...prev.filter(m => !systemIds.includes(m.id)), ...MONTHLY_CONTENT.monsters as any[]];
    });
    setItems(prev => {
      const merged = [...prev];
      MONTHLY_CONTENT.items.forEach(i => { if (!merged.find(x => x.id === i.id)) merged.push(i as any); });
      return merged;
    });
    setCharacters(prev => {
      // Fix: Use MENTOR_TEMPLATES as MONTHLY_CONTENT.heroes is not defined.
      const heroIds = MENTOR_TEMPLATES.map(h => h.id!);
      return [...prev.filter(c => !heroIds.includes(c.id)), ...MENTOR_TEMPLATES as any[]];
    });
    setCampaign(prev => ({
      ...prev,
      ...MONTHLY_CONTENT.initialCampaign,
      // Fix: Use MENTOR_TEMPLATES as MONTHLY_CONTENT.heroes is not defined.
      party: MENTOR_TEMPLATES as any[],
      logs: [{ role: 'dm', content: MONTHLY_CONTENT.initialCampaign.summary, timestamp: Date.now() }]
    }));
    notify("Chronicle Synchronized.", "success");
  }, [notify]);

  useEffect(() => {
    if (currentUser) {
      const uPrefix = currentUser.username;
      const charsRaw = localStorage.getItem(`${uPrefix}_mythos_chars`);
      if (charsRaw) {
        setCharacters(JSON.parse(charsRaw));
        setClasses(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_classes`) || '[]'));
        setMonsters(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_monsters`) || '[]'));
        setItems(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_items`) || '[]'));
        setGraveyard(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_graveyard`) || '{"characters":[],"monsters":[],"items":[],"classes":[]}'));
        setCampaign(JSON.parse(localStorage.getItem(`${uPrefix}_mythos_campaign`) || '{}'));
      } else manifestBasics();
    }
  }, [currentUser?.username, manifestBasics]);

  useEffect(() => {
    if (!currentUser) return;
    const uPrefix = currentUser.username;
    localStorage.setItem(`${uPrefix}_mythos_chars`, JSON.stringify(characters));
    localStorage.setItem(`${uPrefix}_mythos_classes`, JSON.stringify(classes));
    localStorage.setItem(`${uPrefix}_mythos_monsters`, JSON.stringify(monsters));
    localStorage.setItem(`${uPrefix}_mythos_items`, JSON.stringify(items));
    localStorage.setItem(`${uPrefix}_mythos_graveyard`, JSON.stringify(graveyard));
    localStorage.setItem(`${uPrefix}_mythos_campaign`, JSON.stringify(campaign));
  }, [currentUser, characters, classes, monsters, items, graveyard, campaign]);

  if (!currentUser) return <LoginScreen setCurrentUser={setCurrentUser} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-black/80 border-b border-[#b28a48]/20 backdrop-blur-md z-[100] h-16 shrink-0">
        <button onClick={() => setMobileSidebarOpen(true)} className="text-[#b28a48] text-2xl p-2 active:scale-90 transition-transform">
          ☰
        </button>
        <h1 className="text-lg font-black tracking-widest text-[#b28a48] fantasy-font truncate max-w-[60%]">
          {campaign.locationName || 'Mythos Engine'}
        </h1>
        <div className="w-8"></div>
      </header>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSignOut={handleSignOut} 
        user={currentUser} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        mobileOpen={mobileSidebarOpen} 
        setMobileOpen={setMobileSidebarOpen} 
      />

      <main className={`flex-1 relative overflow-y-auto lg:h-full transition-all duration-300`}>
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-[calc(100vh-64px)] lg:min-h-full">
          {activeTab === 'campaign' && <CampaignView campaign={campaign} setCampaign={setCampaign} characters={characters} setCharacters={setCharacters} broadcast={broadcast} isHost={isHost} classes={classes} playerName={currentUser.displayName} notify={notify} arcadeReady={true} dmModel="gemini-3-pro-preview" setDmModel={()=>{}} isQuotaExhausted={false} localResetTime="" items={items} user={currentUser} />}
          {activeTab === 'characters' && <CharacterCreator characters={characters} setCharacters={setCharacters} classes={classes} items={items} notify={notify} reservoirReady={true} currentUser={currentUser} onBanish={(char) => banishToCairn('characters', char)} />}
          {activeTab === 'classes' && <ClassLibrary classes={classes} setClasses={setClasses} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} items={items} setItems={setItems} />}
          {activeTab === 'bestiary' && <Bestiary monsters={monsters} setMonsters={setMonsters} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} />}
          {activeTab === 'armory' && <Armory items={items} setItems={setItems} broadcast={broadcast} notify={notify} reservoirReady={true} currentUser={currentUser} classes={classes} />}
          {activeTab === 'spells' && <SpellCodex characters={characters} classes={classes} notify={notify} />}
          {activeTab === 'rules' && <RulesManifest user={currentUser} campaign={campaign} setCampaign={setCampaign} notify={notify} isHost={isHost} reservoirReady={true} broadcast={broadcast} setActiveTab={setActiveTab} />}
          {activeTab === 'soul-cairn' && <SoulCairn graveyard={graveyard} onRestore={restoreFromCairn} onPurge={purgeFromCairn} />}
          {activeTab === 'profile' && <ProfilePanel user={currentUser} onDeleteAccount={handleDeleteAccount} />}
          {activeTab === 'multiplayer' && <MultiplayerPanel peerId={peerId} isHost={isHost} connections={connections} serverLogs={[]} joinSession={()=>{}} setIsHost={setIsHost} forceSync={()=>{}} kickSoul={()=>{}} rehostWithSigil={()=>{}} />}
          {activeTab === 'archive' && <ArchivePanel data={{ characters, classes, monsters, items, campaign }} onImport={()=>{}} manifestBasics={manifestBasics} />}
        </div>
      </main>

      <div className="fixed top-20 lg:top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 border-l-4 rounded-sm shadow-2xl animate-notification pointer-events-auto bg-black/95 border ${n.type === 'error' ? 'border-red-900 text-red-400' : 'border-[#b28a48] text-[#b28a48]'} max-w-[280px] md:max-w-md`}>
            <p className="text-[10px] font-black uppercase tracking-widest">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
