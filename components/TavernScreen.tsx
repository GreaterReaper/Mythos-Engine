import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Character, Message, Item, Currency, Role, Archetype, Rumor } from '../types';
import { generateInnkeeperResponse, generateItemDetails, safeId } from '../geminiService';
import { APOTHECARY_TIERS, ARCHETYPE_INFO } from '../constants';

type TavernTab = 'Rest' | 'Mentors' | 'Merchant';

interface TavernScreenProps {
  party: Character[];
  mentors: Character[];
  partyIds: string[];
  onToggleParty: (id: string) => void;
  onLongRest: () => void;
  isHost: boolean;
  activeRumors: Rumor[];
  onFetchRumors: () => void;
  isRumorLoading: boolean;
  isBetweenCampaigns: boolean;
  onBuyItem?: (item: Item, buyerId: string, cost: Currency) => void;
}

const TavernScreen: React.FC<TavernScreenProps> = ({ 
  party, mentors, partyIds, onToggleParty, onLongRest, isHost, activeRumors, onFetchRumors, isRumorLoading, isBetweenCampaigns, onBuyItem
}) => {
  const [activeTab, setActiveTab] = useState<TavernTab>('Rest');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Welcome to 'The Broken Cask', traveler. Rest thy bones, the fire is warm. What's on thy mind?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingGear, setIsGeneratingGear] = useState(false);
  const [merchantInventory, setMerchantInventory] = useState<Item[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const activeChar = party.find(c => c.isPrimarySoul) || party[0];

  // Generate specialized inventory when opening the Merchant tab
  useEffect(() => {
    if (activeTab === 'Merchant' && isBetweenCampaigns && activeChar && merchantInventory.length === 0) {
      handlePrepareMerchant();
    }
  }, [activeTab, isBetweenCampaigns, activeChar?.id]);

  const handlePrepareMerchant = async () => {
    if (!activeChar) return;
    setIsGeneratingGear(true);
    
    try {
      const items: Item[] = [];
      
      // 1. Add Apothecary Potions
      const allPotions = [...APOTHECARY_TIERS.HEALTH, ...APOTHECARY_TIERS.AETHER];
      allPotions.forEach(p => {
        items.push({
          id: `potion-${safeId()}`,
          name: p.name,
          description: p.desc,
          type: 'Utility',
          rarity: 'Common',
          stats: { cost: p.cost } as any // Temporary cost storage for UI
        });
      });

      // 2. Generate Class-Specific "Superior" Gear
      const arch = activeChar.archetype as Archetype;
      const baseGear = ARCHETYPE_INFO[arch]?.starterGear || [];
      
      for (const gearName of baseGear) {
        const details = await generateItemDetails(`Superior ${gearName}`, `Honed armament for a Level ${activeChar.level} ${arch}`);
        items.push({
          id: `gear-${safeId()}`,
          name: details.name || `Superior ${gearName}`,
          description: details.description || "Forged by Elias's steady hand.",
          type: (details.type as any) || (gearName.toLowerCase().includes('plate') ? 'Armor' : 'Weapon'),
          rarity: 'Uncommon',
          stats: { ...(details.stats || {}), cost: 250 } as any // Fixed price for class gear
        });
      }

      setMerchantInventory(items);
    } catch (e) {
      console.error("Merchant Forge Failed", e);
    } finally {
      setIsGeneratingGear(false);
    }
  };

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-up pb-20">
      <div className="border-b border-amber-900/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-5xl font-cinzel text-amber-600 font-black tracking-tighter">The Broken Cask</h2>
          <p className="text-gray-500 italic text-sm font-medium">"Warmth for the cold, steel for the weak."</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-amber-900/20 pb-4">
        {(['Rest', 'Mentors', 'Merchant'] as TavernTab[]).map(tab => (
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col h-[550px] rune-border bg-black/40 border-amber-900/30 overflow-hidden relative">
             <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
               {messages.map((msg, idx) => (
                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-amber-900/20 border-r-4 border-amber-600 text-gray-200' : 'bg-black/90 border-l-4 border-amber-800 text-amber-100'}`}>
                      <p className="italic font-medium">{msg.content}</p>
                    </div>
                 </div>
               ))}
             </div>
             <div className="p-4 bg-black border-t border-amber-900/30 flex gap-4">
               <input 
                 value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                 placeholder="Speak to Barnaby..." className="flex-1 bg-black/40 border-2 border-amber-900/20 p-4 text-amber-200 outline-none rounded-lg font-cinzel"
               />
               <button onClick={handleSend} disabled={!input.trim() || isLoading} className="px-10 py-4 bg-amber-900 text-white font-cinzel font-black uppercase tracking-widest border-2 border-amber-600">Speak</button>
             </div>
          </div>
          <div className="space-y-6">
            <div className="rune-border p-5 bg-amber-900/5 border-amber-900/20 space-y-4">
               <div className="flex justify-between items-center border-b border-amber-900/30 pb-2">
                  <h4 className="text-[10px] font-cinzel text-amber-700 uppercase font-black tracking-widest">Whispers</h4>
                  <button onClick={onFetchRumors} disabled={isRumorLoading} className="text-[9px] font-black text-amber-600 hover:text-amber-500 uppercase">EAVESDROP</button>
               </div>
               <div className="space-y-3">
                 {activeRumors.map(rumor => (
                   <div key={rumor.id} className="p-3 bg-black/40 border-l-2 border-amber-600">
                      <p className="text-[10px] text-gray-300 italic leading-relaxed">"{rumor.hook}"</p>
                   </div>
                 ))}
                 {activeRumors.length === 0 && (
                   <p className="text-[9px] text-gray-700 italic text-center py-4">The air is silent... for now.</p>
                 )}
               </div>
            </div>
            <button 
              onClick={onLongRest}
              className="w-full py-4 bg-black border-2 border-amber-900 text-amber-500 font-cinzel font-black uppercase tracking-widest hover:bg-amber-950 transition-all shadow-xl"
            >
              Take Long Rest
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Mentors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mentors.map(mentor => {
            const isInParty = partyIds.includes(mentor.id);
            return (
              <div key={mentor.id} className={`p-6 border transition-all flex flex-col gap-5 ${isInParty ? 'bg-emerald-900/10 border-emerald-500' : 'bg-black/40 border-amber-900/20'}`}>
                <div>
                  <p className="text-xl font-cinzel font-black text-amber-500">{mentor.name}</p>
                  <p className="text-[9px] text-gray-500 uppercase font-black">{mentor.archetype}</p>
                </div>
                <p className="text-[11px] text-gray-400 italic leading-relaxed font-medium">"{mentor.description}"</p>
                <button onClick={() => onToggleParty(mentor.id)} className={`w-full py-3 text-[9px] font-cinzel font-black uppercase border-2 transition-all ${isInParty ? 'bg-emerald-600 text-black border-emerald-600' : 'text-amber-600 border-amber-600/40 hover:bg-amber-600 hover:text-black'}`}>
                  {isInParty ? 'RELEASE' : 'BIND'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'Merchant' && (
        <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
          {!isBetweenCampaigns ? (
            <div className="rune-border p-12 bg-black/60 border-amber-900/40 text-center space-y-4">
               <h3 className="text-2xl font-cinzel text-amber-900 uppercase font-black">Shop Shuttered</h3>
               <p className="text-xs text-gray-600 italic max-w-md mx-auto leading-relaxed">
                 "Elias has departed for the frontline to supply the vanguard. He returns only when the chronicles are silent and the Fellowship rests."
               </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center bg-amber-900/10 border border-amber-900/30 p-6 rounded shadow-xl gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-amber-900/20 border-2 border-amber-600 flex items-center justify-center font-cinzel text-amber-600 text-3xl font-black">E</div>
                   <div>
                      <h3 className="text-xl font-cinzel text-amber-500 font-black uppercase">Elias the Weary</h3>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Inter-Campaign Quartermaster</p>
                   </div>
                </div>
                {activeChar && (
                  <div className="text-center md:text-right">
                    <p className="text-[8px] text-gray-500 uppercase font-black">Thy Aurels</p>
                    <p className="text-2xl font-black text-amber-500">{activeChar.currency.aurels}</p>
                  </div>
                )}
              </div>

              {isGeneratingGear ? (
                <div className="py-24 text-center animate-pulse">
                   <p className="text-amber-600 font-cinzel text-xs font-black uppercase tracking-[0.4em]">Unpacking Crates of Obsidian Steel...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {merchantInventory.map(item => {
                     const cost = (item.stats as any)?.cost || 100;
                     const affordable = activeChar && activeChar.currency.aurels >= cost;
                     
                     return (
                       <div key={item.id} className="rune-border p-5 bg-black/60 border-amber-900/20 hover:border-amber-500 transition-all flex flex-col justify-between group h-52">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                               <h4 className="text-sm font-cinzel text-amber-400 font-black uppercase group-hover:text-white transition-colors">{item.name}</h4>
                               <span className="text-[8px] bg-amber-900/20 text-amber-600 px-1.5 py-0.5 border border-amber-900/40 rounded italic font-black">{item.type}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 italic leading-relaxed line-clamp-2">"{item.description}"</p>
                          </div>
                          <div className="flex justify-between items-center mt-4 pt-4 border-t border-amber-900/10">
                             <div className="flex items-center gap-2">
                                <span className="text-gold text-[10px]">●</span>
                                <span className="text-xs font-black text-amber-500">{cost}</span>
                             </div>
                             <button 
                               onClick={() => activeChar && onBuyItem?.(item, activeChar.id, { aurels: cost })}
                               disabled={!affordable}
                               className={`px-4 py-1.5 border-2 text-[9px] font-black uppercase transition-all ${affordable ? 'border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-black' : 'border-gray-800 text-gray-800 opacity-30 cursor-not-allowed'}`}
                             >
                               {affordable ? 'Acquire' : 'Insufficient'}
                             </button>
                          </div>
                       </div>
                     );
                   })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TavernScreen;
