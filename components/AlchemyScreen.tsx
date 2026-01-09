
import React, { useMemo } from 'react';
import { Item, Character, Archetype } from '../types';
import { APOTHECARY_TIERS } from '../constants';

interface AlchemyScreenProps {
  armory: Item[];
  setArmory: (a: Item[]) => void;
  onUpdateItem: (id: string, updates: Partial<Item>) => void;
  onShare: (item: Item) => void;
  userId: string;
  party: Character[];
}

const AlchemyScreen: React.FC<AlchemyScreenProps> = ({ armory, setArmory, onShare, party }) => {
  const rarityOrder = {
    'Legendary': 5,
    'Epic': 4,
    'Rare': 3,
    'Uncommon': 2,
    'Common': 1
  };

  const isAlchemistPresent = useMemo(() => 
    party.some(c => c.archetype === Archetype.Alchemist),
  [party]);

  const consumables = useMemo(() => {
    return armory
      .filter(item => item.type === 'Utility')
      .sort((a, b) => {
        const aRarity = a.rarity as keyof typeof rarityOrder;
        const bRarity = b.rarity as keyof typeof rarityOrder;
        return rarityOrder[bRarity] - rarityOrder[aRarity];
      });
  }, [armory]);

  const recipes = useMemo(() => {
    if (!isAlchemistPresent) return [];
    
    const allTiers = [
      ...APOTHECARY_TIERS.HEALTH,
      ...APOTHECARY_TIERS.AETHER,
      ...APOTHECARY_TIERS.DAMAGE
    ];

    return allTiers.map(p => ({
      name: p.name,
      description: p.desc,
      requirements: [
        `${p.cost} Aurels`,
        p.lvl > 5 ? `${Math.floor(p.cost / 10)} Shards` : null,
        p.lvl > 10 ? '1 Monster Essence' : null,
        '1 Empty Flask'
      ].filter(Boolean) as string[]
    }));
  }, [isAlchemistPresent]);

  const handleDelete = (id: string) => {
    if (id.startsWith('start-')) {
       alert("Thy starter reagents cannot be dissolved.");
       return;
    }
    setArmory(armory.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-emerald-900 pb-4">
        <h2 className="text-4xl font-cinzel text-emerald-500">The Alchemy Lab</h2>
        <p className="text-gray-500 italic">"Potions of life and flasks of ruin. Reagents Manifested from the world's blood."</p>
      </div>

      {isAlchemistPresent && (
        <div className="rune-border p-6 bg-emerald-950/10 border-emerald-500/30 space-y-6 animate-in slide-in-from-top-4 duration-700">
           <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-3">
             <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414V7a1 1 0 01-1 1H4.414l-1.707.707A1 1 0 003 10v3a1 1 0 001 1h.586l-.707.707A1 1 0 004.586 16H15.414a1 1 0 00.707-1.707L15.414 13.586A1 1 0 0016 13V10a1 1 0 00-.293-.707L14 7.586V4.414l.707-.707A1 1 0 0014 2H7zm2 4V4h2v2H9zm-2 5a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
                </svg>
             </div>
             <h3 className="text-lg font-cinzel text-emerald-400 font-black uppercase tracking-[0.2em]">Grimoire of Formulae</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {recipes.map((recipe, idx) => (
               <div key={idx} className="p-4 bg-black/60 border border-emerald-900/30 hover:border-emerald-500/50 transition-all rounded-sm">
                 <p className="text-emerald-500 font-cinzel font-bold text-sm uppercase">{recipe.name}</p>
                 <p className="text-[10px] text-gray-500 italic mb-3">{recipe.description}</p>
                 <div className="space-y-1">
                   {recipe.requirements.map((req, i) => (
                     <div key={i} className="flex items-center gap-2 text-[9px] text-gray-400 uppercase font-black">
                        <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                        {req}
                     </div>
                   ))}
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {consumables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {consumables.map(item => (
            <div key={item.id} className="relative group rune-border p-5 bg-black/60 border-emerald-900/30 hover:border-emerald-500/50 transition-all flex flex-col space-y-4">
              <div className="flex justify-between items-start border-b border-emerald-900/30 pb-2">
                <div>
                  <h4 className="font-cinzel text-lg text-emerald-400 truncate">{item.name}</h4>
                  <div className="flex flex-wrap gap-2 items-center mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      item.rarity === 'Legendary' ? 'text-orange-500 border-orange-900/50 bg-orange-900/10' :
                      item.rarity === 'Epic' ? 'text-purple-500 border-purple-900/50 bg-purple-900/10' :
                      item.rarity === 'Rare' ? 'text-blue-500 border-blue-900/50 bg-blue-900/10' : 
                      'text-emerald-700 border-emerald-900/50 bg-emerald-900/10'
                    }`}>{item.rarity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onShare(item)} className="text-emerald-500/40 hover:text-emerald-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                  {!item.id.startsWith('start-') && (
                    <button onClick={() => handleDelete(item.id)} className="text-emerald-900 hover:text-emerald-500 transition-colors text-xl font-bold">×</button>
                  )}
                </div>
              </div>
              
              <div className="flex gap-4 items-center">
                 <div className="w-12 h-12 bg-emerald-900/20 border border-emerald-500/30 flex items-center justify-center font-cinzel text-xl text-emerald-500 rounded-sm">
                   {item.name[0]}
                 </div>
                 <p className="text-xs text-gray-400 italic leading-relaxed flex-1">{item.description}</p>
              </div>
              
              {item.stats && Object.keys(item.stats).length > 0 && (
                <div className="grid grid-cols-1 gap-1 pt-2">
                  {Object.entries(item.stats).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-[10px] border border-emerald-900/20 px-2 py-1 bg-emerald-900/5">
                      <span className="uppercase text-emerald-900 font-cinzel">{key}</span>
                      <span className="text-emerald-400 font-bold">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center border-2 border-dashed border-emerald-900/20 bg-black/40 rounded-lg">
           <p className="font-cinzel text-gray-600 uppercase tracking-widest italic">No tonics or reagents manifested in thy lab.</p>
           <p className="text-[10px] text-gray-700 mt-2">Trade with merchants or carve parts from the fallen.</p>
        </div>
      )}
    </div>
  );
};

export default AlchemyScreen;
