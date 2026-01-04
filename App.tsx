
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
    description: "A timid human mage with a soft voice. She is an AI mentor focused on supportive magics.", level: 1, stats: { strength: 8, dexterity: 12, constitution: 13, intelligence: 14, wisdom: 16, charisma: 14 }, hp: 13, maxHp: 13, 
    feats: [
      { name: 'Harmonized Buffs', description: 'Buffs target all allies within 30ft.' },
      { name: 'Divine Salve', description: 'Heals grant a minor shield for 1 turn.' },
      { name: 'Beacon of Aura', description: 'Immunity to fear for nearby allies.' },
      { name: 'Mana Well', description: 'Regain a Level 1 spell slot as a bonus action.' },
      { name: 'Soul Link', description: 'Share damage with a linked ally.' }
    ], 
    knownSpells: [
      { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Absorb 15 damage.' },
      { name: 'Blessing of Grace', level: 1, school: 'Enchantment', description: '+1d4 to all rolls for party.' },
      { name: 'Celestial Light', level: 1, school: 'Evocation', description: 'Heal 2d8 and grant +2 AC.' }
    ],
    inventory: ['itm-mage-staff-1', 'itm-healer-robes-1'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  },
  { 
    id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf', gender: 'Female', gold: 50, exp: 0, expToNextLevel: 1000,
    description: "A stoic elf archer. She is an AI mentor who specializes in precision strikes.", level: 1, stats: { strength: 10, dexterity: 18, constitution: 12, intelligence: 12, wisdom: 15, charisma: 8 }, hp: 16, maxHp: 16, 
    feats: [
      { name: 'Sky Piercer', description: 'Perfect accuracy on flying targets.' },
      { name: 'Exposed Weakness', description: '+2d6 bonus damage to marked foes.' },
      { name: 'Fleetfoot Reflex', description: '+2 AC while moving.' },
      { name: 'Master Fletcher', description: 'Can craft utility arrows during rest.' },
      { name: 'Eagle Eye', description: 'Ignore cover and long range penalties.' }
    ], 
    inventory: ['itm-arch-bow-1', 'itm-scout-leather-1'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  },
  { 
    id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human', gender: 'Female', gold: 50, exp: 0, expToNextLevel: 1000,
    description: "An energetic human fighter. She is an AI mentor focused on frontline bravery.", level: 1, stats: { strength: 16, dexterity: 14, constitution: 16, intelligence: 8, wisdom: 10, charisma: 12 }, hp: 20, maxHp: 20, 
    feats: [
      { name: 'Shield Sentinel', description: '+3 AC while using a shield.' },
      { name: 'Shield Bash', description: '1d10 damage and cause target to flinch.' },
      { name: 'Guardian Intercept', description: 'Take hits for adjacent allies.' },
      { name: 'Iron Focus', description: 'Advantage on Con saves vs status effects.' },
      { name: 'Steel Counter', description: 'Counter-attack when missed.' }
    ], 
    inventory: ['itm-fig-sword-1', 'itm-fig-shield-1', 'itm-half-plate-1'], isPlayer: false, isMentor: true, authorId: 'system', size: 'Medium' 
  }
];

const MONTHLY_CONTENT = {
  version: "March-2025-v32-Complete",
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Bows', 'Perception'], features: [
        { name: 'Sky Piercer', description: 'Perfect accuracy on flying targets.' },
        { name: 'Exposed Weakness', description: '+1d10 bonus damage to enemies engaged by allies.' },
        { name: 'Fleetfoot Reflex', description: '+2 AC while in light armor if you moved.' },
        { name: 'Utility Arrows', description: 'Craft arrows that can entangle, flare, or poison.' },
        { name: 'Barrage', description: 'Fire three arrows at once at a penalty.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-arch-bow-1', 'itm-scout-leather-1']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth who use dual daggers and smoke bombs to slip away.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Daggers', 'Stealth'], features: [
        { name: 'Stealth Mastery', description: 'Advantage on all stealth checks.' },
        { name: 'Cunning Execution', description: 'Instantly execute a human-sized or smaller target that is grappled by an ally.' },
        { name: 'Smoke Bomb', description: 'Vanish from sight and move 15ft free.' },
        { name: 'Blade Waltz', description: 'Gain an extra attack when dual-wielding daggers.' },
        { name: 'Poison Master', description: 'Attacks deal 1d6 poison damage per turn.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-dags-1', 'itm-scout-leather-1']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Masters of highly destructive magic that can turn the tide of battle.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Charisma'], bonuses: ['Staves', 'Arcana'], features: [
        { name: 'Destructive Overload', description: 'Spells deal Intelligence modifier bonus damage.' },
        { name: 'Arcane Memory', description: 'Commit a single spell to memory making it free to cast once per day.' },
        { name: 'Mana Shield', description: 'Spend mana to absorb damage.' },
        { name: 'Spell Surge', description: 'Cast a second spell as a bonus action.' },
        { name: 'Void Channeling', description: 'Spells ignore half of targets magic resistance.' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: 'Massive fire explosion.' },
        { name: 'Mana Burst', level: 1, school: 'Evocation', description: 'Force damage in a 15ft cone.' },
        { name: 'Arcane Ward', level: 1, school: 'Abjuration', description: 'Absorb 10 damage.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-staff-1', 'itm-sage-robes-1']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive spell casters focusing on healing and multi-target buffs.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Small Staves', 'Medicine'], features: [
        { name: 'Harmonized Aether', description: 'Buff spells target all allies within 30ft.' },
        { name: 'Divine Salve', description: 'Heals restore extra to low health targets.' },
        { name: 'Sanctuary Beacon', description: 'Nearby allies immune to fear/charm.' },
        { name: 'Mana Reservoir', description: 'Regain Level 2 spell slot on crit heal.' },
        { name: 'Sacrificial Link', description: 'Share damage with a chosen ally.' }
      ], initialSpells: [
        { name: 'Mass Restoration', level: 3, school: 'Conjuration', description: 'Heal all allies for 4d8.' },
        { name: 'Aegis of Grace', level: 1, school: 'Abjuration', description: '+4 AC to an ally.' },
        { name: 'Blessing of Might', level: 1, school: 'Enchantment', description: '+1d4 to attack/damage for party.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-staff-1', 'itm-healer-robes-1']
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Imposing frontliners who wield mighty two-handed swords and roars.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Weapons', 'Athletics'], features: [
        { name: 'Lion’s Roar', description: 'Invigorate allies granting 15 Temp HP.' },
        { name: 'Unshakeable Bulk', description: 'Immune to prone and being pushed.' },
        { name: 'Concussive Blows', description: 'Attacks can knock enemies prone.' },
        { name: 'Charged Devastation', description: 'Spend turn charging. Next hit deals 4x damage. You are marked for aggro while charging.' },
        { name: 'Vanguard Fury', description: 'Damage taken increases next attack damage.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-war-claymore-1', 'itm-full-plate-1']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Champion of the frontline, taking the brunt of damage with firm shield.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['Shields', 'Heavy Armor'], features: [
        { name: 'Shield Fortress', description: '+3 AC from shield. Grant +2 to adjacent allies.' },
        { name: 'Heavy Bash', description: 'Bash for 1d10 blunt damage; flinch targets.' },
        { name: 'Guardian Intercept', description: 'Reaction: Move to take damage for ally.' },
        { name: 'Indomitable Resolve', description: 'Advantage on saves vs fear/charm.' },
        { name: 'Master Counter', description: 'Successful block allows free attack.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-fig-sword-1', 'itm-fig-shield-1', 'itm-half-plate-1']
    },
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Gloom-armored warriors using dark aspected magics and life drain.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [3, 2, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['2H Swords', 'Intimidation'], features: [
        { name: 'Momentum Reaper', description: 'Move 10ft free after a kill.' },
        { name: 'Living Dead', description: 'Lasts 1 turn. Survive fatal hits at 1HP. Damage dealt heals you. If healing < max HP at turn end, succeed death save or die.' },
        { name: 'Living Shadow', description: 'Simulacrum copies 50% of your damage.' },
        { name: 'Aether Ignition', description: 'Sacrifice 10 HP for 2d10 necrotic burst.' },
        { name: 'Abyssal Chill', description: 'Cold aura reduces enemy speed by 50%.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 1d8 HP from all adjacent foes.' },
        { name: 'Blackest Night', level: 2, school: 'Abjuration', description: 'Absorb shield = 25% max HP.' },
        { name: 'Soul Reaper', level: 1, school: 'Necromancy', description: 'Next hit heals you for 50% damage.' }
      ], authorId: 'system', startingItemIds: ['itm-dk-blade-1', 'itm-dk-plate-1']
    }
  ],
  monsters: [
    // Goblinoids
    { id: 'mon-gob-1', name: 'Goblin Skirmisher', description: 'Fast and cowardly.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 8, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Disengage as bonus action.' }], size: 'Small', authorId: 'system' },
    { id: 'mon-gob-2', name: 'Hobgoblin Warlord', description: 'Tactical leader.', stats: { strength: 16, dexterity: 12, constitution: 14, intelligence: 12, wisdom: 10, charisma: 12 }, hp: 45, ac: 17, abilities: [{ name: 'Martial Advantage', effect: '+2d6 damage if ally nearby.' }], size: 'Medium', authorId: 'system' },
    // Beasts
    { id: 'mon-bst-1', name: 'Dire Wolf', description: 'Massive pack hunter.', stats: { strength: 17, dexterity: 15, constitution: 15, intelligence: 3, wisdom: 12, charisma: 7 }, hp: 37, ac: 14, abilities: [{ name: 'Pack Tactics', effect: 'Advantage if ally is nearby.' }], size: 'Large', authorId: 'system' },
    { id: 'mon-bst-2', name: 'Shadow Stalker', description: 'Obsidian-furred panther.', stats: { strength: 14, dexterity: 18, constitution: 12, intelligence: 4, wisdom: 14, charisma: 8 }, hp: 30, ac: 15, abilities: [{ name: 'Pounce', effect: 'Jump and knock prone.' }], size: 'Medium', authorId: 'system' },
    // Undead
    { id: 'mon-und-1', name: 'Wailing Wraith', description: 'Spectral grudge.', stats: { strength: 6, dexterity: 16, constitution: 12, intelligence: 10, wisdom: 14, charisma: 14 }, hp: 67, ac: 13, abilities: [{ name: 'Life Drain', effect: 'Reduce target max HP.' }], size: 'Medium', authorId: 'system' },
    { id: 'mon-und-2', name: 'Grave Colossus', description: 'Flesh golem of the dead.', stats: { strength: 22, dexterity: 9, constitution: 20, intelligence: 5, wisdom: 10, charisma: 5 }, hp: 130, ac: 12, abilities: [{ name: 'Slam', effect: '3d8 damage + Stun.' }], size: 'Huge', authorId: 'system' },
    // Humanoid
    { id: 'mon-hum-1', name: 'Rogue Assassin', description: 'Hidden in shadows.', stats: { strength: 11, dexterity: 18, constitution: 12, intelligence: 14, wisdom: 11, charisma: 14 }, hp: 78, ac: 15, abilities: [{ name: 'Sneak Attack', effect: '+4d6 on advantage.' }], size: 'Medium', authorId: 'system' },
    // Draconian
    { id: 'mon-dra-1', name: 'Drake Knight', description: 'Armor made of scales.', stats: { strength: 18, dexterity: 12, constitution: 16, intelligence: 10, wisdom: 12, charisma: 10 }, hp: 85, ac: 18, abilities: [{ name: 'Dragon Breath', effect: '4d6 fire cone.' }], size: 'Medium', authorId: 'system' },
    { id: 'mon-dra-2', name: 'Ancient Wyvern', description: 'Apex predator.', stats: { strength: 19, dexterity: 14, constitution: 17, intelligence: 6, wisdom: 12, charisma: 6 }, hp: 110, ac: 16, abilities: [{ name: 'Poison Stinger', effect: 'Target is poisoned for 2 turns.' }], size: 'Large', authorId: 'system' },
    // Boss
    { 
      id: 'mon-gorechimera', 
      name: 'Gorechimera', 
      isBoss: true,
      description: 'A terrifying pallid hybrid with heads of a lion and goat, and a venomous serpent tail.', 
      stats: { strength: 24, dexterity: 14, constitution: 22, intelligence: 12, wisdom: 18, charisma: 14 }, 
      hp: 400, 
      ac: 20, 
      size: 'Huge',
      abilities: [
        { name: 'Lion: Kingly Roar', effect: '4d8 thunder damage + Fear for 1 turn.' },
        { name: 'Serpent: Venomous Spray', effect: '30ft cone, 4d6 poison + blinded.' },
        { name: 'Goat: Necrotic Mending', effect: 'Heals self 50 HP and revives one slain monster at 50% HP.' }
      ],
      legendaryActions: [
        { name: 'Triple Fury', effect: 'One attack from each head in sequence.' }
      ],
      authorId: 'system'
    }
  ],
  items: [
    { id: 'itm-arch-bow-1', name: 'Composite Longbow', type: 'Weapon', rarity: 'Common', damageRoll: '1d10', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'Reinforced ash wood.', mechanics: [], lore: 'Scout standard.', authorId: 'system' },
    { id: 'itm-scout-leather-1', name: 'Reinforced Leather', type: 'Armor', rarity: 'Common', ac: 12, classRestrictions: ['cls-archer', 'cls-thief'], description: 'Silent movement.', mechanics: [], lore: 'Vanguard issue.', authorId: 'system' },
    { id: 'itm-thief-dags-1', name: 'Steel Twin Daggers', type: 'Weapon', rarity: 'Common', damageRoll: '1d6', damageType: 'Piercing', classRestrictions: ['cls-thief'], description: 'Light and quick.', mechanics: [], lore: 'Assassin tools.', authorId: 'system' },
    { id: 'itm-sorc-staff-1', name: 'Cedar Spell-Staff', type: 'Weapon', rarity: 'Common', damageRoll: '1d6', damageType: 'Force', classRestrictions: ['cls-sorcerer'], description: 'Focuses destructive energy.', mechanics: [], lore: 'Initiate focus.', authorId: 'system' },
    { id: 'itm-sage-robes-1', name: 'Silk Robes', type: 'Armor', rarity: 'Common', ac: 10, classRestrictions: ['cls-sorcerer', 'cls-mage'], description: 'Aether infused fabric.', mechanics: [], lore: 'Academy wear.', authorId: 'system' },
    { id: 'itm-mage-staff-1', name: 'Healer Staff', type: 'Weapon', rarity: 'Common', damageRoll: '1d6', damageType: 'Radiant', classRestrictions: ['cls-mage'], description: 'Aids in supportive channeling.', mechanics: [], lore: 'Shrine gift.', authorId: 'system' },
    { id: 'itm-healer-robes-1', name: 'Votive Vestments', type: 'Armor', rarity: 'Common', ac: 11, classRestrictions: ['cls-mage'], description: 'Pious protection.', mechanics: [], lore: 'Consecrated.', authorId: 'system' },
    { id: 'itm-war-claymore-1', name: 'Iron Greatsword', type: 'Weapon', rarity: 'Common', damageRoll: '2d6', damageType: 'Slashing', classRestrictions: ['cls-warrior'], description: 'Heavy and brutal.', mechanics: [], lore: 'Mercenary blade.', authorId: 'system' },
    { id: 'itm-full-plate-1', name: 'Polished Plate', type: 'Armor', rarity: 'Rare', ac: 18, classRestrictions: ['cls-warrior'], description: 'Maximum protection.', mechanics: [], lore: 'Knightly gear.', authorId: 'system' },
    { id: 'itm-fig-sword-1', name: 'Soldier Sword', type: 'Weapon', rarity: 'Common', damageRoll: '1d8', damageType: 'Slashing', classRestrictions: ['cls-fighter'], description: 'Military grade.', mechanics: [], lore: 'Standard army.', authorId: 'system' },
    { id: 'itm-fig-shield-1', name: 'Heater Shield', type: 'Armor', rarity: 'Common', ac: 2, classRestrictions: ['cls-fighter'], description: 'Iron-rimmed wood.', mechanics: [], lore: 'Frontline wall.', authorId: 'system' },
    { id: 'itm-half-plate-1', name: 'Half Plate', type: 'Armor', rarity: 'Common', ac: 15, classRestrictions: ['cls-fighter'], description: 'Versatile protection.', mechanics: [], lore: 'Veteran issue.', authorId: 'system' },
    { id: 'itm-dk-blade-1', name: 'Obsidian Greatsword', type: 'Weapon', rarity: 'Rare', damageRoll: '2d8', damageType: 'Necrotic', classRestrictions: ['cls-dark-knight'], description: 'Pulses with dark energy.', mechanics: [], lore: 'Bound in gloom.', authorId: 'system' },
    { id: 'itm-dk-plate-1', name: 'Gloom Plate', type: 'Armor', rarity: 'Rare', ac: 17, classRestrictions: ['cls-dark-knight'], description: 'Absorbs the light around it.', mechanics: [], lore: 'Order artifact.', authorId: 'system' }
  ],
  initialCampaign: {
    plot: "The Grey Marches have been swallowed by a spectral fog. Shadows move within.",
    summary: "The Mentor Trio awaits you at the Rusty Tankard. A Gorechimera has been spotted in the old ruins.",
    locationName: "Grey Marches",
    rules: [{ id: 'r-1', category: 'Combat', name: 'Momentum', content: 'Moving 10ft adds +2 damage.' }]
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
      const heroIds = MENTOR_TEMPLATES.map(h => h.id!);
      return [...prev.filter(c => !heroIds.includes(c.id)), ...MENTOR_TEMPLATES as any[]];
    });
    setCampaign(prev => ({
      ...prev,
      ...MONTHLY_CONTENT.initialCampaign,
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
