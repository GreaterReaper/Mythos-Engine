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

export const SPELL_LIBRARY: Record<string, Ability[]> = {
  [Archetype.Sorcerer]: [
    { name: 'Chaos Bolt', description: 'Fire a bolt of unpredictable energy.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5 },
    { name: 'Shield of Aether', description: 'A barrier of shimmering force (+5 AC).', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 8 },
    { name: 'Magic Missile', description: 'Three darts of aether strike unerringly.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5 },
    { name: 'Aetheric Surge', description: 'A blast of pure force pushes enemies back.', type: 'Spell', levelReq: 3, baseLevel: 2, manaCost: 12 },
    { name: 'Fireball', description: 'A massive explosion of heat.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 20 },
    { name: 'Meteor Swarm', description: 'Blazing orbs of fire crash from the sky.', type: 'Spell', levelReq: 17, baseLevel: 9, manaCost: 50 }
  ],
  [Archetype.Mage]: [
    { name: 'Cure Wounds', description: 'Seal wounds and restore vitality.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5 },
    { name: 'Bless', description: 'Fortify spirits (Add 1d4 to attack/saves).', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5 },
    { name: 'Revivify', description: 'Recall a soul that fell in the last minute.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 25 },
    { name: 'Spirit Guardians', description: 'Angelic spirits circle and slow enemies.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 15 },
    { name: 'Heal', description: 'A massive flood of vitality restores health.', type: 'Spell', levelReq: 11, baseLevel: 6, manaCost: 35 }
  ],
  [Archetype.DarkKnight]: [
    { name: 'Dark Rite', description: 'Sacrifice vitality for necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, hpCost: 10 },
    { name: 'Hex', description: 'Curse a target to take extra necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5 },
    { name: 'Animate Dead', description: 'Force a remains to rise and serve.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 20 },
    { name: 'Vampiric Touch', description: 'Siphon health from a touched foe.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 10 },
    { name: 'Circle of Death', description: 'A sphere of negative energy drains the area.', type: 'Spell', levelReq: 11, baseLevel: 6, manaCost: 30, hpCost: 15 }
  ],
  [Archetype.BloodArtist]: [
    { name: 'Life Tap', description: 'Drain a foe to replenish thy own wells.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 0, hpCost: 5 },
    { name: 'Sanguine Lash', description: 'A whip of blood that ignores physical armor.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, hpCost: 3 },
    { name: 'Transfusion', description: 'Sacrifice thy HP to heal an ally double.', type: 'Spell', levelReq: 3, baseLevel: 2, manaCost: 5, hpCost: 12 },
    { name: 'Crimson Burst', description: 'Detonate thy own blood to damage all nearby.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 10, hpCost: 10 },
    { name: 'Exsanguinate', description: 'Directly draw the vitals out of a target.', type: 'Spell', levelReq: 11, baseLevel: 6, manaCost: 20, hpCost: 20 }
  ]
};

export const ARCHETYPE_INFO: Record<string, { hpDie: number; role: Role; description: string; coreAbilities: Ability[]; spells?: Ability[]; starterGear: string[] }> = {
  [Archetype.Archer]: {
    hpDie: 8, role: 'DPS', description: 'Lithe hunters who strike from the shadows.',
    coreAbilities: [
      { name: 'Sky-Splitter', description: 'Precision that ignores distance.', type: 'Passive', levelReq: 1 },
      { name: 'Void Mark', description: 'Target a weak point for lethality.', type: 'Active', levelReq: 3, manaCost: 5 }
    ],
    starterGear: ['Hunting Bow', 'Leather Tunic', 'Quiver of Bolts']
  },
  [Archetype.Thief]: {
    hpDie: 8, role: 'DPS', description: 'Masters of the quick blade and unseen step.',
    coreAbilities: [
      { name: 'Lethal Ambush', description: 'Strike with force when unseen.', type: 'Passive', levelReq: 1 },
      { name: 'Cunning Action', description: 'Dash or Disengage as a minor movement.', type: 'Active', levelReq: 3, manaCost: 3 }
    ],
    starterGear: ['Twin Daggers', 'Leather Jerkin', 'Thieves Tools']
  },
  [Archetype.Sorcerer]: {
    hpDie: 6, role: 'DPS', description: 'Conduits of raw, dangerous power.',
    coreAbilities: [
      { name: 'Arcane Memory', description: 'Recall a manifestation once per day.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Sorcerer],
    starterGear: ['Aetheric Staff', 'Shadow-Woven Robes']
  },
  [Archetype.Mage]: {
    hpDie: 6, role: 'Support', description: 'Healers and weavers of protective energy.',
    coreAbilities: [
      { name: 'Harmonized Aether', description: 'Thy blessings reach more allies.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Mage],
    starterGear: ['Elderwood Staff', 'Clerical Robes']
  },
  [Archetype.Warrior]: {
    hpDie: 12, role: 'Tank', description: 'Steel-clad juggernauts who forsake shields for absolute devastation.',
    coreAbilities: [
      { name: 'Charged Devastation', description: 'Put every ounce of strength into a swing.', type: 'Active', levelReq: 1, manaCost: 5 }
    ],
    starterGear: ['Double-Headed Greataxe', 'Heavy Iron Plate']
  },
  [Archetype.Fighter]: {
    hpDie: 10, role: 'Tank', description: 'Unyielding guardians with blade and bulwark.',
    coreAbilities: [
      { name: 'Shield Bash', description: 'Shatter the stance of thy enemy.', type: 'Active', levelReq: 1, manaCost: 5 }
    ],
    starterGear: ['Soldier\'s Longsword', 'Iron Kite Shield', 'Steel Plate Armor']
  },
  [Archetype.DarkKnight]: {
    hpDie: 10, role: 'Tank', description: 'Warriors who use their own pain and massive two-handed steel as a weapon. They carry no shields.',
    coreAbilities: [
      { name: 'Soul Rend', description: 'Heal for a portion of damage dealt.', type: 'Passive', levelReq: 3 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight],
    starterGear: ['Vile Zweihander', 'Obsidian Heavy Plate']
  },
  [Archetype.Alchemist]: {
    hpDie: 8, role: 'Support', description: 'Brewers of tonics and volatile acids.',
    coreAbilities: [
      { name: 'Harvester', description: 'Carve reagents from thy foes.', type: 'Passive', levelReq: 1 }
    ],
    starterGear: ['Weighted Shortsword', 'Reinforced Leather Apron', 'Alchemy Kit']
  },
  [Archetype.BloodArtist]: {
    hpDie: 10, role: 'DPS', description: 'Elegant collectors of life-force and carnage.',
    coreAbilities: [
      { name: 'Sanguine Link', description: 'Bind two hearts to share the toll.', type: 'Active', levelReq: 1, manaCost: 10, hpCost: 5 }
    ],
    spells: SPELL_LIBRARY[Archetype.BloodArtist],
    starterGear: ['Serrated Ritual Sickle', 'Crimson Silk Robes']
  }
};

// Fix: Added missing INITIAL_MONSTERS export to resolve import error in App.tsx
export const INITIAL_MONSTERS: Monster[] = [];

export const INITIAL_ITEMS: Item[] = [];

export const MENTORS: Character[] = [
  {
    id: 'mentor-lina', name: 'Lina', age: 24, gender: 'Female', race: Race.Human, archetype: Archetype.Mage, role: 'Support', level: 5, exp: 0, maxHp: 35, currentHp: 35, maxMana: 50, currentMana: 50, stats: { str: 8, dex: 12, con: 12, int: 14, wis: 18, cha: 14 },
    currency: { aurels: 100 }, personality: 'A timid mage.', inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.Mage] || [], abilities: ARCHETYPE_INFO[Archetype.Mage].coreAbilities,
    description: 'Serene priestess.', biography: 'Guardian.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-miri', name: 'Miri', age: 22, gender: 'Female', race: Race.Human, archetype: Archetype.Fighter, role: 'Tank', level: 5, exp: 0, maxHp: 52, currentHp: 52, maxMana: 30, currentMana: 30, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 12 },
    currency: { aurels: 50 }, personality: 'Energetic.', inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Fighter].coreAbilities,
    description: 'Energetic fighter.', biography: 'Protector.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-seris', name: 'Seris', age: 112, gender: 'Male', race: Race.Elf, archetype: Archetype.Archer, role: 'DPS', level: 5, exp: 0, maxHp: 38, currentHp: 38, maxMana: 40, currentMana: 40, stats: { str: 10, dex: 18, con: 12, int: 14, wis: 14, cha: 10 },
    currency: { aurels: 150 }, personality: 'Aloof.', inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Archer].coreAbilities,
    description: 'Reserved elf.', biography: 'Master.', asiPoints: 0, activeStatuses: []
  }
];

export const RULES_MANIFEST = `
1. **THE ARBITER**: Gemini AI is the ultimate judge.
2. **IDENTITY**: The Arbiter uses thy Name, Gender, and detailed Stats for all interactions.
3. **SOUL ASCENSION**: 1,000 EXP * Level.
4. **EQUIPMENT**: Class-specific gear grants access to unique maneuvers.
5. **AETHERIC WELLS**: Mana for spells.
6. **VOID LAW**: Dark magic costs Vitality (HP).
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
  AETHER: [{ name: 'Aetheric Tincture', desc: 'Restores 20 Mana.', cost: 75, lvl: 1 }],
  DAMAGE: [{ name: 'Volatile Acid', desc: 'Deals 2d6 acid damage.', cost: 100, lvl: 3 }],
  PURITY: [{ name: 'Cinder-Draft', desc: 'Burns away toxins.', cost: 120, lvl: 1 }]
};