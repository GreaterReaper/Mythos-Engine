import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Character, Message, Item, Currency, Role, Archetype, Rumor } from '../types';
import { generateInnkeeperResponse } from '../geminiService';

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
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const primarySoul = useMemo(() => party.find(c => c.isPrimarySoul), [party]);

  // Explicitly type the useMemo return value to ensure partyRoles.Tank and others are correctly typed
  const partyRoles = useMemo<Record<Role, { count: number; playerContribution: number }>>(() => {
    const roles: Record<Role, { count: number; playerContribution: number }> = { 
      Tank: { count: 0, playerContribution: 0 }, 
      DPS: { count: 0, playerContribution: 0 }, 
      Support: { count: 0, playerContribution: 0 } 
    };
    party.forEach(c => {
      const r = c.role as Role;
      if (roles[r]) {
        roles[r].count++;
        if (c.isPrimarySoul) roles[r].playerContribution++;
      }
    });
    return roles;
  }, [party]);

  const resonanceScore = useMemo(() => {
    if (party.length === 0) return 0;
    let score = 0;
    if (primarySoul) score += 20;
    if (partyRoles.Tank.count > 0) score += 20;
    if (partyRoles.DPS.count > 0) score += 20;
    if (partyRoles.Support.count > 0) score += 20;
    if (primarySoul) {
       const playerRoleCount = partyRoles[primarySoul.role as Role]?.count || 0;
       if (playerRoleCount === 1) score += 15;
       else if (playerRoleCount === 2) score += 5;
    }
    // Object.values often returns unknown[] in strict TypeScript; cast it to the expected type
    (Object.values(partyRoles) as { count: number; playerContribution: number }[]).forEach(roleData => {
      if (roleData.count > 2) score -= 10;
    });
    return Math.max(10, Math.min(100, score + (party.length * 2)));
  }, [partyRoles, party.length, primarySoul]);

  const recommendedRoles = useMemo(() => {
    const recommended: Role[] = [];
    if (party.length > 0) {
      if (partyRoles.Tank.count === 0) recommended.push('Tank');
      if (partyRoles.Support.count === 0) recommended.push('Support');
      if (partyRoles.DPS.count === 0) recommended.push('DPS');
    }
    return recommended;
  }, [partyRoles]);

  const soloFriendlyClasses = [Archetype.DarkKnight, Archetype.Warrior, Archetype.Thief, Archetype.BloodArtist];

  const rotatedMentors = useMemo(() => {
    const groupIndex = Math.floor(Date.now() / ROTATION_INTERVAL) % MENTOR_GROUPS.length;
    const activeArchetypes = MENTOR_GROUPS[groupIndex];
    return mentors.filter(m => activeArchetypes.includes(m.archetype as Archetype));
  }, [mentors]);

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
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

  const getDangerColor = (danger: Rumor['danger']) => {
    switch (danger) {
      case 'Cataclysmic': return 'text-red-600';
      case 'Mortal': return 'text-red-400';
      case 'Perilous': return 'text-amber-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-up pb-20">
      <div className="border-b border-amber-900/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-5xl font-cinzel text-amber-600 font-black tracking-tighter">The Broken Cask</h2>
            <div className="bg-amber-900/20 px-3 py-1 border border-amber-600/30 rounded flex items-center gap-3 shadow-inner">
               <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest animate-pulse">Aether Cycle</span>
               <span className="text-sm font-mono font-bold text-amber-500 tabular-nums">{timeUntilReset || '--:--'}</span>
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
            {isShopLoading ? 'Summoning Merchant...' : "Mercenary's Curios"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-10">
          <div className="rune-border p-6 bg-black/60 border-amber-900/40 space-y-6">
             <div className="flex justify-between items-center border-b border-amber-900/20 pb-2">
               <div className="flex flex-col">
                 <h3 className="text-[10px] font-cinzel text-amber-600 uppercase font-black tracking-widest leading-none">Strategist's Council</h3>
                 {primarySoul && <span className="text-[7px] text-gold uppercase font-bold mt-1 tracking-tighter">Soul Link: {primarySoul.name}</span>}
               </div>
               <div className="flex flex-col items-end">
                 <span className="text-[8px] text-gray-500 uppercase font-bold">Resonance</span>
                 <span className={`text-sm font-mono font-black ${resonanceScore > 70 ? 'text-green-500' : resonanceScore > 40 ? 'text-gold' : 'text-red-700'}`}>{resonanceScore}%</span>
               </div>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] text-gray-500 uppercase font-black">Role Balance</p>
                    <div className="flex gap-2">
                       <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full" />
                          <span className="text-[7px] text-gray-500 font-bold uppercase">Mentors</span>
                       </div>
                       <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_4px_#d4af37]" />
                          <span className="text-[7px] text-gold font-bold uppercase">Thy Soul</span>
                       </div>
                    </div>
                  </div>
                  <div className="flex h-3 w-full bg-gray-900 rounded-sm overflow-hidden border border-white/5">
                    {partyRoles.Tank.count > 0 && (
                      <div className="h-full bg-blue-900/80 transition-all duration-1000 relative group/bar" style={{ width: `${(partyRoles.Tank.count / (party.length || 1)) * 100}%` }}>
                        {partyRoles.Tank.playerContribution > 0 && (
                           <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(212,175,55,0.4)_4px,rgba(212,175,55,0.4)_8px)] animate-pulse" />
                        )}
                      </div>
                    )}
                    {partyRoles.DPS.count > 0 && (
                      <div className="h-full bg-red-900/80 transition-all duration-1000 relative group/bar border-l border-white/10" style={{ width: `${(partyRoles.DPS.count / (party.length || 1)) * 100}%` }}>
                        {partyRoles.DPS.playerContribution > 0 && (
                           <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(212,175,55,0.4)_4px,rgba(212,175,55,0.4)_8px)] animate-pulse" />
                        )}
                      </div>
                    )}
                    {partyRoles.Support.count > 0 && (
                      <div className="h-full bg-green-900/80 transition-all duration-1000 relative group/bar border-l border-white/10" style={{ width: `${(partyRoles.Support.count / (party.length || 1)) * 100}%` }}>
                        {partyRoles.Support.playerContribution > 0 && (
                           <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(212,175,55,0.4)_4px,rgba(212,175,55,0.4)_8px)] animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {primarySoul && (
                  <div className="flex justify-between items-center bg-gold/5 border border-gold/20 p-2 rounded-sm">
                     <span className="text-[8px] text-gold font-black uppercase tracking-widest">Protagonist Role</span>
                     <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-sm uppercase ${
                          primarySoul.role === 'Tank' ? 'bg-blue-900 text-blue-200' : 
                          primarySoul.role === 'DPS' ? 'bg-red-900 text-red-200' : 
                          'bg-green-900 text-green-200'
                        }`}>
                          {primarySoul.role}
                        </span>
                        <span className="text-[7px] text-gray-500 font-bold uppercase italic">ANCHORED</span>
                     </div>
                  </div>
                )}

                {recommendedRoles.length > 0 && (
                  <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-sm">
                    <p className="text-[8px] text-red-700 uppercase font-black mb-1">Missing Essences</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendedRoles.map(role => (
                        <span key={role} className="text-[9px] bg-red-900 text-white px-2 py-0.5 rounded-sm font-bold animate-pulse">NEED {role.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                   <p className="text-[9px] text-gray-500 uppercase font-black">Lone Wolf Insights</p>
                   <div className="grid grid-cols-1 gap-2">
                      <div className="p-3 bg-black/40 border border-amber-900/20 rounded flex items-center gap-3">
                         <div className="w-6 h-6 border border-gold/40 flex items-center justify-center text-[10px] text-gold font-black">!</div>
                         <p className="text-[10px] text-gray-400 italic leading-tight">Classes like <span className="text-gold">Warrior</span> or <span className="text-gold">Dark Knight</span> possess higher survival for solo ventures.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="rune-border p-5 bg-amber-900/5 border-amber-900/20 space-y-4">
             <div className="flex justify-between items-center border-b border-amber-900/30 pb-2">
                <h4 className="text-[10px] font-cinzel text-amber-700 uppercase font-black tracking-widest">Whispers from the Mists</h4>
                <button 
                  onClick={onFetchRumors}
                  disabled={isRumorLoading}
                  className={`text-[9px] font-black text-amber-600 uppercase hover:text-amber-500 transition-colors ${isRumorLoading ? 'animate-pulse' : ''}`}
                >
                  {isRumorLoading ? 'LISTENING...' : 'EAVESDROP'}
                </button>
             </div>
             <div className="space-y-3">
               {activeRumors.length > 0 ? activeRumors.map((rumor) => (
                 <div key={rumor.id} className="p-3 bg-black/40 border-l-2 border-amber-600 space-y-1 relative group hover:bg-black/60 transition-colors">
                    <div className="flex justify-between items-center">
                       <span className={`text-[7px] font-black uppercase tracking-widest ${getDangerColor(rumor.danger)}`}>{rumor.danger}</span>
                       <span className="text-[7px] text-gray-600 font-bold uppercase tracking-tighter">{rumor.length}</span>
                    </div>
                    <p className="text-[10px] text-gray-300 italic leading-relaxed">"{rumor.hook}"</p>
                 </div>
               )) : (
                 <p className="text-[9px] text-gray-600 text-center py-4 italic">Seek the mists for purpose...</p>
               )}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="flex gap-4 border-b border-amber-900/20 pb-4 overflow-x-auto no-scrollbar">
            {(['Rest', 'Mentors', 'Apothecary', 'Smithy'] as TavernTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2 font-cinzel text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'text-amber-500 bg-amber-900/20 border-b-2 border-amber-500' 
                    : 'text-gray-600 hover:text-amber-700'
                }`}
              >
                {tab === 'Rest' ? 'The Hearth' : tab === 'Mentors' ? `Wandering Souls (${timeUntilReset})` : tab === 'Apothecary' ? 'The Alchemical Ward' : 'The Obsidian Forge'}
              </button>
            ))}
          </div>

          {activeTab === 'Rest' && (
            <div className="flex flex-col h-[650px] rune-border bg-black/40 border-amber-900/30 overflow-hidden shadow-2xl relative">
               <div className="p-4 bg-amber-900/10 border-b border-amber-900/30 flex justify-between items-center">
                  <h4 className="text-[10px] font-cinzel text-amber-600 uppercase tracking-widest font-black">Barnaby's Fireplace</h4>
                  <span className="text-[8px] text-amber-900 uppercase font-black tracking-tighter bg-amber-900/10 px-2 py-1">INNKEEPER RESONANCE ACTIVE</span>
               </div>
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar bg-leather bg-fixed">
                 {messages.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-up`}>
                      <div className={`max-w-[95%] md:max-w-[85%] p-4 md:p-5 text-sm leading-relaxed shadow-2xl relative ${
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
               <div className="p-4 md:p-8 bg-black border-t border-amber-900/30 flex flex-col md:flex-row gap-4 shadow-2xl z-10">
                 <input 
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSend()}
                   placeholder="Speak with the Innkeeper..."
                   className="flex-1 bg-black/40 border-2 border-amber-900/20 p-4 text-amber-200 text-sm md:text-base focus:border-amber-600 outline-none rounded-lg transition-all placeholder:text-amber-900/20 font-cinzel"
                 />
                 <button 
                   onClick={handleSend}
                   disabled={!input.trim() || isLoading}
                   className="w-full md:w-auto px-10 py-4 bg-amber-900 text-white font-cinzel text-xs border-2 border-amber-600 hover:bg-amber-800 transition-all uppercase font-black tracking-[0.2em] disabled:opacity-30 active:scale-95 shadow-xl min-h-[50px]"
                 >
                   Speak
                 </button>
               </div>
            </div>
          )}

          {activeTab === 'Mentors' && (
            <div className="space-y-6 fade-up">
               <div className="bg-amber-900/10 p-5 border border-amber-600/30 flex flex-col md:flex-row justify-between items-center rounded-sm gap-4 shadow-inner">
                 <div className="space-y-1">
                   <p className="text-[10px] font-cinzel text-amber-500 font-black uppercase tracking-widest">Aetheric Alignment</p>
                   <p className="text-[9px] text-gray-500 italic uppercase">Rotation Cycles In: <span className="text-amber-500 font-bold">{timeUntilReset}</span></p>
                 </div>
                 <div className="flex gap-3">
                    {recommendedRoles.map(role => (
                      <span key={role} className="text-[8px] bg-red-900 text-white px-3 py-1 font-black uppercase rounded-sm animate-pulse border border-gold/40 shadow-lg">SEEKING {role.toUpperCase()}</span>
                    ))}
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {rotatedMentors.map(mentor => {
                   const isInParty = partyIds.includes(mentor.id);
                   const isRecommended = recommendedRoles.includes(mentor.role as Role);
                   const isSoloFriendly = soloFriendlyClasses.includes(mentor.archetype as Archetype);
                   
                   return (
                     <div key={mentor.id} className={`p-6 border transition-all flex flex-col gap-5 rounded-sm relative group ${isInParty ? 'bg-amber-900/10 border-amber-500 shadow-xl scale-105 z-10' : isRecommended ? 'bg-amber-900/5 border-amber-600/40 border-dashed' : 'bg-black/40 border-amber-900/20 hover:border-amber-700/50'}`}>
                        {isInParty && <span className="absolute -top-3 left-4 bg-amber-600 text-black px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-sm border border-black shadow-lg">Bound Soul</span>}
                        {isSoloFriendly && !isInParty && <span className="absolute -top-3 right-4 bg-purple-900 text-white px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-sm border border-purple-500/40 shadow-lg">Lone Wolf</span>}
                        
                        <div className="flex justify-between items-start">
                           <div className="min-w-0">
                             <p className={`text-xl font-cinzel font-black truncate transition-colors ${isInParty || isRecommended ? 'text-amber-500' : 'text-amber-700'}`}>{mentor.name}</p>
                             <div className="flex items-center gap-2 mt-1">
                               <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{mentor.archetype}</p>
                               <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm border uppercase ${
                                 mentor.role === 'Tank' ? 'border-blue-900/50 text-blue-500 bg-blue-900/10' : 
                                 mentor.role === 'DPS' ? 'border-red-900/50 text-red-500 bg-red-900/10' : 
                                 'border-green-900/50 text-green-500 bg-green-900/10'
                               }`}>
                                 {mentor.role}
                               </span>
                             </div>
                           </div>
                        </div>
                        <p className="text-[11px] text-gray-400 italic leading-relaxed font-medium opacity-80 border-l-2 border-amber-900/20 pl-4 py-1">"{mentor.description}"</p>
                        <div className="space-y-3 mt-auto">
                           {isSoloFriendly && (
                             <div className="flex items-center gap-2 text-[8px] text-purple-400 font-black uppercase tracking-widest">
                               <div className="w-1 h-1 rounded-full bg-purple-500 animate-ping" />
                               High Solo Potential
                             </div>
                           )}
                           <button 
                             onClick={() => onToggleParty(mentor.id)}
                             className={`w-full py-3 text-[9px] font-cinzel font-black uppercase border-2 transition-all active:scale-95 ${
                               isInParty 
                               ? 'bg-amber-600 text-black border-amber-600 shadow-lg' 
                               : 'text-amber-600 border-amber-600/40 hover:bg-amber-600 hover:text-black hover:border-amber-600'
                             }`}
                           >
                             {isInParty ? 'RELEASE SOUL' : 'BIND SOUL'}
                           </button>
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TavernScreen;