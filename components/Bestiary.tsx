
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
    notify("Manifesting Visuals for the Unseen...", "info");
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
      notify("Ether interference stopped visual manifestation.", "error");
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
    if (window.confirm(`Are you certain you want to banish "${monster.name}"?`)) {
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
      notify(`Shared Horror: ${monster.name}`, 'success');
    } else {
      notify("Portal link not active.", "error");
    }
  };

  const handleStatChange = (stat: keyof Stats, val: number) => {
    setManualStats(prev => ({ ...prev, [stat]: val }));
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-[#b28a48]/20 pb-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black fantasy-font text-[#b28a48] tracking-widest">Ancient Bestiary</h2>
          <p className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black mt-2">Codex of Horrors & Guardians</p>
        </div>
        
        <div className="flex gap-2">
           <button 
            onClick={handleRegenerateMissingImages}
            disabled={loading || (!reservoirReady && !currentUser.isAdmin)}
            className="bg-amber-950/20 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-3 active:scale-95"
           >
            <span className="text-sm">🖼️</span>
            Manifest Visuals
           </button>
           <button 
            onClick={() => manifestBasics && manifestBasics('monsters')}
            className="bg-amber-950/20 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-3 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
           >
            <span className="animate-pulse">✨</span>
            Manifest Archives
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 rounded-sm border-2 border-dashed border-[#b28a48]/20 sticky top-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black fantasy-font text-neutral-300 uppercase">Summon Horror</h3>
              {currentUser.isAdmin && (
                <button 
                  onClick={() => setManualMode(!manualMode)}
                  className={`text-[8px] px-2 py-1 border font-black uppercase transition-all ${manualMode ? 'bg-amber-500 text-black border-amber-500' : 'text-neutral-600 border-neutral-800 hover:text-white'}`}
                >
                  {manualMode ? 'Manual Mode ON' : 'AI Mode'}
                </button>
              )}
            </div>
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
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Monstrous Nature</label>
                  {currentUser.isAdmin && (
                    <button 
                      onClick={handleFetchAdvice}
                      disabled={loadingAdvice || !name || !description}
                      className="text-[8px] font-black text-amber-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all"
                    >
                      <span>{loadingAdvice ? 'Analyzing...' : '⚖️ Balance Insight'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="DESCRIBE ITS ANATOMY & LEGEND..."
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 h-40 text-xs text-neutral-400 focus:border-[#b28a48] outline-none font-serif italic leading-relaxed"
                />
              </div>

              {advice.length > 0 && (
                <div className="bg-red-950/10 border border-red-900/30 p-4 rounded-sm animate-in fade-in slide-in-from-top-2 text-left">
                  <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-2 border-b border-red-900/20 pb-1">Warden's Assessment</p>
                  <ul className="space-y-2">
                    {advice.map((point, i) => (
                      <li key={i} className="text-[10px] text-neutral-300 font-serif italic leading-relaxed flex gap-2">
                        <span className="text-red-600">•</span> {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {manualMode && currentUser.isAdmin && (
                <div className="p-4 bg-black/60 border border-amber-900/30 space-y-4 rounded-sm animate-in fade-in slide-in-from-top-2 text-left">
                  <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-2">Admin Override: Monster Stats</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[7px] text-neutral-500 font-black uppercase mb-1 block">HP</label>
                      <input type="number" value={manualHp} onChange={(e) => setManualHp(parseInt(e.target.value))} className="w-full bg-black border border-neutral-800 text-[10px] p-2 text-[#b28a48] outline-none" />
                    </div>
                    <div>
                      <label className="text-[7px] text-neutral-500 font-black uppercase mb-1 block">AC</label>
                      <input type="number" value={manualAc} onChange={(e) => setManualAc(parseInt(e.target.value))} className="w-full bg-black border border-neutral-800 text-[10px] p-2 text-[#b28a48] outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-amber-900/20 pb-4 mb-4">
                    {(Object.keys(manualStats) as Array<keyof Stats>).map(s => (
                      <div key={s}>
                        <label className="text-[6px] text-neutral-600 font-black uppercase block mb-1">{s.slice(0,3)}</label>
                        <input type="number" value={manualStats[s]} onChange={(e) => handleStatChange(s, parseInt(e.target.value))} className="w-full bg-black border border-neutral-800 text-[9px] p-1.5 text-neutral-400 outline-none" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[7px] text-neutral-500 font-black uppercase">Pending Abilities</label>
                      <button 
                        onClick={handleSuggestAbilities}
                        disabled={suggestingAbilities || !name || !description}
                        className="text-[7px] font-black text-amber-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all"
                      >
                        <span>{suggestingAbilities ? 'Channeling...' : '✨ Suggest Abilities'}</span>
                      </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                      {pendingAbilities.map((a, i) => (
                        <div key={i} className="bg-black/40 p-2 border border-neutral-900 rounded-sm group relative">
                          <p className="text-[8px] font-black text-[#b28a48] uppercase">{a.name}</p>
                          <p className="text-[7px] text-neutral-500 font-serif italic">{a.effect}</p>
                          <button onClick={() => setPendingAbilities(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-900 hover:text-red-500 text-[8px]">✕</button>
                        </div>
                      ))}
                      {pendingAbilities.length === 0 && <p className="text-[7px] italic text-neutral-700 text-center py-2">No abilities suggested</p>}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={loading || !name || (!manualMode && !reservoirReady && !currentUser.isAdmin)}
                className={`px-8 py-5 rounded-sm font-black w-full text-[11px] uppercase tracking-[0.4em] transition-all shadow-xl flex flex-col items-center gap-1 ${isBoss ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-[#b28a48] hover:bg-[#cbb07a] text-black'} disabled:opacity-20 active:scale-95`}
              >
                {loading ? 'BINDING FORM...' : (manualMode ? 'INSCRIBE MANUALLY' : (
                  <>
                    <span>{isBoss ? 'SUMMON BOSS' : 'INSCRIBE BESTIARY'}</span>
                    <span className="text-[8px] opacity-70 uppercase tracking-widest">{currentUser.isAdmin ? '[∞ ARCHITECT]' : '[-10⚡ ESSENCE]'}</span>
                  </>
                ))}
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
              className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest border transition-all ${bossOnly ? 'bg-red-950/20 border-red-500 text-red-500' : 'bg-black border-neutral-800 text-neutral-500'}`}
            >
              Legendary Only
            </button>
          </div>

          <div className="space-y-8">
            {filteredMonsters.length === 0 ? (
               <div className="py-24 px-8 text-center bg-black/40 border-2 border-dashed border-[#b28a48]/10 rounded-sm flex flex-col items-center justify-center min-h-[400px]">
                  <div className="text-6xl mb-6 opacity-30">📜</div>
                  <h3 className="text-xl font-black fantasy-font text-neutral-600 mb-4 uppercase tracking-[0.2em]">The Bestiary is Untouched</h3>
                  <p className="text-xs text-neutral-500 max-w-sm font-serif italic mb-8">
                    Existing chronicles require manifestation of system horrors or manual inscription of the monstrous.
                  </p>
                  <button 
                    onClick={() => manifestBasics && manifestBasics('monsters')}
                    className="bg-amber-950/20 border-2 border-[#b28a48] hover:bg-[#b28a48] text-[#b28a48] hover:text-black px-12 py-5 text-xs font-black uppercase tracking-[0.5em] transition-all shadow-[0_0_30px_rgba(178,138,72,0.1)] active:scale-95"
                  >
                    Manifest System Horrors
                  </button>
               </div>
            ) : filteredMonsters.map(m => (
              <div 
                key={m.id} 
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className={`grim-card rounded-sm overflow-hidden group transition-all duration-500 border-2 cursor-pointer ${expandedId === m.id ? (m.isBoss ? 'border-red-600/60 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-[#b28a48]/60 shadow-2xl') : (m.isBoss ? 'border-red-900/30 hover:border-red-700/50' : 'border-neutral-900 hover:border-neutral-800')}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className={`h-48 md:h-auto md:w-56 relative flex-shrink-0 transition-all duration-700 grayscale group-hover:grayscale-0 ${expandedId === m.id ? 'grayscale-0' : ''}`}>
                    {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-cover" alt={m.name} onError={(e) => (e.currentTarget.style.display = 'none')} /> : <div className="w-full h-full bg-black flex items-center justify-center text-4xl opacity-30">🐉</div>}
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <div className="flex items-center gap-3">
                          <h4 className={`text-3xl font-black fantasy-font tracking-widest ${m.isBoss ? 'text-red-500 drop-shadow-[0_2px_8px_rgba(220,38,38,0.4)]' : 'text-[#b28a48]'}`}>{m.name}</h4>
                          {m.isBoss && <span className="text-[8px] font-black text-white bg-red-600 px-2 py-0.5 rounded-sm tracking-widest animate-pulse">LEGENDARY</span>}
                          {m.id.startsWith('sys') && <span className="text-[7px] font-black text-neutral-400 bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded-sm tracking-widest uppercase opacity-60">By {m.authorName || 'Orestara'}</span>}
                        </div>
                        <p className={`text-neutral-400 mt-2 font-serif italic text-left leading-relaxed ${expandedId === m.id ? '' : 'line-clamp-2'}`}>{m.description}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={(e) => handleShareIndividual(e, m)}
                          className="text-neutral-700 hover:text-green-500 transition-colors p-2 text-xl"
                          title="Share Horror through Portal"
                        >
                          🌀
                        </button>
                        <button onClick={(e) => handleDelete(e, m)} className="text-neutral-800 hover:text-red-600 transition-all p-2 text-xl active:scale-90">🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div className={`p-8 border-t bg-black/40 animate-in slide-in-from-top-2 duration-500 ${m.isBoss ? 'border-red-900/20' : 'border-neutral-900'}`}>
                    <div className="flex justify-end mb-6">
                        <button 
                           onClick={(e) => handleRegenerateSingleImage(e, m)}
                           disabled={loading || (!reservoirReady && !currentUser.isAdmin)}
                           className="text-[8px] font-black text-neutral-500 hover:text-[#b28a48] uppercase tracking-widest flex items-center gap-2 transition-all"
                        >
                           <span>Regenerate Sigil 🖼️</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h5 className={`text-[10px] font-black uppercase tracking-widest border-b pb-2 text-left ${m.isBoss ? 'text-red-400 border-red-950' : 'text-neutral-500 border-neutral-800'}`}>Combat Statistics</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`bg-black/60 p-5 border rounded-sm text-center ${m.isBoss ? 'border-red-900/30' : 'border-neutral-900'}`}>
                            <div className="text-[8px] font-black text-neutral-600 uppercase mb-1">Vitality (HP)</div>
                            <div className={`text-3xl font-black ${m.isBoss ? 'text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.2)]' : 'text-amber-500'}`}>{m.hp}</div>
                          </div>
                          <div className={`bg-black/60 p-5 border rounded-sm text-center ${m.isBoss ? 'border-red-900/30' : 'border-neutral-900'}`}>
                            <div className="text-[8px] font-black text-neutral-600 uppercase mb-1">Protection (AC)</div>
                            <div className="text-3xl font-black text-neutral-200">{m.ac}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {(Object.keys(m.stats) as Array<keyof Stats>).map((s) => (
                            <div key={s} className="bg-black/40 p-3 border border-neutral-900 rounded-sm text-center group/stat">
                              <div className="text-[7px] font-black text-neutral-700 uppercase mb-1">{s.slice(0, 3)}</div>
                              <div className="text-lg font-black text-[#b28a48]">{m.stats[s]}</div>
                              <div className="text-[9px] font-bold text-neutral-500 bg-neutral-950/50 mt-1 py-0.5 rounded-sm">
                                {getModifier(m.stats[s] as number)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                            <h5 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest text-left">Lethal Abilities</h5>
                            <button 
                              onClick={(e) => handleReroll(e, m, 'standard')}
                              disabled={rerolling === m.id || (!reservoirReady && !currentUser.isAdmin)}
                              className="text-[8px] font-black text-amber-600 hover:text-amber-400 uppercase tracking-widest disabled:opacity-20 transition-colors"
                            >
                              {rerolling === m.id ? 'REFORMING...' : 'Reroll Mutations 🎲'}
                            </button>
                          </div>
                          <div className="space-y-3">
                            {m.abilities.map((a, i) => (
                              <div 
                                key={i} 
                                onClick={(e) => { e.stopPropagation(); toggleLock(m.id, i, 'standard'); }}
                                className={`p-5 border rounded-sm cursor-pointer transition-all text-left group/abil ${a.locked ? 'bg-amber-950/10 border-amber-900/40 shadow-inner' : 'bg-black/40 border-neutral-900 hover:border-neutral-700'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <span className={`text-xl ${a.locked ? 'text-amber-600' : 'text-neutral-800'}`}>{a.locked ? '†' : '○'}</span>
                                  <div>
                                    <h6 className={`text-sm font-black uppercase tracking-wider mb-1 ${a.locked ? 'text-amber-600' : 'text-[#b28a48]'}`}>{a.name}</h6>
                                    <p className="text-xs text-neutral-400 italic font-serif leading-relaxed opacity-80">{a.effect}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {m.isBoss && m.legendaryActions && m.legendaryActions.length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-red-950/30">
                            <div className="flex justify-between items-center border-b border-red-900/20 pb-2">
                              <h5 className="text-[10px] font-black text-red-500 uppercase tracking-widest text-left">Legendary Actions</h5>
                              <button 
                                onClick={(e) => handleReroll(e, m, 'legendary')}
                                disabled={rerollingLegendary === m.id || (!reservoirReady && !currentUser.isAdmin)}
                                className="text-[8px] font-black text-red-400 hover:text-red-200 uppercase tracking-widest disabled:opacity-20 transition-colors"
                              >
                                {rerollingLegendary === m.id ? 'REWEAVING...' : 'Reweave Legends 🎲'}
                              </button>
                            </div>
                            <div className="space-y-3">
                              {m.legendaryActions.map((a, i) => (
                                <div 
                                  key={i} 
                                  onClick={(e) => { e.stopPropagation(); toggleLock(m.id, i, 'legendary'); }}
                                  className={`p-5 border rounded-sm cursor-pointer transition-all text-left ${a.locked ? 'bg-red-950/20 border-red-900/40' : 'bg-black/60 border-red-950/10 hover:border-red-900/30'}`}
                                >
                                  <div className="flex items-center gap-4">
                                    <span className={`text-xl ${a.locked ? 'text-red-500' : 'text-neutral-800'}`}>{a.locked ? '†' : '○'}</span>
                                    <div>
                                      <h6 className={`text-sm font-black uppercase tracking-wider mb-1 ${a.locked ? 'text-red-400' : 'text-red-500/80'}`}>{a.name}</h6>
                                      <p className="text-xs text-neutral-300 italic font-serif leading-relaxed opacity-80">{a.effect}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
