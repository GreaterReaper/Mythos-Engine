import React, { useState, useMemo } from 'react';
import { Character, Stats, Ability, Item, Archetype, Race, Currency, StatusEffect } from '../types';
import { RECOMMENDED_STATS } from '../constants';
import SpellSlotManager from './SpellSlotManager';
import Tooltip from './Tooltip';
import { manifestSoulLore } from '../geminiService';

interface CharacterSheetProps {
  character: Character;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
  isMentor?: boolean;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onUpdate, isMentor }) => {
  const [activeTab, setActiveTab] = useState<'Stats' | 'Abilities' | 'Inventory' | 'Lore'>('Stats');
  const [lastDeathRoll, setLastDeathRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const getMod = (val: number) => Math.floor((val - 10) / 2);
  const dexMod = getMod(character.stats.dex);
  const strMod = getMod(character.stats.str);

  const equippedItems = useMemo(() => 
    character.inventory.filter(i => character.equippedIds?.includes(i.id)),
  [character.inventory, character.equippedIds]);

  const acCalculation = useMemo(() => {
    let baseAc = 10 + dexMod;
    let shieldBonus = 0;
    equippedItems.forEach(item => {
      if (item.type === 'Armor') {
        const itemAc = item.stats?.ac || 0;
        if (item.name.toLowerCase().includes('shield')) {
          shieldBonus += itemAc;
        } else {
          baseAc = (item.name.toLowerCase().includes('plate') || item.name.toLowerCase().includes('heavy')) ? itemAc : itemAc + dexMod;
        }
      }
    });
    return baseAc + shieldBonus;
  }, [equippedItems, dexMod]);

  const toggleStatus = (effect: StatusEffect) => {
    if (!onUpdate || isMentor) return;
    if (character.activeStatuses.includes(effect)) return;
    onUpdate(character.id, { activeStatuses: [...character.activeStatuses, effect] });
  };

  const handleRollDeathSave = () => {
    if (!onUpdate || isMentor || character.currentHp > 0 || isRolling) return;
    
    setIsRolling(true);
    setLastDeathRoll(null);
    
    // Mimic actual dice roll wait
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 20) + 1;
      setLastDeathRoll(roll);
      setIsRolling(false);
      
      const currentSaves = character.deathSaves || { successes: 0, failures: 0 };
      if (roll >= 10) {
        const next = Math.min(3, currentSaves.successes + 1);
        onUpdate(character.id, { deathSaves: { ...currentSaves, successes: next } });
        if (next === 3) {
          onUpdate(character.id, { currentHp: 1, deathSaves: { successes: 0, failures: 0 } });
          setLastDeathRoll(null);
        }
      } else {
        const next = Math.min(3, currentSaves.failures + 1);
        onUpdate(character.id, { deathSaves: { ...currentSaves, failures: next } });
        if (next === 3) {
          alert(`${character.name}'s soul has shattered and returned to the void.`);
        }
      }
    }, 600);
  };

  const toggleEquip = (itemId: string) => {
    if (!onUpdate || isMentor) return;
    const isEquipped = character.equippedIds.includes(itemId);
    const newEquipped = isEquipped ? character.equippedIds.filter(id => id !== itemId) : [...character.equippedIds, itemId];
    onUpdate(character.id, { equippedIds: newEquipped });
  };

  const handleManifestSpell = (spell: Ability) => {
    if (!onUpdate || !character.spellSlots || spell.type !== 'Spell' || isMentor) return;
    if (spell.levelReq > character.level) return; 

    const baseLevel = spell.baseLevel || 1;
    const availableLevels = Object.keys(character.spellSlots).map(Number).filter(lvl => lvl >= baseLevel && character.spellSlots![lvl] > 0).sort((a, b) => a - b);
    if (availableLevels.length === 0) return;
    const consumeLevel = availableLevels[0];
    onUpdate(character.id, { spellSlots: { ...character.spellSlots, [consumeLevel]: character.spellSlots[consumeLevel] - 1 } });
  };

  const deathSaves = character.deathSaves || { successes: 0, failures: 0 };
  const expThreshold = character.level * 1000;
  const expPercentage = Math.min(100, (character.exp / expThreshold) * 100);

  return (
    <div className="rune-border bg-black/90 backdrop-blur-xl overflow-hidden flex flex-col h-full max-h-[90vh] shadow-2xl border-emerald-900/60">
      <div className="p-4 border-b border-emerald-900/40 bg-emerald-900/10">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl md:text-2xl font-cinzel text-gold truncate font-black">{character.name}</h2>
            <p className="text-[10px] md:text-xs text-emerald-500 font-cinzel uppercase tracking-[0.2em] truncate font-bold">{character.race} {character.archetype} • Lvl {character.level}</p>
          </div>
          <div className="text-right shrink-0">
             <p className={`text-[10px] font-bold uppercase animate-pulse ${isMentor ? 'text-amber-500' : 'text-emerald-500'}`}>{isMentor ? 'MENTOR' : 'BOUND'}</p>
          </div>
        </div>

        {character.currentHp <= 0 ? (
          <div className="mt-4 p-4 bg-red-950/20 border border-red-900/40 rounded-sm animate-pulse space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-cinzel text-red-500 font-black tracking-widest uppercase">Thy soul flickers in the void</p>
              {(lastDeathRoll !== null || isRolling) && (
                <div className={`bg-black border border-red-500/40 px-4 py-1 text-gold font-mono text-xl font-black rounded shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all ${isRolling ? 'animate-bounce' : 'animate-in zoom-in'}`}>
                   {isRolling ? '?' : lastDeathRoll}
                </div>
              )}
            </div>
            <div className="flex flex-col md:flex-row justify-around items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Successes</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-500 ${i <= deathSaves.successes ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_#10b981]' : 'border-emerald-900/40 bg-black/40'}`} />
                  ))}
                </div>
              </div>
              
              <button 
                onClick={handleRollDeathSave} 
                disabled={isRolling}
                className={`relative px-8 py-3 bg-emerald-950 border-2 border-gold text-white font-cinzel text-xs font-black uppercase hover:bg-emerald-900 transition-all shadow-2xl active:scale-95 flex items-center gap-3 ${isRolling ? 'opacity-50 grayscale' : ''}`}
              >
                <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 111.414-1.414l.707.707a1 1 0 010 1.414zM16.243 16.243a1 1 0 01-1.414 0l-.707-.707a1 1 0 111.414-1.414l.707.707a1 1 0 010 1.414z" />
                </svg>
                {isRolling ? 'Grasping...' : 'Roll Death Save (d20)'}
              </button>

              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] text-red-500 font-black uppercase tracking-widest">Failures</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-500 ${i <= deathSaves.failures ? 'bg-red-500 border-red-400 shadow-[0_0_10px_#ef4444]' : 'border-red-900/40 bg-black/40'}`} />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[9px] text-gray-500 text-center uppercase tracking-widest font-black pt-2 border-t border-red-900/10">10 or Higher to Succeed • 3 Failures and the Void Claims Thee</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 gap-2 md:gap-4">
              <div className="bg-black/60 border border-emerald-900/30 p-2 md:p-3 flex flex-col items-center justify-center rounded-sm">
                <span className="text-[9px] font-cinzel text-emerald-500 uppercase font-bold">AC</span>
                <span className="text-xl md:text-2xl font-black text-gold">{acCalculation}</span>
              </div>
              <div className="bg-black/60 border border-emerald-900/30 p-2 md:p-3 flex flex-col items-center justify-center rounded-sm">
                <span className="text-[9px] font-cinzel text-emerald-500 uppercase font-bold">INIT</span>
                <span className="text-xl md:text-2xl font-black text-gold">{dexMod >= 0 ? `+${dexMod}` : dexMod}</span>
              </div>
              <div className="bg-black/60 border border-emerald-900/30 p-2 md:p-3 flex flex-col items-center justify-center rounded-sm"><span className="text-[9px] font-cinzel text-emerald-500 uppercase font-bold">SPD</span><span className="text-xl md:text-2xl font-black text-gold">30</span></div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-cinzel text-emerald-500 w-12 font-black uppercase shrink-0">Vitality</span>
                <div className="flex-1 h-2 bg-gray-950 rounded-full overflow-hidden border border-emerald-900/20">
                  <div className="h-full bg-emerald-700 transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(character.currentHp / character.maxHp) * 100}%` }} />
                </div>
                <span className="text-[10px] font-cinzel text-white min-w-[50px] text-right font-black">{character.currentHp}/{character.maxHp}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-cinzel text-blue-500 w-12 font-black uppercase shrink-0">Soul</span>
                <div className="flex-1 h-1.5 bg-gray-950 rounded-full overflow-hidden border border-blue-900/20">
                  <div className="h-full bg-blue-600 transition-all duration-700 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${expPercentage}%` }} />
                </div>
                <span className="text-[10px] font-cinzel text-white min-w-[50px] text-right font-black">{character.exp}/{expThreshold}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex border-b border-emerald-900/30 text-[10px] font-cinzel bg-black/40 overflow-x-auto no-scrollbar">
        {['Stats', 'Abilities', 'Inventory', 'Lore'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 min-w-[80px] py-3 md:py-4 transition-all uppercase tracking-widest font-black ${activeTab === t ? 'bg-emerald-900/20 text-gold border-b-2 border-gold' : 'text-gray-500 hover:text-gray-300'}`}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-black/20">
        {activeTab === 'Stats' && (
          <div className="space-y-8 pb-4">
            <div className="space-y-3">
               <h3 className="text-[10px] font-cinzel text-emerald-500 uppercase border-b border-emerald-900/20 pb-2 font-black tracking-[0.2em]">Aetheric Blights</h3>
               <div className="flex flex-wrap gap-2">
                 {(['Poisoned', 'Blinded', 'Stunned', 'Frightened', 'Paralyzed', 'Charmed', 'Bleeding'] as StatusEffect[]).map(status => {
                   const isActive = character.activeStatuses.includes(status);
                   return (
                     <button key={status} onClick={() => toggleStatus(status)} disabled={isMentor} className={`px-3 py-1.5 rounded-sm border text-[8px] font-black uppercase tracking-widest transition-all ${isActive ? 'text-red-500 border-red-900/60 bg-red-900/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-white/10 text-white/20 hover:text-white/40'}`}>{status}</button>
                   );
                 })}
               </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(character.stats) as Array<keyof Stats>).map(s => {
                const mod = getMod(character.stats[s]);
                return (
                  <div key={s} className="p-3 border border-emerald-900/20 bg-black/40 rounded-sm shadow-inner group hover:border-gold/20 transition-all">
                    <span className="text-[9px] font-cinzel uppercase text-gray-500 font-bold group-hover:text-gold/50">{s}</span>
                    <div className="flex justify-between items-baseline mt-1"><span className="text-2xl font-black text-gold">{character.stats[s]}</span><span className="text-xs text-emerald-500 font-black">{mod >= 0 ? '+' : ''}{mod}</span></div>
                  </div>
                );
              })}
              <div className="p-3 border border-blue-900/20 bg-blue-900/5 rounded-sm shadow-inner col-span-2 md:col-span-1">
                <span className="text-[9px] font-cinzel uppercase text-blue-700 font-bold">Total Essence</span>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-xl font-black text-blue-400">{character.exp}</span>
                  <span className="text-[8px] text-blue-600 font-black uppercase">Next: {expThreshold}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Abilities' && (
          <div className="space-y-4">
            {[...character.abilities, ...character.spells].map((a, i) => {
              const isUsable = a.levelReq <= character.level;
              return (
                <div key={i} className={`p-4 border-l-2 rounded-r-sm transition-all ${isUsable ? 'bg-emerald-900/5 border-emerald-900 group hover:bg-emerald-900/10' : 'bg-black/40 border-gray-800 opacity-50 grayscale'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-cinzel uppercase font-black tracking-widest ${isUsable ? 'text-gold' : 'text-gray-500'}`}>{a.name}</span>
                      {!isUsable && <span className="text-[8px] text-red-900 uppercase font-black tracking-tighter">Requires Level {a.levelReq}</span>}
                    </div>
                    <span className={`text-[9px] uppercase italic font-bold ${isUsable ? 'text-emerald-500' : 'text-gray-600'}`}>{a.type === 'Spell' ? `Level ${a.baseLevel}` : a.type}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{a.description}</p>
                  {a.type === 'Spell' && !isMentor && isUsable && (
                    <button onClick={() => handleManifestSpell(a)} className="mt-3 px-4 py-1.5 text-[8px] font-black uppercase tracking-widest border border-gold/40 text-gold bg-gold/5 hover:bg-gold hover:text-black transition-all rounded shadow-lg">Manifest Aether</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {activeTab === 'Inventory' && (
          <div className="space-y-6">
            <div className="space-y-3">
              {character.inventory.map((item) => {
                const isEquipped = character.equippedIds?.includes(item.id);
                return (
                  <div key={item.id} className={`p-3 border transition-all flex justify-between items-center rounded-sm ${isEquipped ? 'border-gold bg-gold/5 shadow-[inset_0_0_15px_rgba(212,175,55,0.05)]' : 'border-emerald-900/10 bg-black/40 hover:border-gold/20'}`}>
                    <div className="flex gap-4 items-center min-w-0">
                      <div className={`w-10 h-10 border-2 flex items-center justify-center text-sm font-black shrink-0 border-emerald-900/30 text-emerald-500 transition-all ${isEquipped ? 'scale-110 border-gold text-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]' : ''}`}>
                        {item.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-cinzel truncate font-black tracking-widest ${isEquipped ? 'text-gold' : 'text-gray-200'}`}>{item.name}</p>
                        <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">{item.rarity} • {item.type}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleEquip(item.id)} disabled={isMentor} className={`px-4 py-2 text-[9px] font-cinzel uppercase border-2 transition-all font-black tracking-widest ${isEquipped ? 'bg-gold text-black border-gold shadow-lg shadow-gold/20' : 'border-emerald-900 text-emerald-500 hover:border-gold hover:border-gold'}`}>{isEquipped ? 'Equipped' : 'Equip'}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === 'Lore' && (
          <div className="p-5 bg-emerald-900/10 border-l-4 border-emerald-900 rounded-r-sm space-y-4">
            <h4 className="text-[10px] font-cinzel text-emerald-800 uppercase tracking-[0.4em] font-black border-b border-emerald-900/20 pb-2">The Soul's Echo</h4>
            <p className="text-xs md:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap italic font-medium drop-shadow-sm">{character.biography || "No woven history remains."}</p>
            <div className="pt-4 opacity-10 flex justify-center grayscale">
               <span className="text-[8px] tracking-[0.8em] font-black">ᛟ ᚱ ᛞ ᛖ ᚱ</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;