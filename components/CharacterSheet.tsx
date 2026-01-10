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

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onUpdate, isMentor, customArchetypes = [] }) => {
  const [activeTab, setActiveTab] = useState<'Stats' | 'Soul Path' | 'Inventory' | 'Lore'>('Stats');
  const [inventoryFilter, setInventoryFilter] = useState<'Gear' | 'Mundane'>('Gear');
  const [lastDeathRoll, setLastDeathRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  
  const [hpChanges, setHpChanges] = useState<HpChange[]>([]);
  const [displayHp, setDisplayHp] = useState(character.currentHp);
  const [displayMana, setDisplayMana] = useState(character.currentMana);
  const prevHpRef = useRef(character.currentHp);
  const prevManaRef = useRef(character.currentMana);
  const changeIdCounter = useRef(0);

  const getMod = (val: number) => Math.floor((val - 10) / 2);
  const dexMod = getMod(character.stats.dex);

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

  useEffect(() => {
    setDisplayHp(character.currentHp);
    setDisplayMana(character.currentMana);
  }, []);

  const { unlockedAbilities, lockedAbilities } = useMemo(() => {
    let archInfo = ARCHETYPE_INFO[character.archetype as Archetype];
    if (!archInfo) {
      const customMatch = customArchetypes.find(a => a.name === character.archetype);
      if (customMatch) {
        archInfo = { hpDie: customMatch.hpDie, role: customMatch.role, description: customMatch.description, coreAbilities: customMatch.coreAbilities, spells: customMatch.spells, starterGear: [] };
      }
    }

    if (!archInfo) return { unlockedAbilities: [...character.abilities, ...character.spells], lockedAbilities: [] };

    const allManifests = [...archInfo.coreAbilities, ...(archInfo.spells || [])].sort((a, b) => a.levelReq - b.levelReq);
    
    return {
      unlockedAbilities: allManifests.filter(a => a.levelReq <= character.level),
      lockedAbilities: allManifests.filter(a => a.levelReq > character.level)
    };
  }, [character.archetype, character.level, customArchetypes]);

  const equippedItems = useMemo(() => character.inventory.filter(i => character.equippedIds?.includes(i.id)), [character.inventory, character.equippedIds]);
  
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

  const filteredInventory = useMemo(() => {
    return character.inventory.filter(item => {
      if (inventoryFilter === 'Gear') return item.type === 'Weapon' || item.type === 'Armor';
      return item.type === 'Utility' || item.type === 'Quest';
    });
  }, [character.inventory, inventoryFilter]);

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

  const expThreshold = character.level * 1000;
  const expPercentage = Math.min(100, (character.exp / expThreshold) * 100);
  const hpPercentage = (character.currentHp / character.maxHp) * 100;
  const manaPercentage = (character.currentMana / character.maxMana) * 100;

  return (
    <div className="rune-border bg-black/90 backdrop-blur-xl overflow-hidden flex flex-col h-full max-h-[90vh] shadow-2xl border-emerald-900/60 relative">
      <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center gap-2">
        {hpChanges.map(change => (
          <div key={change.id} className={`font-cinzel font-black text-2xl animate-bounce-up ${change.type === 'damage' ? 'text-red-500' : change.type === 'mana' ? 'text-blue-400' : 'text-emerald-400'}`}>
            {change.type === 'damage' || change.type === 'mana' ? '-' : '+'}{change.amount}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes bounce-up {
          0% { transform: translateY(20px); opacity: 0; scale: 0.5; }
          20% { transform: translateY(0); opacity: 1; scale: 1.2; }
          80% { transform: translateY(-40px); opacity: 1; scale: 1; }
          100% { transform: translateY(-60px); opacity: 0; }
        }
        .animate-bounce-up {
          animation: bounce-up 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div className="p-4 border-b border-emerald-900/40 bg-emerald-900/10">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-cinzel text-gold truncate font-black">{character.name}</h2>
              <div className="bg-black/80 border border-gold/40 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                <span className="text-[9px] font-cinzel text-gold font-black uppercase">AC {acCalculation}</span>
              </div>
            </div>
            <p className="text-[10px] md:text-xs text-emerald-500 font-cinzel uppercase tracking-[0.2em] truncate font-bold">{character.race} {character.archetype} • Lvl {character.level}</p>
          </div>
        </div>

        {character.currentHp <= 0 ? (
          <div className="mt-4 p-4 bg-red-950/20 border border-red-900/40 rounded-sm animate-pulse text-center">
            <button onClick={handleRollDeathSave} disabled={isRolling} className="px-8 py-3 bg-emerald-950 border-2 border-gold text-white font-cinzel text-xs font-black uppercase">Death Save</button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-cinzel text-emerald-500 w-12 font-black uppercase">HP</span>
              <div className="flex-1 h-3 bg-gray-950 rounded-full overflow-hidden border border-emerald-900/20">
                <div className={`h-full transition-all duration-500 ${character.currentHp < character.maxHp * 0.25 ? 'bg-red-600 animate-pulse' : 'bg-emerald-700'}`} style={{ width: `${hpPercentage}%` }} />
              </div>
              <span className="text-[10px] text-white min-w-[50px] text-right font-black">{character.currentHp}/{character.maxHp}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-cinzel text-blue-500 w-12 font-black uppercase">MANA</span>
              <div className="flex-1 h-3 bg-gray-950 rounded-full overflow-hidden border border-blue-900/20">
                <div className="h-full bg-blue-600 shadow-[0_0_8px_#3b82f6] transition-all duration-500" style={{ width: `${manaPercentage}%` }} />
              </div>
              <span className="text-[10px] text-white min-w-[50px] text-right font-black">{character.currentMana}/{character.maxMana}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-cinzel text-gold w-12 font-black uppercase">EXP</span>
              <div className="flex-1 h-1.5 bg-gray-950 rounded-full overflow-hidden">
                <div className="h-full bg-gold/60" style={{ width: `${expPercentage}%` }} />
              </div>
              <span className="text-[10px] text-white min-w-[50px] text-right font-black">{character.exp}/{expThreshold}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-emerald-900/30 text-[10px] font-cinzel bg-black/40">
        {['Stats', 'Soul Path', 'Inventory', 'Lore'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-3 transition-all uppercase tracking-widest font-black ${activeTab === t ? 'bg-emerald-900/20 text-gold border-b-2 border-gold' : 'text-gray-500'}`}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
        {activeTab === 'Stats' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(character.stats) as Array<keyof Stats>).map(s => (
                <div key={s} className="p-3 border border-emerald-900/20 bg-black/40 rounded-sm">
                  <span className="text-[9px] font-cinzel uppercase text-gray-500 font-bold">{s}</span>
                  <div className="flex justify-between items-baseline mt-1"><span className="text-2xl font-black text-gold">{character.stats[s]}</span><span className="text-xs text-emerald-500 font-black">{getMod(character.stats[s]) >= 0 ? '+' : ''}{getMod(character.stats[s])}</span></div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-emerald-900/5 border border-emerald-900/20 rounded-sm">
               <h3 className="text-[10px] font-cinzel text-gold uppercase tracking-[0.2em] font-black border-b border-gold/10 pb-2 mb-3">Defensive Profile</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase font-black">Armor Class</span>
                    <p className="text-2xl font-black text-white">{acCalculation}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase font-black">Reflex Mod</span>
                    <p className="text-2xl font-black text-white">{dexMod >= 0 ? '+' : ''}{dexMod}</p>
                  </div>
               </div>
            </div>
          </div>
        )}
        {activeTab === 'Soul Path' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-cinzel text-emerald-500 uppercase font-black tracking-widest border-b border-emerald-900/20 pb-1">Unlocked Manifestations</h4>
              {unlockedAbilities.map((a, i) => (
                <div key={i} className="p-4 border-l-2 bg-emerald-900/5 border-gold rounded-sm">
                  <div className="flex justify-between">
                    <span className="text-[11px] font-cinzel uppercase font-black tracking-widest text-gold">{a.name}</span>
                    <div className="flex gap-2">
                      {a.manaCost && <span className="text-[8px] text-blue-400 uppercase font-black">-{a.manaCost} MP</span>}
                      {a.hpCost && <span className="text-[8px] text-red-500 uppercase font-black">-{a.hpCost} HP</span>}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 italic">"{a.description}"</p>
                </div>
              ))}
              {unlockedAbilities.length === 0 && <p className="text-[10px] text-gray-600 italic">No power yet manifested.</p>}
            </div>

            <div className="space-y-4 opacity-40">
              <h4 className="text-[10px] font-cinzel text-gray-500 uppercase font-black tracking-widest border-b border-gray-900 pb-1">Locked Manifestations</h4>
              {lockedAbilities.map((a, i) => (
                <div key={i} className="p-4 border-l-2 bg-black/20 border-gray-800 rounded-sm">
                  <div className="flex justify-between">
                    <span className="text-[11px] font-cinzel uppercase font-black tracking-widest text-gray-600">{a.name}</span>
                    <span className="text-[8px] text-gold/60 uppercase font-black">Requires Level {a.levelReq}</span>
                  </div>
                  <p className="text-[10px] text-gray-700 mt-1 italic">"{a.description}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Inventory' && (
          <div className="space-y-3">
            {filteredInventory.map(item => (
              <div key={item.id} className="p-3 border border-emerald-900/10 bg-black/40 flex justify-between items-center group hover:border-gold transition-colors">
                <div className="flex flex-col">
                  <span className="text-[11px] font-cinzel font-black text-gray-200 group-hover:text-gold">{item.name}</span>
                  {item.stats && (item.stats.damage || item.stats.ac) && (
                    <span className="text-[8px] text-gold uppercase font-black mt-0.5">
                      {item.stats.damage && `DMG: ${item.stats.damage}`} {item.stats.ac && `AC: +${item.stats.ac}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[8px] text-emerald-900 uppercase italic font-bold">{item.type}</span>
                  {character.equippedIds?.includes(item.id) && (
                    <span className="text-[8px] bg-gold text-black px-1 font-black">EQUIPPED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Lore' && (
          <div className="p-5 bg-emerald-900/10 border-l-4 border-emerald-900">
            <p className="text-xs text-gray-200 italic leading-relaxed">{character.biography || "Silence from the void."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;