
import React, { useState, useMemo } from 'react';
import { Archetype, ArchetypeInfo, Role } from '../types';
import { ARCHETYPE_INFO } from '../constants';

interface ArchetypesScreenProps {
  customArchetypes: ArchetypeInfo[];
  onShare: (arch: ArchetypeInfo) => void;
  userId: string;
}

const ArchetypesScreen: React.FC<ArchetypesScreenProps> = ({ customArchetypes, onShare }) => {
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');

  const getPrimaryStat = (a: Archetype | string) => {
    const archName = String(a);
    if (['Archer', 'Thief'].includes(archName)) return 'DEX';
    if (['Warrior', 'Fighter'].includes(archName)) return 'STR';
    if (archName === 'Dark Knight') return 'STR / CHA';
    if (archName === 'Mage') return 'WIS';
    if (archName === 'Sorcerer') return 'INT';
    return 'VARIES';
  };

  const filteredArchetypes = useMemo(() => {
    const defaults = Object.keys(ARCHETYPE_INFO).map(name => ({ ...ARCHETYPE_INFO[name], name }));
    const all = [...defaults, ...customArchetypes];
    if (roleFilter === 'All') return all;
    return all.filter(a => a.role === roleFilter);
  }, [customArchetypes, roleFilter]);

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'Tank': return 'text-blue-500 border-blue-900/30 bg-blue-900/10';
      case 'DPS': return 'text-emerald-500 border-emerald-900/30 bg-emerald-900/10';
      case 'Support': return 'text-amber-500 border-amber-900/30 bg-amber-900/10';
      default: return 'text-gray-500 border-gray-900/30 bg-gray-900/10';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-emerald-900 pb-4 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-cinzel text-gold">Sacred Archetypes</h2>
          <p className="text-gray-500 italic">"Choose thy path wisely, for it shall be thy end."</p>
        </div>
        <div className="flex gap-2">
          {(['All', 'Tank', 'DPS', 'Support'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-1.5 text-[10px] font-cinzel border transition-all uppercase font-black tracking-widest ${roleFilter === role ? 'bg-emerald-900 border-gold text-white shadow-lg shadow-emerald-900/40' : 'border-emerald-900/30 text-gray-500 hover:text-gold hover:border-gold'}`}
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
            <div key={`${arch.name}-${idx}`} className={`rune-border p-6 bg-black/60 backdrop-blur group hover:bg-emerald-900/5 transition-all flex flex-col ${isCustom ? 'border-gold/40 shadow-[0_0_20px_rgba(161,98,7,0.1)]' : 'border-emerald-900/30'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-3xl font-cinzel text-gold">{arch.name}</h3>
                <span className={`text-[8px] border px-1.5 py-0.5 font-black uppercase tracking-[0.2em] rounded-sm ${getRoleColor(arch.role)}`}>{arch.role}</span>
              </div>
              <div className="text-xs font-cinzel text-emerald-900 mb-4 flex gap-4 uppercase font-bold">
                 <span>Hit Die: d{arch.hpDie}</span>
                 <span>Primary: {getPrimaryStat(arch.name)}</span>
              </div>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed flex-1 italic">"{arch.description}"</p>
              <div className="space-y-3">
                <h4 className="text-[10px] font-cinzel text-gold border-b border-gold/20 pb-1 font-black uppercase tracking-widest">Core Manifest</h4>
                {arch.coreAbilities.map((ab, i) => (
                  <div key={i} className="relative">
                    <div className="flex justify-between text-xs font-cinzel text-emerald-700 font-bold">
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
