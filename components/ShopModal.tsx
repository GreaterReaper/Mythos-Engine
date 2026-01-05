
import React from 'react';
import { Shop, ShopItem, Character, Currency } from '../types';
import Tooltip from './Tooltip';

interface ShopModalProps {
  shop: Shop | null | undefined;
  characters: Character[];
  onClose: () => void;
  onBuy: (item: ShopItem, buyerId: string) => void;
}

const ShopModal: React.FC<ShopModalProps> = ({ shop, characters, onClose, onBuy }) => {
  // Guard against null shop object
  if (!shop) return null;

  // Use the first character as the primary wallet, or a placeholder if empty
  const primaryBuyer = characters.length > 0 ? characters[0] : null;

  const canAfford = (buyer: Character, cost: Partial<Currency>) => {
    if (!buyer || !buyer.currency) return false;
    // Defensive access to cost properties
    const aurelCost = cost?.aurels || 0;
    const shardCost = cost?.shards || 0;
    const ichorCost = cost?.ichor || 0;

    return (buyer.currency.aurels >= aurelCost) &&
           (buyer.currency.shards >= shardCost) &&
           (buyer.currency.ichor >= ichorCost);
  };

  const getRarityColor = (rarity: string | undefined) => {
    switch (rarity) {
      case 'Legendary': return 'text-orange-500 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]';
      case 'Epic': return 'text-purple-500 border-purple-500';
      case 'Rare': return 'text-blue-500 border-blue-500';
      case 'Uncommon': return 'text-green-500 border-green-500';
      default: return 'text-gray-400 border-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-4xl w-full rune-border bg-[#0c0a09] p-6 md:p-10 space-y-8 overflow-y-auto max-h-[90vh] custom-scrollbar shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-red-900 hover:text-white transition-colors text-2xl font-black"
        >
          ×
        </button>

        <div className="border-b border-red-900 pb-4">
          <h2 className="text-3xl font-cinzel text-gold">{shop.merchantName || "Spectral Merchant"}</h2>
          <p className="text-xs text-gray-500 italic mt-1">"{shop.merchantAura || "An unsettling presence fills the air."}"</p>
        </div>

        {/* Currency Display */}
        {primaryBuyer ? (
          <div className="flex justify-between items-center px-4 py-3 bg-black/40 border border-gold/10 rounded">
            <div className="flex flex-col">
               <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Active Soul</span>
               <span className="text-xs font-cinzel text-gold uppercase">{primaryBuyer.name} ({primaryBuyer.archetype})</span>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-[8px] text-gold uppercase font-bold">Aurels</p>
                <p className="text-sm font-black text-white">{primaryBuyer.currency?.aurels || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] text-purple-400 uppercase font-bold">Shards</p>
                <p className="text-sm font-black text-white">{primaryBuyer.currency?.shards || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] text-red-500 uppercase font-bold">Ichor</p>
                <p className="text-sm font-black text-white">{primaryBuyer.currency?.ichor || 0}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 text-center text-red-900 text-[10px] font-cinzel uppercase italic">
            Thy party is absent. The merchant ignores thy phantom presence.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(shop.inventory || []).map((item) => {
            if (!item) return null;
            
            // Safe access to cost
            const itemCost = item.cost || { aurels: 0, shards: 0, ichor: 0 };
            const affordable = primaryBuyer && canAfford(primaryBuyer, itemCost);
            
            const statsString = item.stats ? Object.entries(item.stats)
              .filter(([_, v]) => v !== undefined && v !== null && v !== 0)
              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
              .join('\n') : '';

            const isCompatible = primaryBuyer && (
              !item.archetypes || 
              item.archetypes.length === 0 || 
              item.archetypes.some(a => a && a.toLowerCase() === (primaryBuyer.archetype as string).toLowerCase())
            );

            return (
              <div key={item.id} className="p-4 bg-black/60 border border-red-900/20 group hover:border-gold/50 transition-all flex flex-col justify-between gap-4">
                <div className="flex gap-4">
                  <div className={`w-12 h-12 border-2 flex items-center justify-center text-lg font-black shrink-0 ${getRarityColor(item.rarity)}`}>
                    {(item.name || "I")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Tooltip 
                      title={item.name || "Nameless Artifact"} 
                      subTitle={`${item.rarity || 'Common'} ${item.type || 'Utility'}`} 
                      content={`${item.description || 'A mysterious item found in the void.'}${statsString ? `\n\n${statsString}` : ''}`}
                    >
                      <h4 className="font-cinzel text-gold text-sm truncate cursor-help hover:text-white transition-colors">
                        {item.name || "Unknown Item"}
                      </h4>
                    </Tooltip>
                    <p className="text-[10px] text-gray-500 truncate italic">{item.description || "No description provided."}</p>
                    
                    {/* Class Compatibility Row */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.archetypes && item.archetypes.length > 0 ? (
                        item.archetypes.map(a => {
                          if (!a) return null;
                          const resonates = primaryBuyer && (a.toLowerCase() === (primaryBuyer.archetype as string).toLowerCase());
                          return (
                            <span 
                              key={a} 
                              className={`text-[7px] px-1.5 py-0.5 border rounded-sm font-cinzel uppercase tracking-tighter transition-all ${
                                resonates 
                                  ? 'bg-gold/20 border-gold text-gold animate-pulse font-black' 
                                  : 'border-red-900/20 text-red-900/40'
                              }`}
                            >
                              {a}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[7px] px-1.5 py-0.5 border border-white/10 text-white/40 rounded-sm font-cinzel uppercase tracking-tighter">
                          Universal Resonance
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-red-900/10">
                  <div className="flex gap-3 items-center">
                    {(itemCost.aurels || 0) > 0 && <span className="text-[10px] text-gold font-bold">● {itemCost.aurels}</span>}
                    {(itemCost.shards || 0) > 0 && <span className="text-[10px] text-purple-400 font-bold">◆ {itemCost.shards}</span>}
                    {(itemCost.ichor || 0) > 0 && <span className="text-[10px] text-red-500 font-bold">▲ {itemCost.ichor}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {affordable && !isCompatible && (
                      <span className="text-[8px] text-red-500 font-cinzel uppercase font-bold hidden sm:block">Fading Resonance</span>
                    )}
                    <button 
                      disabled={!affordable}
                      onClick={() => primaryBuyer && onBuy(item, primaryBuyer.id)}
                      className={`px-4 py-1.5 text-[10px] font-cinzel uppercase border-2 transition-all font-black ${
                        affordable 
                          ? 'border-gold text-gold hover:bg-gold hover:text-black shadow-lg shadow-gold/10' 
                          : 'border-red-900/30 text-red-900/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {affordable ? 'Purchase' : primaryBuyer ? 'Low Resonance' : 'No Soul'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <p className="text-center text-[9px] text-gray-600 font-cinzel uppercase">Wares are manifested from the void and unique to this encounter.</p>
      </div>
    </div>
  );
};

export default ShopModal;
