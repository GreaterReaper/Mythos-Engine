
import React, { useState, useMemo } from 'react';
import { Character, ClassDef, Stats, Trait, RaceType, GenderType, Item } from '../types';
import { generateImage, generateCharacterFeats, rerollTraits } from '../services/gemini';

const INITIAL_STATS: Stats = { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 };
const POINT_COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const RACIAL_BONUSES: Record<RaceType, Partial<Stats>> = {
  Human: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
  'Variant Human': { strength: 1, constitution: 1 },
  Dwarf: { constitution: 2, strength: 1 },
  Elf: { dexterity: 2, intelligence: 1 },
  'Half-Elf': { charisma: 2, dexterity: 1, wisdom: 1 },
};
const RACIAL_TRAITS: Record<RaceType, Trait[]> = {
  Human: [{ name: 'Versatile Heritage', description: 'Adaptive and broad range of minor proficiencies.' }],
  'Variant Human': [
    { name: 'Bonus Feat', description: 'Begins the journey with a specialized mastery or talent.' },
    { name: 'Skillful', description: 'Proficiency in an extra skill of choice.' }
  ],
  Dwarf: [{ name: 'Dwarven Resilience', description: 'Resistant to poisons and hardy in battle.' }],
  Elf: [{ name: 'Fey Ancestry', description: 'Immune to magical sleep and resistant to charms.' }],
  'Half-Elf': [
    { name: 'Fey Ancestry', description: 'Shared heritage provides resistance to charms and sleep.' },
    { name: 'Skill Versatility', description: 'Extraordinarily adaptable, gaining mastery in two extra skills.' }
  ],
};

interface CharacterCreatorProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  classes: ClassDef[];
  items?: Item[];
}

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ characters, setCharacters, classes, items = [] }) => {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [race, setRace] = useState<RaceType>('Human');
  const [gender, setGender] = useState<GenderType>('Male');
  const [charDescription, setCharDescription] = useState('');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [generating, setGenerating] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // Search & Sort State
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

  const handleStatChange = (stat: keyof Stats, delta: number) => {
    const newVal = stats[stat] + delta;
    if (newVal < 8 || newVal > 15) return;
    const costDiff = (POINT_COSTS[newVal] || 0) - (POINT_COSTS[stats[stat]] || 0);
    if (pointsRemaining - costDiff < 0) return;
    setStats(prev => ({ ...prev, [stat]: newVal }));
  };

  const handleCreate = async () => {
    if (!name || !classId) return;
    setGenerating(true);
    try {
      const selectedClass = classes.find(c => c.id === classId);
      const prompt = `Fantasy TTRPG character portrait of a ${gender} ${race} ${selectedClass?.name}. Appearance: ${charDescription}. Dark fantasy atmosphere, detailed painting.`;
      const [imageUrl, classFeats] = await Promise.all([generateImage(prompt), generateCharacterFeats(selectedClass?.name || 'Adventurer', selectedClass?.description || '')]);
      const racialFeats = RACIAL_TRAITS[race].map(t => ({ ...t, locked: true }));
      const allFeats = [...racialFeats, ...classFeats];
      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name, classId, race, gender, description: charDescription, level: 1, stats: finalStats,
        hp: (selectedClass?.startingHp || 10) + (Math.floor((finalStats.constitution - 10) / 2)),
        maxHp: (selectedClass?.startingHp || 10) + (Math.floor((finalStats.constitution - 10) / 2)),
        feats: allFeats, imageUrl, isPlayer: characters.length === 0,
        inventory: []
      };
      setCharacters(prev => [...prev, newChar]);
      setName(''); setClassId(''); setCharDescription(''); setStats(INITIAL_STATS);
    } catch (e) { console.error(e); } finally { setGenerating(false); }
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
    setRerolling(char.id);
    try {
      const selectedClass = classes.find(c => c.id === char.classId);
      const updatedFeats = await rerollTraits('character', char.name, selectedClass?.description || '', char.feats);
      setCharacters(prev => prev.map(c => {
        if (c.id !== char.id) return c;
        return { ...c, feats: updatedFeats.map((f, i) => ({ ...f, locked: char.feats[i].locked })) };
      }));
    } finally { setRerolling(null); }
  };

  const selectedChar = characters.find(c => c.id === selectedCharacterId);
  const selectedClass = classes.find(c => c?.id === selectedChar?.classId);

  const toggleItemAssignment = (charId: string, itemId: string) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const hasItem = c.inventory.includes(itemId);
      const newInv = hasItem 
        ? c.inventory.filter(id => id !== itemId)
        : [...c.inventory, itemId];
      return { ...c, inventory: newInv };
    }));
  };

  return (
    <div className="space-y-12 pb-12">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Fellowship</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Heroes of Shadow & Steel</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Creator Panel */}
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4">
            <h3 className="text-lg font-black mb-6 fantasy-font text-neutral-300">Recruit Hero</h3>
            <div className="space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NAME" className="w-full bg-black/50 border border-neutral-800 p-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48]" />
              <div className="grid grid-cols-2 gap-2">
                <select value={race} onChange={(e) => setRace(e.target.value as RaceType)} className="bg-black border border-neutral-800 p-2 text-[10px] text-neutral-400 uppercase">
                  <option value="Human">Human</option>
                  <option value="Variant Human">Variant Human</option>
                  <option value="Dwarf">Dwarf</option>
                  <option value="Elf">Elf</option>
                  <option value="Half-Elf">Half-Elf</option>
                </select>
                <select value={gender} onChange={(e) => setGender(e.target.value as GenderType)} className="bg-black border border-neutral-800 p-2 text-[10px] text-neutral-400 uppercase">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Non-binary</option>
                </select>
              </div>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full bg-black border border-neutral-800 p-2 text-[10px] text-neutral-400 uppercase">
                <option value="">Select Class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea value={charDescription} onChange={(e) => setCharDescription(e.target.value)} placeholder="APPEARANCE & HISTORY..." className="w-full bg-black border border-neutral-800 p-3 h-24 text-[10px] text-neutral-500 uppercase tracking-tighter" />
              
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(stats) as Array<keyof Stats>).map((s) => {
                  const bonus = RACIAL_BONUSES[race][s] || 0;
                  return (
                    <div key={s} className="bg-black border border-neutral-900 p-2 text-center relative group">
                      <div className="text-[8px] text-neutral-600 font-bold uppercase">{s.slice(0, 3)}</div>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleStatChange(s, -1)} className="text-neutral-600 hover:text-amber-500 font-black"> - </button>
                        <span className="text-xs font-black text-[#b28a48]">{stats[s]}</span>
                        <button onClick={() => handleStatChange(s, 1)} className="text-neutral-600 hover:text-amber-500 font-black"> + </button>
                      </div>
                      <div className="flex flex-col items-center mt-1">
                        {bonus > 0 && <span className="text-[8px] text-amber-600 font-black uppercase">+{bonus} {race}</span>}
                        <span className="text-[10px] font-black text-neutral-700">Total: {stats[s] + bonus}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="text-center p-2 border border-neutral-900 bg-black/40">
                <span className="text-[9px] text-neutral-600 font-bold uppercase mr-2">Points Remaining:</span>
                <span className="text-sm font-black text-amber-700">{pointsRemaining}</span>
              </div>

              <button onClick={handleCreate} disabled={generating || !name || !classId} className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] hover:border-[#b28a48] transition-all">
                {generating ? 'PREPARING...' : 'SUMMON HERO'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Grid & Filters */}
        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="text" 
                placeholder="Search Hero..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none"
              />
            </div>
            <select 
              value={raceFilter}
              onChange={(e) => setRaceFilter(e.target.value)}
              className="bg-neutral-900/50 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-400 outline-none"
            >
              <option value="All">All Races</option>
              <option value="Human">Human</option>
              <option value="Variant Human">Variant Human</option>
              <option value="Dwarf">Dwarf</option>
              <option value="Elf">Elf</option>
              <option value="Half-Elf">Half-Elf</option>
            </select>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-900/50 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-400 outline-none"
            >
              <option value="name">Sort: Name</option>
              <option value="hp">Sort: Max HP</option>
              <option value="level">Sort: Level</option>
            </select>
            <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-auto">
              Total: {filteredCharacters.length}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredCharacters.map(char => {
              const charClass = classes.find(c => c.id === char.classId);
              return (
                <div 
                  key={char.id} 
                  onClick={() => setSelectedCharacterId(char.id)}
                  className="grim-card flex flex-col group border-[#b28a48]/10 hover:border-[#b28a48]/60 transition-all cursor-pointer transform hover:-translate-y-1"
                >
                  <div className="h-56 bg-black relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700">
                    {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl">👤</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                       <div>
                         <h4 className="text-lg font-black fantasy-font text-[#b28a48]">{char.name}</h4>
                         <p className="text-[8px] text-neutral-500 uppercase tracking-widest">{char.race} {charClass?.name}</p>
                       </div>
                       <div className="text-[10px] font-black text-amber-900">HP {char.hp}/{char.maxHp}</div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 group-hover:text-[#b28a48] transition-colors">LVL {char.level}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 group-hover:text-[#b28a48] transition-colors">View Ledger †</span>
                  </div>
                </div>
              );
            })}
            {filteredCharacters.length === 0 && (
              <div className="col-span-full py-12 text-center text-[10px] uppercase tracking-[0.5em] text-neutral-700">No souls match this query...</div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Character Sheet Modal (Keep existing) */}
      {selectedChar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedCharacterId(null)}></div>
          
          <div className="relative w-full max-w-5xl bg-[#080808] border border-[#b28a48]/30 shadow-[0_0_100px_rgba(178,138,72,0.1)] overflow-hidden rounded-sm flex flex-col lg:flex-row min-h-[80vh]">
            <button 
              onClick={() => setSelectedCharacterId(null)}
              className="absolute top-4 right-4 z-[110] text-neutral-600 hover:text-[#b28a48] text-2xl p-2 transition-colors"
            >
              ✕
            </button>

            {/* Left: Portrait & Vital Stats */}
            <div className="lg:w-2/5 relative border-b lg:border-b-0 lg:border-r border-[#b28a48]/10 group">
              <div className="h-[400px] lg:h-full relative overflow-hidden">
                {selectedChar.imageUrl ? (
                  <img src={selectedChar.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-9xl text-neutral-900">👤</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="text-4xl font-black fantasy-font text-[#b28a48] mb-1">{selectedChar.name}</h3>
                  <p className="text-xs uppercase tracking-[0.5em] text-neutral-400 mb-6">{selectedChar.gender} {selectedChar.race} {selectedClass?.name}</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Vitality</span>
                      <span className="text-sm font-black text-red-700">{selectedChar.hp} / {selectedChar.maxHp} HP</span>
                    </div>
                    <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
                      <div className="h-full bg-red-900 shadow-[0_0_8px_rgba(153,27,27,0.5)]" style={{ width: `${(selectedChar.hp / selectedChar.maxHp) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Detailed Ledger */}
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                
                {/* Stats Section */}
                <div className="space-y-8">
                  <h4 className="text-lg font-black fantasy-font text-neutral-400 border-b border-[#b28a48]/10 pb-2">Attributes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(Object.keys(selectedChar.stats) as Array<keyof Stats>).map(stat => {
                      const racialBonus = RACIAL_BONUSES[selectedChar.race][stat] || 0;
                      const baseStat = selectedChar.stats[stat] - racialBonus;
                      return (
                        <div key={stat} className="bg-black/40 border border-[#b28a48]/5 p-4 rounded-sm relative group/stat">
                          <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">{stat}</div>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-[#b28a48]">{selectedChar.stats[stat]}</span>
                            <span className="w-8 h-8 rounded-full border border-[#b28a48]/20 flex items-center justify-center text-[10px] font-black text-amber-700 bg-amber-950/20">
                              {getModifier(selectedChar.stats[stat])}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[8px] font-bold uppercase text-neutral-600">
                             <span>Base: {baseStat}</span>
                             {racialBonus > 0 && <span className="text-amber-700">+{racialBonus} ({selectedChar.race})</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <h4 className="text-lg font-black fantasy-font text-neutral-400 border-b border-[#b28a48]/10 pb-2 pt-4">Arcane Lore</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed font-serif italic italic">
                    {selectedChar.description || "A silent voyager in the realms of Mythos, whose true tale is yet to be fully inscribed."}
                  </p>
                </div>

                {/* Feats & Inventory */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-[#b28a48]/10 pb-2">
                      <h4 className="text-lg font-black fantasy-font text-neutral-400">Traits & Feats</h4>
                      <button onClick={() => handleRerollFeats(selectedChar)} disabled={rerolling === selectedChar.id} className="text-[9px] font-black text-neutral-600 hover:text-amber-700 uppercase tracking-widest">Reroll 🎲</button>
                    </div>
                    <div className="space-y-2">
                      {selectedChar.feats.map((f, i) => (
                        <div key={i} className="group/feat relative">
                          <div className="bg-black/30 border border-neutral-900 p-3 rounded-sm flex items-center gap-3 group-hover/feat:border-[#b28a48]/20 transition-all">
                             <button onClick={() => toggleFeatLock(selectedChar.id, i)} className={`text-xs ${f.locked ? 'text-amber-500' : 'text-neutral-800'}`}>
                               {f.locked ? '†' : '○'}
                             </button>
                             <div className="flex-1">
                               <div className="text-[10px] font-black text-neutral-300 uppercase tracking-tighter">{f.name}</div>
                               <div className="text-[9px] text-neutral-600 italic mt-0.5">{f.description}</div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-black fantasy-font text-neutral-400 border-b border-[#b28a48]/10 pb-2">Equipped Gear</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                      {selectedChar.inventory.map(itemId => {
                        const item = items.find(i => i.id === itemId);
                        if (!item) return null;
                        return (
                          <div key={itemId} className="bg-[#1a1a1a]/40 border border-[#b28a48]/10 p-3 rounded-sm flex items-center justify-between group/inv">
                            <div className="flex items-center gap-3">
                               <span className="text-lg">{item.type === 'Weapon' ? '⚔️' : '🛡️'}</span>
                               <div>
                                 <div className="text-[10px] font-black text-[#b28a48] uppercase tracking-widest">{item.name}</div>
                                 <div className="text-[8px] text-neutral-500 uppercase">{item.type}</div>
                               </div>
                            </div>
                            <button onClick={() => toggleItemAssignment(selectedChar.id, itemId)} className="text-[8px] font-black text-neutral-700 hover:text-red-900 uppercase opacity-0 group-hover/inv:opacity-100 transition-opacity">Unequip</button>
                          </div>
                        );
                      })}
                      
                      {selectedChar.inventory.length === 0 && (
                        <div className="text-[10px] text-neutral-700 italic text-center p-4 border border-dashed border-neutral-900">No equipment currently bound to this soul.</div>
                      )}
                    </div>

                    <div className="pt-4">
                      <div className="text-[9px] font-black text-neutral-600 uppercase mb-2 tracking-widest">Assign Available Gear</div>
                      <div className="flex flex-wrap gap-2">
                        {items.filter(i => !selectedChar.inventory.includes(i.id)).slice(0, 5).map(item => (
                          <button 
                            key={item.id}
                            onClick={() => toggleItemAssignment(selectedChar.id, item.id)}
                            className="bg-black border border-neutral-900 px-3 py-1.5 rounded-sm text-[8px] font-black text-neutral-500 hover:text-[#b28a48] hover:border-[#b28a48]/30 transition-all uppercase tracking-tighter"
                          >
                            + {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-[#b28a48]/5 flex justify-between items-center">
                <div className="text-[8px] text-neutral-700 uppercase font-black tracking-[0.5em]">Arcane Ledger ID: {selectedChar.id}</div>
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you wish to dismiss this hero?")) {
                      setCharacters(prev => prev.filter(p => p.id !== selectedChar.id));
                      setSelectedCharacterId(null);
                    }
                  }}
                  className="text-[9px] font-black text-red-900/60 hover:text-red-600 uppercase tracking-[0.3em] transition-colors"
                >
                  Dissolve Binding
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;
