import React, { useState, useRef, useEffect } from 'react';
import { Campaign, Message, Character, Item, MapToken, Monster, Currency, Rumor } from '../types';
import { generateDMResponse, parseDMCommand } from '../geminiService';
import { RULES_MANIFEST, MENTORS, TUTORIAL_SCENARIO } from '../constants';
import DiceTray from './DiceTray';

interface DMWindowProps {
  campaign: Campaign | null;
  allCampaigns: Campaign[];
  characters: Character[];
  bestiary: Monster[];
  mapTokens: MapToken[];
  activeRumors: Rumor[];
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
  onOpenCombatMap?: () => void;
  onSetCombatActive: (active: boolean) => void;
  isHost: boolean;
  username: string;
}

const DMWindow: React.FC<DMWindowProps> = ({ 
  campaign, allCampaigns, characters, bestiary, mapTokens, activeRumors, onUpdateMap, onMessage, onCreateCampaign, 
  onSelectCampaign, onQuitCampaign, onAwardExp, onAwardCurrency, onAwardItem, onAwardMonster,
  onShortRest, onLongRest, onAIRuntimeUseSlot, onOpenShop, onSetCombatActive, isHost, username, onOpenCombatMap
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakCooldown, setSpeakCooldown] = useState(0);
  const [showPartySidebar, setShowPartySidebar] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [campaign?.history, isLoading]);

  useEffect(() => {
    let timer: any;
    if (speakCooldown > 0) {
      timer = setInterval(() => setSpeakCooldown(prev => Math.max(0, prev - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [speakCooldown]);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const nextReset = new Date();
      nextReset.setUTCHours(24, 0, 0, 0); 
      const diff = nextReset.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };
    const timer = setInterval(() => setTimeUntilReset(calculateTimeRemaining()), 1000);
    setTimeUntilReset(calculateTimeRemaining());
    return () => clearInterval(timer);
  }, []);

  const handleSend = async () => {
    if (!campaign || !input.trim() || isLoading || speakCooldown > 0) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    onMessage(userMsg);
    setInput('');
    setSpeakCooldown(12);
    
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
        
        if (exp > 0) {
          onAwardExp(exp);
          onMessage({ role: 'system', content: `[EXP] Party manifests ${exp} shards of memory.`, timestamp: Date.now() });
        }
        if (currency.aurels > 0 || currency.shards > 0 || currency.ichor > 0) onAwardCurrency(currency);
        
        items.forEach(item => onAwardItem(item.name, item.data));
        
        for (const drop of lootDrops) {
          const roll = Math.floor(Math.random() * 100) + 1;
          if (roll <= drop.chance) {
            await onAwardItem(drop.itemName);
            onMessage({ role: 'system', content: `[Loot] d100: ${roll} vs ${drop.chance}%. ${drop.itemName} secured.`, timestamp: Date.now() });
          }
        }

        for (const mName of monstersToAdd) {
          onMessage({ role: 'system', content: `[WARNING] The Engine is weaving a new foe: ${mName}...`, timestamp: Date.now() });
          const m = await onAwardMonster(mName);
          onMessage({ role: 'system', content: `[Manifestation] ${m.name} (CR ${m.cr}) enters the fray.`, timestamp: Date.now() });
        }
        
        if (usedSlot) {
          const used = onAIRuntimeUseSlot(usedSlot.level, usedSlot.characterName);
          if (used) onMessage({ role: 'system', content: `[Aether] ${usedSlot.characterName} expends a level ${usedSlot.level} well.`, timestamp: Date.now() });
        }
        if (shortRest) onShortRest();
        if (longRest) onLongRest();
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
                      <button onClick={() => onCreateCampaign(TUTORIAL_SCENARIO.title, TUTORIAL_SCENARIO.prompt)} className="w-full py-4 bg-red-900 text-white font-cinzel font-black border border-gold shadow-lg shadow-red-900/20 transition-all">INITIATE SACRED SAGA</button>
                    </div>
                  )}

                  <div className="rune-border p-6 bg-black/60 backdrop-blur space-y-5">
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/40 border border-red-900/50 p-4 text-gold font-cinzel text-base focus:border-gold outline-none transition-all placeholder:text-red-900/30" placeholder="CHRONICLE TITLE..." />
                    {activeRumors.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-cinzel text-amber-700 uppercase font-black tracking-widest">Whispers from the Cask</label>
                        <div className="grid gap-2">
                          {activeRumors.map((rumor) => (
                            <button key={rumor.id} onClick={() => { setNewPrompt(`[Quest Scale: ${rumor.length}] [Danger: ${rumor.danger}] Hook: ${rumor.hook}`); if (!newTitle) setNewTitle(`Quest: ${rumor.hook.substring(0, 20)}...`); }} className="text-left p-3 bg-amber-900/10 border border-amber-900/30 text-[10px] text-gray-400 hover:text-gold hover:border-gold transition-all italic leading-relaxed group">
                              <div className="flex justify-between items-center mb-1 opacity-50 group-hover:opacity-100">
                                <span className="text-[7px] font-black uppercase">{rumor.danger}</span>
                                <span className="text-[7px] font-black uppercase">{rumor.length}</span>
                              </div>
                              "{rumor.hook}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="w-full bg-black/40 border border-red-900/50 p-4 text-gray-200 text-sm h-32 focus:border-gold outline-none resize-none leading-relaxed" placeholder="THE PREMISE OF THY WORLD..." />
                    <button onClick={() => onCreateCampaign(newTitle, newPrompt)} disabled={!newTitle || !newPrompt || characters.length === 0} className="w-full py-5 bg-red-900 text-white font-cinzel font-black border border-gold disabled:opacity-30 active:scale-90 transition-all">BEND REALITY</button>
                  </div>
               </div>
             ) : (
               <div className="rune-border p-12 bg-black/40 text-gray-500 font-cinzel text-center">Waiting for the Master of Fate...</div>
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
    <div className="flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-60px)] w-full overflow-hidden bg-[#0c0a09]">
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header - Compact & Focused */}
          <div className="px-4 py-2 border-b-2 border-red-900/60 flex justify-between items-center bg-black/80 backdrop-blur shrink-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onQuitCampaign} title="Return to scrolls" className="text-red-900 hover:text-red-500 font-black text-2xl px-1 transition-colors">×</button>
              <div className="flex flex-col min-w-0">
                <h3 className="font-cinzel text-gold text-xs md:text-sm truncate font-black tracking-[0.1em]">{campaign.title}</h3>
                <span className="text-[7px] font-mono text-amber-600/60 font-bold uppercase tracking-tighter">Cycle: {timeUntilReset}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               {campaign.isCombatActive && (
                 <button 
                   onClick={onOpenCombatMap}
                   className="flex items-center gap-1.5 bg-red-950/80 text-white px-3 py-1.5 animate-pulse rounded-sm border border-gold/40 shadow-[0_0_10px_#991b1b] hover:scale-105 transition-transform"
                 >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                   <span className="text-[9px] font-black">BATTLEFIELD</span>
                 </button>
               )}
               <button onClick={() => setShowPartySidebar(!showPartySidebar)} className="md:hidden w-8 h-8 flex items-center justify-center border border-gold/40 text-gold rounded-full bg-gold/5">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
               </button>
            </div>
          </div>

          {/* Dialogue Area - Enhanced readability */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-12 md:py-8 space-y-6 custom-scrollbar bg-[#0c0a09] relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]" />
            {campaign.history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                <div className={`max-w-[95%] md:max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-gold/[0.08] border border-gold/30 text-white rounded-l-xl rounded-tr-sm p-4' 
                    : msg.role === 'system' 
                    ? 'bg-gray-950/40 border border-red-900/10 text-red-900/60 text-[10px] italic text-center w-full max-w-lg mx-auto py-2 px-4 rounded-sm' 
                    : 'bg-black border-l-4 border-red-900 text-[#e7e5e4] rounded-r-xl rounded-tl-sm p-5 shadow-xl'
                }`}>
                  {msg.role === 'model' && <p className="text-[9px] font-cinzel text-red-700 mb-2 font-black tracking-[0.2em] uppercase border-b border-red-900/10 pb-1">The Engine Speaks</p>}
                  {msg.role === 'user' && <p className="text-[9px] font-cinzel text-gold/60 mb-2 font-black tracking-[0.2em] text-right uppercase italic">Thy Intent</p>}
                  <div className={`${msg.role === 'system' ? 'font-mono' : 'font-serif md:text-lg'} leading-relaxed whitespace-pre-wrap`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-red-900/10 border border-red-900/20 p-4 rounded-xl animate-pulse flex gap-2">
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                 </div>
              </div>
            )}
          </div>

          {/* Footer - Optimized for Dialogue Entry */}
          <div className="shrink-0 z-10 bg-black border-t-2 border-red-900/40">
            <DiceTray onRoll={handleRoll} username={username} />
            <div className="p-3 md:p-5 flex gap-3 items-end max-w-5xl mx-auto w-full">
              <div className="flex-1 relative">
                <textarea 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                  placeholder="VOICE THY WILL..." 
                  className={`w-full bg-[#1c1917] border-2 border-red-900/20 p-3 text-gold text-sm md:text-base focus:border-gold outline-none resize-none h-16 md:h-24 custom-scrollbar rounded-lg placeholder:text-red-900/20 font-cinzel transition-all shadow-inner`} 
                />
                {speakCooldown > 0 && (
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center rounded-lg border border-red-900 animate-in fade-in duration-300">
                    <div className="flex flex-col items-center">
                      <p className="text-[8px] font-cinzel text-red-700 uppercase font-black animate-pulse">Aether Recoiling</p>
                      <p className="text-lg font-mono text-gold font-bold">{speakCooldown}s</p>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading || speakCooldown > 0} 
                className={`w-20 md:w-28 h-16 md:h-24 font-cinzel font-black border-2 transition-all flex flex-col items-center justify-center uppercase tracking-widest text-[10px] rounded-lg ${
                  speakCooldown > 0
                    ? 'bg-black/50 text-red-900 border-red-900/20 opacity-50' 
                    : 'bg-red-900 text-white border-gold/60 shadow-xl hover:bg-red-800 active:scale-95'
                }`}
              >
                <span>SPEAK</span>
                {(speakCooldown > 0) && <span className="text-[7px] font-mono mt-1 opacity-60">CD {speakCooldown}s</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Party Overlay */}
        {showPartySidebar && (
          <div className="md:hidden absolute inset-0 z-50 bg-black/95 animate-in slide-in-from-right duration-300 overflow-y-auto p-6">
            <div className="flex justify-between items-center border-b border-red-900 pb-4 mb-6">
               <h4 className="text-xl font-cinzel text-gold font-black">Fellowship Status</h4>
               <button onClick={() => setShowPartySidebar(false)} className="text-red-900 text-2xl font-black">×</button>
            </div>
            <div className="space-y-8">
              {characters.map(char => (
                <CharacterStatusItem key={char.id} char={char} />
              ))}
            </div>
            {isHost && (
              <div className="mt-10 space-y-3">
                 <button onClick={() => { onOpenShop(); setShowPartySidebar(false); }} className="w-full py-4 bg-gold text-black font-cinzel font-black uppercase text-xs border border-black shadow-xl">Consult Merchant</button>
                 <button onClick={() => { onLongRest(); setShowPartySidebar(false); }} className="w-full py-4 border-2 border-red-900 text-red-900 font-cinzel font-black uppercase text-xs">Long Rest (Restore All)</button>
              </div>
            )}
          </div>
        )}

        {/* Desktop Sidebar - Streamlined */}
        <div className="hidden md:flex flex-col w-72 bg-[#0c0a09] border-l-2 border-red-900/30 overflow-y-auto custom-scrollbar shrink-0 shadow-2xl">
          <div className="p-4 border-b border-red-900/20 bg-red-900/5">
             <h4 className="text-[10px] font-cinzel text-gold uppercase font-black tracking-widest">Active Fellowship</h4>
          </div>
          <div className="flex-1 p-5 space-y-6">
            {characters.map(char => (
              <CharacterStatusItem key={char.id} char={char} />
            ))}
          </div>
          {isHost && (
            <div className="p-4 bg-black border-t border-red-900/10 space-y-2">
              <button onClick={onOpenShop} className="w-full py-2 bg-red-950/20 border border-gold/40 text-gold font-cinzel font-black text-[9px] uppercase hover:bg-gold/10 transition-all">Summon Merchant</button>
              <button onClick={onShortRest} className="w-full py-2 bg-red-950/20 border border-red-900/40 text-red-900 font-cinzel font-black text-[9px] uppercase hover:bg-red-950/40 transition-all">Short Rest</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for character status
const CharacterStatusItem: React.FC<{ char: Character }> = ({ char }) => (
  <div className="space-y-2.5 group">
    <div className="flex justify-between items-baseline">
      <p className="text-sm font-cinzel text-white font-black group-hover:text-gold transition-colors">{char.name}</p>
      <p className="text-[8px] text-gray-500 font-black">LVL {char.level}</p>
    </div>
    <div className="space-y-1">
       <div className="flex justify-between items-center text-[7px] font-black uppercase text-gray-600">
          <span>Vitality</span>
          <span className={char.currentHp < (char.maxHp / 2) ? 'text-red-600' : ''}>{char.currentHp}/{char.maxHp}</span>
       </div>
       <div className="h-1 w-full bg-gray-950 rounded-full overflow-hidden border border-red-900/10">
         <div 
          className={`h-full transition-all duration-700 ${char.currentHp < (char.maxHp / 4) ? 'bg-red-600 animate-pulse' : 'bg-red-900 shadow-[0_0_8px_#991b1b]'}`} 
          style={{ width: `${(char.currentHp / char.maxHp) * 100}%` }} 
         />
       </div>
    </div>
    <div className="space-y-1">
       <div className="flex justify-between items-center text-[7px] font-black uppercase text-gray-600">
          <span>XP Resonance</span>
          <span>{char.exp}</span>
       </div>
       <div className="h-0.5 w-full bg-gray-950 rounded-full overflow-hidden border border-gold/10">
         <div className="h-full bg-gold shadow-[0_0_4px_#d4af37]" style={{ width: `${(char.exp / (char.level * 1000)) * 100}%` }} />
       </div>
    </div>
  </div>
);

export default DMWindow;