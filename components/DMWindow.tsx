
import React, { useState, useRef, useEffect } from 'react';
import { Campaign, Message, Character, Item } from '../types';
import { generateDMResponse, parseDMCommand } from '../geminiService';
import { RULES_MANIFEST, MENTORS } from '../constants';

interface DMWindowProps {
  campaign: Campaign | null;
  characters: Character[];
  onMessage: (msg: Message) => void;
  onCreateCampaign: (title: string, prompt: string) => void;
  onAwardExp: (amount: number) => void;
  onAwardItem: (name: string, data?: Partial<Item>) => void;
  isHost: boolean;
}

const DMWindow: React.FC<DMWindowProps> = ({ campaign, characters, onMessage, onCreateCampaign, onAwardExp, onAwardItem, isHost }) => {
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
    
    // Only host triggers the AI response to maintain synchronization
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
        const { exp, items } = parseDMCommand(responseText);
        if (exp > 0) onAwardExp(exp);
        items.forEach(item => onAwardItem(item.name, item.data));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 max-w-xl mx-auto text-center">
        <div className="space-y-4">
          <h2 className="text-5xl font-cinzel text-gold drop-shadow-xl animate-in fade-in slide-in-from-top duration-1000">Manifest Thy World</h2>
          <p className="text-red-900 font-cinzel text-[10px] tracking-widest uppercase">The Engine awaits thy prompt.</p>
        </div>
        
        {isHost ? (
          <div className="w-full rune-border p-6 bg-black/60 backdrop-blur space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-cinzel text-red-900 uppercase">Chronicle Title</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/40 border border-red-900/30 p-2 text-gold font-cinzel text-sm focus:border-gold outline-none" placeholder="..." />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-cinzel text-red-900 uppercase">The Premise</label>
              <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="w-full bg-black/40 border border-red-900/30 p-2 text-gray-300 text-xs h-32 focus:border-gold outline-none" placeholder="Describe the shadow falling over the land..." />
            </div>
            <button onClick={() => onCreateCampaign(newTitle, newPrompt)} disabled={!newTitle || !newPrompt || characters.length === 0} className="w-full py-4 bg-red-900 hover:bg-red-800 text-white font-cinzel font-bold border border-gold disabled:opacity-30 transition-all">
              INITIATE CHRONICLE
            </button>
            {characters.length === 0 && <p className="text-[8px] text-center text-red-500 font-cinzel">THOU MUST BIND SOULS TO THY FELLOWSHIP BEFORE STARTING.</p>}
          </div>
        ) : (
          <div className="rune-border p-8 bg-black/40 border-gold/20 italic text-gray-500 font-cinzel">
            Waiting for the Engine Host to manifest the Chronicle...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] rune-border bg-black/40 backdrop-blur overflow-hidden max-w-4xl mx-auto">
      <div className="p-3 border-b border-red-900/50 flex justify-between items-center bg-red-900/5">
        <h3 className="font-cinzel text-gold text-sm truncate uppercase tracking-widest">{campaign.title}</h3>
        <span className="text-[8px] text-red-900 font-cinzel bg-red-900/10 px-2 py-0.5 border border-red-900/20">
          {isHost ? 'ENGINE HOST' : 'BOUND SOUL'}
        </span>
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
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="DECLARE THY ACTIONS..." className="flex-1 bg-transparent border border-red-900/30 p-2 text-gold text-xs focus:border-gold outline-none resize-none h-12" />
        <button onClick={handleSend} disabled={!input.trim() || isLoading} className="px-4 py-2 bg-red-900 text-white text-xs font-cinzel font-bold border border-gold hover:bg-red-800 disabled:opacity-50 transition-all">SPEAK</button>
      </div>
    </div>
  );
};

export default DMWindow;
