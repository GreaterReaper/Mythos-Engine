
import React, { useState, useMemo } from 'react';
import { Monster, Stats } from '../types';
import { generateMonsterStats, generateImage, rerollTraits } from '../services/gemini';

interface BestiaryProps {
  monsters: Monster[];
  setMonsters: React.Dispatch<React.SetStateAction<Monster[]>>;
  // Fix: Added notify prop to interface
  notify: (message: string, type?: any) => void;
}

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

const Bestiary: React.FC<BestiaryProps> = ({ monsters, setMonsters, notify }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isBoss, setIsBoss] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Search & Filter State
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
    if (!name || !description || loading) return;
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
      // Fix: Added notify call for error reporting
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
        // Fix: Added notify call for error reporting
        notify(err.message || "The spirits refuse to change this creature.", "error");
      })
      .finally(() => setRerolling(null));
  };

  const handleDelete = (e: React.MouseEvent, monster: Monster) => {
    e.stopPropagation();
    if (window.confirm(`Are you certain you want to banish "${monster.name}"? Its stats and lore will be lost to the void.`)) {
      setMonsters(prev => prev.filter(x => x.id !== monster.id));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold fantasy-font text-[#b28a48]">Ancient Bestiary</h2>
        <p className="text-sm text-neutral-500 uppercase tracking-widest font-black">Codex of Horrors & Guardians</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-4 md:p-6 rounded-sm border border-neutral-800 sticky top-4">
            <h3 className="text-lg font-bold mb-4 fantasy-font text-neutral-300">Summon Horror</h3>
            <div className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NAME OF THE BEAST..."
                className="w-full bg-black/50 border border-neutral-800 rounded-sm px-4 py-2 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none"
              />
              <button 
                onClick={() => setIsBoss(!isBoss)}
                className={`w-full px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${isBoss ? 'bg-red-900/40 border-red-500 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-neutral-900 border-neutral-800 text-neutral-600'}`}
              >
                {isBoss ? '🔥 LEGENDARY THREAT' : 'STANDARD CREATURE'}
              </button>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="DESCRIBE ITS NATURE, APPEARANCE, AND DREAD ABILITIES..."
                className="w-full bg-black/50 border border-neutral-800 rounded-sm px-4 py-2 h-32 text-xs text-neutral-400 focus:border-[#b28a48] outline-none font-serif italic"
              />
              <button
                onClick={handleCreate}
                disabled={loading || !name}
                className={`px-8 py-4 rounded-sm font-black w-full text-[10px] uppercase tracking-[0.3em] transition-all ${isBoss ? 'bg-red-800 hover:bg-red-700 text-white shadow-xl' : 'bg-[#b28a48] hover:bg-[#cbb07a] text-black shadow-lg'} disabled:opacity-20`}
              >
                {loading ? 'WEAVING FORM...' : 'ENSCRIBE BESTIARY'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="text" 
                placeholder="Search Codex..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none"
              />
            </div>
            <button 
              onClick={() => setBossOnly(!bossOnly)}
              className={`px-3 py-2 text-[10px] uppercase tracking-widest border rounded-sm transition-all ${bossOnly ? 'border-red-500 text-red-500 bg-red-900/10 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-neutral-800 text-neutral-500'}`}
            >
              Legendary Only
            </button>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-900/50 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-400 outline-none"
            >
              <option value="name">Order: Alpha</option>
              <option value="hp">Order: Vitality</option>
              <option value="ac">Order: Resilience</option>
            </select>
          </div>

          <div className="space-y-6">
            {filteredMonsters.map(m => (
              <div 
                key={m.id} 
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className={`grim-card rounded-sm overflow-hidden group transition-all duration-500 border-2 cursor-pointer ${expandedId === m.id ? (m.isBoss ? 'border-red-600/60 shadow-[0_0_30px_rgba(153,27,27,0.2)]' : 'border-[#b28a48]/60 shadow-[0_0_30px_rgba(178,138,72,0.1)]') : (m.isBoss ? 'border-red-900/30' : 'border-neutral-900')}`}
              >
                {/* Compact Header View */}
                <div className="flex flex-col md:flex-row">
                  <div className={`h-40 md:h-auto md:w-48 relative flex-shrink-0 transition-all duration-700 ${expandedId === m.id ? 'grayscale-0' : 'grayscale'}`}>
                    {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black flex items-center justify-center text-4xl">🐉</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    {m.isBoss && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg animate-pulse">LEGENDARY</div>
                    )}
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`text-2xl font-black fantasy-font transition-colors ${m.isBoss ? 'text-red-500' : 'text-[#b28a48]'}`}>{m.name}</h4>
                        <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-black mt-1">
                          {m.isBoss ? 'Legendary Threat' : 'Wandering Horror'} • {m.stats.constitution > 14 ? 'Large' : 'Medium'} Monstrosity
                        </p>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="text-right">
                          <div className="text-[9px] text-neutral-500 font-black uppercase tracking-tighter">AC</div>
                          <div className="text-lg font-black text-neutral-200">{m.ac}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-neutral-500 font-black uppercase tracking-tighter">HP</div>
                          <div className={`text-lg font-black ${m.isBoss ? 'text-red-500' : 'text-neutral-200'}`}>{m.hp}</div>
                        </div>
                        <button onClick={(e) => handleDelete(e, m)} className="ml-4 text-neutral-800 hover:text-red-600 transition-colors p-2">🗑️</button>
                      </div>
                    </div>

                    {!expandedId && (
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex gap-2">
                           {m.abilities.slice(0, 3).map((a, i) => (
                             <span key={i} className="text-[8px] px-2 py-0.5 border border-neutral-800 text-neutral-500 uppercase font-black rounded-full">{a.name}</span>
                           ))}
                           {m.abilities.length > 3 && <span className="text-[8px] text-neutral-700 font-black">+ {m.abilities.length - 3} MORE</span>}
                         </div>
                         <span className="text-[9px] font-black text-[#b28a48] uppercase tracking-widest animate-pulse">Expand Stat Block †</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Stat Block */}
                {expandedId === m.id && (
                  <div className="border-t-2 border-neutral-900 bg-[#080808] p-6 md:p-10 space-y-8 animate-in slide-in-from-top duration-500">
                    {/* TTRPG Attribute Grid */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 border-y-2 border-[#b28a48]/20 py-4">
                      {(Object.keys(m.stats) as Array<keyof Stats>).map(s => (
                        <div key={s} className="text-center group/stat">
                          <div className="text-[10px] font-black text-[#b28a48] uppercase tracking-widest mb-1">{s.slice(0, 3)}</div>
                          <div className="text-xl font-black text-neutral-200">{m.stats[s]}</div>
                          <div className="text-[10px] font-black text-neutral-500">({getModifier(m.stats[s])})</div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Left: Lore & Traits */}
                      <div className="space-y-6">
                        <div>
                          <h5 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] mb-2 border-b border-neutral-800 pb-1">Creature Narrative</h5>
                          <p className="text-xs text-neutral-400 font-serif leading-relaxed italic">{m.description || "A creature of unknown origin, shrouded in myth and terror."}</p>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <h5 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]">Passive Traits</h5>
                           </div>
                           <div className="space-y-3">
                              {m.abilities.filter(a => a.effect.toLowerCase().includes('passive') || a.effect.toLowerCase().includes('resist')).map((a, i) => (
                                <div key={i} className="border-l-2 border-[#b28a48]/30 pl-3">
                                  <div className="text-[10px] font-black text-neutral-300 uppercase">{a.name}</div>
                                  <div className="text-[10px] text-neutral-500 mt-1">{a.effect}</div>
                                </div>
                              ))}
                              {m.abilities.filter(a => a.effect.toLowerCase().includes('passive') || a.effect.toLowerCase().includes('resist')).length === 0 && (
                                <div className="text-[10px] text-neutral-800 italic uppercase">No passive modifiers present.</div>
                              )}
                           </div>
                        </div>
                      </div>

                      {/* Right: Actions & Legendary */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                           <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                              <h5 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]">Actions & Attacks</h5>
                              <button 
                                onClick={(e) => handleReroll(e, m)} 
                                disabled={rerolling === m.id} 
                                className="text-[8px] font-black text-neutral-700 hover:text-[#b28a48] uppercase tracking-widest transition-colors"
                              >
                                {rerolling === m.id ? 'Reweaving...' : 'Reroll 🎲'}
                              </button>
                           </div>
                           <div className="space-y-4">
                              {m.abilities.filter(a => !a.effect.toLowerCase().includes('passive') && !a.effect.toLowerCase().includes('resist')).map((a, i) => (
                                <div key={i} className="group/ability relative">
                                  <div className="flex items-start gap-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleLock(m.id, m.abilities.indexOf(a)); }} 
                                      className={`mt-0.5 text-[10px] transition-all ${a.locked ? 'text-amber-500' : 'text-neutral-800 hover:text-neutral-600'}`}
                                    >
                                      {a.locked ? '†' : '○'}
                                    </button>
                                    <div>
                                      <span className="text-[11px] font-black text-[#b28a48] uppercase tracking-tighter mr-2">{a.name}.</span>
                                      <span className="text-[11px] text-neutral-400 font-serif leading-snug">{a.effect}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>

                        {m.isBoss && (
                          <div className="p-4 border border-red-900/50 bg-red-900/5 rounded-sm">
                            <h5 className="text-[9px] font-black text-red-500 uppercase tracking-[0.3em] mb-2">Legendary Presence</h5>
                            <p className="text-[10px] text-red-200/60 italic font-serif leading-relaxed">
                              This creature possesses 3 Legendary Resistances per sunrise. It may take up to 3 Legendary Actions at the end of another soul's turn.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-center pt-4 border-t border-neutral-900">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                        className="text-[9px] font-black text-neutral-700 hover:text-[#b28a48] uppercase tracking-[0.5em] transition-all"
                      >
                        Collapse Stat Block
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredMonsters.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-neutral-900 rounded-sm">
                <div className="text-4xl mb-4 opacity-10">🐉</div>
                <div className="text-[10px] uppercase tracking-[0.5em] text-neutral-700">The Bestiary is silent...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bestiary;
