
import React, { useState, useMemo } from 'react';
import { Character, ClassDef, Spell } from '../types';

interface SpellCodexProps {
  characters: Character[];
  classes: ClassDef[];
  notify: (msg: string, type?: any) => void;
}

interface SpellWithMetadata extends Spell {
  source: string;
  classId?: string;
}

const SpellCodex: React.FC<SpellCodexProps> = ({ characters, classes, notify }) => {
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const allSpells = useMemo(() => {
    const list: SpellWithMetadata[] = [];
    
    // Aggregate from characters
    characters.forEach(c => {
      (c.knownSpells || []).forEach(s => {
        list.push({ ...s, source: `${c.name}`, classId: c.classId });
      });
    });

    // Aggregate from classes
    classes.forEach(cls => {
      (cls.initialSpells || []).forEach(s => {
        list.push({ ...s, source: `${cls.name} (Archetype)`, classId: cls.id });
      });
    });
    
    return list;
  }, [characters, classes]);

  const filteredSpells = useMemo(() => {
    return allSpells.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.school.toLowerCase().includes(search.toLowerCase()) ||
                          s.source.toLowerCase().includes(search.toLowerCase());
      const matchesClass = selectedClassId === 'all' || s.classId === selectedClassId;
      return matchesSearch && matchesClass;
    }).sort((a, b) => a.level - b.level);
  }, [allSpells, search, selectedClassId]);

  return (
    <div className="space-y-8 pb-12 pt-16">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Grimoire Codex</h2>
        <p className="text-neutral-600 text-[10px] md:text-xs uppercase tracking-[0.4em] mt-2 font-black">Archive of Manifested Incantations</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-0">
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Search incantations..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-black border border-neutral-900 px-4 md:px-6 py-4 text-xs uppercase tracking-widest text-[#b28a48] outline-none focus:border-[#b28a48] rounded-sm font-mono shadow-inner"
          />
          
          <div className="relative min-w-[220px]">
            <select 
              value={selectedClassId} 
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-black border border-neutral-900 px-4 py-4 text-[10px] text-[#b28a48] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-[#b28a48] rounded-sm transition-all"
            >
              <option value="all">All Archetypes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-[#b28a48] opacity-50 font-black">▼</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {filteredSpells.map((s, i) => (
            <div key={i} className="grim-card p-5 md:p-6 border-neutral-900 border-2 rounded-sm text-left group hover:border-[#b28a48]/40 transition-all shadow-xl">
               <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div>
                    <h3 className="text-lg md:text-xl font-black fantasy-font text-[#b28a48] group-hover:text-amber-500 transition-colors uppercase tracking-widest">{s.name}</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-600 font-black uppercase tracking-widest mt-1">{s.school} • Level {s.level}</p>
                  </div>
                  <span className="text-[7px] md:text-[8px] px-2 py-1 bg-neutral-900 text-neutral-700 font-black uppercase rounded-sm border border-neutral-800 whitespace-nowrap ml-2">{s.source}</span>
               </div>
               <p className="text-xs md:text-sm text-neutral-400 font-serif italic leading-relaxed">{s.description}</p>
            </div>
          ))}
          {filteredSpells.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-neutral-900 opacity-20 flex flex-col items-center">
               <span className="text-4xl mb-4">✨</span>
               <p className="text-xs uppercase tracking-widest font-black">No incantations found in the codex.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpellCodex;
