import React, { useState, useEffect, useMemo } from 'react';
import { ApiUsage } from '../types';

interface QuotaBannerProps {
  usage: ApiUsage | undefined;
}

const PERSONAL_LIMIT = 1500; 
const GLOBAL_START_VALUE = 2500000; // 2.5 Million units per day

const QuotaBanner: React.FC<QuotaBannerProps> = ({ usage }) => {
  const [timeUntilReset, setTimeUntilReset] = useState('--:--:--');
  const [globalResonance, setGlobalResonance] = useState(GLOBAL_START_VALUE);

  useEffect(() => {
    const calculateStats = () => {
      const now = new Date();
      
      // 1. Calculate time until UTC reset
      const nextReset = new Date();
      nextReset.setUTCHours(24, 0, 0, 0); 
      const diff = nextReset.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeUntilReset('00:00:00');
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setTimeUntilReset(`${pad(h)}:${pad(m)}:${pad(s)}`);
      }

      // 2. Deterministic Global Calculation (Synced via UTC)
      const secondsSinceMidnight = (now.getUTCHours() * 3600) + (now.getUTCMinutes() * 60) + now.getUTCSeconds();
      const baseConsumption = secondsSinceMidnight * 28.935; 
      const flicker = Math.sin(now.getTime() / 1000) * 15;
      const currentGlobal = Math.max(0, Math.floor(GLOBAL_START_VALUE - baseConsumption + flicker));
      setGlobalResonance(currentGlobal);
    };

    const timer = setInterval(calculateStats, 1000);
    calculateStats();
    return () => clearInterval(timer);
  }, []);

  const personalCount = usage?.count || 0;
  const personalRemaining = Math.max(0, PERSONAL_LIMIT - personalCount);
  const personalPercent = Math.max(0, Math.min(100, (personalRemaining / PERSONAL_LIMIT) * 100));
  
  const globalPercent = Math.max(0, Math.min(100, (globalResonance / GLOBAL_START_VALUE) * 100));

  return (
    <div className="w-full bg-[#0c0a09] border-b-2 border-emerald-900/80 px-4 py-2 flex items-center justify-between gap-4 z-[100] relative overflow-hidden h-14 md:h-16 shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
      {/* Immersive background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/30 via-transparent to-emerald-950/30 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gold/20" />
      
      {/* Left: Global Aetheric Convergence */}
      <div className="flex items-center gap-6 shrink-0 relative z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
             <span className="text-[7px] md:text-[9px] font-black font-cinzel text-emerald-500 tracking-[0.2em] uppercase leading-none">Global Convergence (Collective)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 md:w-56 h-2 bg-gray-950 rounded-full overflow-hidden border border-emerald-900/30 shadow-inner">
              <div 
                className="h-full bg-emerald-600 transition-all duration-1000 shadow-[0_0_12px_#059669]" 
                style={{ width: `${globalPercent}%` }} 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-black text-emerald-400 tabular-nums tracking-widest leading-none">{globalResonance.toLocaleString()}</span>
              <span className="text-[6px] text-emerald-900 font-black uppercase mt-0.5">UNITS REMAINING</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: The Void Timer */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
         <span className="text-[7px] md:text-[8px] font-black font-cinzel text-gray-500 uppercase tracking-[0.5em] mb-1">Cycle Turn</span>
         <div className="flex items-center gap-3 bg-black/80 px-4 py-1.5 border border-emerald-900/40 rounded shadow-2xl group">
            <span className="text-sm md:text-xl font-mono font-black text-white tracking-[0.2em] tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] group-hover:text-gold transition-colors">
              {timeUntilReset}
            </span>
         </div>
      </div>

      {/* Right: Personal Reservoir */}
      <div className="flex flex-col items-end shrink-0 relative z-10">
         <span className="text-[7px] md:text-[9px] font-black font-cinzel text-gold tracking-[0.2em] uppercase leading-none mb-1">Thy Personal Well (Singular)</span>
         <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono font-black text-gold tabular-nums leading-none">{personalRemaining}</span>
              <span className="text-[6px] text-gold/40 font-black uppercase mt-0.5">UNITS REMAINING</span>
            </div>
            <div className="w-24 md:w-56 h-2 bg-gray-950 rounded-full overflow-hidden border border-gold/20 shadow-inner">
              <div 
                className={`h-full transition-all duration-1000 ${
                  personalPercent < 20 ? 'bg-red-600 animate-pulse' : 
                  personalPercent < 50 ? 'bg-amber-600' : 
                  'bg-gold'
                } shadow-[0_0_10px_rgba(212,175,55,0.3)]`} 
                style={{ width: `${personalPercent}%` }} 
              />
            </div>
         </div>
      </div>
    </div>
  );
};

export default QuotaBanner;