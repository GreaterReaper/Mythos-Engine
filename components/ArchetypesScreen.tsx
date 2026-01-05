
import React from 'react';
import { Archetype, ArchetypeInfo } from '../types';
import { ARCHETYPE_INFO } from '../constants';

interface ArchetypesScreenProps {
  customArchetypes: ArchetypeInfo[];
  onShare: (arch: ArchetypeInfo) => void;
  userId: string;
}

const ArchetypesScreen: React.FC<ArchetypesScreenProps> = ({ customArchetypes, onShare, userId }) => {
  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-red-900 pb-4">
        <h2 className="text-4xl font-cinzel text-[#a16207]">Sacred Archetypes</h2>
        <p className="text-gray-500 italic">"Choose thy path wisely, for it shall be thy end."</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Default Archetypes */}
        {Object.keys(ARCHETYPE_INFO).map(key => {
          const a = key as Archetype;
          const info = ARCHETYPE_INFO[a];
          return (
            <div key={a} className="rune-border p-6 bg-black/60 backdrop-blur group hover:bg-red-900/5 transition-all">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-3xl font-cinzel text-gold">{a}</h3>
                <span className="text-[8px] border border-red-900/30 px-1 py-0.5 text-gray-600 font-cinzel uppercase">Primordial</span>
              </div>
              <div className="text-xs font-cinzel text-red-900 mb-4 flex gap-4 uppercase">
                 <span>Hit Die: d{info.hpDie}</span>
                 <span>Primary: {a === Archetype.Archer || a === Archetype.Thief ? 'DEX' : a === Archetype.Warrior || a === Archetype.Fighter ? 'STR' : 'INT'}</span>
              </div>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">{info.description}</p>
              
              <div className="space-y-3">
                <h4 className="text-xs font-cinzel text-gold border-b border-gold/20 pb-1">Core Manifest</h4>
                {info.coreAbilities.map((ab, i) => (
                  <div key={i} className="relative">
                    <div className="flex justify-between text-xs font-cinzel text-red-700">
                       <span>{ab.name}</span>
                       <span>{ab.type}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{ab.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Custom Archetypes */}
        {customArchetypes.map((arch, idx) => (
          <div key={`${arch.name}-${idx}`} className="rune-border p-6 bg-black/60 backdrop-blur group border-gold/40 hover:bg-gold/5 transition-all shadow-[0_0_20px_rgba(161,98,7,0.1)]">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-3xl font-cinzel text-gold">{arch.name}</h3>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[8px] border border-gold/50 px-1 py-0.5 text-gold font-cinzel uppercase tracking-widest">Forged Path</span>
                <button 
                  onClick={() => onShare(arch)}
                  className="text-[8px] text-red-900 hover:text-gold uppercase font-cinzel underline tracking-tighter"
                >
                  Share Resonance
                </button>
              </div>
            </div>
            <div className="text-xs font-cinzel text-gold/60 mb-4 flex gap-4 uppercase">
               <span>Hit Die: d{arch.hpDie}</span>
            </div>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed italic">{arch.description}</p>
            
            <div className="space-y-3">
              <h4 className="text-xs font-cinzel text-gold border-b border-gold/20 pb-1">Inherited Gifts</h4>
              {arch.coreAbilities.map((ab, i) => (
                <div key={i} className="relative">
                  <div className="flex justify-between text-xs font-cinzel text-amber-900">
                     <span>{ab.name}</span>
                     <span>{ab.type}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">{ab.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArchetypesScreen;
