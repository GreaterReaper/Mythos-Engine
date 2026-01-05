
import React from 'react';

interface SpellSlotManagerProps {
  maxSlots: Record<number, number>;
  currentSlots: Record<number, number>;
  onUseSlot: (level: number) => void;
  onRestoreAll: () => void;
  isReadOnly?: boolean;
}

const SpellSlotManager: React.FC<SpellSlotManagerProps> = ({ 
  maxSlots, 
  currentSlots, 
  onUseSlot, 
  onRestoreAll, 
  isReadOnly 
}) => {
  return (
    <div className="rune-border p-3 bg-red-900/5 space-y-4">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-[10px] font-cinzel text-gold uppercase tracking-widest flex items-center gap-2">
          <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Aetheric Reserves
        </h4>
        {!isReadOnly && (
          <button 
            onClick={onRestoreAll} 
            className="text-[8px] text-red-900 hover:text-gold uppercase font-bold border border-red-900/30 px-2 py-0.5 transition-all active:scale-95"
          >
            Restore All
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {Object.entries(maxSlots).map(([lvl, max]) => {
          const current = currentSlots[parseInt(lvl)] || 0;
          return (
            <div key={lvl} className="flex flex-col items-center bg-black/40 p-1.5 border border-red-900/10">
              <span className="text-[8px] text-gray-500 font-cinzel mb-1 uppercase">Lvl {lvl}</span>
              <div className="flex flex-wrap justify-center gap-0.5 max-w-[40px]">
                {Array.from({ length: max as number }).map((_, i) => (
                  <button
                    key={i}
                    disabled={isReadOnly || i >= current}
                    onClick={() => onUseSlot(parseInt(lvl))}
                    title={i < current ? `Use Level ${lvl} Slot` : `Depleted`}
                    className={`w-3 h-4 border transition-all transform active:scale-90 ${
                      i < current 
                        ? 'bg-gold border-gold shadow-[0_0_5px_rgba(161,98,7,0.4)] hover:bg-white hover:border-white' 
                        : 'bg-black/80 border-red-900/40 opacity-40 grayscale cursor-not-allowed'
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpellSlotManager;
