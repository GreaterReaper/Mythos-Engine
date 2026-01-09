
import { Race, Archetype, Stats, Ability, Character, Monster, Item, Role, Currency } from './types';

export const STORAGE_PREFIX = 'mythos_soul_';

export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

export const SYNERGY_MAP: Record<string, { bestMatches: string[]; reason: string }> = {
  [Archetype.DarkKnight]: {
    bestMatches: [Archetype.Mage, Archetype.BloodArtist, Archetype.Archer],
    reason: "The Dark Knight sacrifices vitality for power; the Mage mends the self-inflicted wounds, while the Blood Artist feeds on the chaos. The Archer provides the necessary range to finish foes while the Knight holds the line."
  },
  [Archetype.Warrior]: {
    bestMatches: [Archetype.Sorcerer, Archetype.Alchemist, Archetype.Thief],
    reason: "A pure juggernaut requires high-impact magical support from the Sorcerer and tactical reagents from the Alchemist. The Thief exploits the chaos the Warrior creates."
  },
  [Archetype.Fighter]: {
    bestMatches: [Archetype.Mage, Archetype.Archer, Archetype.Sorcerer],
    reason: "The Fighter's unyielding defense allows glass cannons like the Sorcerer and Archer to manifest their full lethality from safety."
  },
  [Archetype.Thief]: {
    bestMatches: [Archetype.Warrior, Archetype.DarkKnight, Archetype.Alchemist],
    reason: "Thieves thrive when a heavy Tank draws the eye. The Alchemist provides the smoke and toxins required for a perfect escape."
  },
  [Archetype.Archer]: {
    bestMatches: [Archetype.Fighter, Archetype.Mage, Archetype.Thief],
    reason: "Archers require a frontline bulwark. The Mage's buffs ensure arrows find their mark even in the darkest mists."
  },
  [Archetype.Sorcerer]: {
    bestMatches: [Archetype.Fighter, Archetype.Warrior, Archetype.Mage],
    reason: "Raw destructive output requires absolute protection. Two tanks or a tank/healer combo are essential for a Sorcerer's survival."
  },
  [Archetype.Mage]: {
    bestMatches: [Archetype.DarkKnight, Archetype.Warrior, Archetype.BloodArtist],
    reason: "The Mage is the heart of the party. They pair best with high-HP vessels who can shield them from physical harm."
  },
  [Archetype.Alchemist]: {
    bestMatches: [Archetype.Thief, Archetype.Archer, Archetype.Fighter],
    reason: "The Alchemist enables tactical play. They pair with precision strikers who can capitalize on debuffed and poisoned foes."
  },
  [Archetype.BloodArtist]: {
    bestMatches: [Archetype.DarkKnight, Archetype.Warrior, Archetype.Sorcerer],
    reason: "Blood Artists manipulate the life-stream of the dying. They excel alongside those who dwell on the edge of death, turning carnage into fuel for the party."
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
  Blinded: "Sight is lost. Automatically fail checks relying on vision. Attackers gain advantage.",
  Stunned: "The mind reels. Inactive. Cannot move. Auto-fail STR and DEX saves.",
  Frightened: "Terror grips the heart. Disadvantage while the source is visible.",
  Paralyzed: "Limbs are unresponsive. Inactive. Attacks within 5ft are critical strikes.",
  Charmed: "Thy will is influenced. Cannot harm the charmer.",
  Bleeding: "Vitality drains from open wounds. Persistent minor damage each turn.",
  Exhausted: "The body fails. Slower movement and weakness in all checks."
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
    { name: 'Shield of Aether', description: 'A barrier of shimmering force protects you. +5 AC.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Aether Shards', description: 'Three shards of glowing glass strike targets.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Fireball', description: 'A massive explosion of heat.', type: 'Spell', levelReq: 5, baseLevel: 3 }
  ],
  [Archetype.Mage]: [
    { name: 'Cure Wounds', description: 'Seal wounds and restore vitality.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Bless', description: 'Fortify the spirits of allies. Add 1d4 to attack rolls and saves.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Lesser Restoration', description: 'Cleanse a single aetheric or physical blight (Poison, Blind, Bleed) from a soul.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Heal', description: 'A flood of vitality restores health.', type: 'Spell', levelReq: 11, baseLevel: 6 }
  ],
  [Archetype.DarkKnight]: [
    { name: 'Dark Rite', description: 'Sacrifice thy own vitality to deal necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Animate Dead', description: 'Force a remains to rise and serve.', type: 'Spell', levelReq: 5, baseLevel: 3 }
  ],
  [Archetype.BloodArtist]: [
    { name: 'Life Tap', description: 'Drain the vitality of a foe to replenish thy own.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Gore Cascade', description: 'A storm of razor-sharp shards.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ]
};

export const ARCHETYPE_INFO: Record<string, { hpDie: number; role: Role; description: string; coreAbilities: Ability[]; spells?: Ability[] }> = {
  [Archetype.Archer]: {
    hpDie: 8, role: 'DPS', description: 'Lithe hunters who strike from the shadows.',
    coreAbilities: [
      { name: 'Sky-Splitter', description: 'Precision that ignores the blur of distance.', type: 'Passive', levelReq: 1 },
      { name: 'Void Mark', description: 'Target a weak point for increased lethality.', type: 'Active', levelReq: 3 },
      { name: 'Shadow Step', description: 'Teleport to a nearby patch of darkness.', type: 'Active', levelReq: 7 },
      { name: 'Rain of Thorns', description: 'Volley of arrows that entangle the target.', type: 'Active', levelReq: 11 },
      { name: 'Perfect Execution', description: 'Thy shots never miss and ignore resistances.', type: 'Passive', levelReq: 15 }
    ]
  },
  [Archetype.Thief]: {
    hpDie: 8, role: 'DPS', description: 'Masters of the quick blade and the unseen step.',
    coreAbilities: [
      { name: 'Lethal Ambush', description: 'Strike with devastating force when unseen.', type: 'Passive', levelReq: 1 },
      { name: 'Cunning Action', description: 'Dash or Disengage as a minor movement.', type: 'Active', levelReq: 3 },
      { name: 'Evasion', description: 'Dodge area effects with preternatural grace.', type: 'Passive', levelReq: 7 },
      { name: 'Vanish', description: 'Become truly invisible for a brief moment.', type: 'Active', levelReq: 11 },
      { name: 'Death Strike', description: 'A single blow that can end any mortal life.', type: 'Active', levelReq: 15 }
    ]
  },
  [Archetype.Sorcerer]: {
    hpDie: 6, role: 'DPS', description: 'Conduits of raw, dangerous power.',
    coreAbilities: [
      { name: 'Arcane Memory', description: 'Recall a manifestation once per day.', type: 'Passive', levelReq: 1 },
      { name: 'Metamagic', description: 'Twist thy spells to reach further or hit harder.', type: 'Active', levelReq: 3 },
      { name: 'Elemental Shift', description: 'Change the energy type of thy next manifestation.', type: 'Active', levelReq: 7 },
      { name: 'Aetheric Reservoir', description: 'Restore spell slots in the heat of battle.', type: 'Active', levelReq: 11 },
      { name: 'Planar Breach', description: 'Summon energy directly from the void.', type: 'Active', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.Sorcerer]
  },
  [Archetype.Mage]: {
    hpDie: 6, role: 'Support', description: 'Healers and weavers of protective energy.',
    coreAbilities: [
      { name: 'Harmonized Aether', description: 'Thy blessings reach more allies.', type: 'Passive', levelReq: 1 },
      { name: 'Warding Halo', description: 'Create a static zone of protection.', type: 'Active', levelReq: 3 },
      { name: 'Beacon of Hope', description: 'Allies within range cannot be frightened.', type: 'Passive', levelReq: 7 },
      { name: 'Mending Presence', description: 'Automatically heal nearby allies for a small amount.', type: 'Passive', levelReq: 11 },
      { name: 'Divine Intervention', description: 'Call upon the higher realms for a miracle.', type: 'Active', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.Mage]
  },
  [Archetype.Warrior]: {
    hpDie: 12, role: 'Tank', description: 'Steel-clad juggernauts of the front line.',
    coreAbilities: [
      { name: 'Charged Devastation', description: 'Put every ounce of strength into thy next swing.', type: 'Active', levelReq: 1 },
      { name: 'Reckless Attack', description: 'Gain advantage at the cost of thy own defense.', type: 'Active', levelReq: 3 },
      { name: 'Brutal Critical', description: 'Roll extra damage on critical strikes.', type: 'Passive', levelReq: 7 },
      { name: 'Unyielding Rage', description: 'Thy HP cannot drop below 1 while active.', type: 'Active', levelReq: 11 },
      { name: 'Titan’s Grip', description: 'Wield massive weapons with one hand.', type: 'Passive', levelReq: 15 }
    ]
  },
  [Archetype.Fighter]: {
    hpDie: 10, role: 'Tank', description: 'Unyielding guardians with blade and bulwark.',
    coreAbilities: [
      { name: 'Shield Bash', description: 'Shatter the stance of thy enemy.', type: 'Active', levelReq: 1 },
      { name: 'Defender’s Stance', description: 'Take hits meant for nearby allies.', type: 'Active', levelReq: 3 },
      { name: 'Indomitable', description: 'Reroll a failed saving throw.', type: 'Active', levelReq: 7 },
      { name: 'Improved Critical', description: 'Critical strike on rolls of 19 or 20.', type: 'Passive', levelReq: 11 },
      { name: 'Master of Arms', description: 'Four attacks in a single turn.', type: 'Passive', levelReq: 15 }
    ]
  },
  [Archetype.DarkKnight]: {
    hpDie: 10, role: 'Tank', description: 'Warriors who use their own pain as a weapon.',
    coreAbilities: [
      { name: 'Living Dead', description: 'Sheer will keeps thy heart beating at 0 HP for a time.', type: 'Passive', levelReq: 1 },
      { name: 'Soul Rend', description: 'Heal for a portion of necrotic damage dealt.', type: 'Passive', levelReq: 3 },
      { name: 'Abyssal Grasp', description: 'Pull all nearby enemies toward thee.', type: 'Active', levelReq: 7 },
      { name: 'Dread Aura', description: 'Enemies near thee are permanently frightened.', type: 'Passive', levelReq: 11 },
      { name: 'Reaper’s Toll', description: 'A strike that consumes all remaining necrotic energy to execute.', type: 'Active', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight]
  },
  [Archetype.Alchemist]: {
    hpDie: 8, role: 'Support', description: 'Brewers of tonics and volatile acids.',
    coreAbilities: [
      { name: 'Harvester', description: 'Carve reagents from the remains of thy foes.', type: 'Passive', levelReq: 1 },
      { name: 'Experimental Brew', description: 'Create a random powerful potion each morning, including anti-toxins and mental stimulants.', type: 'Passive', levelReq: 3 },
      { name: 'Volatile Reaction', description: 'Thy explosions deal double damage to armor.', type: 'Passive', levelReq: 7 },
      { name: 'Toxic Catalyst', description: 'Apply multiple poisons with a single strike.', type: 'Active', levelReq: 11 },
      { name: 'Philosopher’s Stone', description: 'Transmute base metals or restore a fallen soul.', type: 'Active', levelReq: 15 }
    ]
  },
  [Archetype.BloodArtist]: {
    hpDie: 10, role: 'DPS', description: 'Elegant collectors of life-force and weavers of carnage.',
    coreAbilities: [
      { name: 'Sanguine Link', description: 'Bind two hearts together to share the toll.', type: 'Active', levelReq: 1 },
      { name: 'Hemorrhage', description: 'Every strike inflicts persistent bleeding.', type: 'Passive', levelReq: 3 },
      { name: 'Vitae Infusion', description: 'Consume blood to enhance thy physical attributes.', type: 'Active', levelReq: 7 },
      { name: 'Crimson Dance', description: 'Gain speed and extra attacks for every bleeding foe.', type: 'Passive', levelReq: 11 },
      { name: 'Heart-Stopper', description: 'Directly manipulate the pulse of a target to end it.', type: 'Active', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.BloodArtist]
  }
};

export const INITIAL_ITEMS: Item[] = [
  { id: 'w-c-sword', name: 'Iron Zweihander', description: 'A massive iron blade.', type: 'Weapon', rarity: 'Common', stats: { damage: '2d6+STR' }, archetypes: [Archetype.Warrior, Archetype.DarkKnight] },
  { id: 't-c-leather', name: 'Scout\'s Leather Tunic', description: 'Silent leather.', type: 'Armor', rarity: 'Common', stats: { ac: 11 }, archetypes: [Archetype.Thief, Archetype.Alchemist, Archetype.Archer] },
  { id: 's-c-staff', name: 'Ashwood Conduit', description: 'A simple staff.', type: 'Weapon', rarity: 'Common', stats: { int: 1 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] }
];

export const MENTORS: Character[] = [
  {
    id: 'mentor-lina', name: 'Lina', age: 24, gender: 'Female', race: Race.Human, archetype: Archetype.Mage, role: 'Support', level: 5, exp: 0, maxHp: 35, currentHp: 35, stats: { str: 8, dex: 12, con: 12, int: 14, wis: 18, cha: 14 },
    currency: { aurels: 100, shards: 50, ichor: 5 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.Mage] || [], abilities: ARCHETYPE_INFO[Archetype.Mage].coreAbilities,
    description: 'Serene priestess in gold and ivory.', biography: 'Guardian of the Sunken Sanctuary.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-miri', name: 'Miri', age: 22, gender: 'Female', race: Race.Human, archetype: Archetype.Fighter, role: 'Tank', level: 5, exp: 0, maxHp: 52, currentHp: 52, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 12 },
    currency: { aurels: 50, shards: 10, ichor: 2 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Fighter].coreAbilities,
    description: 'Energetic warrior.', biography: 'Frontier protector.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-seris', name: 'Seris', age: 112, gender: 'Male', race: Race.Elf, archetype: Archetype.Archer, role: 'DPS', level: 5, exp: 0, maxHp: 38, currentHp: 38, stats: { str: 10, dex: 18, con: 12, int: 14, wis: 14, cha: 10 },
    currency: { aurels: 150, shards: 30, ichor: 0 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Archer].coreAbilities,
    description: 'Reserved elf.', biography: 'Master of precision.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-kaelen', name: 'Kaelen', age: 31, gender: 'Male', race: Race.Tiefling, archetype: Archetype.DarkKnight, role: 'Tank', level: 5, exp: 0, maxHp: 48, currentHp: 48, stats: { str: 17, dex: 10, con: 15, int: 12, wis: 10, cha: 16 },
    currency: { aurels: 80, shards: 25, ichor: 4 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.DarkKnight] || [], abilities: ARCHETYPE_INFO[Archetype.DarkKnight].coreAbilities,
    description: 'Cold commander wearing a mask of indifference.', biography: 'Exiled prince.', asiPoints: 0, activeStatuses: []
  }
];

export const MENTOR_UNIQUE_GEAR: Record<string, Partial<Item>[]> = {
  'mentor-lina': [
    { name: 'Sun-Blessed Vestments', type: 'Armor', stats: { ac: 13 }, rarity: 'Rare' },
    { name: 'Radiant Dawn Conduit', type: 'Weapon', stats: { int: 2 }, rarity: 'Rare' }
  ],
  'mentor-miri': [
    { name: 'Frontier Bulwark', type: 'Armor', stats: { ac: 15 }, rarity: 'Rare' },
    { name: 'Veteran\'s Claymore', type: 'Weapon', stats: { str: 2 }, rarity: 'Rare' }
  ],
  'mentor-seris': [
    { name: 'Shadow-Thread Cloak', type: 'Armor', stats: { ac: 12 }, rarity: 'Rare' },
    { name: 'Void-Piercer Bow', type: 'Weapon', stats: { dex: 2 }, rarity: 'Rare' }
  ]
};

export const INITIAL_MONSTERS: Monster[] = [
  { id: 'mon-rat', name: 'Obsidian Rat', type: 'Beast', hp: 4, ac: 10, stats: { str: 4, dex: 12, con: 10, int: 2, wis: 10, cha: 4 }, abilities: [], description: 'Shadows with teeth.', cr: 0.125, activeStatuses: [] },
  { id: 'mon-wolf', name: 'Shadow Wolf', type: 'Beast', hp: 15, ac: 12, stats: { str: 14, dex: 14, con: 12, int: 3, wis: 12, cha: 6 }, abilities: [], description: 'Burning eyes.', cr: 1, activeStatuses: [] }
];

export const RULES_MANIFEST = `
1. **THE ARBITER**: Gemini AI is the ultimate judge. Reality is grounded; its word on physical outcomes is final.
2. **THE ARBITER'S HAND**: The Engine calculates and announces all initiative and dice outcomes automatically.
3. **EQUILIBRIUM**: The world is balanced for a Fellowship of 3 to 5 souls. 
4. **THE LONE VESSEL**: Solo play is "Heroic Mode." The Arbiter grants the lone player cinematic advantage.
5. **SOUL BANDS**: Certain archetypes resonate deeply. A Dark Knight should seek a Mage or Blood Artist to survive their own rituals.
6. **SOUL ASCENSION**: Progression requires 1,000 EXP * Level.
`;

export const STARTER_CAMPAIGN_PROMPT = `The air is thick with the scent of iron. Thy Fellowship stands before the iron-bound doors of 'The Broken Cask'. What is thy first move?`;

export const TUTORIAL_SCENARIO = {
  title: "The Fellowship of Five",
  prompt: `Thou awakenest in a stone amphitheater. Surrounding thee are four bound souls: Lina the Mage, Miri the Fighter, Seris the Archer, and thy destined mentor. To thy left, a pack of Shadow Wolves snarls. Thy quintet's journey begins now. What dost thou do?`
};

export const APOTHECARY_TIERS = {
  HEALTH: [{ name: 'Minor Vitality Potion', desc: 'Seal shallow wounds.', cost: 50, lvl: 1 }],
  AETHER: [{ name: 'Aetheric Tincture', desc: 'Restores a minor amount of magical reserve.', cost: 75, lvl: 1 }],
  DAMAGE: [{ name: 'Volatile Acid', desc: 'Deals 2d6 acid damage on impact.', cost: 100, lvl: 3 }],
  PURITY: [
    { name: 'Cinder-Draft', desc: 'A volatile tonic that burns away toxins (Cleanses Poisoned and Bleeding).', cost: 120, lvl: 1 },
    { name: 'Purifying Salts', desc: 'Aromatic salts that clear the mind (Cleanses Stunned and Frightened).', cost: 150, lvl: 3 }
  ]
};
