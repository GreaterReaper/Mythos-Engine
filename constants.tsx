
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
    { name: 'Chaos Bolt', description: 'Fire a bolt of unpredictable energy.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, damage: '1d12', damageType: 'Psychic' },
    { name: 'Shield of Aether', description: 'A barrier of shimmering force (+5 AC).', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 8 },
    { name: 'Fireball', description: 'A massive explosion of heat.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 20, damage: '8d6', damageType: 'Fire' }
  ],
  [Archetype.Mage]: [
    { name: 'Cure Wounds', description: 'Seal wounds and restore vitality.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, damage: '1d8+WIS', damageType: 'Healing' },
    { name: 'Bless', description: 'Fortify spirits (Add 1d4 to attack/saves).', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5 }
  ],
  [Archetype.DarkKnight]: [
    { name: 'Dark Rite', description: 'Sacrifice vitality for necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, hpCost: 10, damage: '3d10', damageType: 'Necrotic' },
    { name: 'Hex', description: 'Curse a target to take extra necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, damage: '1d6', damageType: 'Necrotic' }
  ],
  [Archetype.BloodArtist]: [
    { name: 'Life Tap', description: 'Drain a foe to replenish thy own wells.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 0, hpCost: 5, damage: '1d10', damageType: 'Necrotic' }
  ]
};

export const ARCHETYPE_INFO: Record<string, { hpDie: number; role: Role; description: string; coreAbilities: Ability[]; spells?: Ability[]; starterGear: string[] }> = {
  [Archetype.Archer]: {
    hpDie: 8, role: 'DPS', description: 'Lithe hunters who strike from the shadows. Bound to Leather Armor.',
    coreAbilities: [
      { name: 'Sky-Splitter', description: 'Thy precision ignores half-cover and range penalties.', type: 'Passive', levelReq: 1 }
    ],
    starterGear: ['Hunting Bow', 'Leather Jerkin']
  },
  [Archetype.Thief]: {
    hpDie: 8, role: 'DPS', description: 'Masters of the quick blade and unseen step. Bound to Leather Armor.',
    coreAbilities: [
      { name: 'Lethal Ambush', description: 'Deal extra 2d6 damage when thou hast advantage.', type: 'Passive', levelReq: 1 }
    ],
    starterGear: ['Twin Daggers', 'Leather Jerkin']
  },
  [Archetype.Warrior]: {
    hpDie: 12, role: 'Tank', description: 'Steel-clad juggernauts who forsake shields for absolute devastation. Bound to Heavy Iron Plate.',
    coreAbilities: [
      { name: 'Charged Devastation', description: 'Every third successful hit deals double damage.', type: 'Passive', levelReq: 1 }
    ],
    starterGear: ['Double-Headed Greataxe', 'Heavy Iron Plate']
  },
  [Archetype.Fighter]: {
    hpDie: 10, role: 'Tank', description: 'Unyielding guardians with blade and bulwark. Bound to Steel Plate.',
    coreAbilities: [
      { name: 'Shield Bash', description: 'Force a foe to drop their guard; +2 to next attack.', type: 'Active', levelReq: 1, manaCost: 3 }
    ],
    starterGear: ['Soldier\'s Longsword', 'Iron Kite Shield', 'Steel Plate Armor']
  },
  [Archetype.DarkKnight]: {
    hpDie: 10, role: 'Tank', description: 'Warriors who use their own pain as a weapon. Bound to Obsidian Plate.',
    coreAbilities: [
      { name: 'Soul Rend', description: 'Heal for 25% of all necrotic damage dealt.', type: 'Passive', levelReq: 3 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight],
    starterGear: ['Vile Zweihander', 'Obsidian Heavy Plate']
  },
  [Archetype.Alchemist]: {
    hpDie: 8, role: 'Support', description: 'Brewers of tonics and volatile acids. Bound to Leather Armor.',
    coreAbilities: [
      { name: 'Quick Mix', description: 'Apply a tonic as a minor action.', type: 'Passive', levelReq: 3 }
    ],
    starterGear: ['Weighted Shortsword', 'Leather Jerkin']
  },
  [Archetype.Sorcerer]: {
    hpDie: 6, role: 'DPS', description: 'Conduits of raw power. Bound to Shadow Robes.',
    coreAbilities: [
      { name: 'Arcane Memory', description: 'Recall a manifestation once per day without mana.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Sorcerer],
    starterGear: ['Aetheric Staff', 'Shadow Robes']
  },
  [Archetype.Mage]: {
    hpDie: 6, role: 'Support', description: 'Healers of the fellowship. Bound to Ritual Robes.',
    coreAbilities: [
      { name: 'Harmonized Aether', description: 'Thy blessings reach one additional ally.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Mage],
    starterGear: ['Elderwood Staff', 'Ritual Robes']
  },
  [Archetype.BloodArtist]: {
    hpDie: 10, role: 'DPS', description: 'Collectors of life-force. Bound to Crimson Robes.',
    coreAbilities: [
      { name: 'Sanguine Link', description: 'Bind two hearts; damage to one affects both.', type: 'Active', levelReq: 1, manaCost: 10 }
    ],
    spells: SPELL_LIBRARY[Archetype.BloodArtist],
    starterGear: ['Serrated Sickle', 'Crimson Robes']
  }
};

export const MENTORS: Character[] = [
  {
    id: 'mentor-lina', name: 'Lina', age: 24, gender: 'Female', race: Race.Human, archetype: Archetype.Mage, role: 'Support', level: 5, exp: 0, maxHp: 35, currentHp: 35, maxMana: 50, currentMana: 50, stats: { str: 8, dex: 12, con: 12, int: 14, wis: 18, cha: 14 },
    currency: { aurels: 100 }, personality: 'A timid but focused healer.', inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.Mage] || [], abilities: ARCHETYPE_INFO[Archetype.Mage].coreAbilities,
    description: 'Serene priestess of the Aether. (Staff + Robes)', biography: 'She guided the first Fellowship through the obsidian mists.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-miri', name: 'Miri', age: 22, gender: 'Female', race: Race.Human, archetype: Archetype.Fighter, role: 'Tank', level: 5, exp: 0, maxHp: 52, currentHp: 52, maxMana: 30, currentMana: 30, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 12 },
    currency: { aurels: 50 }, personality: 'Energetic and unyielding.', inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Fighter].coreAbilities,
    description: 'Brave guardian of the gate. (Longsword + Shield + Plate)', biography: 'A soldier who refused to retreat when the sky turned green.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-seris', name: 'Seris', age: 112, gender: 'Male', race: Race.Elf, archetype: Archetype.Archer, role: 'DPS', level: 5, exp: 0, maxHp: 38, currentHp: 38, maxMana: 40, currentMana: 40, stats: { str: 10, dex: 18, con: 12, int: 14, wis: 14, cha: 10 },
    currency: { aurels: 150 }, personality: 'Aloof and precise.', inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Archer].coreAbilities,
    description: 'Reserved marksman of the mists. (Bow + Leather)', biography: 'Sentinel of the canopy, he sees the void before it arrives.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-kaelen', name: 'Kaelen', age: 34, gender: 'Male', race: Race.Orc, archetype: Archetype.Warrior, role: 'Tank', level: 5, exp: 0, maxHp: 65, currentHp: 65, maxMana: 30, currentMana: 30, stats: { str: 20, dex: 10, con: 18, int: 8, wis: 10, cha: 10 },
    currency: { aurels: 100 }, personality: 'Stoic and blunt.', inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Warrior].coreAbilities,
    description: 'A mountain of steel. (Greataxe + Plate)', biography: 'He shattered the First Pillar with a single swing.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-vane', name: 'Vane', age: 45, gender: 'Male', race: Race.Tiefling, archetype: Archetype.DarkKnight, role: 'Tank', level: 5, exp: 0, maxHp: 58, currentHp: 58, maxMana: 45, currentMana: 45, stats: { str: 16, dex: 10, con: 14, int: 12, wis: 12, cha: 18 },
    currency: { aurels: 80 }, personality: 'Cynical.', inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.DarkKnight] || [], abilities: ARCHETYPE_INFO[Archetype.DarkKnight].coreAbilities,
    description: 'Wielder of forbidden steel. (Zweihander + Plate)', biography: 'A knight who fed his own soul to the void.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-lyra', name: 'Lyra', age: 26, gender: 'Female', race: Race.Vesperian, archetype: Archetype.Thief, role: 'DPS', level: 5, exp: 0, maxHp: 42, currentHp: 42, maxMana: 40, currentMana: 40, stats: { str: 10, dex: 20, con: 12, int: 14, wis: 10, cha: 16 },
    currency: { aurels: 300 }, personality: 'Playful but lethal.', inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Thief].coreAbilities,
    description: 'Ghost of the shadows. (Daggers + Leather)', biography: 'She stole the breath from a dragon.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-elias', name: 'Elias', age: 52, gender: 'Male', race: Race.Dwarf, archetype: Archetype.Alchemist, role: 'Support', level: 5, exp: 0, maxHp: 48, currentHp: 48, maxMana: 50, currentMana: 50, stats: { str: 12, dex: 14, con: 16, int: 18, wis: 14, cha: 8 },
    currency: { aurels: 200 }, personality: 'Eccentric.', inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Alchemist].coreAbilities,
    description: 'Master of volatile reagents. (Shortsword + Leather)', biography: 'Inventor of the Cinder-Draft.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-xarth', name: 'Xarth', age: 150, gender: 'Male', race: Race.Elf, archetype: Archetype.Sorcerer, role: 'DPS', level: 5, exp: 0, maxHp: 32, currentHp: 32, maxMana: 80, currentMana: 80, stats: { str: 8, dex: 14, con: 10, int: 20, wis: 14, cha: 16 },
    currency: { aurels: 150 }, personality: 'Arrogant.', inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.Sorcerer] || [], abilities: ARCHETYPE_INFO[Archetype.Sorcerer].coreAbilities,
    description: 'Channel of destruction. (Staff + Robes)', biography: 'He unmade a city to prove a point.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-malphas', name: 'Malphas', age: 31, gender: 'Male', race: Race.Human, archetype: Archetype.BloodArtist, role: 'DPS', level: 5, exp: 0, maxHp: 55, currentHp: 55, maxMana: 40, currentMana: 40, stats: { str: 10, dex: 14, con: 20, int: 10, wis: 10, cha: 18 },
    currency: { aurels: 90 }, personality: 'Melancholic.', inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.BloodArtist] || [], abilities: ARCHETYPE_INFO[Archetype.BloodArtist].coreAbilities,
    description: 'Sculptor of vitals. (Sickle + Robes)', biography: 'He believes pain is art.', asiPoints: 0, activeStatuses: []
  }
];

export const RULES_MANIFEST = `
1. **THE ARBITER**: Gemini AI is the ultimate judge of fate.
2. **FIDELITY OF ARMS**: Vessels must wear gear aligned with their essence.
3. **SOUL ASCENSION**: Level cap is 20. Exp = 1000 * Level.
4. **BALANCED LEGION**: The Arbiter balances all challenges for a party of 4-5 vessels.
5. **THE LONE VANGUARD**: Should a Vessel vanquish a Boss-Class horror (CR 10+) without the assistance of others, the Arbiter MUST manifest a Relic or Legendary Boon.
`;

export const STARTER_CAMPAIGN_PROMPT = `The air is thick with iron. Thy Fellowship stands before 'The Broken Cask'. What is thy move?`;

export const TUTORIAL_SCENARIO = {
  title: "Resonance Ascension",
  prompt: `Thou awakenest as an Unbound Soul in the obsidian heart of the Sunken Sanctuary...`,
  beats: [
    "ACT 1: THE SOLITARY WAKE",
    "ACT 2: RITUAL OF UNCHAINING",
    "ACT 3: THE SOUL-FORGE",
    "ACT 4: THE VOID-SENT SENTINEL"
  ]
};

export const RAID_RECOMMENDATION = {
  warning: "RAID DETECTED: A Fellowship of 5-8 souls is advised for this cataclysmic trial.",
  tanks: 2,
  dps: 4,
  support: 2
};

export const APOTHECARY_TIERS = {
  HEALTH: [{ name: 'Minor Vitality Potion', desc: 'Seal shallow wounds.', cost: 50, lvl: 1 }],
  AETHER: [{ name: 'Aetheric Tincture', desc: 'Restores 20 Mana.', cost: 75, lvl: 1 }],
  DAMAGE: [{ name: 'Volatile Acid', desc: 'Deals 2d6 acid damage.', cost: 100, lvl: 3 }],
  PURITY: [{ name: 'Cinder-Draft', desc: 'Burns away toxins.', cost: 120, lvl: 1 }]
};

export const INITIAL_MONSTERS: Monster[] = [];
export const INITIAL_ITEMS: Item[] = [];
