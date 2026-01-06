
import { Race, Archetype, Stats, Ability, Character, Monster, Item } from './types';

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
  ],
  [Archetype.BloodArtist]: [
    { name: 'Hemoplague', description: 'Infect a target. They take 2d6 necrotic damage each turn. If they die while infected, you regain 1d10 HP.', type: 'Spell', levelReq: 1, baseLevel: 1 },
    { name: 'Sanguine Shield', description: 'Sacrifice 10 HP to create a barrier that absorbs 30 damage for an ally.', type: 'Spell', levelReq: 3, baseLevel: 2 },
    { name: 'Boil Blood', description: 'Force a creature to make a CON save or take 8d6 fire damage as their own blood boils.', type: 'Spell', levelReq: 5, baseLevel: 3 },
    { name: 'Vessel of Agony', description: 'Transfer all status conditions from an ally to yourself, then deal 4d10 damage to a nearby foe.', type: 'Spell', levelReq: 7, baseLevel: 4 },
    { name: 'Exsanguinate', description: 'Rip the fluid from a creature. Deals 10d10 damage; half as HP to your party.', type: 'Spell', levelReq: 13, baseLevel: 7 }
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
    hpDie: 10, description: 'Warriors who walk the edge of the abyss. Exclusively masters of the heavy two-handed sword, they siphon vitality and defy death through sheer will.',
    coreAbilities: [
      { name: 'Living Dead', description: 'Upon dropping to 0 HP, survive for 1 turn. If healed above 0 before turn end, you remain standing.', type: 'Passive', levelReq: 1 },
      { name: 'Shadow Clone', description: 'Manifest a shadow that distracts foes. Grant Disadvantage to the next attack.', type: 'Active', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight]
  },
  [Archetype.Alchemist]: {
    hpDie: 8, description: 'Masters of volatile compounds and transformative elixirs. They use intellect to bend the laws of chemistry into weapons of war.',
    coreAbilities: [
      { name: 'Monster Part Harvester', description: 'After defeating a non-humanoid challenge, you can harvest 1 Unique Part (e.g., Salamander Heart, Drake Scale).', type: 'Passive', levelReq: 1 },
      { name: 'Experimental Transmutation', description: 'During a Short Rest, combine 1 Monster Part and a flask to create a Unique Alchemical Item.', type: 'Active', levelReq: 1 },
      { name: 'Volatile Throw', description: 'Throwable flasks gain range of 30ft. Damage/Duration scales with INT modifier and Level.', type: 'Passive', levelReq: 1 },
      { name: 'Concoction Mastery', description: 'Consumable buffs grant an extra 1d4 to the next check.', type: 'Passive', levelReq: 1 }
    ]
  },
  [Archetype.BloodArtist]: {
    hpDie: 10, description: 'Elegant weavers of the life-stream. They view combat as a canvas and blood as the ink, often sacrificing their own vitality to sculpt victory.',
    coreAbilities: [
      { name: 'Sanguine Link', description: 'Tether two creatures within 30ft. Damage dealt to one is shared with the other.', type: 'Active', levelReq: 1 },
      { name: 'Iron in the Veins', description: 'Your maximum Vitality increases by 2 for every level. You gain Resistance to Slashing damage.', type: 'Passive', levelReq: 1 },
      { name: 'Masterpiece of Gore', description: 'When an enemy dies within 10ft, you can use a reaction to explode the corpse, dealing 2d10 necrotic damage to adjacent foes.', type: 'Active', levelReq: 1 }
    ],
    spells: SPELL_LIBRARY[Archetype.BloodArtist]
  }
};

export const INITIAL_ITEMS: Item[] = [
  // --- WEAPONS ---
  { id: 'start-bow', name: 'Frontier Bow', description: 'A sturdy longbow made of darkened yew.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+DEX' }, archetypes: [Archetype.Archer, Archetype.Thief] },
  { id: 'start-dagger', name: 'Scoundrel\'s Dirk', description: 'A serrated blade favored by those who strike from shadow.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d4+DEX' }, archetypes: [Archetype.Thief, Archetype.Archer] },
  { id: 'start-staff', name: 'Ashwood Conduit', description: 'A simple staff used to focus aetheric energies.', type: 'Weapon', rarity: 'Common', stats: { int: 1 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 'start-sword', name: 'Soldier\'S Blade', description: 'A reliable iron longsword.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d8+STR' }, archetypes: [Archetype.Warrior, Archetype.Fighter, Archetype.DarkKnight] },
  { id: 'start-hammer', name: 'Iron Maul', description: 'A heavy hammer for crushing skulls and shields.', type: 'Weapon', rarity: 'Common', stats: { damage: '2d6+STR' }, archetypes: [Archetype.Warrior, Archetype.Fighter] },
  { id: 'start-quill', name: 'Sanguine Quill', description: 'A sharp metallic stylus that draws from the user\'s own veins to write laws of pain upon the air.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d6+CHA', cha: 1 }, archetypes: [Archetype.BloodArtist] },
  
  // Uncommon
  { id: 'un-rapier', name: 'Duelist\'S Rapier', description: 'A needle-thin blade for precise punctures.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '1d8+DEX' }, archetypes: [Archetype.Thief, Archetype.Archer] },
  { id: 'un-mace', name: 'Heavy Flail', description: 'A spiked iron ball on a chain.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '1d10+STR' }, archetypes: [Archetype.Warrior, Archetype.Fighter] },
  { id: 'un-wand', name: 'Bone Wand', description: 'A wand carved from a sorcerer\'s femur.', type: 'Weapon', rarity: 'Uncommon', stats: { int: 2 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },

  // Rare
  { id: 'rare-obsidian-blade', name: 'Obsidian Fang', description: 'A blade forged from volcanic glass, eternally sharp.', type: 'Weapon', rarity: 'Rare', stats: { damage: '1d10+STR', str: 1 }, archetypes: [Archetype.Warrior, Archetype.DarkKnight, Archetype.Fighter] },
  { id: 'rare-wind-bow', name: 'Zephyr Bow', description: 'A bow that whispers as arrows fly true on the wind.', type: 'Weapon', rarity: 'Rare', stats: { damage: '1d10+DEX', dex: 1 }, archetypes: [Archetype.Archer] },
  { id: 'rare-soul-dagger', name: 'Ghost Dirk', description: 'Strikes both the flesh and the spirit.', type: 'Weapon', rarity: 'Rare', stats: { damage: '1d6+DEX', cha: 1 }, archetypes: [Archetype.Thief] },
  
  // Epic
  { id: 'epic-void-reaver', name: 'Void Reaver', description: 'A massive 2H greatsword forged from obsidian, humming with a dark energy.', type: 'Weapon', rarity: 'Epic', stats: { damage: '2d10+STR', con: 2 }, archetypes: [Archetype.DarkKnight, Archetype.Warrior] },
  { id: 'epic-sun-staff', name: 'Solar Focus', description: 'A staff tipped with a fragment of a placeholder star.', type: 'Weapon', rarity: 'Epic', stats: { wis: 3, cha: 1 }, archetypes: [Archetype.Mage, Archetype.Sorcerer] },
  { id: 'epic-shadow-claws', name: 'Umbral Talons', description: 'Set of obsidian claws that extend from the user\'s shadows.', type: 'Weapon', rarity: 'Epic', stats: { damage: '2d6+DEX', dex: 2 }, archetypes: [Archetype.Thief] },

  // Legendary
  { id: 'legendary-star-hammer', name: 'Star-Forged Hammer', description: 'Forged in the heart of a dying star.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '4d6+STR', str: 3, con: 3 }, archetypes: [Archetype.Warrior, Archetype.Fighter] },
  { id: 'legendary-infinite-string', name: 'Artemis\' Regret', description: 'A bow with a string made of solidified moonlight.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '2d12+DEX', dex: 5 }, archetypes: [Archetype.Archer] },
  { id: 'legendary-void-scepter', name: 'Void-Singer\'s Scepter', description: 'A legendary scepter carved from a frozen nebula. It hums with the sound of collapsing stars.', type: 'Weapon', rarity: 'Legendary', stats: { int: 5, cha: 2 }, archetypes: [Archetype.Sorcerer] },
  { id: 'legendary-abyssal-greatsword', name: 'Oblivion\'S Edge', description: 'A legendary two-handed greatsword forged from solidified void. Its weight is felt by the souls of those it cleaves.', type: 'Weapon', rarity: 'Legendary', stats: { damage: '4d10+STR', str: 3, cha: 3 }, archetypes: [Archetype.DarkKnight] },

  // --- ARMOR ---
  { id: 'start-robes', name: 'Apprentice Robes', description: 'Simple linen robes that allow for free movement of aether. Cloth armor.', type: 'Armor', rarity: 'Common', stats: { ac: 10 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 'start-leather', name: 'Scout\'s Leather', description: 'Boiled leather armor that permits easy movement.', type: 'Armor', rarity: 'Common', stats: { ac: 11 }, archetypes: [Archetype.Archer, Archetype.Thief, Archetype.Alchemist, Archetype.BloodArtist] },
  { id: 'start-plate', name: 'Rusty Plate', description: 'Old, noisy metal armor.', type: 'Armor', rarity: 'Common', stats: { ac: 15 }, archetypes: [Archetype.Warrior, Archetype.Fighter, Archetype.DarkKnight] },
  { id: 'start-shield', name: 'Rusted Aegis', description: 'A battered iron shield.', type: 'Armor', rarity: 'Common', stats: { ac: 2 }, archetypes: [Archetype.Fighter, Archetype.Warrior] },
  { id: 'start-tunic', name: 'Vein-Stitcher\'s Tunic', description: 'A dark red tunic embroidered with living channels for blood flow.', type: 'Armor', rarity: 'Common', stats: { ac: 11, con: 1 }, archetypes: [Archetype.BloodArtist] },
  { id: 'un-studded', name: 'Studded Brigandine', description: 'Reinforced leather for more durability.', type: 'Armor', rarity: 'Uncommon', stats: { ac: 13 }, archetypes: [Archetype.Archer, Archetype.Thief, Archetype.Alchemist] },
  { id: 'rare-aether-robe', name: 'Vestments of the Void', description: 'Cloth robes woven with silk that seems to swallow light.', type: 'Armor', rarity: 'Rare', stats: { ac: 12, int: 2 }, archetypes: [Archetype.Sorcerer, Archetype.Mage] },
  { id: 'rare-shield', name: 'Gilded Aegis', description: 'A shield used by the high guard of Oakhaven.', type: 'Armor', rarity: 'Rare', stats: { ac: 3, wis: 1 }, archetypes: [Archetype.Fighter, Archetype.Warrior] },
  { id: 'epic-dread-plate', name: 'Dreadnought Shell', description: 'Armor made from the scales of a shadow drake.', type: 'Armor', rarity: 'Epic', stats: { ac: 19, con: 2 }, archetypes: [Archetype.Warrior, Archetype.DarkKnight] },
  { id: 'legendary-archon-plate', name: 'Celestial Carapace', description: 'Armor said to be worn by the first hero of the Engine.', type: 'Armor', rarity: 'Legendary', stats: { ac: 22, str: 2, cha: 2 }, archetypes: [Archetype.Fighter, Archetype.Warrior] },
  { id: 'legendary-mirror-shield', name: 'Mirror-Glass Bulwark', description: 'A shield polished to a mirror sheen. Reflects the faces and baleful powers of foes back upon them, that they might know their own horror. Passive: Reflects gaze attacks back at foes.', type: 'Armor', rarity: 'Legendary', stats: { ac: 4, wis: 2, cha: 2 }, archetypes: [Archetype.Fighter, Archetype.Warrior] },

  // --- UTILITY / CONSUMABLES ---
  { id: 'potion-heal', name: 'Vitality Elixir', description: 'A glowing red liquid that restores 2d4+2 Hit Points.', type: 'Utility', rarity: 'Common', quantity: 1, archetypes: [Archetype.Alchemist] },
  { id: 'potion-mana', name: 'Aether Draught', description: 'A shimmering blue fluid that restores one Level 1 spell slot.', type: 'Utility', rarity: 'Common', quantity: 1, archetypes: [Archetype.Alchemist] },
  { id: 'flask-acid', name: 'Corrosive Flask', description: 'A volatile green substance that eats through armor and flesh.', type: 'Weapon', rarity: 'Common', stats: { damage: '1d10' }, quantity: 1, archetypes: [Archetype.Alchemist] },
  { id: 'flask-salamander', name: 'Flask of Salamander', description: 'Crafted from a lizard of fire. Ignites the target, dealing 1d6 fire damage at the start of its turn for 3 rounds.', type: 'Weapon', rarity: 'Uncommon', stats: { damage: '1d6' }, quantity: 1, archetypes: [Archetype.Alchemist] },
  { id: 'potion-fortune', name: 'Liquid Fortune', description: 'A golden oil. The consumer adds 1d4 to their next attack or ability roll.', type: 'Utility', rarity: 'Uncommon', quantity: 1, archetypes: [Archetype.Alchemist] },
  { id: 'un-ring', name: 'Aether Ring', description: 'A ring that hums with low-level magic.', type: 'Utility', rarity: 'Uncommon', stats: { int: 1 } },
  { id: 'rare-amulet', name: 'Locket of Lost Souls', description: 'Provides a placeholder bonus to focus.', type: 'Utility', rarity: 'Rare', stats: { wis: 2 } },
  { id: 'epic-tome', name: 'Grimoire of the Abyss', description: 'Contains forbidden knowledge of the void.', type: 'Utility', rarity: 'Epic', stats: { int: 4, wis: -1 } },
  { id: 'legendary-shadow-mantle', name: 'Mantle of the Unseen God', description: 'A legendary cloak woven from pure darkness and forgotten whispers. The wearer becomes a literal ghost in the world.', type: 'Utility', rarity: 'Legendary', stats: { dex: 5, cha: 2 }, archetypes: [Archetype.Thief] },
  { id: 'legendary-saint-relic', name: 'Glow-Heart of the First Saint', description: 'A legendary pulsating crystal that radiates an eternal, holy light. Darkness cannot exist in its presence.', type: 'Utility', rarity: 'Legendary', stats: { wis: 5, con: 2 }, archetypes: [Archetype.Mage] }
];

const createMentor = (data: Partial<Character>): Character => {
  const inventory = data.inventory || [];
  return {
    id: 'unknown',
    name: 'Unknown',
    age: 0,
    gender: 'N/A',
    race: Race.Human,
    archetype: Archetype.Warrior,
    level: 1,
    exp: 0,
    maxHp: 10,
    currentHp: 10,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    currency: { aurels: 0, shards: 0, ichor: 0 },
    inventory: inventory,
    equippedIds: inventory.map(i => i.id),
    spells: [],
    abilities: [],
    asiPoints: 0,
    description: '',
    biography: '',
    ...data
  };
};

export const MENTORS: Character[] = [
  createMentor({
    id: 'mentor-lina',
    name: 'Lina',
    age: 21,
    gender: 'Female',
    race: Race.Human,
    archetype: Archetype.Mage,
    level: 5,
    maxHp: 52,
    currentHp: 52,
    stats: { str: 9, dex: 13, con: 15, int: 13, wis: 19, cha: 13 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-staff')!, INITIAL_ITEMS.find(i => i.id === 'start-robes')!],
    spells: SPELL_LIBRARY[Archetype.Mage],
    abilities: ARCHETYPE_INFO[Archetype.Mage].coreAbilities,
    spellSlots: { 1: 4, 2: 3, 3: 2 },
    maxSpellSlots: { 1: 4, 2: 3, 3: 2 },
    description: 'A petite, shy priestess from a rural chapel. She wears simple white and gold cloth robes.',
    biography: 'Lina was raised in a secluded monastery at the edge of the Sun-Drenched Wastes. While others sought power through steel, she found solace in the ancient chants of the Light-Bringers. She was sent to Oakhaven after a vision of the Mythos Engine consuming her home, her quiet demeanor belying a fierce dedication to shielding those who cannot protect themselves. She holds the record for the longest meditation in the Order of the Silent Sun.'
  }),
  createMentor({
    id: 'mentor-miri',
    name: 'Miri',
    age: 19,
    gender: 'Female',
    race: Race.Human,
    archetype: Archetype.Fighter,
    level: 5,
    maxHp: 68,
    currentHp: 68,
    stats: { str: 19, dex: 13, con: 17, int: 9, wis: 13, cha: 11 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-sword')!, INITIAL_ITEMS.find(i => i.id === 'start-shield')!, INITIAL_ITEMS.find(i => i.id === 'start-plate')!],
    spells: [],
    abilities: ARCHETYPE_INFO[Archetype.Fighter].coreAbilities,
    description: 'An energetic and impulsive swordswoman with a bright, playful personality. She wears ribbon-adorned half-plate.',
    biography: 'A former squire from the fallen Citadel of Rose-Gold, Miri refuses to let the darkness of the world dim her spirit. She often decorates her heavy armor with bright ribbons and trinkets found on the battlefield. Her fighting style is a whirlwind of steel and laughter, though those who mistake her cheer for weakness often find themselves at the business end of her longsword. She is the last surviving member of the Rose-Gold Honor Guard.'
  }),
  createMentor({
    id: 'mentor-seris',
    name: 'Seris',
    age: 120,
    gender: 'Female',
    race: Race.Elf,
    archetype: Archetype.Archer,
    level: 5,
    maxHp: 54,
    currentHp: 54,
    stats: { str: 11, dex: 21, con: 15, int: 13, wis: 13, cha: 9 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-bow')!, INITIAL_ITEMS.find(i => i.id === 'start-leather')!],
    spells: [],
    abilities: ARCHETYPE_INFO[Archetype.Archer].coreAbilities,
    description: 'A reserved, sharp-eyed elven archer who prefers quiet distance and composure.',
    biography: 'Seris has outlived three generations of her human companions. She speaks rarely, her words as precise and lethal as her arrows. She left the Sylvan Glades when the corruption of the Obsidian Spire began to rot the world-trees. Now, she walks the frontier, a silent sentinel who observes the cycle of life and death with the clinical detachment of a scholar and the lethality of a master hunter. Her eyes are said to see the resonance of a heartbeat from a mile away.'
  }),
  createMentor({
    id: 'mentor-kaelen',
    name: 'Kaelen',
    age: 34,
    gender: 'Male',
    race: Race.Human,
    archetype: Archetype.DarkKnight,
    level: 5,
    maxHp: 74,
    currentHp: 74,
    stats: { str: 19, dex: 10, con: 18, int: 10, wis: 10, cha: 14 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-sword')!, INITIAL_ITEMS.find(i => i.id === 'start-plate')!],
    spells: SPELL_LIBRARY[Archetype.DarkKnight],
    abilities: ARCHETYPE_INFO[Archetype.DarkKnight].coreAbilities,
    spellSlots: { 1: 4, 2: 3, 3: 2 },
    maxSpellSlots: { 1: 4, 2: 3, 3: 2 },
    description: 'A towering figure in black obsidian placeholder plate. His face is a mask of indifference, eyes cold as the void.',
    biography: 'Kaelen was a commander of the Black Wing Legion before the Engine claimed his emotions as tribute for survival. He walks the fine line between humanity and the abyss, wielding a heavy blade that siphons the very light from the air. He does not seek redemption, only the efficient termination of threats to the balance. His presence is as chilling as a placeholder grave-wind, and his silence is more terrifying than any war-cry.'
  }),
  createMentor({
    id: 'mentor-valerius',
    name: 'Valerius',
    age: 41,
    gender: 'Male',
    race: Race.Tiefling,
    archetype: Archetype.BloodArtist,
    level: 5,
    maxHp: 72,
    currentHp: 72,
    stats: { str: 12, dex: 14, con: 20, int: 10, wis: 12, cha: 18 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-quill')!, INITIAL_ITEMS.find(i => i.id === 'start-tunic')!],
    spells: SPELL_LIBRARY[Archetype.BloodArtist],
    abilities: ARCHETYPE_INFO[Archetype.BloodArtist].coreAbilities,
    spellSlots: { 1: 4, 2: 3, 3: 2 },
    maxSpellSlots: { 1: 4, 2: 3, 3: 2 },
    description: 'An elegant noble with pale skin and obsidian horns. He wears fine velvet robes stained with a lifetime of "art".',
    biography: 'Valerius was the court painter for a dynasty that no longer exists. He discovered that by mixing his own blood with aetheric salts, he could tether the souls of his subjects to his canvas. When the Engine arrived, he didn\'t flee—he viewed it as the ultimate masterpiece. He now teaches the "Sanguine Path" to those willing to pay the price in blood. He is often found drinking deep-red wine that smells suspiciously of copper.'
  }),
  createMentor({
    id: 'mentor-jax',
    name: 'Jax',
    age: 28,
    gender: 'Male',
    race: Race.Leonin,
    archetype: Archetype.Thief,
    level: 5,
    maxHp: 58,
    currentHp: 58,
    stats: { str: 15, dex: 19, con: 16, int: 10, wis: 14, cha: 10 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-dagger')!, INITIAL_ITEMS.find(i => i.id === 'start-leather')!],
    spells: [],
    abilities: ARCHETYPE_INFO[Archetype.Thief].coreAbilities,
    description: 'A massive Leonin with scarred golden fur, moving with a silent, predatory grace.',
    biography: 'Jax was once a noble hunter in the Sun-Kissed Savannah before the Engine\'s mists began to starve his pride. He turned to the shadows to survive, learning that the most lethal strike is the one the enemy never sees. He is a man of few words, preferring to let his blades and his intimidating presence speak for him. He treats the Engine like a rival predator—with wary respect and absolute focus.'
  }),
  createMentor({
    id: 'mentor-xylar',
    name: 'Xylar',
    age: 45,
    gender: 'Male',
    race: Race.Dragonborn,
    archetype: Archetype.Sorcerer,
    level: 5,
    maxHp: 48,
    currentHp: 48,
    stats: { str: 12, dex: 12, con: 14, int: 20, wis: 14, cha: 18 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-staff')!, INITIAL_ITEMS.find(i => i.id === 'start-robes')!],
    spells: SPELL_LIBRARY[Archetype.Sorcerer],
    abilities: ARCHETYPE_INFO[Archetype.Sorcerer].coreAbilities,
    spellSlots: { 1: 4, 2: 3, 3: 2 },
    maxSpellSlots: { 1: 4, 2: 3, 3: 2 },
    description: 'A Dragonborn with brilliant gold scales, clad in heavy, ancient sorcerer robes.',
    biography: 'A scholar of the "Mathematical Aether," Xylar views the Engine as a grand puzzle to be solved. He was an archmage in the Crystal spires before they were shattered by the void. He possesses a prideful, academic demeanor, often lecturing mid-combat on the precise geometric alignment of a Fireball. Despite his arrogance, he is fiercely loyal to those who show an interest in the "True Laws of Reality."'
  }),
  createMentor({
    id: 'mentor-brunnhilde',
    name: 'Brunnhilde',
    age: 42,
    gender: 'Female',
    race: Race.Orc,
    archetype: Archetype.Warrior,
    level: 5,
    maxHp: 82,
    currentHp: 82,
    stats: { str: 21, dex: 10, con: 20, int: 8, wis: 12, cha: 12 },
    inventory: [INITIAL_ITEMS.find(i => i.id === 'start-hammer')!, INITIAL_ITEMS.find(i => i.id === 'start-plate')!],
    spells: [],
    abilities: ARCHETYPE_INFO[Archetype.Warrior].coreAbilities,
    description: 'A broad-supported Orc woman with graying hair, wielding a maul that looks like a fallen monument.',
    biography: 'Brunnhilde is the surviving matriarch of the Iron-Grip Clan. She sees the world through a lens of duty and protective rage. She treats the fellowship like her own wayward cubs, alternating between booming laughter and terrifyingly quiet intensity in the heat of battle. To her, "Steel is the only truth in a world of ghosts," and she ensures that truth is felt by every enemy that dares cross the party\'s path.'
  }),
  createMentor({
    id: 'mentor-alaric',
    name: 'Alaric',
    age: 38,
    gender: 'Male',
    race: Race.Vesperian,
    archetype: Archetype.Alchemist,
    level: 5,
    maxHp: 60,
    currentHp: 60,
    stats: { str: 10, dex: 16, con: 14, int: 20, wis: 14, cha: 12 },
    inventory: [
      { ...INITIAL_ITEMS.find(i => i.id === 'start-leather')!, quantity: 1 },
      { ...INITIAL_ITEMS.find(i => i.id === 'potion-heal')!, quantity: 5 },
      { ...INITIAL_ITEMS.find(i => i.id === 'flask-salamander')!, quantity: 3 },
      { ...INITIAL_ITEMS.find(i => i.id === 'potion-fortune')!, quantity: 2 }
    ],
    spells: [],
    abilities: ARCHETYPE_INFO[Archetype.Alchemist].coreAbilities,
    description: 'A sharp-featured Vesperian with multiple vials strapped to a high-quality leather harness.',
    biography: 'Alaric was once the chief apothecary for the Vesperian Royal Court. When the shadow fell, he realized that healing alone could not save his people. He combined his knowledge of anatomy with unstable aetheric compounds, creating a style of combat that is as precise as surgery and as loud as an explosion. He sees the Mythos Engine as a grand chemical reaction that must be carefully balanced—or neutralized entirely. He is never seen without a faint scent of sulfur and peppermint.'
  })
];

export const INITIAL_MONSTERS: Monster[] = [
  // --- GOBLINOID ---
  {
    id: 'monster-goblin-scavenger',
    name: 'Goblin Scavenger',
    type: 'Goblinoid',
    hp: 14,
    ac: 13,
    stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    abilities: [
      { name: 'Serrated Greed', description: 'Deals +2 damage against any target holding an item of Rare rarity or higher.', type: 'Passive', levelReq: 1 },
      { name: 'Vile Hiss', description: 'Targets within 5ft must make a CHA save or be Frightened until the end of their next turn.', type: 'Active', levelReq: 1 }
    ],
    description: 'A small, wretched green-skinned pest wearing scrap-metal armor.',
    expReward: 50
  },
  {
    id: 'monster-hobgoblin-captain',
    name: 'Hobgoblin Captain',
    type: 'Goblinoid',
    hp: 40,
    ac: 17,
    stats: { str: 16, dex: 12, con: 14, int: 12, wis: 10, cha: 13 },
    abilities: [
      { name: "Legion's Resolve", description: 'Gains +1 AC for every goblinoid ally within 10 feet.', type: 'Passive', levelReq: 1 },
      { name: 'Iron Command', description: 'Grants one adjacent ally an immediate reaction attack against a target of the Captain\'s choice.', type: 'Active', levelReq: 1 }
    ],
    description: 'A disciplined commander in sturdy placeholder plate armor.',
    expReward: 450
  },

  // --- BEAST ---
  {
    id: 'monster-shadow-wolf',
    name: 'Shadow Wolf',
    type: 'Beast',
    hp: 20,
    ac: 14,
    stats: { str: 12, dex: 16, con: 12, int: 3, wis: 12, cha: 6 },
    abilities: [
      { name: 'Umbral Prowler', description: 'Has Advantage on Stealth checks while in dim light or darkness.', type: 'Passive', levelReq: 1 },
      { name: 'Terror Snap', description: 'A bite that deals 1d10 damage and forces a WIS save; on fail, the target is Frightened.', type: 'Active', levelReq: 1 }
    ],
    description: 'A wolf with fur like smoke and eyes like burning coals.',
    expReward: 100
  },
  {
    id: 'monster-basilisk',
    name: 'Obsidian Basilisk',
    type: 'Beast',
    hp: 52,
    ac: 15,
    stats: { str: 16, dex: 8, con: 18, int: 2, wis: 12, cha: 7 },
    abilities: [
      { name: 'Heavy Stride', description: 'The earth trembles. Any player starting their turn within 10ft has their movement speed halved.', type: 'Passive', levelReq: 1 },
      { name: 'Calcifying Breath', description: '15ft cone. Targets must succeed on a CON save or begin turning to stone (Restrained). Success on next turn ends effect; failure results in Petrification.', type: 'Active', levelReq: 1 }
    ],
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
    stats: { str: 16, dex: 10, con: 15, int: 6, wis: 10, cha: 5 },
    abilities: [
      { name: 'Hollow Vessel', description: 'Immune to Necrotic and Poison damage. Critical hits deal only normal damage.', type: 'Passive', levelReq: 1 },
      { name: 'Wither-Strike', description: 'Melee strike dealing 2d8 Necrotic. The target cannot regain hit points until the end of their next turn.', type: 'Active', levelReq: 1 }
    ],
    description: 'A skeletal knight clad in rusted soul-bound placeholder plate mail.',
    expReward: 150
  },
  {
    id: 'monster-shadow-wraith',
    name: 'Shadow Wraith',
    type: 'Undead',
    hp: 67,
    ac: 13,
    stats: { str: 6, dex: 16, con: 12, int: 12, wis: 10, cha: 15 },
    abilities: [
      { name: 'Phase Shift', description: 'The Wraith can move through solid objects and creatures as if they were difficult terrain.', type: 'Passive', levelReq: 1 },
      { name: 'Shatter the Mind', description: 'Target takes 3d6 psychic damage and must succeed on an INT save or lose their lowest-level remaining spell slot.', type: 'Active', levelReq: 1 }
    ],
    description: 'A dark, incorporeal spirit that hungers for life.',
    expReward: 700
  },
  {
    id: 'monster-lich-acolyte',
    name: 'Necromancer Apprentice',
    type: 'Undead',
    hp: 35,
    ac: 12,
    stats: { str: 9, dex: 12, con: 10, int: 16, wis: 14, cha: 13 },
    abilities: [
      { name: 'Bone Shield', description: 'Summons a rotating barrier of ribs, granting +4 AC for 2 rounds.', type: 'Active', levelReq: 1 },
      { name: 'Corpse Explosion', description: 'Detonates a nearby fallen creature. Targets within 10ft take 3d8 necrotic damage.', type: 'Active', levelReq: 1 }
    ],
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
    stats: { str: 18, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
    abilities: [
      { name: 'Berserker Soul', description: 'When current HP is below 50%, the Ravager deals an additional +5 damage on all melee hits.', type: 'Passive', levelReq: 1 },
      { name: 'Skull-Crusher', description: 'A massive overhand swing. On hit, the target is Stunned until the start of its next turn.', type: 'Active', levelReq: 1 }
    ],
    description: 'A muscular orc covered in war paint, wielding a heavy axe.',
    expReward: 100
  },
  {
    id: 'monster-void-cultist',
    name: 'Herald of the Engine',
    type: 'Humanoid',
    hp: 22,
    ac: 11,
    stats: { str: 10, dex: 10, con: 12, int: 13, wis: 12, cha: 16 },
    abilities: [
      { name: "Martyr's Aura", description: 'When the Herald dies, all other non-humanoid monsters within 30ft gain 10 Temporary HP.', type: 'Passive', levelReq: 1 },
      { name: 'Word of Obsidian', description: 'Target takes 2d10 force damage and must succeed on a STR save or be knocked back 15 feet.', type: 'Active', levelReq: 1 }
    ],
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
    stats: { str: 7, dex: 15, con: 10, int: 8, wis: 7, cha: 8 },
    abilities: [
      { name: 'Shadow Meld', description: 'Can take the Hide action as a bonus action while in dim light.', type: 'Passive', levelReq: 1 },
      { name: 'Glass Trap', description: 'Coats the ground in jagged shards. 10ft radius becomes difficult terrain and deals 1d4 damage per 5ft moved.', type: 'Active', levelReq: 1 }
    ],
    description: 'A small reptilian creature that dwells in the dark.',
    expReward: 25
  },
  {
    id: 'monster-shadow-drake',
    name: 'Shadow Drake',
    type: 'Draconian',
    hp: 110,
    ac: 18,
    stats: { str: 20, dex: 14, con: 18, int: 13, wis: 14, cha: 15 },
    abilities: [
      { name: 'Cloak of Midnight', description: 'Ranged attacks made from more than 30 feet away have Disadvantage against the Drake.', type: 'Passive', levelReq: 1 },
      { name: 'Singularity Breath', description: '30ft line of void energy. Pulls all hit targets to the center of the line and deals 6d8 necrotic damage.', type: 'Active', levelReq: 1 }
    ],
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
    stats: { str: 22, dex: 15, con: 20, int: 10, wis: 14, cha: 12 },
    abilities: [
      { name: 'Bestial Synergy', description: 'The Chimera can take 3 Reactions per round and has 3 separate turns in the initiative order.', type: 'Passive', levelReq: 1 },
      { name: 'Lion: Frost Roar', description: 'AOE 20ft radius. 4d10 Cold damage and targets are Restrained by ice.', type: 'Active', levelReq: 1 },
      { name: 'Goat: Eldritch Flare', description: 'Restores 40 HP to the Chimera and clears all negative status effects.', type: 'Active', levelReq: 1 },
      { name: 'Snake: Venom-Spit', description: 'Ranged 60ft. Target is Blinded and takes 2d6 poison damage per turn for 3 rounds.', type: 'Active', levelReq: 1 }
    ],
    description: 'A pallid, terrifying hybrid with heads of a Lion, Goat, and Serpent. The goat head pulses with unholy restoration.',
    expReward: 5000
  },
  {
    id: 'monster-hollow-king',
    name: 'The Hollow King',
    type: 'Undead',
    hp: 420,
    ac: 20,
    stats: { str: 24, dex: 10, con: 22, int: 18, wis: 18, cha: 20 },
    abilities: [
      { name: 'Absolute Sovereignty', description: 'The King is immune to the Frightened, Charmed, Stunned, and Paralyzed conditions.', type: 'Passive', levelReq: 1 },
      { name: 'Crown of Sorrows', description: 'All players within 60ft must roll a d20. On 10 or less, they take 5d10 psychic damage and are Frightened.', type: 'Active', levelReq: 1 },
      { name: 'Legion Manifest', description: 'Summons 2 Blighted Sentinels into unoccupied spaces within 20 feet.', type: 'Active', levelReq: 1 }
    ],
    description: 'An ancient monarch who refused to pass into the void. He sits upon a throne of obsidian, eyes glowing with a baleful, blue light.',
    expReward: 8000
  },
  {
    id: 'monster-obsidian-colossus',
    name: 'Titan of Obsidian',
    type: 'Hybrid',
    hp: 550,
    ac: 22,
    stats: { str: 28, dex: 6, con: 26, int: 5, wis: 10, cha: 10 },
    abilities: [
      { name: 'Living Fortress', description: 'Any creature hitting the Colossus with a melee attack takes 2d6 piercing damage from obsidian shards.', type: 'Passive', levelReq: 1 },
      { name: 'Eruption', description: 'The Colossus slams the earth. Ground within 30ft explodes: 8d8 Fire damage and targets are launched 20ft into the air.', type: 'Active', levelReq: 1 },
      { name: 'Geological Gaze', description: 'Target is Restrained as obsidian grows over their limbs. STR save to break free.', type: 'Active', levelReq: 1 }
    ],
    description: 'A monolithic engine of war carved from the very obsidian core of the mountains. It pulses with a raw, geological malice.',
    expReward: 10000
  },
  {
    id: 'monster-void-kraken',
    name: 'Void-Eater Kraken',
    type: 'Hybrid',
    hp: 480,
    ac: 16,
    stats: { str: 24, dex: 14, con: 22, int: 20, wis: 18, cha: 18 },
    abilities: [
      { name: 'Event Horizon', description: 'Ranged attacks against the Kraken from more than 15ft away have a 50% chance to be swallowed by the void.', type: 'Passive', levelReq: 1 },
      { name: 'Memory Devour', description: 'Target must succeed on an INT save or lose access to their highest-level ability for the rest of the encounter.', type: 'Active', levelReq: 1 },
      { name: 'Constrict the Soul', description: 'Grapples up to four targets. While grappled, players take 4d6 psychic damage at start of turn.', type: 'Active', levelReq: 1 }
    ],
    description: 'A cosmic horror that swims through the aetheric mists. Its skin is a shifting map of dying stars.',
    expReward: 9500
  },
  {
    id: 'monster-shadow-sovereign',
    name: 'Sovereign Shadow-Dragon',
    type: 'Draconian',
    hp: 600,
    ac: 19,
    stats: { str: 30, dex: 16, con: 28, int: 22, wis: 20, cha: 26 },
    abilities: [
      { name: 'Aetheric Predator', description: 'Spells cast within 100ft of the Dragon cost an additional spell slot of the same level.', type: 'Passive', levelReq: 1 },
      { name: 'Oblivion Breath', description: '90ft cone. 15d10 Necrotic damage. Creatures reduced to 0 HP are erased from reality and cannot be Revivified.', type: 'Active', levelReq: 1 },
      { name: 'World-Shaking Wingbeat', description: 'All players are knocked Prone and take 4d12 bludgeoning damage. The Dragon then teleports up to 100ft.', type: 'Active', levelReq: 1 }
    ],
    description: 'The eldest of the shadow drakes, whose wings can blot out the aetheric sun. Legend says it was born from the first tear shed by the Engine.',
    expReward: 15000
  }
];

export const RULES_MANIFEST = `
1. **THE AETHERIC VOICE**: The Engine (Gemini AI) is the ultimate arbiter of fate. Its word is law, and its descriptions define reality. Roleplay thy actions; the Engine shall determine the consequences.
2. **SOUL PROGRESSION**: To ascend, a soul must accumulate Experience (EXP). The threshold for enlightenment is 1,000 EXP multiplied by thy current Level. The Absolute Zenith is **Level 20**.
3. **THE TRIAD OF WEALTH**:
   - **Aurels**: Gold minted in the forge of history. Used for common trade and mundane survival.
   - **Shards**: Fragments of solidified magic. Required for mystical artifacts and aetheric resonance.
   - **Ichor**: The life-blood of the Engine. Required for dark rituals, rare manifestations, and binding ancient souls.
4. **COMBAT & POSITIONING**: Conflicts manifest upon a 20x20 Tactical Grid. Each tile represents 5 feet of physical space. Positioning is shared among all bonded souls in real-time. Use 'Enter Combat' to manifest the grid.
5. **PERMANENCE OF OBLIVION**: When Vitality (HP) reaches zero, a soul teeters on the edge of the void. Death is permanent unless reversed by high-level magic or aetheric intervention from a primary soul.
6. **ATTRIBUTE ASCENSION (ASI)**: At Levels 4, 8, 12, 16, and 19, thy vessel gains 2 points to bolster its primary attributes (Strength, Dexterity, etc.).
7. **THE ALCHEMIST'S BURDEN**: Specialized souls can harvest 'Unique Parts' from non-humanoid foes. These may be transmuted into volatile flasks or potent elixirs during a Short Rest to assist the party.
8. **SOUL RESONANCE (MULTIPLAYER)**: Multiple souls can bind to a single Engine via Peer-to-Peer resonance IDs. The Host Soul anchor determines the campaign's progression and DM manifestations.
9. **MIGRATION & PERSISTENCE**: Thy chronicle is stored in the local memory of thy vessel. To transfer thy existence to a new realm, thou must manifest a 'Soul Signature' in the Nexus.
10. **RESTING RITUALS**:
    - **Short Rest**: Restores half of missing Vitality and a portion of consumed aether (spell slots).
    - **Long Rest**: Full restoration of all Vitality and Aetheric reserves. Typically performed at The Hearth.
`;

export const STARTER_CAMPAIGN_PROMPT = `
The Chronicle begins in 'The Broken Cask', a tavern smelling of stale ale and damp earth in the frontier town of Oakhaven. 
Outside, the sky is a bruised purple, and the obsidian walls of the mountains loom like giants.
Your fellowship—Miri, Lina, and Seris—are huddled around a scarred wooden table. 
The air is thick with rumors of a pallid beast stalking livestock... a Gorechimera.
A stranger in dark, tattered robes approaches your table, clutching a parchment sealed with blood-red wax.
"The Engine has chosen you," he whispers.
`;

export const TUTORIAL_SCENARIO = {
  title: "The Path to Ascension (Tutorial Saga)",
  prompt: `
    [EPIC TUTORIAL SAGA: LVL 1-5 PROGRESSION]
    Goal: Guide the fellowship through a long-form narrative that culminates in reaching Level 5.
    
    THE ARCH:
    1. **STAGE 1: THE BREACH (Lv 1-2)**. The fellowship stands at the threshold of the Obsidian Gate. Encounter 'Shadow Wolves'. Learn basic movement and HP.
    2. **STAGE 2: THE SUNKEN CRYPT (Lv 2-3)**. Descend into the catacombs. Face 'Blighted Sentinels'. Learn about AC, Resistance, and Spell Slots.
    3. **STAGE 3: THE OBSIDIAN SPIRE (Lv 3-4)**. Scale the peaks of the Engine. Face 'Shadow Drakes'. Learn about Verticality, Advantage, and Buffs.
    4. **STAGE 4: THE HEART OF THE ENGINE (Lv 5)**. Climax at the Core. Face the 'The Hollow King'. 
    
    DM DIRECTIVE: 
    - Provide deep narrative descriptions of surroundings and atmosphere.
    - Award +1000 EXP or more at each stage completion to ensure party reaches Lv 5 by the climax.
    - Balance every encounter specifically for the party's current archetypes and total level.
    - Always begin by describing the immediate surroundings with evocative prose.
  `
};
