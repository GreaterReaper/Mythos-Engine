
import React from 'react';

interface SpellSlotManagerProps {
  maxSlots: Record<number, number>;
  currentSlots: Record<number, number>;
  onUseSlot: (level: number) => void;
  onRestoreAll: () => void;
  isReadOnly?: boolean;
}

const SpellSlotManager: React.FC<SpellSlotManagerProps> = ({ 
  maxSlots, currentSlots, onUseSlot, onRestoreAll, isReadOnly 
}) => {
  const levels = Object.keys(maxSlots).map(Number).sort((a, b) => a - b);
  if (levels.length === 0) return null;

  return (
    <div className="rune-border p-4 bg-black/80 space-y-6 shadow-2xl relative overflow-hidden group border-amber-900/40">
      <div className="absolute inset-0 bg-amber-900/5 pointer-events-none group-hover:bg-amber-900/10 transition-colors duration-500"></div>
      
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-amber-500/40 flex items-center justify-center bg-amber-900/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <svg className="w-5 h-5 text-amber-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-[12px] font-cinzel text-amber-500 uppercase tracking-[0.2em] font-black">Aetheric Grimoire</h4>
          </div>
        </div>
        {!isReadOnly && (
          <button onClick={onRestoreAll} className="text-[9px] font-cinzel text-amber-700 hover:text-amber-400 uppercase font-black border border-amber-900/30 px-3 py-1.5 bg-amber-900/5 transition-all flex items-center gap-2">
            Refill Wells
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-5 relative z-10">
        {levels.map((lvl) => {
          const max = maxSlots[lvl] || 0;
          const current = currentSlots[lvl] || 0;
          return (
            <div key={lvl} className="flex items-center gap-4 bg-black/40 p-4 border border-amber-900/20 rounded hover:border-amber-500/30 transition-all group/lvl">
              <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-amber-900/20 pr-4">
                <span className="text-[9px] text-amber-900 font-cinzel font-black uppercase">Level</span>
                <span className="text-2xl text-amber-500 font-cinzel leading-none">{lvl}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 flex-1">
                {Array.from({ length: max }).map((_, i) => {
                  const isAvailable = i < current;
                  return (
                    <button
                      key={i} disabled={isReadOnly || !isAvailable} onClick={() => onUseSlot(lvl)}
                      className={`relative w-8 h-8 group/slot transition-all duration-500 ${isAvailable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-30 grayscale'}`}
                    >
                      <div className={`absolute inset-0 rounded border-2 transform rotate-45 transition-colors duration-500 ${isAvailable ? 'border-amber-500/60' : 'border-emerald-900/40'}`}></div>
                      <div className={`absolute inset-1.5 rounded-sm transform rotate-45 transition-all duration-700 ${isAvailable ? 'bg-gradient-to-tr from-amber-600 via-amber-300 to-white shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse' : 'bg-transparent'}`}></div>
                    </button>
                  );
                })}
              </div>
              <div className="text-right ml-auto pl-4 border-l border-amber-900/20 min-w-[70px]">
                <span className={`text-lg font-black font-mono ${current === 0 ? 'text-emerald-900' : 'text-amber-100'}`}>
                  {current}<span className="text-gray-600 mx-1">/</span>{max}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpellSlotManager;
