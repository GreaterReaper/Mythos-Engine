import React, { useState, useMemo } from 'react';
import { Character, Stats, Ability, Item, Archetype, Race, Currency, StatusEffect } from '../types';
import { ARCHETYPE_INFO, SPELL_LIBRARY } from '../constants';
import Tooltip from './Tooltip';

interface CharacterSheetProps {
  character: Character;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
  isMentor?: boolean;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onUpdate, isMentor }) => {
  const [activeTab, setActiveTab] = useState<'Stats' | 'Soul Path' | 'Inventory' | 'Lore'>('Stats');
  const [inventoryFilter, setInventoryFilter] = useState<'Gear' | 'Mundane'>('Gear');
  const [lastDeathRoll, setLastDeathRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const getMod = (val: number) => Math.floor((val - 10) / 2);
  const dexMod = getMod(character.stats.dex);

  // Filter items for tabs
  const filteredInventory = useMemo(() => {
    if (inventoryFilter === 'Gear') {
      return character.inventory.filter(i => i.type === 'Weapon' || i.type === 'Armor');
    }
    return character.inventory.filter(i => i.type === 'Utility' || i.type === 'Quest');
  }, [character.inventory, inventoryFilter]);

  // Aggregate all possible abilities/spells for this archetype to show progression
  const fullSoulPath = useMemo(() => {
    const info = ARCHETYPE_INFO[character.archetype as Archetype];
    if (!info) return [...character.abilities, ...character.spells];

    const allAbilities = [...info.coreAbilities];
    if (info.spells) allAbilities.push(...info.spells);
    
    // Deduplicate by name and sort by level
    const uniqueMap = new Map<string, Ability>();
    allAbilities.forEach(a => uniqueMap.set(a.name, a));
    
    return Array.from(uniqueMap.values()).sort((a, b) => a.levelReq - b.levelReq);
  }, [character.archetype, character.abilities, character.spells]);

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
    const next = character.activeStatuses.includes(effect) 
      ? character.activeStatuses.filter(s => s !== effect)
      : [...character.activeStatuses, effect];
    onUpdate(character.id, { activeStatuses: next });
  };

  const toggleEquip = (itemId: string) => {
    if (!onUpdate || isMentor) return;
    const isEquipped = character.equippedIds.includes(itemId);
    const newEquipped = isEquipped ? character.equippedIds.filter(id => id !== itemId) : [...character.equippedIds, itemId];
    onUpdate(character.id, { equippedIds: newEquipped });
  };

  const handleRollDeathSave = () => {
    if (!onUpdate || isMentor || character.currentHp > 0 || isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 20) + 1;
      setLastDeathRoll(roll);
      setIsRolling(false);
      const currentSaves = character.deathSaves || { successes: 0, failures: 0 };
      if (roll >= 10) {
        const next = Math.min(3, currentSaves.successes + 1);
        onUpdate(character.id, { deathSaves: { ...currentSaves, successes: next } });
        if (next === 3) onUpdate(character.id, { currentHp: 1, deathSaves: { successes: 0, failures: 0 } });
      } else {
        const next = Math.min(3, currentSaves.failures + 1);
        onUpdate(character.id, { deathSaves: { ...currentSaves, failures: next } });
      }
    }, 600);
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
          <div className="mt-4 p-4 bg-red-950/20 border border-red-900/40 rounded-sm animate-pulse space-y-4 text-center">
            <p className="text-[10px] font-cinzel text-red-500 font-black tracking-widest uppercase">Thy soul flickers in the void</p>
            <button onClick={handleRollDeathSave} disabled={isRolling} className="px-8 py-3 bg-emerald-950 border-2 border-gold text-white font-cinzel text-xs font-black uppercase hover:bg-emerald-900 transition-all">
              {isRolling ? 'Grasping...' : 'Roll Death Save'}
            </button>
            <div className="flex justify-center gap-4">
               <span className="text-[8px] text-emerald-500 font-black uppercase">S: {deathSaves.successes}</span>
               <span className="text-[8px] text-red-500 font-black uppercase">F: {deathSaves.failures}</span>
            </div>
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
                <span className="text-xl md:text-2xl font-black text-gold">+{dexMod}</span>
              </div>
              <div className="bg-black/60 border border-emerald-900/30 p-2 md:p-3 flex flex-col items-center justify-center rounded-sm"><span className="text-[9px] font-cinzel text-emerald-500 uppercase font-bold">SPD</span><span className="text-xl md:text-2xl font-black text-gold">30</span></div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-cinzel text-emerald-500 w-12 font-black uppercase shrink-0">Vitality</span>
                <div className="flex-1 h-2 bg-gray-950 rounded-full overflow-hidden border border-emerald-900/20">
                  <div className="h-full bg-emerald-700 transition-all duration-700 shadow-[0_0_10px_#10b981]" style={{ width: `${(character.currentHp / character.maxHp) * 100}%` }} />
                </div>
                <span className="text-[10px] font-cinzel text-white min-w-[50px] text-right font-black">{character.currentHp}/{character.maxHp}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-cinzel text-blue-500 w-12 font-black uppercase shrink-0">Soul</span>
                <div className="flex-1 h-1.5 bg-gray-950 rounded-full overflow-hidden border border-blue-900/20">
                  <div className="h-full bg-blue-600 transition-all duration-700 shadow-[0_0_8px_#3b82f6]" style={{ width: `${expPercentage}%` }} />
                </div>
                <span className="text-[10px] font-cinzel text-white min-w-[50px] text-right font-black">{character.exp}/{expThreshold}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 pt-3 border-t border-emerald-900/20 bg-black/30 py-2.5 rounded-sm">
              <div className="flex items-center gap-2" title="Aurels">
                <span className="text-gold text-[14px] font-black drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]">●</span>
                <span className="text-white font-mono text-[11px] font-black tracking-widest">{character.currency?.aurels || 0} AURELS</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex border-b border-emerald-900/30 text-[10px] font-cinzel bg-black/40 overflow-x-auto no-scrollbar">
        {['Stats', 'Soul Path', 'Inventory', 'Lore'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 min-w-[80px] py-3 md:py-4 transition-all uppercase tracking-widest font-black ${activeTab === t ? 'bg-emerald-900/20 text-gold border-b-2 border-gold' : 'text-gray-500 hover:text-gray-300'}`}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-black/20">
        {activeTab === 'Stats' && (
          <div className="space-y-8 pb-4">
            <div className="space-y-3">
               <h3 className="text-[10px] font-cinzel text-emerald-500 uppercase border-b border-emerald-900/20 pb-2 font-black tracking-[0.2em]">Aetheric Blights</h3>
               <div className="flex flex-wrap gap-2">
                 {['Poisoned', 'Blinded', 'Stunned', 'Frightened', 'Paralyzed', 'Charmed', 'Bleeding'].map(status => {
                   const isActive = character.activeStatuses.includes(status as StatusEffect);
                   return (
                     <button key={status} onClick={() => toggleStatus(status as StatusEffect)} disabled={isMentor} className={`px-3 py-1.5 rounded-sm border text-[8px] font-black uppercase tracking-widest transition-all ${isActive ? 'text-red-500 border-red-900/60 bg-red-900/10 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-white/10 text-white/20 hover:text-white/40'}`}>{status}</button>
                   );
                 })}
               </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(character.stats) as Array<keyof Stats>).map(s => {
                const mod = getMod(character.stats[s]);
                return (
                  <div key={s} className="p-3 border border-emerald-900/20 bg-black/40 rounded-sm shadow-inner group hover:border-gold/30 transition-all">
                    <span className="text-[9px] font-cinzel uppercase text-gray-500 font-bold group-hover:text-gold/50">{s}</span>
                    <div className="flex justify-between items-baseline mt-1"><span className="text-2xl font-black text-gold">{character.stats[s]}</span><span className="text-xs text-emerald-500 font-black">{mod >= 0 ? '+' : ''}{mod}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {activeTab === 'Soul Path' && (
          <div className="space-y-6">
            <div className="border-l border-emerald-900/30 space-y-4 ml-2 pl-6 relative">
              {fullSoulPath.map((a, i) => {
                const isUnlocked = a.levelReq <= character.level;
                return (
                  <div key={i} className="relative">
                    {/* Connection Node */}
                    <div className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 transform rotate-45 z-10 transition-all duration-700 ${isUnlocked ? 'bg-gold border-gold shadow-[0_0_8px_#d4af37]' : 'bg-black border-emerald-900/50'}`} />
                    
                    <div className={`p-4 border-l-2 rounded-r-sm transition-all duration-500 ${isUnlocked ? 'bg-emerald-900/5 border-gold shadow-[inset_0_0_15px_rgba(212,175,55,0.03)]' : 'bg-black/40 border-gray-800 opacity-40 grayscale'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <span className={`text-[11px] font-cinzel uppercase font-black tracking-widest ${isUnlocked ? 'text-gold' : 'text-gray-500'}`}>{a.name}</span>
                          {!isUnlocked && <span className="text-[7px] text-red-900 uppercase font-black tracking-widest mt-0.5">Latent: Level {a.levelReq} Required</span>}
                        </div>
                        <span className={`text-[8px] uppercase italic font-black px-1.5 py-0.5 rounded-sm ${isUnlocked ? 'text-emerald-500 bg-emerald-900/20 border border-emerald-900/40' : 'text-gray-600 border border-gray-800'}`}>{a.type}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">"{a.description}"</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {fullSoulPath.length === 0 && (
              <p className="text-center py-12 text-[10px] font-cinzel text-emerald-900 uppercase italic">The aether yields no path for this archetype.</p>
            )}
          </div>
        )}

        {activeTab === 'Inventory' && (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-black/40 rounded border border-emerald-900/20">
              <button onClick={() => setInventoryFilter('Gear')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all rounded-sm ${inventoryFilter === 'Gear' ? 'bg-emerald-900/30 text-gold shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}>Gear</button>
              <button onClick={() => setInventoryFilter('Mundane')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all rounded-sm ${inventoryFilter === 'Mundane' ? 'bg-emerald-900/30 text-gold shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}>Mundane</button>
            </div>
            
            <div className="space-y-3">
              {filteredInventory.map((item) => {
                const isEquipped = character.equippedIds?.includes(item.id);
                return (
                  <div key={item.id} className={`p-3 border transition-all flex justify-between items-center rounded-sm ${isEquipped ? 'border-gold bg-gold/[0.02] shadow-[inset_0_0_20px_rgba(212,175,55,0.02)]' : 'border-emerald-900/10 bg-black/40 hover:border-gold/20'}`}>
                    <div className="flex gap-4 items-center min-w-0">
                      <div className={`w-10 h-10 border-2 flex items-center justify-center text-sm font-black shrink-0 transition-all duration-500 ${isEquipped ? 'scale-110 border-gold text-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'border-emerald-900/30 text-emerald-500'}`}>
                        {item.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-cinzel truncate font-black tracking-widest ${isEquipped ? 'text-gold' : 'text-gray-200'}`}>{item.name}</p>
                        <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">{item.rarity} • {item.type}</p>
                      </div>
                    </div>
                    {inventoryFilter === 'Gear' ? (
                      <button onClick={() => toggleEquip(item.id)} disabled={isMentor} className={`px-4 py-2 text-[9px] font-cinzel uppercase border-2 transition-all font-black tracking-widest ${isEquipped ? 'bg-gold text-black border-gold shadow-lg shadow-gold/20' : 'border-emerald-900 text-emerald-500 hover:border-gold active:scale-95'}`}>{isEquipped ? 'Equipped' : 'Equip'}</button>
                    ) : (
                       <span className="text-[8px] text-emerald-900 uppercase font-black tracking-widest px-2 italic">Stored</span>
                    )}
                  </div>
                );
              })}
              {filteredInventory.length === 0 && (
                <div className="py-16 text-center bg-emerald-950/5 border border-dashed border-emerald-900/20">
                   <p className="text-[10px] font-cinzel text-emerald-900 uppercase italic font-bold">Empty resonance in this category.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Lore' && (
          <div className="p-5 bg-emerald-900/10 border-l-4 border-emerald-900 rounded-r-sm space-y-4 shadow-xl">
            <h4 className="text-[10px] font-cinzel text-emerald-800 uppercase tracking-[0.4em] font-black border-b border-emerald-900/20 pb-2">The Soul's Echo</h4>
            <p className="text-xs text-gray-200 leading-relaxed italic font-medium whitespace-pre-wrap">{character.biography || "No woven history remains. The Great Well is silent."}</p>
            <div className="pt-4 flex justify-center opacity-10">
               <span className="text-[8px] tracking-[1em] font-black uppercase">ᛟ ᚱ ᛞ ᛖ ᚱ</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;