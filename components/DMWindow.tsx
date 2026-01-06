
import React, { useState, useRef, useEffect } from 'react';
import { Campaign, Message, Character, Item, MapToken, Monster, Currency } from '../types';
import { generateDMResponse, parseDMCommand } from '../geminiService';
import { RULES_MANIFEST, MENTORS, TUTORIAL_SCENARIO } from '../constants';
import DiceTray from './DiceTray';

interface DMWindowProps {
  campaign: Campaign | null;
  allCampaigns: Campaign[];
  characters: Character[];
  bestiary: Monster[];
  mapTokens: MapToken[];
  onUpdateMap: (tokens: MapToken[]) => void;
  onMessage: (msg: Message) => void;
  onCreateCampaign: (title: string, prompt: string) => void;
  onSelectCampaign: (id: string) => void;
  onQuitCampaign: () => void;
  onAwardExp: (amount: number) => void;
  onAwardCurrency: (curr: Partial<Currency>) => void;
  onAwardItem: (name: string, data?: Partial<Item>) => void;
  onAwardMonster: (name: string) => Promise<Monster>;
  onShortRest: () => void;
  onLongRest: () => void;
  onAIRuntimeUseSlot: (level: number, characterName: string) => boolean;
  onOpenShop: () => void;
  onSetCombatActive: (active: boolean) => void;
  isHost: boolean;
  username: string;
}

const DMWindow: React.FC<DMWindowProps> = ({ 
  campaign, allCampaigns, characters, bestiary, mapTokens, onUpdateMap, onMessage, onCreateCampaign, 
  onSelectCampaign, onQuitCampaign, onAwardExp, onAwardCurrency, onAwardItem, onAwardMonster,
  onShortRest, onLongRest, onAIRuntimeUseSlot, onOpenShop, onSetCombatActive, isHost, username
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPartySidebar, setShowPartySidebar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [campaign?.history, isLoading]);

  useEffect(() => {
    if (campaign && campaign.history.length === 1 && isHost && !isLoading) {
      const initiateNarrative = async () => {
        setIsLoading(true);
        try {
          const responseText = await generateDMResponse(
            campaign.history,
            { characters, mentors: MENTORS, activeRules: RULES_MANIFEST, existingItems: [], existingMonsters: bestiary }
          );
          if (responseText) {
            onMessage({ role: 'model', content: responseText, timestamp: Date.now() });
          }
        } catch (e) {
          console.error("Initiation failed", e);
        } finally {
          setIsLoading(false);
        }
      };
      initiateNarrative();
    }
  }, [campaign?.id]);

  const handleSend = async () => {
    if (!campaign || !input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    onMessage(userMsg);
    setInput('');
    
    if (!isHost) return;

    setIsLoading(true);

    try {
      const responseText = await generateDMResponse(
        [...campaign.history, userMsg],
        { characters, mentors: MENTORS, activeRules: RULES_MANIFEST, existingItems: [], existingMonsters: bestiary }
      );
      
      const dmMsg: Message = { role: 'model', content: responseText || "...", timestamp: Date.now() };
      onMessage(dmMsg);
      
      if (responseText) {
        const { exp, currency, items, monstersToAdd, shortRest, longRest, openShop, enterCombat, exitCombat, usedSlot, lootDrops } = parseDMCommand(responseText);
        
        if (exp > 0) onAwardExp(exp);
        if (currency.aurels > 0 || currency.shards > 0 || currency.ichor > 0) onAwardCurrency(currency);
        
        items.forEach(item => onAwardItem(item.name, item.data));
        
        for (const drop of lootDrops) {
          const roll = Math.floor(Math.random() * 100) + 1;
          const success = roll <= drop.chance;
          if (success) {
            await onAwardItem(drop.itemName);
            onMessage({ role: 'system', content: `[Loot] d100: ${roll} vs ${drop.chance}%. ${drop.itemName} secured.`, timestamp: Date.now() });
          }
        }

        for (const mName of monstersToAdd) {
          const m = await onAwardMonster(mName);
          onMessage({ role: 'system', content: `[Manifestation] ${m.name} enters the fray.`, timestamp: Date.now() });
        }
        
        if (usedSlot) {
          onAIRuntimeUseSlot(usedSlot.level, usedSlot.characterName);
        }

        if (shortRest) onMessage({ role: 'system', content: "The party rests briefly.", timestamp: Date.now() });
        if (longRest) onMessage({ role: 'system', content: "The party takes a full rest.", timestamp: Date.now() });
        if (openShop) onOpenShop();
        if (enterCombat) onSetCombatActive(true);
        if (exitCombat) onSetCombatActive(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoll = (dice: string, result: number) => {
    onMessage({ role: 'system', content: `[DICE] ${username} rolled ${dice}: ${result}`, timestamp: Date.now() });
  };

  if (!campaign) {
    return (
      <div className="space-y-12 max-w-4xl mx-auto animate-in fade-in px-4 py-8">
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-cinzel text-gold font-black drop-shadow-2xl">The Chronicles</h2>
          <p className="text-red-700 font-cinzel text-xs tracking-[0.3em] uppercase font-bold opacity-80">Aetheric Records of Blood and Glory</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
             <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-red-900/30 pb-2">Manifest Reality</h3>
             
             {isHost ? (
               <div className="space-y-6">
                  {allCampaigns.length === 0 && (
                    <div className="rune-border p-6 bg-red-900/5 border-gold/40 shadow-xl space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xl font-cinzel text-gold font-bold">Begin the Saga</h4>
                        <span className="bg-gold text-black text-[9px] font-black px-2 py-0.5 rounded-sm">NEW PLAYER</span>
                      </div>
                      <p className="text-xs text-gray-400 italic">Embark on a guided journey from Level 1 to 5.</p>
                      <button 
                        onClick={() => onCreateCampaign(TUTORIAL_SCENARIO.title, TUTORIAL_SCENARIO.prompt)}
                        className="w-full py-4 bg-red-900 text-white font-cinzel font-black border border-gold shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                      >
                        INITIATE SACRED SAGA
                      </button>
                    </div>
                  )}

                  <div className="rune-border p-6 bg-black/60 backdrop-blur space-y-5">
                    <input 
                      value={newTitle} 
                      onChange={e => setNewTitle(e.target.value)} 
                      className="w-full bg-black/40 border border-red-900/50 p-4 text-gold font-cinzel text-base focus:border-gold outline-none transition-all placeholder:text-red-900/30" 
                      placeholder="CHRONICLE TITLE..." 
                    />
                    <textarea 
                      value={newPrompt} 
                      onChange={e => setNewPrompt(e.target.value)} 
                      className="w-full bg-black/40 border border-red-900/50 p-4 text-gray-200 text-sm h-32 focus:border-gold outline-none resize-none leading-relaxed" 
                      placeholder="THE PREMISE OF THY WORLD..." 
                    />
                    <button 
                      onClick={() => onCreateCampaign(newTitle, newPrompt)} 
                      disabled={!newTitle || !newPrompt || characters.length === 0} 
                      className="w-full py-5 bg-red-900 text-white font-cinzel font-black border border-gold disabled:opacity-30 active:scale-95 transition-all"
                    >
                      BEND REALITY
                    </button>
                  </div>
               </div>
             ) : (
               <div className="rune-border p-12 bg-black/40 text-gray-500 font-cinzel text-center">
                 Waiting for the Master of Fate...
               </div>
             )}
          </div>

          <div className="space-y-6">
             <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-red-900/30 pb-2">Ancient Scrolls</h3>
             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
               {allCampaigns.length > 0 ? (
                 allCampaigns.slice().reverse().map(c => (
                   <div key={c.id} className="p-5 bg-black/40 border-2 border-red-900/20 hover:border-gold/60 transition-all flex justify-between items-center group shadow-2xl">
                     <div className="min-w-0 pr-4">
                       <h4 className="font-cinzel text-lg text-gold group-hover:text-white truncate font-black">{c.title}</h4>
                       <p className="text-[10px] text-gray-500 uppercase tracking-tighter mt-1">{c.history.length} Memories Recalled</p>
                     </div>
                     <button onClick={() => onSelectCampaign(c.id)} className="px-5 py-2 bg-red-900/10 border border-red-900/40 text-[10px] font-cinzel text-gold hover:bg-red-900 hover:text-white font-black whitespace-nowrap">REBIND</button>
                   </div>
                 ))
               ) : (
                 <div className="py-24 text-center border-2 border-dashed border-red-900/10 opacity-40">
                    <p className="font-cinzel italic text-gray-500 uppercase tracking-widest">Thy records are empty.</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-100px)] w-full overflow-hidden bg-[#0c0a09]">
      <div className="flex flex-1 min-h-0">
        {/* Chat Section */}
        <div className="flex flex-col flex-1 min-w-0 relative">
          <div className="p-4 border-b-2 border-red-900/60 flex justify-between items-center bg-black/40 backdrop-blur shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={onQuitCampaign} className="text-red-700 hover:text-red-500 font-black text-3xl h-10 px-2 flex items-center transition-transform hover:scale-110">×</button>
              <h3 className="font-cinzel text-gold text-lg truncate font-black tracking-[0.1em]">{campaign.title}</h3>
            </div>
            <div className="flex items-center gap-3">
               {campaign.isCombatActive && <span className="hidden sm:inline-block text-[9px] bg-red-900 text-white px-3 py-1 animate-pulse font-black rounded-sm border border-gold/30">WAR IN PROGRESS</span>}
               <button 
                 onClick={() => setShowPartySidebar(!showPartySidebar)}
                 className="md:hidden w-10 h-10 flex items-center justify-center border-2 border-gold/40 text-gold rounded-full bg-gold/5"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
               </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar bg-leather bg-fixed">
            {campaign.history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[95%] md:max-w-[80%] p-5 shadow-2xl relative ${
                  msg.role === 'user' 
                  ? 'bg-gold/10 border-r-4 border-gold text-white rounded-l-2xl' 
                  : msg.role === 'system'
                  ? 'bg-gray-900/60 border border-gray-700 text-gray-400 text-xs italic text-center w-full rounded-lg py-3 px-6'
                  : 'bg-red-900/10 border-l-4 border-red-900 text-parchment rounded-r-2xl'
                }`}>
                  {msg.role === 'model' && <p className="text-[10px] font-cinzel text-red-600 mb-2 font-black tracking-[0.3em] uppercase">The Engine Speaks</p>}
                  {msg.role === 'user' && <p className="text-[10px] font-cinzel text-gold/80 mb-2 font-black tracking-[0.3em] text-right uppercase">Thy Proclamation</p>}
                  <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-red-900/20 border-2 border-red-900/40 p-4 rounded-2xl animate-pulse flex gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                 </div>
              </div>
            )}
          </div>

          <DiceTray onRoll={handleRoll} username={username} />

          <div className="p-4 md:p-8 bg-black border-t-2 border-red-900/60 flex gap-4 items-end shadow-2xl shrink-0 z-10">
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
              placeholder="COMMAND THE VOID..." 
              className="flex-1 bg-black/60 border-2 border-red-900/40 p-4 text-gold text-base md:text-lg focus:border-gold outline-none resize-none h-20 md:h-28 custom-scrollbar rounded-lg placeholder:text-red-900/20 font-cinzel" 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading} 
              className="w-20 md:w-32 h-20 md:h-28 bg-red-900 text-white font-cinzel font-black border-2 border-gold shadow-2xl hover:bg-red-700 active:scale-90 transition-all disabled:opacity-30 flex items-center justify-center uppercase tracking-widest text-xs md:text-sm"
            >
              SPEAK
            </button>
          </div>

          {/* Mobile Overlay Party Sidebar */}
          {showPartySidebar && (
            <div className="md:hidden absolute inset-0 z-50 bg-black/90 animate-in fade-in duration-300">
               <div className="w-full h-full p-6 flex flex-col">
                  <div className="flex justify-between items-center border-b border-gold/30 pb-4 mb-4">
                     <h4 className="text-xl font-cinzel text-gold font-black">Bonded Souls</h4>
                     <button onClick={() => setShowPartySidebar(false)} className="text-red-700 text-4xl font-black">×</button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-6">
                    {characters.map(char => (
                      <div key={char.id} className="rune-border p-4 bg-red-900/5 space-y-3">
                         <div className="flex justify-between">
                            <p className="text-lg font-cinzel text-white font-bold">{char.name}</p>
                            <p className="text-xs text-gold font-black">LVL {char.level}</p>
                         </div>
                         <p className="text-xs text-red-700 font-bold uppercase">{char.archetype}</p>
                         <div className="space-y-1">
                            <div className="flex justify-between text-[10px] uppercase font-black text-gray-500">
                               <span>Vitality</span>
                               <span className="text-white">{char.currentHp}/{char.maxHp}</span>
                            </div>
                            <div className="h-2 bg-black rounded-full overflow-hidden border border-red-900/20">
                               <div className="h-full bg-red-900" style={{ width: `${(char.currentHp/char.maxHp)*100}%` }} />
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={onOpenShop} className="mt-6 w-full py-4 bg-gold text-black font-cinzel font-black text-sm border-2 border-black active:scale-95">CONVOKE MERCHANT</button>
               </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar (Unchanged but ensuring contrast) */}
        <div className="hidden md:flex flex-col w-80 bg-black/80 border-l-2 border-red-900/50 overflow-y-auto custom-scrollbar shrink-0 shadow-2xl">
          <div className="p-6 border-b border-red-900/30 bg-red-900/5">
             <h4 className="text-sm font-cinzel text-gold uppercase font-black tracking-widest">Active Fellowship</h4>
          </div>
          <div className="flex-1 p-6 space-y-6">
            {characters.map(char => (
              <div key={char.id} className="space-y-3 pb-6 border-b border-red-900/20 group">
                <div className="flex justify-between items-baseline">
                  <p className="text-lg font-cinzel text-white font-black group-hover:text-gold transition-colors">{char.name}</p>
                  <p className="text-[10px] text-gray-500 font-black">LVL {char.level}</p>
                </div>
                <p className="text-xs text-red-800 font-black uppercase tracking-tighter">{char.archetype}</p>
                <div className="space-y-1">
                   <div className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden border border-red-900/10">
                     <div className="h-full bg-red-900 shadow-[0_0_10px_#991b1b]" style={{ width: `${(char.currentHp / char.maxHp) * 100}%` }} />
                   </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-black">
             <button onClick={onOpenShop} className="w-full py-3 bg-red-900/10 border-2 border-gold text-gold font-cinzel font-black text-[10px] uppercase hover:bg-gold hover:text-black transition-all shadow-xl">Consult Merchant</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMWindow;