
import React, { useState, useRef, useEffect } from 'react';
import { Campaign, Message, Character, Item } from '../types';
import { generateDMResponse, parseDMCommand } from '../geminiService';
import { RULES_MANIFEST, MENTORS, TUTORIAL_SCENARIO } from '../constants';

interface DMWindowProps {
  campaign: Campaign | null;
  allCampaigns: Campaign[];
  characters: Character[];
  onMessage: (msg: Message) => void;
  onCreateCampaign: (title: string, prompt: string) => void;
  onSelectCampaign: (id: string) => void;
  onQuitCampaign: () => void;
  onAwardExp: (amount: number) => void;
  onAwardItem: (name: string, data?: Partial<Item>) => void;
  onShortRest: () => void;
  onLongRest: () => void;
  onAIRuntimeUseSlot: (level: number, characterName: string) => boolean;
  isHost: boolean;
}

const DMWindow: React.FC<DMWindowProps> = ({ 
  campaign, allCampaigns, characters, onMessage, onCreateCampaign, 
  onSelectCampaign, onQuitCampaign, onAwardExp, onAwardItem, 
  onShortRest, onLongRest, onAIRuntimeUseSlot, isHost 
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [campaign?.history]);

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
        { characters, mentors: MENTORS, activeRules: RULES_MANIFEST, existingItems: [] }
      );
      
      const dmMsg: Message = { role: 'model', content: responseText || "...", timestamp: Date.now() };
      onMessage(dmMsg);
      
      if (responseText) {
        const { exp, items, shortRest, longRest, usedSlot } = parseDMCommand(responseText);
        
        if (exp > 0) onAwardExp(exp);
        items.forEach(item => onAwardItem(item.name, item.data));
        
        if (usedSlot) {
          const success = onAIRuntimeUseSlot(usedSlot.level, usedSlot.characterName);
          if (success) {
            onMessage({ role: 'system', content: `[Aetheric Drain] ${usedSlot.characterName} consumes a level ${usedSlot.level} slot.`, timestamp: Date.now() });
          }
        }

        if (shortRest) {
          onShortRest();
          onMessage({ role: 'system', content: "The party takes a Short Rest. Vitality and magic partially return.", timestamp: Date.now() });
        }
        if (longRest) {
          onLongRest();
          onMessage({ role: 'system', content: "The party takes a Long Rest. Total restoration of body and spirit.", timestamp: Date.now() });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const manualShortRest = () => {
    onShortRest();
    onMessage({ role: 'system', content: "[Manual Action] The party takes a Short Rest.", timestamp: Date.now() });
  };

  const manualLongRest = () => {
    onLongRest();
    onMessage({ role: 'system', content: "[Manual Action] The party takes a Long Rest.", timestamp: Date.now() });
  };

  if (!campaign) {
    return (
      <div className="space-y-12 max-w-6xl mx-auto animate-in fade-in duration-700">
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-cinzel text-gold drop-shadow-xl">The Chronicle Hub</h2>
          <p className="text-red-900 font-cinzel text-[10px] tracking-[0.3em] uppercase">The Engine stores every drop of blood spilled.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
             <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-red-900/30"></div>
                <h3 className="text-xs font-cinzel text-gold uppercase tracking-widest">Manifest New World</h3>
                <div className="h-px flex-1 bg-red-900/30"></div>
             </div>
             
             {isHost ? (
               <div className="space-y-6">
                  {/* Tutorial Promo Card */}
                  {allCampaigns.length === 0 && (
                    <div className="rune-border p-6 bg-gold/5 border-gold/30 space-y-3 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 bg-gold text-black text-[7px] font-bold px-2 py-0.5 font-cinzel animate-pulse">RECOMMENDED</div>
                      <h4 className="text-sm font-cinzel text-gold">The Trial of Resonance</h4>
                      <p className="text-[10px] text-gray-400 leading-relaxed italic">"The herald of the Engine awaits. Face the spectral guardian and learn the laws of steel and aether."</p>
                      <button 
                        onClick={() => onCreateCampaign(TUTORIAL_SCENARIO.title, TUTORIAL_SCENARIO.prompt)}
                        className="w-full py-3 bg-gold text-black font-cinzel font-bold text-xs hover:bg-white transition-all shadow-lg"
                      >
                        COMMENCE SACRED TRIAL (TUTORIAL)
                      </button>
                    </div>
                  )}

                  <div className="rune-border p-6 bg-black/60 backdrop-blur space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-cinzel text-red-900 uppercase">Chronicle Title</label>
                      <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/40 border border-red-900/30 p-2 text-gold font-cinzel text-sm focus:border-gold outline-none" placeholder="e.g. The Obsidian Spire..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-cinzel text-red-900 uppercase">The Premise</label>
                      <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="w-full bg-black/40 border border-red-900/30 p-2 text-gray-300 text-xs h-32 focus:border-gold outline-none resize-none" placeholder="Describe the shadow falling over the land..." />
                    </div>
                    <button onClick={() => onCreateCampaign(newTitle, newPrompt)} disabled={!newTitle || !newPrompt || characters.length === 0} className="w-full py-4 bg-red-900 hover:bg-red-800 text-white font-cinzel font-bold border border-gold disabled:opacity-30 transition-all shadow-lg shadow-red-900/20">
                      INITIATE CHRONICLE
                    </button>
                  </div>
               </div>
             ) : (
               <div className="rune-border p-8 bg-black/40 border-gold/20 italic text-gray-500 font-cinzel text-center">
                 Waiting for the Engine Host to manifest a new Chronicle...
               </div>
             )}
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-red-900/30"></div>
                <h3 className="text-xs font-cinzel text-gold uppercase tracking-widest">Archived Records</h3>
                <div className="h-px flex-1 bg-red-900/30"></div>
             </div>

             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
               {allCampaigns.length > 0 ? (
                 allCampaigns.slice().reverse().map(c => (
                   <div key={c.id} className="p-4 bg-black/40 border border-red-900/20 hover:border-gold/30 transition-all flex justify-between items-center group">
                     <div className="min-w-0">
                       <h4 className="font-cinzel text-gold group-hover:text-white transition-colors truncate">{c.title}</h4>
                       <p className="text-[8px] text-gray-500 uppercase font-cinzel mt-1">
                         {c.history.length} Entries • Last Resonance: {new Date(c.history[c.history.length-1]?.timestamp || 0).toLocaleDateString()}
                       </p>
                     </div>
                     <button 
                       onClick={() => onSelectCampaign(c.id)}
                       className="px-3 py-1 bg-red-900/20 border border-red-900/40 text-[9px] font-cinzel text-red-900 hover:bg-red-900 hover:text-white transition-all uppercase tracking-tighter"
                     >
                       Rebind Soul
                     </button>
                   </div>
                 ))
               ) : (
                 <div className="py-20 text-center border border-dashed border-red-900/10 opacity-30">
                    <p className="font-cinzel italic text-xs text-gray-500 uppercase">The archives are empty.</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] rune-border bg-black/40 backdrop-blur overflow-hidden max-w-4xl mx-auto">
      <div className="p-3 border-b border-red-900/50 flex justify-between items-center bg-red-900/5">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onQuitCampaign}
            className="text-red-900 hover:text-red-500 font-bold transition-colors text-lg px-2"
          >
            ×
          </button>
          <h3 className="font-cinzel text-gold text-sm truncate uppercase tracking-widest">{campaign.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <>
              <button onClick={manualShortRest} className="text-[8px] text-amber-500 border border-amber-900/40 px-2 py-0.5 hover:bg-amber-900/20 uppercase font-cinzel">Short Rest</button>
              <button onClick={manualLongRest} className="text-[8px] text-blue-500 border border-blue-900/40 px-2 py-0.5 hover:bg-blue-900/20 uppercase font-cinzel">Long Rest</button>
            </>
          )}
          <span className="text-[8px] text-red-900 font-cinzel bg-red-900/10 px-2 py-0.5 border border-red-900/20 uppercase">
            {isHost ? 'ENGINE HOST' : 'BOUND SOUL'}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {campaign.history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-3 ${
              msg.role === 'user' 
              ? 'bg-[#a16207]/10 border border-[#a16207]/30 text-gray-300' 
              : msg.role === 'system'
              ? 'bg-gray-900/50 border border-gray-800 text-gray-500 text-[10px] italic text-center w-full'
              : 'bg-red-900/10 border border-red-900/30 text-gray-200'
            } rounded shadow-lg`}>
              {msg.role === 'model' && <p className="text-[8px] font-cinzel text-red-900 mb-1 uppercase tracking-tighter">THE DUNGEON MASTER</p>}
              <div className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-red-900/5 border border-red-900/30 p-3 rounded animate-pulse">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-red-900 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-red-900 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-red-900 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-black/80 border-t border-red-900/50 flex gap-2 items-end">
        <textarea 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
          placeholder="DECLARE THY ACTIONS..." 
          className="flex-1 bg-transparent border border-red-900/30 p-2 text-gold text-xs focus:border-gold outline-none resize-none h-12 custom-scrollbar" 
        />
        <button 
          onClick={handleSend} 
          disabled={!input.trim() || isLoading} 
          className="px-4 py-2 bg-red-900 text-white text-xs font-cinzel font-bold border border-gold hover:bg-red-800 disabled:opacity-50 transition-all active:scale-95"
        >
          SPEAK
        </button>
      </div>
    </div>
  );
};

export default DMWindow;
