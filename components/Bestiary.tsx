
import React, { useState, useMemo } from 'react';
import { Monster, Stats, SyncMessage } from '../types';
import { generateMonsterStats, generateImage, rerollTraits } from '../services/gemini';

const getModifier = (val: number) => {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

const Bestiary: React.FC<BestiaryProps> = ({ monsters, setMonsters, broadcast, notify, reservoirReady }) => {
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
                className={`px-8 py-5 rounded-sm font-black w-full text-[11px] uppercase tracking-[0.4em] transition-all shadow-xl flex flex-col items-center gap-1 ${isBoss ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-[#b28a48] hover:bg-[#cbb07a] text-black'} disabled:opacity-20 active:scale-95`}
              >
                {loading ? 'BINDING FORM...' : (
                  <>
                    <span>{isBoss ? 'SUMMON BOSS' : 'INSCRIBE BESTIARY'}</span>
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
          </div>

          <div className="space-y-8">
            {filteredMonsters.map(m => (
              <div 
                key={m.id} 
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className={`grim-card rounded-sm overflow-hidden group transition-all duration-500 border-2 cursor-pointer ${expandedId === m.id ? (m.isBoss ? 'border-red-600/60 shadow-2xl' : 'border-[#b28a48]/60 shadow-2xl') : (m.isBoss ? 'border-red-900/30 hover:border-red-700/50' : 'border-neutral-900 hover:border-neutral-800')}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className={`h-48 md:h-auto md:w-56 relative flex-shrink-0 transition-all duration-700 grayscale group-hover:grayscale-0 ${expandedId === m.id ? 'grayscale-0' : ''}`}>
                    {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black flex items-center justify-center text-6xl">🐉</div>}
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className={`text-3xl font-black fantasy-font tracking-widest ${m.isBoss ? 'text-red-500' : 'text-[#b28a48]'}`}>{m.name}</h4>
                        </div>
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
  broadcast?: (msg: Partial<SyncMessage>) => void;
  notify: (message: string, type?: any) => void;
  reservoirReady: boolean;
}

export default Bestiary;
