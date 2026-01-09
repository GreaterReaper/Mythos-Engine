
import { Race, Archetype, Stats, Ability, Character, Monster, Item, Role, Currency } from './types';

export const STORAGE_PREFIX = 'mythos_soul_';

export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

export const SYNERGY_MAP: Record<string, { bestMatches: string[]; reason: string }> = {
  [Archetype.DarkKnight]: {
    bestMatches: [Archetype.Mage, Archetype.BloodArtist, Archetype.Archer],
    reason: "The Dark Knight sacrifices vitality for power; the Mage mends the self-inflicted wounds, while the Blood Artist feeds on the chaos."
  },
  [Archetype.Warrior]: {
    bestMatches: [Archetype.Sorcerer, Archetype.Alchemist, Archetype.Thief],
    reason: "A pure juggernaut requires high-impact magical support and tactical reagents to stay on the front line."
  },
  [Archetype.Fighter]: {
    bestMatches: [Archetype.Mage, Archetype.Archer, Archetype.Sorcerer],
    reason: "The Fighter's unyielding defense allows glass cannons to manifest their full lethality from safety."
  },
  [Archetype.Thief]: {
    bestMatches: [Archetype.Warrior, Archetype.DarkKnight, Archetype.Alchemist],
    reason: "Thieves thrive when a heavy Tank draws the eye. The Alchemist provides the smoke required for an escape."
  },
  [Archetype.Archer]: {
    bestMatches: [Archetype.Fighter, Archetype.Mage, Archetype.Thief],
    reason: "Archers require a frontline bulwark. The Mage's buffs ensure arrows find their mark in the dark."
  },
  [Archetype.Sorcerer]: {
    bestMatches: [Archetype.Fighter, Archetype.Warrior, Archetype.Mage],
    reason: "Raw destructive output requires absolute protection. Two tanks are essential for a Sorcerer's survival."
  },
  [Archetype.Mage]: {
    bestMatches: [Archetype.DarkKnight, Archetype.Warrior, Archetype.BloodArtist],
    reason: "The Mage is the heart of the party, pairing best with high-HP vessels who can shield them from harm."
  },
  [Archetype.Alchemist]: {
    bestMatches: [Archetype.Thief, Archetype.Archer, Archetype.Fighter],
    reason: "The Alchemist enables tactical play for precision strikers capitalizing on debuffed foes."
  },
  [Archetype.BloodArtist]: {
    bestMatches: [Archetype.DarkKnight, Archetype.Warrior, Archetype.Sorcerer],
    reason: "Blood Artists turn carnage into fuel, excelling alongside those who dwell on the edge of death."
  }
};

export const RECOMMENDED_STATS: Record<string, (keyof Stats)[]> = {
  [Archetype.Archer]: ['dex'],
  [Archetype.Thief]: ['dex'],
  [Archetype.Warrior]: ['str'],
  [Archetype.Fighter]: ['str'],
  [Archetype.DarkKnight]: ['str', 'cha'],
  [Archetype.Mage]: ['wis'],
  [Archetype.Sorcerer]: ['int'],
  [Archetype.Alchemist]: ['int', 'dex'],
  [Archetype.BloodArtist]: ['con', 'cha']
};

export const RACIAL_BONUSES: Record<Race, Partial<Stats>> = {
  [Race.Human]: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
  [Race.Elf]: { dex: 2, int: 1 },
  [Race.Vesperian]: { cha: 2, dex: 1 },
  [Race.Dwarf]: { con: 2, str: 1 },
  [Race.Orc]: { str: 2, con: 1 },
  [Race.Tiefling]: { cha: 2, int: 1 },
  [Race.Dragonborn]: { str: 2, cha: 1 },
  [Race.Gnome]: { int: 2 },
  [Race.Halfling]: { dex: 2 },
  [Race.Leonin]: { con: 2, str: 1 },
  [Race.Tabaxi]: { dex: 2, cha: 1 },
  [Race.Firbolg]: { wis: 2, str: 1 },
  [Race.Goliath]: { str: 2, con: 1 },
  [Race.Aasimar]: { cha: 2, wis: 1 },
  [Race.Shifter]: { dex: 2, con: 1 }
};

export const STATUS_EFFECT_GUIDE = {
  Poisoned: "Thy system is compromised. Disadvantage on attacks and checks.",
  Blinded: "Sight is lost. Attackers gain advantage.",
  Stunned: "The mind reels. Inactive. Cannot move.",
  Frightened: "Terror grips the heart. Disadvantage while the source is visible.",
  Paralyzed: "Limbs are unresponsive. Attacks within 5ft are critical strikes.",
  Charmed: "Thy will is influenced. Cannot harm the charmer.",
  Bleeding: "Vitality drains from open wounds. Persistent damage each turn.",
  Exhausted: "The body fails. Slower movement and weakness in checks."
};

export const SPELL_SLOT_PROGRESSION: Record<number, Record<number, number>> = {
  1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 }, 4: { 1: 4, 2: 3 }, 5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 }, 7: { 1: 4, 2: 3, 3: 3, 4: 1 }, 8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, 10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, 12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, 14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, 16: { 1: 4, 2: 3, 3: 4, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, 18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, 20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

export const SPELL_LIBRARY: Record<string, Ability[]> = {
  [Archetype.Sorcerer]: [
    { name: 'Chaos Bolt', description: 'Fire a bolt of unpredictable energy.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Shield of Aether', description: 'A barrier of shimmering force (+5 AC).', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Magic Missile', description: 'Three darts of aether strike unerringly.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Aetheric Surge', description: 'A blast of pure force pushes enemies back.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Mirror Image', description: 'Create three illusory duplicates of thyself.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Fireball', description: 'A massive explosion of heat.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Haste', description: 'Accelerate the timeline of an ally (+Action, +AC).', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Dimension Door', description: 'Teleport up to 500ft to a visible spot.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Lightning Chain', description: 'Shocks leap from the primary to 3 others.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Disintegrate', description: 'Turn a creature or object to fine dust.', type: 'Spell', levelReq: 13, baseLevel: 7 },
    { name: 'Meteor Swarm', description: 'Blazing orbs of fire crash from the sky.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.Mage]: [
    { name: 'Cure Wounds', description: 'Seal wounds and restore vitality.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Bless', description: 'Fortify spirits (Add 1d4 to attack/saves).', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Guiding Bolt', description: 'Radiant bolt grants advantage on next hit.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Lesser Restoration', description: 'Cleanse Poisoned, Blinded, or Bleeding.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Spiritual Weapon', description: 'Manifest a floating spectral mace to strike.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Revivify', description: 'Recall a soul that fell in the last minute. (Requires Level 3 spell slot).', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Spirit Guardians', description: 'Angelic spirits circle and slow enemies.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Greater Restoration', description: 'Cleanse Stunned, Charmed, or Frightened.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Heal', description: 'A massive flood of vitality restores health.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Resurrection', description: 'Bring back a soul that fell within a century.', type: 'Spell', levelReq: 13, baseLevel: 7 },
    { name: 'True Resurrection', description: 'Restore life and body to absolute perfection.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.DarkKnight]: [
    { name: 'Dark Rite', description: 'Sacrifice vitality for necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Hex', description: 'Curse a target to take extra necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Blindness', description: 'Cloud the vision of a foe with shadow.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Animate Dead', description: 'Force a remains to rise and serve.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Vampiric Touch', description: 'Siphon health from a touched foe.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Blight', description: 'Wither the life-force of a single creature.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Circle of Death', description: 'A sphere of negative energy drains the area.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Finger of Death', description: 'Attempt to rip the soul directly from a target.', type: 'Spell', levelReq: 13, baseLevel: 7 },
    { name: 'Abyss Portal', description: 'Open a rift to the void to swallow foes.', type: 'Spell', levelReq: 15, baseLevel: 8 },
    { name: 'Power Word Kill', description: 'Utter a word that ends a weakened life.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.BloodArtist]: [
    { name: 'Life Tap', description: 'Drain a foe to replenish thy own wells.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Sanguine Lash', description: 'A whip of blood that ignores physical armor.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Coagulate', description: 'Freeze the blood in a target\'s limbs (Stun).', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Transfusion', description: 'Sacrifice thy HP to heal an ally double.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Crimson Burst', description: 'Detonate thy own blood to damage all nearby.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Blood Curse', description: 'Target takes damage whenever they attack.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Exsanguinate', description: 'Directly draw the vitals out of a target.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Vessel Rupture', description: 'Cause the internal organs of a foe to fail.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ]
};

export const ARCHETYPE_INFO: Record<string, { hpDie: number; role: Role; description: string; coreAbilities: Ability[]; spells?: Ability[] }> = {
  [Archetype.Archer]: {
    hpDie: 8, role: 'DPS', description: 'Lithe hunters who strike from the shadows.',
    coreAbilities: [
      { name: 'Sky-Splitter', description: 'Precision that ignores distance.', type: 'Passive', levelReq: 1 },
      { name: 'Void Mark', description: 'Target a weak point for lethality.', type: 'Active', levelReq: 3 },
      { name: 'Shadow Step', description: 'Teleport between patches of darkness.', type: 'Active', levelReq: 7 },
      { name: 'Rain of Thorns', description: 'Entangling volley of arrows.', type: 'Active', levelReq: 11 },
      { name: 'Perfect Execution', description: 'Shots never miss and ignore resistance.', type: 'Passive', levelReq: 15 }
    ]
  },
  [Archetype.Thief]: {
    hpDie: 8, role: 'DPS', description: 'Masters of the quick blade and unseen step.',
    coreAbilities: [
      { name: 'Lethal Ambush', description: 'Strike with force when unseen.', type: 'Passive', levelReq: 1 },
      { name: 'Cunning Action', description: 'Dash or Disengage as a minor movement.', type: 'Active', levelReq: 3 },
      { name: 'Evasion', description: 'Dodge area effects with grace.', type: 'Passive', levelReq: 7 },
      { name: 'Vanish', description: 'Become invisible for a brief moment.', type: 'Active', levelReq: 11 },
      { name: 'Death Strike', description: 'A blow that can end any mortal life.', type: 'Active', levelReq: 15 }
    ]
  },
  [Archetype.Sorcerer]: {
    hpDie: 6, role: 'DPS', description: 'Conduits of raw, dangerous power.',
    coreAbilities: [
      { name: 'Arcane Memory', description: 'Recall a manifestation once per day.', type: 'Passive', levelReq: 1 },
      { name: 'Metamagic', description: 'Twist spells to hit harder.', type: 'Active', levelReq: 3 },
      { name: 'Elemental Shift', description: 'Change the energy type of a spell.', type: 'Active', levelReq: 7 },
      { name: 'Aetheric Reservoir', description: 'Restore spell slots in battle.', type: 'Active', levelReq: 11 },
      { name: 'Planar Breach', description: 'Summon energy from the void.', type: 'Active', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.Sorcerer]
  },
  [Archetype.Mage]: {
    hpDie: 6, role: 'Support', description: 'Healers and weavers of protective energy.',
    coreAbilities: [
      { name: 'Harmonized Aether', description: 'Thy blessings reach more allies.', type: 'Passive', levelReq: 1 },
      { name: 'Warding Halo', description: 'Create a static zone of protection.', type: 'Active', levelReq: 3 },
      { name: 'Beacon of Hope', description: 'Allies cannot be frightened.', type: 'Passive', levelReq: 7 },
      { name: 'Mending Presence', description: 'Automatically heal nearby allies.', type: 'Passive', levelReq: 11 },
      { name: 'Divine Intervention', description: 'Call for a higher miracle.', type: 'Active', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.Mage]
  },
  [Archetype.Warrior]: {
    hpDie: 12, role: 'Tank', description: 'Steel-clad juggernauts of the front line.',
    coreAbilities: [
      { name: 'Charged Devastation', description: 'Put every ounce of strength into a swing.', type: 'Active', levelReq: 1 },
      { name: 'Reckless Attack', description: 'Gain advantage at cost of defense.', type: 'Active', levelReq: 3 },
      { name: 'Brutal Critical', description: 'Extra damage on critical strikes.', type: 'Passive', levelReq: 7 },
      { name: 'Unyielding Rage', description: 'HP cannot drop below 1 while active.', type: 'Active', levelReq: 11 },
      { name: 'Titan’s Grip', description: 'Wield heavy weapons with one hand.', type: 'Passive', levelReq: 15 }
    ]
  },
  [Archetype.Fighter]: {
    hpDie: 10, role: 'Tank', description: 'Unyielding guardians with blade and bulwark.',
    coreAbilities: [
      { name: 'Shield Bash', description: 'Shatter the stance of thy enemy.', type: 'Active', levelReq: 1 },
      { name: 'Defender’s Stance', description: 'Take hits meant for nearby allies.', type: 'Active', levelReq: 3 },
      { name: 'Indomitable', description: 'Reroll a failed saving throw.', type: 'Active', levelReq: 7 },
      { name: 'Improved Critical', description: 'Critical on 19 or 20.', type: 'Passive', levelReq: 11 },
      { name: 'Master of Arms', description: 'Perform four attacks in one turn.', type: 'Passive', levelReq: 15 }
    ]
  },
  [Archetype.DarkKnight]: {
    hpDie: 10, role: 'Tank', description: 'Warriors who use their own pain as a weapon.',
    coreAbilities: [
      { name: 'Living Dead', description: 'Survive at 0 HP for a limited time.', type: 'Passive', levelReq: 1 },
      { name: 'Soul Rend', description: 'Heal for a portion of damage dealt.', type: 'Passive', levelReq: 3 },
      { name: 'Abyssal Grasp', description: 'Pull all nearby enemies toward thee.', type: 'Active', levelReq: 7 },
      { name: 'Dread Aura', description: 'Enemies near thee are permanently frightened.', type: 'Passive', levelReq: 11 },
      { name: 'Reaper’s Toll', description: 'A strike that consumes all energy to execute.', type: 'Active', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight]
  },
  [Archetype.Alchemist]: {
    hpDie: 8, role: 'Support', description: 'Brewers of tonics and volatile acids.',
    coreAbilities: [
      { name: 'Harvester', description: 'Carve reagents from thy foes.', type: 'Passive', levelReq: 1 },
      { name: 'Experimental Brew', description: 'Craft status-clearing tonics during rest.', type: 'Passive', levelReq: 3 },
      { name: 'Volatile Reaction', description: 'Explosions deal double damage to armor.', type: 'Passive', levelReq: 7 },
      { name: 'Toxic Catalyst', description: 'Apply multiple poisons with one strike.', type: 'Active', levelReq: 11 },
      { name: 'Philosopher’s Stone', description: 'Restore a fallen soul.', type: 'Active', levelReq: 15 }
    ]
  },
  [Archetype.BloodArtist]: {
    hpDie: 10, role: 'DPS', description: 'Elegant collectors of life-force and carnage.',
    coreAbilities: [
      { name: 'Sanguine Link', description: 'Bind two hearts to share the toll.', type: 'Active', levelReq: 1 },
      { name: 'Hemorrhage', description: 'Every strike inflicts bleeding.', type: 'Passive', levelReq: 3 },
      { name: 'Vitae Infusion', description: 'Consume blood to enhance attributes.', type: 'Active', levelReq: 7 },
      { name: 'Crimson Dance', description: 'Gain speed for every bleeding foe.', type: 'Passive', levelReq: 11 },
      { name: 'Heart-Stopper', description: 'Manipulate the pulse of a target.', type: 'Active', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.BloodArtist]
  }
};

export const INITIAL_ITEMS: Item[] = [
  { id: 'w-c-axe', name: 'Iron Battleaxe', description: 'A heavy axe meant for devastating heavy armor.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d12+STR' }, archetypes: [Archetype.Warrior] },
  { id: 'w-c-plate', name: 'Heavy Chain Mail', description: 'Interlocking rings of heavy iron.', type: 'Armor', rarity: 'Common', stats: { ac: 16 }, archetypes: [Archetype.Warrior, Archetype.Fighter, Archetype.DarkKnight] },
  { id: 'f-c-sword', name: 'Steel Longsword', description: 'A balanced blade for the disciplined.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+STR' }, archetypes: [Archetype.Fighter] },
  { id: 'f-c-shield', name: 'Heater Shield', description: 'A sturdy shield for the front line.', type: 'Armor', rarity: 'Common', stats: { ac: 2 }, archetypes: [Archetype.Fighter] },
  { id: 'dk-c-greatsword', name: 'Sorrow Zweihander', description: 'A massive blade that resonates with despair.', type: 'Weapon', rarity: 'Common', stats: { damage: '2d6+STR' }, archetypes: [Archetype.DarkKnight] },
  { id: 'a-c-bow', name: 'Yew Longbow', description: 'Lithe and powerful.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+DEX' }, archetypes: [Archetype.Archer] },
  { id: 'a-c-leather', name: 'Hardened Leather', description: 'Durable and flexible.', type: 'Armor', rarity: 'Common', stats: { ac: 12 }, archetypes: [Archetype.Archer, Archetype.Thief, Archetype.Alchemist] },
  { id: 't-c-dagger', name: 'Stiletto Dagger', description: 'Meant for the soft spots.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d4+DEX' }, archetypes: [Archetype.Thief] },
  { id: 't-c-shortsword', name: 'Cutpurse Shortsword', description: 'Quick and reliable.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d6+DEX' }, archetypes: [Archetype.Thief, Archetype.Alchemist] },
  { id: 's-c-staff', name: 'Ebony Conduit Staff', description: 'A staff to focus the mind.', type: 'Weapon', rarity: 'Common', stats: { int: 1 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 's-c-robes', name: 'Practitioner Robes', description: 'Light silk infused with aether.', type: 'Armor', rarity: 'Common', stats: { ac: 10 }, archetypes: [Archetype.Sorcerer, Archetype.Mage, Archetype.BloodArtist] },
  { id: 'al-c-vial', name: 'Reactionary Offhand Vial', description: 'An offhand catalyst for reactions.', type: 'Weapon', rarity: 'Common', stats: { int: 1 }, archetypes: [Archetype.Alchemist] },
  { id: 'ba-c-sickle', name: 'Crimson Sickle', description: 'A tool for the harvest of life.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d6+CHA' }, archetypes: [Archetype.BloodArtist] },
  { id: 'util-hp-minor', name: 'Minor Vitality Potion', description: 'A bitter draft that seals surface wounds.', type: 'Utility', rarity: 'Common', stats: {} },
  { id: 'util-mana-minor', name: 'Minor Aetheric Tincture', description: 'Restores a sliver of aetheric reservoir.', type: 'Utility', rarity: 'Common', stats: {} }
];

export const MENTORS: Character[] = [
  {
    id: 'mentor-lina', name: 'Lina', age: 24, gender: 'Female', race: Race.Human, archetype: Archetype.Mage, role: 'Support', level: 5, exp: 0, maxHp: 35, currentHp: 35, stats: { str: 8, dex: 12, con: 12, int: 14, wis: 18, cha: 14 },
    currency: { aurels: 100 }, 
    personality: 'A timid mage that tries her best to support her allies, often whispering prayers under her breath.',
    inventory: [
      { id: 'l-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 'l-gear-staff', name: 'Radiant Dawn Ebony Staff', type: 'Weapon', stats: { wis: 2 }, rarity: 'Rare', description: 'A staff that glows with inner light.', archetypes: [Archetype.Mage] },
      { id: 'l-gear-robes', name: 'Vestments of the Weave Robes', type: 'Armor', stats: { ac: 11 }, rarity: 'Rare', description: 'Robes that ripple with mana.', archetypes: [Archetype.Mage] }
    ], 
    equippedIds: ['l-gear-staff', 'l-gear-robes'], spells: SPELL_LIBRARY[Archetype.Mage] || [], abilities: ARCHETYPE_INFO[Archetype.Mage].coreAbilities,
    description: 'Serene priestess in gold and ivory.', biography: 'Guardian of the Sunken Sanctuary.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-miri', name: 'Miri', age: 22, gender: 'Female', race: Race.Human, archetype: Archetype.Fighter, role: 'Tank', level: 5, exp: 0, maxHp: 52, currentHp: 52, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 12 },
    currency: { aurels: 50 }, 
    personality: 'An energetic combatant who finds thrill in the dance of blades and the roar of the crowd.',
    inventory: [
      { id: 'm-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 'm-gear-sword', name: 'Frontier Steel Broadsword', type: 'Weapon', stats: { damage: '1d8+STR' }, rarity: 'Rare', description: 'A notched but sharp one-handed blade.', archetypes: [Archetype.Fighter] },
      { id: 'm-gear-shield', name: 'Battered Heater Shield', type: 'Armor', stats: { ac: 2 }, rarity: 'Rare', description: 'A shield that has seen a hundred sieges.', archetypes: [Archetype.Fighter] },
      { id: 'm-gear-plate', name: 'Gilded Heavy Full Plate', type: 'Armor', stats: { ac: 18 }, rarity: 'Rare', description: 'Ornate heavy plate for a champion.', archetypes: [Archetype.Fighter] }
    ], 
    equippedIds: ['m-gear-sword', 'm-gear-shield', 'm-gear-plate'], spells: [], abilities: ARCHETYPE_INFO[Archetype.Fighter].coreAbilities,
    description: 'Energetic fighter.', biography: 'Frontier protector who specializes in shield-defense.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-seris', name: 'Seris', age: 112, gender: 'Male', race: Race.Elf, archetype: Archetype.Archer, role: 'DPS', level: 5, exp: 0, maxHp: 38, currentHp: 38, stats: { str: 10, dex: 18, con: 12, int: 14, wis: 14, cha: 10 },
    currency: { aurels: 150 }, 
    personality: 'A cool, aloof archer who prefers the company of shadows to that of men.',
    inventory: [
      { id: 's-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 's-gear-bow', name: 'Void-Piercer Yew Longbow', type: 'Weapon', stats: { damage: '1d10+DEX' }, rarity: 'Rare', description: 'An obsidian-limbed ranged weapon.', archetypes: [Archetype.Archer] },
      { id: 's-gear-leather', name: 'Shadow-Thread Leather Armor', type: 'Armor', stats: { ac: 13 }, rarity: 'Rare', description: 'Leather that blends into moonlight.', archetypes: [Archetype.Archer] }
    ], 
    equippedIds: ['s-gear-bow', 's-gear-leather'], spells: [], abilities: ARCHETYPE_INFO[Archetype.Archer].coreAbilities,
    description: 'Reserved elf.', biography: 'Master of precision.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-kaelen', name: 'Kaelen', age: 31, gender: 'Male', race: Race.Tiefling, archetype: Archetype.DarkKnight, role: 'Tank', level: 5, exp: 0, maxHp: 48, currentHp: 48, stats: { str: 17, dex: 10, con: 15, int: 12, wis: 10, cha: 16 },
    currency: { aurels: 80 }, 
    personality: 'A cold stoic dark knight that respects strength in all forms while condemning evil. He speaks only when necessary.',
    inventory: [
      { id: 'k-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 'k-gear-sword', name: 'Abyssal Two-Handed Sorrow-Blade', type: 'Weapon', stats: { damage: '2d6+STR' }, rarity: 'Rare', description: 'A massive blade that screams when swung.', archetypes: [Archetype.DarkKnight] },
      { id: 'k-gear-plate', name: 'Sorrow-Forged Heavy Obsidian Plate', type: 'Armor', stats: { ac: 18 }, rarity: 'Rare', description: 'Black plate that absorbs light.', archetypes: [Archetype.DarkKnight] }
    ], 
    equippedIds: ['k-gear-sword', 'k-gear-plate'], spells: SPELL_LIBRARY[Archetype.DarkKnight] || [], abilities: ARCHETYPE_INFO[Archetype.DarkKnight].coreAbilities,
    description: 'Cold commander wearing a mask of indifference.', biography: 'Exiled prince.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-thorin', name: 'Thorin', age: 154, gender: 'Male', race: Race.Dwarf, archetype: Archetype.Warrior, role: 'Tank', level: 5, exp: 0, maxHp: 65, currentHp: 65, stats: { str: 19, dex: 10, con: 18, int: 8, wis: 12, cha: 10 },
    currency: { aurels: 120 }, 
    personality: 'Boisterous and jovial, Thorin finds joy in the choir of clashing steel and a well-cooked haunch.',
    inventory: [
      { id: 'th-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 'th-gear-axe', name: 'Mountain Breaker Two-Handed Axe', type: 'Weapon', stats: { damage: '1d12+STR' }, rarity: 'Rare', description: 'A heavy dwarf-forged heavy weapon.', archetypes: [Archetype.Warrior] },
      { id: 'th-gear-plate', name: 'Deep-Iron Heavy Mountain Plate', type: 'Armor', stats: { ac: 18 }, rarity: 'Rare', description: 'Durable heavy dwarven plate.', archetypes: [Archetype.Warrior] }
    ], 
    equippedIds: ['th-gear-axe', 'th-gear-plate'], spells: [], abilities: ARCHETYPE_INFO[Archetype.Warrior].coreAbilities,
    description: 'A mountain of a dwarf with a bbeard braided in iron rings.', biography: 'Last of the Iron-Grip clan.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-ignis', name: 'Ignis', age: 42, gender: 'Male', race: Race.Dragonborn, archetype: Archetype.Sorcerer, role: 'DPS', level: 5, exp: 0, maxHp: 32, currentHp: 32, stats: { str: 12, dex: 14, con: 14, int: 18, wis: 10, cha: 16 },
    currency: { aurels: 200 }, 
    personality: 'Proud and volatile, Ignis views aether as a tool of absolute dominance over the lesser fragments.',
    inventory: [
      { id: 'ig-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 'ig-gear-staff', name: 'Dragon-Heart Ebony Staff', type: 'Weapon', stats: { int: 2 }, rarity: 'Rare', description: 'A staff tipped with a glowing ruby.', archetypes: [Archetype.Sorcerer] },
      { id: 'ig-gear-robes', name: 'Cinder-Woven Aetheric Robes', type: 'Armor', stats: { ac: 11 }, rarity: 'Rare', description: 'Robes that never feel the cold.', archetypes: [Archetype.Sorcerer] }
    ], 
    equippedIds: ['ig-gear-staff', 'ig-gear-robes'], spells: SPELL_LIBRARY[Archetype.Sorcerer] || [], abilities: ARCHETYPE_INFO[Archetype.Sorcerer].coreAbilities,
    description: 'Gold-scaled dragonborn whose eyes glow with aetheric embers.', biography: 'Exiled High-Caster.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-vesper', name: 'Vesper', age: 28, gender: 'Female', race: Race.Vesperian, archetype: Archetype.Thief, role: 'DPS', level: 5, exp: 0, maxHp: 38, currentHp: 38, stats: { str: 10, dex: 19, con: 12, int: 14, wis: 14, cha: 12 },
    currency: { aurels: 300 }, 
    personality: 'Pragmatic and dry-witted, Vesper values silence and survival over the vanity of heroics.',
    inventory: [
      { id: 've-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 've-gear-dagger', name: 'Shadow-Bite Stiletto Dagger', type: 'Weapon', stats: { damage: '1d4+DEX' }, rarity: 'Rare', description: 'First part of a dual-wield set.', archetypes: [Archetype.Thief] },
      { id: 've-gear-shortsword', name: 'Obsidian Shortsword', type: 'Weapon', stats: { damage: '1d6+DEX' }, rarity: 'Rare', description: 'Second part of a dual-wield set.', archetypes: [Archetype.Thief] },
      { id: 've-gear-leather', name: 'Whisper-Soft Silent Leathers', type: 'Armor', stats: { ac: 13 }, rarity: 'Rare', description: 'Armor that makes no sound.', archetypes: [Archetype.Thief] }
    ], 
    equippedIds: ['ve-gear-dagger', 've-gear-shortsword', 've-gear-leather'], spells: [], abilities: ARCHETYPE_INFO[Archetype.Thief].coreAbilities,
    description: 'Shadow-touched vesperian with silent boots and quick eyes.', biography: 'Guild-Shadow of the Obsidian Reach.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-zora', name: 'Zora', age: 89, gender: 'Female', race: Race.Gnome, archetype: Archetype.Alchemist, role: 'Support', level: 5, exp: 0, maxHp: 40, currentHp: 40, stats: { str: 8, dex: 14, con: 16, int: 19, wis: 12, cha: 10 },
    currency: { aurels: 150 }, 
    personality: 'Analytical and obsessive, Zora treats every combat as a chemical equation waiting to be balanced.',
    inventory: [
      { id: 'zo-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 'zo-gear-sword', name: 'Reactionary Steel Shortsword', type: 'Weapon', stats: { damage: '1d6+INT' }, rarity: 'Rare', description: 'Used to stir and strike.', archetypes: [Archetype.Alchemist] },
      { id: 'zo-gear-vial', name: 'Offhand Volatile Catalyst Vial', type: 'Weapon', stats: { int: 2 }, rarity: 'Rare', description: 'An offhand tool for transmutation.', archetypes: [Archetype.Alchemist] },
      { id: 'zo-gear-leather', name: 'Reinforced Chemist Leathers', type: 'Armor', stats: { ac: 12 }, rarity: 'Rare', description: 'Acid-resistant protection.', archetypes: [Archetype.Alchemist] }
    ], 
    equippedIds: ['zo-gear-sword', 'zo-gear-vial', 'zo-gear-leather'], spells: [], abilities: ARCHETYPE_INFO[Archetype.Alchemist].coreAbilities,
    description: 'Gnome covered in soot and goggles, smelling of sulfur.', biography: 'Archivist of the Volatile Arts.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-elias', name: 'Elias', age: 35, gender: 'Male', race: Race.Vesperian, archetype: Archetype.BloodArtist, role: 'DPS', level: 5, exp: 0, maxHp: 45, currentHp: 45, stats: { str: 10, dex: 12, con: 16, int: 14, wis: 10, cha: 18 },
    currency: { aurels: 180 }, 
    personality: 'Macabre and poetic, Elias sees the flow of life-essence as a symphony that must be carefully conducted.',
    inventory: [
      { id: 'el-hp-1', name: 'Minor Vitality Potion', description: 'A bitter draft.', type: 'Utility', rarity: 'Common', stats: {} },
      { id: 'el-gear-scythe', name: 'Soul-Harvest Blood Scythe', type: 'Weapon', stats: { damage: '1d10+CHA' }, rarity: 'Rare', description: 'A weapon of grim beauty.', archetypes: [Archetype.BloodArtist] },
      { id: 'el-gear-robes', name: 'Sanguine Silk Aetheric Robes', type: 'Armor', stats: { ac: 11 }, rarity: 'Rare', description: 'Robes that drink spilled blood.', archetypes: [Archetype.BloodArtist] }
    ], 
    equippedIds: ['el-gear-scythe', 'el-gear-robes'], spells: SPELL_LIBRARY[Archetype.BloodArtist] || [], abilities: ARCHETYPE_INFO[Archetype.BloodArtist].coreAbilities,
    description: 'Pale, elegant vessel wearing robes of deep crimson.', biography: 'Collector of the Forbidden Vitae.', asiPoints: 0, activeStatuses: []
  }
];

export const MENTOR_UNIQUE_GEAR: Record<string, Partial<Item>[]> = {}; 

export const INITIAL_MONSTERS: Monster[] = [
  { id: 'mon-rat', name: 'Obsidian Rat', type: 'Beast', hp: 4, ac: 10, stats: { str: 4, dex: 12, con: 10, int: 2, wis: 10, cha: 4 }, abilities: [], description: 'Shadows with teeth. They feast on the low-resonance fragments of the world.', cr: 0.125, activeStatuses: [] },
  { id: 'mon-wolf', name: 'Shadow Wolf', type: 'Beast', hp: 15, ac: 12, stats: { str: 14, dex: 14, con: 12, int: 3, wis: 12, cha: 6 }, abilities: [], description: 'Burning eyes and teeth made of cold obsidian.', cr: 1, activeStatuses: [] },
  { id: 'mon-husk', name: 'Hollow Husk', type: 'Undead', hp: 12, ac: 8, stats: { str: 12, dex: 6, con: 14, int: 1, wis: 1, cha: 1 }, abilities: [{name: 'Soul Thirst', description: 'Deals 1d4 necrotic on hit.', type: 'Active', levelReq: 1}], description: 'The remains of a vessel that failed to bind. Slow and brittle.', cr: 0.25, activeStatuses: [] },
  { id: 'mon-wisp', name: 'Aetheric Wisp', type: 'Hybrid', hp: 5, ac: 13, stats: { str: 1, dex: 16, con: 10, int: 14, wis: 14, cha: 10 }, abilities: [{name: 'Phase Out', description: 'Disadvantage on attacks against it.', type: 'Passive', levelReq: 1}], description: 'Flickering lights that feed on aetheric surges.', cr: 0.25, activeStatuses: [] },
  { id: 'mon-warden', name: 'Shattered Warden', type: 'Undead', hp: 45, ac: 15, stats: { str: 18, dex: 10, con: 16, int: 8, wis: 12, cha: 8 }, abilities: [{name: 'Iron Cleave', description: 'Massive arc strike (2d8+STR).', type: 'Active', levelReq: 1}, {name: 'Stone Skin', description: 'Resistance to physical damage.', type: 'Passive', levelReq: 1}], description: 'A massive armored shell animated by a vengeful soul.', cr: 2, activeStatuses: [] },
  { id: 'mon-gorechimera', name: 'Gorechimera', type: 'Hybrid', hp: 140, ac: 16, stats: { str: 20, dex: 12, con: 18, int: 6, wis: 14, cha: 10 }, cr: 7, description: 'A twisted fusion of apex predators.', abilities: [{ name: 'Lion Pulse', description: 'Stun nearby vessels.', type: 'Active', levelReq: 1 }], activeStatuses: [] },
  { id: 'mon-colossus', name: 'Blight-Walker Colossus', type: 'Undead', hp: 280, ac: 20, stats: { str: 24, dex: 8, con: 22, int: 4, wis: 10, cha: 5 }, cr: 16, description: 'A titan of stitched flesh.', abilities: [{ name: 'Earth-Shaker', description: 'Knock all vessels prone.', type: 'Active', levelReq: 1 }], vulnerabilities: ['Fire'], activeStatuses: [] }
];

export const RULES_MANIFEST = `
1. **THE ARBITER**: Gemini AI is the ultimate judge. Reality is grounded; its word on outcomes is final.
2. **THE ARBITER'S HAND**: The Engine calculates all initiative and dice outcomes automatically.
3. **EQUILIBRIUM**: The world is balanced for a Fellowship of 3 to 5 souls. 
4. **THE LONE VESSEL**: Solo play is "Heroic Mode" with cinematic favor.
5. **SOUL ASCENSION**: Progression requires 1,000 EXP * Level.
6. **VOID LAW**: Blights cannot be removed manually. Reagents or Spells are required.
7. **ANCHORED SOULS**: Mentors are immortal soul-fragments. If their Vitality (HP) reaches 0, they return to 'The Broken Cask' to reform.
8. **DEATH SAVES**: 3 Successes to stabilize, 3 Failures to perish permanently.
9. **AETHERIC RESTS**: 
    - SHORT REST: Completely restores Vitality (HP) and half spell slots.
    - LONG REST: Completely restores Vitality (HP) and all spell slots. Purges minor blights.
`;

export const STARTER_CAMPAIGN_PROMPT = `The air is thick with iron. Thy Fellowship stands before 'The Broken Cask'. What is thy move?`;

export const TUTORIAL_SCENARIO = {
  title: "The Fellowship of Five",
  prompt: `Thou awakenest in the obsidian silence of the Sunken Sanctuary...`,
  beats: [
    "ACT 1: THE AWAKENING",
    "ACT 2: RITUAL OF STEEL",
    "ACT 3: THE BREACH"
  ]
};

export const APOTHECARY_TIERS = {
  HEALTH: [{ name: 'Minor Vitality Potion', desc: 'Seal shallow wounds.', cost: 50, lvl: 1 }],
  AETHER: [{ name: 'Aetheric Tincture', desc: 'Restores a minor amount of aether.', cost: 75, lvl: 1 }],
  DAMAGE: [{ name: 'Volatile Acid', desc: 'Deals 2d6 acid damage.', cost: 100, lvl: 3 }],
  PURITY: [
    { name: 'Cinder-Draft', desc: 'Burns away toxins (Cleanses Poisoned and Bleeding).', cost: 120, lvl: 1 },
    { name: 'Purifying Salts', desc: 'Clears the mind (Cleanses Stunned and Frightened).', cost: 150, lvl: 3 }
  ]
};