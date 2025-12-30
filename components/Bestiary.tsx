
import React, { useState, useMemo } from 'react';
import { Monster, Stats } from '../types';
import { generateMonsterStats, generateImage, rerollTraits } from '../services/gemini';

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

const Bestiary: React.FC<BestiaryProps> = ({ monsters, setMonsters, notify, reservoirReady }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isBoss, setIsBoss] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [bossOnly, setBossOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'hp' | 'ac'>('name');

  const filteredMonsters = useMemo(() => {
    return monsters
      .filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
        const matchesBoss = !bossOnly || m.isBoss;
        return matchesSearch && matchesBoss;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'hp') return b.hp - a.hp;
        if (sortBy === 'ac') return b.ac - a.ac;
        return 0;
      });
  }, [monsters, search, bossOnly, sortBy]);

  const handleCreate = async () => {
    if (!name || !description || loading || !reservoirReady) return;
    setLoading(true);
    try {
      const [stats, imageUrl] = await Promise.all([
        generateMonsterStats(name, description, isBoss),
        generateImage(`Full body illustration of a ${isBoss ? 'LEGENDARY BOSS' : 'fantasy'} monster: ${description}. cinematic lighting.`)
      ]);
      
      const newMonster: Monster = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        description,
        isBoss,
        stats: stats.stats || { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
        hp: stats.hp || 50,
        ac: stats.ac || 15,
        abilities: (stats.abilities || []).map(a => ({ ...a, locked: false })),
        imageUrl
      };
      
      setMonsters(prev => [...prev, newMonster]);
      setName('');
      setDescription('');
      setIsBoss(false);
      setExpandedId(newMonster.id);
      notify(`${name} inscribed into the bestiary.`, "success");
    } catch (e: any) {
      console.error(e);
      notify(e.message || "Failed to summon monster into the codex.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = (monsterId: string, abilityIdx: number) => {
    setMonsters(prev => prev.map(m => {
      if (m.id !== monsterId) return m;
      const newAbilities = [...m.abilities];
      newAbilities[abilityIdx] = { ...newAbilities[abilityIdx], locked: !newAbilities[abilityIdx].locked };
      return { ...m, abilities: newAbilities };
    }));
  };

  const handleReroll = (e: React.MouseEvent, monster: Monster) => {
    e.stopPropagation();
    if (!reservoirReady) return;
    setRerolling(monster.id);
    const traitFormat = monster.abilities.map(a => ({ name: a.name, description: a.effect, locked: a.locked }));
    rerollTraits('monster', monster.name, monster.description, traitFormat)
      .then(updated => {
        setMonsters(prev => prev.map(m => {
          if (m.id !== monster.id) return m;
          
          let updateIdx = 0;
          const finalMergedAbilities = m.abilities.map(original => {
             if (original.locked) return original;
             const replacement = updated[updateIdx];
             updateIdx++;
             return replacement ? { name: replacement.name, effect: replacement.description, locked: false } : original;
          });

          return { ...m, abilities: finalMergedAbilities };
        }));
        notify("Monstrous traits rewoven.", "success");
      })
      .catch(err => {
        console.error(err);
        notify(err.message || "The spirits refuse to change this creature.", "error");
      })
      .finally(() => setRerolling(null));
  };

  const handleDelete = (e: React.MouseEvent, monster: Monster) => {
    e.stopPropagation();
    if (window.confirm(`Are you certain you want to banish "${monster.name}"?`)) {
      setMonsters(prev => prev.filter(x => x.id !== monster.id));
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-3xl md:text-4xl font-black fantasy-font text-[#b28a48] tracking-widest">Ancient Bestiary</h2>
        <p className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black mt-2">Codex of Horrors & Guardians</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 rounded-sm border-2 border-dashed border-[#b28a48]/20 sticky top-4 shadow-2xl">
            <h3 className="text-xl font-black mb-6 fantasy-font text-neutral-300">Summon Horror</h3>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Entity Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="NAME OF THE BEAST..."
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-bold"
                />
              </div>

              {/* Legendary Threat Toggle */}
              <div 
                onClick={() => setIsBoss(!isBoss)}
                className={`flex items-center justify-between p-4 bg-black border rounded-sm transition-all cursor-pointer group hover:bg-neutral-900/50 ${isBoss ? 'border-red-900/50' : 'border-neutral-800'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${isBoss ? 'bg-red-600' : 'bg-neutral-800'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isBoss ? 'left-4.5' : 'left-0.5'}`}></div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isBoss ? 'text-red-500' : 'text-neutral-500'}`}>Legendary Threat</span>
                </div>
                {isBoss && <span className="text-red-600 text-xs animate-pulse">🔥</span>}
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Monstrous Nature</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="DESCRIBE ITS ANATOMY & LEGEND..."
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 h-40 text-xs text-neutral-400 focus:border-[#b28a48] outline-none font-serif italic leading-relaxed"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={loading || !name || !reservoirReady}
                className={`px-8 py-5 rounded-sm font-black w-full text-[11px] uppercase tracking-[0.4em] transition-all shadow-xl flex flex-col items-center gap-1 ${isBoss ? 'bg-red-800 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(153,27,27,0.4)]' : 'bg-[#b28a48] hover:bg-[#cbb07a] text-black'} disabled:opacity-20 active:scale-95`}
              >
                {loading ? 'BINDING FORM...' : !reservoirReady ? 'ENERGY LOW...' : (
                  <>
                    <span>{isBoss ? 'SUMMON BOSS' : 'INSCRIBE BESTIARY'}</span>
                    <span className={`text-[8px] tracking-widest ${isBoss ? 'text-red-200/60' : 'text-neutral-900/60'}`}>[-30⚡ ESSENCE]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <input 
              type="text" 
              placeholder="Search Codex Entries..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-black border border-neutral-900 px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] outline-none focus:border-[#b28a48]"
            />
            <button 
              onClick={() => setBossOnly(!bossOnly)}
              className={`px-4 py-3 text-[10px] uppercase tracking-widest border rounded-sm transition-all font-black ${bossOnly ? 'border-red-500 text-red-500 bg-red-950/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-neutral-900 text-neutral-500 hover:border-neutral-800'}`}
            >
              Legendary Only
            </button>
          </div>

          <div className="space-y-8">
            {filteredMonsters.map(m => (
              <div 
                key={m.id} 
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className={`grim-card rounded-sm overflow-hidden group transition-all duration-500 border-2 cursor-pointer ${expandedId === m.id ? (m.isBoss ? 'border-red-600/60 shadow-[0_0_50px_rgba(153,27,27,0.2)]' : 'border-[#b28a48]/60 shadow-2xl') : (m.isBoss ? 'border-red-900/30 hover:border-red-700/50' : 'border-neutral-900 hover:border-neutral-800')}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className={`h-48 md:h-auto md:w-56 relative flex-shrink-0 transition-all duration-700 ${expandedId === m.id ? 'grayscale-0' : 'grayscale'}`}>
                    {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black flex items-center justify-center text-6xl">🐉</div>}
                    {m.isBoss && <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-[7px] font-black text-white uppercase tracking-tighter rounded-full shadow-lg">Legendary</div>}
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className={`text-3xl font-black fantasy-font tracking-widest ${m.isBoss ? 'text-red-500' : 'text-[#b28a48]'}`}>{m.name}</h4>
                          {m.isBoss && <span className="text-red-600 animate-pulse text-xl">💀</span>}
                        </div>
                        <p className="text-[10px] text-neutral-600 uppercase tracking-[0.3em] font-black mt-2">
                          {m.isBoss ? 'World Boss Entity' : 'Standard Creature'} • CR {Math.floor(m.hp / 12) + (m.isBoss ? 5 : 1)}
                        </p>
                      </div>
                      <div className="flex gap-6 items-center">
                        <div className="text-center">
                          <div className="text-[10px] text-neutral-700 font-black uppercase tracking-tighter mb-1">Armor</div>
                          <div className="text-2xl font-black text-neutral-300">{m.ac}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-neutral-700 font-black uppercase tracking-tighter mb-1">Health</div>
                          <div className={`text-2xl font-black ${m.isBoss ? 'text-red-500' : 'text-neutral-300'}`}>{m.hp}</div>
                        </div>
                        <button onClick={(e) => handleDelete(e, m)} className="ml-4 text-neutral-800 hover:text-red-600 transition-all p-2 text-xl active:scale-90">🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div className={`border-t-2 bg-[#060606] p-8 md:p-14 space-y-12 animate-in slide-in-from-top duration-500 ${m.isBoss ? 'border-red-900/40' : 'border-neutral-900'}`}>
                    
                    {/* Expanded Stat Grid */}
                    <div className="space-y-6">
                       <h5 className={`text-[12px] font-black uppercase tracking-[0.5em] border-b pb-2 ${m.isBoss ? 'text-red-500 border-red-950' : 'text-[#b28a48] border-[#b28a48]/20'}`}>Sacred Attributes</h5>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {(Object.keys(m.stats) as Array<keyof Stats>).map(s => (
                          <div key={s} className={`bg-black/60 border p-6 rounded-sm flex flex-col items-center group/stat transition-all shadow-inner ${m.isBoss ? 'border-red-900/20 hover:border-red-600/40' : 'border-neutral-900 hover:border-[#b28a48]/40'}`}>
                            <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 transition-colors ${m.isBoss ? 'text-red-900 group-hover/stat:text-red-500' : 'text-neutral-600 group-hover/stat:text-[#b28a48]'}`}>{s.slice(0, 3)}</div>
                            <div className={`text-4xl font-black ${m.isBoss ? 'text-red-500 drop-shadow-[0_2px_10px_rgba(239,68,68,0.3)]' : 'text-[#b28a48] drop-shadow-[0_2px_10px_rgba(178,138,72,0.2)]'}`}>{m.stats[s]}</div>
                            <div className={`mt-3 w-10 h-10 rounded-full border flex items-center justify-center text-xs font-black shadow-xl ${m.isBoss ? 'border-red-950 bg-red-950/20 text-red-600' : 'border-amber-950/50 bg-amber-950/10 text-amber-700'}`}>
                              {getModifier(m.stats[s])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <div>
                          <h5 className="text-[11px] font-black text-neutral-600 uppercase tracking-[0.4em] mb-4 border-b border-neutral-800 pb-2">Narrative Nature</h5>
                          <p className="text-base text-neutral-400 font-serif leading-relaxed italic">{m.description}</p>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-6">
                           <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                              <h5 className="text-[11px] font-black text-neutral-600 uppercase tracking-[0.4em]">Actions & Traits</h5>
                              <button onClick={(e) => handleReroll(e, m)} disabled={rerolling === m.id || !reservoirReady} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-20 ${m.isBoss ? 'text-red-500' : 'text-[#b28a48]'}`}>
                                {rerolling === m.id ? '...' : (
                                  <>
                                    <span>Reroll 🎲</span>
                                    <span className="opacity-60">[-2⚡]</span>
                                  </>
                                )}
                              </button>
                           </div>
                           <div className="space-y-6">
                              {m.abilities.map((a, i) => (
                                <div key={i} className="flex items-start gap-4">
                                  <button onClick={(e) => { e.stopPropagation(); toggleLock(m.id, i); }} className={`mt-1 text-xl ${a.locked ? (m.isBoss ? 'text-red-600' : 'text-amber-500') : 'text-neutral-800'}`}>
                                    {a.locked ? '†' : '○'}
                                  </button>
                                  <div>
                                    <div className={`text-base font-black uppercase tracking-wider mb-2 ${a.locked ? (m.isBoss ? 'text-red-600' : 'text-amber-600') : (m.isBoss ? 'text-red-400' : 'text-[#b28a48]')}`}>{a.name}</div>
                                    <p className="text-sm text-neutral-400 font-serif italic leading-relaxed">{a.effect}</p>
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center pt-10 border-t border-neutral-900">
                      <button onClick={(e) => { e.stopPropagation(); setExpandedId(null); }} className="text-[11px] font-black text-neutral-700 hover:text-[#b28a48] uppercase tracking-[0.8em] transition-all">Collapse Codex Entry</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface BestiaryProps {
  monsters: Monster[];
  setMonsters: React.Dispatch<React.SetStateAction<Monster[]>>;
  notify: (message: string, type?: any) => void;
  reservoirReady: boolean;
}

export default Bestiary;
