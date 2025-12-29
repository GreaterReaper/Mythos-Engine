
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
  notify: (message: string, type?: any) => void;
  // Fix: Added missing reservoirReady property to interface to handle UI state for API availability
  reservoirReady: boolean;
}

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

// Fix: Destructured reservoirReady from props to use in button disabled logic
const CharacterCreator: React.FC<CharacterCreatorProps> = ({ characters, setCharacters, classes, items = [], notify, reservoirReady }) => {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [race, setRace] = useState<RaceType>('Human');
  const [gender, setGender] = useState<GenderType>('Male');
  const [charDescription, setCharDescription] = useState('');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [generating, setGenerating] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

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
    // Fix: Guard handleCreate with reservoirReady check
    if (!name || !classId || !reservoirReady) return;
    setGenerating(true);
    try {
      const selectedClass = classes.find(c => c.id === classId);
      const prompt = `Fantasy TTRPG character portrait of a ${gender} ${race} ${selectedClass?.name}. Appearance: ${charDescription}. Dark fantasy atmosphere.`;
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
      setSelectedCharacterId(newChar.id);
      notify(`${name} has joined the fellowship.`, "success");
    } catch (e: any) { 
      console.error(e); 
      notify(e.message || "Failed to summon hero from the ether.", "error");
    } finally { setGenerating(false); }
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
    // Fix: Guard handleRerollFeats with reservoirReady check
    if (!reservoirReady) return;
    setRerolling(char.id);
    try {
      const selectedClass = classes.find(c => c.id === char.classId);
      const updatedFeats = await rerollTraits('character', char.name, selectedClass?.description || '', char.feats);
      setCharacters(prev => prev.map(c => {
        if (c.id !== char.id) return c;
        return { ...c, feats: updatedFeats.map((f, i) => ({ ...f, locked: char.feats[i].locked })) };
      }));
      notify("Heroic feats rewoven.", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally { setRerolling(null); }
  };

  const selectedChar = characters.find(c => c.id === selectedCharacterId);
  const selectedClass = classes.find(c => c?.id === selectedChar?.classId);

  return (
    <div className="space-y-12 pb-12">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Fellowship</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Heroes of Shadow & Steel</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-8 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4 shadow-2xl">
            <h3 className="text-xl font-black mb-8 fantasy-font text-neutral-300">Recruit Hero</h3>
            <div className="space-y-6">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NAME..." className="w-full bg-black border border-neutral-800 p-4 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <select value={race} onChange={(e) => setRace(e.target.value as RaceType)} className="bg-black border border-neutral-800 p-3 text-[11px] text-neutral-400 uppercase tracking-widest outline-none">
                  <option value="Human">Human</option>
                  <option value="Variant Human">Variant Human</option>
                  <option value="Dwarf">Dwarf</option>
                  <option value="Elf">Elf</option>
                  <option value="Half-Elf">Half-Elf</option>
                </select>
                <select value={gender} onChange={(e) => setGender(e.target.value as GenderType)} className="bg-black border border-neutral-800 p-3 text-[11px] text-neutral-400 uppercase tracking-widest outline-none">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Non-binary</option>
                </select>
              </div>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full bg-black border border-neutral-800 p-3 text-[11px] text-neutral-400 uppercase tracking-widest outline-none">
                <option value="">Select Archetype...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea value={charDescription} onChange={(e) => setCharDescription(e.target.value)} placeholder="APPEARANCE & HISTORY..." className="w-full bg-black border border-neutral-800 p-4 h-32 text-xs text-neutral-500 uppercase tracking-tight focus:border-[#b28a48] outline-none font-serif italic" />
              
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(stats) as Array<keyof Stats>).map((s) => (
                  <div key={s} className="bg-black border border-neutral-900 p-3 text-center">
                    <div className="text-[9px] text-neutral-600 font-bold uppercase mb-1">{s.slice(0, 3)}</div>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleStatChange(s, -1)} className="text-neutral-500 hover:text-amber-500 font-black px-1"> - </button>
                      <span className="text-sm font-black text-[#b28a48]">{stats[s]}</span>
                      <button onClick={() => handleStatChange(s, 1)} className="text-neutral-500 hover:text-amber-500 font-black px-1"> + </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center p-3 border border-neutral-900 bg-black/40 text-[10px] font-black uppercase text-neutral-600 tracking-widest">
                Essence Remaining: <span className="text-amber-700">{pointsRemaining}</span>
              </div>

              {/* Fix: Applied reservoirReady to disabled state and button text to prevent unauthorized requests */}
              <button onClick={handleCreate} disabled={generating || !name || !classId || !reservoirReady} className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-5 text-[11px] font-black uppercase tracking-[0.5em] text-[#b28a48] shadow-xl hover:border-[#b28a48] transition-all disabled:opacity-20">
                {generating ? 'SUMMONING...' : !reservoirReady ? 'ENERGY LOW...' : 'BIND HERO'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-8">
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
                <div key={char.id} onClick={() => setSelectedCharacterId(char.id)} className="grim-card flex flex-col group border-[#b28a48]/10 hover:border-[#b28a48]/60 transition-all cursor-pointer shadow-xl overflow-hidden">
                  <div className="h-64 bg-black relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700">
                    {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-7xl">👤</div>}
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
                {selectedChar.imageUrl ? <img src={selectedChar.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-9xl text-neutral-900">👤</div>}
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
                      <div key={stat} className="bg-black/60 border border-[#b28a48]/10 p-6 rounded-sm flex flex-col items-center">
                        <div className="text-[11px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-4">{stat}</div>
                        <div className="flex items-center gap-5">
                          <span className="text-4xl font-black text-[#b28a48]">{selectedChar.stats[stat]}</span>
                          <div className="w-12 h-12 rounded-full border border-amber-950/50 flex items-center justify-center text-sm font-black text-amber-700 bg-amber-950/10 shadow-lg">
                            {getModifier(selectedChar.stats[stat])}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-[#b28a48]/20 pb-4">
                      <h4 className="text-xl font-black fantasy-font text-neutral-400 tracking-widest">Heritage & Feats</h4>
                      {/* Fix: Added reservoirReady to disabled logic for reroll button within character details */}
                      <button onClick={() => handleRerollFeats(selectedChar)} disabled={rerolling === selectedChar.id || !reservoirReady} className="text-[10px] font-black text-neutral-600 hover:text-amber-700 uppercase tracking-[0.3em] transition-all disabled:opacity-20">
                        {rerolling === selectedChar.id ? 'REWEAVING...' : !reservoirReady ? 'ENERGY LOW...' : 'Reroll Potential 🎲'}
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
