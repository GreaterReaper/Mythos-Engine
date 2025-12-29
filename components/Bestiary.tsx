
import React, { useState, useMemo } from 'react';
import { Monster, Stats } from '../types';
import { generateMonsterStats, generateImage, rerollTraits } from '../services/gemini';

interface BestiaryProps {
  monsters: Monster[];
  setMonsters: React.Dispatch<React.SetStateAction<Monster[]>>;
  notify: (message: string, type?: any) => void;
  reservoirReady: boolean;
}

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
          return {
            ...m,
            abilities: updated.map((u, i) => ({ 
              name: u.name, 
              effect: u.description, 
              locked: monster.abilities[i].locked 
            }))
          };
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
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NAME OF THE BEAST..."
                className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-bold"
              />
              <button 
                onClick={() => setIsBoss(!isBoss)}
                className={`w-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.3em] border transition-all ${isBoss ? 'bg-red-950/40 border-red-500 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-black border-neutral-800 text-neutral-600'}`}
              >
                {isBoss ? '🔥 LEGENDARY THREAT' : 'STANDARD CREATURE'}
              </button>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="DESCRIBE ITS NATURE..."
                className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 h-40 text-xs text-neutral-400 focus:border-[#b28a48] outline-none font-serif italic leading-relaxed"
              />
              <button
                onClick={handleCreate}
                disabled={loading || !name || !reservoirReady}
                className={`px-8 py-5 rounded-sm font-black w-full text-[11px] uppercase tracking-[0.4em] transition-all shadow-xl flex flex-col items-center gap-1 ${isBoss ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-[#b28a48] hover:bg-[#cbb07a] text-black'} disabled:opacity-20 active:scale-95`}
              >
                {loading ? 'WEAVING FORM...' : !reservoirReady ? 'ENERGY LOW...' : (
                  <>
                    <span>INSCRIBE BESTIARY</span>
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
              className={`px-4 py-3 text-[10px] uppercase tracking-widest border rounded-sm transition-all font-black ${bossOnly ? 'border-red-500 text-red-500 bg-red-950/20' : 'border-neutral-900 text-neutral-500 hover:border-neutral-800'}`}
            >
              Legendary Only
            </button>
          </div>

          <div className="space-y-8">
            {filteredMonsters.map(m => (
              <div 
                key={m.id} 
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className={`grim-card rounded-sm overflow-hidden group transition-all duration-500 border-2 cursor-pointer ${expandedId === m.id ? (m.isBoss ? 'border-red-600/60 shadow-2xl' : 'border-[#b28a48]/60 shadow-2xl') : (m.isBoss ? 'border-red-900/30' : 'border-neutral-900 hover:border-neutral-800')}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className={`h-48 md:h-auto md:w-56 relative flex-shrink-0 transition-all duration-700 ${expandedId === m.id ? 'grayscale-0' : 'grayscale'}`}>
                    {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black flex items-center justify-center text-6xl">🐉</div>}
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`text-3xl font-black fantasy-font tracking-widest ${m.isBoss ? 'text-red-500' : 'text-[#b28a48]'}`}>{m.name}</h4>
                        <p className="text-[10px] text-neutral-600 uppercase tracking-[0.3em] font-black mt-2">
                          {m.isBoss ? 'Boss Entity' : 'Standard Creature'} • Level {Math.floor(m.hp / 15) + 1}
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
                  <div className="border-t-2 border-neutral-900 bg-[#060606] p-8 md:p-14 space-y-12 animate-in slide-in-from-top duration-500">
                    
                    {/* Expanded Stat Grid */}
                    <div className="space-y-6">
                       <h5 className="text-[12px] font-black text-[#b28a48] uppercase tracking-[0.5em] border-b border-[#b28a48]/20 pb-2">Sacred Attributes</h5>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {(Object.keys(m.stats) as Array<keyof Stats>).map(s => (
                          <div key={s} className="bg-black/60 border border-neutral-900 p-6 rounded-sm flex flex-col items-center group/stat hover:border-[#b28a48]/40 transition-all shadow-inner">
                            <div className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-4 group-hover/stat:text-[#b28a48] transition-colors">{s.slice(0, 3)}</div>
                            <div className="text-4xl font-black text-[#b28a48] drop-shadow-[0_2px_10px_rgba(178,138,72,0.2)]">{m.stats[s]}</div>
                            <div className="mt-3 w-10 h-10 rounded-full border border-amber-950/50 flex items-center justify-center text-xs font-black text-amber-700 bg-amber-950/10 shadow-xl">
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
                              <button onClick={(e) => handleReroll(e, m)} disabled={rerolling === m.id || !reservoirReady} className="text-[10px] font-black text-[#b28a48] uppercase tracking-widest flex items-center gap-2 disabled:opacity-20">
                                {rerolling === m.id ? '...' : (
                                  <>
                                    <span>Reroll 🎲</span>
                                    <span className="text-amber-600/60">[-2⚡]</span>
                                  </>
                                )}
                              </button>
                           </div>
                           <div className="space-y-6">
                              {m.abilities.map((a, i) => (
                                <div key={i} className="flex items-start gap-4">
                                  <button onClick={(e) => { e.stopPropagation(); toggleLock(m.id, i); }} className={`mt-1 text-xl ${a.locked ? 'text-amber-500' : 'text-neutral-800'}`}>
                                    {a.locked ? '†' : '○'}
                                  </button>
                                  <div>
                                    <div className={`text-base font-black uppercase tracking-wider mb-2 ${a.locked ? 'text-amber-600' : 'text-[#b28a48]'}`}>{a.name}</div>
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

export default Bestiary;
