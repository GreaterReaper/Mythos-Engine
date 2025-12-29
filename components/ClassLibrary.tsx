
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
      notify(`Archetype "${name}" Bound`, "success");
    } catch (e: any) {
      console.error(e);
      notify(e.message || "The Forge failed to respond.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReroll = async (cls: ClassDef) => {
    setRerolling(cls.id);
    try {
      const updated = await rerollTraits('class', cls.name, cls.description, cls.features);
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, features: updated.map((f, i) => ({ ...f, locked: cls.features[i].locked })) } : c));
      notify("Features Rewoven", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setRerolling(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold fantasy-font text-[#b28a48]">Class Library</h2>
        <p className="text-neutral-500 text-sm uppercase tracking-widest">Forge archetypes. AI generates mechanics based on your lore.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4">
            <h3 className="text-lg font-bold mb-4 fantasy-font text-neutral-300">Forge Archetype</h3>
            <div className="space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="CLASS NAME..." className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-sm text-[#b28a48] focus:border-[#b28a48] outline-none" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="PLAYSTYLE, THEMES, ABILITIES..." className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 h-32 text-sm text-neutral-400 focus:border-[#b28a48] outline-none" />
              <button onClick={handleCreate} disabled={loading || !name} className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#gold]/40 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] hover:border-[#b28a48] transition-all">
                {loading ? 'FORGING...' : 'BIND ARCHETYPE'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <input type="text" placeholder="Search archetypes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-black border border-neutral-900 px-4 py-2 text-[10px] uppercase tracking-widest text-[#b28a48] outline-none" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredClasses.map(c => (
              <div key={c.id} className="grim-card p-6 group hover:border-[#b28a48]/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-bold text-[#b28a48] fantasy-font">{c.name}</h4>
                  <button onClick={() => setClasses(prev => prev.filter(x => x.id !== c.id))} className="text-neutral-800 hover:text-red-500 transition-colors">🗑️</button>
                </div>
                <p className="text-xs text-neutral-500 mb-4 italic font-serif h-12 overflow-hidden">{c.description}</p>
                <div className="grid grid-cols-3 gap-2 mb-4 bg-black/40 p-2 text-center border border-neutral-900">
                   <div><div className="text-[8px] uppercase text-neutral-600">Die</div><div className="text-xs font-bold">{c.hitDie}</div></div>
                   <div><div className="text-[8px] uppercase text-neutral-600">HP</div><div className="text-xs font-bold">{c.startingHp}</div></div>
                   <div><div className="text-[8px] uppercase text-neutral-600">Up</div><div className="text-xs font-bold">+{c.hpPerLevel}</div></div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{c.features.length} Features</span>
                  <button onClick={() => handleReroll(c)} className="text-[9px] font-black uppercase text-[#b28a48] hover:underline">Reroll 🎲</button>
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
