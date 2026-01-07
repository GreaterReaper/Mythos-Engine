
import React, { useState, useMemo } from 'react';
import { Character, Stats, Ability, Item, Archetype, Race, Currency } from '../types';
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
  const [arcaneMemoryActive, setArcaneMemoryActive] = useState(false);
  const [arcaneMemoryUsed, setArcaneMemoryUsed] = useState(false);
  const [comparingItemId, setComparingItemId] = useState<string | null>(null);

  const getMod = (val: number) => Math.floor((val - 10) / 2);

  const dexMod = getMod(character.stats.dex);
  const strMod = getMod(character.stats.str);

  const nextLevelExp = character.level * 1000;
  const expProgress = (character.exp / nextLevelExp) * 100;

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
          if (item.name.toLowerCase().includes('plate') || item.name.toLowerCase().includes('heavy')) {
            baseAc = itemAc;
          } else {
            baseAc = itemAc + dexMod;
          }
        }
      }
    });

    return baseAc + shieldBonus;
  }, [equippedItems, dexMod]);

  const attacks = useMemo(() => {
    return equippedItems.filter(i => i.type === 'Weapon').map(weapon => {
      const isRanged = weapon.archetypes?.includes(Archetype.Archer) || weapon.name.toLowerCase().includes('bow');
      const mod = isRanged ? dexMod : strMod;
      const toHit = mod + (Math.floor(character.level / 4) + 2);
      
      return {
        name: weapon.name,
        toHit: `+${toHit}`,
        damage: `${weapon.stats?.damage || '1d4'} ${mod >= 0 ? '+' : ''}${mod}`,
        type: isRanged ? 'Ranged' : 'Melee'
      };
    });
  }, [equippedItems, dexMod, strMod, character.level]);

  const handleStatUp = (stat: keyof Stats) => {
    if (!onUpdate || character.asiPoints <= 0) return;
    const newStats = { ...character.stats, [stat]: character.stats[stat] + 1 };
    let updates: Partial<Character> = { stats: newStats, asiPoints: character.asiPoints - 1 };
    if (stat === 'con') {
      const oldMod = getMod(character.stats.con);
      const newMod = getMod(newStats.con);
      if (newMod > oldMod) {
        updates.maxHp = character.maxHp + character.level;
        updates.currentHp = character.currentHp + character.level;
      }
    }
    onUpdate(character.id, updates);
  };

  const toggleEquip = (itemId: string) => {
    if (!onUpdate || isMentor) return;
    const currentEquipped = character.equippedIds || [];
    const isEquipped = currentEquipped.includes(itemId);
    const newEquipped = isEquipped 
      ? currentEquipped.filter(id => id !== itemId)
      : [...currentEquipped, itemId];
    onUpdate(character.id, { equippedIds: newEquipped });
    setComparingItemId(null);
  };

  const handleAutoEquip = () => {
    if (!onUpdate || isMentor) return;
    const allIds = character.inventory.map(i => i.id);
    onUpdate(character.id, { equippedIds: allIds });
  };

  const handleUseSlot = (level: number) => {
    if (!onUpdate || !character.spellSlots || character.spellSlots[level] <= 0) return;
    const newSlots = { ...character.spellSlots, [level]: character.spellSlots[level] - 1 };
    onUpdate(character.id, { spellSlots: newSlots });
  };

  const handleRestoreSlots = () => {
    if (!onUpdate || !character.maxSpellSlots) return;
    setArcaneMemoryUsed(false);
    onUpdate(character.id, { spellSlots: { ...character.maxSpellSlots } });
  };

  const handleManifestSpell = (spell: Ability) => {
    if (!onUpdate || !character.spellSlots || spell.type !== 'Spell' || isMentor) return;
    
    const baseLevel = spell.baseLevel || 1;
    
    if (spell.name === 'Exequy') {
      if ((character.spellSlots[9] || 0) <= 0) {
        alert("Thy 9th level wells are dry. Exequy requires a fragment of ultimate power to ignite.");
        return;
      }
      
      if (!confirm("MANIFESTING EXEQUY SHALL VOID ALL THY AETHERIC RESERVES. EVERY SLOT SHALL BE CONSUMED TO FUEL THE END. PROCEED?")) return;

      const drainedSlots = { ...character.spellSlots };
      Object.keys(drainedSlots).forEach(lvl => {
        drainedSlots[Number(lvl)] = 0;
      });
      
      setArcaneMemoryActive(false);
      
      onUpdate(character.id, { spellSlots: drainedSlots });
      alert("THE END IS NIGH. Thy soul is hollowed as Exequy deletes the target from existence.");
      return;
    }

    if (arcaneMemoryActive) {
      if (arcaneMemoryUsed) {
        alert("Thy Arcane Memory is spent for this cycle.");
        return;
      }
      setArcaneMemoryUsed(true);
      setArcaneMemoryActive(false);
      alert(`Manifested ${spell.name} through the sheer force of thy memory.`);
      return;
    }

    const availableLevels = Object.keys(character.spellSlots)
      .map(Number)
      .filter(lvl => lvl >= baseLevel && character.spellSlots![lvl] > 0)
      .sort((a, b) => a - b);
    
    if (availableLevels.length === 0) {
      alert(`Thy wells of level ${baseLevel} or higher are dry.`);
      return;
    }
    
    const consumeLevel = availableLevels[0];
    const newSlots = { ...character.spellSlots, [consumeLevel]: character.spellSlots[consumeLevel] - 1 };
    onUpdate(character.id, { spellSlots: newSlots });
  };

  const saveLore = () => {
    if (!onUpdate) return;
    onUpdate(character.id, { biography: editedBio, description: editedDesc });
    setIsEditingLore(false);
  };

  const handleManifestNewLore = async () => {
    setIsWeaving(true);
    try {
      const lore = await manifestSoulLore({ 
        name: character.name,
        race: character.race as Race, 
        archetype: character.archetype as Archetype, 
        level: character.level,
        age: character.age,
        gender: character.gender
      });
      setEditedBio(lore.biography);
      setEditedDesc(lore.description);
    } catch (e) {
      console.error("Lore weaving failed:", e);
    } finally {
      setIsWeaving(false);
    }
  };

  const recommendedForArch = useMemo(() => RECOMMENDED_STATS[character.archetype] || [], [character.archetype]);

  const isCaster = !!(character.maxSpellSlots && Object.keys(character.maxSpellSlots).length > 0);
  const hasArcaneMemory = character.abilities.some(a => a.name === 'Arcane Memory');

  // ITEM COMPARISON LOGIC
  const comparisonData = useMemo(() => {
    if (!comparingItemId) return null;
    const newItem = character.inventory.find(i => i.id === comparingItemId);
    if (!newItem || newItem.type === 'Utility' || newItem.type === 'Quest') return null;

    // Find equipped item of the same type
    const equipped = equippedItems.find(i => i.type === newItem.type);
    if (!equipped) return { newItem, equipped: null, deltas: newItem.stats || {} };

    const deltas: Record<string, number | string> = {};
    const allKeys = new Set([
      ...Object.keys(newItem.stats || {}),
      ...Object.keys(equipped.stats || {})
    ]);

    allKeys.forEach(key => {
      const newVal = newItem.stats?.[key as keyof Stats] || 0;
      const oldVal = equipped.stats?.[key as keyof Stats] || 0;
      
      if (typeof newVal === 'number' && typeof oldVal === 'number') {
        deltas[key] = newVal - oldVal;
      } else if (key === 'damage') {
        deltas[key] = `${equipped.stats?.[key as keyof Stats]} → ${newItem.stats?.[key as keyof Stats]}`;
      }
    });

    return { newItem, equipped, deltas };
  }, [comparingItemId, character.inventory, equippedItems]);

  return (
    <div className="rune-border bg-black/90 backdrop-blur-xl overflow-hidden flex flex-col h-full max-h-[90vh] shadow-2xl">
      {/* Header Info */}
      <div className="p-4 border-b border-red-900/40 bg-red-900/10">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-cinzel text-gold truncate">{character.name}</h2>
              {character.asiPoints > 0 && <span className="bg-gold text-black text-[9px] font-bold px-1.5 rounded animate-pulse">ASI</span>}
              {character.isPrimarySoul && <span className="bg-red-900 text-white text-[8px] font-bold px-1.5 rounded uppercase animate-pulse">User</span>}
            </div>
            <p className="text-[10px] md:text-xs text-red-700 font-cinzel uppercase tracking-[0.2em] truncate">{character.race} {character.archetype} • Lvl {character.level}</p>
          </div>
          <div className="text-right shrink-0">
             <p className="text-[9px] text-gray-500 font-cinzel uppercase font-bold tracking-tighter">Essence</p>
             <p className={`text-[10px] font-bold uppercase animate-pulse ${isMentor ? 'text-amber-500' : character.isPrimarySoul ? 'text-red-500' : 'text-green-500'}`}>
               {isMentor ? 'MENTOR' : character.isPrimarySoul ? 'PRIMARY SOUL' : 'BOUND'}
             </p>
          </div>
        </div>

        {/* Combat Vitals */}
        <div className="mt-6 grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-black/60 border border-red-900/30 p-2 md:p-3 flex flex-col items-center justify-center rounded-sm">
            <span className="text-[9px] font-cinzel text-red-900 uppercase font-bold">AC</span>
            <span className="text-xl md:text-2xl font-black text-gold">{acCalculation}</span>
          </div>
          <div className="bg-black/60 border border-red-900/30 p-2 md:p-3 flex flex-col items-center justify-center rounded-sm">
            <span className="text-[9px] font-cinzel text-red-900 uppercase font-bold">INIT</span>
            <span className="text-xl md:text-2xl font-black text-gold">{dexMod >= 0 ? `+${dexMod}` : dexMod}</span>
          </div>
          <div className="bg-black/60 border border-red-900/30 p-2 md:p-3 flex flex-col items-center justify-center rounded-sm">
            <span className="text-[9px] font-cinzel text-red-900 uppercase font-bold">SPD</span>
            <span className="text-xl md:text-2xl font-black text-gold">30</span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-cinzel text-red-900 w-8 font-black uppercase">HP</span>
            <div className="flex-1 h-2 bg-gray-950 rounded-full overflow-hidden border border-red-900/20">
              <div className="h-full bg-red-900 transition-all duration-700 shadow-[0_0_10px_rgba(127,29,29,0.5)]" style={{ width: `${(character.currentHp / character.maxHp) * 100}%` }} />
            </div>
            <span className="text-[10px] font-cinzel text-white min-w-[50px] text-right font-black">{character.currentHp}/{character.maxHp}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-cinzel text-gold w-8 font-black uppercase">XP</span>
            <div className="flex-1 h-1.5 bg-gray-950 rounded-full overflow-hidden border border-gold/10">
              <div className="h-full bg-gold transition-all duration-1000 shadow-[0_0_8px_rgba(212,175,55,0.4)]" style={{ width: `${expProgress}%` }} />
            </div>
            <span className="text-[10px] font-cinzel text-gray-400 min-w-[50px] text-right font-black">{character.exp}/{nextLevelExp}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-red-900/30 text-[10px] font-cinzel overflow-x-auto whitespace-nowrap bg-black/40 no-scrollbar">
        {['Stats', 'Abilities', 'Inventory', 'Lore'].map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t as any)} 
            className={`flex-1 min-w-[80px] py-3 md:py-4 transition-all uppercase tracking-widest ${activeTab === t ? 'bg-red-900/20 text-gold border-b-2 border-gold font-bold' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-black/20">
        {activeTab === 'Stats' && (
          <div className="space-y-8 pb-4">
            {/* Vault (Currency) */}
            <div className="space-y-3">
               <h3 className="text-[10px] font-cinzel text-gold uppercase border-b border-gold/20 pb-2 font-black tracking-[0.2em]">The Vault (DM Tracked)</h3>
               <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black/60 border border-gold/30 p-2 flex flex-col items-center rounded-sm">
                    <span className="text-[8px] text-gold uppercase font-bold mb-1">Aurels</span>
                    <span className="text-sm font-black text-white">{character.currency?.aurels || 0}</span>
                  </div>
                  <div className="bg-black/60 border border-purple-900/30 p-2 flex flex-col items-center rounded-sm">
                    <span className="text-[8px] text-purple-400 uppercase font-bold mb-1">Shards</span>
                    <span className="text-sm font-black text-white">{character.currency?.shards || 0}</span>
                  </div>
                  <div className="bg-black/60 border border-red-900/30 p-2 flex flex-col items-center rounded-sm">
                    <span className="text-[8px] text-red-500 uppercase font-bold mb-1">Ichor</span>
                    <span className="text-sm font-black text-white">{character.currency?.ichor || 0}</span>
                  </div>
               </div>
            </div>

            {/* Spell Slots - Dedicated Caster UI Section */}
            {isCaster && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex justify-between items-center border-b border-gold/20 pb-2">
                   <h3 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-[0.2em]">Aetheric Weaving</h3>
                   {hasArcaneMemory && !isMentor && (
                     <button 
                       onClick={() => !arcaneMemoryUsed && setArcaneMemoryActive(!arcaneMemoryActive)}
                       disabled={arcaneMemoryUsed}
                       className={`px-3 py-1 text-[8px] font-black uppercase border rounded transition-all ${arcaneMemoryUsed ? 'border-red-900/20 text-gray-700' : arcaneMemoryActive ? 'bg-amber-600 text-black border-gold shadow-[0_0_10px_#d4af37]' : 'border-amber-600 text-amber-600 hover:bg-amber-900/20'}`}
                     >
                       {arcaneMemoryUsed ? 'Arcane Memory Spent' : arcaneMemoryActive ? 'Bypassing Slot Cost' : 'Use Arcane Memory'}
                     </button>
                   )}
                </div>
                <SpellSlotManager 
                  maxSlots={character.maxSpellSlots!}
                  currentSlots={character.spellSlots || {}}
                  onUseSlot={handleUseSlot}
                  onRestoreAll={handleRestoreSlots}
                  isReadOnly={!!isMentor}
                />
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(character.stats) as Array<keyof Stats>).map(s => {
                const isRecommended = recommendedForArch.includes(s);
                const mod = getMod(character.stats[s]);
                return (
                  <div key={s} className={`p-3 border transition-all relative rounded-sm ${isRecommended ? 'border-gold/50 bg-gold/5 shadow-inner' : 'border-red-900/20 bg-black/40'}`}>
                    <span className="text-[9px] font-cinzel uppercase text-gray-500 font-bold">{s}</span>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-2xl font-black text-gold">{character.stats[s]}</span>
                      <span className="text-xs text-red-900 font-black">{mod >= 0 ? '+' : ''}{mod}</span>
                    </div>
                    {character.asiPoints > 0 && !isMentor && (
                      <button onClick={() => handleStatUp(s)} className="absolute -top-2 -right-2 w-6 h-6 bg-gold text-black text-sm font-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">+</button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
               <h3 className="text-[10px] font-cinzel text-red-900 uppercase border-b border-red-900/20 pb-2 font-black tracking-[0.2em]">Arsenal (Equipped)</h3>
               <div className="space-y-2">
                 {attacks.length > 0 ? (
                   attacks.map((atk, i) => (
                     <div key={i} className="bg-black/60 border border-red-900/20 p-3 flex justify-between items-center text-[11px] rounded-sm hover:border-gold/30 transition-colors">
                       <div className="min-w-0 flex-1">
                         <p className="text-gold font-cinzel uppercase truncate font-bold">{atk.name}</p>
                         <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">{atk.type}</p>
                       </div>
                       <div className="flex gap-4 md:gap-8 shrink-0">
                          <div className="text-center">
                            <p className="text-[9px] text-red-900 font-cinzel uppercase font-bold">To Hit</p>
                            <p className="font-black text-white">{atk.toHit}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-red-900 font-cinzel uppercase font-bold">Damage</p>
                            <p className="font-black text-white whitespace-nowrap">{atk.damage}</p>
                          </div>
                       </div>
                     </div>
                   ))
                 ) : (
                   <p className="text-[10px] text-gray-600 italic py-2">No weapons gripped by this soul.</p>
                 )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'Abilities' && (
          <div className="space-y-4">
            {[...character.abilities, ...character.spells].map((a, i) => (
              <div key={i} className="p-4 bg-red-900/5 border-l-2 border-red-900 group hover:bg-red-900/10 transition-all rounded-r-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[11px] font-cinzel text-gold uppercase font-black tracking-widest">{a.name}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-red-900 uppercase italic font-bold">{a.type === 'Spell' ? `Level ${a.baseLevel}` : a.type}</span>
                    {a.type === 'Spell' && !isMentor && (
                      <button 
                        onClick={() => handleManifestSpell(a)}
                        className={`mt-2 px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all rounded-sm border ${
                          a.name === 'Exequy' 
                            ? 'bg-red-950 text-red-500 border-red-800 hover:bg-red-900 shadow-[0_0_10px_#991b1b]' 
                            : 'bg-gold/10 text-gold border-gold/40 hover:bg-gold hover:text-black'
                        }`}
                      >
                        Manifest {a.name === 'Exequy' ? 'Oblivion' : (arcaneMemoryActive ? 'via Memory' : 'Aether')}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{a.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Inventory' && (
          <div className="space-y-6">
            {!isMentor && (
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-cinzel text-red-900 uppercase font-black tracking-widest">Soul Satchel</h3>
                <button 
                  onClick={handleAutoEquip}
                  className="text-[10px] font-cinzel text-gold bg-gold/10 border border-gold/40 px-3 py-1.5 hover:bg-gold/20 transition-all flex items-center gap-2"
                >
                   <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                     <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM15 10a5 5 0 11-10 0 5 5 0 0110 0z" />
                   </svg>
                   Equip All
                </button>
              </div>
            )}

            {/* COMPARISON PANEL */}
            {comparisonData && (
              <div className="rune-border p-4 bg-amber-900/10 border-gold/40 animate-in slide-in-from-top-4 duration-500 space-y-4">
                 <div className="flex justify-between items-center border-b border-gold/20 pb-2">
                    <h4 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-widest">Soul Resonance Comparison</h4>
                    <button onClick={() => setComparingItemId(null)} className="text-gold/40 hover:text-white text-xs">×</button>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                       <p className="text-[9px] text-gray-500 uppercase font-black">Equipped: {comparisonData.equipped?.name || 'Nothing'}</p>
                       <div className="grid grid-cols-1 gap-1">
                          {Object.entries(comparisonData.deltas).map(([key, delta]) => {
                            if (key === 'damage') return (
                              <div key={key} className="flex justify-between text-[10px] py-1 border-b border-white/5">
                                 <span className="uppercase text-gray-400">{key}</span>
                                 <span className="text-white font-mono">{delta}</span>
                              </div>
                            );
                            const val = delta as number;
                            return (
                              <div key={key} className="flex justify-between text-[10px] py-1 border-b border-white/5">
                                 <span className="uppercase text-gray-400">{key}</span>
                                 <span className={`font-black font-mono ${val > 0 ? 'text-green-500' : val < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {val > 0 ? `+${val}` : val}
                                 </span>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                    <div className="w-1/3 flex flex-col justify-center items-center bg-black/40 border border-gold/20 p-4 rounded-sm">
                        <div className={`w-12 h-12 border-2 ${
                          comparisonData.newItem.rarity === 'Legendary' ? 'border-orange-500' : 
                          comparisonData.newItem.rarity === 'Epic' ? 'border-purple-500' : 'border-gold/40'
                        } bg-black flex items-center justify-center font-cinzel text-xl font-black text-white mb-2 shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                          {comparisonData.newItem.name[0]}
                        </div>
                        <button 
                          onClick={() => toggleEquip(comparisonData.newItem.id)}
                          className="w-full py-2 bg-gold text-black font-cinzel text-[10px] font-black uppercase tracking-tighter hover:bg-white transition-all shadow-lg"
                        >
                          Bind Now
                        </button>
                    </div>
                 </div>
              </div>
            )}

            <div className="space-y-3">
              {character.inventory.map((item) => {
                const isEquipped = character.equippedIds?.includes(item.id);
                const isComparing = comparingItemId === item.id;
                const canCompare = !isEquipped && (item.type === 'Weapon' || item.type === 'Armor');

                return (
                  <div 
                    key={item.id} 
                    onClick={() => canCompare && setComparingItemId(item.id)}
                    className={`p-3 border transition-all flex justify-between items-center group rounded-sm relative ${
                      isEquipped ? 'border-gold bg-gold/5' : 
                      isComparing ? 'border-gold shadow-[0_0_10px_#d4af37]' : 
                      'border-red-900/10 bg-black/40 hover:border-gold/20 cursor-pointer'
                    }`}
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className={`w-10 h-10 border-2 flex items-center justify-center text-sm font-black shrink-0 rounded-sm ${
                        item.rarity === 'Legendary' ? 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 
                        item.rarity === 'Epic' ? 'border-purple-500 text-purple-500' : 
                        item.rarity === 'Rare' ? 'border-blue-500 text-blue-500' :
                        'border-red-900/30 text-red-900'
                      }`}>{item.name[0]}</div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-cinzel text-gold truncate uppercase font-black">{item.name}</p>
                        <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">{item.rarity} • {item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       {canCompare && !isComparing && (
                         <span className="text-[8px] text-gold/40 uppercase font-black group-hover:text-gold transition-colors">Compare</span>
                       )}
                       <button 
                        onClick={(e) => { e.stopPropagation(); toggleEquip(item.id); }}
                        disabled={isMentor}
                        className={`px-4 py-1.5 text-[10px] font-cinzel uppercase border-2 transition-all font-black ${isEquipped ? 'bg-gold text-black border-gold shadow-lg' : 'border-red-900 text-red-900 hover:border-gold hover:text-gold'} ${isMentor ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isEquipped ? 'Equipped' : 'Equip'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'Lore' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
               <h3 className="text-[10px] font-cinzel text-red-900 uppercase font-black tracking-widest">Thy Chronicle</h3>
               {!isMentor && (
                 <div className="flex gap-2">
                   {isEditingLore ? (
                     <>
                        <button 
                          onClick={handleManifestNewLore}
                          disabled={isWeaving}
                          className="text-[9px] font-cinzel text-gold bg-gold/10 border border-gold/40 px-2 py-1 hover:bg-gold/20 transition-all flex items-center gap-1 disabled:opacity-30"
                        >
                           <svg className={`w-3 h-3 ${isWeaving ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                           </svg>
                           Aetheric Re-Weave
                        </button>
                        <button onClick={saveLore} className="text-[9px] font-cinzel text-green-500 bg-green-500/10 border border-green-500/40 px-3 py-1 hover:bg-green-500/20 transition-all">SAVE</button>
                        <button onClick={() => { setIsEditingLore(false); setEditedBio(character.biography || ''); setEditedDesc(character.description || ''); }} className="text-[9px] font-cinzel text-red-500 bg-red-500/10 border border-red-500/40 px-3 py-1 hover:bg-red-500/20 transition-all">CANCEL</button>
                     </>
                   ) : (
                     <button onClick={() => setIsEditingLore(true)} className="text-[9px] font-cinzel text-gold/60 border border-gold/20 px-3 py-1 hover:text-gold hover:border-gold transition-all uppercase">Refine Chronicle</button>
                   )}
                 </div>
               )}
            </div>
            <div className="p-5 bg-red-900/10 border-l-4 border-red-900 rounded-r-sm space-y-3">
              <h4 className="text-[10px] font-cinzel text-red-800 uppercase tracking-[0.3em] font-black">History</h4>
              {isEditingLore ? (
                <textarea value={editedBio} onChange={(e) => setEditedBio(e.target.value)} className="w-full h-40 bg-black/40 border border-red-900/20 p-3 text-xs text-gray-200 outline-none focus:border-gold/50 custom-scrollbar resize-none font-medium italic" />
              ) : (
                <p className="text-xs md:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap italic font-medium">{character.biography || "The Engine has not yet woven this soul's past."}</p>
              )}
            </div>
            <div className="p-5 bg-black/40 border border-red-900/20 rounded-sm space-y-3">
              <h4 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-[0.2em]">Manifestation</h4>
              {isEditingLore ? (
                <textarea value={editedDesc} onChange={(e) => setEditedDesc(e.target.value)} className="w-full h-24 bg-black/20 border border-gold/10 p-3 text-xs text-gray-400 outline-none focus:border-gold/30 custom-scrollbar resize-none font-medium italic" />
              ) : (
                <p className="text-[11px] md:text-xs text-gray-500 italic leading-relaxed font-medium">{character.description || "A hazy silhouette."}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;
