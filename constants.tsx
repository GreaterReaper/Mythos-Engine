
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
    { name: 'Chaos Bolt', description: 'Fire a bolt of unpredictable energy via Aether Staff.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, damage: '1d12', damageType: 'Psychic' },
    { name: 'Shield of Aether', description: 'A barrier of shimmering force (+5 AC). Requires Staff.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 8 },
    { name: 'Fireball', description: 'A massive explosion of heat. Requires Staff.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 20, damage: '8d6', damageType: 'Fire' },
    { name: 'Disintegrate', description: 'A green ray that turns foes to ash. Requires Staff.', type: 'Spell', levelReq: 11, baseLevel: 6, manaCost: 35, damage: '10d6+40', damageType: 'Force' },
    { name: 'Chain Lightning', description: 'Lightning arcs to 3 additional targets. Requires Staff.', type: 'Spell', levelReq: 15, baseLevel: 7, manaCost: 45, damage: '10d8', damageType: 'Lightning' },
    { name: 'Meteor Swarm', description: 'Blazing orbs of fire crash from the sky. Requires Staff.', type: 'Spell', levelReq: 19, baseLevel: 9, manaCost: 80, damage: '20d6/20d6', damageType: 'Fire/Bludgeoning' },
    { name: 'Wish', description: 'Capstone: Alter reality itself. Duplicate any 8th level spell or reshape the chronicle.', type: 'Spell', levelReq: 20, baseLevel: 9, manaCost: 100 }
  ],
  [Archetype.Mage]: [
    { name: 'Cure Wounds', description: 'Seal wounds and restore vitality via Ritual Robes.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, damage: '1d8+WIS', damageType: 'Healing' },
    { name: 'Bless', description: 'Fortify spirits (Add 1d4 to attack/saves). Requires Robes.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5 },
    { name: 'Revivify', description: 'Recall a soul that fell in the last minute. Requires Staff.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 25 },
    { name: 'Spirit Guardians', description: 'Angelic spirits circle and protect. Requires Robes.', type: 'Spell', levelReq: 5, baseLevel: 3, manaCost: 15, damage: '3d8', damageType: 'Radiant' },
    { name: 'Heal', description: 'A massive flood of vitality restores health. Requires Staff.', type: 'Spell', levelReq: 11, baseLevel: 6, manaCost: 35, damage: '70', damageType: 'Healing' },
    { name: 'True Resurrection', description: 'Restore a soul even if the body is ash. Requires Staff.', type: 'Spell', levelReq: 17, baseLevel: 9, manaCost: 60 },
    { name: 'Divine Intervention', description: 'Capstone: Thy deity directly manifests to aid the Fellowship.', type: 'Spell', levelReq: 20, baseLevel: 9, manaCost: 80 }
  ],
  [Archetype.DarkKnight]: [
    { name: 'Dark Rite', description: 'Sacrifice vitality for necrotic damage via 2H Steel.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 5, hpCost: 10, damage: '3d10', damageType: 'Necrotic' },
    { name: 'Hex', description: 'Curse a target to take extra necrotic damage.', type: 'Spell', levelReq: 3, baseLevel: 1, manaCost: 5, damage: '1d6', damageType: 'Necrotic' },
    { name: 'Vampiric Touch', description: 'Siphon health from a touched foe. Requires Obsidian Plate.', type: 'Spell', levelReq: 11, baseLevel: 3, manaCost: 15, damage: '3d6', damageType: 'Necrotic' },
    { name: 'Abyssal Reap', description: 'A horizontal sweep of void energy. Requires 2H Weapon.', type: 'Spell', levelReq: 15, baseLevel: 7, manaCost: 40, damage: '10d10', damageType: 'Necrotic' }
  ],
  [Archetype.BloodArtist]: [
    { name: 'Life Tap', description: 'Drain a foe to replenish thy wells via Sickle.', type: 'Spell', levelReq: 1, baseLevel: 1, manaCost: 0, hpCost: 5, damage: '1d10', damageType: 'Necrotic' },
    { name: 'Transfusion', description: 'Sacrifice thy HP to heal an ally double. Requires Sickle.', type: 'Spell', levelReq: 5, baseLevel: 2, manaCost: 5, hpCost: 15, damage: '30', damageType: 'Healing' },
    { name: 'Exsanguinate', description: 'Directly draw the vitals out of a target. Requires Robes.', type: 'Spell', levelReq: 11, baseLevel: 6, manaCost: 25, hpCost: 20, damage: '10d8', damageType: 'Necrotic' }
  ]
};

export const ARCHETYPE_INFO: Record<string, { hpDie: number; role: Role; description: string; coreAbilities: Ability[]; spells?: Ability[]; starterGear: string[] }> = {
  [Archetype.Archer]: {
    hpDie: 8, role: 'DPS', description: 'Lithe hunters who strike from the shadows. Bound to Leather Armor and Bows.',
    coreAbilities: [
      { name: 'Sky-Splitter', description: 'Thy precision ignores half-cover and range penalties.', type: 'Passive', levelReq: 1 },
      { name: 'Rain of Arrows', description: 'Barrage a 10ft area with spectral arrows.', type: 'Active', levelReq: 5, manaCost: 10, damage: '4d6', damageType: 'Piercing' },
      { name: 'Heart-Seeker', description: 'A shot that ignores all armor and criticals on 18-20.', type: 'Active', levelReq: 11, manaCost: 20 },
      { name: 'Volley of Souls', description: 'Fire at every visible enemy simultaneously.', type: 'Active', levelReq: 15, manaCost: 35, damage: '3d8', damageType: 'Force' },
      { name: 'Void Arrow', description: 'Capstone: Fire an arrow that collapses into a singularity. Target is erased if they fail a CON save.', type: 'Active', levelReq: 20, manaCost: 50 }
    ],
    starterGear: ['Hunting Bow', 'Leather Jerkin']
  },
  [Archetype.Thief]: {
    hpDie: 8, role: 'DPS', description: 'Masters of the quick blade and unseen step. Bound to Leather Armor and Daggers.',
    coreAbilities: [
      { name: 'Lethal Ambush', description: 'Deal extra 2d6 damage when thou hast advantage.', type: 'Passive', levelReq: 1 },
      { name: 'Cunning Step', description: 'Dash or Disengage as a minor action.', type: 'Active', levelReq: 3, manaCost: 2 },
      { name: 'Evasion', description: 'Avoid damage from area effects entirely on successful saves.', type: 'Passive', levelReq: 7 },
      { name: 'Assassinate', description: 'Any hit against a surprised creature is a critical hit.', type: 'Passive', levelReq: 11 },
      { name: 'Blurring Reflexes', description: 'Thou hast two reactions per turn.', type: 'Passive', levelReq: 15 },
      { name: 'Soul-Rip', description: 'Capstone: Instantly slay any non-boss creature with a successful sneak attack.', type: 'Active', levelReq: 20, manaCost: 30 }
    ],
    starterGear: ['Twin Daggers', 'Leather Jerkin']
  },
  [Archetype.Warrior]: {
    hpDie: 12, role: 'Tank', description: 'Steel-clad juggernauts who forsake shields for absolute devastation. Bound to Heavy Plate and 2H Steel.',
    coreAbilities: [
      { name: 'Charged Devastation', description: 'Every third successful hit deals double damage.', type: 'Passive', levelReq: 1 },
      { name: 'Berserker Roar', description: 'Taunt all enemies within 15ft. Gain 15 Temp HP.', type: 'Active', levelReq: 3, manaCost: 5 },
      { name: 'Iron Will', description: 'Thou art immune to the Frightened condition.', type: 'Passive', levelReq: 7 },
      { name: 'Execute', description: 'Instantly slay a foe below 20% HP.', type: 'Active', levelReq: 11, manaCost: 15 },
      { name: 'Bloodstorm', description: 'A whirlwind of steel that hits all adjacent enemies twice.', type: 'Active', levelReq: 15, manaCost: 20, damage: '4d12', damageType: 'Slashing' },
      { name: 'The Eternal Juggernaut', description: 'Capstone: Thou cannot fall below 1 HP as long as thou art attacking.', type: 'Passive', levelReq: 20 }
    ],
    starterGear: ['Double-Headed Greataxe', 'Heavy Iron Plate']
  },
  [Archetype.Fighter]: {
    hpDie: 10, role: 'Tank', description: 'Unyielding guardians with blade and bulwark. Bound to Steel Plate and Shields.',
    coreAbilities: [
      { name: 'Shield Bash', description: 'Force a foe to drop their guard; +2 to next attack.', type: 'Active', levelReq: 1, manaCost: 3 },
      { name: 'Sentinel Strike', description: 'Enemies hit by AoO have their movement reduced to 0.', type: 'Passive', levelReq: 3 },
      { name: 'Bastion', description: 'Grant +5 AC to an adjacent ally for 1 turn.', type: 'Active', levelReq: 7, manaCost: 8 },
      { name: 'Unbreakable', description: 'Once per day, survive a lethal hit with 1 HP.', type: 'Passive', levelReq: 11 },
      { name: 'Phalanx Manifest', description: 'Summon spectral shields to protect the entire party (+3 AC).', type: 'Active', levelReq: 15, manaCost: 20 },
      { name: 'Indomitable Legion', description: 'Capstone: All allies within 15ft cannot be frightened or charmed.', type: 'Passive', levelReq: 20 }
    ],
    starterGear: ['Soldier\'s Longsword', 'Iron Kite Shield', 'Steel Plate Armor']
  },
  [Archetype.DarkKnight]: {
    hpDie: 10, role: 'Tank', description: 'Warriors who use their own pain as a weapon. Bound to Obsidian Plate and 2H Steel.',
    coreAbilities: [
      { name: 'Soul Rend', description: 'Heal for 25% of all necrotic damage dealt.', type: 'Passive', levelReq: 1 },
      { name: 'Blackest Night', description: 'Manifest a shadow-shield that explodes when broken.', type: 'Active', levelReq: 7, manaCost: 15 },
      { name: 'Living Dead', description: "Survive for 2 extra turns at 0 HP. Healing received is tripled.", type: 'Passive', levelReq: 11 },
      { name: 'Avatar of Oblivion', description: 'Capstone: Aura of Fear (30ft). Enemies have disadvantage on all checks.', type: 'Passive', levelReq: 20 }
    ],
    spells: SPELL_LIBRARY[Archetype.DarkKnight],
    starterGear: ['Vile Zweihander', 'Obsidian Heavy Plate']
  },
  [Archetype.Alchemist]: {
    hpDie: 8, role: 'Support', description: 'Brewers of tonics and volatile acids. Bound to Leather Armor and Shortswords.',
    coreAbilities: [
      { name: 'Volatile Catalyst', description: 'All utility items deal 1d6 extra acid damage.', type: 'Passive', levelReq: 1 },
      { name: 'Quick Mix', description: 'Apply or use a tonic as a minor action.', type: 'Passive', levelReq: 3 },
      { name: 'Noxious Cloud', description: 'Create a 15ft cloud of poison (1d4 damage/turn).', type: 'Active', levelReq: 7, manaCost: 10 },
      { name: 'Grand Discovery', description: 'Craft a legendary elixir that restores all HP/Mana.', type: 'Passive', levelReq: 11 },
      { name: 'Transmutation Ray', description: 'Turn an enemy into a harmless toad for 1 turn.', type: 'Active', levelReq: 15, manaCost: 25 },
      { name: 'Philosopher\'s Stone', description: 'Capstone: Convert any material into mana. Gain infinite mana for 3 turns.', type: 'Active', levelReq: 20 }
    ],
    starterGear: ['Weighted Shortsword', 'Leather Jerkin']
  },
  [Archetype.Sorcerer]: {
    hpDie: 6, role: 'DPS', description: 'Conduits of raw power. Bound to Shadow Robes and Aether Staffs.',
    coreAbilities: [
      { name: 'Arcane Memory', description: 'Recall a manifest spell once per day without mana.', type: 'Passive', levelReq: 1 },
      { name: 'Twinned Manifest', description: 'Cast a single-target spell on two targets for 1.5x cost.', type: 'Passive', levelReq: 5 },
      { name: 'Empowered Soul', description: 'Add thy INT modifier to all spell damage.', type: 'Passive', levelReq: 11 },
      { name: 'Reality Warp', description: 'Swap positions with any creature within 60ft.', type: 'Active', levelReq: 15, manaCost: 20 }
    ],
    spells: SPELL_LIBRARY[Archetype.Sorcerer],
    starterGear: ['Aetheric Staff', 'Shadow Robes']
  },
  [Archetype.Mage]: {
    hpDie: 6, role: 'Support', description: 'Healers of the fellowship. Bound to Ritual Robes and Aether Staffs.',
    coreAbilities: [
      { name: 'Harmonized Aether', description: 'Thy blessings reach one additional ally.', type: 'Passive', levelReq: 1 },
      { name: 'Sanctuary', description: 'Protect an ally; enemies must save to attack them.', type: 'Active', levelReq: 3, manaCost: 5 },
      { name: 'Sacred Flame', description: 'A ray of light that ignores cover.', type: 'Active', levelReq: 7, manaCost: 5, damage: '2d8', damageType: 'Radiant' },
      { name: 'Aura of Purity', description: 'Allies within 30ft are immune to poison and disease.', type: 'Passive', levelReq: 15 }
    ],
    spells: SPELL_LIBRARY[Archetype.Mage],
    starterGear: ['Elderwood Staff', 'Ritual Robes']
  },
  [Archetype.BloodArtist]: {
    hpDie: 10, role: 'DPS', description: 'Collectors of life-force. Bound to Crimson Robes and Sickles.',
    coreAbilities: [
      { name: 'Sanguine Link', description: 'Bind two hearts; damage to one affects both.', type: 'Active', levelReq: 1, manaCost: 10 },
      { name: 'Hemorrhage', description: 'Dealing necrotic damage causes 1d4 bleed for 2 turns.', type: 'Passive', levelReq: 5 },
      { name: 'Blood Puppet', description: 'Control a creature’s physical movement for 1 turn.', type: 'Active', levelReq: 15, manaCost: 30 },
      { name: 'Blood God', description: 'Capstone: Every drop of blood spilt (ally or foe) grants thou 5 Mana.', type: 'Passive', levelReq: 20 }
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
6. **AETHERIC MATURITY**: Spells and manifestations are gated by a Vessel's Level. Premature attempts at high-level manifestations result in aetheric failure.
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
