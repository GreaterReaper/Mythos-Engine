import React from 'react';
import { RULES_MANIFEST } from '../constants';

const RulesScreen: React.FC = () => {
  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto">
      <div className="border-b border-emerald-900 pb-4">
        <h2 className="text-4xl font-cinzel text-gold">Ancient Laws</h2>
        <p className="text-gray-500 italic">"The laws of the Engine are written in obsidian and necrotic emerald."</p>
      </div>

      <div className="rune-border p-6 md:p-10 bg-[#0c0a09]/80 backdrop-blur shadow-2xl relative border-emerald-900/60">
        <div className="absolute top-4 right-4 text-emerald-900 opacity-20 pointer-events-none">
           <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
             <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12V13a1 1 0 00.528.87l3.5 1.944a1 1 0 00.944 0l3.5-1.944A1 1 0 0014 13v-2.88l1.69-.723a1 1 0 011.31.554l.036.086A1 1 0 0115.352 12l-5.352 2.294-5.352-2.294a1 1 0 01-.648-1.313l.036-.086a1 1 0 011.31-.554z" />
           </svg>
        </div>
        <div className="relative z-10 prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap leading-loose text-sm md:text-base text-gray-300 font-medium">
            {RULES_MANIFEST}
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-emerald-900/20 flex justify-center">
           <div className="text-[10px] text-gold tracking-[0.5em] font-black uppercase">ᛟ ᚱ ᛞ ᛖ ᚱ • ᚺ ᚨ ᛟ ᛊ</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-5 bg-emerald-900/5 border border-emerald-900/20 rounded">
          <h4 className="font-cinzel text-emerald-800 uppercase text-xs mb-2 font-bold">The Arbiter</h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">The Gemini 3 Flash AI serves as the ultimate arbiter of fate. Its word is law, calculating dice outcomes with high-speed tactical precision based on thy attributes.</p>
        </div>
        <div className="p-5 bg-gold/5 border border-gold/20 rounded">
          <h4 className="font-cinzel text-gold uppercase text-xs mb-2 font-bold">Ascension</h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">Every 1,000 EXP times thy current level triggers Ascension. With each level, thy soul grows in power, unlocking new paths and spells in the Flash protocol.</p>
        </div>
        <div className="p-5 bg-emerald-950/20 border border-gold/40 rounded shadow-[0_0_15px_rgba(212,175,55,0.1)]">
          <h4 className="font-cinzel text-gold uppercase text-xs mb-2 font-bold">Legendary Deeds</h4>
          <p className="text-[10px] text-gray-300 leading-relaxed">The Arbiter rarely grants unique **Legendary Boons** for high-stakes successes (Nat 20s), profound sacrificial roleplay, or class-perfect tactics. These powers are permanent and unique to thy soul's journey.</p>
        </div>
      </div>
    </div>
  );
};

export default RulesScreen;