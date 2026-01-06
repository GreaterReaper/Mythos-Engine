
import React, { useState, useMemo } from 'react';
import { Archetype, ArchetypeInfo, Role } from '../types';
import { ARCHETYPE_INFO } from '../constants';

interface ArchetypesScreenProps {
  customArchetypes: ArchetypeInfo[];
  onShare: (arch: ArchetypeInfo) => void;
  userId: string;
}

const ArchetypesScreen: React.FC<ArchetypesScreenProps> = ({ customArchetypes, onShare, userId }) => {
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');

  const getPrimaryStat = (a: Archetype | string) => {
    switch (a) {
      case Archetype.Archer:
      case Archetype.Thief:
        return 'DEX';
      case Archetype.Warrior:
      case Archetype.Fighter:
        return 'STR';
      case Archetype.DarkKnight:
        return 'STR / CHA';
      case Archetype.Mage:
        return 'WIS';
      case Archetype.Sorcerer:
        return 'INT';
      default:
        return 'VARIES';
    }
  };

  const filteredArchetypes = useMemo(() => {
    const defaults = Object.entries(ARCHETYPE_INFO).map(([name, info]) => ({ ...info, name }));
    const all = [...defaults, ...customArchetypes];
    
    if (roleFilter === 'All') return all;
    return all.filter(a => a.role === roleFilter);
  }, [customArchetypes, roleFilter]);

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'Tank': return 'text-blue-500 border-blue-900/30 bg-blue-900/10';
      case 'DPS': return 'text-red-500 border-red-900/30 bg-red-900/10';
      case 'Support': return 'text-green-500 border-green-900/30 bg-green-900/10';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-red-900 pb-4 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-cinzel text-[#a16207]">Sacred Archetypes</h2>
          <p className="text-gray-500 italic">"Choose thy path wisely, for it shall be thy end."</p>
        </div>
        
        <div className="flex gap-2">
          {(['All', 'Tank', 'DPS', 'Support'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-1.5 text-[10px] font-cinzel border transition-all uppercase font-black tracking-widest ${
                roleFilter === role 
                ? 'bg-red-900 border-gold text-white shadow-lg shadow-red-900/40' 
                : 'border-red-900/30 text-gray-500 hover:text-gold hover:border-gold'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredArchetypes.map((arch, idx) => {
          const isCustom = !Object.keys(ARCHETYPE_INFO).includes(arch.name);
          return (
            <div key={`${arch.name}-${idx}`} className={`rune-border p-6 bg-black/60 backdrop-blur group hover:bg-red-900/5 transition-all flex flex-col ${isCustom ? 'border-gold/40 shadow-[0_0_20px_rgba(161,98,7,0.1)]' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-3xl font-cinzel text-gold">{arch.name}</h3>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[8px] border px-1.5 py-0.5 font-black uppercase tracking-[0.2em] rounded-sm ${getRoleColor(arch.role)}`}>
                    {arch.role}
                  </span>
                  {isCustom && (
                    <button 
                      onClick={() => onShare(arch as ArchetypeInfo)}
                      className="text-[8px] text-gold/60 hover:text-gold uppercase font-cinzel underline tracking-tighter"
                    >
                      Share Resonance
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs font-cinzel text-red-900 mb-4 flex gap-4 uppercase font-bold">
                 <span>Hit Die: d{arch.hpDie}</span>
                 <span>Primary: {getPrimaryStat(arch.name)}</span>
              </div>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed flex-1">{arch.description}</p>
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-cinzel text-gold border-b border-gold/20 pb-1 font-black uppercase tracking-widest">Core Manifest</h4>
                {arch.coreAbilities.map((ab, i) => (
                  <div key={i} className="relative">
                    <div className="flex justify-between text-xs font-cinzel text-red-700 font-bold">
                       <span>{ab.name}</span>
                       <span className="text-[8px] opacity-60">{ab.type}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{ab.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArchetypesScreen;
