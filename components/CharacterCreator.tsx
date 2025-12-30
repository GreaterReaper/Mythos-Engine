
import React, { useState, useMemo, useRef } from 'react';
import { Character, ClassDef, Stats, Trait, RaceType, GenderType, Item, Spell } from '../types';
import { generateImage, generateCharacterFeats, rerollTraits, generateSpellbook, rerollStats } from '../services/gemini';

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
  const [weaving, setWeaving] = useState(false);
  const [rerollingStats, setRerollingStats] = useState<string | null>(null);
  const [rerollingFeats, setRerollingFeats] = useState<string | null>(null);
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

  const handleCreate = async () => {
    if (!name || !classId || !reservoirReady) return;
    setGenerating(true);
    try {
      const selectedClass = classes.find(c => c.id === classId);
      const [imageUrl, classFeats] = await Promise.all([
        generateImage(`Portrait of a ${gender} ${race} ${selectedClass?.name}. ${charDescription}`, refImage || undefined), 
        generateCharacterFeats(selectedClass?.name || 'Adventurer', selectedClass?.description || '')
      ]);
      
      const racialFeats = RACIAL_TRAITS[race].traits;
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
          const res = updated[uIdx] || f;
          uIdx++;
          return { ...res, locked: false };
        });
        return { ...c, feats: merged };
      }));
      notify("Feats Rewoven.", "success");
    } catch (e: any) { notify("Interference.", "error"); } finally { setRerollingFeats(null); }
  };

  const selectedChar = characters.find(c => c.id === selectedCharacterId);
  const selectedClass = classes.find(c => c?.id === selectedChar?.classId);

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
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NAME..." className="w-full bg-black border border-neutral-800 p-4 text-xs tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none" />
              
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(RACIAL_TRAITS) as RaceType[]).map((r) => (
                  <button key={r} onClick={() => setRace(r)} className={`h-12 border transition-all flex items-center justify-center text-xl rounded-sm ${race === r ? 'bg-amber-950/30 border-[#b28a48]' : 'bg-neutral-950 border-neutral-900 hover:border-neutral-700'}`}>
                    {RACIAL_TRAITS[r].icon}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(INITIAL_STATS) as Array<keyof Stats>).map((s) => (
                  <div key={s} className="bg-black border border-neutral-900 p-3 text-center relative group">
                    <button onClick={() => setActiveTooltip(activeTooltip === s ? null : s)} className="text-[8px] text-neutral-600 font-bold uppercase mb-1 tracking-tighter block w-full">
                      {s} <span className="opacity-40">ⓘ</span>
                    </button>
                    {activeTooltip === s && (
                      <div className="absolute z-50 bg-neutral-900 border border-amber-900/40 p-2 text-[9px] text-neutral-400 italic font-serif leading-tight bottom-full left-0 right-0 mb-1 rounded-sm shadow-2xl animate-in fade-in slide-in-from-bottom-1">
                        {STAT_DESCRIPTIONS[s]}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleStatChange(s, -1)} className="text-neutral-700 hover:text-red-500 font-black px-1"> - </button>
                      <span className="text-sm font-black text-[#b28a48]">{stats[s]}</span>
                      <button onClick={() => handleStatChange(s, 1)} className="text-neutral-700 hover:text-green-500 font-black px-1"> + </button>
                    </div>
                  </div>
                ))}
              </div>

              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full bg-black border border-neutral-800 p-3 text-[11px] text-neutral-400 uppercase outline-none">
                <option value="">Select Archetype...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <button onClick={handleCreate} disabled={generating || !name || !classId || !reservoirReady} className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-5 text-[11px] font-black uppercase tracking-[0.5em] text-[#b28a48] shadow-xl hover:border-[#b28a48] transition-all disabled:opacity-20">
                {generating ? 'SUMMONING...' : 'BIND HERO'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8">
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
          </div>
        </div>
      </div>

      {selectedChar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 overflow-y-auto bg-black/98 backdrop-blur-xl">
          <div className="relative w-full max-w-6xl bg-[#080808] border border-[#b28a48]/30 shadow-2xl overflow-hidden rounded-sm flex flex-col lg:flex-row h-full md:h-[90vh]">
            <button onClick={() => setSelectedCharacterId(null)} className="absolute top-6 right-6 z-[110] text-neutral-600 hover:text-[#b28a48] text-4xl p-2 transition-all">✕</button>

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
              <div className="grid grid-cols-1 gap-12 text-left">
                <section className="space-y-6">
                  <div className="flex justify-between items-end border-b border-[#b28a48]/20 pb-4">
                    <h4 className="text-xl font-black fantasy-font text-neutral-400">Attributes</h4>
                    <button 
                      onClick={() => handleRerollStatsOnChar(selectedChar)} 
                      disabled={rerollingStats === selectedChar.id || !reservoirReady}
                      className="text-[10px] font-black text-[#b28a48] hover:text-amber-700 uppercase transition-all disabled:opacity-20"
                    >
                      {rerollingStats === selectedChar.id ? 'ROLLING...' : 'Reroll Unlocked 🎲'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {(Object.keys(selectedChar.stats) as Array<keyof Stats>).map(stat => (
                      <div 
                        key={stat} 
                        onClick={() => toggleStatLockOnChar(selectedChar.id, stat)}
                        className={`bg-black/60 border p-6 rounded-sm flex flex-col items-center cursor-pointer transition-all ${selectedChar.lockedStats?.includes(stat) ? 'border-amber-900/40 bg-amber-950/5' : 'border-[#b28a48]/10 hover:border-[#b28a48]/30'}`}
                      >
                        <div className="flex justify-between items-center w-full mb-4">
                          <span className={`text-xl ${selectedChar.lockedStats?.includes(stat) ? 'text-amber-600' : 'text-neutral-800'}`}>
                            {selectedChar.lockedStats?.includes(stat) ? '†' : '○'}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === stat + '_sel' ? null : stat + '_sel'); }}
                            className="text-[10px] font-black text-neutral-600 uppercase tracking-widest"
                          >
                            {stat.slice(0, 3)} ⓘ
                          </button>
                          <span className="w-5"></span>
                        </div>
                        {activeTooltip === stat + '_sel' && (
                          <div className="text-[9px] text-neutral-500 font-serif italic mb-4 text-center leading-tight">
                            {STAT_DESCRIPTIONS[stat]}
                          </div>
                        )}
                        <div className="flex items-center gap-5">
                          <span className="text-4xl font-black text-[#b28a48]">{selectedChar.stats[stat]}</span>
                          <div className="w-10 h-10 rounded-full border border-amber-950/50 flex items-center justify-center text-sm font-black text-amber-700">
                            {getModifier(selectedChar.stats[stat])}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex justify-between items-end border-b border-[#b28a48]/20 pb-4">
                    <h4 className="text-xl font-black fantasy-font text-neutral-400">Heritage & Feats</h4>
                    <button 
                      onClick={() => handleRerollFeats(selectedChar)} 
                      disabled={rerollingFeats === selectedChar.id || !reservoirReady}
                      className="text-[10px] font-black text-[#b28a48] hover:text-amber-700 uppercase transition-all disabled:opacity-20"
                    >
                      {rerollingFeats === selectedChar.id ? 'REWEAVING...' : 'Reroll Unlocked 🎲'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedChar.feats.map((f, i) => (
                      <div key={i} className={`p-5 border rounded-sm flex flex-col justify-center min-h-[100px] ${f.locked ? 'bg-amber-950/5 border-amber-900/40' : 'bg-black border-neutral-900'}`}>
                        <div className="flex items-start gap-4">
                           <span className={`text-xl mt-0.5 ${f.locked ? 'text-amber-500' : 'text-neutral-800'}`}>
                             {f.locked ? '†' : '○'}
                           </span>
                           <div>
                             <h6 className="text-sm font-black text-neutral-200 uppercase mb-1">{f.name}</h6>
                             <p className="text-xs text-neutral-500 italic font-serif leading-relaxed">{f.description}</p>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="mt-12 text-center">
                <button onClick={() => setSelectedCharacterId(null)} className="text-[10px] font-black text-neutral-700 hover:text-[#b28a48] uppercase tracking-[0.8em] transition-all pb-12">Close Ledger</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;
