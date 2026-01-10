import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Character, Stats, Ability, Item, Archetype, Race, Currency, StatusEffect, ArchetypeInfo } from '../types';
import { ARCHETYPE_INFO, SPELL_LIBRARY } from '../constants';
import Tooltip from './Tooltip';

interface CharacterSheetProps {
  character: Character;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
  isMentor?: boolean;
  customArchetypes?: ArchetypeInfo[];
}

interface HpChange {
  id: number;
  amount: number;
  type: 'damage' | 'heal' | 'mana';
}

interface RollResult {
  id: number;
  label: string;
  formula: string;
  result: number;
  rolls: number[];
}

/**
 * THE SOUL MIRROR: Detailed inspection of a bound character's statistics, 
 * inventory, and aetheric manifestations.
 */
const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onUpdate, isMentor, customArchetypes = [] }) => {
  const [activeTab, setActiveTab] = useState<'Stats' | 'Soul Path' | 'Inventory' | 'Lore'>('Stats');
  const [inventoryFilter, setInventoryFilter] = useState<'Gear' | 'Mundane'>('Gear');
  
  const [hpChanges, setHpChanges] = useState<HpChange[]>([]);
  const [rollResults, setRollResults] = useState<RollResult[]>([]);
  const [displayHp, setDisplayHp] = useState(character.currentHp);
  const [displayMana, setDisplayMana] = useState(character.currentMana);
  const prevHpRef = useRef(character.currentHp);
  const prevManaRef = useRef(character.currentMana);
  const changeIdCounter = useRef(0);
  const rollIdCounter = useRef(0);

  const getMod = (val: number) => Math.floor((val - 10) / 2);
  const strMod = getMod(character.stats.str);
  const dexMod = getMod(character.stats.dex);
  const conMod = getMod(character.stats.con);
  const intMod = getMod(character.stats.int);
  const wisMod = getMod(character.stats.wis);
  const chaMod = getMod(character.stats.cha);

  // Synchronize displayed HP with actual state and trigger damage/heal animations
  useEffect(() => {
    if (prevHpRef.current !== character.currentHp) {
      const diff = character.currentHp - prevHpRef.current;
      const type = diff < 0 ? 'damage' : 'heal';
      const newChange: HpChange = { id: ++changeIdCounter.current, amount: Math.abs(diff), type };
      setHpChanges(prev => [...prev, newChange]);
      setTimeout(() => setHpChanges(prev => prev.filter(c => c.id !== newChange.id)), 1500);
      const timer = setTimeout(() => setDisplayHp(character.currentHp), 500);
      prevHpRef.current = character.currentHp;
      return () => clearTimeout(timer);
    }
  }, [character.currentHp]);

  // Synchronize displayed Mana with actual state
  useEffect(() => {
    if (prevManaRef.current !== character.currentMana) {
      const diff = character.currentMana - prevManaRef.current;
      if (diff < 0) {
        const newChange: HpChange = { id: ++changeIdCounter.current, amount: Math.abs(diff), type: 'mana' };
        setHpChanges(prev => [...prev, newChange]);
        setTimeout(() => setHpChanges(prev => prev.filter(c => c.id !== newChange.id)), 1500);
      }
      const timer = setTimeout(() => setDisplayMana(character.currentMana), 500);
      prevManaRef.current = character.currentMana;
      return () => clearTimeout(timer);
    }
  }, [character.currentMana]);

  const { classAbilities, customBoons } = useMemo(() => {
    const all = [...(character.abilities || []), ...(character.spells || [])].sort((a, b) => a.levelReq - b.levelReq);
    return {
      classAbilities: all.filter(a => a.levelReq > 0),
      customBoons: all.filter(a => a.levelReq === 0)
    };
  }, [character.abilities, character.spells]);

  const equippedItems = useMemo(() => character.inventory.filter(i => character.equippedIds?.includes(i.id)), [character.inventory, character.equippedIds]);
  
  const acCalculation = useMemo(() => {
    let baseAc = 10 + dexMod;
    let shieldBonus = 0;
    let armorAc = 0;
    
    equippedItems.forEach(item => {
      if (item.type === 'Armor') {
        const itemAc = item.stats?.ac || 0;
        if (item.name.toLowerCase().includes('shield')) {
          shieldBonus += itemAc;
        } else {
          armorAc = itemAc;
        }
      }
    });

    if (armorAc > 0) {
      const isHeavy = equippedItems.some(i => i.type === 'Armor' && (i.name.toLowerCase().includes('plate') || i.name.toLowerCase().includes('heavy')));
      if (isHeavy) {
        baseAc = armorAc;
      } else {
        baseAc = armorAc + dexMod;
      }
    }

    return baseAc + shieldBonus;
  }, [equippedItems, dexMod]);

  const combatStats = useMemo(() => {
    const weapons = equippedItems.filter(i => i.type === 'Weapon');
    const isFinesseClass = character.archetype === Archetype.Thief || character.archetype === Archetype.Archer;
    
    return weapons.map(w => {
      const isFinesseWeapon = w.name.toLowerCase().includes('dagger') || w.name.toLowerCase().includes('rapier') || w.name.toLowerCase().includes('bow');
      const mod = (isFinesseClass || isFinesseWeapon) ? dexMod : strMod;
      const attackBonus = mod + character.level;
      return {
        id: w.id,
        name: w.name,
        attackBonus,
        damage: w.stats?.damage || '1d4',
        damageType: w.stats?.damageType || 'Physical',
        modName: (isFinesseClass || isFinesseWeapon) ? 'DEX' : 'STR'
      };
    });
  }, [equippedItems, strMod, dexMod, character.level, character.archetype]);

  const filteredInventory = useMemo(() => {
    return character.inventory.filter(item => {
      if (inventoryFilter === 'Gear') return item.type === 'Weapon' || item.type === 'Armor';
      return item.type === 'Utility' || item.type === 'Quest';
    });
  }, [character.inventory, inventoryFilter]);

  const handleToggleEquip = (itemId: string) => {
    if (!onUpdate) return;
    const item = character.inventory.find(i => i.id === itemId);
    if (!item) return;

    let newEquippedIds = [...(character.equippedIds || [])];
    const isEquipped = newEquippedIds.includes(itemId);

    if (isEquipped) {
      newEquippedIds = newEquippedIds.filter(id => id !== itemId);
    } else {
      if (item.type === 'Armor') {
        const isShield = item.name.toLowerCase().includes('shield');
        if (isShield) {
           newEquippedIds = newEquippedIds.filter(id => {
             const existing = character.inventory.find(inv => inv.id === id);
             return !(existing?.type === 'Armor' && existing.name.toLowerCase().includes('shield'));
           });
        } else {
           newEquippedIds = newEquippedIds.filter(id => {
             const existing = character.inventory.find(inv => inv.id === id);
             return !(existing?.type === 'Armor' && !existing.name.toLowerCase().includes('shield'));
           });
        }
      } else if (item.type === 'Weapon') {
        const weaponIds = newEquippedIds.filter(id => character.inventory.find(inv => inv.id === id)?.type === 'Weapon');
        if (weaponIds.length >= 2) {
          newEquippedIds = newEquippedIds.filter(id => id !== weaponIds[0]);
        }
      }
      newEquippedIds.push(itemId);
    }

    onUpdate(character.id, { equippedIds: newEquippedIds });
  };

  const parseAndRoll = (formula: string, modifier: number) => {
    const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return { result: 0, rolls: [], formula: formula };

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const extra = match[3] ? parseInt(match[3]) : 0;
    
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const sum = rolls.reduce((a, b) => a + b, 0);
    return { result: sum + extra + modifier, rolls, formula: `${count}d${sides}${extra !== 0 ? (extra > 0 ? '+' + extra : extra) : ''}${modifier !== 0 ? (modifier > 0 ? '+' + modifier : modifier) : ''}` };
  };

  const handleRollWeapon = (item: Item) => {
    const dmgFormula = item.stats?.damage || '1d4';
    const isFinesse = item.name.toLowerCase().includes('dagger') || item.name.toLowerCase().includes('rapier') || item.name.toLowerCase().includes('bow') || character.archetype === Archetype.Thief;
    const mod = isFinesse ? dexMod : strMod;
    
    const { result, rolls, formula } = parseAndRoll(dmgFormula, mod);
    const newRoll: RollResult = {
      id: ++rollIdCounter.current,
      label: item.name,
      formula,
      result,
      rolls
    };
    setRollResults(prev => [newRoll, ...prev].slice(0, 3));
    setTimeout(() => setRollResults(prev => prev.filter(r => r.id !== newRoll.id)), 4000);
  };

  return (
    <div className="flex flex-col h-full bg-black/40 rune-border overflow-hidden relative">
      {/* Header Section */}
      <div className="p-6 border-b border-emerald-900/30 flex justify-between items-center bg-black/60">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-900/20 border-2 border-gold/40 flex items-center justify-center font-cinzel text-3xl font-black text-gold">
            {character.name[0]}
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-cinzel text-gold font-black uppercase tracking-tight">{character.name}</h2>
            <p className="text-xs text-emerald-500 font-cinzel uppercase font-bold tracking-widest mt-1">
              Level {character.level} {character.race} {character.archetype}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase font-black">AC</p>
            <p className="text-2xl font-black text-gold">{acCalculation}</p>
          </div>
        </div>
      </div>

      {/* Primary Tabs */}
      <div className="flex border-b border-emerald-900/20 bg-black/40 shrink-0">
        {(['Stats', 'Soul Path', 'Inventory', 'Lore'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[10px] font-cinzel font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-gold bg-emerald-900/20 border-b-2 border-gold' : 'text-gray-500 hover:text-emerald-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'Stats' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 relative">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-cinzel text-emerald-500 font-black uppercase">Vitality</span>
                  <span className="text-sm font-black text-white">{displayHp} / {character.maxHp}</span>
                </div>
                <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-emerald-900/20">
                  <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${(displayHp / character.maxHp) * 100}%` }} />
                </div>
                {hpChanges.map(change => (
                  <div key={change.id} className={`absolute -top-4 right-0 font-black text-lg animate-bounce ${change.type === 'damage' ? 'text-red-500' : change.type === 'heal' ? 'text-emerald-500' : 'text-blue-500'}`}>
                    {change.type === 'damage' ? '-' : '+'}{change.amount}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-cinzel text-blue-500 font-black uppercase">Aether</span>
                  <span className="text-sm font-black text-white">{displayMana} / {character.maxMana}</span>
                </div>
                <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-emerald-900/20">
                  <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(displayMana / character.maxMana) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {(Object.keys(character.stats) as Array<keyof Stats>).map(s => {
                const val = character.stats[s];
                const mod = getMod(val);
                return (
                  <div key={s} className="bg-black/60 border border-emerald-900/20 p-3 text-center rounded hover:border-gold transition-colors">
                    <p className="text-[8px] font-cinzel text-gray-500 uppercase font-black">{s}</p>
                    <p className="text-xl font-black text-gold my-1">{val}</p>
                    <p className="text-xs text-emerald-500 font-black">{mod >= 0 ? '+' : ''}{mod}</p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-widest border-b border-gold/20 pb-1">Combat Stance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combatStats.map(cs => (
                  <div key={cs.id} onClick={() => handleRollWeapon(character.inventory.find(i => i.id === cs.id)!)} className="p-4 bg-emerald-900/5 border border-emerald-900/20 rounded group hover:border-gold transition-all cursor-pointer">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-cinzel text-gold font-bold">{cs.name}</p>
                      <p className="text-xs text-emerald-500 font-black">+{cs.attackBonus} to hit</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-400">{cs.damage} {cs.damageType}</p>
                      <p className="text-[8px] text-gray-600 font-black uppercase">{cs.modName} Based</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Soul Path' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-widest border-b border-gold/20 pb-1">Class Manifestations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classAbilities.map((ab, i) => (
                  <div key={i} className="p-4 bg-black/60 border border-emerald-900/20 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-cinzel text-gold font-bold">{ab.name}</p>
                      <span className="text-[8px] bg-emerald-900/40 px-1.5 py-0.5 rounded text-emerald-400 font-black uppercase">Lvl {ab.levelReq}</span>
                    </div>
                    <p className="text-xs text-gray-400 italic leading-relaxed">"{ab.description}"</p>
                  </div>
                ))}
              </div>
            </div>

            {customBoons.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-cinzel text-emerald-500 uppercase font-black tracking-widest border-b border-emerald-500/20 pb-1">Legendary Boons</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customBoons.map((ab, i) => (
                    <div key={i} className="p-4 bg-emerald-950/20 border border-gold/40 rounded shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-cinzel text-gold font-bold">{ab.name}</p>
                        <span className="text-[8px] bg-gold/20 px-1.5 py-0.5 rounded text-gold font-black uppercase">Unique</span>
                      </div>
                      <p className="text-xs text-gray-200 leading-relaxed font-medium">"{ab.description}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Inventory' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button onClick={() => setInventoryFilter('Gear')} className={`px-4 py-1.5 text-[10px] font-cinzel font-black uppercase border transition-all ${inventoryFilter === 'Gear' ? 'bg-emerald-900 border-gold text-white' : 'border-emerald-900/30 text-gray-500'}`}>Combat Gear</button>
              <button onClick={() => setInventoryFilter('Mundane')} className={`px-4 py-1.5 text-[10px] font-cinzel font-black uppercase border transition-all ${inventoryFilter === 'Mundane' ? 'bg-emerald-900 border-gold text-white' : 'border-emerald-900/30 text-gray-500'}`}>Possessions</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInventory.map(item => (
                <div key={item.id} className={`p-4 border transition-all ${character.equippedIds?.includes(item.id) ? 'bg-gold/10 border-gold' : 'bg-black/40 border-emerald-900/20'}`}>
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-cinzel text-gold font-bold">{item.name}</p>
                    {onUpdate && !isMentor && (
                      <button onClick={() => handleToggleEquip(item.id)} className="text-[8px] font-black uppercase border border-emerald-900/30 px-2 py-1 hover:bg-emerald-900 transition-all">
                        {character.equippedIds?.includes(item.id) ? 'Unequip' : 'Equip'}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 italic mt-1 leading-relaxed line-clamp-2">"{item.description}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Lore' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-widest border-b border-gold/20 pb-1">Soul History</h3>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">{character.biography || "No history recorded in the obsidian archives."}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-widest border-b border-gold/20 pb-1">Appearance</h3>
              <p className="text-sm text-gray-400 italic leading-relaxed">{character.description || "A nondescript vessel of flesh and aether."}</p>
            </div>
          </div>
        )}
      </div>

      {/* Ephemeral Roll Results Display */}
      {rollResults.length > 0 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50">
          {rollResults.map(res => (
            <div key={res.id} className="bg-[#0c0a09] border-2 border-gold p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 min-w-[200px]">
              <p className="text-[8px] font-cinzel text-gold uppercase font-black tracking-widest mb-1">{res.label}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-black text-white">{res.result}</p>
                  <p className="text-[8px] font-mono text-gray-500">[{res.rolls.join(' + ')}] {res.formula.includes('+') ? `+ ${res.formula.split('+')[1]}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-emerald-500 uppercase">Resonance Success</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CharacterSheet;
