
import React, { useState, useMemo } from 'react';
import { Item, Archetype } from '../types';

interface ArmoryScreenProps {
  armory: Item[];
  setArmory: (a: Item[]) => void;
  onShare: (item: Item) => void;
  userId: string;
}

const ArmoryScreen: React.FC<ArmoryScreenProps> = ({ armory, setArmory, onShare }) => {
  const [filterClass, setFilterClass] = useState<Archetype | string | 'All'>('All');
  const [filterType, setFilterType] = useState<Item['type'] | 'All'>('All');
  const [sortBy, setSortBy] = useState<'rarity' | 'name'>('rarity');

  const rarityOrder = {
    'Relic': 6,
    'Legendary': 5,
    'Epic': 4,
    'Rare': 3,
    'Uncommon': 2,
    'Common': 1
  };

  const filteredAndSortedItems = useMemo(() => {
    return armory
      .filter(item => {
        if (item.type === 'Utility' || item.isUnique) return false;
        const matchesClass = filterClass === 'All' || 
                           !item.archetypes || 
                           item.archetypes.length === 0 || 
                           (item.archetypes as any).includes(filterClass);
        const matchesType = filterType === 'All' || item.type === filterType;
        return matchesClass && matchesType;
      })
      .sort((a, b) => {
        const aRarity = a.rarity as keyof typeof rarityOrder;
        const bRarity = b.rarity as keyof typeof rarityOrder;
        if (sortBy === 'rarity') return rarityOrder[bRarity] - rarityOrder[aRarity];
        return a.name.localeCompare(b.name);
      });
  }, [armory, filterClass, filterType, sortBy]);

  const handleDelete = (id: string) => {
    setArmory(armory.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-8 pb-20 px-2">
      <div className="border-b border-emerald-900 pb-4">
        <h2 className="text-4xl font-cinzel text-gold">The Armory</h2>
        <p className="text-gray-500 italic text-sm">"Obsidian blades for obsidian souls."</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 bg-black/40 rune-border border-emerald-900/60">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-cinzel text-emerald-500 uppercase font-black">Path Filter</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterClass('All')} className={`px-3 py-1 text-[10px] font-cinzel border transition-all font-black uppercase ${filterClass === 'All' ? 'bg-emerald-900 border-gold text-white' : 'border-emerald-900/30 text-gray-500 hover:text-emerald-500'}`}>All</button>
            {Object.values(Archetype).filter(a => a !== Archetype.Custom).map(a => (
              <button key={a} onClick={() => setFilterClass(a)} className={`px-3 py-1 text-[10px] font-cinzel border transition-all font-black uppercase ${filterClass === a ? 'bg-emerald-900 border-gold text-white' : 'border-emerald-900/30 text-gray-500 hover:text-emerald-500'}`}>{a}</button>
            ))}
          </div>
        </div>
        <div className="md:w-48 space-y-2">
          <label className="text-[10px] font-cinzel text-emerald-500 uppercase font-black">Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full h-[38px] bg-[#0c0a09] border border-emerald-900/50 p-2 text-xs text-gold outline-none font-bold">
            <option value="All">All Types</option>
            <option value="Weapon">Weapons</option>
            <option value="Armor">Armor</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedItems.map(item => (
          <div key={item.id} className="relative group rune-border p-5 bg-black/60 hover:border-gold/50 transition-all flex flex-col space-y-4 border-emerald-900/40">
            <div className="flex justify-between items-start border-b border-emerald-900/30 pb-2">
              <div>
                <h4 className="font-cinzel text-lg text-gold truncate font-bold">{item.name}</h4>
                <div className="flex flex-wrap gap-2 items-center mt-1">
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                    item.rarity === 'Relic' ? 'text-cyan-400 border-cyan-900/50 bg-cyan-900/10 shadow-[0_0_10px_rgba(34,211,238,0.3)]' :
                    item.rarity === 'Legendary' ? 'text-orange-500 border-orange-900/50 bg-orange-900/10' : 
                    item.rarity === 'Epic' ? 'text-purple-500 border-purple-900/50 bg-purple-900/10' : 
                    item.rarity === 'Rare' ? 'text-blue-500 border-blue-900/50 bg-blue-900/10' : 
                    'text-gray-500 border-gray-900/50 bg-gray-900/10'
                  }`}>{item.rarity}</span>
                  <span className="text-[9px] text-emerald-600 font-cinzel uppercase font-black">{item.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onShare(item)} title="Share Resonance" className="text-emerald-500/40 hover:text-emerald-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></button>
                <button onClick={() => handleDelete(item.id)} className="text-emerald-900 hover:text-emerald-500 transition-colors text-xl font-bold">×</button>
              </div>
            </div>
            <p className="text-xs text-gray-400 italic leading-relaxed">"{item.description}"</p>
            
            {item.stats && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-900/20">
                {item.stats.damage && (
                  <div className="flex flex-col bg-emerald-900/5 p-2 rounded-sm border border-emerald-900/10">
                    <span className="text-[8px] text-emerald-700 font-black uppercase">Damage</span>
                    <span className="text-xs text-gold font-black">{item.stats.damage} {item.stats.damageType}</span>
                  </div>
                )}
                {item.stats.ac && (
                  <div className="flex flex-col bg-emerald-900/5 p-2 rounded-sm border border-emerald-900/10">
                    <span className="text-[8px] text-emerald-700 font-black uppercase">Armor Class</span>
                    <span className="text-xs text-gold font-black">{item.stats.ac}</span>
                  </div>
                )}
                {Object.entries(item.stats).map(([key, val]) => {
                  if (['damage', 'ac', 'damageType', 'cost'].includes(key)) return null;
                  return (
                    <div key={key} className="flex justify-between text-[10px] border border-emerald-900/20 px-2 py-1 bg-emerald-900/5">
                      <span className="uppercase text-emerald-700 font-cinzel font-black">{key}</span>
                      <span className="text-gold font-black">{val}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArmoryScreen;
