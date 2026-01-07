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
    { name: 'Chaos Bolt', description: 'Fire a bolt of unpredictable energy. Deals 2d8 damage of a random aetheric type.', type: 'Spell', levelReq: 1, baseLevel: 1, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Shield of Aether', description: 'An invisible barrier of force appears to protect you. +5 AC.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Aether Shards', description: 'Create three shards of glowing energy that strike targets. Deals 1d4+1 force damage each.', type: 'Spell', levelReq: 1, baseLevel: 1, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Burning Hands', description: 'A thin sheet of flames shoots from your fingertips. 3d6 fire damage in a 15ft cone.', type: 'Spell', levelReq: 1, baseLevel: 1, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Misty Step', description: 'Teleport up to 30 feet to an unoccupied space you can see.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Shatter', description: 'A sudden loud ringing noise deals 3d8 thunder damage in a 10ft radius.', type: 'Spell', levelReq: 3, baseLevel: 2, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Scorching Ray', description: 'Hurl three streaks of fire. Each deals 2d6 fire damage on hit.', type: 'Spell', levelReq: 3, baseLevel: 2, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Fireball', description: 'A bright streak blossoms into an explosion. 8d6 fire damage in a 20ft radius.', type: 'Spell', levelReq: 5, baseLevel: 3, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Counterspell', description: 'Attempt to interrupt a creature in the process of casting a spell.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Lightning Bolt', description: 'A stroke of lightning 100 feet long blasts out. Deals 8d6 lightning damage.', type: 'Spell', levelReq: 5, baseLevel: 3, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Polymorph', description: 'Transform a creature you can see into a beast of a CR equal to or less than its own.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Cone of Cold', description: 'A blast of cold air erupts. 8d8 cold damage in a 60ft cone.', type: 'Spell', levelReq: 9, baseLevel: 5, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Disintegrate', description: 'A thin green ray dealing 10d6 + 40 force damage.', type: 'Spell', levelReq: 11, baseLevel: 6, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Meteor Swarm', description: 'Call down four meteors dealing 20d6 fire and 20d6 bludgeoning damage.', type: 'Spell', levelReq: 17, baseLevel: 9, scaling: 'Deals an extra 1d6 damage for each slot level above 3rd.' },
    { name: 'Wish', description: 'The mightiest spell a mortal creature can cast. Alter the foundations of reality.', type: 'Spell', levelReq: 17, baseLevel: 9 },
    { name: 'Exequy', description: 'The ultimate song of the end. Consumes ALL thy remaining spell slots. On a successful manifestation, the target dies instantly. Arcane Memory cannot bypass this requirement.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.Mage]: [
    { name: 'Cure Wounds', description: 'A creature you touch regains 1d8 + WIS modifier HP.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Bless', description: 'Bless up to three creatures. Add 1d4 to attack rolls and saves.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Guiding Bolt', description: 'A flash of light streaks toward a creature. Deals 4d6 radiant damage.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Sanctuary', description: 'Protect a creature. Any who try to attack it must pass a WIS save first.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Prayer of Healing', description: 'Heal up to six allies for 2d8 + WIS HP. Needs 10 minutes.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Spiritual Weapon', description: 'Create a floating weapon that can attack as a bonus action.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Lesser Restoration', description: 'Remove one disease or condition (blinded, deafened, paralyzed, poisoned).', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Revivify', description: 'Return a creature that has died within the last minute to life with 1 HP.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Spirit Guardians', description: 'Call spirits to protect you. Enemies in range take 3d8 radiant damage and are slowed.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Dispel Magic', description: 'End spell effects on a creature or object.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Banishment', description: 'Attempt to send a creature to another plane of existence.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Mass Cure Wounds', description: 'Heal up to six creatures within 30ft for 3d8 + WIS HP.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Flame Strike', description: 'A vertical column of divine fire deals 4d6 fire and 4d6 radiant damage.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Heal', description: 'A flood of healing energy restores 70 HP and ends several conditions.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Mass Heal', description: 'A flood of healing energy restores 700 HP divided among targets.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.DarkKnight]: [
    { name: 'Blood Rite', description: 'Sacrifice 5 HP to deal 2d10 necrotic damage and slow the target.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Ray of Enfeeblement', description: 'A black beam of enervating energy saps strength.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Inflict Wounds', description: 'A touch of necrotic energy deals 3d10 necrotic damage.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Hold Person', description: 'Paralyze a humanoid with a surge of dark authority.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Darkness', description: 'Create a 15ft radius sphere of magical darkness.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Blindness/Deafness', description: 'Inflict a sensory curse on a foe.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Vampiric Touch', description: 'Touch siphons life. Deal 3d6 necrotic damage and heal for half.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Animate Dead', description: 'Raise a skeleton or wizard from a corpse.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Bestow Curse', description: 'Touch a creature to inflict a severe magical curse.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Blight', description: 'Necrotic energy washes over a creature. Deals 8d8 necrotic damage.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Shadow of Moil', description: 'Ethereal flame-like shadows surround you, granting resistance and retaliatory damage.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Circle of Death', description: 'A sphere of negative energy deals 8d6 necrotic damage in a 60ft radius.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Finger of Death', description: 'Send a wave of negative energy dealing 7d8+30 necrotic damage. Slain foes rise as zombies.', type: 'Spell', levelReq: 13, baseLevel: 7 },
    { name: 'Power Word Stun', description: 'Compel one creature with 150 HP or less to be stunned.', type: 'Spell', levelReq: 15, baseLevel: 8 },
    { name: 'Power Word Kill', description: 'Compel one creature with 100 HP or less to die instantly.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ],
  [Archetype.BloodArtist]: [
    { name: 'Life Tap', description: 'Drain the essence of a foe. Deal 1d10 necrotic damage and gain half as temp HP.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Hemoplague', description: 'Infect a target. They take 2d6 necrotic damage each turn.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Infuse Vitality', description: 'Sacrifice your own vitality to heal an ally for 2d8 HP.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Sanguine Shield', description: 'Sacrifice 10 HP to create a barrier that absorbs 30 damage for an ally.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Blood Burst', description: 'Cause a blinded foe\'s blood to erupt, dealing 4d6 force damage to those nearby.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Transfusion', description: 'Equalize HP percentages between you and a target.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Heartseeker', description: 'A needle of blood pierces the target. Deals 4d10 piercing damage.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Dominate Beast', description: 'Overpower the simple biological mind of a beast.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Contagion', description: 'Touch a creature to inflict a horrific biological disease.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Sanguine Puppet', description: 'Possess a fresh corpse with blood filaments to act as a level 5 fighter.', type: 'Spell', levelReq: 9, baseLevel: 5 },
    { name: 'Eyebite', description: 'Thy eyes become voids that can sicken, panic, or asleep targets each turn.', type: 'Spell', levelReq: 11, baseLevel: 6 },
    { name: 'Power Word Pain', description: 'Bind a creature in absolute physical agony.', type: 'Spell', levelReq: 13, baseLevel: 7 },
    { name: 'Gore Cascade', description: 'The Engine manifests a storm of razor-blood. Deals 15d10 necrotic damage in a massive area.', type: 'Spell', levelReq: 17, baseLevel: 9 }
  ]
};

export const ARCHETYPE_INFO: Record<string, { hpDie: number; role: Role; description: string; coreAbilities: Ability[]; spells?: Ability[] }> = {
  [Archetype.Archer]: {
    hpDie: 8, role: 'DPS', description: 'Precision masters who dominate from afar.',
    coreAbilities: [
      { name: 'Sky-Splitter', description: 'Ignore disadvantage against long-range targets.', type: 'Passive', levelReq: 1 },
      { name: 'Void Mark', description: 'Mark a target for extra damage.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.Thief]: {
    hpDie: 8, role: 'DPS', description: 'Agile infiltrators who exploit chaos.',
    coreAbilities: [
      { name: 'Lethal Ambush', description: 'Deal extra damage to surprised foes.', type: 'Passive', levelReq: 1 },
      { name: 'Smoke Veil', description: 'Create a cloud of shadow.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.Sorcerer]: {
    hpDie: 6, role: 'DPS', description: 'Conduits of raw aetheric destruction.',
    coreAbilities: [
      { name: 'Arcane Memory', description: 'Cast a spell without a slot once per day (does not apply to Exequy).', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Sorcerer]
  },
  [Archetype.Mage]: {
    hpDie: 6, role: 'Support', description: 'Keepers of the harmonized weave.',
    coreAbilities: [
      { name: 'Harmonized Aether', description: 'Buffs affect extra allies.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.Mage]
  },
  [Archetype.Warrior]: {
    hpDie: 12, role: 'Tank', description: 'Relentless titans of the front line.',
    coreAbilities: [
      { name: 'Charged Devastation', description: 'Peak powers your next strike.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.Fighter]: {
    hpDie: 10, role: 'Tank', description: 'Unyielding protectors with blade and bulwark.',
    coreAbilities: [
      { name: 'Shield Bash', description: 'Knock enemies prone.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.DarkKnight]: {
    hpDie: 10, role: 'Tank', description: 'Warriors who walk the edge of the abyss.',
    coreAbilities: [
      { name: 'Living Dead', description: 'Survive at 0 HP for one turn.', type: 'Passive', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight]
  },
  [Archetype.Alchemist]: {
    hpDie: 8, role: 'Support', description: 'Masters of volatile compounds.',
    coreAbilities: [
      { name: 'Monster Part Harvester', description: 'Harvest reagents from slain horrors.', type: 'Passive', levelReq: 1 },
      { name: 'Experimental Transmutation', description: 'Forge elixirs during rest.', type: 'Active', levelReq: 1 }
    ]
  },
  [Archetype.BloodArtist]: {
    hpDie: 10, role: 'Support', description: 'Elegant weavers of the life-stream.',
    coreAbilities: [
      { name: 'Sanguine Link', description: 'Share damage between souls.', type: 'Active', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.BloodArtist]
  }
};

export const INITIAL_ITEMS: Item[] = [
  // --- WARRIOR & DARK KNIGHT (2H Swords & Plate) ---
  { id: 'w-c-sword', name: 'Iron Zweihander', description: 'A massive, two-handed iron blade.', type: 'Weapon', rarity: 'Common', stats: { damage: '2d6+STR' }, archetypes: [Archetype.Warrior, Archetype.DarkKnight] },
  { id: 'w-c-plate', name: 'Soldier\'s Plate', description: 'Durable iron plating. Requires heavy training.', type: 'Armor', rarity: 'Common', stats: { ac: 16 }, archetypes: [Archetype.Warrior, Archetype.Fighter, Archetype.DarkKnight] },
  { id: 'w-u-sword', name: 'Aether-Tempered Zweihander', description: 'Infused with blue fire for increased durability.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '2d6+STR', str: 1 }, archetypes: [Archetype.Warrior, Archetype.DarkKnight] },
  { id: 'w-r-sword', name: 'Ebon-Glass Claymore', description: 'Forged from the core of an obsidian mountain.', type: 'Weapon', rarity: 'Rare', stats: { damage: '1d12+STR', str: 2 }, archetypes: [Archetype.Warrior, Archetype.DarkKnight] },
  { id: 'w-l-sword', name: 'World-Ender Zweihander', description: 'The legendary blade that split the first obsidian peak.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '3d10+STR', str: 5, con: 3 }, archetypes: [Archetype.Warrior, Archetype.DarkKnight] },
  { id: 'w-l-plate', name: 'Plate of the Void Lord', description: 'Manifested from absolute nothingness.', type: 'Armor', rarity: 'Legendary', stats: { ac: 22, str: 2, cha: 2 }, archetypes: [Archetype.Warrior, Archetype.Fighter, Archetype.DarkKnight] },

  // --- FIGHTER (1H Weapons & Plate & Shields) ---
  { id: 'f-c-sword', name: 'Steel Gladius', description: 'Reliable short broadsword for one hand.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+STR' }, archetypes: [Archetype.Fighter] },
  { id: 'f-c-shield', name: 'Iron Heater Shield', description: 'Solid protection for the shield-arm.', type: 'Armor', rarity: 'Common', stats: { ac: 2 }, archetypes: [Archetype.Fighter] },
  { id: 'f-u-sword', name: 'Captain\'s Broadsword', description: 'A perfectly balanced military blade.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '1d8+STR', dex: 1 }, archetypes: [Archetype.Fighter] },
  { id: 'f-r-shield', name: 'Mirror-Finished Buckler', description: 'Reflects minor spells back at the source.', type: 'Armor', rarity: 'Rare', stats: { ac: 3, wis: 1 }, archetypes: [Archetype.Fighter] },
  { id: 'f-e-sword', name: 'Dragon-Tooth Falchion', description: 'Curved blade that burns with ancient heat.', type: 'Weapon', rarity: 'Epic', stats: { damage: '2d8+STR', str: 3 }, archetypes: [Archetype.Fighter] },
  { id: 'f-l-sword', name: 'Excalibur Reforged', description: 'The absolute pinnacle of the one-handed path.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '2d12+STR', str: 5, cha: 3 }, archetypes: [Archetype.Fighter] },
  { id: 'f-l-shield', name: 'Daughter of the Evening', description: 'A shield polished to a mirror sheen. Reflects the faces and baleful powers of foes back upon them, that they might know their own horror.', type: 'Armor', rarity: 'Legendary', stats: { ac: 6, wis: 3, cha: 3 }, archetypes: [Archetype.Fighter] },

  // --- THIEF (Short Swords/Daggers & Leather) ---
  { id: 't-c-dagger', name: 'Flint Stiletto', description: 'Jagged edge for deep wounds.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d4+DEX' }, archetypes: [Archetype.Thief] },
  { id: 't-c-short', name: 'Rogue\'s Shortsword', description: 'Quick and easy to conceal.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d6+DEX' }, archetypes: [Archetype.Thief, Archetype.Alchemist] },
  { id: 't-c-leather', name: 'Scout\'s Leather Tunic', description: 'Supple and silent.', type: 'Armor', rarity: 'Common', stats: { ac: 11 }, archetypes: [Archetype.Thief, Archetype.Alchemist, Archetype.Archer] },
  { id: 't-u-leather', name: 'Stalker\'s Garb', description: 'Treated with void-oil for silence.', type: 'Armor', rarity: 'Uncommon', stats: { ac: 12, dex: 1 }, archetypes: [Archetype.Thief, Archetype.Alchemist, Archetype.Archer] },
  { id: 't-l-short', name: 'The Night\'s Edge', description: 'Manifested darkness. Absolute silence.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '1d12+DEX', dex: 5, cha: 2 }, archetypes: [Archetype.Thief] },

  // --- ARCHER (Bows/Crossbows & Leather) ---
  { id: 'a-c-bow', name: 'Frontier Longbow', description: 'Sturdy yew with a heavy draw.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+DEX' }, archetypes: [Archetype.Archer] },
  { id: 'a-u-bow', name: 'Composite Recurve', description: 'Aether-reinforced limbs.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '1d8+DEX', dex: 1 }, archetypes: [Archetype.Archer] },
  { id: 'a-l-bow', name: 'Artemis\'s Final Breath', description: 'Legendary relic. Arrows track soul resonance.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '2d10+DEX', dex: 5, wis: 2 }, archetypes: [Archetype.Archer] },

  // --- BLOOD ARTIST (Scythes/Sickles & Robes) ---
  { id: 'b-c-sickle', name: 'Ritual Sickle', description: 'Used for precise bloodletting.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d6+CHA' }, archetypes: [Archetype.BloodArtist] },
  { id: 'b-c-robes', name: 'Vein-Stitched Robes', description: 'Fine silks that never seem to dry.', type: 'Armor', rarity: 'Common', stats: { ac: 10 }, archetypes: [Archetype.Sorcerer, Archetype.Mage, Archetype.BloodArtist] },
  { id: 'b-u-scythe', name: 'Sanguine Harvester', description: 'A large harvesting blade that hums when near blood.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '1d10+CHA', con: 1 }, archetypes: [Archetype.BloodArtist] },
  { id: 'b-l-scythe', name: 'Life-Drinker Scythe', description: 'Legendary reaper weapon. Slain foes restore slots.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '3d10+CHA', cha: 5, con: 5 }, archetypes: [Archetype.BloodArtist] },

  // --- ALCHEMIST (Short Swords & Vials & Leather) ---
  { id: 'al-c-short', name: 'Chemist\'s Shortsword', description: 'Balanced for use with an offhand vial.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d6+INT' }, archetypes: [Archetype.Alchemist] },
  { id: 'al-c-vial', name: 'Minor Volatile Flask', description: 'An offhand vial containing explosive liquids.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d10' }, archetypes: [Archetype.Alchemist] },
  { id: 'al-l-vial', name: 'The Magnum Opus Flask', description: 'Legendary. Creates a constant storm of chemical ruin.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '10d6', int: 5 }, archetypes: [Archetype.Alchemist] },

  // --- SORCERER & MAGE (Staves & Robes) ---
  { id: 's-c-staff', name: 'Ashwood Conduit', description: 'A simple staff to focus energy.', type: 'Weapon', rarity: 'Common', stats: { int: 1 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 's-l-staff', name: 'Staff of the First Weaver', description: 'Legendary relic. Can re-write reality.', type: 'Weapon', rarity: 'Legendary', stats: { int: 6, wis: 6 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },

  // --- UTILITY ---
  { id: 'start-hp-pot', name: 'Minor Vitality Potion', description: 'Restores 10 HP.', type: 'Utility', rarity: 'Common', stats: {}, archetypes: [] },
  { id: 'rare-potion', name: 'Ghost-Mist Elixir', description: 'Turn translucent for 1 minute.', type: 'Utility', rarity: 'Rare', stats: {}, archetypes: [] },
  { id: 'start-aether-pot', name: 'Aether Draught', description: 'Restores 1 Level 1 spell slot.', type: 'Utility', rarity: 'Uncommon', stats: {}, archetypes: [] }
];

// Unique scaling templates for Mentors
export const MENTOR_UNIQUE_GEAR: Record<string, Partial<Item>[]> = {
  'mentor-lina': [
    { name: 'Ivory Arcanum', description: 'Lina\'s personal conduit. Scales with her WIS.', type: 'Weapon', rarity: 'Epic', stats: { wis: 2 }, isUnique: true },
    { name: 'Sunken Silk', description: 'Vestments from her sanctuary. Scales with WIS.', type: 'Armor', rarity: 'Epic', stats: { ac: 12 }, isUnique: true }
  ],
  'mentor-miri': [
    { name: 'Ribboned Bastard Sword', description: 'Miri\'s decorated blade. Scales with her STR.', type: 'Weapon', rarity: 'Epic', stats: { damage: '1d10+STR' }, isUnique: true },
    { name: 'Frontier Bulwark', description: 'Her unyielding plate. Scales with CON.', type: 'Armor', rarity: 'Epic', stats: { ac: 18 }, isUnique: true }
  ],
  'mentor-seris': [
    { name: 'Obsidian Sight', description: 'Seris\'s longbow. Scales with his DEX.', type: 'Weapon', rarity: 'Epic', stats: { damage: '1d8+DEX', dex: 2 }, isUnique: true },
    { name: 'Midnight Cloak', description: 'Elven leather. Scales with DEX.', type: 'Armor', rarity: 'Epic', stats: { ac: 14 }, isUnique: true }
  ],
  'mentor-kaelen': [
    { name: 'Abyssal Reaver', description: 'A heavy blade that bleeds shadow.', type: 'Weapon', rarity: 'Epic', stats: { damage: '2d6+STR' }, isUnique: true },
    { name: 'Shadow-Forged Mail', description: 'Armor made from solidified void energy.', type: 'Armor', rarity: 'Epic', stats: { ac: 17, cha: 1 }, isUnique: true }
  ],
  'mentor-valerius': [
    { name: 'Crimson Stylus', description: 'A quill that drinks life.', type: 'Weapon', rarity: 'Epic', stats: { damage: '1d8+CHA' }, isUnique: true },
    { name: 'Noble\'s Sanguine Robe', description: 'Silk robes stained with immortal ichor.', type: 'Armor', rarity: 'Epic', stats: { ac: 13, con: 1 }, isUnique: true }
  ],
  'mentor-jax': [
    { name: 'Whisper Blades', description: 'Two daggers that make no sound.', type: 'Weapon', rarity: 'Epic', stats: { damage: '1d6+DEX' }, isUnique: true },
    { name: 'Wraithskin Tunic', description: 'Translucent armor that mimics the surroundings.', type: 'Armor', rarity: 'Epic', stats: { ac: 15 }, isUnique: true }
  ],
  'mentor-xylar': [
    { name: 'Aetheric Astrolabe', description: 'Dwarf-forged focus for geometry.', type: 'Weapon', rarity: 'Epic', stats: { int: 2 }, isUnique: true },
    { name: 'Sorcerer\'s Orbit', description: 'Floating plates that protect the wearer.', type: 'Armor', rarity: 'Epic', stats: { ac: 12, int: 1 }, isUnique: true }
  ],
  'mentor-brunnhilde': [
    { name: 'Stone-Breaker Maul', description: 'A colossal hammer that causes tremors.', type: 'Weapon', rarity: 'Epic', stats: { damage: '2d8+STR' }, isUnique: true },
    { name: 'Titan Girdle', description: 'Goliath-sized iron plate.', type: 'Armor', rarity: 'Epic', stats: { ac: 20 }, isUnique: true }
  ],
  'mentor-alaric': [
    { name: 'Volatile Censer', description: 'Releases a constant stream of toxic mist.', type: 'Weapon', rarity: 'Epic', stats: { int: 1, damage: '2d4+INT' }, isUnique: true },
    { name: 'Alchemist\'s Apron', description: 'Leather treated to resist all corrosives.', type: 'Armor', rarity: 'Epic', stats: { ac: 14, dex: 1 }, isUnique: true }
  ]
};

export const MENTORS: Character[] = [
  {
    id: 'mentor-lina', name: 'Lina', age: 24, gender: 'Female', race: Race.Human, archetype: Archetype.Mage, role: 'Support', level: 5, exp: 0, maxHp: 35, currentHp: 35, stats: { str: 8, dex: 12, con: 12, int: 14, wis: 18, cha: 14 },
    currency: { aurels: 100, shards: 50, ichor: 5 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.Mage] || [], abilities: ARCHETYPE_INFO[Archetype.Mage].coreAbilities,
    description: 'Serene priestess in gold and ivory.', biography: 'Guardian of the Sunken Sanctuary.', asiPoints: 0
  },
  {
    id: 'mentor-miri', name: 'Miri', age: 22, gender: 'Female', race: Race.Human, archetype: Archetype.Fighter, role: 'Tank', level: 5, exp: 0, maxHp: 52, currentHp: 52, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 12 },
    currency: { aurels: 50, shards: 10, ichor: 2 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Fighter].coreAbilities,
    description: 'Energetic warrior with ribbons on her plate.', biography: 'Frontier protector.', asiPoints: 0
  },
  {
    id: 'mentor-seris', name: 'Seris', age: 112, gender: 'Male', race: Race.Elf, archetype: Archetype.Archer, role: 'DPS', level: 5, exp: 0, maxHp: 38, currentHp: 38, stats: { str: 10, dex: 18, con: 12, int: 14, wis: 14, cha: 10 },
    currency: { aurels: 150, shards: 30, ichor: 0 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Archer].coreAbilities,
    description: 'Reserved elf with eyes like obsidian.', biography: 'Master of precision.', asiPoints: 0
  },
  {
    id: 'mentor-kaelen', name: 'Kaelen', age: 31, gender: 'Male', race: Race.Tiefling, archetype: Archetype.DarkKnight, role: 'Tank', level: 5, exp: 0, maxHp: 48, currentHp: 48, stats: { str: 17, dex: 10, con: 15, int: 12, wis: 10, cha: 16 },
    currency: { aurels: 80, shards: 25, ichor: 4 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.DarkKnight] || [], abilities: ARCHETYPE_INFO[Archetype.DarkKnight].coreAbilities,
    description: 'Cold commander wearing a mask of indifference.', biography: 'Exiled prince of a shadow realm.', asiPoints: 0
  },
  {
    id: 'mentor-valerius', name: 'Valerius', age: 29, gender: 'Male', race: Race.Vesperian, archetype: Archetype.BloodArtist, role: 'Support', level: 5, exp: 0, maxHp: 45, currentHp: 45, stats: { str: 10, dex: 14, con: 16, int: 12, wis: 12, cha: 18 },
    currency: { aurels: 200, shards: 40, ichor: 6 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.BloodArtist] || [], abilities: ARCHETYPE_INFO[Archetype.BloodArtist].coreAbilities,
    description: 'Elegant noble with copper-scented wine.', biography: 'Artist who paints in the life-stream.', asiPoints: 0
  },
  {
    id: 'mentor-jax', name: 'Jax', age: 26, gender: 'Male', race: Race.Tabaxi, archetype: Archetype.Thief, role: 'DPS', level: 5, exp: 0, maxHp: 40, currentHp: 40, stats: { str: 12, dex: 20, con: 12, int: 10, wis: 14, cha: 12 },
    currency: { aurels: 300, shards: 15, ichor: 2 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Thief].coreAbilities,
    description: 'Predatory grace and intimidating silence.', biography: 'Rival-predator who respects only skill.', asiPoints: 0
  },
  {
    id: 'mentor-xylar', name: 'Xylar', age: 45, gender: 'Male', race: Race.Dwarf, archetype: Archetype.Sorcerer, role: 'DPS', level: 5, exp: 0, maxHp: 32, currentHp: 32, stats: { str: 10, dex: 10, con: 14, int: 18, wis: 14, cha: 12 },
    currency: { aurels: 120, shards: 100, ichor: 8 }, inventory: [], equippedIds: [], spells: SPELL_LIBRARY[Archetype.Sorcerer] || [], abilities: ARCHETYPE_INFO[Archetype.Sorcerer].coreAbilities,
    description: 'Prideful academic lecturing on aetheric geometry.', biography: 'Disgraced professor of the Arcanum.', asiPoints: 0
  },
  {
    id: 'mentor-brunnhilde', name: 'Brunnhilde', age: 52, gender: 'Female', race: Race.Goliath, archetype: Archetype.Warrior, role: 'Tank', level: 5, exp: 0, maxHp: 65, currentHp: 65, stats: { str: 20, dex: 10, con: 18, int: 8, wis: 12, cha: 10 },
    currency: { aurels: 40, shards: 5, ichor: 3 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Warrior].coreAbilities,
    description: 'Matriarchal giant with protective rage.', biography: '"Steel is the only truth."', asiPoints: 0
  },
  {
    id: 'mentor-alaric', name: 'Alaric', age: 38, gender: 'Male', race: Race.Human, archetype: Archetype.Alchemist, role: 'Support', level: 5, exp: 0, maxHp: 42, currentHp: 42, stats: { str: 10, dex: 14, con: 14, int: 18, wis: 14, cha: 10 },
    currency: { aurels: 90, shards: 60, ichor: 10 }, inventory: [], equippedIds: [], spells: [], abilities: ARCHETYPE_INFO[Archetype.Alchemist].coreAbilities,
    description: 'Precise apothecary smelling of sulfur.', biography: 'Chemical warfare specialist.', asiPoints: 0
  }
];

export const INITIAL_MONSTERS: Monster[] = [
  // --- CR 0-1 ---
  { id: 'mon-rat', name: 'Obsidian Rat', type: 'Beast', hp: 4, ac: 10, stats: { str: 4, dex: 12, con: 10, int: 2, wis: 10, cha: 4 }, abilities: [{ name: 'Naw', description: '1 damage.', type: 'Active', levelReq: 1 }], description: 'Scurrying shadows with teeth like glass.', cr: 0.125 },
  { id: 'mon-skel', name: 'Restless Bones', type: 'Undead', hp: 13, ac: 13, stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 }, abilities: [{ name: 'Rusted Blade', description: '1d6+2 damage.', type: 'Active', levelReq: 1 }], description: 'Necrotic clatter.', cr: 0.25 },
  { id: 'mon-imp', name: 'Aether Imp', type: 'Goblinoid', hp: 10, ac: 13, stats: { str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14 }, abilities: [{ name: 'Sting', description: '1d4+3 piercing.', type: 'Active', levelReq: 1 }], description: 'A minor nuisance from the breach.', cr: 1 },
  { id: 'mon-wolf', name: 'Shadow Wolf', type: 'Beast', hp: 15, ac: 12, stats: { str: 14, dex: 14, con: 12, int: 3, wis: 12, cha: 6 }, abilities: [{ name: 'Bite', description: '1d6+2 damage.', type: 'Active', levelReq: 1 }], description: 'Solidified hunger.', cr: 1 },

  // --- CR 2-5 ---
  { id: 'mon-ghoul', name: 'Vesperian Ghoul', type: 'Undead', hp: 22, ac: 12, stats: { str: 13, dex: 15, con: 10, int: 7, wis: 10, cha: 6 }, abilities: [{ name: 'Claw', description: '2d4+2 slashing.', type: 'Active', levelReq: 1 }], description: 'Lithe and starving.', cr: 2 },
  { id: 'mon-sentinel', name: 'Blighted Sentinel', type: 'Humanoid', hp: 45, ac: 16, stats: { str: 16, dex: 10, con: 16, int: 10, wis: 10, cha: 10 }, abilities: [{ name: 'Heavy Strike', description: '2d8+3 damage.', type: 'Active', levelReq: 1 }], description: 'Corrupted guardian.', cr: 3 },
  { id: 'mon-horror', name: 'Void Horror', type: 'Hybrid', hp: 60, ac: 14, stats: { str: 18, dex: 14, con: 16, int: 6, wis: 12, cha: 6 }, abilities: [{ name: 'Tentacle', description: '2d6+4 bludgeoning.', type: 'Active', levelReq: 1 }], description: 'Too many eyes, too few limbs.', cr: 5 },

  // --- Bosses CR 6-15 ---
  { id: 'mon-chimera', name: 'Chimera', type: 'Hybrid', hp: 114, ac: 14, stats: { str: 19, dex: 11, con: 19, int: 3, wis: 12, cha: 10 }, abilities: [
    { name: 'Multiattack', description: 'The chimera makes three attacks: one with its bite, one with its horns, and one with its claws.', type: 'Active', levelReq: 1 },
    { name: 'Fire Breath', description: 'Exhales fire in a 15-foot cone. 7d8 fire damage.', type: 'Active', levelReq: 1 }
  ], description: 'A horrific fusion of lion, goat, and dragon. Its heads snap with shared hunger.', cr: 6 },
  { id: 'mon-drake', name: 'Shadow Drake', type: 'Draconian', hp: 85, ac: 18, stats: { str: 18, dex: 16, con: 16, int: 12, wis: 14, cha: 14 }, abilities: [{ name: 'Breath of Ruin', description: '5d6 fire.', type: 'Active', levelReq: 1 }], description: 'Scaled terror.', cr: 8 },
  { 
    id: 'mon-knight', 
    name: 'Fallen Paladin', 
    type: 'Undead', 
    hp: 110, 
    ac: 20, 
    stats: { str: 20, dex: 10, con: 18, int: 12, wis: 16, cha: 18 }, 
    resistances: ["Necrotic", "Poison", "Bludgeoning, Piercing, and Slashing from non-magical attacks"],
    vulnerabilities: ["Radiant"],
    abilities: [{ name: 'Unholy Smite', description: '3d8 necrotic extra.', type: 'Active', levelReq: 1 }], 
    description: 'A beacon of dark faith.', 
    cr: 12 
  },
  { 
    id: 'mon-gorechimera', 
    name: 'Gorechimera', 
    type: 'Hybrid', 
    hp: 180, 
    ac: 17, 
    stats: { str: 21, dex: 12, con: 21, int: 8, wis: 16, cha: 14 }, 
    resistances: ["Poison", "Fire", "Bludgeoning, Piercing, and Slashing from non-magical attacks"],
    abilities: [
      { name: 'Venomous Serpent Tail', description: 'Bites with its serpent tail. Deals 2d6 piercing plus 4d6 poison damage.', type: 'Active', levelReq: 1 },
      { name: 'Goat Head: Rejuvenation', description: 'The goat head chants, restoring 30 HP to the Gorechimera or a nearby monster.', type: 'Active', levelReq: 1 },
      { name: 'Goat Head: Abyssal Resurrection', description: 'Restores a slain ally or a severed head to life with half its maximum HP.', type: 'Active', levelReq: 1 },
      { name: 'Lion head: Roar of Despair', description: 'Frightens all enemies within 30 feet.', type: 'Active', levelReq: 1 }
    ], 
    description: 'A pallid, necrotic monstrosity with a lion\'s head, a goat\'s body, and a venom-spewing serpent tail. Its goat head mends flesh with forbidden rites.', 
    cr: 14 
  },
  { 
    id: 'mon-lich', 
    name: 'Arch-Necromancer', 
    type: 'Undead', 
    hp: 135, 
    ac: 17, 
    stats: { str: 11, dex: 16, con: 16, int: 20, wis: 14, cha: 16 }, 
    resistances: ["Necrotic", "Poison", "Cold", "Bludgeoning, Piercing, and Slashing from non-magical attacks"],
    vulnerabilities: ["Radiant"],
    abilities: [{ name: 'Power Word Stun', description: 'Stuns below 150hp.', type: 'Active', levelReq: 1 }], 
    description: 'Studying the Engine forever.', 
    cr: 15 
  },

  // --- CR 20-30 ---
  { 
    id: 'mon-king', 
    name: 'The Hollow King', 
    type: 'Undead', 
    hp: 250, 
    ac: 20, 
    stats: { str: 22, dex: 14, con: 20, int: 18, wis: 18, cha: 20 }, 
    resistances: ["Necrotic", "Poison", "Cold", "Psychic", "Bludgeoning, Piercing, and Slashing from non-magical attacks"],
    vulnerabilities: ["Radiant", "Force"],
    abilities: [{ name: 'Soul Tear', description: '10d10 necrotic.', type: 'Active', levelReq: 1 }], 
    description: 'Lord of the Void.', 
    cr: 20 
  },
  { 
    id: 'mon-engine', 
    name: 'Fragment of the Engine', 
    type: 'Hybrid', 
    hp: 500, 
    ac: 25, 
    stats: { str: 30, dex: 10, con: 30, int: 30, wis: 30, cha: 30 }, 
    resistances: ["Necrotic", "Poison", "Psychic", "Acid", "Lightning", "Bludgeoning, Piercing, and Slashing from non-magical attacks"],
    vulnerabilities: ["Force (disrupts geometric patterns)", "Radiant"],
    abilities: [
      { name: 'Rewrite Reality', description: 'Force restart of current round. All cooldowns reset except this one.', type: 'Active', levelReq: 1 },
      { name: 'System Crash', description: 'Target creature must make a DC 25 INT save or be stunned indefinitely until another creature uses an action to "reboot" them.', type: 'Active', levelReq: 1 },
      { name: 'Entropy Pulse', description: 'Release a wave of code-decay. Deals 15d10 force damage to all enemies within 60ft. Slain creatures are deleted from existence (cannot be resurrected).', type: 'Active', levelReq: 1 }
    ], 
    description: 'Origin: Born from a catastrophic runtime exception during the Great Weaver\'s initial compilation of reality. Purpose: It acts as the universe\'s Garbage Collector, seeking out sentient anomalies to reclaim their memory space for the void. A shifting geometric mass of obsidian glass and pulsing gold light.', 
    cr: 30 
  }
];

export const APOTHECARY_TIERS = {
  HEALTH: [
    { name: 'Minor Vitality Elixir', desc: 'Restores 2d4+2 HP.', cost: 15, lvl: 1 },
    { name: 'Standard Vitality Elixir', desc: 'Restores 4d4+4 HP.', cost: 40, lvl: 5 },
    { name: 'Greater Vitality Elixir', desc: 'Restores 8d4+8 HP.', cost: 120, lvl: 10 },
    { name: 'Superior Vitality Elixir', desc: 'Restores 100 HP instantly.', cost: 350, lvl: 15 }
  ],
  AETHER: [
    { name: 'Minor Aether Draught', desc: 'Restores one Level 1 spell slot.', cost: 30, lvl: 1 },
    { name: 'Standard Aether Draught', desc: 'Restores one Level 3 or lower slot.', cost: 75, lvl: 5 },
    { name: 'Greater Aether Draught', desc: 'Restores one Level 5 or lower slot.', cost: 200, lvl: 10 },
    { name: 'Superior Aether Draught', desc: 'Full restoration of all spell slots.', cost: 600, lvl: 15 }
  ],
  DAMAGE: [
    { name: 'Ichor Flask', desc: 'Throws a flask of burning blood. Deals 2d10 necrotic damage.', cost: 25, lvl: 1 },
    { name: 'Volatile Ember', desc: 'Explodes on impact. Deals 4d6 fire damage in a 10ft radius.', cost: 60, lvl: 5 },
    { name: 'Void Acid', desc: 'Corrodes armor. Target takes 3d8 acid damage and -2 AC for 1 minute.', cost: 150, lvl: 10 },
    { name: 'Soul Reaper Draught', desc: 'Consumes the life force. Target must make a CON save or take 10d10 necrotic damage.', cost: 450, lvl: 15 }
  ]
};

export const APOTHECARY_BASE_STOCK: (Item & { cost: Currency })[] = [
  { id: 'apo-flask', name: 'Empty Crystal Flask', description: 'Sturdy glass for volatile essences.', type: 'Utility', rarity: 'Common', cost: { aurels: 15, shards: 0, ichor: 0 }, quantity: 1, archetypes: [], isUnique: false }
];

export const RULES_MANIFEST = `
1. **THE AETHERIC VOICE**: Gemini AI is the ultimate arbiter. Its narrative manifests the world, and its word on dice results is final.
2. **SOUL PROGRESSION**: Ascension requires 1,000 EXP * thy current Level. At each level, thou mayest refine thy Attributes.
3. **CURRENCY**: Aurels (Gold), Shards (Magic Fragments), and Ichor (Ancient Essence). These are the only way to trade with the Void.
4. **TACTICS**: The Grid is a 20x20 manifestation of reality. 1 tile represents 5ft of ground.
5. **CHALLENGE RATING (CR)**: All entities possess a Challenge Rating. The DM balances encounters where Total Monster CR (Sum of CRs) matches the party's Hidden Power Rating.
6. **BEYOND THY LIMITS**: Overcoming encounters where Total Monster CR exceeds thy Power Rating results in Legendary Rewards (2x to 5x multipliers).
7. **RITUAL TRIGGERS**: Interaction with Abyssal Seals, Ancient Altars, or Cursed Relics voids the laws of balance. Be warned.
8. **ASCENSION (ASI)**: Upon leveling up at 4, 8, 12, 16, and 19, thou art granted 2 ASI points to improve thy attributes.
9. **SACRED GARB**: Warrior, Fighter, and Dark Knight are restricted to Plate. Thief, Alchemist, and Archer to Leather. Sorcerer, Mage, and Blood Artist to Robes.
10. **FIDELITY OF ARMS**: Warrior/Dark Knight: 2H Swords. Fighter: 1H Weapons & Shields. Thief: Short Swords/Daggers. Archer: Bows/Crossbows. Blood Artist: Scythes/Sickles. Alchemist: Short Swords & Offhand Vials.
`;

export const STARTER_CAMPAIGN_PROMPT = `The air is thick with the scent of ozone and ancient rot. Your party stands before the heavy, iron-bound doors of 'The Broken Cask', a flickering lantern casting long, jagged shadows against the obsidian walls of the valley. To the North, the Whispering Woods moan under a blood-red moon. To the East, the Maw of the Engine hums with a low, bone-shaking frequency. What is your first move in this dying world?`;

export const TUTORIAL_SCENARIO = {
  title: "The Path to Ascension",
  prompt: `You awaken on the cold, obsidian floor of the Outer Rim. The sky above is a void, save for the rhythmic, golden pulse of the Engine at the world's center. The air tastes of copper and ozone. To your left, a pack of Shadow Wolves snarls in the dim light of a dying sun, their eyes glowing like embers. To your right, a jagged trail leads upward toward the shimmering, logic-defying gates of the First Citadel. Your journey to Ascension begins now. What do you do?`
};