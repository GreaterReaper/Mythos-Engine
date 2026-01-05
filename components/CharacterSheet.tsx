
import React, { useState, useMemo } from 'react';
import { Character, Stats, Ability, Item } from '../types';
import { RECOMMENDED_STATS } from '../constants';
import SpellSlotManager from './SpellSlotManager';

interface TooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
  subTitle?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ title, content, children, subTitle }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block w-full" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#0c0a09] border border-[#a16207] text-[10px] text-gray-400 shadow-[0_10px_30px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in pointer-events-none border-t-2 border-t-red-900">
          <div className="flex justify-between items-center border-b border-[#a16207]/20 mb-2 pb-1">
            <p className="font-cinzel text-[#a16207] font-bold">{title}</p>
            {subTitle && <span className="text-red-900 text-[8px] italic">{subTitle}</span>}
          </div>
          <p className="italic leading-relaxed">{content}</p>
          <div className="mt-2 flex justify-center">
            <div className="text-[8px] text-[#a16207]/40 tracking-widest">ᛟ ᚱ ᛞ ᛖ ᚱ</div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CharacterSheetProps {
  character: Character;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
  isMentor?: boolean;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onUpdate, isMentor }) => {
  const [activeTab, setActiveTab] = useState<'Stats' | 'Abilities' | 'Inventory' | 'Lore'>('Stats');

  const getMod = (val: number) => Math.floor((val - 10) / 2);

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

  const handleUseSlot = (level: number) => {
    if (!onUpdate || !character.spellSlots || character.spellSlots[level] <= 0) return;
    const newSlots = { ...character.spellSlots, [level]: character.spellSlots[level] - 1 };
    onUpdate(character.id, { spellSlots: newSlots });
  };

  const handleRestoreSlots = () => {
    if (!onUpdate || !character.maxSpellSlots) return;
    onUpdate(character.id, { spellSlots: { ...character.maxSpellSlots } });
  };

  const recommendedForArch = useMemo(() => RECOMMENDED_STATS[character.archetype] || [], [character.archetype]);

  return (
    <div className="rune-border bg-black/80 backdrop-blur-lg overflow-hidden flex flex-col h-full max-h-[85vh]">
      <div className="p-4 border-b border-red-900/40 flex items-center gap-4 bg-red-900/5">
        <div className="w-20 h-20 rounded border border-gold/30 overflow-hidden shrink-0 bg-black/40">
           {character.imageUrl ? <img src={character.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-cinzel text-red-900/20">??</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-cinzel text-gold truncate">{character.name}</h2>
            {character.asiPoints > 0 && <span className="bg-gold text-black text-[8px] font-bold px-1 rounded animate-pulse shadow-[0_0_5px_rgba(161,98,7,0.5)]">ASI</span>}
          </div>
          <p className="text-[10px] text-red-900 font-cinzel uppercase tracking-widest truncate">{character.race} {character.archetype} • Lvl {character.level}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 max-w-xs">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-cinzel text-red-900 w-4">HP</span>
              <div className="flex-1 h-1 bg-gray-900 rounded-full overflow-hidden border border-red-900/30">
                <div className="h-full bg-red-800 transition-all duration-500" style={{ width: `${(character.currentHp / character.maxHp) * 100}%` }} />
              </div>
              <span className="text-[8px] font-cinzel text-white">{character.currentHp}/{character.maxHp}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-cinzel text-gold w-4">XP</span>
              <div className="flex-1 h-1 bg-gray-900 rounded-full overflow-hidden border border-amber-900/30">
                <div className="h-full bg-amber-800 transition-all duration-500" style={{ width: `${(character.exp / (character.level * 1000)) * 100}%` }} />
              </div>
              <span className="text-[8px] font-cinzel text-white">{character.exp}/{character.level * 1000}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-red-900/40 text-[10px] font-cinzel overflow-x-auto whitespace-nowrap bg-black/20">
        {['Stats', 'Abilities', 'Inventory', 'Lore'].map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t as any)} 
            className={`flex-1 min-w-[70px] py-2 transition-all ${activeTab === t ? 'bg-red-900/20 text-gold border-b border-gold' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'Stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(character.stats) as Array<keyof Stats>).map(s => {
                const isRecommended = recommendedForArch.includes(s);
                const hasASI = character.asiPoints > 0;
                
                return (
                  <Tooltip 
                    key={s} 
                    title={s.toUpperCase()} 
                    subTitle={`Mod: ${getMod(character.stats[s]) >= 0 ? '+' : ''}${getMod(character.stats[s])}`}
                    content={`Thy ${s} attribute determines thy bonus to relevant checks and saving throws.`}
                  >
                    <div className={`p-2 border relative group cursor-help transition-all ${
                      isRecommended && hasASI 
                        ? 'border-gold shadow-[0_0_15px_rgba(161,98,7,0.3)] bg-gold/5' 
                        : 'border-red-900/20 bg-black/40 hover:border-red-900/50'
                    }`}>
                      {isRecommended && <span className={`absolute -top-1 left-1 bg-gold text-black text-[6px] px-1 font-bold font-cinzel border border-black uppercase z-10 ${hasASI ? 'animate-pulse' : ''}`}>Primary</span>}
                      <span className={`text-[8px] font-cinzel uppercase ${isRecommended ? 'text-gold' : 'text-red-900'}`}>{s}</span>
                      <div className="flex justify-between items-end">
                        <span className="text-2xl font-bold text-gold">{character.stats[s]}</span>
                        <span className="text-xs text-red-500 mb-1">{getMod(character.stats[s]) >= 0 ? '+' : ''}${getMod(character.stats[s])}</span>
                      </div>
                      {!isMentor && character.asiPoints > 0 && (
                        <button onClick={() => handleStatUp(s)} className="absolute top-1 right-1 w-5 h-5 bg-gold text-black text-xs font-bold rounded flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_10px_rgba(161,98,7,0.5)]">+</button>
                      )}
                    </div>
                  </Tooltip>
                );
              })}
            </div>

            {character.maxSpellSlots && (
              <SpellSlotManager 
                maxSlots={character.maxSpellSlots}
                currentSlots={character.spellSlots || {}}
                onUseSlot={handleUseSlot}
                onRestoreAll={handleRestoreSlots}
                isReadOnly={!!isMentor}
              />
            )}
          </div>
        )}

        {activeTab === 'Abilities' && (
          <div className="space-y-3">
            {[...character.abilities, ...character.spells].map((a, i) => (
              <Tooltip 
                key={i} 
                title={a.name} 
                subTitle={a.type === 'Spell' ? `Lvl ${a.baseLevel} Spell` : a.type} 
                content={a.description + (a.scaling ? `\n\nUPCASTING: ${a.scaling}` : '')}
              >
                <div className="p-2 bg-red-900/5 border-l-2 border-red-900 cursor-help hover:bg-red-900/10 transition-colors">
                  <div className="flex justify-between text-[10px] font-cinzel">
                    <span className="text-gold">{a.name}</span>
                    <span className="text-red-900 italic opacity-50">{a.type === 'Spell' ? `LVL ${a.baseLevel}` : a.type}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{a.description}</p>
                </div>
              </Tooltip>
            ))}
          </div>
        )}

        {activeTab === 'Inventory' && (
          <div className="space-y-2">
            {character.inventory.filter(item => !!item).map((item, i) => (
              <Tooltip 
                key={i} 
                title={item.name} 
                subTitle={`${item.rarity} ${item.type}`} 
                content={item.description}
              >
                <div className="p-2 border border-red-900/10 bg-black/20 flex justify-between items-center group cursor-help hover:border-gold/30 transition-all">
                  <div className="flex gap-2 items-center min-w-0">
                    <div className={`w-6 h-6 border flex items-center justify-center text-[8px] ${
                      item.rarity === 'Legendary' ? 'border-orange-500 text-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.3)]' : 
                      item.rarity === 'Epic' ? 'border-purple-500 text-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.3)]' : 
                      'border-red-900 text-red-900'
                    }`}>{item.name[0]}</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-cinzel text-gold truncate">{item.name}</p>
                      <p className="text-[8px] text-gray-500 uppercase">{item.rarity} {item.type}</p>
                    </div>
                  </div>
                  {item.stats && <span className="text-[8px] text-red-900 font-bold">{item.stats.damage || item.stats.ac || ''}</span>}
                </div>
              </Tooltip>
            ))}
            {character.inventory.length === 0 && <p className="text-center py-4 text-[10px] text-gray-600 font-cinzel italic">No artifacts bound.</p>}
          </div>
        )}

        {activeTab === 'Lore' && (
          <div className="space-y-4">
            <div className="p-3 bg-red-900/5 border-l-2 border-gold/30">
              <h4 className="text-[10px] font-cinzel text-gold uppercase mb-2">Visual Manifestation</h4>
              <p className="text-xs text-gray-400 italic leading-relaxed">{character.description || "The aether has provided no visual record."}</p>
            </div>
            <div className="p-3 bg-red-900/5 border-l-2 border-red-900">
              <h4 className="text-[10px] font-cinzel text-red-900 uppercase mb-2">Thy Chronicle</h4>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{character.biography || "No lore has been transcribed into the Engine's memory."}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-black border-t border-red-900/40">
        <p className="text-[9px] text-gray-500 italic line-clamp-1">{character.description}</p>
      </div>
    </div>
  );
};

export default CharacterSheet;
