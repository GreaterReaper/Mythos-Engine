
import React, { useState, useMemo } from 'react';
import { Character, Stats, Ability, Item, Archetype, Race } from '../types';
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

  const skills = useMemo(() => [
    { name: 'Acrobatics', stat: 'dex' },
    { name: 'Athletics', stat: 'str' },
    { name: 'Arcana', stat: 'int' },
    { name: 'Deception', stat: 'cha' },
    { name: 'History', stat: 'int' },
    { name: 'Insight', stat: 'wis' },
    { name: 'Intimidation', stat: 'cha' },
    { name: 'Medicine', stat: 'wis' },
    { name: 'Nature', stat: 'int' },
    { name: 'Perception', stat: 'wis' },
    { name: 'Persuasion', stat: 'cha' },
    { name: 'Religion', stat: 'int' },
    { name: 'Sleight of Hand', stat: 'dex' },
    { name: 'Stealth', stat: 'dex' },
    { name: 'Survival', stat: 'wis' },
  ], []);

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
    onUpdate(character.id, { spellSlots: { ...character.maxSpellSlots } });
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

  return (
    <div className="rune-border bg-black/90 backdrop-blur-xl overflow-hidden flex flex-col h-full max-h-[90vh] shadow-2xl">
      {/* Header Info */}
      <div className="p-4 border-b border-red-900/40 bg-red-900/10">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-cinzel text-gold truncate">{character.name}</h2>
              {character.asiPoints > 0 && <span className="bg-gold text-black text-[9px] font-bold px-1.5 rounded animate-pulse">ASI</span>}
            </div>
            <p className="text-[10px] md:text-xs text-red-700 font-cinzel uppercase tracking-[0.2em] truncate">{character.race} {character.archetype} • Lvl {character.level}</p>
          </div>
          <div className="text-right shrink-0">
             <p className="text-[9px] text-gray-500 font-cinzel uppercase font-bold tracking-tighter">Essence</p>
             <p className={`text-[10px] font-bold uppercase animate-pulse ${isMentor ? 'text-amber-500' : 'text-green-500'}`}>{isMentor ? 'MENTOR' : 'BOUND'}</p>
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

        <div className="mt-5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-cinzel text-red-900 w-6 font-black">HP</span>
            <div className="flex-1 h-2 bg-gray-950 rounded-full overflow-hidden border border-red-900/20">
              <div className="h-full bg-red-900 transition-all duration-700 shadow-[0_0_10px_rgba(127,29,29,0.5)]" style={{ width: `${(character.currentHp / character.maxHp) * 100}%` }} />
            </div>
            <span className="text-[10px] font-cinzel text-white min-w-[50px] text-right font-black">{character.currentHp}/{character.maxHp}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                 <h3 className="text-[10px] font-cinzel text-red-900 uppercase border-b border-red-900/20 pb-2 font-black">Saving Throws</h3>
                 <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5">
                    {(Object.keys(character.stats) as Array<keyof Stats>).map(s => (
                      <div key={s} className="flex justify-between text-[10px] border border-red-900/10 px-3 py-2 bg-black/40 rounded-sm">
                        <span className="uppercase text-gray-500 font-bold">{s}</span>
                        <span className="text-gold font-black">{getMod(character.stats[s]) >= 0 ? '+' : ''}{getMod(character.stats[s])}</span>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="space-y-3">
                 <h3 className="text-[10px] font-cinzel text-red-900 uppercase border-b border-red-900/20 pb-2 font-black">Proficiencies</h3>
                 <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {skills.map(skill => (
                      <div key={skill.name} className="flex justify-between text-[10px] border border-red-900/5 px-3 py-2 bg-black/20 hover:border-gold/20 transition-all rounded-sm">
                        <span className="text-gray-400 truncate font-medium">{skill.name}</span>
                        <span className="text-white font-black">{getMod(character.stats[skill.stat as keyof Stats]) >= 0 ? '+' : ''}{getMod(character.stats[skill.stat as keyof Stats])}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {character.maxSpellSlots && (
              <div className="mt-4">
                <SpellSlotManager 
                  maxSlots={character.maxSpellSlots}
                  currentSlots={character.spellSlots || {}}
                  onUseSlot={handleUseSlot}
                  onRestoreAll={handleRestoreSlots}
                  isReadOnly={!!isMentor}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'Abilities' && (
          <div className="space-y-4">
            {[...character.abilities, ...character.spells].map((a, i) => (
              <div key={i} className="p-4 bg-red-900/5 border-l-2 border-red-900 group hover:bg-red-900/10 transition-all rounded-r-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[11px] font-cinzel text-gold uppercase font-black tracking-widest">{a.name}</span>
                  <span className="text-[9px] text-red-900 uppercase italic font-bold">{a.type === 'Spell' ? `Level ${a.baseLevel}` : a.type}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{a.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Inventory' && (
          <div className="space-y-3">
            {!isMentor && (
              <div className="flex justify-end mb-2">
                <button 
                  onClick={handleAutoEquip}
                  className="text-[10px] font-cinzel text-gold bg-gold/10 border border-gold/40 px-3 py-1.5 hover:bg-gold/20 transition-all flex items-center gap-2"
                >
                   <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                     <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM15 10a5 5 0 11-10 0 5 5 0 0110 0z" />
                   </svg>
                   Manifest Best Gear (Auto-Equip All)
                </button>
              </div>
            )}
            {character.inventory.map((item) => {
              const isEquipped = character.equippedIds?.includes(item.id);
              return (
                <div key={item.id} className={`p-3 border transition-all flex justify-between items-center group rounded-sm ${isEquipped ? 'border-gold bg-gold/5' : 'border-red-900/10 bg-black/40'}`}>
                  <div className="flex gap-3 items-center min-w-0">
                    <div className={`w-10 h-10 border-2 flex items-center justify-center text-sm font-black shrink-0 rounded-sm ${
                      item.rarity === 'Legendary' ? 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 
                      item.rarity === 'Epic' ? 'border-purple-500 text-purple-500' : 
                      item.rarity === 'Rare' ? 'border-blue-500 text-blue-500' :
                      'border-red-900/30 text-red-900'
                    }`}>{item.name[0]}</div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-cinzel text-gold truncate uppercase font-black">
                        {item.name} {item.quantity && item.quantity > 1 ? `(x${item.quantity})` : ''}
                      </p>
                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">{item.rarity} • {item.type}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleEquip(item.id)}
                    disabled={isMentor}
                    className={`px-4 py-1.5 text-[10px] font-cinzel uppercase border-2 transition-all shrink-0 rounded-sm font-black ${isEquipped ? 'bg-gold text-black border-gold shadow-lg' : 'border-red-900 text-red-900 hover:border-gold hover:text-gold'} ${isMentor ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isEquipped ? 'Equipped' : 'Equip'}
                  </button>
                </div>
              );
            })}
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
                        <button 
                          onClick={saveLore}
                          className="text-[9px] font-cinzel text-green-500 bg-green-500/10 border border-green-500/40 px-3 py-1 hover:bg-green-500/20 transition-all"
                        >
                           SAVE
                        </button>
                        <button 
                          onClick={() => {
                            setIsEditingLore(false);
                            setEditedBio(character.biography || '');
                            setEditedDesc(character.description || '');
                          }}
                          className="text-[9px] font-cinzel text-red-500 bg-red-500/10 border border-red-500/40 px-3 py-1 hover:bg-red-500/20 transition-all"
                        >
                           CANCEL
                        </button>
                     </>
                   ) : (
                     <button 
                       onClick={() => setIsEditingLore(true)}
                       className="text-[9px] font-cinzel text-gold/60 border border-gold/20 px-3 py-1 hover:text-gold hover:border-gold transition-all uppercase"
                     >
                       Refine Chronicle
                     </button>
                   )}
                 </div>
               )}
            </div>

            <div className="p-5 bg-red-900/10 border-l-4 border-red-900 rounded-r-sm space-y-3">
              <h4 className="text-[10px] font-cinzel text-red-800 uppercase tracking-[0.3em] font-black">History</h4>
              {isEditingLore ? (
                <textarea 
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  className="w-full h-40 bg-black/40 border border-red-900/20 p-3 text-xs text-gray-300 outline-none focus:border-gold/50 custom-scrollbar resize-none font-medium italic"
                  placeholder="Record thy journey..."
                />
              ) : (
                <p className="text-xs md:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap italic font-medium">
                  {character.biography || "The Engine has not yet woven this soul's past. Join a campaign to unveil thy destiny."}
                </p>
              )}
            </div>

            <div className="p-5 bg-black/40 border border-red-900/20 rounded-sm space-y-3">
              <h4 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-[0.2em]">Manifestation</h4>
              {isEditingLore ? (
                <textarea 
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  className="w-full h-24 bg-black/20 border border-gold/10 p-3 text-xs text-gray-400 outline-none focus:border-gold/30 custom-scrollbar resize-none font-medium italic"
                  placeholder="Describe thy physical form..."
                />
              ) : (
                <p className="text-[11px] md:text-xs text-gray-500 italic leading-relaxed font-medium">
                  {character.description || "A hazy silhouette awaiting manifestation in the blood-mists."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;
