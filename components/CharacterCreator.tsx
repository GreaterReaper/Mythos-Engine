
import React, { useState, useMemo, useRef } from 'react';
import { Character, ClassDef, Stats, Trait, RaceType, GenderType, Item, Spell } from '../types';
import { generateImage, generateCharacterFeats, rerollTraits, generateSpellbook } from '../services/gemini';

const INITIAL_STATS: Stats = { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 };
const POINT_COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

const STAT_DESCRIPTIONS: Record<keyof Stats, string> = {
  strength: "Physical power, lifting capacity, and melee combat prowess.",
  dexterity: "Agility, reflexes, balance, and ranged attack accuracy.",
  constitution: "Health, stamina, and resistance to physical hardship.",
  intelligence: "Mental acuity, logic, memory, and arcane knowledge.",
  wisdom: "Intuition, perception, spiritual insight, and willpower.",
  charisma: "Confidence, social influence, and innate leadership force.",
};

const RACIAL_BONUSES: Record<RaceType, Partial<Stats>> = {
  Human: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
  'Variant Human': { strength: 1, constitution: 1, intelligence: 1 },
  Dwarf: { constitution: 2, strength: 2 },
  Elf: { dexterity: 2, intelligence: 2 },
  'Half-Elf': { charisma: 2, dexterity: 1, wisdom: 1 },
};

const RACIAL_TRAITS: Record<RaceType, { icon: string, flavor: string, traits: Trait[] }> = {
  Human: {
    icon: '🌍',
    flavor: 'Adaptable and ambitious generalists who thrive in every corner of the realm.',
    traits: [{ name: 'Versatile Heritage', description: 'Exceptional adaptability provides a minor boost to all core attributes.' }]
  },
  'Variant Human': {
    icon: '✨',
    flavor: 'Specialized individuals who have traded broad mastery for singular, potent talents.',
    traits: [
      { name: 'Bonus Feat', description: 'Begins the journey with a specialized mastery or talent.' },
      { name: 'Skillful', description: 'Proficiency in an extra skill of choice.' }
    ]
  },
  Dwarf: {
    icon: '⚒️',
    flavor: 'Hardy survivors of the deep earth, forged in stone and unyielding tradition.',
    traits: [
      { name: 'Dwarven Resilience', description: 'Innate resistance to poisons and a constitution hardened by mountain air.' },
      { name: 'Stonecunning', description: 'Natural intuition for stonework and underground architecture.' }
    ]
  },
  Elf: {
    icon: '🍃',
    flavor: 'Graceful immortals with a deep connection to the ancient magics of the wild.',
    traits: [
      { name: 'Fey Ancestry', description: 'Immune to magical sleep and highly resistant to mental charms.' },
      { name: 'Keen Senses', description: 'Heightened awareness granting superior perception in darkness.' }
    ]
  },
  'Half-Elf': {
    icon: '🎭',
    flavor: 'Charismatic wanderers who walk between worlds, possessing the best of both lineages.',
    traits: [
      { name: 'Fey Ancestry', description: 'Shared heritage provides resistance to charms and sleep.' },
      { name: 'Skill Versatility', description: 'Extraordinarily adaptable, gaining mastery in two extra skills.' }
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
}

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ characters, setCharacters, classes, items = [], notify, reservoirReady }) => {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [race, setRace] = useState<RaceType>('Human');
  const [gender, setGender] = useState<GenderType>('Male');
  const [charDescription, setCharDescription] = useState('');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [generating, setGenerating] = useState(false);
  const [weaving, setWeaving] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [raceFilter, setRaceFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'hp' | 'level'>('name');

  const filteredCharacters = useMemo(() => {
    return characters
      .filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
        const matchesRace = raceFilter === 'All' || c.race === raceFilter;
        return matchesSearch && matchesRace;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'hp') return b.maxHp - a.maxHp;
        if (sortBy === 'level') return b.level - a.level;
        return 0;
      });
  }, [characters, search, raceFilter, sortBy]);

  const totalPointsUsed = useMemo(() => (Object.values(stats) as number[]).reduce((acc: number, val: number) => acc + (POINT_COSTS[val] || 0), 0), [stats]);
  const pointsRemaining = 27 - totalPointsUsed;
  
  const finalStats = useMemo(() => {
    const bonuses = RACIAL_BONUSES[race];
    const result = { ...stats };
    (Object.keys(bonuses) as Array<keyof Stats>).forEach(key => { result[key] += bonuses[key] || 0; });
    return result;
  }, [stats, race]);

  const innateTraits = useMemo(() => {
    return RACIAL_TRAITS[race].traits.map(t => ({ ...t, locked: true }));
  }, [race]);

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
    if (!name || !classId || !reservoirReady) return;
    setGenerating(true);
    try {
      const selectedClass = classes.find(c => c.id === classId);
      const prompt = `Fantasy TTRPG character portrait of a ${gender} ${race} ${selectedClass?.name}. Appearance: ${charDescription}. Dark fantasy atmosphere, painted art style. ${refImage ? "Maintain facial features and pose from the provided reference image." : ""}`;
      
      const [imageUrl, classFeats] = await Promise.all([
        generateImage(prompt, refImage || undefined), 
        generateCharacterFeats(selectedClass?.name || 'Adventurer', selectedClass?.description || '')
      ]);
      
      const allFeats = [...innateTraits, ...classFeats];
      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name, classId, race, gender, description: charDescription, level: 1, stats: finalStats,
        hp: (selectedClass?.startingHp || 10) + (Math.floor((finalStats.constitution - 10) / 2)),
        maxHp: (selectedClass?.startingHp || 10) + (Math.floor((finalStats.constitution - 10) / 2)),
        feats: allFeats, imageUrl, isPlayer: characters.length === 0,
        inventory: [],
        knownSpells: []
      };
      setCharacters(prev => [...prev, newChar]);
      setName(''); setClassId(''); setCharDescription(''); setStats(INITIAL_STATS); setRefImage(null);
      setSelectedCharacterId(newChar.id);
      notify(`${name} has joined the fellowship.`, "success");
    } catch (e: any) { 
      console.error(e); 
      notify(e.message || "Failed to summon hero from the ether.", "error");
    } finally { setGenerating(false); }
  };

  const handleWeaveSpells = async (char: Character) => {
    if (!reservoirReady) return;
    setWeaving(true);
    try {
      const selectedClass = classes.find(c => c.id === char.classId);
      if (!selectedClass) throw new Error("Archetype not found.");
      
      const spellbook = await generateSpellbook(selectedClass.name, selectedClass.description, selectedClass.spellSlots.length);
      setCharacters(prev => prev.map(c => {
        if (c.id !== char.id) return c;
        return { ...c, knownSpells: spellbook };
      }));
      notify("The Grimoire has been inscribed with new incantations.", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setWeaving(false);
    }
  };

  const toggleFeatLock = (charId: string, featIdx: number) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const newFeats = [...c.feats];
      newFeats[featIdx] = { ...newFeats[featIdx], locked: !newFeats[featIdx].locked };
      return { ...c, feats: newFeats };
    }));
  };

  const handleRerollFeats = async (char: Character) => {
    if (!reservoirReady) return;
    setRerolling(char.id);
    try {
      const selectedClass = classes.find(c => c.id === char.classId);
      const updatedFeats = await rerollTraits('character', char.name, selectedClass?.description || '', char.feats);
      
      setCharacters(prev => prev.map(c => {
        if (c.id !== char.id) return c;
        
        let updateIdx = 0;
        const finalMergedFeats = c.feats.map(original => {
          if (original.locked) return original;
          const replacement = updatedFeats[updateIdx];
          updateIdx++;
          return replacement ? { ...replacement, locked: false } : original;
        });

        return { ...c, feats: finalMergedFeats };
      }));
      notify("Heroic feats rewoven.", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally { setRerolling(null); }
  };

  const selectedChar = characters.find(c => c.id === selectedCharacterId);
  const selectedClass = classes.find(c => c?.id === selectedChar?.classId);
  const selectedInventoryItems = useMemo(() => {
    if (!selectedChar || !items) return [];
    return items.filter(item => selectedChar.inventory.includes(item.id));
  }, [selectedChar, items]);

  return (
    <div className="space-y-12 pb-12 pt-16">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Fellowship</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Heroes of Shadow & Steel</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-[450px]">
          <div className="grim-card p-8 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-20 shadow-2xl bg-black">
            <h3 className="text-xl font-black mb-8 fantasy-font text-neutral-300">Recruit Hero</h3>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Identify Legend</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NAME..." className="w-full bg-black border border-neutral-800 p-4 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Sigil Reference (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-black border border-neutral-800 border-dashed h-24 flex items-center justify-center cursor-pointer hover:border-[#b28a48]/40 transition-all group overflow-hidden relative"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                  />
                  {refImage ? (
                    <>
                      <img src={refImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest bg-black/60 px-2 py-1">Replace Image</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setRefImage(null); }}
                        className="absolute top-1 right-1 bg-black/80 text-white w-5 h-5 flex items-center justify-center text-[10px] rounded-full hover:bg-red-900 transition-colors z-10"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="text-xl opacity-30 group-hover:opacity-100 transition-opacity">🖼️</div>
                      <p className="text-[7px] font-black text-neutral-600 uppercase tracking-tighter mt-1 group-hover:text-neutral-400">Click to upload visual soul</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Select Heritage</label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(RACIAL_TRAITS) as RaceType[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRace(r)}
                      title={r}
                      className={`h-12 border transition-all flex items-center justify-center text-xl rounded-sm ${race === r ? 'bg-amber-950/30 border-[#b28a48] shadow-[0_0_10px_rgba(178,138,72,0.3)]' : 'bg-neutral-950 border-neutral-900 hover:border-neutral-700'}`}
                    >
                      {RACIAL_TRAITS[r].icon}
                    </button>
                  ))}
                </div>
                
                <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-[#b28a48] uppercase tracking-widest">{race} Heritage</span>
                    <div className="flex gap-2">
                      {Object.entries(RACIAL_BONUSES[race]).map(([stat, val]) => (
                        <span key={stat} className="text-[8px] font-black text-green-700 uppercase">{stat.slice(0, 3)} +{val}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[9px] text-neutral-500 italic mb-4 leading-relaxed">{RACIAL_TRAITS[race].flavor}</p>
                  
                  <div className="space-y-2">
                    <label className="text-[7px] font-black text-neutral-700 uppercase tracking-widest mb-1 block">Innate Divine Traits (Locked)</label>
                    {innateTraits.map((t, i) => (
                      <div key={i} className="p-3 bg-black border border-amber-950/30 rounded-sm relative group/trait">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-amber-600 text-[10px]">†</span>
                          <h5 className="text-[9px] font-black text-neutral-300 uppercase tracking-wider">{t.name}</h5>
                        </div>
                        <p className="text-[8px] text-neutral-500 italic leading-tight">{t.description}</p>
                        <div className="absolute top-1 right-1 text-[6px] font-black text-amber-900 uppercase">BOUND</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value as GenderType)} className="w-full bg-black border border-neutral-800 p-3 text-[11px] text-neutral-400 uppercase tracking-widest outline-none">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Archetype</label>
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full bg-black border border-neutral-800 p-3 text-[11px] text-neutral-400 uppercase tracking-widest outline-none">
                    <option value="">Select...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <textarea value={charDescription} onChange={(e) => setCharDescription(e.target.value)} placeholder="APPEARANCE & HISTORY..." className="w-full bg-black border border-neutral-800 p-4 h-24 text-xs text-neutral-500 uppercase tracking-tight focus:border-[#b28a48] outline-none font-serif italic" />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Inscribed Attributes</label>
                  <span className={`text-[10px] font-black ${pointsRemaining === 0 ? 'text-amber-700' : 'text-neutral-500'}`}>{pointsRemaining} Points</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(stats) as Array<keyof Stats>).map((s) => (
                    <div 
                      key={s} 
                      title={STAT_DESCRIPTIONS[s]}
                      className="bg-black border border-neutral-900 p-3 text-center group hover:border-[#b28a48]/40 transition-colors relative cursor-help"
                    >
                      <div className="text-[8px] text-neutral-600 font-bold uppercase mb-1 tracking-tighter">{s}</div>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleStatChange(s, -1)} className="text-neutral-700 hover:text-red-500 font-black px-1 transition-colors"> - </button>
                        <span className="text-sm font-black text-[#b28a48] min-w-[1.2rem]">{stats[s]}</span>
                        <button onClick={() => handleStatChange(s, 1)} className="text-neutral-700 hover:text-green-500 font-black px-1 transition-colors"> + </button>
                      </div>
                      <div className="text-[8px] text-neutral-800 mt-1">Mod: {getModifier(stats[s] + (RACIAL_BONUSES[race][s] || 0))}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleCreate} disabled={generating || !name || !classId || !reservoirReady} className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-5 text-[11px] font-black uppercase tracking-[0.5em] text-[#b28a48] shadow-xl hover:border-[#b28a48] transition-all disabled:opacity-20 flex flex-col items-center gap-1">
                {generating ? 'SUMMONING...' : !reservoirReady ? 'ENERGY LOW...' : (
                  <>
                    <span>BIND HERO</span>
                    <span className="text-[8px] text-amber-600/80 tracking-widest">[-28⚡ ESSENCE]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <input type="text" placeholder="Search the fellowship..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-neutral-900/50 border border-neutral-800 px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-neutral-900/50 border border-neutral-800 px-4 py-3 text-[11px] uppercase tracking-widest text-neutral-400 outline-none">
              <option value="name">Sort: Alpha</option>
              <option value="hp">Sort: Vitality</option>
              <option value="level">Sort: Legend</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {filteredCharacters.map(char => {
              const charClass = classes.find(c => c.id === char.classId);
              return (
                <div key={char.id} onClick={() => setSelectedCharacterId(char.id)} className="grim-card flex flex-col group border-[#b28a48]/10 hover:border-[#b28a48]/60 transition-all cursor-pointer shadow-xl overflow-hidden bg-black">
                  <div className="h-64 bg-black relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700">
                    {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" alt={char.name} /> : <div className="w-full h-full flex items-center justify-center text-7xl">👤</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                       <h4 className="text-2xl font-black fantasy-font text-[#b28a48]">{char.name}</h4>
                       <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">{char.race} {charClass?.name}</p>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-between border-t border-neutral-900">
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-600">LVL {char.level}</span>
                    <span className="text-[10px] font-black uppercase text-[#b28a48] animate-pulse">Consult Chronicle †</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedChar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 overflow-y-auto bg-black/98 backdrop-blur-xl">
          <div className="relative w-full max-w-6xl bg-[#080808] border border-[#b28a48]/30 shadow-2xl overflow-hidden rounded-sm flex flex-col lg:flex-row h-full md:h-[90vh]">
            <button onClick={() => setSelectedCharacterId(null)} className="absolute top-6 right-6 z-[110] text-neutral-600 hover:text-[#b28a48] text-4xl p-2 transition-all active:scale-90">✕</button>

            <div className="lg:w-2/5 relative border-b lg:border-b-0 lg:border-r border-[#b28a48]/10 shrink-0">
              <div className="h-[400px] lg:h-full relative overflow-hidden">
                {selectedChar.imageUrl ? <img src={selectedChar.imageUrl} className="w-full h-full object-cover" alt={selectedChar.name} /> : <div className="w-full h-full flex items-center justify-center text-9xl text-neutral-900">👤</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-10">
                  <h3 className="text-5xl font-black fantasy-font text-[#b28a48] mb-2">{selectedChar.name}</h3>
                  <p className="text-xs uppercase tracking-[0.6em] text-neutral-500 mb-8 font-black">{selectedChar.race} {selectedClass?.name}</p>
                  <div className="space-y-5">
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">Vitality Pool</span>
                      <span className="text-lg font-black text-red-700">{selectedChar.hp} / {selectedChar.maxHp} HP</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-red-950 to-red-800 transition-all duration-1000" style={{ width: `${(selectedChar.hp / selectedChar.maxHp) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-8 md:p-16 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 gap-16">
                <div className="space-y-8">
                  <h4 className="text-xl font-black fantasy-font text-neutral-400 border-b border-[#b28a48]/20 pb-4 tracking-widest">Sacred Attributes</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {(Object.keys(selectedChar.stats) as Array<keyof Stats>).map(stat => (
                      <div key={stat} className="bg-black/60 border border-[#b28a48]/10 p-6 rounded-sm flex flex-col items-center group relative cursor-help">
                        <div className="text-[11px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-4">{stat}</div>
                        <div className="flex items-center gap-5">
                          <span className="text-4xl font-black text-[#b28a48]">{selectedChar.stats[stat]}</span>
                          <div className="w-12 h-12 rounded-full border border-amber-950/50 flex items-center justify-center text-sm font-black text-amber-700 bg-amber-950/10 shadow-lg">
                            {getModifier(selectedChar.stats[stat])}
                          </div>
                        </div>
                        <div className="mt-4 text-[9px] text-neutral-500 text-center font-serif italic max-w-[140px] leading-tight">
                          {STAT_DESCRIPTIONS[stat]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedClass && selectedClass.spellSlots && selectedClass.spellSlots.length > 0 && (
                  <div className="space-y-8">
                    <h4 className="text-xl font-black fantasy-font text-neutral-400 border-b border-[#b28a48]/20 pb-4 tracking-widest">Arcane Capacity</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                      {selectedClass.spellSlots.map((slots, i) => (
                        <div key={i} className="bg-neutral-950 border border-[#b28a48]/10 p-4 rounded-sm text-center">
                          <div className="text-[9px] font-black text-neutral-600 uppercase tracking-tighter mb-1">Level {i+1}</div>
                          <div className="text-2xl font-black text-amber-700">{slots}</div>
                          <div className="text-[7px] text-neutral-700 uppercase font-black">Slots</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedClass && selectedClass.spellSlots && selectedClass.spellSlots.length > 0 && (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center border-b border-[#b28a48]/20 pb-4">
                      <h4 className="text-xl font-black fantasy-font text-neutral-400 tracking-widest">The Grimoire</h4>
                      <button 
                        onClick={() => handleWeaveSpells(selectedChar)} 
                        disabled={weaving || !reservoirReady} 
                        className="text-[10px] font-black text-[#b28a48] hover:text-[#cbb07a] uppercase tracking-[0.3em] transition-all disabled:opacity-20 flex items-center gap-2"
                      >
                        {weaving ? 'Inscribing...' : (
                          <>
                            <span>Weave Spellbook 📜</span>
                            <span className="text-amber-700/80">[-15⚡]</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {selectedChar.knownSpells && selectedChar.knownSpells.length > 0 ? (
                        [...new Set(selectedChar.knownSpells.map(s => s.level))].sort((a: number, b: number) => a - b).map(level => (
                          <div key={level} className="space-y-4">
                            <h5 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] border-l-2 border-[#b28a48]/40 pl-3">Level {level} Spells</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedChar.knownSpells?.filter(s => s.level === level).map((spell, i) => (
                                <div key={i} className="bg-black border border-neutral-900 p-5 rounded-sm hover:border-[#b28a48]/30 transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                    <h6 
                                      className="text-sm font-black text-[#b28a48] uppercase tracking-wider cursor-help" 
                                      title={spell.description}
                                    >
                                      {spell.name}
                                    </h6>
                                    <span className="text-[8px] font-black text-neutral-700 uppercase border border-neutral-800 px-2 py-0.5 rounded-full">{spell.school}</span>
                                  </div>
                                  <p className="text-[11px] text-neutral-400 font-serif italic leading-relaxed">{spell.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 border-2 border-dashed border-neutral-900 text-center rounded-sm">
                           <p className="text-[10px] text-neutral-700 uppercase font-black tracking-widest italic mb-2">This soul possesses the spark of magic, but the pages remain blank.</p>
                           <button onClick={() => handleWeaveSpells(selectedChar)} className="text-[9px] font-black text-[#b28a48] underline uppercase tracking-widest">Sacrifice essence to weave your legacy</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                   <h4 className="text-xl font-black fantasy-font text-neutral-400 border-b border-[#b28a48]/20 pb-4 tracking-widest">Relics & Possessions</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     {selectedInventoryItems.length > 0 ? (
                       selectedInventoryItems.map((item) => (
                         <div key={item.id} className="bg-black border border-neutral-900 p-4 rounded-sm flex gap-4 group/item">
                           <div className="w-16 h-16 bg-neutral-950 border border-neutral-900 flex-shrink-0 relative overflow-hidden">
                             {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover grayscale group-hover/item:grayscale-0 transition-all" /> : <div className="w-full h-full flex items-center justify-center text-xl">⚔️</div>}
                           </div>
                           <div>
                             <h6 className="text-xs font-black text-[#b28a48] uppercase tracking-wider">{item.name}</h6>
                             <p className="text-[9px] text-neutral-600 uppercase font-black mb-1">{item.type}</p>
                             <p className="text-[10px] text-neutral-500 font-serif italic line-clamp-2">{item.description}</p>
                           </div>
                         </div>
                       ))
                     ) : (
                       <div className="col-span-full py-8 border-2 border-dashed border-neutral-900 text-center rounded-sm">
                         <span className="text-[10px] text-neutral-700 uppercase font-black tracking-widest italic">The hero carries only the weight of their destiny.</span>
                       </div>
                     )}
                   </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-[#b28a48]/20 pb-4">
                      <h4 className="text-xl font-black fantasy-font text-neutral-400 tracking-widest">Heritage & Feats</h4>
                      <button onClick={() => handleRerollFeats(selectedChar)} disabled={rerolling === selectedChar.id || !reservoirReady} className="text-[10px] font-black text-neutral-600 hover:text-amber-700 uppercase tracking-[0.3em] transition-all disabled:opacity-20 flex items-center gap-2">
                        {rerolling === selectedChar.id ? 'REWEAVING...' : (
                          <>
                            <span>Reroll Potential 🎲</span>
                            <span className="text-amber-700/80">[-2⚡]</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedChar.feats.map((f, i) => (
                        <div key={i} onClick={() => toggleFeatLock(selectedChar.id, i)} className={`p-6 border transition-all rounded-sm cursor-pointer shadow-lg flex flex-col justify-center min-h-[120px] ${f.locked ? 'bg-amber-950/10 border-amber-900/40' : 'bg-black border-neutral-900 hover:border-neutral-700'}`}>
                          <div className="flex items-start gap-5">
                             <span className={`text-xl mt-0.5 ${f.locked ? 'text-amber-500' : 'text-neutral-700'}`}>{f.locked ? '†' : '○'}</span>
                             <div>
                               <div className="text-sm font-black text-neutral-200 uppercase tracking-wide mb-2">{f.name}</div>
                               <div className="text-sm text-neutral-500 italic leading-relaxed font-serif">{f.description}</div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-20 pt-12 border-t border-[#b28a48]/10 text-center">
                <button onClick={() => setSelectedCharacterId(null)} className="text-xs font-black text-neutral-700 hover:text-[#b28a48] uppercase tracking-[0.8em] transition-all pb-12">Close Chronicle Ledger</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;
