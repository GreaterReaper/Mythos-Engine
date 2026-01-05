
import React, { useState, useRef, useEffect } from 'react';
import { Character, Message } from '../types';
import { generateInnkeeperResponse } from '../geminiService';

interface TavernScreenProps {
  party: Character[];
  onLongRest: () => void;
  onOpenShop: () => void;
  isHost: boolean;
  isShopLoading?: boolean;
}

const TavernScreen: React.FC<TavernScreenProps> = ({ party, onLongRest, onOpenShop, isHost, isShopLoading }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Welcome to 'The Broken Cask', traveler. Rest thy bones, the fire is warm and the ale is cold. What's on thy mind?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setMessages(prev => [...prev, { role: 'model', content: response || "Barnaby just nods and smiles.", timestamp: Date.now() }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="border-b border-amber-900/50 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-cinzel text-amber-600">The Broken Cask</h2>
          <p className="text-gray-500 italic">"A hearth for weary souls in a world of obsidian."</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            disabled={isShopLoading}
            onClick={onOpenShop}
            className={`flex-1 md:flex-none px-4 py-2 border transition-all uppercase font-bold text-[10px] font-cinzel ${
              isShopLoading 
                ? 'border-amber-900 text-amber-900 animate-pulse cursor-wait' 
                : 'border-amber-600 text-amber-600 hover:bg-amber-600/10'
            }`}
          >
            {isShopLoading ? 'Manifesting Wares...' : "Innkeeper's Trove"}
          </button>
          {isHost && (
            <button 
              onClick={() => { onLongRest(); alert("The party awakens refreshed. HP and Spell Slots fully restored."); }}
              className="flex-1 md:flex-none px-4 py-2 bg-amber-900 text-white font-cinzel text-[10px] border border-amber-600 hover:bg-amber-800 transition-all uppercase font-bold"
            >
              Ritual of Restoration
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Party Status */}
        <div className="space-y-4">
           <h3 className="text-xs font-cinzel text-amber-700 uppercase tracking-widest font-bold">Fellowship at Rest</h3>
           <div className="space-y-3">
             {party.map(char => (
               <div key={char.id} className="p-3 bg-amber-900/5 border border-amber-900/20 rounded">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-cinzel text-amber-500 font-bold">{char.name}</span>
                   <span className="text-[8px] text-gray-500 uppercase">{char.archetype} • LVL {char.level}</span>
                 </div>
                 <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-700" style={{ width: `${(char.currentHp / char.maxHp) * 100}%` }} />
                 </div>
               </div>
             ))}
             {party.length === 0 && <p className="text-[10px] text-gray-600 italic">No souls gathered round the fire.</p>}
           </div>
        </div>

        {/* Tavern Chat (Whispers) */}
        <div className="lg:col-span-2 flex flex-col h-[500px] rune-border bg-black/40 border-amber-900/30 overflow-hidden shadow-2xl">
           <div className="p-3 bg-amber-900/10 border-b border-amber-900/30">
              <h4 className="text-[10px] font-cinzel text-amber-600 uppercase tracking-widest font-bold">Whispers of the Hearth</h4>
           </div>

           <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
             {messages.map((msg, idx) => (
               <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                  <div className={`max-w-[85%] p-3 text-xs leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-amber-900/20 border-r-2 border-amber-600 text-gray-200' 
                    : 'bg-black/60 border-l-2 border-amber-800 text-amber-100'
                  }`}>
                    {msg.role === 'model' && <p className="text-[8px] font-cinzel text-amber-600 mb-1 uppercase font-bold">BARNABY</p>}
                    <p className="italic">{msg.content}</p>
                  </div>
               </div>
             ))}
             {isLoading && <div className="text-[10px] text-amber-600 animate-pulse font-cinzel">Barnaby is listening...</div>}
           </div>

           <div className="p-4 bg-black/60 border-t border-amber-900/30 flex gap-2">
             <input 
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSend()}
               placeholder="Speak with the Innkeeper..."
               className="flex-1 bg-black/40 border border-amber-900/40 p-2 text-amber-200 text-xs focus:border-amber-600 outline-none"
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim() || isLoading}
               className="px-4 py-1 bg-amber-900 text-white font-cinzel text-[10px] border border-amber-600 hover:bg-amber-800 transition-all uppercase font-bold disabled:opacity-30"
             >
               Speak
             </button>
           </div>
        </div>
      </div>
      
      <div className="p-6 bg-amber-900/5 border border-amber-900/10 rounded italic text-gray-500 text-[10px] leading-relaxed text-center">
        The Broken Cask is a sanctuary. Here, thy bonds are strengthened and thy gear prepared for the trials ahead. Strategize with the Innkeeper to reveal rumors of lost artifacts or upcoming perils in the Engine.
      </div>
    </div>
  );
};

export default TavernScreen;
