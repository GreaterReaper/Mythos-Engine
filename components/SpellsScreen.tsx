import React, { useState, useMemo } from 'react';
import { ARCHETYPE_INFO, SPELL_LIBRARY } from '../constants';
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
    
    // 1. Check source manifest
    Object.entries(ARCHETYPE_INFO).forEach(([key, info]) => {
      if (info.spells && info.spells.length > 0) set.add(key);
    });
    
    // 2. Check standalone spell library
    Object.keys(SPELL_LIBRARY).forEach(key => set.add(key));
    
    // 3. Check custom creations
    customArchetypes.forEach(ca => { if (ca.spells && ca.spells.length > 0) set.add(ca.name); });
    
    // 4. Check active souls
    playerCharacters.forEach(c => { 
      const spells = getSpellsForArchetype(c.archetype);
      if (spells.length > 0) set.add(c.archetype); 
    });

    return Array.from(set).sort();
  }, [playerCharacters, customArchetypes]);

  function getSpellsForArchetype(arch: string): Ability[] {
    // Priority 1: ARCHETYPE_INFO source
    const info = ARCHETYPE_INFO[arch];
    if (info?.spells && info.spells.length > 0) return info.spells;
    
    // Priority 2: Standalone SPELL_LIBRARY
    if (SPELL_LIBRARY[arch]) return SPELL_LIBRARY[arch];
    
    // Priority 3: Custom Archetypes
    const ca = customArchetypes.find(a => a.name === arch);
    if (ca?.spells && ca.spells.length > 0) return ca.spells;
    
    return [];
  }

  const activeArchetype = selectedArchetype || allArchetypesWithSpells[0];

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto px-2">
      <div className="border-b border-emerald-900 pb-4">
        <h2 className="text-4xl font-cinzel text-gold">The Ancient Grimoire</h2>
        <p className="text-gray-500 italic text-sm">"The aether flows through the focused mind. Manifest thy destiny."</p>
      </div>

      {allArchetypesWithSpells.length > 0 ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar no-scrollbar border-b border-emerald-900/10">
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
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[8px] bg-emerald-900/20 px-2 py-0.5 border border-emerald-900/40 text-emerald-400 uppercase font-black tracking-tighter">
                        Tier {spell.baseLevel} Aether
                      </span>
                      <span className="text-[8px] bg-gold/10 px-2 py-0.5 border border-gold/30 text-gold uppercase font-black tracking-tighter shadow-[0_0_5px_rgba(212,175,55,0.2)]">
                        Unlocks at Level {spell.levelReq}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-cinzel uppercase italic tracking-widest font-black">{spell.type}</span>
                </div>
                
                <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-emerald-900/50 pl-4 py-1 font-medium">
                  {spell.description}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {spell.damage && (
                    <div className="flex flex-col bg-emerald-900/5 p-2 rounded-sm border border-emerald-900/10">
                      <span className="text-[8px] text-emerald-700 font-black uppercase">Manifestation</span>
                      <span className="text-xs text-gold font-black">{spell.damage} {spell.damageType}</span>
                    </div>
                  )}
                  {spell.scaling && (
                    <div className="flex flex-col bg-gold/5 p-2 rounded-sm border border-gold/10">
                      <span className="text-[8px] text-gold/60 font-black uppercase">Resonance</span>
                      <span className="text-xs text-gold font-black">{spell.scaling}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-2">
                  {(spell.manaCost || spell.hpCost) && (
                     <div className="flex gap-4">
                       {spell.manaCost && <span className="text-[9px] text-blue-400 font-black uppercase tracking-tighter">Cost: {spell.manaCost} MP</span>}
                       {spell.hpCost && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter">Cost: {spell.hpCost} HP</span>}
                     </div>
                  )}
                </div>
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