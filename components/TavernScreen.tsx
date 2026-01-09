import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Character, Message, Item, Currency, Role, Archetype, Rumor } from '../types';
import { generateInnkeeperResponse } from '../geminiService';
import { SYNERGY_MAP, APOTHECARY_TIERS } from '../constants';
import Tooltip from './Tooltip';

type TavernTab = 'Rest' | 'Mentors' | 'Smithy' | 'Apothecary';

interface TavernScreenProps {
  party: Character[];
  mentors: Character[];
  partyIds: string[];
  onToggleParty: (id: string) => void;
  onLongRest: () => void;
  onOpenShop: () => void;
  onUpgradeItem: (characterId: string, itemId: string, cost: Currency) => void;
  onBuyItem?: (item: Item, buyerId: string, cost: Currency) => void;
  isHost: boolean;
  isShopLoading?: boolean;
  slainMonsterTypes?: string[];
  activeRumors: Rumor[];
  onFetchRumors: () => void;
  isRumorLoading: boolean;
}

const ROTATION_INTERVAL = 5 * 60 * 1000;
const MENTOR_GROUPS: Archetype[][] = [
  [Archetype.Fighter, Archetype.Mage, Archetype.Archer],
  [Archetype.Warrior, Archetype.Sorcerer, Archetype.Alchemist],
  [Archetype.DarkKnight, Archetype.Thief, Archetype.BloodArtist]
];

const TavernScreen: React.FC<TavernScreenProps> = ({ 
  party, mentors, partyIds, onToggleParty, onLongRest, onOpenShop, onUpgradeItem, onBuyItem, isHost, isShopLoading, activeRumors, onFetchRumors, isRumorLoading
}) => {
  const [activeTab, setActiveTab] = useState<TavernTab>('Rest');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Welcome to 'The Broken Cask', traveler. Rest thy bones, the fire is warm and the ale is cold. What's on thy mind?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const primarySoul = useMemo(() => party.find(c => c.isPrimarySoul), [party]);
  
  const bondInsight = useMemo(() => {
    if (!primarySoul) return null;
    return SYNERGY_MAP[primarySoul.archetype as Archetype] || null;
  }, [primarySoul]);

  const rotatedMentors = useMemo(() => {
    const groupIndex = Math.floor(Date.now() / ROTATION_INTERVAL) % MENTOR_GROUPS.length;
    const activeArchetypes = MENTOR_GROUPS[groupIndex];
    return mentors.filter(m => activeArchetypes.includes(m.archetype as Archetype));
  }, [mentors]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await generateInnkeeperResponse([...messages, userMsg], party);
      setMessages(prev => [...prev, { role: 'model', content: response || "Barnaby just nods.", timestamp: Date.now() }]);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const calculateUpgradeCost = (item: Item): Currency => {
    const currentPlus = parseInt(item.name.match(/\+(\d+)/)?.[1] || '0');
    return {
      aurels: 150 * (currentPlus + 1)
    };
  };

  const canAfford = (char: Character, cost: Currency) => {
    return char.currency.aurels >= cost.aurels;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-up pb-20">
      <div className="border-b border-amber-900/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-5xl font-cinzel text-amber-600 font-black tracking-tighter">The Broken Cask</h2>
          </div>
          <p className="text-gray-500 italic text-sm font-medium">"A sanctuary of warmth in a world of biting obsidian."</p>
        </div>
        <button 
          disabled={isShopLoading}
          onClick={onOpenShop}
          className="px-6 py-3 border-2 border-amber-600 text-amber-600 font-cinzel font-black uppercase text-[10px] tracking-widest hover:bg-amber-600/10 transition-all"
        >
          {isShopLoading ? 'Summoning Merchant...' : "Mercenary's Curios"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-10">
          <div className="rune-border p-6 bg-black/60 border-emerald-900/40 space-y-6">
             <div className="flex justify-between items-center border-b border-emerald-900/20 pb-2">
               <h3 className="text-[10px] font-cinzel text-emerald-500 uppercase font-black tracking-widest">Resonance Score</h3>
               <span className="text-sm font-mono font-black text-emerald-500">STABLE</span>
             </div>
             
             {bondInsight && (
               <div className="space-y-3">
                  <p className="text-[9px] text-gold uppercase font-black tracking-widest mb-1">Anchor Bond: {primarySoul?.name}</p>
                  <div className="p-3 bg-gold/5 border border-gold/20 rounded-sm">
                    <p className="text-[8px] text-gray-500 uppercase font-black mb-2">Theoretical Best Matches</p>
                    <div className="flex flex-wrap gap-2">
                       {bondInsight.bestMatches.map(match => (
                         <span key={match} className="text-[9px] bg-emerald-900/40 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded-sm font-bold uppercase">
                           {match}
                         </span>
                       ))}
                    </div>
                  </div>
               </div>
             )}
          </div>

          <div className="rune-border p-5 bg-amber-900/5 border-amber-900/20 space-y-4">
             <div className="flex justify-between items-center border-b border-amber-900/30 pb-2">
                <h4 className="text-[10px] font-cinzel text-amber-700 uppercase font-black tracking-widest">Whispers</h4>
                <button onClick={onFetchRumors} disabled={isRumorLoading} className="text-[9px] font-black text-amber-600 hover:text-amber-500 uppercase">{isRumorLoading ? 'LISTENING...' : 'EAVESDROP'}</button>
             </div>
             <div className="space-y-3">
               {activeRumors.map(rumor => (
                 <div key={rumor.id} className="p-3 bg-black/40 border-l-2 border-amber-600">
                    <p className="text-[10px] text-gray-300 italic leading-relaxed">"{rumor.hook}"</p>
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="flex gap-4 border-b border-amber-900/20 pb-4 overflow-x-auto no-scrollbar">
            {(['Rest', 'Mentors', 'Apothecary', 'Smithy'] as TavernTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2 font-cinzel text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-amber-500 bg-amber-900/20 border-b-2 border-amber-500' : 'text-gray-600 hover:text-amber-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Rest' && (
            <div className="flex flex-col h-[550px] rune-border bg-black/40 border-amber-900/30 overflow-hidden shadow-2xl relative">
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
                 {messages.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-up`}>
                      <div className={`max-w-[85%] p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-amber-900/20 border-r-4 border-amber-600 text-gray-200' : 'bg-black/90 border-l-4 border-amber-800 text-amber-100'}`}>
                        <p className="italic font-medium">{msg.content}</p>
                      </div>
                   </div>
                 ))}
               </div>
               <div className="p-4 bg-black border-t border-amber-900/30 flex flex-col md:flex-row gap-4">
                 <input 
                   value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                   placeholder="Speak to the Innkeeper..." className="flex-1 bg-black/40 border-2 border-amber-900/20 p-4 text-amber-200 outline-none rounded-lg font-cinzel"
                 />
                 <button onClick={handleSend} disabled={!input.trim() || isLoading} className="px-10 py-4 bg-amber-900 text-white font-cinzel font-black uppercase tracking-widest border-2 border-amber-600">Speak</button>
               </div>
            </div>
          )}

          {activeTab === 'Mentors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rotatedMentors.map(mentor => {
                const isInParty = partyIds.includes(mentor.id);
                return (
                  <div key={mentor.id} className={`relative p-6 border transition-all flex flex-col gap-5 rounded-sm overflow-hidden ${isInParty ? 'bg-emerald-900/10 border-emerald-500' : 'bg-black/40 border-amber-900/20'}`}>
                    <div>
                      <p className="text-xl font-cinzel font-black text-amber-500">{mentor.name}</p>
                      <p className="text-[9px] text-gray-500 uppercase font-black">{mentor.archetype} • {mentor.role}</p>
                    </div>
                    <p className="text-[11px] text-gray-400 italic leading-relaxed font-medium">"{mentor.description}"</p>
                    <button onClick={() => onToggleParty(mentor.id)} className={`w-full py-3 text-[9px] font-cinzel font-black uppercase border-2 transition-all ${isInParty ? 'bg-emerald-600 text-black border-emerald-600' : 'text-amber-600 border-amber-600/40 hover:bg-amber-600 hover:text-black'}`}>
                      {isInParty ? 'RELEASE SOUL' : 'BIND SOUL'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'Smithy' && (
            <div className="space-y-6">
              <div className="rune-border p-6 bg-black/60 border-emerald-900/40">
                <h3 className="text-xl font-cinzel text-gold mb-4 border-b border-gold/20 pb-2">Tempering of the Blade</h3>
                <div className="space-y-4">
                  {party.map(char => (
                    <div key={char.id} className="space-y-3">
                      <p className="text-[10px] font-cinzel text-emerald-500 uppercase font-black tracking-widest">{char.name}'s Armament</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {char.inventory.filter(i => i.type === 'Weapon' || i.type === 'Armor').map(item => {
                          const cost = calculateUpgradeCost(item);
                          const affordable = canAfford(char, cost);
                          return (
                            <div key={item.id} className="p-4 bg-emerald-900/5 border border-emerald-900/20 flex flex-col justify-between gap-3">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-white uppercase">{item.name}</span>
                                <span className="text-[8px] font-black text-gold uppercase">{item.rarity}</span>
                              </div>
                              <div className="text-[10px] font-black text-gold">● {cost.aurels} AURELS</div>
                              <button 
                                onClick={() => onUpgradeItem(char.id, item.id, cost)}
                                disabled={!affordable}
                                className={`w-full py-2 text-[8px] font-black uppercase tracking-widest border-2 transition-all ${affordable ? 'border-gold text-gold hover:bg-gold hover:text-black' : 'border-gray-800 text-gray-700 opacity-50 cursor-not-allowed'}`}
                              >
                                {affordable ? 'REFORGE +1' : 'INSUFFICIENT GOLD'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Apothecary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(APOTHECARY_TIERS).map(([tier, items]) => (
                <div key={tier} className="rune-border p-5 bg-black/60 border-emerald-900/40 flex flex-col gap-4">
                  <h4 className="text-xs font-cinzel text-emerald-400 border-b border-emerald-900/30 pb-2 uppercase tracking-widest font-black">{tier} Draughts</h4>
                  <div className="space-y-4">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-emerald-900/5 border border-emerald-900/20">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-bold text-white uppercase">{item.name}</p>
                          <span className="text-[9px] font-black text-gold">● {item.cost}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {party.map(char => (
                            <button
                              key={char.id}
                              disabled={char.currency.aurels < item.cost}
                              onClick={() => onBuyItem?.({ id: `item-buy-${idx}-${char.id}`, name: item.name, description: item.desc, type: 'Utility', rarity: 'Common', stats: {} }, char.id, { aurels: item.cost })}
                              className={`flex-1 py-1.5 text-[7px] font-black uppercase tracking-tighter border transition-all ${char.currency.aurels >= item.cost ? 'border-emerald-500/40 text-emerald-500 hover:bg-emerald-500 hover:text-black' : 'border-gray-800 text-gray-800 opacity-30'}`}
                            >
                              {char.name[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TavernScreen;