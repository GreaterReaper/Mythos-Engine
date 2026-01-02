import React, { useState, useMemo } from 'react';
import { Monster, Stats, SyncMessage, UserAccount, MonsterAbility } from '../types';
import { generateMonsterStats, generateImage, rerollTraits, generateMonsterAbilities, getArchitectAdvice } from '../services/gemini';

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

interface BestiaryProps {
  monsters: Monster[];
  setMonsters: React.Dispatch<React.SetStateAction<Monster[]>>;
  broadcast?: (msg: Partial<SyncMessage>) => void;
  notify: (message: string, type?: any) => void;
  reservoirReady: boolean;
  manifestBasics?: (scope: 'monsters') => void;
  currentUser: UserAccount;
}

const Bestiary: React.FC<BestiaryProps> = ({ monsters, setMonsters, broadcast, notify, reservoirReady, manifestBasics, currentUser }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isBoss, setIsBoss] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [rerollingLegendary, setRerollingLegendary] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [bossOnly, setBossOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'hp' | 'ac'>('name');

  // Admin Manual Fields
  const [manualMode, setManualMode] = useState(false);
  const [manualHp, setManualHp] = useState(50);
  const [manualAc, setManualAc] = useState(15);
  const [manualStats, setManualStats] = useState<Stats>({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
  const [pendingAbilities, setPendingAbilities] = useState<MonsterAbility[]>([]);
  const [suggestingAbilities, setSuggestingAbilities] = useState(false);
  const [advice, setAdvice] = useState<string[]>([]);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

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

  const handleFetchAdvice = async () => {
    if (!name || !description || loadingAdvice) return;
    setLoadingAdvice(true);
    try {
      const guidance = await getArchitectAdvice('monster', name, description);
      setAdvice(guidance);
    } catch (e) {
      notify("Architect guidance failed to manifest.", "error");
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !description || loading) return;
    if (!manualMode && !reservoirReady && !currentUser.isAdmin) return;

    setLoading(true);
    try {
      let stats;
      let imageUrl = '';
      
      if (manualMode && currentUser.isAdmin) {
        stats = {
          hp: manualHp,
          ac: manualAc,
          stats: manualStats,
          abilities: pendingAbilities,
          legendaryActions: []
        };
      } else {
        stats = await generateMonsterStats(name, description, isBoss);
        imageUrl = await generateImage(`Full body illustration of a ${isBoss ? 'LEGENDARY BOSS' : 'fantasy'} monster: ${description}. cinematic lighting.`);
      }
      
      const newMonster: Monster = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        description,
        isBoss,
        stats: stats.stats || { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
        hp: stats.hp || 50,
        ac: stats.ac || 15,
        abilities: (stats.abilities || []).map((a: any) => ({ ...a, locked: false })),
        legendaryActions: isBoss ? (stats.legendaryActions || []).map((a: any) => ({ ...a, locked: false })) : [],
        imageUrl,
        authorId: currentUser.username,
        authorName: currentUser.displayName
      };
      
      setMonsters(prev => [...prev, newMonster]);
      setName('');
      setDescription('');
      setIsBoss(false);
      setAdvice([]);
      setPendingAbilities([]);
      setExpandedId(newMonster.id);
      notify(`${name} inscribed.`, "success");
    } catch (e: any) {
      console.error(e);
      notify(e.message || "Failed to summon monster.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestAbilities = async () => {
    if (!name || !description || suggestingAbilities) return;
    setSuggestingAbilities(true);
    try {
      const suggested = await generateMonsterAbilities(name, description);
      setPendingAbilities(prev => [...prev, ...suggested]);
      notify("Monstrous traits manifest.", "success");
    } catch (e) {
      notify("Void whispers failed.", "error");
    } finally {
      setSuggestingAbilities(false);
    }
  };

  const handleRegenerateMissingImages = async () => {
    if ((!reservoirReady && !currentUser.isAdmin) || loading) return;
    setLoading(true);
    notify("Manifesting Visuals...", "info");
    const list = [...monsters];
    let count = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        if (!list[i].imageUrl) {
          const img = await generateImage(`Full body illustration of a ${list[i].isBoss ? 'LEGENDARY' : ''} monster: ${list[i].description}`);
          list[i] = { ...list[i], imageUrl: img };
          setMonsters([...list]);
          count++;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      notify(`Visualized ${count} horrors.`, "success");
    } catch (e) {
      notify("Ether interference stopped manifestation.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSingleImage = async (e: React.MouseEvent, monster: Monster) => {
    e.stopPropagation();
    if ((!reservoirReady && !currentUser.isAdmin) || loading) return;
    setLoading(true);
    try {
      const img = await generateImage(`Full body illustration of a ${monster.isBoss ? 'LEGENDARY' : ''} monster: ${monster.description}`);
      setMonsters(prev => prev.map(m => m.id === monster.id ? { ...m, imageUrl: img } : m));
      notify(`Sigil for ${monster.name} manifest.`, "success");
    } catch (e) {
      notify("Failed to reweave sigil.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = (monsterId: string, abilityIdx: number, type: 'standard' | 'legendary' = 'standard') => {
    setMonsters(prev => prev.map(m => {
      if (m.id !== monsterId) return m;
      if (type === 'standard') {
        const newAbilities = [...m.abilities];
        newAbilities[abilityIdx] = { ...newAbilities[abilityIdx], locked: !newAbilities[abilityIdx].locked };
        return { ...m, abilities: newAbilities };
      } else {
        const newLegendary = [...(m.legendaryActions || [])];
        newLegendary[abilityIdx] = { ...newLegendary[abilityIdx], locked: !newLegendary[abilityIdx].locked };
        return { ...m, legendaryActions: newLegendary };
      }
    }));
  };

  const handleReroll = (e: React.MouseEvent, monster: Monster, type: 'standard' | 'legendary' = 'standard') => {
    e.stopPropagation();
    if (!reservoirReady && !currentUser.isAdmin) return;
    
    if (type === 'standard') setRerolling(monster.id);
    else setRerollingLegendary(monster.id);

    const sourceList = type === 'standard' ? monster.abilities : (monster.legendaryActions || []);
    const traitFormat = sourceList.map(a => ({ name: a.name, description: a.effect, locked: a.locked }));
    const contextType = type === 'standard' ? 'monster ability' : 'legendary boss action';
    
    rerollTraits(contextType, monster.name, monster.description, traitFormat)
      .then(updated => {
        setMonsters(prev => prev.map(m => {
          if (m.id !== monster.id) return m;
          let updateIdx = 0;
          if (type === 'standard') {
            const finalMergedAbilities = m.abilities.map(original => {
               if (original.locked) return original;
               const replacement = updated[updateIdx];
               updateIdx++;
               return replacement ? { name: replacement.name, effect: replacement.description, locked: false } : original;
            });
            return { ...m, abilities: finalMergedAbilities };
          } else {
            const finalMergedLegendary = (m.legendaryActions || []).map(original => {
               if (original.locked) return original;
               const replacement = updated[updateIdx];
               updateIdx++;
               return replacement ? { name: replacement.name, effect: replacement.description, locked: false } : original;
            });
            return { ...m, legendaryActions: finalMergedLegendary };
          }
        }));
        notify(`${type === 'standard' ? 'Abilities' : 'Legendary Actions'} rewoven.`, "success");
      })
      .catch(err => {
        notify(err.message || "The spirits refuse to change this creature.", "error");
      })
      .finally(() => {
        setRerolling(null);
        setRerollingLegendary(null);
      });
  };

  const handleDelete = (e: React.MouseEvent, monster: Monster) => {
    e.stopPropagation();
    if (window.confirm(`Banish "${monster.name}"?`)) {
      setMonsters(prev => prev.filter(x => x.id !== monster.id));
    }
  };

  const handleShareIndividual = (e: React.MouseEvent, monster: Monster) => {
    e.stopPropagation();
    if (broadcast) {
      broadcast({
        type: 'SHARE_RESOURCE',
        payload: {
          resourceType: 'monster',
          resourceData: monster
        }
      });
      notify(`Shared: ${monster.name}`, 'success');
    }
  };

  const handleStatChange = (stat: keyof Stats, val: number) => {
    setManualStats(prev => ({ ...prev, [stat]: val }));
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#b28a48]/20 pb-4 pt-4">
        <div>
          <h2 className="text-3xl font-black fantasy-font text-[#b28a48]">Ancient Bestiary</h2>
          <p className="text-[9px] text-neutral-500 uppercase tracking-[0.4em] font-black mt-1">Horrors & Guardians</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <button 
            onClick={() => manifestBasics && manifestBasics('monsters')}
            className="flex-1 md:flex-initial bg-amber-950/20 border border-amber-500/30 text-amber-500 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all active:scale-95"
           >
            ✨ Archives
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3">
          <div className="grim-card p-5 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4 shadow-xl">
            <h3 className="text-lg font-black fantasy-font text-neutral-300 uppercase mb-4">Summon Horror</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1 block">Entity Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="NAME..."
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-bold"
                />
              </div>

              <div 
                onClick={() => setIsBoss(!isBoss)}
                className={`flex items-center justify-between p-3 bg-black border rounded-sm cursor-pointer transition-all ${isBoss ? 'border-red-900/50' : 'border-neutral-800'}`}
              >
                <span className={`text-[9px] font-black uppercase tracking-widest ${isBoss ? 'text-red-500' : 'text-neutral-500'}`}>Legendary Threat</span>
                <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${isBoss ? 'bg-red-600' : 'bg-neutral-800'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isBoss ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1 block text-left">Nature & Legend</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ANATOMY & ORIGINS..."
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 h-32 text-xs text-neutral-400 focus:border-[#b28a48] outline-none font-serif italic"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={loading || !name || (!manualMode && !reservoirReady && !currentUser.isAdmin)}
                className={`py-4 rounded-sm font-black w-full text-[10px] uppercase tracking-[0.4em] transition-all flex flex-col items-center gap-1 ${isBoss ? 'bg-red-800 text-white' : 'bg-[#b28a48] text-black'} disabled:opacity-20 active:scale-95`}
              >
                {loading ? 'BINDING...' : (isBoss ? 'SUMMON BOSS' : 'INSCRIBE ENTRY')}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-4">
          <div className="bg-black/60 border border-[#b28a48]/20 p-3 rounded-sm flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              placeholder="Search Codex..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-black border border-neutral-900 px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] outline-none focus:border-[#b28a48] rounded-sm"
            />
          </div>

          <div className="space-y-4">
            {filteredMonsters.map(m => (
              <div 
                key={m.id} 
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className={`grim-card rounded-sm overflow-hidden transition-all duration-300 border-2 cursor-pointer ${expandedId === m.id ? (m.isBoss ? 'border-red-600' : 'border-[#b28a48]') : (m.isBoss ? 'border-red-950' : 'border-neutral-900')}`}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className={`h-32 sm:h-auto sm:w-40 relative flex-shrink-0 grayscale group-hover:grayscale-0 ${expandedId === m.id ? 'grayscale-0' : ''}`}>
                    {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-cover" alt={m.name} /> : <div className="w-full h-full bg-black flex items-center justify-center text-3xl opacity-20">🐉</div>}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col justify-between text-left">
                    <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className={`text-xl font-black fantasy-font tracking-widest truncate ${m.isBoss ? 'text-red-500' : 'text-[#b28a48]'}`}>{m.name}</h4>
                          <p className={`text-[10px] text-neutral-400 font-serif italic mt-1 ${expandedId === m.id ? '' : 'line-clamp-1'}`}>{m.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={(e) => handleShareIndividual(e, m)} className="p-1.5 text-xl opacity-40 hover:opacity-100">🌀</button>
                          <button onClick={(e) => handleDelete(e, m)} className="p-1.5 text-xl opacity-40 hover:text-red-600">🗑️</button>
                        </div>
                    </div>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div className={`p-5 border-t bg-black/40 space-y-6 ${m.isBoss ? 'border-red-900/20' : 'border-neutral-900'}`}>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/60 p-4 border border-neutral-900 rounded-sm text-center">
                          <div className="text-[7px] font-black text-neutral-600 uppercase mb-1">Vitality</div>
                          <div className={`text-2xl font-black ${m.isBoss ? 'text-red-500' : 'text-amber-500'}`}>{m.hp}</div>
                        </div>
                        <div className="bg-black/60 p-4 border border-neutral-900 rounded-sm text-center">
                          <div className="text-[7px] font-black text-neutral-600 uppercase mb-1">Protection</div>
                          <div className="text-2xl font-black text-neutral-200">{m.ac}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(m.stats) as Array<keyof Stats>).map((s) => (
                        <div key={s} className="bg-black/40 p-2 border border-neutral-800 rounded-sm text-center">
                            <div className="text-[6px] font-black text-neutral-600 uppercase">{s.slice(0, 3)}</div>
                            <div className="text-base font-black text-[#b28a48]">{m.stats[s]}</div>
                        </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="border-b border-neutral-800 pb-2 flex justify-between items-center">
                            <h5 className="text-[9px] font-black text-neutral-500 uppercase tracking-widest text-left">Abilities</h5>
                            <button 
                                onClick={(e) => handleReroll(e, m)}
                                disabled={rerolling === m.id || (!reservoirReady && !currentUser.isAdmin)}
                                className="text-[8px] font-black text-amber-600 uppercase tracking-widest disabled:opacity-20"
                            >
                                🎲 Reroll
                            </button>
                        </div>
                        <div className="space-y-2">
                            {m.abilities.map((a, i) => (
                                <div key={i} className="p-3 bg-black/40 border border-neutral-900 rounded-sm text-left">
                                    <h6 className="text-[10px] font-black uppercase text-[#b28a48]">{a.name}</h6>
                                    <p className="text-[9px] text-neutral-400 font-serif italic">{a.effect}</p>
                                </div>
                            ))}
                        </div>
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