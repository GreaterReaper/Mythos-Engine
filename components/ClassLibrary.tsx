
import React, { useState, useMemo } from 'react';
import { ClassDef, ClassFeature, SyncMessage } from '../types';
import { generateClassMechanics, rerollTraits } from '../services/gemini';

interface ClassLibraryProps {
  classes: ClassDef[];
  setClasses: React.Dispatch<React.SetStateAction<ClassDef[]>>;
  broadcast?: (msg: Partial<SyncMessage>) => void;
}

const ClassLibrary: React.FC<ClassLibraryProps> = ({ classes, setClasses, broadcast }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);

  // Filter & Sort State
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'hp'>('name');

  const filteredClasses = useMemo(() => {
    return classes
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'hp') return b.startingHp - a.startingHp;
        return 0;
      });
  }, [classes, search, sortBy]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (cls: ClassDef) => {
    if (broadcast) {
      broadcast({ type: 'SHARE_RESOURCE', payload: { type: 'class', data: cls } });
    }
  };

  const toggleLock = (classId: string, featIdx: number) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== classId) return c;
      const newFeatures = [...c.features];
      newFeatures[featIdx] = { ...newFeatures[featIdx], locked: !newFeatures[featIdx].locked };
      return { ...c, features: newFeatures };
    }));
  };

  const handleReroll = async (cls: ClassDef) => {
    setRerolling(cls.id);
    try {
      const updated = await rerollTraits('class', cls.name, cls.description, cls.features);
      setClasses(prev => prev.map(c => {
        if (c.id !== cls.id) return c;
        return {
          ...c,
          features: updated.map((f, i) => ({ ...f, locked: cls.features[i].locked }))
        };
      }));
    } finally {
      setRerolling(null);
    }
  };

  const handleDelete = (cls: ClassDef) => {
    if (window.confirm(`Are you certain you wish to purge the archetype of the "${cls.name}"? All custom features and growth patterns will be lost.`)) {
      setClasses(prev => prev.filter(cl => cl.id !== cls.id));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold fantasy-font text-[#b28a48]">Class Library</h2>
        <p className="text-neutral-500 text-sm uppercase tracking-widest">Forge archetypes. Lock features you like and reroll the rest.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4">
            <h3 className="text-lg font-bold mb-4 fantasy-font text-neutral-300">Forge Archetype</h3>
            <div className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NAME..."
                className="w-full bg-black/50 border border-neutral-800 rounded-sm px-4 py-2 text-sm text-[#b28a48] focus:border-[#b28a48] outline-none"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe playstyle, themes, and special abilities..."
                className="w-full bg-black/50 border border-neutral-800 rounded-sm px-4 py-2 h-32 text-sm text-neutral-400 focus:border-[#b28a48] outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={loading || !name}
                className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] hover:border-[#b28a48] transition-all disabled:opacity-50"
              >
                {loading ? <span className="animate-pulse">FORGING...</span> : 'FORGE CLASS'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="text" 
                placeholder="Search Class..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none"
              />
            </div>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-900/50 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-400 outline-none"
            >
              <option value="name">Sort: Name</option>
              <option value="hp">Sort: Base HP</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredClasses.map(c => (
              <div key={c.id} className="grim-card border border-neutral-800 rounded-sm p-6 relative group hover:border-[#b28a48]/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-[#b28a48] fantasy-font">{c.name}</h4>
                    <p className="text-[10px] text-neutral-600 uppercase tracking-widest">Ancient Archetype</p>
                  </div>
                  <div className="flex gap-2">
                    {broadcast && (
                      <button 
                        onClick={() => handleShare(c)}
                        className="text-[8px] bg-[#b28a48]/10 hover:bg-[#b28a48] text-[#b28a48] hover:text-black px-2 py-1 rounded-sm border border-[#b28a48]/30 transition-all font-black uppercase tracking-widest shadow-lg"
                      >
                        Share
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(c)}
                      className="text-neutral-700 hover:text-red-500 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-neutral-400 mb-4 line-clamp-3 italic font-serif">{c.description}</p>
                
                <div className="grid grid-cols-3 gap-2 mb-4 bg-black/40 p-2 rounded-sm border border-neutral-900">
                  <div className="text-center">
                    <div className="text-[8px] text-neutral-600 uppercase font-black">Hit Die</div>
                    <div className="font-bold text-xs">{c.hitDie}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-neutral-600 uppercase font-black">Base HP</div>
                    <div className="font-bold text-xs">{c.startingHp}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-neutral-600 uppercase font-black">Growth</div>
                    <div className="font-bold text-xs">+{c.hpPerLevel}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[#b28a48]/80">Key Features</div>
                    <button 
                      onClick={() => handleReroll(c)}
                      disabled={rerolling === c.id}
                      className="text-[9px] text-neutral-500 hover:text-[#b28a48] font-black uppercase tracking-widest flex items-center gap-1"
                    >
                      {rerolling === c.id ? '...' : 'Reroll 🎲'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.features.map((f, i) => (
                      <div key={i} className="group relative">
                        <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-sm border border-neutral-900 hover:border-[#b28a48]/30 transition-all">
                          <button 
                            onClick={() => toggleLock(c.id, i)}
                            className={`text-[10px] ${f.locked ? 'text-amber-500' : 'text-neutral-800 hover:text-neutral-500'}`}
                          >
                            {f.locked ? '†' : '○'}
                          </button>
                          <span className="text-[10px] text-neutral-400 cursor-help group/tooltip-parent font-black uppercase tracking-tighter">
                            {f.name}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[#0a0a0a] border border-[#b28a48]/30 rounded-sm text-[10px] text-neutral-500 italic shadow-2xl invisible group-hover/tooltip-parent:visible z-50 pointer-events-none normal-case">
                                <div className="font-bold text-[#b28a48] mb-1 uppercase tracking-widest">{f.name}</div>
                                {f.description}
                            </div>
                          </span>
                        </div>
                      </div>
                    ))}
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

export default ClassLibrary;
