
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
  
  // Get all unique archetypes currently in the party for filtering
  const partyArchetypes = new Set(characters.map(c => (c.archetype as string).toLowerCase()));

  const canAfford = (buyer: Character, cost: Partial<Currency>) => {
    if (!buyer || !buyer.currency) return false;
    const aurelCost = cost?.aurels || 0;
    const shardCost = cost?.shards || 0;
    const ichorCost = cost?.ichor || 0;

    return (buyer.currency.aurels >= aurelCost) &&
           (buyer.currency.shards >= shardCost) &&
           (buyer.currency.ichor >= ichorCost);
  };

  const getRarityColor = (rarity: string | undefined) => {
    switch (rarity) {
      case 'Legendary': return 'text-orange-500 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
      case 'Epic': return 'text-purple-500 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]';
      case 'Rare': return 'text-blue-500 border-blue-500';
      case 'Uncommon': return 'text-green-500 border-green-500';
      default: return 'text-gray-400 border-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-4xl w-full rune-border bg-[#0c0a09] p-6 md:p-10 space-y-8 overflow-y-auto max-h-[90vh] custom-scrollbar shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-red-900 hover:text-white transition-all text-3xl font-black hover:rotate-90"
        >
          ×
        </button>

        <div className="border-b border-red-900/40 pb-6">
          <h2 className="text-4xl font-cinzel text-gold tracking-tight">{shop.merchantName || "Spectral Merchant"}</h2>
          <p className="text-xs text-gray-500 italic mt-2 opacity-70">"{shop.merchantAura || "An unsettling presence fills the air."}"</p>
        </div>

        {/* Primary Buyer Info Bar */}
        {primaryBuyer ? (
          <div className="flex flex-col md:flex-row justify-between items-center px-5 py-4 bg-black/60 border border-gold/20 rounded-sm gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="w-10 h-10 bg-red-900/20 border border-red-900/40 rounded-full flex items-center justify-center font-cinzel text-gold text-lg font-black">
                 {primaryBuyer.name[0]}
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-none mb-1">Current Buyer</span>
                  <span className="text-sm font-cinzel text-gold uppercase font-bold">{primaryBuyer.name} <span className="text-gray-500 ml-1 text-xs">({primaryBuyer.archetype})</span></span>
               </div>
            </div>
            <div className="flex gap-8 w-full md:w-auto justify-center md:justify-end border-t md:border-t-0 border-red-900/20 pt-4 md:pt-0">
              <div className="text-center group">
                <p className="text-[9px] text-gold uppercase font-black tracking-tighter mb-1 opacity-60 group-hover:opacity-100 transition-opacity">Aurels</p>
                <p className="text-lg font-black text-white leading-none">{primaryBuyer.currency?.aurels || 0}</p>
              </div>
              <div className="text-center group">
                <p className="text-[9px] text-purple-400 uppercase font-black tracking-tighter mb-1 opacity-60 group-hover:opacity-100 transition-opacity">Shards</p>
                <p className="text-lg font-black text-white leading-none">{primaryBuyer.currency?.shards || 0}</p>
              </div>
              <div className="text-center group">
                <p className="text-[9px] text-red-500 uppercase font-black tracking-tighter mb-1 opacity-60 group-hover:opacity-100 transition-opacity">Ichor</p>
                <p className="text-lg font-black text-white leading-none">{primaryBuyer.currency?.ichor || 0}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-red-900 text-xs font-cinzel uppercase italic border border-red-900/20 bg-red-900/5">
            Thy party is absent. The merchant ignores thy phantom presence.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(shop.inventory || []).map((item) => {
            if (!item) return null;
            
            const itemCost = item.cost || { aurels: 0, shards: 0, ichor: 0 };
            const affordable = primaryBuyer && canAfford(primaryBuyer, itemCost);
            
            const statsString = item.stats ? Object.entries(item.stats)
              .filter(([_, v]) => v !== undefined && v !== null && v !== 0)
              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
              .join('\n') : '';

            // Filter item archetypes to ONLY show what is relevant to the party
            const relevantArchetypes = (item.archetypes || []).filter(a => 
              a && partyArchetypes.has(a.toLowerCase())
            );

            const resonancesWithBuyer = primaryBuyer && (
              !item.archetypes || 
              item.archetypes.length === 0 || 
              item.archetypes.some(a => a && a.toLowerCase() === (primaryBuyer.archetype as string).toLowerCase())
            );

            return (
              <div key={item.id} className={`p-5 bg-black/40 border border-red-900/20 group hover:border-gold/50 transition-all flex flex-col justify-between gap-5 shadow-inner ${resonancesWithBuyer ? 'bg-gold/[0.02]' : ''}`}>
                <div className="flex gap-5">
                  <div className={`w-14 h-14 border-2 flex items-center justify-center text-2xl font-black shrink-0 ${getRarityColor(item.rarity)}`}>
                    {(item.name || "I")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Tooltip 
                      title={item.name || "Nameless Artifact"} 
                      subTitle={`${item.rarity || 'Common'} ${item.type || 'Utility'}`} 
                      content={`${item.description || 'A mysterious item found in the void.'}${statsString ? `\n\n${statsString}` : ''}`}
                    >
                      <h4 className="font-cinzel text-gold text-base md:text-lg truncate cursor-help hover:text-white transition-colors leading-tight font-bold">
                        {item.name || "Unknown Item"}
                      </h4>
                    </Tooltip>
                    <p className="text-xs text-gray-500 truncate italic mt-1">{item.description || "No description provided."}</p>
                    
                    {/* Filtered Class Compatibility Row */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {relevantArchetypes.length > 0 ? (
                        relevantArchetypes.map(a => {
                          const isBuyerPath = primaryBuyer && (a.toLowerCase() === (primaryBuyer.archetype as string).toLowerCase());
                          return (
                            <span 
                              key={a} 
                              className={`text-[9px] px-2 py-0.5 border rounded-sm font-cinzel uppercase tracking-widest transition-all font-black ${
                                isBuyerPath 
                                  ? 'bg-gold border-gold text-black shadow-[0_0_10px_rgba(161,98,7,0.4)]' 
                                  : 'border-red-900/40 text-red-900/80 bg-red-900/5'
                              }`}
                            >
                              {a}
                            </span>
                          );
                        })
                      ) : !item.archetypes || item.archetypes.length === 0 ? (
                        <span className="text-[9px] px-2 py-0.5 border border-white/20 text-white/60 rounded-sm font-cinzel uppercase tracking-widest font-bold">
                          Universal Use
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 border border-red-900/10 text-red-900/30 rounded-sm font-cinzel uppercase tracking-widest italic">
                          Mismatched Soul
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-red-900/10">
                  <div className="flex gap-4 items-center">
                    {itemCost.aurels > 0 && <span className="text-xs text-gold font-black flex items-center gap-1.5"><span className="text-[10px] opacity-50">●</span> {itemCost.aurels}</span>}
                    {itemCost.shards > 0 && <span className="text-xs text-purple-400 font-black flex items-center gap-1.5"><span className="text-[10px] opacity-50">◆</span> {itemCost.shards}</span>}
                    {itemCost.ichor > 0 && <span className="text-xs text-red-500 font-black flex items-center gap-1.5"><span className="text-[10px] opacity-50">▲</span> {itemCost.ichor}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={!affordable}
                      onClick={() => primaryBuyer && onBuy(item, primaryBuyer.id)}
                      className={`px-5 py-2 text-xs font-cinzel uppercase border-2 transition-all font-black tracking-widest ${
                        affordable 
                          ? 'border-gold text-gold hover:bg-gold hover:text-black shadow-lg shadow-gold/20' 
                          : 'border-red-900/30 text-red-900/40 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {affordable ? 'Purchase' : 'Low Resonance'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <p className="text-center text-[10px] text-gray-600 font-cinzel uppercase tracking-[0.3em] pt-4 opacity-40">Wares are manifested from the void and unique to this encounter.</p>
      </div>
    </div>
  );
};

export default ShopModal;
