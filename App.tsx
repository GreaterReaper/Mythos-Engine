
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character, ClassDef, Monster, Item, CampaignState, SyncMessage, GameLog, UserAccount, Graveyard } from './types';
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

const REGISTRY_VERSION = 21; 

const MONTHLY_CONTENT = {
  version: "March-2025-v21-Tactical-Gear",
  classes: [
    {
      id: 'cls-archer', name: 'Archer', description: 'Masters of the bow, they can shoot flying enemies out of the air with great accuracy. They pick a single enemy that is exposed to deal extra damage against. They wear leather armor to stay well protected, and light on their feet. They have special arrows capable of many things.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Wisdom'], bonuses: ['Leather Armor', 'Bows', 'Fletching'], features: [
        { name: 'Sky Shot', description: 'Shoot flying enemies with perfect accuracy, ignoring range penalties.' },
        { name: 'Exposed Weakness', description: 'Target an exposed enemy to deal an additional 1d8 damage.' },
        { name: 'Lightfoot', description: 'AC bonus (+2) while moving at least 20ft in light armor.' },
        { name: 'Special Arrows', description: 'Craft arrows with Fire (AOE), Ice (Slow), or Force (Knockback) effects.' },
        { name: 'Rapid Fire', description: 'Fire twice as a single action, but with -2 to each attack roll.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-arch-bow', 'itm-leather-armor']
    },
    {
      id: 'cls-thief', name: 'Thief', description: 'Masters of stealth who wear leather armors and use dual daggers. They can instantly execute human-sized enemies or smaller that have been grappled by an ally. In a pinch they can throw down a smoke bomb to slip sway quietly to pick off weaker targets.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [0, 0, 0], preferredStats: ['Dexterity', 'Intelligence'], bonuses: ['Leather Armor', 'Daggers', 'Stealth'], features: [
        { name: 'Dual Wielding', description: 'Attack with both daggers as one action, applying full Dex to both.' },
        { name: 'Instant Execution', description: 'Instantly slay a human-sized or smaller enemy grappled by an ally.' },
        { name: 'Smoke Bomb', description: 'Create a cloud of smoke for instant invisibility and a 15ft reposition.' },
        { name: 'Silent Footsteps', description: 'No penalty to stealth while running; advantage on ambush checks.' },
        { name: 'Poison Mastery', description: 'Apply lingering neurotoxin to daggers, dealing 1d4 periodic damage.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-thief-daggers', 'itm-leather-armor']
    },
    {
      id: 'cls-sorcerer', name: 'Sorcerer', description: 'Masters of magic wielding long staves and robed attire. They excel at destructive magic and can commit a single spell to memory making it free to cast instantly.', hitDie: 'd6', startingHp: 6, hpPerLevel: 4, spellSlots: [4, 3, 2], preferredStats: ['Intelligence', 'Constitution'], bonuses: ['Robes', 'Staves', 'Arcana'], features: [
        { name: 'Destructive Magic', description: 'Damaging spells deal an additional die of damage once per turn.' },
        { name: 'Spell Memory', description: 'Commit one spell to memory; it becomes free to cast once per day.' },
        { name: 'Arcane Surge', description: 'Boost spell DC by 2 for one turn by sacrificing 5 temporary HP.' },
        { name: 'Flowing Robes', description: 'Passive 13 AC + Dex modifier while wearing only robes.' },
        { name: 'Elemental Focus', description: 'Ignore resistances to your chosen element (Fire/Ice/Storm).' }
      ], initialSpells: [
        { name: 'Flare', level: 3, school: 'Evocation', description: '10d6 fire damage in a 20ft radius.' },
        { name: 'Mana Burst', level: 1, school: 'Evocation', description: '2d8 force damage in a 15ft cone.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', description: 'Create 3 duplicates to confuse attackers.' },
        { name: 'Chain Lightning', level: 3, school: 'Evocation', description: 'Arc electricity between 3 targets for 8d6 damage.' },
        { name: 'Arcane Shield', level: 1, school: 'Abjuration', description: 'Reaction: +5 AC until start of next turn.' }
      ], authorId: 'system', startingItemIds: ['itm-sorc-staff', 'itm-robed-attire']
    },
    {
      id: 'cls-mage', name: 'Mage', description: 'Supportive spellcasters focused on healing and resonant buffs that target all nearby allies. They wear robes and use smaller staves.', hitDie: 'd8', startingHp: 8, hpPerLevel: 5, spellSlots: [4, 3, 2], preferredStats: ['Wisdom', 'Charisma'], bonuses: ['Robes', 'Small Staves', 'Healing'], features: [
        { name: 'Resonant Buffs', description: 'Single-target buffs spread to all allies within 15ft.' },
        { name: 'Divine Healing', description: 'Healing spells restore max health to targets below 25% HP.' },
        { name: 'Protective Aura', description: 'Allies within 10ft gain +1 bonus to all Saving Throws.' },
        { name: 'Staff Focus', description: 'Gain Wisdom modifier bonus to all healing done.' },
        { name: 'Beacon of Hope', description: 'Grant one ally advantage on all rolls for 2 rounds.' }
      ], initialSpells: [
        { name: 'Mass Regen', level: 3, school: 'Conjuration', description: 'Heal all allies for 1d8 every turn for 3 turns.' },
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield an ally from 10 points of damage.' },
        { name: 'Benediction', level: 3, school: 'Evocation', description: 'Target recovers all health instantly (1/day).' },
        { name: 'Bless', level: 1, school: 'Enchantment', description: '+1d4 to attack and saves for 3 allies.' },
        { name: 'Spirit Link', level: 2, school: 'Divination', description: 'Share half of damage taken between two allies.' }
      ], authorId: 'system', startingItemIds: ['itm-mage-staff', 'itm-robed-attire']
    },
    {
      id: 'cls-warrior', name: 'Warrior', description: 'Warriors wield mighty two-handed swords and hammers. They invigorate themselves and allies with a mighty roar. They wear imposing full plate and have high resistance to being knocked prone.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Armor', '2H Weapons', 'Athletics'], features: [
        { name: 'Invigorating Roar', description: 'Grant yourself and allies +10 Temporary HP and Fear immunity.' },
        { name: 'Unstoppable Force', description: 'Immunity to being knocked prone or pushed by Large or smaller foes.' },
        { name: 'Heavy Blows', description: 'Melee hits knock Medium or smaller targets prone (DC 15 Str save).' },
        { name: 'Charged Attack', description: 'Charge 1 turn; triple damage next hit. Targeted more while charging.' },
        { name: 'Warrior Spirit', description: 'Heal 1d10 HP whenever you kill a worthy foe.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-war-greatsword', 'itm-full-plate']
    },
    {
      id: 'cls-fighter', name: 'Fighter', description: 'Champion of the frontline, taking the brunt of the damage with their shield held firm. They wield one handed swords and maces paired with a shield. They wear full or half plate and get bonus armor from the shield.', hitDie: 'd10', startingHp: 10, hpPerLevel: 6, spellSlots: [0, 0, 0], preferredStats: ['Strength', 'Dexterity'], bonuses: ['Plate Armor', 'Shields', 'Swords'], features: [
        { name: 'Shield Wall', description: 'Passive +2 AC bonus to yourself and any adjacent ally.' },
        { name: 'Shield Bash', description: 'Bash for 1d6+Str damage and cause "Flinch" (lose reaction).' },
        { name: 'Frontline Guardian', description: 'Intercept an attack meant for an ally within 5ft once per round.' },
        { name: 'Steel Resolve', description: 'Ignore effects of one status condition for 1 minute (1/day).' },
        { name: 'Master Duelist', description: 'Gain +2 to hit while no other allies are within 5ft of your target.' }
      ], initialSpells: [], authorId: 'system', startingItemIds: ['itm-fig-sword', 'itm-fig-shield', 'itm-half-plate']
    },
    {
      id: 'cls-dark-knight', name: 'Dark Knight', description: 'Knights who prefer heavy two-handed swords, igniting inner aether with raw emotions to fuel dark magic and barriers. They can become Living Dead to survive fatal blows.', hitDie: 'd12', startingHp: 12, hpPerLevel: 7, spellSlots: [4, 2, 0], preferredStats: ['Strength', 'Constitution'], bonuses: ['Heavy Plate', '2H Swords', 'Dark Arcanum'], features: [
        { name: 'Living Dead', description: 'Survive fatal damage at 1 HP. Receive healing = Max HP or die (DC 15 save).' },
        { name: 'Living Shadow', description: 'Summon a shadowy twin for 2 rounds that repeats your damaging actions.' },
        { name: 'Unstoppable Momentum', description: 'Move 10ft for free after every successful melee hit.' },
        { name: 'Dark Arts Mastery', description: 'Sacrifice 5 HP to guarantee your next melee hit deals maximum damage.' },
        { name: 'Blackest Barrier', description: 'Grant an ally a barrier that absorbs 20 damage and heals the knight.' }
      ], initialSpells: [
        { name: 'Abyssal Drain', level: 1, school: 'Necromancy', description: 'Drain 1d8 HP from all enemies within 5ft.' },
        { name: 'Edge of Shadow', level: 2, school: 'Evocation', description: '30ft line of necrotic energy dealing 4d6 damage.' },
        { name: 'The Blackest Night', level: 3, school: 'Abjuration', description: 'Shield = 25% Max HP. Grant Dark Arts if broken.' },
        { name: 'Soul Tether', level: 1, school: 'Necromancy', description: 'Link to an enemy; they take 2 necrotic damage when you do.' },
        { name: 'Dark Passenger', level: 2, school: 'Evocation', description: 'Wave of darkness blinds all targets in a 15ft cone.' }
      ], authorId: 'system', startingItemIds: ['itm-dk-greatsword', 'itm-dk-plate']
    }
  ],
  monsters: [
    { id: 'mon-goblin-scout', name: 'Goblin Scavenger', description: 'A wiry scout with a rusted blade.', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, hp: 12, ac: 13, abilities: [{ name: 'Nimble Escape', effect: 'Disengage/Hide as bonus action.' }], authorId: 'system', size: 'Small' as const },
    { id: 'mon-skeleton', name: 'Crypt Skeleton', description: 'Rattling bones in ancient armor.', stats: { strength: 10, dexterity: 14, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 }, hp: 13, ac: 13, abilities: [{ name: 'Undead Resolve', effect: 'Resistant to piercing.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-spectral-horror', name: 'Spectral Horror', description: 'A flickering entity of pure dread.', stats: { strength: 1, dexterity: 16, constitution: 10, intelligence: 10, wisdom: 10, charisma: 14 }, hp: 30, ac: 11, abilities: [{ name: 'Ethereal Jaunt', effect: 'Pass through objects/players.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-orc-ravager', name: 'Orc Ravager', description: 'A scarred warrior fueled by bloodlust.', stats: { strength: 16, dexterity: 12, constitution: 16, intelligence: 7, wisdom: 11, charisma: 10 }, hp: 45, ac: 13, abilities: [{ name: 'Aggressive', effect: 'Move speed doubled toward enemies.' }], authorId: 'system', size: 'Medium' as const },
    { id: 'mon-stone-golem', name: 'Stone Golem', description: 'A massive automaton of solid granite.', stats: { strength: 22, dexterity: 9, constitution: 20, intelligence: 3, wisdom: 11, charisma: 1 }, hp: 178, ac: 17, abilities: [{ name: 'Immutable Form', effect: 'Immune to status changes.' }], authorId: 'system', size: 'Large' as const },
    { id: 'mon-fire-elemental', name: 'Living Inferno', description: 'A churning pillar of sentient flame.', stats: { strength: 10, dexterity: 17, constitution: 14, intelligence: 6, wisdom: 10, charisma: 7 }, hp: 102, ac: 13, abilities: [{ name: 'Fire Form', effect: 'Burn attackers within 5ft.' }], authorId: 'system', size: 'Large' as const },
    { id: 'mon-vanguard-drake', name: 'Vanguard Drake', description: 'A flightless draconian with scales like iron.', stats: { strength: 19, dexterity: 10, constitution: 19, intelligence: 5, wisdom: 10, charisma: 7 }, hp: 85, ac: 18, abilities: [{ name: 'Tail Sweep', effect: 'Knockback AOE.' }], authorId: 'system', size: 'Large' as const },
    { id: 'mon-eye-of-void', name: 'Eye of the Void', description: 'A floating ocular horror with many stalks.', stats: { strength: 10, dexterity: 14, constitution: 18, intelligence: 17, wisdom: 15, charisma: 17 }, hp: 180, ac: 18, isBoss: true, abilities: [{ name: 'Anti-Magic Cone', effect: 'Suppresses magic in a 60ft cone.' }], authorId: 'system', size: 'Large' as const },
    { id: 'mon-gorechimera', name: 'The Gorechimera', description: 'Legendary three-headed beast of the Marches.', stats: { strength: 24, dexterity: 12, constitution: 22, intelligence: 14, wisdom: 14, charisma: 12 }, hp: 250, ac: 19, isBoss: true, abilities: [{ name: 'Lions Roar', effect: 'AOE Fear (DC 16 Wis).' }, { name: 'Serpent Sting', effect: 'Poison DOT.' }], authorId: 'system', size: 'Huge' as const }
  ],
  items: [
    { id: 'itm-arch-bow', name: 'Weathered Yew Bow', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d8', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'A standard hunter\'s bow.', mechanics: [{ name: 'Steady Aim', description: '+1 to long range hit.' }], lore: 'Standard issue.', authorId: 'system' },
    { id: 'itm-leather-armor', name: 'Cured Hide', type: 'Armor' as const, rarity: 'Common' as const, ac: 11, classRestrictions: ['cls-archer', 'cls-thief'], description: 'Flexible leather protection.', mechanics: [{ name: 'Quiet', description: 'No penalty to stealth.' }], lore: 'Common gear.', authorId: 'system' },
    { id: 'itm-thief-daggers', name: 'Dull Daggers', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d4', damageType: 'Piercing', classRestrictions: ['cls-thief'], description: 'A pair of simple iron blades.', mechanics: [{ name: 'Twin Strike', description: '+1 dmg if both hit.' }], lore: 'Discarded by better thieves.', authorId: 'system' },
    { id: 'itm-sorc-staff', name: 'Oak Staff', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d6', damageType: 'Bludgeoning', classRestrictions: ['cls-sorcerer'], description: 'A simple wooden focus.', mechanics: [{ name: 'Spark', description: 'Ignore 1 resistance point.' }], lore: 'Student gear.', authorId: 'system' },
    { id: 'itm-mage-staff', name: 'Willow Wand', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d4', damageType: 'Bludgeoning', classRestrictions: ['cls-mage'], description: 'Supple wand for mending.', mechanics: [{ name: 'Mending', description: '+1 to small heals.' }], lore: 'Healing focus.', authorId: 'system' },
    { id: 'itm-war-greatsword', name: 'Iron Claymore', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '2d6', damageType: 'Slashing', classRestrictions: ['cls-warrior', 'cls-dark-knight'], description: 'Heavy and blunt.', mechanics: [{ name: 'Crushing', description: '+2 damage against shields.' }], lore: 'Recruit weapon.', authorId: 'system' },
    { id: 'itm-fig-sword', name: 'Shortsword', type: 'Weapon' as const, rarity: 'Common' as const, damageRoll: '1d6', damageType: 'Piercing', classRestrictions: ['cls-fighter'], description: 'Reliable steel.', mechanics: [{ name: 'Fast', description: '+1 initiative.' }], lore: 'Standard military.', authorId: 'system' },
    { id: 'itm-fig-shield', name: 'Round Shield', type: 'Armor' as const, rarity: 'Common' as const, ac: 2, classRestrictions: ['cls-fighter'], description: 'Reinforced wood.', mechanics: [{ name: 'Deflect', description: '+1 AC vs ranged.' }], lore: 'Basic defense.', authorId: 'system' },
    { id: 'itm-half-plate', name: 'Scrap Plate', type: 'Armor' as const, rarity: 'Common' as const, ac: 15, classRestrictions: ['cls-fighter', 'cls-warrior', 'cls-dark-knight'], description: 'Mismatched steel plates.', mechanics: [{ name: 'Heavy', description: '-5ft movement.' }], lore: 'Mercenary castoffs.', authorId: 'system' },
    { id: 'itm-robed-attire', name: 'Canvas Robes', type: 'Armor' as const, rarity: 'Common' as const, ac: 10, classRestrictions: ['cls-sorcerer', 'cls-mage'], description: 'Simple scholar attire.', mechanics: [{ name: 'Insulated', description: 'Cold resistance 1.' }], lore: 'Tavern wear.', authorId: 'system' },
    { id: 'itm-full-plate', name: 'Iron Husk', type: 'Armor' as const, rarity: 'Common' as const, ac: 18, classRestrictions: ['cls-warrior', 'cls-dark-knight', 'cls-fighter'], description: 'Complete but heavy.', mechanics: [{ name: 'Solid', description: 'Adv vs push.' }], lore: 'Vanguard starter.', authorId: 'system' },
    { id: 'itm-dk-greatsword', name: 'Hollow Greatsword', type: 'Weapon' as const, rarity: 'Uncommon' as const, damageRoll: '2d6', damageType: 'Necrotic', classRestrictions: ['cls-dark-knight'], description: 'A heavy blade that feels lighter than it looks.', mechanics: [{ name: 'Ether Flow', description: 'Deals 1 necrotic on hit.' }], lore: 'Standard Dark Knight issue.', authorId: 'system' },
    { id: 'itm-dk-plate', name: 'Lacquered Plate', type: 'Armor' as const, rarity: 'Uncommon' as const, ac: 18, classRestrictions: ['cls-dark-knight'], description: 'Blackened steel.', mechanics: [{ name: 'Gloom', description: 'Stealth checks in darkness +1.' }], lore: 'Order uniform.', authorId: 'system' },
    { id: 'itm-arch-bow-rare', name: 'Eagle-Sight Bow', type: 'Weapon' as const, rarity: 'Rare' as const, damageRoll: '1d10', damageType: 'Piercing', classRestrictions: ['cls-archer'], description: 'A precision-crafted yew bow.', mechanics: [{ name: 'Sky-Shot Accuracy', description: '+2 to attack rolls against flying targets.' }], lore: 'Standard issue for elven marksmen.', authorId: 'system' },
    { id: 'itm-thief-rare', name: 'Void Fang Daggers', type: 'Weapon' as const, rarity: 'Rare' as const, damageRoll: '1d6', damageType: 'Necrotic', classRestrictions: ['cls-thief'], description: 'Obsidian teeth.', mechanics: [{ name: 'Lethal Precision', description: '+2 to Sneak Attack.' }], lore: 'Silent as death.', authorId: 'system' },
    { id: 'itm-sorc-rare', name: 'Archon Staff', type: 'Weapon' as const, rarity: 'Rare' as const, damageRoll: '1d8', damageType: 'Force', classRestrictions: ['cls-sorcerer'], description: 'Crystal-tipped oak.', mechanics: [{ name: 'Mana Flow', description: '+1 Spell DC.' }], lore: 'Tower artifact.', authorId: 'system' },
    { id: 'itm-dk-epic', name: 'Fallen Star Claymore', type: 'Weapon' as const, rarity: 'Epic' as const, damageRoll: '2d8', damageType: 'Necrotic', classRestrictions: ['cls-dark-knight'], description: 'A black blade that hums with sorrow.', mechanics: [{ name: 'Vicious Strike', description: 'Crit on 19-20.' }], lore: 'Forged from meteorite.', authorId: 'system' },
    { id: 'itm-fig-epic', name: 'Great Aegis', type: 'Armor' as const, rarity: 'Epic' as const, ac: 4, classRestrictions: ['cls-fighter'], description: 'Massive steel shield.', mechanics: [{ name: 'Unbreakable', description: '+1 AC.' }], lore: 'Fortress guard.', authorId: 'system' },
    { id: 'itm-leg-eternity', name: 'Sunder of Eternity', type: 'Weapon' as const, rarity: 'Legendary' as const, damageRoll: '3d10', damageType: 'Force', classRestrictions: [], description: 'A blade that exists in two timelines.', mechanics: [{ name: 'Chronoshift', description: 'Attack twice on a crit.' }], lore: 'Wielded by the First Architect.', authorId: 'system' },
    { id: 'itm-leg-shadow', name: 'Shadow of the Order', type: 'Armor' as const, rarity: 'Legendary' as const, ac: 20, classRestrictions: ['cls-dark-knight', 'cls-warrior'], description: 'Living darkness that adheres to the soul.', mechanics: [{ name: 'Intangible', description: 'Can move through walls once per day.' }], lore: 'The Grandmaster\'s burial shroud.', authorId: 'system' }
  ],
  heroes: [
    { 
      id: 'hero-lina', name: 'Lina', classId: 'cls-mage', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "A timid human mage with a soft voice. She clutches her holy symbol tightly whenever she's nervous.", level: 1, stats: { strength: 8, dexterity: 12, constitution: 13, intelligence: 14, wisdom: 16, charisma: 14 }, hp: 10, maxHp: 10, 
      feats: [
        { name: 'Soothing Aura', description: 'Allies within 20 feet gain 1d4 temporary HP at the start of their turn.' },
        { name: 'Saintly Resolve', description: 'Gain advantage on Concentration checks to maintain spells.' },
        { name: 'Resonant Buffs', description: 'Single-target buffs automatically spread to all allies within 15ft.' },
        { name: 'Divine Healing', description: 'Healing spells restore max health to targets below 25% HP.' },
        { name: 'Protective Aura', description: 'Allies within 10ft gain +1 bonus to all Saving Throws.' }
      ], 
      knownSpells: [
        { name: 'Holy Veil', level: 1, school: 'Abjuration', description: 'Shield an ally from 10 points of damage.' },
        { name: 'Bless', level: 1, school: 'Enchantment', description: '+1d4 to attack and saves for 3 allies.' },
        { name: 'Regen', level: 2, school: 'Conjuration', description: 'Target heals 1d8 at the start of their next 3 turns.' }
      ],
      inventory: ['itm-mage-staff', 'itm-robed-attire'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-seris', name: 'Seris', classId: 'cls-archer', race: 'Elf' as const, gender: 'Female' as const, gold: 50, 
      description: "A stoic elf archer. Aloof and extremely logical, she speaks only when necessary for survival.", level: 1, stats: { strength: 10, dexterity: 18, constitution: 12, intelligence: 12, wisdom: 15, charisma: 8 }, hp: 11, maxHp: 11, 
      feats: [
        { name: 'Sky Shot', description: 'Shoot flying enemies with perfect accuracy, ignoring range penalties.' },
        { name: 'Exposed Weakness', description: 'Target an exposed enemy to deal an additional 1d8 damage.' },
        { name: 'Lightfoot', description: 'AC bonus (+2) while moving at least 20ft in light armor.' },
        { name: 'Special Arrows', description: 'Craft arrows with Fire (AOE), Ice (Slow), or Force (Knockback) effects.' },
        { name: 'Rapid Fire', description: 'Fire twice as a single action, but with -2 to each attack roll.' }
      ], 
      inventory: ['itm-arch-bow', 'itm-leather-armor'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    },
    { 
      id: 'hero-miri', name: 'Miri', classId: 'cls-fighter', race: 'Human' as const, gender: 'Female' as const, gold: 50, 
      description: "An energetic human fighter. She loves the thrill of the front line and emboldens the party with her bravery.", level: 1, stats: { strength: 16, dexterity: 14, constitution: 16, intelligence: 8, wisdom: 10, charisma: 12 }, hp: 12, maxHp: 12, 
      feats: [
        { name: 'Shield Wall', description: 'Passive +2 AC bonus to yourself and any adjacent ally.' },
        { name: 'Shield Bash', description: 'Bash for 1d6+Str damage and cause "Flinch" (lose reaction).' },
        { name: 'Frontline Guardian', description: 'Intercept an attack meant for an ally within 5ft once per round.' },
        { name: 'Steel Resolve', description: 'Ignore effects of one status condition for 1 minute (1/day).' },
        { name: 'Master Duelist', description: 'Gain +2 to hit while no other allies are within 5ft of your target.' }
      ], 
      inventory: ['itm-fig-sword', 'itm-fig-shield', 'itm-half-plate'], isPlayer: false, authorId: 'system', size: 'Medium' as const 
    }
  ],
  initialCampaign: {
    plot: "The Grey Marches have been swallowed by a spectral fog. Shadows move within, led by the Eye of the Void. A small band of heroes must unite to purge the darkness and find the Gorechimera's lair. The journey begins in the Rusty Tankard Tavern.",
    summary: "You are seated at a worn wooden table in the Rusty Tankard. Three women—Miri, Lina, and Seris—approach you. Miri, the energetic fighter, leans in: 'We heard you're looking for work. We're putting together a goblin hunting party. The fog's getting thicker, and someone's gotta thin the ranks. You in?'",
    locationName: "Rusty Tankard Tavern",
    rules: [
      { id: 'rule-1', category: 'Combat', name: 'Momentum', content: 'Moving at least 10ft before an attack grants +2 to the damage roll.' },
      { id: 'rule-2', category: 'Exploration', name: 'The Mist', content: 'Ranged attacks beyond 30ft have disadvantage unless the target is illuminated.' }
    ]
  }
};

// Fix: Added export keyword to component and completed return statement fragment
export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('characters');

  return (
    <div className="flex h-screen bg-[#050505] text-neutral-300 font-sans overflow-hidden">
      <p className="p-8 text-amber-500 font-black">Mythos Engine Loaded - Entry Point Active</p>
    </div>
  );
};

export default App;
