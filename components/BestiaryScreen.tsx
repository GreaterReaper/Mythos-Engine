
import React, { useState, useMemo } from 'react';
import { Monster, Stats } from '../types';
import Tooltip from './Tooltip';

interface BestiaryScreenProps {
  monsters: Monster[];
  onUpdateMonster: (id: string, updates: Partial<Monster>) => void;
}

type SortCriteria = 'expReward' | 'hp' | 'ac' | 'name';
type SortOrder = 'asc' | 'desc';

const BestiaryScreen: React.FC<BestiaryScreenProps> = ({ monsters }) => {
  const [sortBy, setSortBy] = useState<SortCriteria>('expReward');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const sortedMonsters = useMemo(() => {
    return [...monsters]
      .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   m.type.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else {
          comparison = (a[sortBy] as number) - (b[sortBy] as number);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [monsters, sortBy, sortOrder, searchQuery]);

  const getMod = (val: number) => Math.floor((val - 10) / 2);

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto px-2">
      <div className="border-b border-red-900/50 pb-6">
        <h2 className="text-4xl md:text-5xl font-cinzel text-gold tracking-tighter">Ancient Bestiary</h2>
        <p className="text-gray-500 italic mt-2 opacity-70">"Know thy enemy, for their hunger is eternal and their soul-worth high."</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-5 bg-black/40 rune-border items-end shadow-2xl">
        <div className="flex-1 space-y-2 w-full">
          <label className="text-[10px] font-cinzel text-red-900 uppercase tracking-widest font-black">Search the Void</label>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or type..."
            className="w-full bg-[#0c0a09] border border-red-900/50 p-3 text-xs text-gold outline-none focus:border-gold transition-all font-cinzel shadow-inner"
          />
        </div>

        <div className="w-full md:w-56 space-y-2">
          <label className="text-[10px] font-cinzel text-red-900 uppercase tracking-widest font-black">Sort Criteria</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as SortCriteria)}
            className="w-full h-[46px] bg-[#0c0a09] border border-red-900/50 px-3 text-xs text-gold outline-none cursor-pointer font-cinzel hover:border-gold transition-colors"
          >
            <option value="expReward">Soul Value (EXP)</option>
            <option value="hp">Vitality (HP)</option>
            <option value="ac">Defense (AC)</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>

        <button 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="w-full md:w-36 h-[46px] border-2 border-red-900/40 text-[10px] font-cinzel text-gold hover:bg-red-900 hover:text-white hover:border-red-900 transition-all uppercase font-black tracking-widest"
        >
          {sortOrder === 'asc' ? 'ASCENDING' : 'DESCENDING'}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {sortedMonsters.map(monster => {
          const isBoss = monster.expReward >= 3000;
          const isExpanded = expandedIds.has(monster.id);
          
          return (
            <div 
              key={monster.id} 
              className={`rune-border transition-all duration-300 overflow-hidden ${
                isBoss 
                ? 'border-gold/50 shadow-[0_0_20px_rgba(161,98,7,0.1)]' 
                : 'border-red-900/30'
              } ${isExpanded ? 'bg-black/80' : 'bg-black/40 hover:bg-black/60'}`}
            >
              {/* Header / Overview */}
              <div 
                onClick={() => toggleExpand(monster.id)}
                className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row justify-between items-center gap-4 group"
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={`w-12 h-12 border flex items-center justify-center font-cinzel text-xl font-bold shrink-0 transition-all ${
                    isExpanded ? 'bg-red-900 text-white border-gold' : 'bg-black/60 text-gold border-red-900/40 group-hover:border-gold/50'
                  }`}>
                    {monster.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                       <h3 className={`text-xl md:text-2xl font-cinzel truncate transition-colors font-bold ${isBoss ? 'text-gold' : 'text-gold/90'}`}>{monster.name}</h3>
                       {isBoss && <span className="text-[7px] md:text-[9px] bg-red-900 text-white px-1.5 py-0.5 rounded-sm uppercase animate-pulse font-black">Elder Threat</span>}
                    </div>
                    <p className="text-[10px] text-red-900 font-cinzel uppercase tracking-widest font-black opacity-70">
                      {monster.type} • AC {monster.ac} • HP {monster.hp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right shrink-0">
                    <span className="block text-[8px] text-gold font-black uppercase opacity-60 tracking-widest">Soul Value</span>
                    <span className={`font-cinzel leading-none block ${isBoss ? 'text-2xl text-red-600 font-black drop-shadow-sm' : 'text-lg text-gold font-bold'}`}>
                      {monster.expReward}<span className="text-[9px] ml-1 opacity-50 uppercase">EXP</span>
                    </span>
                  </div>
                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="p-4 md:p-8 pt-0 border-t border-red-900/20 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Stats & Flavor */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-cinzel text-red-900 uppercase font-black tracking-widest border-b border-red-900/20 pb-1">The Essence</h4>
                        <p className="text-xs text-gray-400 italic leading-relaxed">"{monster.description}"</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as Array<keyof Stats>).map(s => {
                          const val = monster.stats?.[s] || 10;
                          const mod = getMod(val);
                          return (
                            <div key={s} className="bg-black/60 border border-red-900/10 p-2 text-center rounded-sm">
                              <p className="text-[8px] font-cinzel text-gray-500 uppercase font-bold">{s}</p>
                              <p className="text-lg font-black text-gold leading-none my-1">{val}</p>
                              <p className="text-[9px] text-red-900 font-bold">{mod >= 0 ? '+' : ''}{mod}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Abilities (spanning 2 columns on large screens) */}
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-widest border-b border-gold/20 pb-1">Manifestations of Dread</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {monster.abilities.map((a, i) => (
                          <div key={i} className="p-3 bg-red-900/5 border-l-2 border-red-900 rounded-r-sm group/ability">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[11px] font-cinzel text-gold uppercase font-black tracking-tighter group-hover/ability:text-white transition-colors">{a.name}</span>
                              <span className="text-[8px] text-red-900 uppercase italic font-bold tracking-widest">{a.type}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">{a.description}</p>
                          </div>
                        ))}
                        {monster.abilities.length === 0 && (
                          <p className="text-[10px] text-gray-600 italic">This creature relies solely on primitive instinct.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedMonsters.length === 0 && (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-red-900/20 rounded-sm opacity-50">
            <p className="text-gray-500 font-cinzel italic uppercase text-lg tracking-widest">The shadows are empty. No monsters match thy vision.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BestiaryScreen;
