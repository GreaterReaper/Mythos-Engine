
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Character, Message, Item, Currency, Role, Archetype } from '../types';
import { generateInnkeeperResponse } from '../geminiService';

interface TavernScreenProps {
  party: Character[];
  mentors: Character[];
  partyIds: string[];
  onToggleParty: (id: string) => void;
  onLongRest: () => void;
  onOpenShop: () => void;
  onUpgradeItem: (characterId: string, itemId: string, cost: Currency) => void;
  isHost: boolean;
  isShopLoading?: boolean;
}

type TavernTab = 'Rest' | 'Mentors' | 'Smithy';

const TavernScreen: React.FC<TavernScreenProps> = ({ 
  party, mentors, partyIds, onToggleParty, onLongRest, onOpenShop, onUpgradeItem, isHost, isShopLoading 
}) => {
  const [activeTab, setActiveTab] = useState<TavernTab>('Rest');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(party.length > 0 ? party[0].id : null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Welcome to 'The Broken Cask', traveler. Rest thy bones, the fire is warm and the ale is cold. What's on thy mind?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Rotation Constants
  const ROTATION_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms
  const MENTOR_GROUPS: Archetype[][] = [
    [Archetype.Fighter, Archetype.Mage, Archetype.Archer],
    [Archetype.Warrior, Archetype.Sorcerer, Archetype.Alchemist],
    [Archetype.DarkKnight, Archetype.Thief, Archetype.BloodArtist]
  ];

  // Role Analysis Logic
  const partyRoles = useMemo(() => {
    const roles: Record<Role, number> = { Tank: 0, DPS: 0, Support: 0 };
    party.forEach(c => {
      roles[c.role]++;
    });
    return roles;
  }, [party]);

  const recommendedRoles = useMemo(() => {
    const recommended: Role[] = [];
    if (party.length > 0) {
      if (partyRoles.Tank === 0) recommended.push('Tank');
      if (partyRoles.Support === 0) recommended.push('Support');
      if (partyRoles.DPS === 0) recommended.push('DPS');
      if (recommended.length === 0) {
        const minCount = Math.min(...(Object.values(partyRoles) as number[]));
        (Object.keys(partyRoles) as Role[]).forEach(role => {
          if (partyRoles[role] === minCount) recommended.push(role);
        });
      }
    }
    return recommended;
  }, [partyRoles, party.length]);

  // 5-Minute Rotation Logic
  const rotatedMentors = useMemo(() => {
    const groupIndex = Math.floor(Date.now() / ROTATION_INTERVAL) % MENTOR_GROUPS.length;
    const activeArchetypes = MENTOR_GROUPS[groupIndex];
    
    const selected = activeArchetypes.map(arch => {
      return mentors.find(m => m.archetype === arch);
    }).filter((m): m is Character => m !== undefined);

    // Sort visible mentors so recommended ones come first
    return selected.sort((a, b) => {
      const aRec = recommendedRoles.includes(a.role) ? 1 : 0;
      const bRec = recommendedRoles.includes(b.role) ? 1 : 0;
      return bRec - aRec;
    });
  }, [mentors, recommendedRoles, Math.floor(Date.now() / ROTATION_INTERVAL)]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now();
      const nextReset = Math.ceil(now / ROTATION_INTERVAL) * ROTATION_INTERVAL;
      const diff = nextReset - now;
      
      const m = Math.floor(diff / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(m)}:${pad(s)}`;
    };

    const timer = setInterval(() => setTimeUntilReset(calculateTimeRemaining()), 1000);
    setTimeUntilReset(calculateTimeRemaining());
    return () => clearInterval(timer);
  }, []);

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

  const calculateUpgradeCost = (item: Item): Currency => {
    const currentPlus = parseInt(item.name.match(/\+(\d+)/)?.[1] || '0');
    return {
      aurels: (currentPlus + 1) * 500,
      shards: (currentPlus + 1) * 10,
      ichor: 0
    };
  };

  const canAfford = (char: Character | undefined, cost: Currency) => {
    if (!char || !char.currency) return false;
    return (char.currency.aurels || 0) >= cost.aurels && (char.currency.shards || 0) >= cost.shards;
  };

  const selectedChar = party.find(c => c.id === selectedCharId);
  const upgradeableItems = selectedChar?.inventory.filter(i => i.type === 'Weapon' || i.type === 'Armor') || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Tavern Header */}
      <div className="border-b border-amber-900/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-5xl font-cinzel text-amber-600 font-black tracking-tighter">The Broken Cask</h2>
            <div className="bg-amber-900/20 px-2 py-0.5 border border-amber-600/30 rounded flex items-center gap-2">
               <span className="text-[8px] font-black text-amber-700 uppercase tracking-tighter">Next Cycle In</span>
               <span className="text-[10px] font-mono font-bold text-amber-500 tabular-nums">{timeUntilReset || '--:--'}</span>
            </div>
          </div>
          <p className="text-gray-500 italic text-sm font-medium">"A sanctuary of warmth in a world of biting obsidian."</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            disabled={isShopLoading}
            onClick={onOpenShop}
            className={`flex-1 md:flex-none px-6 py-3 border-2 transition-all uppercase font-black text-[10px] font-cinzel tracking-widest ${
              isShopLoading 
                ? 'border-amber-900 text-amber-900 animate-pulse cursor-wait' 
                : 'border-amber-600 text-amber-600 hover:bg-amber-600/10 active:scale-95'
            }`}
          >
            {isShopLoading ? 'Summoning Merchant...' : "Innkeeper's Trove"}
          </button>
          {isHost && (
            <button 
              onClick={() => { onLongRest(); alert("The party awakens refreshed. HP and Spell Slots fully restored."); }}
              className="flex-1 md:flex-none px-6 py-3 bg-amber-900 text-white font-cinzel text-[10px] border-2 border-amber-600 hover:bg-amber-800 transition-all uppercase font-black tracking-widest active:scale-95 shadow-lg shadow-amber-900/40"
            >
              Ritual of Rest
            </button>
          )}
        </div>
      </div>

      {/* Tavern Sub-Tabs */}
      <div className="flex gap-4 border-b border-amber-900/20 pb-4 overflow-x-auto no-scrollbar">
        {(['Rest', 'Mentors', 'Smithy'] as TavernTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-2 font-cinzel text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'text-amber-500 bg-amber-900/20 border-b-2 border-amber-500' 
                : 'text-gray-600 hover:text-amber-700'
            }`}
          >
            {tab === 'Rest' ? 'The Hearth' : tab === 'Mentors' ? 'Wandering Souls' : 'The Obsidian Forge'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-10">
          {/* Active Fellowship Sidebar */}
          <div className="space-y-4">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-[10px] font-cinzel text-amber-700 uppercase tracking-[0.3em] font-black border-l-4 border-amber-700 pl-4">Fellowship at Rest</h3>
               <div className="flex gap-1.5">
                  {(['Tank', 'DPS', 'Support'] as Role[]).map(role => (
                    <div key={role} className={`w-3 h-3 rounded-full border border-black/50 ${partyRoles[role] > 0 ? (role === 'Tank' ? 'bg-blue-600' : role === 'DPS' ? 'bg-red-600' : 'bg-green-600') : 'bg-gray-900/40'}`} title={`${role}: ${partyRoles[role]}`} />
                  ))}
               </div>
             </div>
             <div className="space-y-4">
               {party.map(char => (
                 <div 
                   key={char.id} 
                   onClick={() => setSelectedCharId(char.id)}
                   className={`p-4 border transition-all rounded-sm group cursor-pointer ${
                     selectedCharId === char.id ? 'bg-amber-900/10 border-amber-600 shadow-lg' : 'bg-amber-900/5 border-amber-900/20 hover:bg-amber-900/10'
                   }`}
                 >
                   <div className="flex justify-between items-center mb-2">
                     <span className={`text-[11px] font-cinzel font-black uppercase tracking-widest ${selectedCharId === char.id ? 'text-amber-500' : 'text-amber-700'}`}>{char.name}</span>
                     <span className={`text-[7px] font-black px-1 py-0.5 rounded border ${
                       char.role === 'Tank' ? 'border-blue-900/50 text-blue-500' : char.role === 'DPS' ? 'border-red-900/50 text-red-500' : 'border-green-900/50 text-green-500'
                     }`}>
                       {char.role}
                     </span>
                   </div>
                   <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-amber-900/10">
                      <div className="h-full bg-amber-700 transition-all duration-1000" style={{ width: `${(char.currentHp / char.maxHp) * 100}%` }} />
                   </div>
                 </div>
               ))}
               {party.length === 0 && <p className="text-xs text-gray-600 italic py-10 text-center border-2 border-dashed border-amber-900/10">No souls gathered round the fire.</p>}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {activeTab === 'Rest' && (
            <div className="flex flex-col h-[650px] rune-border bg-black/40 border-amber-900/30 overflow-hidden shadow-2xl relative">
               <div className="p-4 bg-amber-900/10 border-b border-amber-900/30 flex justify-between items-center">
                  <h4 className="text-[10px] font-cinzel text-amber-600 uppercase tracking-widest font-black">Whispers of the Hearth</h4>
                  <span className="text-[8px] text-amber-900 uppercase font-black tracking-tighter bg-amber-900/10 px-2 py-1">AI INNKEEPER ACTIVE</span>
               </div>
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-leather bg-fixed">
                 {messages.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                      <div className={`max-w-[85%] p-5 text-sm md:text-base leading-relaxed shadow-2xl relative ${
                        msg.role === 'user' 
                        ? 'bg-amber-900/20 border-r-4 border-amber-600 text-gray-200 rounded-l-2xl' 
                        : 'bg-black/90 border-l-4 border-amber-800 text-amber-100 rounded-r-2xl'
                      }`}>
                        {msg.role === 'model' && <p className="text-[9px] font-cinzel text-amber-700 mb-2 uppercase font-black tracking-[0.3em]">BARNABY</p>}
                        <p className="italic font-medium">{msg.content}</p>
                      </div>
                   </div>
                 ))}
                 {isLoading && (
                   <div className="flex justify-start">
                      <div className="bg-amber-900/10 p-4 rounded-2xl animate-pulse flex gap-2">
                        <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                        <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                      </div>
                   </div>
                 )}
               </div>
               <div className="p-8 bg-black border-t border-amber-900/30 flex gap-4 shadow-2xl z-10">
                 <input 
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSend()}
                   placeholder="Speak with the Innkeeper..."
                   className="flex-1 bg-black/40 border-2 border-amber-900/20 p-4 text-amber-200 text-base focus:border-amber-600 outline-none rounded-lg transition-all placeholder:text-amber-900/20 font-cinzel"
                 />
                 <button 
                   onClick={handleSend}
                   disabled={!input.trim() || isLoading}
                   className="px-10 py-4 bg-amber-900 text-white font-cinzel text-xs border-2 border-amber-600 hover:bg-amber-800 transition-all uppercase font-black tracking-[0.2em] disabled:opacity-30 active:scale-95 shadow-xl"
                 >
                   Speak
                 </button>
               </div>
            </div>
          )}

          {activeTab === 'Mentors' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="bg-amber-900/10 p-4 border border-amber-600/30 flex flex-col md:flex-row justify-between items-center rounded-sm gap-4">
                 <div className="space-y-1">
                   <p className="text-[10px] font-cinzel text-amber-500 font-black uppercase tracking-widest">Current Aetheric Alignment</p>
                   <p className="text-[9px] text-gray-500 italic uppercase">Rotation Shifts Every 5 Minutes.</p>
                 </div>
                 <div className="flex gap-2">
                    {recommendedRoles.map(role => (
                      <span key={role} className="text-[8px] bg-amber-600 text-black px-2 py-0.5 font-black uppercase rounded-sm animate-pulse">Need {role}</span>
                    ))}
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                 {rotatedMentors.map(mentor => {
                   const isInParty = partyIds.includes(mentor.id);
                   const isResonant = recommendedRoles.includes(mentor.role);
                   return (
                     <div key={mentor.id} className={`p-6 border transition-all flex flex-col gap-5 rounded-sm relative ${isInParty ? 'bg-amber-900/10 border-amber-500 shadow-xl' : isResonant ? 'bg-amber-900/5 border-amber-600/40 border-dashed' : 'bg-black/40 border-amber-900/20 hover:border-amber-700/50'}`}>
                        {isInParty && <span className="absolute -top-3 left-4 bg-amber-600 text-black px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-sm border border-black shadow-lg">Soul Bound</span>}
                        {isResonant && !isInParty && <span className="absolute -top-3 right-4 bg-red-900 text-white px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-sm border border-red-600 shadow-lg animate-bounce">Resonant Choice</span>}
                        <div className="flex justify-between items-start">
                           <div className="min-w-0">
                             <p className="text-xl font-cinzel text-amber-500 font-black truncate">{mentor.name}</p>
                             <div className="flex items-center gap-2 mt-1">
                               <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{mentor.archetype} • LVL {mentor.level}</p>
                               <span className={`text-[7px] font-black px-1 py-0.2 rounded border ${
                                 mentor.role === 'Tank' ? 'border-blue-900/50 text-blue-500' : mentor.role === 'DPS' ? 'border-red-900/50 text-red-500' : 'border-green-900/50 text-green-500'
                               }`}>
                                 {mentor.role}
                               </span>
                             </div>
                           </div>
                        </div>
                        <p className="text-[11px] text-gray-400 italic leading-relaxed opacity-70 border-l-2 border-amber-900/20 pl-4">"{mentor.description}"</p>
                        <button 
                           onClick={() => onToggleParty(mentor.id)}
                           className={`mt-auto w-full py-2 text-[9px] font-cinzel font-black uppercase border-2 transition-all active:scale-95 ${isInParty ? 'bg-amber-600 text-black border-amber-600' : 'text-amber-600 border-amber-600/40 hover:bg-amber-600/10'}`}
                        >
                           {isInParty ? 'RELEASE SOUL' : 'BIND SOUL'}
                        </button>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {activeTab === 'Smithy' && (
            <div className="space-y-8 animate-in fade-in duration-500 h-[650px] flex flex-col">
               <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                  {!selectedChar ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-amber-900/20 bg-black/40 rounded-sm">
                      <p className="text-gray-600 font-cinzel text-lg uppercase font-black tracking-widest opacity-40">Choose a soul to approach the forge.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                       <div className="p-6 bg-amber-900/5 border-l-4 border-amber-600 rounded-r-sm">
                          <h4 className="text-sm font-cinzel text-amber-500 font-black uppercase tracking-widest mb-2">The Obsidian Forge</h4>
                          <p className="text-xs text-gray-500 italic">"The smith grunts, his hammer glowing with the heat of the world's core. 'Thy steel is soft, wanderer. Let me harden it with the essence of the void.'"</p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {upgradeableItems.map(item => {
                           const cost = calculateUpgradeCost(item);
                           const affordable = canAfford(selectedChar, cost);
                           return (
                             <div key={item.id} className="p-6 bg-black/40 border border-amber-900/20 rounded-sm flex flex-col justify-between gap-6 hover:border-amber-600/30 transition-all group">
                                <div className="space-y-3">
                                   <div className="flex justify-between items-start">
                                      <div className="min-w-0">
                                        <p className="text-lg font-cinzel text-amber-500 font-black group-hover:text-amber-400 transition-colors truncate">{item.name}</p>
                                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">{item.rarity} • {item.type}</p>
                                      </div>
                                      <div className={`w-10 h-10 border-2 flex items-center justify-center text-xl font-black ${
                                        item.rarity === 'Legendary' ? 'border-orange-500 text-orange-500' : 
                                        item.rarity === 'Epic' ? 'border-purple-500 text-purple-500' : 
                                        'border-amber-900/30 text-amber-900'
                                      }`}>
                                        {item.name[0]}
                                      </div>
                                   </div>
                                   <div className="flex gap-4">
                                      {Object.entries(item.stats || {}).map(([stat, val]) => (
                                        <div key={stat} className="bg-amber-900/10 px-3 py-1 border border-amber-900/20 rounded-sm">
                                           <span className="text-[8px] text-amber-900 uppercase font-black mr-2">{stat}</span>
                                           <span className="text-xs font-black text-amber-500">{val} <span className="text-amber-700 text-[9px] ml-1">→ {typeof val === 'number' ? (val as number) + 1 : val}</span></span>
                                        </div>
                                      ))}
                                   </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-amber-900/10">
                                   <div className="flex gap-6 items-center">
                                      <div className="flex items-center gap-2">
                                         <span className="text-[9px] text-amber-900 font-black uppercase">Aurels:</span>
                                         <span className={`text-xs font-black ${(selectedChar.currency?.aurels || 0) >= cost.aurels ? 'text-white' : 'text-red-900'}`}>{cost.aurels}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                         <span className="text-[9px] text-purple-900 font-black uppercase">Shards:</span>
                                         <span className={`text-xs font-black ${(selectedChar.currency?.shards || 0) >= cost.shards ? 'text-white' : 'text-red-900'}`}>{cost.shards}</span>
                                      </div>
                                   </div>
                                   <button 
                                     disabled={!affordable}
                                     onClick={() => onUpgradeItem(selectedChar.id, item.id, cost)}
                                     className={`w-full py-3 text-[10px] font-cinzel font-black uppercase border-2 transition-all active:scale-95 ${
                                       affordable ? 'bg-amber-900 text-white border-amber-600 shadow-lg shadow-amber-900/20' : 'border-amber-900/30 text-amber-900 opacity-50 cursor-not-allowed'
                                     }`}
                                   >
                                     {affordable ? 'Forge Enhancements' : 'Insufficient Essence'}
                                   </button>
                                </div>
                             </div>
                           );
                         })}
                         {upgradeableItems.length === 0 && (
                           <div className="col-span-full py-20 text-center border-2 border-dashed border-amber-900/10 opacity-40">
                              <p className="text-xs text-gray-500 font-cinzel uppercase font-black">This soul carries no gear worthy of the forge.</p>
                           </div>
                         )}
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-8 bg-amber-900/5 border-2 border-amber-900/10 rounded-sm italic text-gray-500 text-[11px] leading-relaxed text-center shadow-inner font-medium">
        The Broken Cask is a sanctuary. Here, thy bonds are strengthened and thy gear prepared for the trials ahead. Upgrading items at the forge is permanent and requires a heavy sacrifice of coin and magical shards.
      </div>
    </div>
  );
};

export default TavernScreen;
