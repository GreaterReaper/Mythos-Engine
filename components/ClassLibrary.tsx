
import React, { useState, useMemo } from 'react';
import { ClassDef, SyncMessage } from '../types';
import { generateClassMechanics, rerollTraits } from '../services/gemini';

interface ClassLibraryProps {
  classes: ClassDef[];
  setClasses: React.Dispatch<React.SetStateAction<ClassDef[]>>;
  broadcast?: (msg: Partial<SyncMessage>) => void;
  notify: (msg: string, type?: any) => void;
  reservoirReady: boolean;
}

const ClassLibrary: React.FC<ClassLibraryProps> = ({ classes, setClasses, broadcast, notify, reservoirReady }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [identifyingId, setIdentifyingId] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [classes, search]);

  const legacyRecords = useMemo(() => {
    return classes.filter(c => !c.preferredStats || c.preferredStats.length === 0);
  }, [classes]);

  const handleCreate = async () => {
    if (!name || !description || loading || !reservoirReady) return;
    setLoading(true);
    try {
      const mechanics = await generateClassMechanics(name, description);
      const newClass: ClassDef = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        description,
        hitDie: mechanics.hitDie || 'd8',
        startingHp: mechanics.startingHp || 8,
        hpPerLevel: mechanics.hpPerLevel || 5,
        spellSlots: mechanics.spellSlots || [],
        preferredStats: mechanics.preferredStats || [],
        bonuses: mechanics.bonuses || [],
        features: (mechanics.features || []).map(f => ({ ...f, locked: false })),
      };
      setClasses(prev => [...prev, newClass]);
      setName('');
      setDescription('');
      setExpandedId(newClass.id);
      notify(`Archetype "${name}" Bound`, "success");
    } catch (e: any) {
      console.error(e);
      notify(e.message || "The Forge failed to respond.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleIdentifyDepths = async (cls: ClassDef) => {
    if (!reservoirReady || identifyingId) return;
    setIdentifyingId(cls.id);
    try {
      const mechanics = await generateClassMechanics(cls.name, cls.description);
      setClasses(prev => prev.map(c => c.id === cls.id ? {
        ...c,
        preferredStats: mechanics.preferredStats || [],
        bonuses: mechanics.bonuses || [],
        spellSlots: (mechanics.spellSlots && mechanics.spellSlots.length > 0) ? mechanics.spellSlots : c.spellSlots,
        hitDie: mechanics.hitDie || c.hitDie,
        startingHp: mechanics.startingHp || c.startingHp,
        hpPerLevel: mechanics.hpPerLevel || c.hpPerLevel
      } : c));
      notify(`Depths of "${cls.name}" Manifested`, "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setIdentifyingId(null);
    }
  };

  const handleBulkManifest = async () => {
    if (!reservoirReady || loading || legacyRecords.length === 0) return;
    
    setLoading(true);
    notify(`Rebuilding ${legacyRecords.length} Archetypes...`, "info");

    for (const cls of legacyRecords) {
      try {
        const mechanics = await generateClassMechanics(cls.name, cls.description);
        setClasses(prev => prev.map(c => c.id === cls.id ? {
          ...c,
          preferredStats: mechanics.preferredStats || [],
          bonuses: mechanics.bonuses || [],
          spellSlots: (mechanics.spellSlots && mechanics.spellSlots.length > 0) ? mechanics.spellSlots : c.spellSlots,
          hitDie: mechanics.hitDie || c.hitDie,
          startingHp: mechanics.startingHp || c.startingHp,
          hpPerLevel: mechanics.hpPerLevel || c.hpPerLevel
        } : c));
        // Small delay to prevent aggressive rate limiting
        await new Promise(r => setTimeout(r, 800));
      } catch (e) {
        console.error(`Failed to manifest ${cls.name}`, e);
      }
    }
    setLoading(false);
    notify("Grimoire Synchronization Complete", "success");
  };

  const toggleFeatureLock = (clsId: string, featIdx: number) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== clsId) return c;
      const newFeatures = [...c.features];
      newFeatures[featIdx] = { ...newFeatures[featIdx], locked: !newFeatures[featIdx].locked };
      return { ...c, features: newFeatures };
    }));
  };

  const handleMove = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = classes.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === classes.length - 1) return;

    const newClasses = [...classes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newClasses[index], newClasses[targetIndex]] = [newClasses[targetIndex], newClasses[index]];
    setClasses(newClasses);
  };

  const handleReroll = async (cls: ClassDef) => {
    if (!reservoirReady) return;
    setRerolling(cls.id);
    try {
      const updated = await rerollTraits('class', cls.name, cls.description, cls.features);
      setClasses(prev => prev.map(c => {
        if (c.id !== cls.id) return c;
        
        let updateIdx = 0;
        const finalMergedFeatures = c.features.map(original => {
          if (original.locked) return original;
          const replacement = updated[updateIdx];
          updateIdx++;
          return replacement ? { ...replacement, locked: false } : original;
        });

        return { ...c, features: finalMergedFeatures };
      }));
      notify("Features Rewoven", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setRerolling(null);
    }
  };

  const handleShareIndividual = (e: React.MouseEvent, cls: ClassDef) => {
    e.stopPropagation();
    if (broadcast) {
      broadcast({
        type: 'SHARE_RESOURCE',
        payload: {
          resourceType: 'class',
          resourceData: cls
        }
      });
      notify(`Shared Archetype: ${cls.name}`, 'success');
    } else {
      notify("Portal not active.", "error");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center lg:text-left flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black fantasy-font text-[#b28a48]">Grimoire of Archetypes</h2>
          <p className="text-neutral-500 text-xs uppercase tracking-widest font-black mt-2">Design your legends. AI translates lore into mechanics.</p>
        </div>
        
        {legacyRecords.length > 0 && (
          <button 
            onClick={handleBulkManifest}
            disabled={loading || !reservoirReady}
            className="bg-amber-950/20 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
          >
            <span className="animate-pulse">✨</span>
            Synchronize Grimoire ({legacyRecords.length} Legacy)
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4">
            <h3 className="text-xl font-bold mb-6 fantasy-font text-neutral-300">Forge Archetype</h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-2 block text-left">Class Identity</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Bloodweaver, Void Knight..." 
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-4 text-sm text-[#b28a48] focus:border-[#b28a48] outline-none tracking-widest uppercase font-bold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-2 block text-left">Arcane Focus & Lore</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Describe playstyle, themes, and source of power..." 
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-4 h-40 text-sm text-neutral-400 focus:border-[#b28a48] outline-none font-serif italic leading-relaxed" 
                />
              </div>
              <button 
                onClick={handleCreate} 
                disabled={loading || !name || !reservoirReady} 
                className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-5 text-[11px] font-black uppercase tracking-[0.5em] text-[#b28a48] hover:border-[#b28a48] transition-all shadow-xl active:scale-[0.98] disabled:opacity-20 flex flex-col items-center gap-1"
              >
                {loading ? 'BINDING SOUL...' : !reservoirReady ? 'ENERGY LOW...' : (
                  <>
                    <span>FORGE ARCHETYPE</span>
                    <span className="text-[8px] text-amber-600/80 tracking-widest">[-10⚡ ESSENCE]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Search grimoire..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="flex-1 bg-black border border-neutral-900 px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] outline-none focus:border-[#b28a48]" 
            />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {filteredClasses.map((c, idx) => {
              const originalIndex = classes.findIndex(oc => oc.id === c.id);
              const isLegacy = !c.preferredStats || c.preferredStats.length === 0;

              return (
                <div 
                  key={c.id} 
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className={`grim-card group transition-all duration-500 cursor-pointer border-2 ${
                    expandedId === c.id 
                      ? 'border-[#b28a48]/60 shadow-[0_0_50px_rgba(0,0,0,0.5)]' 
                      : 'border-neutral-900 hover:border-neutral-800'
                  }`}
                >
                  <div className="p-8 flex flex-col md:flex-row justify-between gap-8">
                    <div className="flex-1 text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          {!search && (
                            <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => handleMove(e, c.id, 'up')}
                                disabled={originalIndex === 0}
                                className="text-[#b28a48] hover:text-white disabled:opacity-10 transition-colors px-1"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button 
                                onClick={(e) => handleMove(e, c.id, 'down')}
                                disabled={originalIndex === classes.length - 1}
                                className="text-[#b28a48] hover:text-white disabled:opacity-10 transition-colors px-1"
                                title="Move Down"
                              >
                                ▼
                              </button>
                            </div>
                          )}
                          <div>
                            <h4 className="text-3xl font-black text-[#b28a48] fantasy-font tracking-widest uppercase">{c.name}</h4>
                            {isLegacy && (
                              <span className="text-[7px] font-black text-amber-700 uppercase tracking-widest bg-amber-950/20 px-2 py-0.5 rounded-sm border border-amber-900/30">
                                Legacy Record
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => handleShareIndividual(e, c)}
                            className="text-neutral-700 hover:text-green-500 transition-colors p-2 text-xl"
                            title="Share Archetype through Portal"
                          >
                            🌀
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setClasses(prev => prev.filter(x => x.id !== c.id)); }} 
                            className="text-neutral-800 hover:text-red-500 transition-colors p-2 text-xl"
                            title="Banish Archetype"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className={`text-base text-neutral-400 mt-4 italic font-serif leading-relaxed ${expandedId === c.id ? '' : 'line-clamp-2'}`}>
                        {c.description}
                      </p>
                    </div>

                    <div className="flex gap-4 items-center self-start">
                      <div className="bg-black/80 border border-neutral-800 px-6 py-4 rounded-sm text-center min-w-[90px]">
                        <div className="text-[10px] uppercase text-neutral-600 font-black mb-1 text-center">Hit Die</div>
                        <div className="text-lg font-black text-[#b28a48] text-center">{c.hitDie}</div>
                      </div>
                    </div>
                  </div>

                  {expandedId === c.id && (
                    <div className="border-t border-neutral-900 bg-[#080808] p-8 md:p-12 space-y-12 animate-in slide-in-from-top duration-500">
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                          <div>
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
                              <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em] text-left">Core Attributes</h5>
                              {isLegacy && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleIdentifyDepths(c); }}
                                  disabled={identifyingId === c.id || !reservoirReady}
                                  className="text-[8px] font-black text-amber-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-all bg-amber-950/40 px-2 py-1 border border-amber-900/40 rounded-sm"
                                >
                                  {identifyingId === c.id ? 'ANALYZING...' : 'Manifest Latent Power ⚡'}
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black/40 p-4 border border-neutral-900 rounded-sm text-left">
                                <p className="text-[8px] font-black text-neutral-600 uppercase mb-2">Primary Stats</p>
                                <div className="flex flex-wrap gap-2">
                                  {c.preferredStats && c.preferredStats.length > 0 ? (
                                    c.preferredStats.map((s, idx) => (
                                      <span key={idx} className="bg-amber-950/20 text-[#b28a48] text-[10px] font-black px-2 py-1 rounded-sm border border-amber-900/30 uppercase tracking-tighter">
                                        {s}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-neutral-700 text-[10px] italic">Undetermined</span>
                                  )}
                                </div>
                              </div>
                              <div className="bg-black/40 p-4 border border-neutral-900 rounded-sm text-left">
                                <p className="text-[8px] font-black text-neutral-600 uppercase mb-2">Health Growth</p>
                                <p className="text-xs font-black text-neutral-300">+{c.hpPerLevel} / LEVEL</p>
                                <p className="text-[9px] text-neutral-500 italic mt-1 font-serif">Starting: {c.startingHp} + CON</p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em] border-b border-neutral-800 pb-2 mb-4 text-left">Class Proficiencies</h5>
                            <div className="bg-black/40 p-5 border border-neutral-900 rounded-sm text-left">
                              <ul className="grid grid-cols-1 gap-2">
                                {c.bonuses && c.bonuses.length > 0 ? (
                                  c.bonuses.map((b, idx) => (
                                    <li key={idx} className="flex items-center gap-3">
                                      <span className="w-1.5 h-1.5 bg-[#b28a48] rounded-full"></span>
                                      <span className="text-xs text-neutral-400 font-serif italic">{b}</span>
                                    </li>
                                  ))
                                ) : (
                                  <li className="text-neutral-700 text-[10px] italic">No specific bonuses recorded</li>
                                )}
                              </ul>
                            </div>
                          </div>

                          {c.spellSlots && c.spellSlots.some(s => s > 0) && (
                            <div>
                              <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em] border-b border-neutral-800 pb-2 mb-4 text-left">Spell Reservoirs</h5>
                              <div className="flex gap-2">
                                {c.spellSlots.map((slots, idx) => (
                                  <div key={idx} className="flex-1 bg-black/40 border border-neutral-900 p-3 rounded-sm text-center">
                                    <p className="text-[8px] font-black text-neutral-600 uppercase mb-1">LVL {idx + 1}</p>
                                    <p className={`text-sm font-black ${slots > 0 ? 'text-amber-500' : 'text-neutral-800'}`}>
                                      {slots}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-8">
                          <div className="flex justify-between items-end border-b border-neutral-800 pb-2 mb-4">
                            <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em]">Archetype Features</h5>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleReroll(c); }}
                              disabled={rerolling === c.id || !reservoirReady}
                              className="text-[10px] font-black text-[#b28a48] hover:text-[#cbb07a] uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 disabled:opacity-20"
                            >
                              {rerolling === c.id ? 'REWEAVING...' : <span>Reroll Unlocked 🎲</span>}
                            </button>
                          </div>

                          <div className="space-y-4">
                            {c.features.map((f, i) => (
                              <div 
                                key={i} 
                                onClick={(e) => { e.stopPropagation(); toggleFeatureLock(c.id, i); }}
                                className={`p-6 border transition-all rounded-sm relative group/feat flex flex-col justify-center min-h-[100px] text-left ${
                                  f.locked ? 'bg-amber-950/5 border-amber-900/40 shadow-inner' : 'bg-black border-neutral-900 hover:border-neutral-700'
                                }`}
                              >
                                <div className="flex items-start gap-4">
                                  <span className={`text-xl mt-0.5 ${f.locked ? 'text-amber-500' : 'text-neutral-800'}`}>
                                    {f.locked ? '†' : '○'}
                                  </span>
                                  <div>
                                    <h6 className={`text-base font-black uppercase tracking-wider mb-2 ${f.locked ? 'text-amber-600' : 'text-[#b28a48]'}`}>
                                      {f.name}
                                    </h6>
                                    <p className="text-sm text-neutral-400 font-serif leading-relaxed italic">
                                      {f.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassLibrary;
