
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Character, ClassDef, Stats, Trait, RaceType, GenderType, Item, Spell, UserAccount } from '../types';
import { generateImage, generateCharacterFeats, rerollTraits, generateSpellbook, rerollStats } from '../services/gemini';

const INITIAL_STATS: Stats = { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 };
const POINT_COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

const STAT_DESCRIPTIONS: Record<keyof Stats, string> = {
  strength: "Governs physical power, lifting capacity, and the force of melee attacks.",
  dexterity: "Governs agility, reflexes, balance, and accuracy with ranged weapons.",
  constitution: "Governs health, stamina, and vital force; directly determines your maximum HP.",
  intelligence: "Governs mental acuity, logic, memory, and the potency of arcane spells.",
  wisdom: "Governs intuition, perception, and willpower; key for divine magic and sensing the world.",
  charisma: "Governs confidence, social influence, and the force of personality or innate magic.",
};

const RACIAL_BONUSES: Record<RaceType, Partial<Stats>> = {
  Human: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
  'Variant Human': { strength: 1, constitution: 1, intelligence: 1 },
  Dwarf: { constitution: 2, strength: 2 },
  Elf: { dexterity: 2, intelligence: 2 },
  'Half-Elf': { charisma: 2, dexterity: 1, wisdom: 1 },
  Orc: { strength: 2, constitution: 1 },
  Goblin: { dexterity: 2, constitution: 1 },
  Kobold: { dexterity: 2 },
  Tiefling: { charisma: 2, intelligence: 1 },
  Dragonborn: { strength: 2, charisma: 1 },
  Tabaxi: { dexterity: 2, charisma: 1 },
  Lizardfolk: { constitution: 2, wisdom: 1 },
  Minotaur: { strength: 2, constitution: 1 },
  Satyr: { charisma: 2, dexterity: 1 },
};

const RACIAL_TRAITS: Record<RaceType, { icon: string, flavor: string, traits: Trait[] }> = {
  Human: {
    icon: '🌍',
    flavor: 'Adaptable and ambitious generalists who thrive in every corner of the realm.',
    traits: [{ name: 'Versatile Heritage', description: 'Exceptional adaptability provides a minor boost to all core attributes.', locked: true }]
  },
  'Variant Human': {
    icon: '✨',
    flavor: 'Specialized individuals who have traded broad mastery for singular, potent talents.',
    traits: [
      { name: 'Bonus Feat', description: 'Begins the journey with a specialized mastery or talent.', locked: true },
      { name: 'Skillful', description: 'Proficiency in an extra skill of choice.', locked: true }
    ]
  },
  Dwarf: {
    icon: '⚒️',
    flavor: 'Hardy survivors of the deep earth, forged in stone and unyielding tradition.',
    traits: [
      { name: 'Dwarven Resilience', description: 'Innate resistance to poisons and a constitution hardened by mountain air.', locked: true },
      { name: 'Stonecunning', description: 'Natural intuition for stonework and underground architecture.', locked: true }
    ]
  },
  Elf: {
    icon: '🍃',
    flavor: 'Graceful immortals with a deep connection to the ancient magics of the wild.',
    traits: [
      { name: 'Fey Ancestry', description: 'Immune to magical sleep and highly resistant to mental charms.', locked: true },
      { name: 'Keen Senses', description: 'Heightened awareness granting superior perception in darkness.', locked: true }
    ]
  },
  'Half-Elf': {
    icon: '🎭',
    flavor: 'Charismatic wanderers who walk between worlds, possessing the best of both lineages.',
    traits: [
      { name: 'Fey Ancestry', description: 'Shared heritage provides resistance to charms and sleep.', locked: true },
      { name: 'Skill Versatility', description: 'Extraordinarily adaptable, gaining mastery in two extra skills.', locked: true }
    ]
  },
  Orc: {
    icon: '👹',
    flavor: 'Brutish and powerful, orcs are warriors of primal strength and ferocity.',
    traits: [
      { name: 'Aggressive', description: 'As a bonus action, move up to your speed toward an enemy you can see.', locked: true },
      { name: 'Primal Intuition', description: 'Proficiency in two skills from: Animal Handling, Insight, Intimidation, Nature, Perception, and Survival.', locked: true }
    ]
  },
  Goblin: {
    icon: '👺',
    flavor: 'Small, cunning, and surprisingly hardy, goblins survive through wit and agility.',
    traits: [
      { name: 'Nimble Escape', description: 'Can take the Disengage or Hide action as a bonus action on each of your turns.', locked: true },
      { name: 'Fury of the Small', description: 'Deal extra damage to a creature of a size category larger than you.', locked: true }
    ]
  },
  Kobold: {
    icon: '🦎',
    flavor: 'Clever tunnel-dwellers who use numbers and ingenuity to overcome larger foes.',
    traits: [
      { name: 'Pack Tactics', description: 'Advantage on attack rolls against a creature if at least one ally is within 5 feet of the creature.', locked: true },
      { name: 'Sunlight Sensitivity', description: 'Disadvantage on attack rolls and Perception checks that rely on sight when in direct sunlight.', locked: true }
    ]
  },
  Tiefling: {
    icon: '🔥',
    flavor: 'Touched by infernal bloodlines, tieflings carry the mark of the abyss in their eyes and spells.',
    traits: [
      { name: 'Hellish Resistance', description: 'Resistance to fire damage.', locked: true },
      { name: 'Infernal Legacy', description: 'Innate knowledge of the Thaumaturgy cantrip and later more powerful hellish magic.', locked: true }
    ]
  },
  Dragonborn: {
    icon: '🐲',
    flavor: 'Heirs to the ancient dragons, possessing their elemental breath and unyielding pride.',
    traits: [
      { name: 'Draconic Ancestry', description: 'Elemental damage resistance based on your dragon ancestor.', locked: true },
      { name: 'Breath Weapon', description: 'Use your action to exhale destructive elemental energy in a cone or line.', locked: true }
    ]
  },
  Tabaxi: {
    icon: '🐱',
    flavor: 'Agile cat-folk from distant lands with an insatiable curiosity and natural grace.',
    traits: [
      { name: 'Feline Agility', description: 'Double your speed for one turn during combat.', locked: true },
      { name: 'Cat\'s Claws', description: 'Natural claws that deal 1d4 slashing damage and provide a climbing speed.', locked: true }
    ]
  },
  Lizardfolk: {
    icon: '🐊',
    flavor: 'Pragmatic reptilians who view the world through the lens of survival and ancient instinct.',
    traits: [
      { name: 'Natural Armor', description: 'Tough scales provide a base AC of 13 + Dexterity modifier.', locked: true },
      { name: 'Hungry Jaws', description: 'As a bonus action, make a special bite attack to gain temporary hit points.', locked: true }
    ]
  },
  Minotaur: {
    icon: '🐂',
    flavor: 'Powerfully built kin of the labyrinth, possessing unyielding strength and innate navigation.',
    traits: [
      { name: 'Goring Rush', description: 'After using the Dash action, make a melee attack with your horns as a bonus action.', locked: true },
      { name: 'Hammering Horns', description: 'Use your horns to shove a creature as a bonus action after a melee hit.', locked: true }
    ]
  },
  Satyr: {
    icon: '🐐',
    flavor: 'Whimsical fey-touched wanderers who find magic in song, dance, and the wild.',
    traits: [
      { name: 'Mirthful Leaps', description: 'Add a d8 to the distance of any jump you make.', locked: true },
      { name: 'Magic Resistance', description: 'Advantage on saving throws against spells and other magical effects.', locked: true }
    ]
  },
};

interface CharacterCreatorProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  classes: ClassDef[];
  items?: Item[];
  notify: (message: string, type?: any) => void;
  reservoirReady: boolean;
  currentUser: UserAccount;
}

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ characters, setCharacters, classes, items = [], notify, reservoirReady, currentUser }) => {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [race, setRace] = useState<RaceType>('Human');
  const [gender, setGender] = useState<GenderType>('Male');
  const [charDescription, setCharDescription] = useState('');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [generating, setGenerating] = useState(false);
  const [rerollingStats, setRerollingStats] = useState<string | null>(null);
  const [rerollingFeats, setRerollingFeats] = useState<string | null>(null);
  const [learningSpells, setLearningSpells] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'hp' | 'level'>('name');

  const filteredCharacters = useMemo(() => {
    return characters
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'hp') return b.maxHp - a.maxHp;
        if (sortBy === 'level') return b.level - a.level;
        return 0;
      });
  }, [characters, search, sortBy]);

  const totalPointsUsed = useMemo(() => (Object.values(stats) as number[]).reduce((acc: number, val: number) => acc + (POINT_COSTS[val] || 0), 0), [stats]);
  const pointsRemaining = 27 - totalPointsUsed;
  
  const selectedClassForCreation = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);

  const finalStats = useMemo(() => {
    const bonuses = RACIAL_BONUSES[race];
    const result = { ...stats };
    (Object.keys(bonuses) as Array<keyof Stats>).forEach(key => { result[key] += bonuses[key] || 0; });
    return result;
  }, [stats, race]);

  const handleStatChange = (stat: keyof Stats, delta: number) => {
    const newVal = stats[stat] + delta;
    if (newVal < 8 || newVal > 15) return;
    const costDiff = (POINT_COSTS[newVal] || 0) - (POINT_COSTS[stats[stat]] || 0);
    if (pointsRemaining - costDiff < 0) return;
    setStats(prev => ({ ...prev, [stat]: newVal }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!name || !classId) {
        notify("Every legend requires a name and archetype.", "error");
        return;
    }
    if (pointsRemaining < 0) {
      notify("Your attributes exceed your fated limit. Use Point Buy.", "error");
      return;
    }
    if (!reservoirReady && !currentUser.isAdmin) return;
    
    setGenerating(true);
    try {
      const selectedClass = classes.find(c => c.id === classId);
      const prompt = `Fantasy TTRPG character portrait. A ${gender} ${race} ${selectedClass?.name}. Appearance: ${charDescription}. Atmosphere: dark fantasy, painted masterpiece. ${refImage ? "Strictly maintain the facial features and style from the reference image provided." : ""}`;
      
      const imageUrl = await generateImage(prompt, refImage || undefined);
      const classFeats = await generateCharacterFeats(selectedClass?.name || 'Adventurer', selectedClass?.description || '');
      
      const racialFeats = RACIAL_TRAITS[race].traits.map(t => ({ ...t, locked: true, isInnate: true } as any));
      const allFeats = [...racialFeats, ...classFeats];
      
      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name, classId, race, gender, description: charDescription, level: 1, stats: finalStats,
        hp: (selectedClass?.startingHp || 10) + (Math.floor((finalStats.constitution - 10) / 2)),
        maxHp: (selectedClass?.startingHp || 10) + (Math.floor((finalStats.constitution - 10) / 2)),
        feats: allFeats, imageUrl, isPlayer: characters.length === 0,
        inventory: selectedClass?.startingItemIds || [],
        knownSpells: [],
        lockedStats: []
      };
      setCharacters(prev => [...prev, newChar]);
      setName(''); setClassId(''); setCharDescription(''); setStats(INITIAL_STATS); setRefImage(null);
      setSelectedCharacterId(newChar.id);
      notify(`${name} Bound to the Chronicle.`, "success");
    } catch (e: any) { 
      notify(e.message || "Summoning Failed.", "error"); 
    } finally { 
      setGenerating(false); 
    }
  };

  const handleRerollStatsOnChar = async (char: Character) => {
    if ((!reservoirReady && !currentUser.isAdmin) || char.id.startsWith('hero-')) return;
    setRerollingStats(char.id);
    try {
      const cls = classes.find(c => c.id === char.classId);
      const newStats = await rerollStats(char.name, cls?.name || 'Hero', char.stats, char.lockedStats || []);
      setCharacters(prev => prev.map(c => {
        if (c.id !== char.id) return c;
        const newHp = (classes.find(cl => cl.id === c.classId)?.startingHp || 10) + (Math.floor((newStats.constitution - 10) / 2));
        return { ...c, stats: newStats, hp: newHp, maxHp: newHp };
      }));
      notify("Stats Rewoven.", "success");
    } catch (e: any) { notify("Arcane Interference.", "error"); } finally { setRerollingStats(null); }
  };

  const toggleStatLockOnChar = (charId: string, stat: keyof Stats) => {
    if (charId.startsWith('hero-')) return;
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const currentLocks = c.lockedStats || [];
      const newLocks = currentLocks.includes(stat) ? currentLocks.filter(s => s !== stat) : [...currentLocks, stat];
      return { ...c, lockedStats: newLocks };
    }));
  };

  const toggleFeatLock = (charId: string, featIdx: number) => {
    if (charId.startsWith('hero-')) return;
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const newFeats = [...c.feats];
      const feat = newFeats[featIdx] as any;
      if (feat.isInnate) {
        notify("Innate heritage cannot be rewoven.", "info");
        return c;
      }
      newFeats[featIdx] = { ...feat, locked: !feat.locked };
      return { ...c, feats: newFeats };
    }));
  };

  const handleRerollFeats = async (char: Character) => {
    if ((!reservoirReady && !currentUser.isAdmin) || char.id.startsWith('hero-')) return;
    setRerollingFeats(char.id);
    try {
      const cls = classes.find(c => c.id === char.classId);
      const updated = await rerollTraits('character', char.name, cls?.description || '', char.feats);
      setCharacters(prev => prev.map(c => {
        if (c.id !== char.id) return c;
        let uIdx = 0;
        const merged = c.feats.map(f => {
          if (f.locked) return f;
          const replacement = updated[uIdx];
          if (replacement) {
            uIdx++;
            return { ...replacement, locked: false };
          }
          return f;
        });
        return { ...c, feats: merged };
      }));
      notify("Feats Rewoven.", "success");
    } catch (e: any) { notify("Interference.", "error"); } finally { setRerollingFeats(null); }
  };

  const handleGenerateSpells = async (char: Character) => {
    if ((!reservoirReady && !currentUser.isAdmin) || char.id.startsWith('hero-')) return;
    setLearningSpells(char.id);
    try {
      const cls = classes.find(c => c.id === char.classId);
      const spells = await generateSpellbook(cls?.name || 'Mage', cls?.description || '', char.level);
      setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, knownSpells: spells } : c));
      notify("Arcane Grimoire Updated.", "success");
    } catch (e: any) { notify("Spells Failed to Coalesce.", "error"); } finally { setLearningSpells(null); }
  };

  const removeItemFromChar = (charId: string, itemId: string) => {
    if (charId.startsWith('hero-')) {
      notify("Official hero gear is bound and cannot be removed.", "info");
      return;
    }
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      return { ...c, inventory: c.inventory.filter(id => id !== itemId) };
    }));
  };

  const handleDeleteCharacter = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (id.startsWith('hero-')) {
      notify("Official fated souls cannot be banished.", "info");
      return;
    }
    if (window.confirm(`Banish ${name} from the Fellowship forever?`)) {
      setCharacters(prev => prev.filter(c => c.id !== id));
      notify(`${name} has returned to the ether.`, "info");
      if (selectedCharacterId === id) setSelectedCharacterId(null);
    }
  };

  const selectedChar = characters.find(c => c.id === selectedCharacterId);
  const selectedClass = classes.find(c => c?.id === selectedChar?.classId);
  const charInventory = items.filter(i => selectedChar?.inventory.includes(i.id));
  const isPremade = selectedChar?.id.startsWith('hero-');

  return (
    <div className="space-y-12 pb-12">
      <div className="text-center pt-8">
        <h2 className="text-3xl md:text-4xl font-black fantasy-font text-[#b28a48]">The Fellowship</h2>
        <p className="text-neutral-600 text-[10px] uppercase tracking-[0.4em] mt-2 font-black">Party Assembly & Chronicle Binding</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-[450px]">
          <div className={`grim-card p-6 md:p-8 border-2 rounded-sm bg-black shadow-2xl transition-all ${currentUser.isAdmin ? 'border-amber-500/40' : 'border-dashed border-[#b28a48]/20'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black fantasy-font text-neutral-300 uppercase tracking-widest">Summon Hero</h3>
              {currentUser.isAdmin && (
                <span className="text-[7px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-1 rounded-sm tracking-widest animate-pulse">ARCHITECT</span>
              )}
            </div>
            <div className="space-y-5">
              <div className="space-y-1 text-left">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Identify Legend</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NAME..." className="w-full bg-black border border-neutral-800 p-4 text-sm tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-bold uppercase rounded-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Identity</label>
                  <div className="relative">
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value as GenderType)} 
                      className="w-full bg-black border border-neutral-800 p-4 text-[11px] text-[#b28a48] font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-[#b28a48] rounded-sm"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Path</label>
                  <div className="relative">
                    <select 
                      value={classId} 
                      onChange={(e) => setClassId(e.target.value)} 
                      className="w-full bg-black border border-neutral-800 p-4 text-[11px] text-[#b28a48] font-bold uppercase tracking-widest outline-none focus:border-[#b28a48] appearance-none cursor-pointer rounded-sm"
                    >
                      <option value="">Select Path...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-left">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Heritage (Race)</label>
                <select 
                    value={race} 
                    onChange={(e) => setRace(e.target.value as RaceType)} 
                    className="w-full bg-black border border-neutral-800 p-4 text-[11px] text-[#b28a48] font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-[#b28a48] rounded-sm"
                  >
                    {(Object.keys(RACIAL_TRAITS) as RaceType[]).map(r => (
                      <option key={r} value={r}>{RACIAL_TRAITS[r].icon} {r}</option>
                    ))}
                </select>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Attributes</label>
                  <span className={`text-[9px] font-bold tracking-tighter ${pointsRemaining < 0 ? 'text-red-500 animate-pulse' : 'text-neutral-500'}`}>{pointsRemaining} PTS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                  {(Object.keys(INITIAL_STATS) as Array<keyof Stats>).map((s) => {
                    const bonus = RACIAL_BONUSES[race][s] || 0;
                    const valWithBonus = stats[s] + bonus;
                    const isPreferred = selectedClassForCreation?.preferredStats?.some(ps => ps.toLowerCase().includes(s.toLowerCase()));

                    return (
                      <div 
                        key={s} 
                        className={`bg-black border p-2 md:p-3 text-center relative group transition-all rounded-sm ${
                          isPreferred ? 'border-amber-500/40 shadow-[0_0_10px_rgba(178,138,72,0.1)]' : 'border-neutral-900'
                        }`}
                      >
                        <button 
                          className={`text-[8px] font-bold uppercase mb-1 tracking-tighter block w-full transition-colors ${
                            isPreferred ? 'text-amber-500' : 'text-neutral-600'
                          }`}
                        >
                          {s.slice(0,3)} {isPreferred && '★'}
                        </button>
                        
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleStatChange(s, -1)} className="text-neutral-700 hover:text-red-500 font-black px-2 py-1 text-base"> - </button>
                          <span className={`text-sm font-black ${bonus > 0 ? 'text-green-500' : isPreferred ? 'text-amber-500' : 'text-[#b28a48]'}`}>
                            {valWithBonus}
                          </span>
                          <button onClick={() => handleStatChange(s, 1)} className="text-neutral-700 hover:text-green-500 font-black px-2 py-1 text-base"> + </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Visual Details & Appearance</label>
                <textarea 
                  value={charDescription} 
                  onChange={(e) => setCharDescription(e.target.value)} 
                  placeholder="Inscribe details of their appearance and history..." 
                  className="w-full bg-black border border-neutral-800 p-4 h-24 text-xs text-neutral-500 font-serif italic focus:border-[#b28a48] outline-none shadow-inner resize-none rounded-sm"
                />
              </div>

              <button 
                onClick={handleCreate} 
                disabled={generating || !name || !classId || pointsRemaining < 0 || (!reservoirReady && !currentUser.isAdmin)} 
                className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-5 text-[11px] font-black uppercase tracking-[0.4em] text-[#b28a48] shadow-xl hover:border-[#b28a48] transition-all disabled:opacity-20 active:scale-95 flex flex-col items-center gap-1 rounded-sm"
              >
                {generating ? "SUMMONING..." : "INSCRIBE LEGEND"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
            {filteredCharacters.map(char => (
              <div key={char.id} onClick={() => setSelectedCharacterId(char.id)} className="grim-card flex flex-col group border-[#b28a48]/10 hover:border-[#b28a48]/60 transition-all cursor-pointer shadow-xl overflow-hidden bg-black rounded-sm active:scale-98">
                <div className="h-40 md:h-48 bg-black relative">
                  {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" alt={char.name} /> : <div className="w-full h-full flex items-center justify-center text-5xl">👤</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  
                  {/* Banish Button Overlay */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={(e) => handleDeleteCharacter(e, char.id, char.name)}
                      className="bg-black/60 hover:bg-red-950/80 p-2 rounded-full border border-red-900/30 text-red-500 transition-all active:scale-90 disabled:opacity-20"
                      disabled={char.id.startsWith('hero-')}
                      title={char.id.startsWith('hero-') ? "Fated souls cannot be banished" : "Banish Soul"}
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 text-left">
                     <h4 className="text-lg md:text-xl font-black fantasy-font text-[#b28a48]">{char.name}</h4>
                     <p className="text-[8px] text-neutral-400 uppercase font-bold tracking-widest">{char.race} • LVL {char.level}</p>
                  </div>
                </div>
              </div>
            ))}
            {filteredCharacters.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-900 opacity-20 flex flex-col items-center rounded-sm">
                <span className="text-3xl mb-4">📜</span>
                <p className="text-[10px] uppercase tracking-[0.4em] font-black">Fellowship awaits heroes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedChar && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-8 bg-black/98 backdrop-blur-xl pt-[var(--safe-top)]">
          <div className="relative w-full max-w-6xl bg-[#080808] border border-[#b28a48]/30 shadow-2xl overflow-hidden rounded-sm flex flex-col lg:flex-row h-full md:h-[90vh]">
            <button onClick={() => setSelectedCharacterId(null)} className="absolute top-4 right-4 z-[130] text-neutral-600 hover:text-[#b28a48] text-4xl p-2 active:scale-90 bg-black/40 rounded-full w-12 h-12 flex items-center justify-center">✕</button>

            <div className="lg:w-2/5 relative border-b lg:border-r border-[#b28a48]/10 shrink-0">
              <div className="h-[250px] sm:h-[400px] lg:h-full relative overflow-hidden">
                {selectedChar.imageUrl && <img src={selectedChar.imageUrl} className="w-full h-full object-cover" alt={selectedChar.name} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-left">
                  <h3 className="text-3xl md:text-5xl font-black fantasy-font text-[#b28a48] mb-1">{selectedChar.name}</h3>
                  <p className="text-[9px] md:text-xs uppercase tracking-[0.6em] text-neutral-500 font-black">{selectedChar.race} {selectedClass?.name}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 md:p-12 overflow-y-auto scrollbar-hide pb-20">
              <div className="space-y-12 text-left">
                <section>
                  <div className="flex justify-between items-end border-b border-[#b28a48]/20 pb-3 mb-6">
                    <h4 className="text-sm font-black fantasy-font text-neutral-400 uppercase">Sacred Attributes</h4>
                    {!isPremade && (
                      <button 
                        onClick={() => handleRerollStatsOnChar(selectedChar)} 
                        disabled={rerollingStats === selectedChar.id || (!reservoirReady && !currentUser.isAdmin)}
                        className="text-[9px] font-black text-[#b28a48] uppercase active:scale-95 disabled:opacity-20"
                      >
                        {rerollingStats === selectedChar.id ? '...' : 'Reweave 🎲'}
                      </button>
                    )}
                    {isPremade && <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Static Essence</span>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6">
                    {(Object.keys(selectedChar.stats) as Array<keyof Stats>).map(stat => (
                      <div 
                        key={stat} 
                        onClick={() => toggleStatLockOnChar(selectedChar.id, stat)}
                        className={`bg-black/60 border p-4 md:p-6 rounded-sm flex flex-col items-center transition-all relative ${selectedChar.lockedStats?.includes(stat) ? 'border-amber-900/60 bg-amber-950/10' : 'border-neutral-900'} ${!isPremade ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <div className="flex justify-between w-full mb-2">
                          {!isPremade && (
                            <span className={`text-base ${selectedChar.lockedStats?.includes(stat) ? 'text-amber-600' : 'text-neutral-800'}`}>
                              {selectedChar.lockedStats?.includes(stat) ? '†' : '○'}
                            </span>
                          )}
                          <span className="text-[8px] text-neutral-600 font-black uppercase tracking-tighter">{stat.slice(0,3)}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl md:text-4xl font-black ${selectedChar.lockedStats?.includes(stat) ? 'text-amber-500' : 'text-neutral-500'}`}>{selectedChar.stats[stat]}</span>
                          <span className="text-[10px] font-bold text-neutral-700">{getModifier(selectedChar.stats[stat])}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex justify-between items-end border-b border-[#b28a48]/20 pb-3 mb-6">
                    <h4 className="text-sm font-black fantasy-font text-neutral-400 uppercase">Grimoire of Feats</h4>
                    {!isPremade && (
                      <button 
                        onClick={() => handleRerollFeats(selectedChar)} 
                        disabled={rerollingFeats === selectedChar.id || (!reservoirReady && !currentUser.isAdmin)}
                        className="text-[9px] font-black text-[#b28a48] uppercase active:scale-95 disabled:opacity-20"
                      >
                        {rerollingFeats === selectedChar.id ? '...' : 'Reweave 🎲'}
                      </button>
                    )}
                    {isPremade && <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Fixed Destiny</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {selectedChar.feats.map((f, i) => (
                      <div key={i} onClick={() => toggleFeatLock(selectedChar.id, i)} className={`p-4 border rounded-sm flex items-start gap-3 transition-all ${f.locked ? 'bg-amber-950/5 border-amber-900/40' : 'bg-black border-neutral-900'} ${!isPremade ? 'cursor-pointer hover:border-neutral-700' : 'cursor-default'}`}>
                         {!isPremade && <span className="text-amber-600 mt-0.5">{f.locked ? '†' : '○'}</span>}
                         <div>
                           <h6 className="text-[11px] font-black uppercase mb-1 tracking-wider text-[#b28a48]">{f.name}</h6>
                           <p className="text-[10px] text-neutral-500 font-serif italic leading-relaxed italic">{f.description}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-black fantasy-font text-neutral-400 uppercase border-b border-[#b28a48]/20 pb-3 mb-6">Equipment & Relics</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {charInventory.length > 0 ? charInventory.map(item => (
                      <div key={item.id} className="p-4 bg-black/60 border border-neutral-900 rounded-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-sm border border-neutral-800 overflow-hidden shrink-0">
                          {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <span className="w-full h-full flex items-center justify-center text-xs opacity-20">🛡️</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-[#b28a48] uppercase truncate">{item.name}</p>
                          <p className="text-[9px] text-neutral-500 font-serif italic truncate">{item.type}</p>
                        </div>
                        {!isPremade && <button onClick={() => removeItemFromChar(selectedChar.id, item.id)} className="text-neutral-700 hover:text-red-500 text-xs px-2">✕</button>}
                      </div>
                    )) : (
                      <p className="text-neutral-700 text-[10px] italic py-4">No relics in possession.</p>
                    )}
                  </div>
                </section>
              </div>
              <div className="mt-12 flex flex-col items-center gap-6">
                {!isPremade && (
                  <button 
                    onClick={(e) => handleDeleteCharacter(e, selectedChar.id, selectedChar.name)}
                    className="text-[9px] font-black text-red-900/60 hover:text-red-500 uppercase tracking-[0.4em] transition-all border border-red-900/20 px-6 py-3 rounded-sm hover:bg-red-950/10"
                  >
                    Banish Soul From Fellowship
                  </button>
                )}
                <button onClick={() => setSelectedCharacterId(null)} className="text-[10px] font-black text-neutral-700 hover:text-[#b28a48] uppercase tracking-[0.5em] transition-all">Close Entry</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;
