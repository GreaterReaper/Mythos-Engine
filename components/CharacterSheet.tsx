
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
  const [isEditingLore, setIsEditingLore] = useState(false);
  const [editedBio, setEditedBio] = useState(character.biography || '');
  const [editedDesc, setEditedDesc] = useState(character.description || '');
  const [isWeaving, setIsWeaving] = useState(false);

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
    const isActive = character.activeStatuses.includes(effect);
    if (isActive) {
      // THOU SHALT NOT REMOVE THY OWN BLIGHTS.
      // Reagents or Spells are required for purification.
      return;
    }
    const nextStatuses = [...character.activeStatuses, effect];
    onUpdate(character.id, { activeStatuses: nextStatuses });
  };

  const toggleEquip = (itemId: string) => {
    if (!onUpdate || isMentor) return;
    const currentEquipped = character.equippedIds || [];
    const isEquipped = currentEquipped.includes(itemId);
    const newEquipped = isEquipped ? currentEquipped.filter(id => id !== itemId) : [...currentEquipped, itemId];
    onUpdate(character.id, { equippedIds: newEquipped });
  };

  const handleManifestSpell = (spell: Ability) => {
    if (!onUpdate || !character.spellSlots || spell.type !== 'Spell' || isMentor) return;
    if (spell.levelReq > character.level) return; 

    const baseLevel = spell.baseLevel || 1;
    if (spell.name === 'Exequy') {
      if ((character.spellSlots[9] || 0) <= 0) { alert("Thy wells are dry."); return; }
      if (!confirm("MANIFESTING EXEQUY SHALL VOID ALL THY AETHERIC RESERVES. PROCEED?")) return;
      const drainedSlots = { ...character.spellSlots };
      Object.keys(drainedSlots).forEach(lvl => { drainedSlots[Number(lvl)] = 0; });
      onUpdate(character.id, { spellSlots: drainedSlots });
      return;
    }
    const availableLevels = Object.keys(character.spellSlots).map(Number).filter(lvl => lvl >= baseLevel && character.spellSlots![lvl] > 0).sort((a, b) => a - b);
    if (availableLevels.length === 0) return;
    const consumeLevel = availableLevels[0];
    const newSlots = { ...character.spellSlots, [consumeLevel]: character.spellSlots[consumeLevel] - 1 };
    onUpdate(character.id, { spellSlots: newSlots });
  };

  const isInnateSoulAbility = (ability: Ability) => {
    const innateNames = ['Living Dead', 'Sanguine Link', 'Life Tap', 'Gore Cascade'];
    // These are functionally Level 1 unlocks but visually distinct in the UI.
    return innateNames.includes(ability.name) || character.archetype === Archetype.BloodArtist;
  };

  return (
    <div className="rune-border bg-black/90 backdrop-blur-xl overflow-hidden flex flex-col h-full max-h-[90vh] shadow-2xl border-emerald-900/60">
      <div className="p-4 border-b border-emerald-900/40 bg-emerald-900/10">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-cinzel text-gold truncate">{character.name}</h2>
              {character.asiPoints > 0 && <span className="bg-gold text-black text-[9px] font-bold px-1.5 rounded animate-pulse">ASI</span>}
            </div>
            <p className="text-[10px] md:text-xs text-emerald-500 font-cinzel uppercase tracking-[0.2em] truncate">{character.race} {character.archetype} • Lvl {character.level}</p>
          </div>
          <div className="text-right shrink-0">
             <p className={`text-[10px] font-bold uppercase animate-pulse ${isMentor ? 'text-amber-500' : 'text-emerald-500'}`}>{isMentor ? 'MENTOR' : 'BOUND'}</p>
          </div>
        </div>
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
            <span className="text-[10px] font-cinzel text-emerald-500 w-8 font-black uppercase">HP</span>
            <div className="flex-1 h-2 bg-gray-950 rounded-full overflow-hidden border border-emerald-900/20">
              <div className="h-full bg-emerald-700 transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(character.currentHp / character.maxHp) * 100}%` }} />
            </div>
            <span className="text-[10px] font-cinzel text-white min-w-[50px] text-right font-black">{character.currentHp}/{character.maxHp}</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-emerald-900/30 text-[10px] font-cinzel overflow-x-auto bg-black/40 no-scrollbar">
        {['Stats', 'Abilities', 'Inventory', 'Lore'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 min-w-[80px] py-3 md:py-4 transition-all uppercase tracking-widest ${activeTab === t ? 'bg-emerald-900/20 text-gold border-b-2 border-gold font-bold' : 'text-gray-500 hover:text-gray-300'}`}>{t}</button>
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
                     <button 
                       key={status} 
                       onClick={() => toggleStatus(status)} 
                       disabled={isMentor} 
                       className={`px-3 py-1.5 rounded-sm border text-[8px] font-black uppercase tracking-widest transition-all ${isActive ? 'text-red-500 border-red-900/60 bg-red-900/10 shadow-[0_0_10px_currentColor] cursor-not-allowed' : 'border-white/10 text-white/20 hover:text-white/40'}`}
                       title={isActive ? "This blight is locked. Reagents or Aetheric Spells are required to purge it." : "Mark this soul with a blight."}
                     >
                       {status}
                     </button>
                   );
                 })}
               </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(character.stats) as Array<keyof Stats>).map(s => {
                const isRecommended = RECOMMENDED_STATS[character.archetype]?.includes(s);
                const mod = getMod(character.stats[s]);
                return (
                  <div key={s} className={`p-3 border transition-all relative rounded-sm ${isRecommended ? 'border-gold/50 bg-gold/5 shadow-inner' : 'border-emerald-900/20 bg-black/40'}`}>
                    <span className="text-[9px] font-cinzel uppercase text-gray-500 font-bold">{s}</span>
                    <div className="flex justify-between items-baseline mt-1"><span className="text-2xl font-black text-gold">{character.stats[s]}</span><span className="text-xs text-emerald-500 font-black">{mod >= 0 ? '+' : ''}{mod}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === 'Abilities' && (
          <div className="space-y-4">
            {[...character.abilities, ...character.spells].map((a, i) => {
              const isUsable = a.levelReq <= character.level;
              const isInnate = isInnateSoulAbility(a);
              
              return (
                <div key={i} className={`p-4 border-l-2 rounded-r-sm transition-all ${isUsable ? 'bg-emerald-900/5 border-emerald-900 group hover:bg-emerald-900/10' : 'bg-black/40 border-gray-800 opacity-50 grayscale'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-cinzel uppercase font-black tracking-widest ${isUsable ? (isInnate ? (character.archetype === Archetype.BloodArtist ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]') : 'text-gold') : 'text-gray-500'}`}>
                        {a.name} {isInnate && '†'}
                      </span>
                      {!isUsable && <span className="text-[8px] text-red-900 uppercase font-black tracking-tighter">Requires Level {a.levelReq}</span>}
                      {isInnate && isUsable && <span className="text-[8px] text-emerald-800 uppercase font-black tracking-tighter">Soul-Innate Manifestation</span>}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-[9px] uppercase italic font-bold ${isUsable ? 'text-emerald-500' : 'text-gray-600'}`}>{a.type === 'Spell' ? `Level ${a.baseLevel}` : a.type}</span>
                      {a.type === 'Spell' && !isMentor && (
                        <button 
                          onClick={() => handleManifestSpell(a)} 
                          disabled={!isUsable}
                          className={`mt-2 px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all rounded-sm border ${isUsable ? 'bg-gold/10 text-gold border-gold/40 hover:bg-gold hover:text-black' : 'bg-black/40 text-gray-700 border-gray-800 cursor-not-allowed'}`}
                        >
                          Manifest Aether
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{a.description}</p>
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
                  <div key={item.id} className={`p-3 border transition-all flex justify-between items-center group rounded-sm ${isEquipped ? 'border-gold bg-gold/5' : 'border-emerald-900/10 bg-black/40 hover:border-gold/20 cursor-pointer'}`}>
                    <div className="flex gap-3 items-center min-w-0"><div className={`w-10 h-10 border-2 flex items-center justify-center text-sm font-black shrink-0 rounded-sm border-emerald-900/30 text-emerald-500`}>{item.name[0]}</div><div className="min-w-0"><p className="text-[11px] font-cinzel text-gold truncate uppercase font-black">{item.name}</p><p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">{item.rarity} • {item.type}</p></div></div>
                    <button onClick={(e) => { e.stopPropagation(); toggleEquip(item.id); }} disabled={isMentor} className={`px-4 py-1.5 text-[10px] font-cinzel uppercase border-2 transition-all font-black ${isEquipped ? 'bg-gold text-black border-gold shadow-lg' : 'border-emerald-900 text-emerald-500 hover:border-gold hover:text-gold'}`}>{isEquipped ? 'Equipped' : 'Equip'}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === 'Lore' && (
          <div className="p-5 bg-emerald-900/10 border-l-4 border-emerald-900 rounded-r-sm space-y-3">
            <h4 className="text-[10px] font-cinzel text-emerald-800 uppercase tracking-[0.3em] font-black">History</h4>
            <p className="text-xs md:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap italic font-medium">{character.biography || "The Engine has not yet woven this soul's past."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;
