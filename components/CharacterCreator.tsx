
import React, { useState, useMemo } from 'react';
import { Character, ClassDef, Stats, Trait, RaceType, GenderType, Item, UserAccount } from '../types';
import { generateImage, generateCharacterFeats, rerollStats, generateCharacterAppearance } from '../services/gemini';

const INITIAL_STATS: Stats = { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 };
const POINT_COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

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
  'Vesperian': { dexterity: 2, wisdom: 1 },
};

interface CharacterCreatorProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  classes: ClassDef[];
  items?: Item[];
  notify: (message: string, type?: any) => void;
  reservoirReady: boolean;
  currentUser: UserAccount;
  onBanish: (char: Character) => void;
}

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ characters, setCharacters, classes, notify, reservoirReady, currentUser, onBanish }) => {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [race, setRace] = useState<RaceType>('Human');
  const [gender, setGender] = useState<GenderType>('Male');
  const [charDescription, setCharDescription] = useState('');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [generating, setGenerating] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const totalPointsUsed = useMemo(() => (Object.values(stats) as number[]).reduce((acc: number, val: number) => acc + (POINT_COSTS[val] || 0), 0), [stats]);
  const pointsRemaining = 27 - totalPointsUsed;

  const handleStatChange = (stat: keyof Stats, delta: number) => {
    const newVal = stats[stat] + delta;
    if (newVal < 8 || newVal > 15) return;
    const costDiff = (POINT_COSTS[newVal] || 0) - (POINT_COSTS[stats[stat]] || 0);
    if (pointsRemaining - costDiff < 0) return;
    setStats(prev => ({ ...prev, [stat]: newVal }));
  };

  const handleCreate = async () => {
    if (!name || !classId || generating) return;
    setGenerating(true);
    try {
      const selectedClass = classes.find(c => c.id === classId);
      const imageUrl = await generateImage(`Portrait of a ${gender} ${race} ${selectedClass?.name}. ${charDescription}`);
      // Ensure classes always have at least 5 feats if we generate them
      const feats = await generateCharacterFeats(selectedClass?.name || 'Hero', '');
      
      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name, classId, race, gender, description: charDescription, level: 1, 
        stats: { ...stats }, hp: 10, maxHp: 10, gold: 50, feats: feats.slice(0, 5), isPlayer: true, 
        inventory: selectedClass?.startingItemIds || [], size: 'Medium', imageUrl,
        unspentAsiPoints: 0
      };
      
      setCharacters(prev => [...prev, newChar]);
      setName(''); setClassId(''); setCharDescription(''); setStats(INITIAL_STATS);
      notify(`${name} created.`, "success");
    } catch (e: any) { notify(e.message, "error"); } finally { setGenerating(false); }
  };

  const applyASI = (charId: string, stat: keyof Stats) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId || !c.unspentAsiPoints || c.unspentAsiPoints <= 0) return c;
      const newStats = { ...c.stats, [stat]: c.stats[stat] + 1 };
      // Recalculate HP if CON changed
      let hp = c.hp;
      let maxHp = c.maxHp;
      if (stat === 'constitution') {
        const hpGain = 1; // Simplification for ASI
        hp += hpGain;
        maxHp += hpGain;
      }
      return { ...c, stats: newStats, hp, maxHp, unspentAsiPoints: c.unspentAsiPoints - 1 };
    }));
    notify("Ability Improved.", "success");
  };

  const selectedChar = characters.find(c => c.id === selectedCharacterId);
  const selectedClass = classes.find(c => c.id === selectedChar?.classId);

  return (
    <div className="space-y-12 pb-24 text-left">
      <div className="text-center pt-8">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48]">The Fellowship</h2>
        <p className="text-neutral-600 text-[10px] uppercase tracking-[0.4em] mt-2 font-black">Summon your legend</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="grim-card p-8 border-2 border-[#b28a48]/20 rounded-sm space-y-6">
          <h3 className="text-xl font-black fantasy-font text-neutral-300">Summon New Soul</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NAME..." className="w-full bg-black border border-neutral-800 p-4 text-sm text-[#b28a48] uppercase outline-none" />
          <div className="grid grid-cols-2 gap-4">
            <select value={race} onChange={(e) => setRace(e.target.value as RaceType)} className="w-full bg-black border border-neutral-800 p-4 text-sm text-[#b28a48] outline-none uppercase">
              <option value="Human">Human</option>
              <option value="Elf">Elf</option>
              <option value="Dwarf">Dwarf</option>
              <option value="Half-Elf">Half-Elf</option>
              <option value="Orc">Orc</option>
            </select>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full bg-black border border-neutral-800 p-4 text-sm text-[#b28a48] outline-none uppercase">
              <option value="">PATH...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(stats) as Array<keyof Stats>).map(s => (
              <div key={s} className="bg-neutral-900/50 p-3 border border-neutral-800 flex justify-between items-center rounded-sm">
                <span className="text-[10px] uppercase font-black text-neutral-600">{s.slice(0,3)}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleStatChange(s, -1)} className="text-[#b28a48] hover:text-white transition-colors">-</button>
                  <span className="font-black text-white">{stats[s]}</span>
                  <button onClick={() => handleStatChange(s, 1)} className="text-[#b28a48] hover:text-white transition-colors">+</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleCreate} disabled={generating || pointsRemaining < 0 || !name || !classId} className="w-full bg-[#b28a48] text-black py-4 font-black uppercase tracking-widest disabled:opacity-20 active:scale-95">Inscribe Legend ({pointsRemaining} pts)</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {characters.map(char => (
            <div key={char.id} onClick={() => setSelectedCharacterId(char.id)} className={`grim-card group relative border-2 rounded-sm overflow-hidden hover:border-[#b28a48]/40 transition-all cursor-pointer ${selectedCharacterId === char.id ? 'border-[#b28a48]' : 'border-neutral-800'}`}>
              <div className="h-40 bg-neutral-900">
                {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" alt={char.name} /> : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">👤</div>}
              </div>
              <div className="p-4 bg-black/60 backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-black fantasy-font text-[#b28a48]">{char.name}</h4>
                    <p className="text-[8px] text-neutral-500 uppercase tracking-widest">{char.race} • LVL {char.level}</p>
                  </div>
                  {char.unspentAsiPoints ? (
                    <span className="bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-sm animate-pulse">ASI+</span>
                  ) : null}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onBanish(char); }}
                  className="absolute top-2 right-2 p-2 bg-black/80 rounded-full text-neutral-800 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedChar && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-950 border border-[#b28a48]/30 rounded-sm shadow-2xl overflow-y-auto">
            <button onClick={() => setSelectedCharacterId(null)} className="absolute top-4 right-4 text-neutral-600 hover:text-white text-2xl">✕</button>
            <div className="p-8 md:p-12">
               <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-1/3 aspect-square bg-black rounded-sm border border-neutral-800 overflow-hidden shrink-0">
                    {selectedChar.imageUrl && <img src={selectedChar.imageUrl} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-4xl font-black fantasy-font text-[#b28a48]">{selectedChar.name}</h3>
                      <p className="text-sm text-neutral-500 uppercase tracking-widest">{selectedChar.race} {selectedClass?.name} • Level {selectedChar.level}</p>
                      <p className="text-xs italic text-neutral-400 font-serif mt-2">"{selectedChar.description}"</p>
                    </div>
                    
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {(Object.keys(selectedChar.stats) as Array<keyof Stats>).map(s => (
                        <div key={s} className="bg-black border border-neutral-900 p-2 rounded-sm text-center relative group">
                          <p className="text-[7px] uppercase font-black text-neutral-600 mb-1">{s.slice(0,3)}</p>
                          <p className="text-xl font-black text-white">{selectedChar.stats[s]}</p>
                          <p className="text-[10px] text-[#b28a48]">{getModifier(selectedChar.stats[s])}</p>
                          {selectedChar.unspentAsiPoints ? (
                            <button onClick={() => applyASI(selectedChar.id, s)} className="absolute -top-1 -right-1 bg-amber-500 text-black w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center hover:scale-110 transition-transform shadow-lg">+</button>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-neutral-600 tracking-widest border-b border-neutral-900 pb-2">Traits & Feats</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedChar.feats.map((f, i) => (
                          <div key={i} className="p-3 bg-neutral-900/30 border border-neutral-800 rounded-sm">
                            <p className="text-[10px] font-black text-[#b28a48] uppercase">{f.name}</p>
                            <p className="text-[9px] text-neutral-500 italic leading-relaxed">{f.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;
