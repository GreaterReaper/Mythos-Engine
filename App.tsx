
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

const REGISTRY_VERSION = 13; 

const MONTHLY_CONTENT = {
  version: "March-2025-v7-The-Final-Standard",
  classes: [
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Heavy armored knights who wield massive two-handed weapons. They channel dark aspected magic fueled by internal discipline and lore-steeped emotions to sustain themselves on the front lines.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 2, 0], preferredStats: ['Strength', 'Charisma'], bonuses: ['Heavy Armor Proficiency', 'Two-Handed Weapon Mastery', 'Dark Magic Focus'], features: [
        { name: 'Living Dead', description: 'Upon taking fatal damage, you instead survive at 1 HP until the end of your next combat turn. Healing received during this time is increased by 50%. If healing received is less than max HP by the end, succeed a DC 15 Death Save or perish.' },
        { name: 'Shadow Simulacrum', description: 'Manifest a shadowy echo that duplicates your melee attacks at half potency for 1 minute.' },
        { name: 'Dark Arts', description: 'Expend a spell slot to add 2d8 necrotic damage to a melee hit and gain half as temporary HP.' },
        { name: 'Abyssal Barrier', description: 'As a reaction to magic damage, grant yourself or an ally resistance to that damage type until your next turn.' },
        { name: 'Cold Aura', description: 'The air around you freezes. Enemies within 10ft have disadvantage on attack rolls against anyone but you.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Lifesteal 1d8 necrotic damage from all enemies within 5ft. Synergizes with Living Dead healing boost.' },
        { name: 'Edge of Shadow', level: 1, school: 'Evocation', description: 'Your weapon drips darkness, adding 1d6 necrotic damage to hits for 1 minute.' },
        { name: 'Unmend', level: 1, school: 'Necromancy', description: 'A long-range bolt of dark energy that forces the target to move toward you (WIS save).' },
        { name: 'The Blackest Night', level: 2, school: 'Abjuration', description: 'Grant a shield of pure shadow to a target that absorbs 20 damage. If broken, regain a spell slot.' },
        { name: 'Flood of Darkness', level: 2, school: 'Evocation', description: 'A line of shadow energy dealing 3d8 necrotic damage.' },
        { name: 'Quietude', level: 2, school: 'Enchantment', description: 'Silence a target for 1 round, preventing verbal incantations.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-archer', name: 'Archer', description: 'Elite marksmen who specialize in aerial denial and tactical movement. They wear leather armor and utilize a small reservoir of nature-attuned magic.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [2, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Leather Armor Proficiency', 'Ranged Weapon Mastery'], features: [
        { name: 'Sky Shot', description: 'Gain +2 to hit and +1d8 damage against flying or elevated targets.' },
        { name: 'Expose Weakness', description: 'Mark a target. Your next 3 shots against them ignore damage resistance.' },
        { name: 'Alchemical Arrowheads', description: 'Infuse your arrows with Fire, Frost, or Poison (choose when attacking).' },
        { name: 'Evasive Maneuver', description: 'Take the Disengage action as a bonus action.' },
        { name: 'Sentinel Eye', description: 'You cannot be surprised while conscious and gain blindsight 10ft.' }
      ], initialSpells: [
        { name: 'Hunter\'s Mark', level: 1, school: 'Divination', description: 'Designate a quarry; deal 1d6 extra damage on all hits to them.' },
        { name: 'Snaring Roots', level: 1, school: 'Conjuration', description: 'Next arrow hit causes target to be Restrained (STR save).' },
        { name: 'Zephyr Strike', level: 1, school: 'Transmutation', description: 'Your movement does not provoke opportunity attacks, and your next attack deals extra 1d8 damage.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Stealth experts who rely on dual daggers and high mobility. They excel at finishing what others start, using lethal execution techniques.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Dual Wielding Proficiency', 'Stealth Mastery'], features: [
        { name: 'Instant Execution', description: 'Automatically crit against humanoids that are Prone, Grappled, or Incapacitated.' },
        { name: 'Smoke Bomb', description: 'As a bonus action, create a 10ft cloud of heavy smoke and teleport 15ft.' },
        { name: 'Twin Fang', description: 'When attacking with two daggers, your off-hand attack does not require a bonus action.' },
        { name: 'Poisoner\'s Kit', description: 'Apply paralytic poison to your blades, forcing a CON save or target loses their reaction.' },
        { name: 'Master Infiltrator', description: 'You can walk through walls thinner than 1 foot as if they were difficult terrain.' }
      ], initialSpells: [], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Pure destructive casters in robes who master the staff. They can burn through their own vitality to keep the mana flowing.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Staff Focus', 'Elemental Destruction'], features: [
        { name: 'Spell Memory', description: 'Choose one L1 spell. It no longer costs a spell slot to cast.' },
        { name: 'Grand Cataclysm', description: 'Once per long rest, your next destructive spell deals double damage.' },
        { name: 'Mana Flow', description: 'As a bonus action, sacrifice 10 HP to regain one L1 spell slot.' },
        { name: 'Robed Alacrity', description: 'While wearing no armor, add your INT modifier to your AC.' },
        { name: 'Overcharge', description: 'Increase the range of your spells by 30ft and ignore half cover.' }
      ], initialSpells: [
        { name: 'Magic Missile', level: 1, school: 'Evocation', description: '3 darts of energy hit automatically for 1d4+1 each.' },
        { name: 'Burning Hands', level: 1, school: 'Evocation', description: '15ft cone of fire for 3d6 damage (DEX save).' },
        { name: 'Shield of Aether', level: 1, school: 'Abjuration', description: '+5 to AC as a reaction to an attack.' },
        { name: 'Scorching Ray', level: 2, school: 'Evocation', description: 'Fire 3 rays for 2d6 damage each.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', description: 'Create 3 copies of yourself to misdirect attacks.' },
        { name: 'Misty Step', level: 2, school: 'Conjuration', description: 'Teleport 30ft to an unoccupied space you can see.' },
        { name: 'Fireball', level: 3, school: 'Evocation', description: '8d6 fire damage in a 20ft radius.' },
        { name: 'Haste', level: 3, school: 'Transmutation', description: 'Grant an ally an extra action and +2 AC.' },
        { name: 'Counterspell', level: 3, school: 'Abjuration', description: 'Interrupt and cancel an enemy spell cast.' }
      ], authorId: 'system', authorName: 'Orestara'
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Versatile support casters merged with ancient priestly arts. They amplify their party\'s resonance to heal and buff the entire group simultaneously.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Healing Mastery', 'Resonant Casting'], features: [
        { name: 'Group Resonance', description: 'Single-target buff spells now affect all allies within 30ft.' },
        { name: 'Celestial Mending', description: 'A massive burst of L3 healing energy (4d8) split among the party.' },
        { name: 'Aetheric Shield', description: 'Grant the party 15 temporary HP for 1 hour.' },
        { name: 'Prayer of Alacrity', description: 'Grant all allies an immediate reaction if they haven\'t used one.' },
        { name: 'Divine Mandate', description: 'Force an enemy to reroll a successful saving throw.' }
      ], initialSpells: [
        { name: 'Healing Word', level: 1, school: 'Abjuration', description: '1d4+WIS bonus healing as a bonus action.' },
        { name: 'Bless', level: 1, school: 'Enchantment', description: '3 allies gain +1d4 to attack and saves.' },
        { name: 'Sanctuary', level: 1, school: 'Abjuration', description: 'Enemies must pass a WIS save to attack the warded target.' },
        { name: 'Lesser Restoration', level: 2, school: 'Abjuration', description: 'Cure Blind, Deaf, Paralyzed, or Poisoned.' },
        { name: 'Spiritual Weapon', level: 2, school: 'Conjuration', description: 'Summon a floating weapon to attack as a bonus action.' },
        { name: 'Hold Person', level: 2, school: 'Enchantment', description: 'Paralyze a humanoid target (WIS save).' },
        { name: 'Beacon of Hope', level: 3, school: 'Abjuration', description: 'Allies within 30ft receive max healing from spells.' },
        { name: 'Revivify', level: 3, school: 'Necromancy', description: 'Return a soul to its body (if dead for <1 min).' },
        { name: 'Spirit Guardians', level: 3, school: 'Conjuration', description: 'Spirits swirl around you, dealing 3d8 damage to nearby enemies.' }
      ], authorId: 'system', authorName: 'Orestara'
    }
  ],
  monsters: [
    // Goblinoids
    { id: 'mon-goblin-scout', name: 'Goblin Scavenger', description: 'A small, wiry goblin in mismatched leather scraps.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Disengage or Hide as a bonus action.' }], authorId: 'system' },
    { id: 'mon-bugbear-thug', name: 'Bugbear Brawler', description: 'A massive, hairy goblinoid with long limbs and a heavy morningstar.', stats: { strength: 16, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 10, charisma: 8 }, hp: 35, ac: 15, abilities: [{ name: 'Surprise Attack', effect: 'Deals 2d6 extra damage if it hits a surprised target.' }], authorId: 'system' },
    { id: 'mon-hobgoblin-tactician', name: 'Hobgoblin Warlord', description: 'A disciplined soldier in red plate armor, directing his troops.', stats: { strength: 14, dexterity: 12, constitution: 14, intelligence: 14, wisdom: 12, charisma: 12 }, hp: 50, ac: 18, abilities: [{ name: 'Martial Advantage', effect: 'Deals 2d6 extra damage if an ally is within 5ft of the target.' }], authorId: 'system' },
    { id: 'mon-goblin-shaman', name: 'Goblin Curse-Weaver', description: 'A hunched goblin clutching a staff of skulls.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 14, wisdom: 14, charisma: 10 }, hp: 28, ac: 13, abilities: [{ name: 'Hex', effect: 'Target has disadvantage on one ability check type.' }], authorId: 'system' },
    // Beasts
    { id: 'mon-gloom-wolf', name: 'Gloom Wolf', description: 'A wolf with fur like shifting shadows and eyes of pale moonlight.', stats: { strength: 12, dexterity: 15, constitution: 12, intelligence: 3, wisdom: 12, charisma: 6 }, hp: 20, ac: 13, abilities: [{ name: 'Pack Tactics', effect: 'Advantage on attacks if an ally is within 5ft of target.' }], authorId: 'system' },
    { id: 'mon-moss-bear', name: 'Moss-Covered Bear', description: 'A grizzly bear whose fur has become a host for ancient, magic-saturated moss.', stats: { strength: 18, dexterity: 10, constitution: 16, intelligence: 2, wisdom: 12, charisma: 5 }, hp: 45, ac: 12, abilities: [{ name: 'Spore Cloud', effect: 'Reaction: When hit, release spores that Poison nearby enemies.' }], authorId: 'system' },
    { id: 'mon-giant-spider', name: 'Shadow Web Spider', description: 'A spindly horror that blends into the obsidian ceilings.', stats: { strength: 14, dexterity: 16, constitution: 12, intelligence: 2, wisdom: 10, charisma: 4 }, hp: 26, ac: 14, abilities: [{ name: 'Web Toss', effect: 'Ranged attack to Restrain a target (DEX save).' }], authorId: 'system' },
    { id: 'mon-fog-hydra', name: 'Young Fog Hydra', description: 'A three-headed serpent that breathes freezing mist.', stats: { strength: 18, dexterity: 12, constitution: 16, intelligence: 4, wisdom: 12, charisma: 7 }, hp: 85, ac: 14, abilities: [{ name: 'Multiple Heads', effect: 'Gains extra reactions and advantage against being blinded.' }], authorId: 'system' },
    // Undead
    { id: 'mon-risen-guard', name: 'Risen Guild Guard', description: 'A skeletal remains of a guild warrior, still clutching its rusted shield.', stats: { strength: 14, dexterity: 10, constitution: 14, intelligence: 6, wisdom: 8, charisma: 5 }, hp: 22, ac: 16, abilities: [{ name: 'Undead Fortitude', effect: 'When reduced to 0 HP, roll CON save (DC 5 + damage) to drop to 1 HP instead.' }], authorId: 'system' },
    { id: 'mon-wraith-shade', name: 'Spectral Shade', description: 'A flickering remnant of a soul, cold enough to freeze blood.', stats: { strength: 6, dexterity: 16, constitution: 10, intelligence: 10, wisdom: 10, charisma: 12 }, hp: 30, ac: 12, abilities: [{ name: 'Life Drain', effect: 'Target loses 1d6 Max HP on hit until long rest.' }], authorId: 'system' },
    { id: 'mon-lich-apprentice', name: 'Necrotic Acolyte', description: 'A hooded figure with withered skin, channeling green flames.', stats: { strength: 8, dexterity: 12, constitution: 12, intelligence: 16, wisdom: 14, charisma: 12 }, hp: 40, ac: 13, abilities: [{ name: 'Raise Dead', effect: 'Reanimates one fallen humanoid as a skeleton.' }], authorId: 'system' },
    { id: 'mon-bone-golem', name: 'Bone Construct', description: 'A mountain of fused skeletal remains.', stats: { strength: 20, dexterity: 9, constitution: 20, intelligence: 3, wisdom: 10, charisma: 1 }, hp: 110, ac: 17, abilities: [{ name: 'Aversion to Fire', effect: 'If takes fire damage, has disadvantage on attacks until next turn.' }], authorId: 'system' },
    // Humanoids
    { id: 'mon-bandit-cutthroat', name: 'Bandit Cutthroat', description: 'A desperate human rogue with a notched blade.', stats: { strength: 10, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 10, charisma: 8 }, hp: 15, ac: 12, abilities: [{ name: 'Sneak Attack', effect: 'Extra 1d6 damage if it has advantage.' }], authorId: 'system' },
    { id: 'mon-cultist-zealot', name: 'Gore-Chosen Zealot', description: 'A fanatical worshiper of the Gorechimera, scarred and fearless.', stats: { strength: 14, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 8, charisma: 14 }, hp: 25, ac: 13, abilities: [{ name: 'Fanaticism', effect: 'Advantage on saves against Fear and Charm.' }], authorId: 'system' },
    { id: 'mon-fallen-knight', name: 'Fallen Knight', description: 'A once-noble warrior who has traded honor for dark survival.', stats: { strength: 16, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 }, hp: 45, ac: 17, abilities: [{ name: 'Parry', effect: 'Reaction: Add +2 AC against one melee attack.' }], authorId: 'system' },
    { id: 'mon-guild-inquisitor', name: 'Shadow Inquisitor', description: 'A grim enforcer of the old laws, hunting for dissenters.', stats: { strength: 14, dexterity: 14, constitution: 14, intelligence: 14, wisdom: 16, charisma: 14 }, hp: 55, ac: 15, abilities: [{ name: 'Judgment', effect: 'Forces target to tell the truth or suffer 2d6 psychic damage.' }], authorId: 'system' },
    // Draconians
    { id: 'mon-kobold-slinger', name: 'Kobold Slinger', description: 'A small reptilian creature with a bag of alchemical pots.', stats: { strength: 7, dexterity: 15, constitution: 9, intelligence: 8, wisdom: 7, charisma: 8 }, hp: 8, ac: 12, abilities: [{ name: 'Grovel & Cower', effect: 'Allies have advantage on enemies within 10ft of the kobold.' }], authorId: 'system' },
    { id: 'mon-guard-drake', name: 'Iron-Scale Guard Drake', description: 'A wingless dragonoid with thick, metallic scales.', stats: { strength: 16, dexterity: 12, constitution: 16, intelligence: 4, wisdom: 10, charisma: 7 }, hp: 52, ac: 16, abilities: [{ name: 'Snap Jaw', effect: 'Bonus action: Make a bite attack after a claw hit.' }], authorId: 'system' },
    { id: 'mon-wyvern-hatchling', name: 'Cliff Wyvern', description: 'A flying dragon with a venomous stinger on its tail.', stats: { strength: 16, dexterity: 14, constitution: 14, intelligence: 5, wisdom: 12, charisma: 6 }, hp: 60, ac: 14, abilities: [{ name: 'Tail Stinger', effect: '3d6 poison damage and target is Poisoned.' }], authorId: 'system' },
    { id: 'mon-dragonkin-soldier', name: 'Draconic Vanguard', description: 'A scaled humanoid in brass armor, breathing sparks.', stats: { strength: 18, dexterity: 12, constitution: 16, intelligence: 10, wisdom: 10, charisma: 12 }, hp: 68, ac: 18, abilities: [{ name: 'Spark Breath', effect: '15ft cone of lightning for 4d6 damage (DEX save).' }], authorId: 'system' },
    // Bosses
    {
      id: 'sys-gorechimera', name: 'The Gorechimera', description: 'A terrifying fusion of Lion, Goat, and Serpent guarding the ruins of the Grey Marches.', stats: { strength: 22, dexterity: 12, constitution: 20, intelligence: 14, wisdom: 14, charisma: 12 }, hp: 220, ac: 19, isBoss: true, abilities: [{ name: 'Lion\'s Roar', effect: 'AOE Fear effect; DC 16 WIS save or be Frightened for 1 minute.' }, { name: 'Serpent Lash', effect: 'Poisonous tail strike dealing 4d6 poison damage on hit.' }, { name: 'Goat\'s Gaze', effect: 'Petrifying glare; DC 14 CON save or begin turning to stone.' }], legendaryActions: [{ name: 'Multiattack', effect: 'Makes three attacks: one Bite, one Claw, and one Horn strike.' }], authorId: 'system'
    }
  ],
  items: [
    { id: 'itm-dk-claymore', name: 'Order Claymore', type: 'Weapon' as const, description: 'A massive two-handed blade.', mechanics: [{ name: 'Aetheric Link', description: 'Lifesteal 3 HP on every hit.' }], lore: 'The standard blade of the Dark Knight Order.', authorId: 'system' },
    { id: 'itm-arch-bow', name: 'Eagle-Sight Bow', type: 'Weapon' as const, description: 'A bow made of enchanted yew.', mechanics: [{ name: 'True Flight', description: 'Ignore penalties from long range.' }], lore: 'Standard for high-tier Archers.', authorId: 'system' },
    { id: 'itm-thief-daggers', name: 'Shadow-Twin Daggers', type: 'Weapon' as const, description: 'Matched dual daggers.', mechanics: [{ name: 'Vanish', description: '+5 to Stealth while held.' }], lore: 'Used by master Thieves.', authorId: 'system' },
    { id: 'itm-sorc-staff', name: 'Staff of Flux', type: 'Weapon' as const, description: 'A long staff carved from obsidian.', mechanics: [{ name: 'Arcane Resistor', description: 'Regain 1 MP when an enemy misses a spell attack.' }], lore: 'The tool of a Sorcerer.', authorId: 'system' },
    { id: 'itm-mage-staff', name: 'Resonant Staff', type: 'Weapon' as const, description: 'A small staff of light-wood.', mechanics: [{ name: 'Healer\'s Pulse', description: 'Healing spells restore an extra 1d6 HP.' }], lore: 'Standard issue for Mages.', authorId: 'system' }
  ],
  heroes: [
    { 
      id: 'hero-miri', name: 'Miri', classId: 'cls-dark-knight', race: 'Human' as const, gender: 'Female' as const, gold: 150, 
      description: "An energetic human swordswoman in heavy black plate. She wears a wide, confident grin and carries a massive two-handed claymore.", 
      level: 5, stats: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 12, charisma: 14 }, hp: 60, maxHp: 60, 
      feats: [{ name: 'Brave Heart', description: 'Advantage on saves against fear.' }], inventory: ['itm-dk-claymore'], isPlayer: false, authorId: 'system', isSpectral: true 
    },
    { 
      id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human' as const, gender: 'Female' as const, gold: 180, 
      description: "A timid human mage clutching a crystal holy symbol. Her white robes are slightly oversized, and her magic glows with a soft, warm amber light.", 
      level: 5, stats: { strength: 8, dexterity: 14, constitution: 14, intelligence: 14, wisdom: 18, charisma: 16 }, hp: 42, maxHp: 42, 
      feats: [{ name: 'Saintly Aura', description: 'Allies within 10ft gain +2 to death saves.' }], inventory: ['itm-mage-staff'], isPlayer: false, authorId: 'system', isSpectral: true 
    },
    { 
      id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf' as const, gender: 'Female' as const, gold: 120, 
      description: "An aloof elf archer with piercing silver eyes and long silver hair. She speaks rarely, letting her arrows do the talking.", 
      level: 5, stats: { strength: 10, dexterity: 20, constitution: 14, intelligence: 12, wisdom: 16, charisma: 10 }, hp: 48, maxHp: 48, 
      feats: [{ name: 'Elven Accuracy', description: 'Reroll one ranged attack die per turn if you have advantage.' }], inventory: ['itm-arch-bow'], isPlayer: false, authorId: 'system', isSpectral: true 
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
      // DESTRUCTIVE MIGRATION: 
      // Overwrite existing data for more up to date versions as requested.
      const accountsRaw = localStorage.getItem('mythos_accounts');
      if (accountsRaw) {
        try {
          const accounts: UserAccount[] = JSON.parse(accountsRaw);
          accounts.forEach(acc => {
             const uPrefix = acc.username;
             // Clear all user-specific data to force a fresh reload of MONTHLY_CONTENT
             localStorage.removeItem(`${uPrefix}_mythos_chars`);
             localStorage.removeItem(`${uPrefix}_mythos_classes`);
             localStorage.removeItem(`${uPrefix}_mythos_monsters`);
             localStorage.removeItem(`${uPrefix}_mythos_items`);
             localStorage.removeItem(`${uPrefix}_mythos_campaign`);
          });
          const migratedAccounts = accounts.map(acc => ({
            ...acc,
            version: REGISTRY_VERSION,
            registryEra: 'Eternal'
          }));
          localStorage.setItem('mythos_accounts', JSON.stringify(migratedAccounts));
        } catch (e) {
          console.error("Account destructive migration failed", e);
        }
      }
      
      localStorage.removeItem('mythos_active_session');
      localStorage.setItem('mythos_registry_version', REGISTRY_VERSION.toString());
      return null; // Force re-login to ensure clean state
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
    notify("Manifesting Latest Chronicle...", "info");
    setClasses(MONTHLY_CONTENT.classes);
    setMonsters(MONTHLY_CONTENT.monsters);
    setItems(MONTHLY_CONTENT.items as Item[]);
    setCharacters(MONTHLY_CONTENT.heroes);
    
    const firstLog: GameLog = {
      role: 'dm',
      content: "The Adventurers Guild of Orestara is alive with the clink of mugs. You sit at a stained oak table. Suddenly, three figures approach. Miri, a dark-armored warrior with a massive sword, grins. 'Hey! You look capable. We've got a lead on the Gorechimera contract in the Grey Marches ruins, but it requires a quartet of heroes. Lina—our timid mage—and Seris here are in, but we need one more. You game?'",
      timestamp: Date.now()
    };
    const plot = "Quest for the Grey Marches: Slay the legendary Gorechimera guarding the obsidian ruins. Level 5 recommended.";
    const rules = await generateRules(plot);
    setCampaign({ plot, summary: "Met Miri, Lina, and Seris at the Guild. Level 5 party formed for the Gorechimera quest.", logs: [firstLog], party: [], rules, locationName: "Adventurers Guild" });
    notify("Chronicle Synchronized to v13. Welcome to the Grey Marches.", "success");
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
