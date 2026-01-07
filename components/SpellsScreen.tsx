
import React, { useState, useMemo } from 'react';
import { ARCHETYPE_INFO } from '../constants';
import { Character, Ability, ArchetypeInfo } from '../types';

interface SpellsScreenProps {
  mentors: Character[];
  playerCharacters: Character[];
  customArchetypes: ArchetypeInfo[];
}

const SpellsScreen: React.FC<SpellsScreenProps> = ({ playerCharacters, customArchetypes }) => {
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

  const allArchetypesWithSpells = useMemo(() => {
    const set = new Set<string>();
    
    Object.entries(ARCHETYPE_INFO).forEach(([key, info]) => {
      if (info.spells && info.spells.length > 0) set.add(key);
    });

    customArchetypes.forEach(ca => {
      if (ca.spells && ca.spells.length > 0) set.add(ca.name);
    });

    playerCharacters.forEach(c => {
      if (c.spells && c.spells.length > 0) set.add(c.archetype);
    });

    return Array.from(set);
  }, [playerCharacters, customArchetypes]);

  const getSpellsForArchetype = (arch: string): Ability[] => {
    const info = ARCHETYPE_INFO[arch];
    if (info?.spells) return info.spells;
    
    const ca = customArchetypes.find(a => a.name === arch);
    if (ca?.spells) return ca.spells;

    const pc = playerCharacters.find(c => c.archetype === arch);
    return pc?.spells || [];
  };

  const activeArchetype = selectedArchetype || allArchetypesWithSpells[0];

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <div className="border-b border-red-900 pb-4">
        <h2 className="text-4xl font-cinzel text-[#a16207]">The Ancient Grimoire</h2>
        <p className="text-gray-500 italic">"The aether flows through the focused mind. Manifest thy destiny."</p>
      </div>

      {allArchetypesWithSpells.length > 0 ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar no-scrollbar-md">
            {allArchetypesWithSpells.map(arch => {
              const isCustom = customArchetypes.some(ca => ca.name === arch);
              return (
                <button
                  key={arch}
                  onClick={() => setSelectedArchetype(arch)}
                  className={`px-4 py-2 border font-cinzel text-[10px] whitespace-nowrap transition-all uppercase tracking-widest ${
                    activeArchetype === arch 
                    ? 'bg-red-900 border-gold text-white shadow-[0_0_15px_rgba(127,29,29,0.3)]' 
                    : 'border-red-900/50 text-gray-500 hover:border-gold hover:text-gold'
                  } ${isCustom ? 'border-gold/30' : ''}`}
                >
                  {arch}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {getSpellsForArchetype(activeArchetype).map((spell, idx) => (
              <div key={idx} className="rune-border p-6 bg-black/60 flex flex-col gap-3 group hover:bg-red-900/10 transition-all border-red-900/30">
                <div className="flex justify-between items-start border-b border-red-900/30 pb-3">
                  <div>
                    <h4 className="font-cinzel text-xl text-gold group-hover:text-red-500 transition-colors drop-shadow-[0_0_5px_rgba(161,98,7,0.2)]">{spell.name}</h4>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[8px] bg-red-900/20 px-2 py-0.5 border border-red-900/40 text-white uppercase font-bold tracking-tighter">Level {spell.baseLevel} Spell</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-red-900 font-cinzel uppercase italic tracking-widest">{spell.type}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-red-900/50 pl-4 py-1">
                  {spell.description}
                </p>
                {spell.scaling && (
                  <div className="text-[9px] text-gold/60 font-mono mt-auto pt-2 border-t border-red-900/10">
                    UPCASTING: {spell.scaling}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-24 text-center border-2 border-dashed border-red-900/20 rounded-lg bg-black/20">
          <p className="text-gray-500 font-cinzel italic text-lg uppercase tracking-widest opacity-40">No magical lineages found in the aether.</p>
        </div>
      )}
    </div>
  );
};

export default SpellsScreen;
