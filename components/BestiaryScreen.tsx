
import React, { useState, useMemo } from 'react';
import { Monster } from '../types';
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

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      <div className="border-b border-red-900 pb-4">
        <h2 className="text-4xl font-cinzel text-[#a16207]">Ancient Bestiary</h2>
        <p className="text-gray-500 italic">"Know thy enemy, for their hunger is eternal."</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 bg-black/40 rune-border items-end">
        <div className="flex-1 space-y-2 w-full">
          <label className="text-[10px] font-cinzel text-red-900 uppercase tracking-widest">Search the Void</label>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or type..."
            className="w-full bg-[#0c0a09] border border-red-900/50 p-2 text-xs text-gold outline-none focus:border-gold transition-all font-cinzel"
          />
        </div>

        <div className="w-full md:w-48 space-y-2">
          <label className="text-[10px] font-cinzel text-red-900 uppercase tracking-widest">Sort By Difficulty</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as SortCriteria)}
            className="w-full bg-[#0c0a09] border border-red-900/50 p-2 text-xs text-gold outline-none cursor-pointer font-cinzel"
          >
            <option value="expReward">EXP Reward (Threat)</option>
            <option value="hp">Vitality (HP)</option>
            <option value="ac">Defense (AC)</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>

        <button 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="w-full md:w-32 py-2 border border-red-900/50 text-[10px] font-cinzel text-gold hover:bg-red-900/20 transition-all uppercase"
        >
          {sortOrder === 'asc' ? 'Order: Asc' : 'Order: Desc'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sortedMonsters.map(monster => {
          const isBoss = monster.expReward >= 3000;
          return (
            <div key={monster.id} className={`rune-border p-6 flex flex-col gap-4 transition-all group ${isBoss ? 'bg-red-900/10 border-gold shadow-[0_0_20px_rgba(161,98,7,0.1)]' : 'bg-black/60 backdrop-blur hover:bg-red-900/5'}`}>
              <div className="flex justify-between items-start border-b border-red-900/30 pb-2">
                <div className="min-w-0">
                  <h3 className={`text-2xl font-cinzel truncate group-hover:text-red-500 transition-colors ${isBoss ? 'text-gold' : 'text-gold'}`}>{monster.name}</h3>
                  <p className="text-xs text-red-900 font-cinzel uppercase tracking-tighter">
                    {monster.type} • AC {monster.ac} • HP {monster.hp}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[10px] text-gold font-cinzel uppercase opacity-50 tracking-tighter">Threat Level</span>
                  <span className={`text-xs border px-2 py-0.5 rounded font-cinzel shadow-lg ${isBoss ? 'bg-gold text-black border-white' : 'bg-red-900/40 text-white border-gold/30'}`}>
                    {monster.expReward} EXP
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-400 leading-relaxed italic border-l-2 border-red-900/30 pl-4">
                {monster.description}
              </p>
              
              <div className="pt-2">
                <h4 className="text-[10px] font-cinzel text-gold uppercase mb-2 opacity-60 tracking-widest">Innate Manifestations</h4>
                <div className="flex flex-wrap gap-2">
                  {monster.abilities.map((a, i) => (
                    <div key={i} className="min-w-[80px]">
                      <Tooltip 
                        title={a.name} 
                        subTitle={a.type} 
                        content={a.description}
                      >
                        <span className="text-[10px] border border-red-900/50 px-2 py-1 text-red-900 uppercase font-cinzel cursor-help hover:bg-red-900 hover:text-white transition-colors block text-center truncate">
                          {a.name}
                        </span>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {sortedMonsters.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-red-900/20 rounded-lg">
            <p className="text-gray-500 font-cinzel italic uppercase">The shadows are empty. No monsters match thy vision.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BestiaryScreen;
