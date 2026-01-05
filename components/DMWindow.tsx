
import React, { useState, useRef, useEffect } from 'react';
import { Campaign, Message, Character, Item, MapToken, Monster, Currency } from '../types';
import { generateDMResponse, parseDMCommand } from '../geminiService';
import { RULES_MANIFEST, MENTORS, TUTORIAL_SCENARIO } from '../constants';
import DiceTray from './DiceTray';
import TacticalMap from './TacticalMap';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [campaign?.history, isLoading]);

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
        
        // Handle Loot Drops (Chance Based)
        for (const drop of lootDrops) {
          const roll = Math.floor(Math.random() * 100) + 1;
          const success = roll <= drop.chance;
          
          if (success) {
            await onAwardItem(drop.itemName);
            onMessage({ 
              role: 'system', 
              content: `[Loot Secured] A d100 roll of ${roll} vs ${drop.chance}% succeeds. ${drop.itemName} has been claimed from the wreckage.`, 
              timestamp: Date.now() 
            });
          } else {
            onMessage({ 
              role: 'system', 
              content: `[Loot Failed] A d100 roll of ${roll} vs ${drop.chance}% fails. The remains yield only dust.`, 
              timestamp: Date.now() 
            });
          }
        }

        for (const mName of monstersToAdd) {
          const m = await onAwardMonster(mName);
          onMessage({ role: 'system', content: `[Aetheric Resonance] The Bestiary grows. ${m.name} (Threat: ${m.expReward} EXP) has been archived.`, timestamp: Date.now() });
        }
        
        if (usedSlot) {
          const success = onAIRuntimeUseSlot(usedSlot.level, usedSlot.characterName);
          if (success) {
            onMessage({ role: 'system', content: `[Aetheric Drain] ${usedSlot.characterName} consumes a level ${usedSlot.level} slot.`, timestamp: Date.now() });
          }
        }

        if (shortRest) {
          onShortRest();
          onMessage({ role: 'system', content: "The party takes a Short Rest.", timestamp: Date.now() });
        }
        if (longRest) {
          onLongRest();
          onMessage({ role: 'system', content: "The party takes a Long Rest.", timestamp: Date.now() });
        }
        if (openShop) {
          onOpenShop();
          onMessage({ role: 'system', content: "A merchant manifests their aetheric wares.", timestamp: Date.now() });
        }
        if (enterCombat) {
          onSetCombatActive(true);
          onMessage({ role: 'system', content: "The Tactical Grid manifests. Prepare for conflict.", timestamp: Date.now() });
        }
        if (exitCombat) {
          onSetCombatActive(false);
          onMessage({ role: 'system', content: "The Tactical Grid fades. Danger has passed.", timestamp: Date.now() });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoll = (dice: string, result: number) => {
    onMessage({ 
      role: 'system', 
      content: `[DICE] ${username} rolls a ${dice}: ${result}`, 
      timestamp: Date.now() 
    });
  };

  if (!campaign) {
    return (
      <div className="space-y-12 max-w-6xl mx-auto animate-in fade-in duration-700 px-2 md:px-4">
        <div className="text-center space-y-6">
          <h2 className="text-4xl md:text-6xl font-cinzel text-gold drop-shadow-2xl">The Chronicle Hub</h2>
          <p className="text-red-900 font-cinzel text-[10px] md:text-xs tracking-[0.4em] uppercase font-bold">The Engine stores every drop of blood spilled.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-6">
             <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-red-900/30"></div>
                <h3 className="text-xs font-cinzel text-gold uppercase tracking-widest font-bold">Manifest New World</h3>
                <div className="h-px flex-1 bg-red-900/30"></div>
             </div>
             
             {isHost ? (
               <div className="space-y-6">
                  {allCampaigns.length === 0 && (
                    <div className="rune-border p-6 bg-gold/5 border-gold/30 space-y-4 relative overflow-hidden group shadow-xl">
                      <div className="absolute top-0 right-0 bg-gold text-black text-[8px] font-bold px-3 py-1 font-cinzel animate-pulse z-10">RECOMMENDED</div>
                      <h4 className="text-lg font-cinzel text-gold">The Trial of Resonance</h4>
                      <p className="text-xs text-gray-400 leading-relaxed italic">"Face the spectral guardian and learn the laws of steel and aether."</p>
                      <button 
                        onClick={() => onCreateCampaign(TUTORIAL_SCENARIO.title, TUTORIAL_SCENARIO.prompt)}
                        className="w-full py-4 bg-gold text-black font-cinzel font-bold text-xs hover:bg-white transition-all shadow-lg active:scale-95"
                      >
                        COMMENCE SACRED TRIAL
                      </button>
                    </div>
                  )}

                  <div className="rune-border p-5 md:p-8 bg-black/60 backdrop-blur space-y-6 shadow-2xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-cinzel text-red-900 uppercase font-bold tracking-widest">Chronicle Title</label>
                      <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/40 border border-red-900/30 p-3 text-gold font-cinzel text-sm focus:border-gold outline-none transition-all" placeholder="e.g. The Obsidian Spire..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-cinzel text-red-900 uppercase font-bold tracking-widest">The Premise</label>
                      <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="w-full bg-black/40 border border-red-900/30 p-4 text-gray-300 text-xs md:text-sm h-40 focus:border-gold outline-none resize-none leading-relaxed" placeholder="Describe the shadow falling..." />
                    </div>
                    <button onClick={() => onCreateCampaign(newTitle, newPrompt)} disabled={!newTitle || !newPrompt || characters.length === 0} className="w-full py-5 bg-red-900 hover:bg-red-800 text-white font-cinzel font-bold border border-gold disabled:opacity-30 transition-all shadow-2xl active:scale-95">
                      INITIATE CHRONICLE
                    </button>
                  </div>
               </div>
             ) : (
               <div className="rune-border p-12 bg-black/40 border-gold/20 italic text-gray-500 font-cinzel text-center text-sm md:text-lg">
                 Waiting for the Engine Host to manifest...
               </div>
             )}
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-red-900/30"></div>
                <h3 className="text-xs font-cinzel text-gold uppercase tracking-widest font-bold">Archived Records</h3>
                <div className="h-px flex-1 bg-red-900/30"></div>
             </div>

             <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar-md">
               {allCampaigns.length > 0 ? (
                 allCampaigns.slice().reverse().map(c => (
                   <div key={c.id} className="p-5 bg-black/40 border border-red-900/20 hover:border-gold/30 transition-all flex justify-between items-center group shadow-md hover:shadow-gold/5">
                     <div className="min-w-0 pr-4">
                       <h4 className="font-cinzel text-gold group-hover:text-white transition-colors truncate text-sm md:text-base font-bold">{c.title}</h4>
                       <p className="text-[10px] text-gray-500 uppercase font-cinzel mt-1 tracking-tighter">
                         {c.history.length} Entries • {new Date(c.history[c.history.length-1]?.timestamp || 0).toLocaleDateString()}
                       </p>
                     </div>
                     <button 
                       onClick={() => onSelectCampaign(c.id)}
                       className="px-4 py-2 bg-red-900/20 border border-red-900/40 text-[10px] font-cinzel text-red-900 hover:bg-red-900 hover:text-white transition-all uppercase font-bold whitespace-nowrap"
                     >
                       Rebind Soul
                     </button>
                   </div>
                 ))
               ) : (
                 <div className="py-24 text-center border-2 border-dashed border-red-900/10 opacity-30">
                    <p className="font-cinzel italic text-xs md:text-sm text-gray-500 uppercase tracking-widest">The archives are empty.</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] rune-border bg-black/40 backdrop-blur overflow-hidden max-w-6xl mx-auto shadow-2xl">
      <div className="flex-1 flex flex-col min-w-0 bg-black/10">
        <div className="p-3 md:p-4 border-b border-red-900/50 flex justify-between items-center bg-red-900/10">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={onQuitCampaign}
              className="text-red-900 hover:text-red-500 font-black transition-colors text-2xl px-3 h-10 flex items-center"
            >
              ×
            </button>
            <h3 className="font-cinzel text-gold text-sm md:text-base truncate uppercase tracking-widest font-bold">{campaign.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {campaign.isCombatActive && <span className="text-[8px] bg-red-900 text-white px-2 py-0.5 animate-pulse font-bold">COMBAT ACTIVE</span>}
            {isHost && (
              <div className="hidden md:flex items-center gap-2">
                <button onClick={onShortRest} className="text-[10px] text-amber-500 border border-amber-900/40 px-3 py-1.5 hover:bg-amber-900/20 uppercase font-cinzel font-bold">Short Rest</button>
                <button onClick={onLongRest} className="text-[10px] text-blue-500 border border-blue-900/40 px-3 py-1.5 hover:bg-blue-900/20 uppercase font-cinzel font-bold">Long Rest</button>
              </div>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-black/20">
          {campaign.history.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-400`}>
              <div className={`max-w-[90%] md:max-w-[85%] p-4 md:p-5 shadow-2xl ${
                msg.role === 'user' 
                ? 'bg-[#a16207]/15 border-r-4 border-gold text-gray-200 rounded-l-xl rounded-tr-xl' 
                : msg.role === 'system'
                ? 'bg-gray-900/60 border border-gray-800 text-gray-500 text-[10px] md:text-xs italic text-center w-full rounded-md py-2'
                : 'bg-red-900/15 border-l-4 border-red-900 text-gray-100 rounded-r-xl rounded-tl-xl'
              }`}>
                {msg.role === 'model' && <p className="text-[10px] font-cinzel text-red-900 mb-2 uppercase font-black tracking-widest">THE ENGINE</p>}
                {msg.role === 'user' && <p className="text-[10px] font-cinzel text-gold mb-2 uppercase font-black tracking-widest text-right">THY DECLARATION</p>}
                <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl animate-pulse">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-red-900 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-red-900 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-red-900 rounded-full animate-bounce delay-300"></div>
                  </div>
               </div>
            </div>
          )}
        </div>

        <DiceTray onRoll={handleRoll} username={username} />

        <div className="p-4 md:p-6 bg-black/90 border-t border-red-900/50 flex gap-3 items-end shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10">
          <textarea 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
            placeholder="DECLARE THY ACTIONS..." 
            className="flex-1 bg-black/40 border border-red-900/40 p-3 md:p-4 text-gold text-xs md:text-sm focus:border-gold outline-none resize-none h-16 md:h-20 custom-scrollbar rounded shadow-inner placeholder:opacity-30 font-medium" 
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading} 
            className="px-6 md:px-10 py-3 md:py-6 bg-red-900 text-white text-xs md:text-sm font-cinzel font-black border border-gold hover:bg-red-800 disabled:opacity-50 transition-all active:scale-90 shadow-2xl flex items-center justify-center"
          >
            SPEAK
          </button>
        </div>
      </div>
    </div>
  );
};

export default DMWindow;
