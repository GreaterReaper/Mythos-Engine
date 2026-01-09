
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
    customArchetypes.forEach(ca => { if (ca.spells && ca.spells.length > 0) set.add(ca.name); });
    playerCharacters.forEach(c => { if (c.spells && c.spells.length > 0) set.add(c.archetype); });
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
    <div className="space-y-8 pb-20 max-w-5xl mx-auto px-2">
      <div className="border-b border-emerald-900 pb-4">
        <h2 className="text-4xl font-cinzel text-gold">The Ancient Grimoire</h2>
        <p className="text-gray-500 italic text-sm">"The aether flows through the focused mind. Manifest thy destiny."</p>
      </div>

      {allArchetypesWithSpells.length > 0 ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
            {allArchetypesWithSpells.map(arch => {
              const isCustom = customArchetypes.some(ca => ca.name === arch);
              return (
                <button
                  key={arch}
                  onClick={() => setSelectedArchetype(arch)}
                  className={`px-4 py-2 border font-cinzel text-[10px] whitespace-nowrap transition-all uppercase tracking-widest font-black ${
                    activeArchetype === arch 
                    ? 'bg-emerald-900 border-gold text-white shadow-lg' 
                    : 'border-emerald-900/50 text-gray-500 hover:text-emerald-500'
                  } ${isCustom ? 'border-gold/30' : ''}`}
                >
                  {arch}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {getSpellsForArchetype(activeArchetype).map((spell, idx) => (
              <div key={idx} className="rune-border p-6 bg-black/60 flex flex-col gap-3 group hover:bg-emerald-900/10 transition-all border-emerald-900/30">
                <div className="flex justify-between items-start border-b border-emerald-900/30 pb-3">
                  <div>
                    <h4 className="font-cinzel text-xl text-gold group-hover:text-emerald-400 transition-colors font-bold">{spell.name}</h4>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[8px] bg-emerald-900/20 px-2 py-0.5 border border-emerald-900/40 text-emerald-400 uppercase font-black tracking-tighter">Level {spell.baseLevel} Spell</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-cinzel uppercase italic tracking-widest font-black">{spell.type}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-emerald-900/50 pl-4 py-1 font-medium">
                  {spell.description}
                </p>
                {spell.scaling && (
                  <div className="text-[9px] text-emerald-500/60 font-mono mt-auto pt-2 border-t border-emerald-900/10">
                    UPCASTING: {spell.scaling}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-24 text-center border-2 border-dashed border-emerald-900/20 rounded-lg bg-black/20 font-cinzel uppercase tracking-widest opacity-40 text-gray-500">
          No magical lineages found in the aether.
        </div>
      )}
    </div>
  );
};

export default SpellsScreen;
