
import React, { useState, useEffect } from 'react';
import { ApiUsage } from '../types';

interface QuotaBannerProps {
  usage: ApiUsage | undefined;
}

const DAILY_LIMIT = 1500; 

const QuotaBanner: React.FC<QuotaBannerProps> = ({ usage }) => {
  const [timeUntilReset, setTimeUntilReset] = useState('--:--:--');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const nextReset = new Date();
      nextReset.setUTCHours(24, 0, 0, 0); 
      const diff = nextReset.getTime() - now.getTime();
      
      if (diff <= 0) return '00:00:00';

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    const timer = setInterval(() => setTimeUntilReset(calculateTimeRemaining()), 1000);
    setTimeUntilReset(calculateTimeRemaining());
    return () => clearInterval(timer);
  }, []);

  const count = usage?.count || 0;
  const remaining = Math.max(0, DAILY_LIMIT - count);
  const percent = Math.max(0, Math.min(100, (remaining / DAILY_LIMIT) * 100));
  
  return (
    <div className="w-full bg-[#0c0a09] border-b-2 border-red-900/80 px-4 py-2 flex items-center justify-between gap-4 z-[100] relative overflow-hidden h-10 md:h-12 shadow-[0_5px_20px_rgba(0,0,0,0.5)]">
      {/* Dynamic atmospheric background */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 via-transparent to-red-950/20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gold/20" />
      
      {/* Left: Reservoir Label & Gauge */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col">
          <span className="text-[7px] md:text-[8px] font-black font-cinzel text-gold tracking-[0.2em] uppercase leading-none mb-1">Aetheric Reservoir</span>
          <div className="flex items-center gap-2">
            <div className="w-24 md:w-40 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-red-900/30">
              <div 
                className={`h-full transition-all duration-1000 shadow-[0_0_10px] ${
                  percent < 20 ? 'bg-red-600 shadow-red-600 animate-pulse' : 
                  percent < 50 ? 'bg-amber-600 shadow-amber-600' : 
                  'bg-gold shadow-gold'
                }`} 
                style={{ width: `${percent}%` }} 
              />
            </div>
            <span className="text-[10px] font-mono font-black text-white tabular-nums">{remaining}</span>
          </div>
        </div>
      </div>

      {/* Center: Hero Celestial Timer */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
         <span className="text-[7px] md:text-[8px] font-black font-cinzel text-red-700 uppercase tracking-[0.4em] mb-0.5">Celestial Cycle</span>
         <div className="flex items-center gap-2 bg-black/40 px-3 py-0.5 border border-red-900/20 rounded-sm">
            <div className="w-1 h-1 rounded-full bg-red-600 animate-ping" />
            <span className="text-sm md:text-lg font-mono font-black text-white tracking-widest tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              {timeUntilReset}
            </span>
         </div>
      </div>

      {/* Right: Reset Label */}
      <div className="hidden md:flex flex-col items-end shrink-0">
         <span className="text-[8px] font-black font-cinzel text-amber-700 uppercase tracking-widest leading-none mb-1">Great Refill</span>
         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter italic">Turning of the Stars</span>
      </div>

      {/* Rune Decorations */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block">
         <span className="text-xs text-gold tracking-[1.5em] font-black">ᚦ ᚢ ᚱ ᛁ ᛊ ᚨ ᛉ</span>
      </div>
    </div>
  );
};

export default QuotaBanner;
