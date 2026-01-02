import React, { useState, useMemo } from 'react';
import { Character, ClassDef, Spell } from '../types';

interface SpellCodexProps {
  characters: Character[];
  classes: ClassDef[];
  notify: (msg: string, type?: any) => void;
}

const SpellCodex: React.FC<SpellCodexProps> = ({ characters, classes, notify }) => {
  const [search, setSearch] = useState('');

  const allSpells = useMemo(() => {
    const list: (Spell & { source: string })[] = [];
    
    // Aggregate from characters
    characters.forEach(c => {
      (c.knownSpells || []).forEach(s => {
        list.push({ ...s, source: `${c.name}` });
      });
    });

    // Aggregate from classes
    classes.forEach(cls => {
      (cls.initialSpells || []).forEach(s => {
        list.push({ ...s, source: `${cls.name} (Archetype)` });
      });
    });
    
    // Deduplicate or show distinct sources
    return list;
  }, [characters, classes]);

  const filteredSpells = useMemo(() => {
    return allSpells.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.school.toLowerCase().includes(search.toLowerCase()) ||
                          s.source.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => a.level - b.level);
  }, [allSpells, search]);

  return (
    <div className="space-y-8 pb-12 pt-16">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Grimoire Codex</h2>
        <p className="text-neutral-600 text-[10px] md:text-xs uppercase tracking-[0.4em] mt-2 font-black">Archive of Manifested Incantations</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-0">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Search incantations or classes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-black border border-neutral-900 px-4 md:px-6 py-4 text-xs uppercase tracking-widest text-[#b28a48] outline-none focus:border-[#b28a48] rounded-sm font-mono shadow-inner"
          />
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