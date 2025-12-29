
import React, { useState, useMemo } from 'react';
import { ClassDef, SyncMessage } from '../types';
import { generateClassMechanics, rerollTraits } from '../services/gemini';

interface ClassLibraryProps {
  classes: ClassDef[];
  setClasses: React.Dispatch<React.SetStateAction<ClassDef[]>>;
  broadcast?: (msg: Partial<SyncMessage>) => void;
  notify: (msg: string, type?: any) => void;
}

const ClassLibrary: React.FC<ClassLibraryProps> = ({ classes, setClasses, broadcast, notify }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [classes, search]);

  const handleCreate = async () => {
    if (!name || !description || loading) return;
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

  const toggleFeatureLock = (clsId: string, featIdx: number) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== clsId) return c;
      const newFeatures = [...c.features];
      newFeatures[featIdx] = { ...newFeatures[featIdx], locked: !newFeatures[featIdx].locked };
      return { ...c, features: newFeatures };
    }));
  };

  const handleReroll = async (cls: ClassDef) => {
    setRerolling(cls.id);
    try {
      const updated = await rerollTraits('class', cls.name, cls.description, cls.features);
      setClasses(prev => prev.map(c => 
        c.id === cls.id 
          ? { 
              ...c, 
              features: updated.map((f, i) => ({ 
                ...f, 
                locked: cls.features[i].locked 
              })) 
            } 
          : c
      ));
      notify("Features Rewoven", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setRerolling(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold fantasy-font text-[#b28a48]">Grimoire of Archetypes</h2>
        <p className="text-neutral-500 text-sm uppercase tracking-widest font-black mt-1">Design your own legends. AI translates lore into mechanics.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Creator Sidebar */}
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4">
            <h3 className="text-lg font-bold mb-4 fantasy-font text-neutral-300">Forge Archetype</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1 block">Class Identity</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Bloodweaver, Void Knight..." 
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-sm text-[#b28a48] focus:border-[#b28a48] outline-none" 
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1 block">Arcane Focus & Lore</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Describe playstyle, themes, and source of power..." 
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 h-32 text-sm text-neutral-400 focus:border-[#b28a48] outline-none font-serif italic" 
                />
              </div>
              <button 
                onClick={handleCreate} 
                disabled={loading || !name} 
                className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] hover:border-[#b28a48] transition-all shadow-xl"
              >
                {loading ? 'BINDING SOUL...' : 'FORGE ARCHETYPE'}
              </button>
            </div>
          </div>
        </div>

        {/* Library Grid */}
        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Search grimoire..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="flex-1 bg-black border border-neutral-900 px-4 py-2 text-[10px] uppercase tracking-widest text-[#b28a48] outline-none" 
            />
            <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">
              Count: {filteredClasses.length}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredClasses.map(c => (
              <div 
                key={c.id} 
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className={`grim-card group transition-all duration-500 cursor-pointer border-2 ${
                  expandedId === c.id 
                    ? 'border-[#b28a48]/60 shadow-[0_0_30px_rgba(178,138,72,0.1)]' 
                    : 'border-neutral-900 hover:border-neutral-800'
                }`}
              >
                {/* Card Header */}
                <div className="p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-2xl font-black text-[#b28a48] fantasy-font tracking-widest">{c.name}</h4>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setClasses(prev => prev.filter(x => x.id !== c.id)); }} 
                        className="text-neutral-800 hover:text-red-500 transition-colors p-1"
                      >
                        🗑️
                      </button>
                    </div>
                    <p className={`text-sm text-neutral-500 mt-2 italic font-serif leading-relaxed ${expandedId === c.id ? '' : 'line-clamp-2'}`}>
                      {c.description}
                    </p>
                  </div>

                  {/* Compact Stats View */}
                  <div className="flex gap-4 items-center self-start">
                    <div className="bg-black/80 border border-neutral-800 px-4 py-2 rounded-sm text-center min-w-[70px]">
                      <div className="text-[8px] uppercase text-neutral-600 font-black mb-1">Hit Die</div>
                      <div className="text-sm font-black text-[#b28a48]">{c.hitDie}</div>
                    </div>
                    <div className="bg-black/80 border border-neutral-800 px-4 py-2 rounded-sm text-center min-w-[70px]">
                      <div className="text-[8px] uppercase text-neutral-600 font-black mb-1">Start HP</div>
                      <div className="text-sm font-black text-[#b28a48]">{c.startingHp}</div>
                    </div>
                  </div>
                </div>

                {/* Expanded Mechanics View */}
                {expandedId === c.id && (
                  <div className="border-t border-neutral-900 bg-[#080808] p-6 md:p-10 space-y-10 animate-in slide-in-from-top duration-500">
                    {/* Spell Slots if available */}
                    {c.spellSlots && c.spellSlots.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] mb-4 border-b border-neutral-800 pb-1">Mana Capacity (Slots by Level)</h5>
                        <div className="flex gap-3">
                          {c.spellSlots.map((slot, i) => (
                            <div key={i} className="flex-1 bg-neutral-950 border border-neutral-800 p-2 text-center rounded-sm">
                              <div className="text-[8px] text-neutral-700 font-black mb-1">LVL {i + 1}</div>
                              <div className="text-xs font-black text-amber-700">{slot}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features Grid */}
                    <div className="space-y-6">
                      <div className="flex justify-between items-end border-b border-neutral-800 pb-2">
                        <h5 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]">Archetype Features</h5>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleReroll(c); }}
                          disabled={rerolling === c.id}
                          className="text-[9px] font-black text-[#b28a48] hover:text-[#cbb07a] uppercase tracking-widest flex items-center gap-2"
                        >
                          {rerolling === c.id ? 'Reweaving...' : 'Reroll Unlocked 🎲'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.features.map((f, i) => (
                          <div 
                            key={i} 
                            onClick={(e) => { e.stopPropagation(); toggleFeatureLock(c.id, i); }}
                            className={`p-4 border transition-all rounded-sm relative group/feat ${
                              f.locked ? 'bg-amber-950/5 border-amber-900/30' : 'bg-black border-neutral-900 hover:border-neutral-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`text-[10px] mt-0.5 ${f.locked ? 'text-amber-500' : 'text-neutral-700'}`}>
                                {f.locked ? '†' : '○'}
                              </span>
                              <div>
                                <h6 className={`text-[11px] font-black uppercase tracking-wider mb-1 ${f.locked ? 'text-amber-600' : 'text-neutral-300'}`}>
                                  {f.name}
                                </h6>
                                <p className="text-[11px] text-neutral-500 font-serif leading-relaxed italic">
                                  {f.description}
                                </p>
                              </div>
                            </div>
                            {f.locked && (
                              <div className="absolute top-2 right-2 text-[7px] font-black text-amber-800 uppercase tracking-tighter">BOUND</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-center pt-6 border-t border-neutral-900">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                        className="text-[9px] font-black text-neutral-700 hover:text-[#b28a48] uppercase tracking-[0.5em] transition-all"
                      >
                        Collapse Archetype Record
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer preview when collapsed */}
                {!expandedId && (
                  <div className="px-6 pb-6 pt-0 flex items-center justify-between">
                    <div className="flex gap-2">
                       {c.features.slice(0, 3).map((f, i) => (
                         <span key={i} className="text-[8px] px-2 py-0.5 border border-neutral-900 text-neutral-600 uppercase font-black rounded-full truncate max-w-[80px]">{f.name}</span>
                       ))}
                       {c.features.length > 3 && <span className="text-[8px] text-neutral-800 font-black self-center">+ {c.features.length - 3} MORE</span>}
                    </div>
                    <span className="text-[9px] font-black text-[#b28a48] uppercase tracking-widest animate-pulse">Expand Ledger †</span>
                  </div>
                )}
              </div>
            ))}
            {filteredClasses.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-neutral-900 rounded-sm">
                <div className="text-4xl mb-4 opacity-10">📜</div>
                <div className="text-[10px] uppercase tracking-[0.5em] text-neutral-700">The Grimoire is currently blank...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassLibrary;
