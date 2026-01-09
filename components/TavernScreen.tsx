
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Character, Message, Item, Currency, Role, Archetype, Rumor } from '../types';
import { generateInnkeeperResponse } from '../geminiService';
import { SYNERGY_MAP } from '../constants';
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
    
    // Bonus for matching theoretical bests
    if (bondInsight && party.some(p => bondInsight.bestMatches.includes(p.archetype as string))) {
      score += 10;
    }

    return Math.max(10, Math.min(100, score + (party.length * 2)));
  }, [partyRoles, party.length, primarySoul, bondInsight]);

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

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-up pb-20">
      <div className="border-b border-amber-900/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-5xl font-cinzel text-amber-600 font-black tracking-tighter">The Broken Cask</h2>
            <div className="bg-amber-900/20 px-3 py-1 border border-amber-600/30 rounded flex items-center gap-3">
               <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Hearth Active</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
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
               <h3 className="text-[10px] font-cinzel text-emerald-500 uppercase font-black tracking-widest">Strategist's Council</h3>
               <span className={`text-sm font-mono font-black ${resonanceScore > 50 ? 'text-emerald-500' : 'text-amber-600'}`}>{resonanceScore}% Synergy</span>
             </div>
             
             {bondInsight && (
               <div className="space-y-3 animate-in fade-in slide-in-from-left duration-500">
                  <p className="text-[9px] text-gold uppercase font-black tracking-widest mb-1">Anchor Bond: {primarySoul?.name}</p>
                  <div className="p-3 bg-gold/5 border border-gold/20 rounded-sm">
                    <p className="text-[8px] text-gray-500 uppercase font-black mb-2">Theoretical Best Matches</p>
                    <div className="flex flex-wrap gap-2">
                       {bondInsight.bestMatches.map(match => (
                         <div key={match} className="group relative">
                           <span className="text-[9px] bg-emerald-900/40 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded-sm font-bold uppercase cursor-help shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                             {match}
                           </span>
                         </div>
                       ))}
                    </div>
                    <p className="text-[10px] text-gray-400 italic mt-3 leading-relaxed">"{bondInsight.reason}"</p>
                  </div>
               </div>
             )}

             <div className="space-y-4 pt-2">
                <p className="text-[8px] text-emerald-700 font-black uppercase">Role Distribution</p>
                <div className="flex h-3 w-full bg-gray-900 rounded-sm overflow-hidden border border-emerald-900/20">
                  {partyRoles.Tank.count > 0 && <div className="h-full bg-blue-900/80 shadow-[inset_0_0_10px_rgba(30,58,138,0.5)]" style={{ width: `${(partyRoles.Tank.count / (party.length || 1)) * 100}%` }} />}
                  {partyRoles.DPS.count > 0 && <div className="h-full bg-emerald-900/80 shadow-[inset_0_0_10px_rgba(6,78,59,0.5)]" style={{ width: `${(partyRoles.DPS.count / (party.length || 1)) * 100}%` }} />}
                  {partyRoles.Support.count > 0 && <div className="h-full bg-gold/80 shadow-[inset_0_0_10px_rgba(161,98,7,0.5)]" style={{ width: `${(partyRoles.Support.count / (party.length || 1)) * 100}%` }} />}
                </div>
             </div>
          </div>

          <div className="rune-border p-5 bg-amber-900/5 border-amber-900/20 space-y-4">
             <div className="flex justify-between items-center border-b border-amber-900/30 pb-2">
                <h4 className="text-[10px] font-cinzel text-amber-700 uppercase font-black tracking-widest">Whispers</h4>
                <button onClick={onFetchRumors} disabled={isRumorLoading} className="text-[9px] font-black text-amber-600 hover:text-amber-500 uppercase">{isRumorLoading ? 'LISTENING...' : 'EAVESDROP'}</button>
             </div>
             <div className="space-y-3">
               {activeRumors.map(rumor => (
                 <div key={rumor.id} className="p-3 bg-black/40 border-l-2 border-amber-600 space-y-1">
                    <span className="text-[7px] font-black uppercase text-emerald-500">{rumor.danger}</span>
                    <p className="text-[10px] text-gray-300 italic leading-relaxed">"{rumor.hook}"</p>
                 </div>
               ))}
               {activeRumors.length === 0 && <p className="text-[9px] text-gray-700 italic text-center py-4">Silence fills the corners of the room.</p>}
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
            <div className="flex flex-col h-[650px] rune-border bg-black/40 border-amber-900/30 overflow-hidden shadow-2xl relative">
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
                 {messages.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-up`}>
                      <div className={`max-w-[85%] p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-amber-900/20 border-r-4 border-amber-600 text-gray-200' : 'bg-black/90 border-l-4 border-amber-800 text-amber-100'}`}>
                        {msg.role === 'model' && <p className="text-[9px] font-cinzel text-amber-700 mb-2 uppercase font-black">BARNABY</p>}
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
                const isSynergy = bondInsight && bondInsight.bestMatches.includes(mentor.archetype as string);
                
                return (
                  <div key={mentor.id} className={`relative p-6 border transition-all flex flex-col gap-5 rounded-sm overflow-hidden ${isInParty ? 'bg-emerald-900/10 border-emerald-500' : 'bg-black/40 border-amber-900/20'} ${isSynergy ? 'ring-1 ring-gold/20' : ''}`}>
                    {isSynergy && (
                       <div className="absolute top-0 right-0 bg-gold text-black text-[7px] font-black px-2 py-0.5 uppercase transform rotate-45 translate-x-[15px] translate-y-[5px] shadow-lg">
                         SYNERGY
                       </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`text-xl font-cinzel font-black transition-colors ${isSynergy ? 'text-gold' : 'text-amber-500'}`}>{mentor.name}</p>
                        <p className="text-[9px] text-gray-500 uppercase font-black">{mentor.archetype} • {mentor.role}</p>
                      </div>
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
        </div>
      </div>
    </div>
  );
};

export default TavernScreen;
