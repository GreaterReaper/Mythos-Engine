
import { Race, Archetype, Stats, Ability, Character, Monster, Item, Role, Currency } from './types';

export const STORAGE_PREFIX = 'mythos_soul_';

export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
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
  Poisoned: "Thy blood turns toxic. Disadvantage on attacks and checks.",
  Blinded: "Sight is lost. Automatically fail checks relying on vision. Attackers gain advantage.",
  Stunned: "The mind reels. Inactive. Cannot move. Auto-fail STR and DEX saves.",
  Frightened: "Terror grips the heart. Disadvantage while the source is visible.",
  Paralyzed: "Limbs turn to stone. Inactive. Attacks within 5ft are auto-crits.",
  Charmed: "Thy will is not thy own. Cannot harm the charmer.",
  Bleeding: "Life-force leaks from open wounds. 1d4 damage each turn.",
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
    { name: 'Chaos Bolt', description: 'Fire a bolt of unpredictable energy. Deals 2d8 damage of a random type.', type: 'Spell', levelReq: 1, baseLevel: 1, scaling: 'Deals extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Shield of Aether', description: 'A barrier of shimmering force protects you. +5 AC.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Aether Shards', description: 'Three shards of glowing glass strike targets. Deals 1d4+1 damage each.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Burning Hands', description: 'Flames shoot from thy fingertips. 3d6 fire damage in a 15ft cone.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Misty Step', description: 'Vanish into mist and reappear 30 feet away.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Fireball', description: 'A massive explosion of heat. 8d6 fire damage in a 20ft radius.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Lightning Bolt', description: 'A stroke of lightning 100 feet long blasts out. Deals 8d6 damage.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Disintegrate', description: 'A thin green ray that dissolves the body into dust. 10d6 + 40 damage.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Wish', description: 'Bending the physical world to thy spoken command.', type: 'Spell', levelReq: 17, baseLevel: 9 },
    { name: 'Exequy', description: 'The final dirge. Consumes all reserves to end a life instantly.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.Mage]: [
    { name: 'Cure Wounds', description: 'Seal open flesh and stop bleeding. 1d8 + WIS modifier HP.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Bless', description: 'Fortify the spirits of three allies. Add 1d4 to attack rolls and saves.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Revivify', description: 'Snatch a soul back to its warm body within one minute of death.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Flame Strike', description: 'A vertical column of fire strikes from the heavens.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Heal', description: 'A flood of vitality restores 70 HP and seals all wounds.', type: 'Spell', levelReq: 11, baseLevel: 6 }
  ],
  [Archetype.DarkKnight]: [
    { name: 'Blood Rite', description: 'Sacrifice thy own blood (5 HP) to deal 2d10 necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Hold Person', description: 'Bind the muscles of a target with dark authority.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Animate Dead', description: 'Force a corpse to rise and serve.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Blight', description: 'Necrotic energy withers the very cells of the target. 8d8 damage.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Power Word Kill', description: 'A word that stops the heart of any under 100 HP.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.BloodArtist]: [
    { name: 'Life Tap', description: 'Drain the blood of a foe to replenish thy own.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Hemoplague', description: 'Infect a target\'s blood, causing internal decay.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Transfusion', description: 'Equalize thy vitality with an ally.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Sanguine Puppet', description: 'Control a corpse by its remaining filaments of blood.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Gore Cascade', description: 'A storm of razor-sharp blood shards. 15d10 necrotic damage.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ]
};

export const ARCHETYPE_INFO: Record<string, { hpDie: number; role: Role; description: string; coreAbilities: Ability[]; spells?: Ability[] }> = {
  [Archetype.Archer]: {
    hpDie: 8, role: 'DPS', description: 'Lithe hunters who strike from the shadows.',
    coreAbilities: [
      { name: 'Sky-Splitter', description: 'Precision that ignores the blur of distance.', type: 'Passive', levelReq: 1 },
      { name: 'Void Mark', description: 'Target a weak point for increased lethality.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.Thief]: {
    hpDie: 8, role: 'DPS', description: 'Masters of the quick blade and the unseen step.',
    coreAbilities: [
      { name: 'Lethal Ambush', description: 'Strike with devastating force when unseen.', type: 'Passive', levelReq: 1 },
      { name: 'Smoke Veil', description: 'Hide within a physical cloud of choking ash.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.Sorcerer]: {
    hpDie: 6, role: 'DPS', description: 'Conduits of raw, dangerous power.',
    coreAbilities: [
      { name: 'Arcane Memory', description: 'Recall a manifestation once per day without draining reserves.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Sorcerer]
  },
  [Archetype.Mage]: {
    hpDie: 6, role: 'Support', description: 'Healers and weavers of protective energy.',
    coreAbilities: [
      { name: 'Harmonized Aether', description: 'Thy blessings reach more allies.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Mage]
  },
  [Archetype.Warrior]: {
    hpDie: 12, role: 'Tank', description: 'Steel-clad juggernauts of the front line.',
    coreAbilities: [
      { name: 'Charged Devastation', description: 'Put every ounce of muscle into thy next swing.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.Fighter]: {
    hpDie: 10, role: 'Tank', description: 'Unyielding guardians with blade and bulwark.',
    coreAbilities: [
      { name: 'Shield Bash', description: 'Shatter the stance of thy enemy.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.DarkKnight]: {
    hpDie: 10, role: 'Tank', description: 'Warriors who use their own pain as a weapon.',
    coreAbilities: [
      { name: 'Living Dead', description: 'Sheer will keeps thy heart beating at 0 HP for a time.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight]
  },
  [Archetype.Alchemist]: {
    hpDie: 8, role: 'Support', description: 'Brewers of tonics and volatile acids.',
    coreAbilities: [
      { name: 'Harvester', description: 'Carve reagents from the corpses of thy foes.', type: 'Passive', levelReq: 1 },
      { name: 'Transmutation', description: 'Forge elixirs from raw ingredients.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.BloodArtist]: {
    hpDie: 10, role: 'Support', description: 'Elegant collectors of life-force.',
    coreAbilities: [
      { name: 'Sanguine Link', description: 'Bind two hearts together to share the pain.', type: 'Active', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.BloodArtist]
  }
};

export const INITIAL_ITEMS: Item[] = [
  { id: 'w-c-sword', name: 'Iron Zweihander', description: 'A massive, heavy iron blade that requires two hands.', type: 'Weapon', rarity: 'Common', stats: { damage: '2d6+STR' }, archetypes: [Archetype.Warrior, Archetype.DarkKnight] },
  { id: 'w-c-plate', name: 'Soldier\'s Plate', description: 'Cold, hard iron plate. Heavy and loud.', type: 'Armor', rarity: 'Common', stats: { ac: 16 }, archetypes: [Archetype.Warrior, Archetype.Fighter, Archetype.DarkKnight] },
  { id: 'f-c-sword', name: 'Steel Gladius', description: 'A reliable blade for one hand.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+STR' }, archetypes: [Archetype.Fighter] },
  { id: 'f-c-shield', name: 'Iron Heater Shield', description: 'Solid iron for the shield-arm.', type: 'Armor', rarity: 'Common', stats: { ac: 2 }, archetypes: [Archetype.Fighter] },
  { id: 't-c-short', name: 'Rogue\'s Shortsword', description: 'Sharp and easy to conceal.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d6+DEX' }, archetypes: [Archetype.Thief, Archetype.Alchemist] },
  { id: 't-c-leather', name: 'Scout\'s Leather Tunic', description: 'Silent leather, smelling of oil.', type: 'Armor', rarity: 'Common', stats: { ac: 11 }, archetypes: [Archetype.Thief, Archetype.Alchemist, Archetype.Archer] },
  { id: 'a-c-bow', name: 'Frontier Longbow', description: 'Sturdy yew wood with a heavy draw.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+DEX' }, archetypes: [Archetype.Archer] },
  { id: 's-c-staff', name: 'Ashwood Conduit', description: 'A simple staff, worn by use.', type: 'Weapon', rarity: 'Common', stats: { int: 1 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 'start-hp-pot', name: 'Minor Vitality Potion', description: 'Restores life. Tastes like iron.', type: 'Utility', rarity: 'Common', stats: {}, archetypes: [] }
];

export const MENTOR_UNIQUE_GEAR: Record<string, Partial<Item>[]> = {
  'mentor-lina': [
    { name: 'Ivory Arcanum', description: 'Lina\'s personal ivory conduit.', type: 'Weapon', rarity: 'Epic', stats: { wis: 2 }, isUnique: true },
    { name: 'Sunken Silk', description: 'Sanctuary vestments.', type: 'Armor', rarity: 'Epic', stats: { ac: 12 }, isUnique: true }
  ],
  'mentor-miri': [
    { name: 'Ribboned Bastard Sword', description: 'Miri\'s decorated blade.', type: 'Weapon', rarity: 'Epic', stats: { damage: '1d10+STR' }, isUnique: true },
    { name: 'Frontier Bulwark', description: 'Her unyielding plate.', type: 'Armor', rarity: 'Epic', stats: { ac: 18 }, isUnique: true }
  ],
  'mentor-seris': [
    { name: 'Obsidian Sight', description: 'Seris\'s longbow.', type: 'Weapon', rarity: 'Epic', stats: { damage: '1d8+DEX', dex: 2 }, isUnique: true },
    { name: 'Midnight Cloak', description: 'Silent Elven leather.', type: 'Armor', rarity: 'Epic', stats: { ac: 14 }, isUnique: true }
  ]
};

export const MENTORS: Character[] = [
  {
    id: 'mentor-lina', name: 'Lina', age: 24, gender: 'Female', race: Race.Human, archetype: Archetype.Mage, role: 'Support', level: 5, exp: 0, maxHp: 35, currentHp: 35, stats: { str: 8, dex: 12, con: 12, int: 14, wis: 18, cha: 14 },
    currency: { aurels: 100, shards: 50, ichor: 5 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.Mage] || [], abilities: ARCHETYPE_INFO[Archetype.Mage].coreAbilities,
    description: 'Serene priestess in gold and ivory.', biography: 'Guardian of the Sunken Sanctuary.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-miri', name: 'Miri', age: 22, gender: 'Female', race: Race.Human, archetype: Archetype.Fighter, role: 'Tank', level: 5, exp: 0, maxHp: 52, currentHp: 52, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 12 },
    currency: { aurels: 50, shards: 10, ichor: 2 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Fighter].coreAbilities,
    description: 'Energetic warrior with ribbons on her plate.', biography: 'Frontier protector.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-seris', name: 'Seris', age: 112, gender: 'Male', race: Race.Elf, archetype: Archetype.Archer, role: 'DPS', level: 5, exp: 0, maxHp: 38, currentHp: 38, stats: { str: 10, dex: 18, con: 12, int: 14, wis: 14, cha: 10 },
    currency: { aurels: 150, shards: 30, ichor: 0 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Archer].coreAbilities,
    description: 'Reserved elf with eyes like obsidian.', biography: 'Master of precision.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-kaelen', name: 'Kaelen', age: 31, gender: 'Male', race: Race.Tiefling, archetype: Archetype.DarkKnight, role: 'Tank', level: 5, exp: 0, maxHp: 48, currentHp: 48, stats: { str: 17, dex: 10, con: 15, int: 12, wis: 10, cha: 16 },
    currency: { aurels: 80, shards: 25, ichor: 4 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.DarkKnight] || [], abilities: ARCHETYPE_INFO[Archetype.DarkKnight].coreAbilities,
    description: 'Cold commander wearing a mask of indifference.', biography: 'Exiled prince of a shadow realm.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-valerius', name: 'Valerius', age: 29, gender: 'Male', race: Race.Vesperian, archetype: Archetype.BloodArtist, role: 'Support', level: 5, exp: 0, maxHp: 45, currentHp: 45, stats: { str: 10, dex: 14, con: 16, int: 12, wis: 12, cha: 18 },
    currency: { aurels: 200, shards: 40, ichor: 6 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.BloodArtist] || [], abilities: ARCHETYPE_INFO[Archetype.BloodArtist].coreAbilities,
    description: 'Artist who paints in the life-stream.', biography: 'Noble artist.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-jax', name: 'Jax', age: 26, gender: 'Male', race: Race.Tabaxi, archetype: Archetype.Thief, role: 'DPS', level: 5, exp: 0, maxHp: 40, currentHp: 40, stats: { str: 12, dex: 20, con: 12, int: 10, wis: 14, cha: 12 },
    currency: { aurels: 300, shards: 15, ichor: 2 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Thief].coreAbilities,
    description: 'Predatory grace and intimidating silence.', biography: 'Predator-rival.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-xylar', name: 'Xylar', age: 45, gender: 'Male', race: Race.Dwarf, archetype: Archetype.Sorcerer, role: 'DPS', level: 5, exp: 0, maxHp: 32, currentHp: 32, stats: { str: 10, dex: 10, con: 14, int: 18, wis: 14, cha: 12 },
    currency: { aurels: 120, shards: 100, ichor: 8 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.Sorcerer] || [], abilities: ARCHETYPE_INFO[Archetype.Sorcerer].coreAbilities,
    description: 'Academic of aetheric geometry.', biography: 'Prideful professor.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-brunnhilde', name: 'Brunnhilde', age: 52, gender: 'Female', race: Race.Goliath, archetype: Archetype.Warrior, role: 'Tank', level: 5, exp: 0, maxHp: 65, currentHp: 65, stats: { str: 20, dex: 10, con: 18, int: 8, wis: 12, cha: 10 },
    currency: { aurels: 40, shards: 5, ichor: 3 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Warrior].coreAbilities,
    description: 'Giant with protective rage.', biography: 'Steel matriarch.', asiPoints: 0, activeStatuses: []
  },
  {
    id: 'mentor-alaric', name: 'Alaric', age: 38, gender: 'Male', race: Race.Human, archetype: Archetype.Alchemist, role: 'Support', level: 5, exp: 0, maxHp: 42, currentHp: 42, stats: { str: 10, dex: 14, con: 14, int: 18, wis: 14, cha: 10 },
    currency: { aurels: 90, shards: 60, ichor: 10 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Alchemist].coreAbilities,
    description: 'Apothecary smelling of sulfur.', biography: 'Chemical specialist.', asiPoints: 0, activeStatuses: []
  }
];

export const INITIAL_MONSTERS: Monster[] = [
  { id: 'mon-rat', name: 'Obsidian Rat', type: 'Beast', hp: 4, ac: 10, stats: { str: 4, dex: 12, con: 10, int: 2, wis: 10, cha: 4 }, abilities: [{ name: 'Naw', description: '1 damage.', type: 'Active', levelReq: 1 }], description: 'Scurrying shadows with teeth like glass.', cr: 0.125, activeStatuses: [] },
  { id: 'mon-skel', name: 'Restless Bones', type: 'Undead', hp: 13, ac: 13, stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 }, abilities: [{ name: 'Rusted Blade', description: '1d6+2 damage.', type: 'Active', levelReq: 1 }], description: 'Necrotic clatter of bone on iron.', cr: 0.25, activeStatuses: [] },
  { id: 'mon-wolf', name: 'Shadow Wolf', type: 'Beast', hp: 15, ac: 12, stats: { str: 14, dex: 14, con: 12, int: 3, wis: 12, cha: 6 }, abilities: [{ name: 'Bite', description: '1d6+2 damage.', type: 'Active', levelReq: 1 }], description: 'Lithe muscle and burning eyes.', cr: 1, activeStatuses: [] },
  { id: 'mon-knight', name: 'Fallen Paladin', type: 'Undead', hp: 110, ac: 20, stats: { str: 20, dex: 10, con: 18, int: 12, wis: 16, cha: 18 }, resistances: ["Necrotic", "Poison"], vulnerabilities: ["Radiant"], abilities: [{ name: 'Unholy Smite', description: '3d8 necrotic extra.', type: 'Active', levelReq: 1 }], description: 'A massive knight in blood-stained plate.', cr: 12, activeStatuses: [] }
];

export const RULES_MANIFEST = `
1. **THE ARBITER OF BLOOD**: Gemini AI is the ultimate judge. Reality is visceral; its word on physical outcomes is final.
2. **SOUL ASCENSION**: Progression requires 1,000 EXP * Level. Each level brings physical growth and refined attributes.
3. **BLOOD & IRON**: Wounds are real. describe the spray of blood and the sound of steel. This is not a game to the characters.
4. **TACTICS**: The Grid represents 100 square feet of real, blood-soaked ground.
5. **CRITICAL FATE**: Overcoming lethal odds results in legendary rewards. multiplied by the grit of thy victory.
6. **SACRED GARB**: Warrior/Fighter/Dark Knight wear Plate. Thief/Alchemist/Archer wear Leather. Sorcerer/Mage/Blood Artist wear Robes.
7. **FIDELITY OF ARMS**: Warriors carry heavy iron. Thieves carry hidden steel. Mages carry ancient conduits.
`;

export const STARTER_CAMPAIGN_PROMPT = `The air is thick with the scent of iron and ancient rot. Thy party stands before the iron-bound doors of 'The Broken Cask', lantern-light painting long, jagged shadows against the valley's obsidian walls. To the North, the Whispering Woods moan with a hunger for flesh. To the East, the Maw of the Engine vibrates with a bone-shaking frequency. What is thy first move in this dying, blood-soaked world?`;

export const TUTORIAL_SCENARIO = {
  title: "The Path of Blood",
  prompt: `Thou awakenest on the cold, obsidian floor. The sky is a void, save for the rhythmic, emerald pulse above. The air tastes of copper. To thy left, a pack of Shadow Wolves snarls, their muzzles stained with fresh red. To thy right, a jagged trail leads toward the First Citadel. Thy journey begins now. What dost thou do?`
};

export const APOTHECARY_TIERS = {
  HEALTH: [
    { name: 'Minor Vitality Potion', desc: 'Seal shallow wounds. Restores 2d4+2 HP.', cost: 50, lvl: 1 },
    { name: 'Greater Vitality Potion', desc: 'Mend broken bones. Restores 4d4+4 HP.', cost: 150, lvl: 5 },
    { name: 'Superior Vitality Potion', desc: 'Knock on death\'s door and walk away. Restores 8d4+8 HP.', cost: 450, lvl: 11 }
  ],
  AETHER: [
    { name: 'Essence of Clarity', desc: 'Restore a 1st level spell slot.', cost: 100, lvl: 3 },
    { name: 'Draft of Arcane Focus', desc: 'Restore a 3rd level spell slot.', cost: 300, lvl: 7 },
    { name: 'Philter of High Sorcery', desc: 'Restore a 5th level spell slot.', cost: 900, lvl: 13 }
  ],
  DAMAGE: [
    { name: 'Vial of Corrosive Acid', desc: 'Deals 2d6 acid damage on impact.', cost: 75, lvl: 2 },
    { name: 'Flask of Liquid Fire', desc: 'Deals 3d6 fire damage in a 5ft radius.', cost: 200, lvl: 6 },
    { name: 'Extract of Necrotic Rot', desc: 'Deals 5d8 necrotic damage and poisons the target.', cost: 600, lvl: 12 }
  ]
};
