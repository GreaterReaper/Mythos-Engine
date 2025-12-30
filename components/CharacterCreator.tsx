import React, { useState, useMemo, useRef } from 'react';
import { Character, ClassDef, Stats, Trait, RaceType, GenderType, Item, Spell } from '../types';
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
    if (!name || !classId || !reservoirReady) return;
    setGenerating(true);
    try {
      const selectedClass = classes.find(c => c.id === classId);
      const prompt = `Fantasy TTRPG character portrait. A ${gender} ${race} ${selectedClass?.name}. Appearance: ${charDescription}. Atmosphere: dark fantasy, painted masterpiece. ${refImage ? "Strictly maintain the facial features and style from the reference image provided." : ""}`;
      
      const [imageUrl, classFeats] = await Promise.all([
        generateImage(prompt, refImage || undefined), 
        generateCharacterFeats(selectedClass?.name || 'Adventurer', selectedClass?.description || '')
      ]);
      
      const racialFeats = RACIAL_TRAITS[race].traits.map(t => ({ ...t, locked: true }));
      const allFeats = [...racialFeats, ...classFeats];
      
      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name, classId, race, gender, description: charDescription, level: 1, stats: finalStats,
        hp: (selectedClass?.startingHp || 10) + (Math.floor((finalStats.constitution - 10) / 2)),
        maxHp: (selectedClass?.startingHp || 10) + (Math.floor((finalStats.constitution - 10) / 2)),
        feats: allFeats, imageUrl, isPlayer: characters.length === 0,
        inventory: [],
        knownSpells: [],
        lockedStats: []
      };
      setCharacters(prev => [...prev, newChar]);
      setName(''); setClassId(''); setCharDescription(''); setStats(INITIAL_STATS); setRefImage(null);
      setSelectedCharacterId(newChar.id);
      notify(`${name} Bound.`, "success");
    } catch (e: any) { notify("Summoning Failed.", "error"); } finally { setGenerating(false); }
  };

  const handleRerollStatsOnChar = async (char: Character) => {
    if (!reservoirReady) return;
    setRerollingStats(char.id);
    try {
      const cls = classes.find(c => c.id === char.classId);
      const newStats = await rerollStats(char.name, cls?.name || 'Hero', char.stats, char.lockedStats || []);
      setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, stats: newStats } : c));
      notify("Stats Rewoven.", "success");
    } catch (e: any) { notify("Arcane Interference.", "error"); } finally { setRerollingStats(null); }
  };

  const toggleStatLockOnChar = (charId: string, stat: keyof Stats) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const currentLocks = c.lockedStats || [];
      const newLocks = currentLocks.includes(stat) ? currentLocks.filter(s => s !== stat) : [...currentLocks, stat];
      return { ...c, lockedStats: newLocks };
    }));
  };

  const handleRerollFeats = async (char: Character) => {
    if (!reservoirReady) return;
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
    if (!reservoirReady) return;
    setLearningSpells(char.id);
    try {
      const cls = classes.find(c => c.id === char.classId);
      const spells = await generateSpellbook(cls?.name || 'Mage', cls?.description || '', char.level);
      setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, knownSpells: spells } : c));
      notify("Arcane Grimoire Updated.", "success");
    } catch (e: any) { notify("Spells Failed to Coalesce.", "error"); } finally { setLearningSpells(null); }
  };

  const removeItemFromChar = (charId: string, itemId: string) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      return { ...c, inventory: c.inventory.filter(id => id !== itemId) };
    }));
  };

  const selectedChar = characters.find(c => c.id === selectedCharacterId);
  const selectedClass = classes.find(c => c?.id === selectedChar?.classId);
  const charInventory = items.filter(i => selectedChar?.inventory.includes(i.id));

  return (
    <div className="space-y-12 pb-12 pt-16">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48]">The Fellowship</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-[450px]">
          <div className="grim-card p-8 border-dashed border-[#b28a48]/20 border-2 rounded-sm bg-black shadow-2xl">
            <h3 className="text-xl font-black mb-8 fantasy-font text-neutral-300">Recruit Hero</h3>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Identify Legend</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NAME..." className="w-full bg-black border border-neutral-800 p-4 text-xs tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-bold" />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Sigil Reference (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-black border border-neutral-800 border-dashed h-24 flex items-center justify-center cursor-pointer hover:border-[#b28a48]/40 transition-all group overflow-hidden relative"
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  {refImage ? (
                    <>
                      <img src={refImage} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Update Reference</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center opacity-30 group-hover:opacity-100 transition-opacity">
                      <span className="text-2xl">🖼️</span>
                      <p className="text-[7px] font-black uppercase mt-1">Upload reference image</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Heritage (Race)</label>
                
                <div className="relative">
                  <select 
                    value={race} 
                    onChange={(e) => setRace(e.target.value as RaceType)} 
                    className="w-full bg-black border border-neutral-800 p-4 text-[11px] text-[#b28a48] font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-[#b28a48]"
                  >
                    {(Object.keys(RACIAL_TRAITS) as RaceType[]).map(r => (
                      <option key={r} value={r}>{RACIAL_TRAITS[r].icon} {r}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-[#b28a48] opacity-50 font-black">▼</div>
                </div>
                
                <div className="bg-neutral-950/50 border border-neutral-900 p-3 rounded-sm mt-3 animate-in fade-in slide-in-from-top-1">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[8px] font-black text-[#b28a48] uppercase tracking-[0.2em]">Racial Ancestry Gifts</p>
                    <span className="text-[10px]">{RACIAL_TRAITS[race].icon}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(RACIAL_BONUSES[race]).map(([stat, val]) => (
                      <div key={stat} className="bg-green-950/20 border border-green-900/30 px-2 py-1 rounded-sm flex items-center gap-1">
                        <span className="text-[7px] font-black text-neutral-500 uppercase">{stat.slice(0,3)}</span>
                        <span className="text-[9px] font-black text-green-500">+{val}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-neutral-400 font-serif italic leading-relaxed mb-4">
                    {RACIAL_TRAITS[race].flavor}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-neutral-900">
                    <p className="text-[7px] font-black text-neutral-600 uppercase tracking-widest mb-1">Innate Heritage Feats</p>
                    {RACIAL_TRAITS[race].traits.map((trait, idx) => (
                      <div key={idx} className="bg-black/40 p-2 border border-neutral-900 rounded-sm">
                        <p className="text-[9px] font-black text-[#b28a48] uppercase">{trait.name}</p>
                        <p className="text-[8px] text-neutral-500 font-serif italic leading-tight">{trait.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Base Statistics (Point Buy)</label>
                  <span className="text-[9px] font-bold text-neutral-500 tracking-tighter">{pointsRemaining} PTS LEFT</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(INITIAL_STATS) as Array<keyof Stats>).map((s) => {
                    const bonus = RACIAL_BONUSES[race][s] || 0;
                    const valWithBonus = stats[s] + bonus;
                    return (
                      <div key={s} className="bg-black border border-neutral-900 p-3 text-center relative group hover:border-[#b28a48]/40 transition-colors">
                        <button 
                          onClick={() => setActiveTooltip(activeTooltip === s ? null : s)} 
                          className="text-[8px] text-neutral-600 font-bold uppercase mb-1 tracking-tighter block w-full hover:text-neutral-300 transition-colors"
                        >
                          {s} <span className="opacity-40 ml-1">ⓘ</span>
                        </button>
                        
                        {activeTooltip === s && (
                          <div className="absolute z-50 bg-neutral-900 border border-amber-900/60 p-3 text-[10px] text-neutral-200 italic font-serif leading-relaxed bottom-full left-0 right-0 mb-2 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-[#b28a48] font-black uppercase tracking-widest text-[8px] mb-1 border-b border-amber-900/20 pb-1">{s} Role</div>
                            {STAT_DESCRIPTIONS[s]}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 border-r border-b border-amber-900/60 rotate-45"></div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleStatChange(s, -1)} className="text-neutral-700 hover:text-red-500 font-black px-1 text-lg"> - </button>
                          <span className={`text-sm font-black min-w-[1.2rem] ${bonus > 0 ? 'text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.3)]' : 'text-[#b28a48]'}`}>
                            {valWithBonus}
                          </span>
                          <button onClick={() => handleStatChange(s, 1)} className="text-neutral-700 hover:text-green-500 font-black px-1 text-lg"> + </button>
                        </div>
                        <div className="text-[7px] text-neutral-700 font-black uppercase mt-1">
                          MOD: {getModifier(valWithBonus)}
                          {bonus > 0 && <span className="text-green-800 ml-1">(+{bonus} R)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Archetype & Appearance</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full bg-black border border-neutral-800 p-4 text-[11px] text-[#b28a48] font-bold uppercase tracking-widest outline-none focus:border-[#b28a48] mb-2 appearance-none">
                  <option value="">Choose Path...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <textarea 
                  value={charDescription} 
                  onChange={(e) => setCharDescription(e.target.value)} 
                  placeholder="Inscribe details of their appearance and history for the Weaver..." 
                  className="w-full bg-black border border-neutral-800 p-4 h-24 text-xs text-neutral-500 font-serif italic focus:border-[#b28a48] outline-none shadow-inner resize-none"
                />
              </div>

              <button onClick={handleCreate} disabled={generating || !name || !classId || !reservoirReady} className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-5 text-[11px] font-black uppercase tracking-[0.5em] text-[#b28a48] shadow-xl hover:border-[#b28a48] transition-all disabled:opacity-20 active:scale-95">
                {generating ? 'COMMUNING WITH VOID...' : 'INSCRIBE LEGEND'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <div className="bg-black/40 border border-[#b28a48]/10 p-4 rounded-sm flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Search fellowship entries..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="flex-1 bg-black/60 border border-neutral-900 px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] outline-none focus:border-[#b28a48]" 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {filteredCharacters.map(char => (
              <div key={char.id} onClick={() => setSelectedCharacterId(char.id)} className="grim-card flex flex-col group border-[#b28a48]/10 hover:border-[#b28a48]/60 transition-all cursor-pointer shadow-xl overflow-hidden bg-black">
                <div className="h-48 bg-black relative grayscale group-hover:grayscale-0 transition-all duration-700">
                  {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-7xl">👤</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-left">
                     <h4 className="text-xl font-black fantasy-font text-[#b28a48]">{char.name}</h4>
                     <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest">{char.race} • Level {char.level}</p>
                  </div>
                </div>
              </div>
            ))}
            {filteredCharacters.length === 0 && (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-neutral-900 opacity-20 flex flex-col items-center">
                <span className="text-4xl mb-4">📜</span>
                <p className="text-xs uppercase tracking-[0.4em] font-black">The hall of heroes awaits entries</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedChar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 overflow-y-auto bg-black/98 backdrop-blur-xl">
          <div className="relative w-full max-w-6xl bg-[#080808] border border-[#b28a48]/30 shadow-2xl overflow-hidden rounded-sm flex flex-col lg:flex-row h-full md:h-[90vh]">
            <button onClick={() => setSelectedCharacterId(null)} className="absolute top-6 right-6 z-[110] text-neutral-600 hover:text-[#b28a48] text-4xl p-2 transition-all active:scale-90">✕</button>

            <div className="lg:w-2/5 relative border-b lg:border-r border-[#b28a48]/10 shrink-0">
              <div className="h-[400px] lg:h-full relative overflow-hidden">
                {selectedChar.imageUrl && <img src={selectedChar.imageUrl} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-10">
                  <h3 className="text-5xl font-black fantasy-font text-[#b28a48] mb-2">{selectedChar.name}</h3>
                  <p className="text-xs uppercase tracking-[0.6em] text-neutral-500 font-black">{selectedChar.race} {selectedClass?.name}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-8 md:p-16 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 gap-16 text-left">
                <section className="space-y-8">
                  <div className="flex justify-between items-end border-b border-[#b28a48]/20 pb-4">
                    <div>
                      <h4 className="text-xl font-black fantasy-font text-neutral-400">Sacred Attributes</h4>
                      <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest mt-1">SIGIL LOCK ATTRIBUTES TO PRESERVE DURING REWEAVING</p>
                    </div>
                    <button 
                      onClick={() => handleRerollStatsOnChar(selectedChar)} 
                      disabled={rerollingStats === selectedChar.id || !reservoirReady}
                      className="text-[10px] font-black text-[#b28a48] hover:text-amber-700 uppercase transition-all disabled:opacity-20 flex items-center gap-2"
                    >
                      {rerollingStats === selectedChar.id ? 'REFORMING...' : (
                        <>
                          <span>Reweave 🎲</span>
                          <span className="text-[8px] opacity-60">[-5⚡]</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {(Object.keys(selectedChar.stats) as Array<keyof Stats>).map(stat => (
                      <div 
                        key={stat} 
                        onClick={() => toggleStatLockOnChar(selectedChar.id, stat)}
                        className={`bg-black/60 border p-6 rounded-sm flex flex-col items-center cursor-pointer transition-all relative group/statCard ${selectedChar.lockedStats?.includes(stat) ? 'border-amber-900/60 bg-amber-950/10 shadow-[inset_0_0_15px_rgba(178,138,72,0.1)]' : 'border-neutral-900 hover:border-[#b28a48]/30 shadow-inner'}`}
                      >
                        <div className="flex justify-between items-center w-full mb-4">
                          <span className={`text-xl transition-colors ${selectedChar.lockedStats?.includes(stat) ? 'text-amber-600' : 'text-neutral-800 opacity-20'}`}>
                            {selectedChar.lockedStats?.includes(stat) ? '†' : '○'}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === stat + '_sel' ? null : stat + '_sel'); }}
                            className={`text-[9px] font-black uppercase tracking-widest transition-colors ${activeTooltip === stat + '_sel' ? 'text-[#b28a48]' : 'text-neutral-700 hover:text-neutral-400'}`}
                          >
                            {stat.slice(0, 3)} ⓘ
                          </button>
                          <span className="w-5"></span>
                        </div>
                        
                        {activeTooltip === stat + '_sel' && (
                          <div className="absolute inset-x-2 top-14 bg-black/95 border border-amber-950/60 p-4 rounded-sm text-[10px] text-neutral-300 font-serif italic text-center leading-relaxed shadow-2xl z-20 animate-in fade-in zoom-in-95">
                             <div className="text-[#b28a48] font-black uppercase text-[8px] mb-2 tracking-widest border-b border-amber-900/20 pb-1">{stat}</div>
                             {STAT_DESCRIPTIONS[stat]}
                             <button onClick={(e) => { e.stopPropagation(); setActiveTooltip(null); }} className="mt-4 block w-full text-[8px] font-black text-neutral-600 hover:text-white transition-colors border-t border-white/5 pt-2">DISMISS</button>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-5">
                          <span className={`text-4xl font-black transition-colors ${selectedChar.lockedStats?.includes(stat) ? 'text-amber-500 drop-shadow-[0_2px_12px_rgba(178,138,72,0.4)]' : 'text-neutral-500'}`}>{selectedChar.stats[stat]}</span>
                          <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-black transition-all ${selectedChar.lockedStats?.includes(stat) ? 'border-amber-700 text-amber-500 bg-amber-950/20' : 'border-neutral-900 text-neutral-700 bg-black'}`}>
                            {getModifier(selectedChar.stats[stat])}
                          </div>
                        </div>
                        <div className="mt-4 text-[7px] font-black uppercase tracking-tighter opacity-40 group-hover/statCard:opacity-100 transition-opacity">
                          {selectedChar.lockedStats?.includes(stat) ? 'SIGIL BOUND' : 'FATE UNSEALED'}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex justify-between items-end border-b border-[#b28a48]/20 pb-4">
                    <h4 className="text-xl font-black fantasy-font text-neutral-400">Innate Mastery (Feats)</h4>
                    <button 
                      onClick={() => handleRerollFeats(selectedChar)} 
                      disabled={rerollingFeats === selectedChar.id || !reservoirReady}
                      className="text-[10px] font-black text-[#b28a48] hover:text-amber-700 uppercase transition-all disabled:opacity-20 flex items-center gap-2"
                    >
                      {rerollingFeats === selectedChar.id ? 'REWEAVING...' : (
                        <>
                          <span>Reweave 🎲</span>
                          <span className="text-[8px] opacity-60">[-5⚡]</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedChar.feats.map((f, i) => (
                      <div key={i} className={`p-5 border rounded-sm flex flex-col justify-center min-h-[110px] transition-all relative ${f.locked ? 'bg-amber-950/5 border-amber-900/40 shadow-inner' : 'bg-black border-neutral-900 hover:border-neutral-700'}`}>
                        <div className="flex items-start gap-4">
                           <span className={`text-xl mt-0.5 transition-colors ${f.locked ? 'text-amber-600' : 'text-neutral-800 opacity-20'}`}>
                             {f.locked ? '†' : '○'}
                           </span>
                           <div>
                             <h6 className={`text-sm font-black uppercase mb-1 tracking-wider ${f.locked ? 'text-amber-600' : 'text-[#b28a48]'}`}>{f.name}</h6>
                             <p className="text-xs text-neutral-500 italic font-serif leading-relaxed">{f.description}</p>
                           </div>
                        </div>
                        {f.locked && <div className="absolute top-2 right-3 text-[7px] font-black text-amber-900 uppercase tracking-widest">INNATE</div>}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex justify-between items-end border-b border-[#b28a48]/20 pb-4">
                    <h4 className="text-xl font-black fantasy-font text-neutral-400">The Vault (Inventory)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {charInventory.length === 0 ? (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-neutral-900 opacity-30 flex flex-col items-center">
                        <span className="text-2xl mb-2">🎒</span>
                        <p className="text-[10px] uppercase tracking-widest font-black">Vault is currently empty</p>
                      </div>
                    ) : (
                      charInventory.map((item, i) => (
                        <div key={item.id} className="p-5 bg-black border border-neutral-900 rounded-sm flex items-start gap-4 group/invItem">
                          <div className="w-12 h-12 rounded-sm border border-[#b28a48]/20 overflow-hidden flex-shrink-0">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-xl">⚔️</div>}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h6 className="text-sm font-black text-[#b28a48] uppercase tracking-wider">{item.name}</h6>
                              <button onClick={() => removeItemFromChar(selectedChar.id, item.id)} className="text-neutral-800 hover:text-red-500 text-xs transition-colors opacity-0 group-hover/invItem:opacity-100">DROP</button>
                            </div>
                            <p className="text-[10px] text-neutral-500 italic line-clamp-2 mt-1">{item.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex justify-between items-end border-b border-[#b28a48]/20 pb-4">
                    <h4 className="text-xl font-black fantasy-font text-neutral-400">Sacred Arts (Spells)</h4>
                    <button 
                      onClick={() => handleGenerateSpells(selectedChar)} 
                      disabled={learningSpells === selectedChar.id || !reservoirReady}
                      className="text-[10px] font-black text-[#b28a48] hover:text-amber-700 uppercase transition-all disabled:opacity-20 flex items-center gap-2"
                    >
                      {learningSpells === selectedChar.id ? 'CHANNELING...' : (
                        <>
                          <span>Channel Grimoire 🔮</span>
                          <span className="text-[8px] opacity-60">[-15⚡]</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(!selectedChar.knownSpells || selectedChar.knownSpells.length === 0) ? (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-neutral-900 opacity-30 flex flex-col items-center">
                        <span className="text-2xl mb-2">✨</span>
                        <p className="text-[10px] uppercase tracking-widest font-black">No Spells Inscribed</p>
                      </div>
                    ) : (
                      selectedChar.knownSpells.map((spell, i) => (
                        <div key={i} className="p-6 bg-black border border-neutral-900 rounded-sm hover:border-[#b28a48]/30 transition-colors group/spell">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h6 className="text-sm font-black text-amber-600 uppercase tracking-widest">{spell.name}</h6>
                              <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest mt-0.5">{spell.school} • Level {spell.level}</p>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-amber-900/40 group-hover/spell:bg-amber-500 animate-pulse"></div>
                          </div>
                          <p className="text-xs text-neutral-400 font-serif leading-relaxed italic">{spell.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
              <div className="mt-20 pt-12 border-t border-neutral-900 text-center">
                <button onClick={() => setSelectedCharacterId(null)} className="text-[11px] font-black text-neutral-800 hover:text-[#b28a48] uppercase tracking-[0.8em] transition-all pb-12">Close Chronicle</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;