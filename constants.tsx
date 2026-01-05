
import { Race, Archetype, Stats, Ability, Character, Monster, Item } from './types';

export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
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

export const SPELL_SLOT_PROGRESSION: Record<number, Record<number, number>> = {
  1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 }, 4: { 1: 4, 2: 3 }, 5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 }, 7: { 1: 4, 2: 3, 3: 3, 4: 1 }, 8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, 10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, 12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, 14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, 16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, 18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, 20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

export const SPELL_LIBRARY: Record<string, Ability[]> = {
  [Archetype.Sorcerer]: [
    { name: 'Chaos Bolt', description: 'Fire a bolt of unpredictable energy. Deals 2d8 damage of a random aetheric type.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Shield of Aether', description: 'An invisible barrier of force appears to protect you. +5 AC.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Burning Hands', description: 'A thin sheet of flames shoots from your fingertips.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Misty Step', description: 'Teleport up to 30 feet to an unoccupied space you can see.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Shatter', description: 'A sudden loud ringing noise deals 3d8 thunder damage.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Fireball', description: 'A bright streak blossoms into an explosion. 8d6 fire damage in a 20ft radius.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Counterspell', description: 'Attempt to interrupt a creature in the process of casting a spell.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Banishment', description: 'Attempt to send a creature to another plane of existence.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Cone of Cold', description: 'A blast of cold air erupts. 8d8 cold damage in a 60ft cone.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Disintegrate', description: 'A thin green ray dealing 10d6 + 40 force damage.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Dominate Person', description: 'Attempt to beguile a humanoid into your service.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Meteor Swarm', description: 'Call down four meteors dealing 20d6 fire and bludgeoning damage.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.Mage]: [
    { name: 'Divine Aegis', description: 'Surround an ally in golden light. Absorbs 10 damage and grants +2 AC.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Cure Wounds', description: 'A creature you touch regains 1d8 + WIS modifier HP.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Healing Word', description: 'Heal a creature within 60ft for 1d4 + WIS modifier HP.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Bless', description: 'Bless up to three creatures. Add 1d4 to attack rolls and saves.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Lesser Restoration', description: 'End one condition on a creature: blinded, deafened, paralyzed, or poisoned.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Spiritual Weapon', description: 'Create a floating weapon that can attack as a bonus action.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Prayer of Healing', description: 'Heal up to six allies for 2d8 + WIS HP.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Beacon of Hope', description: 'Allies within 30ft gain advantage on WIS saves and maximize healing.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Revivify', description: 'Return a creature that has died within the last minute to life with 1 HP.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Greater Restoration', description: 'Remove exhaustion or one severe condition.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Holy Weapon', description: 'Imbue a weapon with 2d8 radiant damage per hit.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Mass Heal', description: 'A flood of healing energy restores 700 HP divided among targets.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.DarkKnight]: [
    { name: 'Blood Rite', description: 'Sacrifice 5 HP to deal 2d10 necrotic damage and slow the target.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'False Life', description: 'Gain 1d4 + 4 temporary HP.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Ray of Enfeeblement', description: 'A black beam of enervating energy saps strength.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Shadow Blade', description: 'Weave a blade of solidified gloom. 2d8 psychic damage.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Animate Dead', description: 'Raise a skeleton or zombie from a corpse.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Vampiric Touch', description: 'Touch siphons life. Deal 3d6 necrotic damage and heal for half.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Blight', description: 'Necrotic energy washes over a creature. 8d8 necrotic damage.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Enervation', description: 'Drain life from a distance. 4d8 necrotic damage per turn.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Abyssal Presence', description: 'Project an aura of dread. All enemies within 10ft have Disadvantage.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Circle of Death', description: 'A sphere of negative energy deals 8d6 necrotic damage.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Finger of Death', description: 'Send negative energy through a creature, causing 7d8 + 30 necrotic damage.', type: 'Spell', levelReq: 13, baseLevel: 7 },
    { name: 'Power Word Kill', description: 'Compel one creature with 100 HP or less to die instantly.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ]
};

export const ARCHETYPE_INFO: Record<string, { hpDie: number; description: string; coreAbilities: Ability[]; spells?: Ability[] }> = {
  [Archetype.Archer]: {
    hpDie: 8, description: 'Precision masters who dominate from afar. They excel at grounding flying threats.',
    coreAbilities: [
      { name: 'Sky-Splitter', description: 'Ignore disadvantage against long-range or flying targets. Deal +1d6 to airborne foes.', type: 'Passive', levelReq: 1 },
      { name: 'Void Mark', description: 'Mark a target within 60ft. Your next attack against them has Advantage and deals +1d8 damage.', type: 'Active', levelReq: 1 },
      { name: 'Trick Shot', description: 'Fire an arrow that triggers an effect: Flare (Blinds), Frost (Slows), or Cable (Tethers).', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.Thief]: {
    hpDie: 8, description: 'Agile infiltrators who exploit chaos. They move like liquid and strike where the enemy is most vulnerable.',
    coreAbilities: [
      { name: 'Lethal Ambush', description: 'Deal +2d6 damage to targets that are Grappled, Prone, or haven\'t acted yet.', type: 'Passive', levelReq: 1 },
      { name: 'Smoke Veil', description: 'Create a 10ft cloud of shadow. You and allies inside are Heavily Obscured.', type: 'Active', levelReq: 1 },
      { name: 'Cunning Action', description: 'You can take the Dash, Disengage, or Hide action as a Bonus Action.', type: 'Passive', levelReq: 1 }
    ]
  },
  [Archetype.Sorcerer]: {
    hpDie: 6, description: 'Conduits of raw aetheric destruction. They sacrifice physical durability for power.',
    coreAbilities: [
      { name: 'Arcane Memory', description: 'Once per day, cast a known spell without consuming a spell slot.', type: 'Passive', levelReq: 1 },
      { name: 'Aetheric Potency', description: 'Add your INT modifier to the damage of any spell that deals damage.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Sorcerer]
  },
  [Archetype.Mage]: {
    hpDie: 6, description: 'Keepers of the harmonized weave. They focus on restoration, shielding, and amplifying souls.',
    coreAbilities: [
      { name: 'Harmonized Aether', description: 'Your single-target buffs can affect one additional adjacent ally automatically.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Mage]
  },
  [Archetype.Warrior]: {
    hpDie: 12, description: 'Relentless titans of the front line. They turn their own pain into a weapon of absolute devastation.',
    coreAbilities: [
      { name: 'Charged Devastation', description: 'Ready a strike. Damage taken before your next turn is added to your next successful hit.', type: 'Active', levelReq: 1 },
      { name: 'Battle Roar', description: 'Nearby enemies must make a WIS save or be Frightened.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.Fighter]: {
    hpDie: 10, description: 'Unyielding protectors. A Fighter with a shield is a fortress that denies the enemy ground.',
    coreAbilities: [
      { name: 'Shield Bash', description: 'Strike with your shield. Target must succeed on a STR save or be knocked Prone.', type: 'Active', levelReq: 1 },
      { name: 'Shield Fortress', description: 'While wielding a shield, you and all adjacent allies gain +2 AC.', type: 'Passive', levelReq: 1 }
    ]
  },
  [Archetype.DarkKnight]: {
    hpDie: 10, description: 'Warriors who walk the edge of the abyss. They siphon vitality and defy death through sheer will.',
    coreAbilities: [
      { name: 'Living Dead', description: 'Upon dropping to 0 HP, survive for 1 turn. If healed above 0 before turn end, you remain standing.', type: 'Passive', levelReq: 1 },
      { name: 'Shadow Clone', description: 'Manifest a shadow that distracts foes. Grant Disadvantage to the next attack.', type: 'Active', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight]
  }
};

export const INITIAL_ITEMS: Item[] = [
  // --- WEAPONS ---
  { id: 'start-bow', name: 'Frontier Bow', description: 'A sturdy longbow made of darkened yew.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+DEX' }, archetypes: [Archetype.Archer, Archetype.Thief] },
  { id: 'start-dagger', name: 'Scoundrel\'s Dirk', description: 'A serrated blade favored by those who strike from shadow.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d4+DEX' }, archetypes: [Archetype.Thief, Archetype.Archer] },
  { id: 'start-staff', name: 'Ashwood Conduit', description: 'A simple staff used to focus aetheric energies.', type: 'Weapon', rarity: 'Common', stats: { int: 1 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 'start-sword', name: 'Soldier\'s Blade', description: 'A reliable iron longsword.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+STR' }, archetypes: [Archetype.Warrior, Archetype.Fighter, Archetype.DarkKnight] },
  { id: 'start-hammer', name: 'Iron Maul', description: 'A heavy hammer for crushing skulls and shields.', type: 'Weapon', rarity: 'Common', stats: { damage: '2d6+STR' }, archetypes: [Archetype.Warrior, Archetype.Fighter] },
  
  // Uncommon
  { id: 'un-rapier', name: 'Duelist\'s Rapier', description: 'A needle-thin blade for precise punctures.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '1d8+DEX' }, archetypes: [Archetype.Thief, Archetype.Archer] },
  { id: 'un-mace', name: 'Heavy Flail', description: 'A spiked iron ball on a chain.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '1d10+STR' }, archetypes: [Archetype.Warrior, Archetype.Fighter] },
  { id: 'un-wand', name: 'Bone Wand', description: 'A wand carved from a sorcerer\'s femur.', type: 'Weapon', rarity: 'Uncommon', stats: { int: 2 }, archetypes: [Archetype.Sorcerer, Archetype.Mage, Archetype.DarkKnight] },

  // Rare
  { id: 'rare-obsidian-blade', name: 'Obsidian Fang', description: 'A blade forged from volcanic glass, eternally sharp.', type: 'Weapon', rarity: 'Rare', stats: { damage: '1d10+STR', str: 1 }, archetypes: [Archetype.Warrior, Archetype.DarkKnight, Archetype.Fighter] },
  { id: 'rare-wind-bow', name: 'Zephyr Bow', description: 'A bow that whispers as arrows fly true on the wind.', type: 'Weapon', rarity: 'Rare', stats: { damage: '1d10+DEX', dex: 1 }, archetypes: [Archetype.Archer] },
  { id: 'rare-soul-dagger', name: 'Ghost Dirk', description: 'Strikes both the flesh and the spirit.', type: 'Weapon', rarity: 'Rare', stats: { damage: '1d6+DEX', cha: 1 }, archetypes: [Archetype.Thief, Archetype.DarkKnight] },
  
  // Epic
  { id: 'epic-void-reaver', name: 'Void Reaver', description: 'A massive 2H greatsword forged from obsidian, humming with a dark energy.', type: 'Weapon', rarity: 'Epic', stats: { damage: '2d10+STR', con: 2 }, archetypes: [Archetype.DarkKnight, Archetype.Warrior] },
  { id: 'epic-sun-staff', name: 'Solar Focus', description: 'A staff tipped with a fragment of a captured star.', type: 'Weapon', rarity: 'Epic', stats: { wis: 3, cha: 1 }, archetypes: [Archetype.Mage, Archetype.Sorcerer] },
  { id: 'epic-shadow-claws', name: 'Umbral Talons', description: 'Set of obsidian claws that extend from the user\'s shadows.', type: 'Weapon', rarity: 'Epic', stats: { damage: '2d6+DEX', dex: 2 }, archetypes: [Archetype.Thief] },

  // Legendary
  { id: 'legendary-star-hammer', name: 'Star-Forged Hammer', description: 'Forged in the heart of a dying star.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '4d6+STR', str: 3, con: 3 }, archetypes: [Archetype.Warrior, Archetype.Fighter] },
  { id: 'legendary-infinite-string', name: 'Artemis\' Regret', description: 'A bow with a string made of solidified moonlight.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '2d12+DEX', dex: 5 }, archetypes: [Archetype.Archer] },

  // --- ARMOR ---
  { id: 'start-robes', name: 'Apprentice Robes', description: 'Simple linen robes that allow for free movement of aether. Cloth armor.', type: 'Armor', rarity: 'Common', stats: { ac: 10 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 'start-leather', name: 'Scout\'s Leather', description: 'Boiled leather armor that permits easy movement.', type: 'Armor', rarity: 'Common', stats: { ac: 11 }, archetypes: [Archetype.Archer, Archetype.Thief] },
  { id: 'start-plate', name: 'Rusty Plate', description: 'Old, noisy metal armor.', type: 'Armor', rarity: 'Common', stats: { ac: 15 }, archetypes: [Archetype.Warrior, Archetype.Fighter, Archetype.DarkKnight] },
  { id: 'start-shield', name: 'Rusted Aegis', description: 'A battered iron shield.', type: 'Armor', rarity: 'Common', stats: { ac: 2 }, archetypes: [Archetype.Fighter, Archetype.Warrior] },
  { id: 'un-studded', name: 'Studded Brigandine', description: 'Reinforced leather for more durability.', type: 'Armor', rarity: 'Uncommon', stats: { ac: 13 }, archetypes: [Archetype.Archer, Archetype.Thief] },
  { id: 'rare-aether-robe', name: 'Vestments of the Void', description: 'Cloth robes woven with silk that seems to swallow light.', type: 'Armor', rarity: 'Rare', stats: { ac: 12, int: 2 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 'rare-shield', name: 'Gilded Aegis', description: 'A shield used by the high guard of Oakhaven.', type: 'Armor', rarity: 'Rare', stats: { ac: 3, wis: 1 }, archetypes: [Archetype.Fighter, Archetype.Warrior] },
  { id: 'epic-dread-plate', name: 'Dreadnought Shell', description: 'Armor made from the scales of a shadow drake.', type: 'Armor', rarity: 'Epic', stats: { ac: 19, con: 2 }, archetypes: [Archetype.Warrior, Archetype.DarkKnight] },
  { id: 'legendary-archon-plate', name: 'Celestial Carapace', description: 'Armor said to be worn by the first hero of the Engine.', type: 'Armor', rarity: 'Legendary', stats: { ac: 22, str: 2, cha: 2 }, archetypes: [Archetype.Fighter, Archetype.Warrior] },
  { id: 'legendary-mirror-shield', name: 'Mirror-Glass Bulwark', description: 'A shield polished to a mirror sheen. Reflects the faces and baleful powers of foes back upon them, that they might know their own horror. Passive: Reflects gaze attacks back at foes.', type: 'Armor', rarity: 'Legendary', stats: { ac: 4, wis: 2, cha: 2 }, archetypes: [Archetype.Fighter, Archetype.Warrior] },

  // --- UTILITY ---
  { id: 'un-ring', name: 'Aether Ring', description: 'A ring that hums with low-level magic.', type: 'Utility', rarity: 'Uncommon', stats: { int: 1 } },
  { id: 'rare-amulet', name: 'Locket of Lost Souls', description: 'Provides a small bonus to focus.', type: 'Utility', rarity: 'Rare', stats: { wis: 2 } },
  { id: 'epic-tome', name: 'Grimoire of the Abyss', description: 'Contains forbidden knowledge of the void.', type: 'Utility', rarity: 'Epic', stats: { int: 4, wis: -1 } }
];

export const MENTORS: Character[] = [
  {
    id: 'mentor-lina',
    name: 'Lina',
    age: 21,
    gender: 'Female',
    race: Race.Human,
    archetype: Archetype.Mage,
    level: 5,
    exp: 0,
    maxHp: 52,
    currentHp: 52,
    stats: { str: 9, dex: 13, con: 15, int: 13, wis: 19, cha: 13 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-staff')!, INITIAL_ITEMS.find(i => i.id === 'start-robes')!],
    spells: SPELL_LIBRARY[Archetype.Mage],
    abilities: ARCHETYPE_INFO[Archetype.Mage].coreAbilities,
    spellSlots: { 1: 4, 2: 3, 3: 2 },
    maxSpellSlots: { 1: 4, 2: 3, 3: 2 },
    description: 'A petite, shy priestess from a rural chapel. She wears simple white and gold cloth robes.',
    asiPoints: 0
  },
  {
    id: 'mentor-miri',
    name: 'Miri',
    age: 19,
    gender: 'Female',
    race: Race.Human,
    archetype: Archetype.Fighter,
    level: 5,
    exp: 0,
    maxHp: 68,
    currentHp: 68,
    stats: { str: 19, dex: 13, con: 17, int: 9, wis: 13, cha: 11 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-sword')!, INITIAL_ITEMS.find(i => i.id === 'start-shield')!, INITIAL_ITEMS.find(i => i.id === 'start-plate')!],
    spells: [],
    abilities: ARCHETYPE_INFO[Archetype.Fighter].coreAbilities,
    description: 'An energetic and impulsive swordswoman with a bright, playful personality. She wears ribbon-adorned half-plate.',
    asiPoints: 0
  },
  {
    id: 'mentor-seris',
    name: 'Seris',
    age: 120,
    gender: 'Female',
    race: Race.Elf,
    archetype: Archetype.Archer,
    level: 5,
    exp: 0,
    maxHp: 54,
    currentHp: 54,
    stats: { str: 11, dex: 21, con: 15, int: 13, wis: 13, cha: 9 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-bow')!, INITIAL_ITEMS.find(i => i.id === 'start-leather')!],
    spells: [],
    abilities: ARCHETYPE_INFO[Archetype.Archer].coreAbilities,
    description: 'A reserved, sharp-eyed elven archer who prefers quiet distance and composure.',
    asiPoints: 0
  }
];

export const INITIAL_MONSTERS: Monster[] = [
  // --- GOBLINOID ---
  {
    id: 'monster-goblin-scavenger',
    name: 'Goblin Scavenger',
    type: 'Goblinoid',
    hp: 14,
    ac: 13,
    abilities: [{ name: 'Nimble Escape', description: 'Can disengage or hide as a bonus action.', type: 'Passive', levelReq: 1 }],
    description: 'A small, wretched green-skinned pest wearing scrap-metal armor.',
    expReward: 50
  },
  {
    id: 'monster-hobgoblin-captain',
    name: 'Hobgoblin Captain',
    type: 'Goblinoid',
    hp: 40,
    ac: 17,
    abilities: [{ name: 'Leadership', description: 'Nearby allies add 1d4 to attack rolls.', type: 'Passive', levelReq: 1 }],
    description: 'A disciplined commander in sturdy plate armor.',
    expReward: 450
  },

  // --- BEAST ---
  {
    id: 'monster-shadow-wolf',
    name: 'Shadow Wolf',
    type: 'Beast',
    hp: 20,
    ac: 14,
    abilities: [{ name: 'Pack Tactics', description: 'Advantage on attacks if an ally is near the target.', type: 'Passive', levelReq: 1 }],
    description: 'A wolf with fur like smoke and eyes like burning coals.',
    expReward: 100
  },
  {
    id: 'monster-basilisk',
    name: 'Obsidian Basilisk',
    type: 'Beast',
    hp: 52,
    ac: 15,
    abilities: [{ name: 'Petrifying Gaze', description: 'Targets must succeed on a CON save or turn to stone.', type: 'Active', levelReq: 1 }],
    description: 'A multi-legged reptilian horror with a gaze that solidifies the aether.',
    expReward: 700
  },

  // --- UNDEAD ---
  {
    id: 'monster-undead-knight',
    name: 'Blighted Sentinel',
    type: 'Undead',
    hp: 45,
    ac: 16,
    abilities: [{ name: 'Unyielding Malice', description: 'Returns with 5 HP once per battle if killed.', type: 'Passive', levelReq: 1 }],
    description: 'A skeletal knight clad in rusted soul-bound plate mail.',
    expReward: 150
  },
  {
    id: 'monster-shadow-wraith',
    name: 'Shadow Wraith',
    type: 'Undead',
    hp: 67,
    ac: 13,
    abilities: [{ name: 'Life Drain', description: 'Target must succeed on a CON save or its HP maximum is reduced.', type: 'Active', levelReq: 1 }],
    description: 'A dark, incorporeal spirit that hungers for life.',
    expReward: 700
  },
  {
    id: 'monster-lich-acolyte',
    name: 'Necromancer Apprentice',
    type: 'Undead',
    hp: 35,
    ac: 12,
    abilities: [{ name: 'Ray of Sickness', description: 'Target takes 2d8 poison damage and is poisoned.', type: 'Active', levelReq: 1 }],
    description: 'A hooded figure seeking to master the secrets of the grave.',
    expReward: 400
  },

  // --- HUMANOID ---
  {
    id: 'monster-orc-ravager',
    name: 'Orc Ravager',
    type: 'Humanoid',
    hp: 30,
    ac: 13,
    abilities: [{ name: 'Aggressive', description: 'Move toward a target as a bonus action.', type: 'Passive', levelReq: 1 }],
    description: 'A muscular orc covered in war paint, wielding a heavy axe.',
    expReward: 100
  },
  {
    id: 'monster-void-cultist',
    name: 'Herald of the Engine',
    type: 'Humanoid',
    hp: 22,
    ac: 11,
    abilities: [{ name: 'Sacrificial Dagger', description: 'Deals extra damage if target is below half HP.', type: 'Passive', levelReq: 1 }],
    description: 'A fanatic who believes the world must be consumed by the Engine.',
    expReward: 150
  },

  // --- DRACONIAN ---
  {
    id: 'monster-kobold-scout',
    name: 'Obsidian Kobold',
    type: 'Draconian',
    hp: 10,
    ac: 12,
    abilities: [{ name: 'Pack Tactics', description: 'Advantage if allies are near.', type: 'Passive', levelReq: 1 }],
    description: 'A small reptilian creature that dwells in the dark.',
    expReward: 25
  },
  {
    id: 'monster-shadow-drake',
    name: 'Shadow Drake',
    type: 'Draconian',
    hp: 110,
    ac: 18,
    abilities: [{ name: 'Shadow Breath', description: '30ft cone of necrotic energy.', type: 'Active', levelReq: 1 }],
    description: 'A flightless dragon made of solidified darkness.',
    expReward: 1800
  },

  // --- HYBRID / BOSS ---
  {
    id: 'monster-gorechimera',
    name: 'Gorechimera',
    type: 'Hybrid',
    hp: 350,
    ac: 18,
    abilities: [
      { name: 'Lion Roar', description: 'A thunderous fear effect.', type: 'Active', levelReq: 1 },
      { name: 'Goat Pulse', description: 'Heals all heads and allies.', type: 'Active', levelReq: 1 },
      { name: 'Necrotic Revival', description: 'Revive nearby fallen monsters.', type: 'Active', levelReq: 1 }
    ],
    description: 'A pallid, terrifying hybrid with heads of a Lion, Goat, and Serpent. The goat head pulses with unholy restoration.',
    expReward: 5000
  }
];

export const RULES_MANIFEST = `
1. The Dungeon Master (AI) has final authority on all checks.
2. Players must roleplay actions; the AI will respond with consequences.
3. Combat uses a 20x20 grid. Movement costs 1 tile per 5ft.
4. EXP is awarded for overcoming challenges, not just killing.
5. Death is permanent unless a specific "Revify" or "Resurrection" spell is used.
6. ASI points are granted at levels 4, 8, 12, 16, 19.
7. Level Up requires EXP = 1000 * current_level.
`;

export const STARTER_CAMPAIGN_PROMPT = `
The Chronicle begins in 'The Broken Cask', a tavern smelling of stale ale and damp earth in the frontier town of Oakhaven. 
Outside, the sky is a bruised purple, and the obsidian walls of the mountains loom like giants.
Your fellowship—Miri, Lina, and Seris—are huddled around a scarred wooden table. 
The air is thick with rumors of a pallid beast stalking livestock... a Gorechimera.
A stranger in dark, tattered robes approaches your table, clutching a parchment sealed with blood-red wax.
"The Engine has chosen you," he whispers.
`;
