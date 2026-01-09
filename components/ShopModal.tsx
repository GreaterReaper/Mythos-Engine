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
  if (!shop) return null;
  const primaryBuyer = characters.length > 0 ? characters[0] : null;
  const partyArchetypes = new Set(characters.map(c => (c.archetype as string).toLowerCase()));

  const canAfford = (buyer: Character, cost: Partial<Currency>) => {
    if (!buyer || !buyer.currency) return false;
    return (buyer.currency.aurels >= (cost?.aurels || 0));
  };

  const getRarityColor = (rarity: string | undefined) => {
    switch (rarity) {
      case 'Legendary': return 'text-orange-500 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
      case 'Epic': return 'text-purple-500 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]';
      case 'Rare': return 'text-blue-500 border-blue-500';
      case 'Uncommon': return 'text-emerald-400 border-emerald-400';
      default: return 'text-gray-400 border-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-4xl w-full rune-border bg-[#0c0a09] p-6 md:p-10 space-y-8 overflow-y-auto max-h-[90vh] custom-scrollbar shadow-2xl relative border-emerald-900/60">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-emerald-900 hover:text-white transition-all text-3xl font-black hover:rotate-90"
        >
          ×
        </button>

        <div className="border-b border-emerald-900/40 pb-6">
          <h2 className="text-4xl font-cinzel text-gold tracking-tight">{shop.merchantName || "Spectral Merchant"}</h2>
          <p className="text-xs text-emerald-500/60 italic mt-2 opacity-70">"{shop.merchantAura || "An unsettling presence fills the air."}"</p>
        </div>

        {primaryBuyer ? (
          <div className="flex flex-col md:flex-row justify-between items-center px-5 py-4 bg-black/60 border border-gold/20 rounded-sm gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="w-10 h-10 bg-emerald-900/20 border border-emerald-900/40 rounded-full flex items-center justify-center font-cinzel text-gold text-lg font-black">
                 {primaryBuyer.name[0]}
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-none mb-1">Current Buyer</span>
                  <span className="text-sm font-cinzel text-gold uppercase font-bold">{primaryBuyer.name} <span className="text-emerald-500 ml-1 text-xs">({primaryBuyer.archetype})</span></span>
               </div>
            </div>
            <div className="flex gap-8 w-full md:w-auto justify-center md:justify-end border-t md:border-t-0 border-emerald-900/20 pt-4 md:pt-0">
              <div className="text-center group">
                <p className="text-[9px] text-gold uppercase font-black tracking-tighter mb-1 opacity-60 group-hover:opacity-100 transition-opacity">Total Aurels</p>
                <p className="text-lg font-black text-white leading-none">{primaryBuyer.currency?.aurels || 0}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-emerald-900 text-xs font-cinzel uppercase italic border border-emerald-900/20 bg-emerald-900/5">
            Thy party is absent. The merchant ignores thy phantom presence.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(shop.inventory || []).map((item) => {
            if (!item) return null;
            const itemCost = item.cost || { aurels: 0 };
            const affordable = primaryBuyer && canAfford(primaryBuyer, itemCost);
            const resonancesWithBuyer = primaryBuyer && (!item.archetypes || item.archetypes.length === 0 || item.archetypes.some(a => a && a.toLowerCase() === (primaryBuyer.archetype as string).toLowerCase()));

            return (
              <div key={item.id} className={`p-5 bg-black/40 border border-emerald-900/20 group hover:border-gold/50 transition-all flex flex-col justify-between gap-5 shadow-inner ${resonancesWithBuyer ? 'bg-gold/[0.02]' : ''}`}>
                <div className="flex gap-5">
                  <div className={`w-14 h-14 border-2 flex items-center justify-center text-2xl font-black shrink-0 ${getRarityColor(item.rarity)}`}>
                    {(item.name || "I")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Tooltip title={item.name} subTitle={`${item.rarity} ${item.type}`} content={item.description}>
                      <h4 className="font-cinzel text-gold text-base md:text-lg truncate cursor-help hover:text-white transition-colors leading-tight font-bold">
                        {item.name}
                      </h4>
                    </Tooltip>
                    <p className="text-xs text-gray-500 truncate italic mt-1">{item.description}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-emerald-900/10">
                  <div className="flex gap-4 items-center">
                    <span className="text-xs text-gold font-black flex items-center gap-1.5"><span className="text-[10px] opacity-50">●</span> {itemCost.aurels} AURELS</span>
                  </div>
                  <button 
                    disabled={!affordable}
                    onClick={() => primaryBuyer && onBuy(item, primaryBuyer.id)}
                    className={`px-5 py-2 text-xs font-cinzel uppercase border-2 transition-all font-black tracking-widest ${affordable ? 'border-gold text-gold hover:bg-gold hover:text-black' : 'border-emerald-900/30 text-emerald-900/40 cursor-not-allowed opacity-50'}`}
                  >
                    {affordable ? 'Purchase' : 'Low Resonance'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ShopModal;