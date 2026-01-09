// @google/genai Senior Frontend Engineer: Implemented History Reconciliation Ritual.
// This allows players to retroactively manifest items/gold found in previous messages.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Campaign, Message, Character, Item, Monster, Currency, Ability } from '../types';
import { generateDMResponse } from '../geminiService';
import { RULES_MANIFEST } from '../constants';

interface DMWindowProps {
  campaign: Campaign | null; 
  allCampaigns: Campaign[]; 
  characters: Character[]; 
  bestiary: Monster[]; 
  activeCharacter: Character | null; 
  onSelectActiveCharacter: (id: string) => void; 
  onMessage: (msg: Message) => void; 
  onCreateCampaign: (title: string, prompt: string) => void; 
  onSelectCampaign: (id: string) => void; 
  onDeleteCampaign: (id: string) => void; 
  onQuitCampaign: () => void; 
  onShortRest: () => void; 
  onSyncHistory?: () => void;
  updateCharacter?: (id: string, updates: Partial<Character>) => void;
  isHost: boolean; 
  isKeyboardOpen?: boolean;
}

const DMWindow: React.FC<DMWindowProps> = ({ 
  campaign, 
  allCampaigns, 
  characters, 
  bestiary, 
  activeCharacter, 
  onSelectActiveCharacter, 
  onMessage, 
  onCreateCampaign, 
  onSelectCampaign, 
  onDeleteCampaign, 
  onQuitCampaign, 
  onShortRest, 
  onSyncHistory,
  updateCharacter,
  isHost, 
  isKeyboardOpen
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(false);
  const [speakCooldown, setSpeakCooldown] = useState(0);
  const [showMobileGrimoire, setShowMobileGrimoire] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const isDying = !!(activeCharacter && activeCharacter.currentHp <= 0);

  const usableManifestations = useMemo(() => {
    if (!activeCharacter) return [];
    return (activeCharacter.spells || []).filter(s => s.levelReq <= activeCharacter.level);
  }, [activeCharacter]);

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; 
  }, [campaign?.history, isLoading]);

  useEffect(() => {
    let timer: any;
    if (speakCooldown > 0) timer = setInterval(() => setSpeakCooldown(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [speakCooldown]);

  const handleSend = async (retryContent?: string) => {
    const messageContent = retryContent || input;
    if (!campaign || !messageContent.trim() || isLoading || speakCooldown > 0 || !activeCharacter) return;
    
    setLastError(false);
    if (!retryContent) {
      const userMsg: Message = { role: 'user', content: messageContent, timestamp: Date.now() };
      onMessage(userMsg);
      setInput('');
      setSpeakCooldown(5);
    }
    
    if (!isHost) return;
    setIsLoading(true);
    
    try {
      const currentHistory: Message[] = retryContent 
        ? campaign.history 
        : [...campaign.history, { role: 'user', content: messageContent, timestamp: Date.now() } as Message];
      
      const responseText = await generateDMResponse(currentHistory, { 
        activeCharacter, 
        party: characters, 
        mentors: characters.filter(c => c.id.startsWith('mentor-')), 
        activeRules: RULES_MANIFEST, 
        existingItems: [], 
        existingMonsters: bestiary,
        campaignTitle: campaign.title
      });

      const dmMsg: Message = { role: 'model', content: responseText || "The Engine hums...", timestamp: Date.now() };
      onMessage(dmMsg);
      setIsLoading(false);
    } catch (error: any) { 
      console.error(error); 
      setLastError(true);
      setIsLoading(false);
    }
  };

  const renderContentWithRewards = (content: string) => {
    const expRegex = /(\+\d+\s*EXP|\[EXP:\s*\d+\])/gi;
    const parts = content.split(expRegex);
    return parts.map((part, i) => part.match(expRegex) ? <span key={i} className="text-gold font-cinzel font-black tracking-widest animate-pulse">{part}</span> : part);
  };

  if (!campaign) {
    return (
      <div className="space-y-12 max-w-4xl mx-auto animate-in fade-in px-4 py-8">
        <h2 className="text-5xl font-cinzel text-gold font-black text-center">The Chronicles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
             <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Manifest Reality</h3>
             {isHost ? (
               <div className="rune-border p-6 bg-black/60 backdrop-blur space-y-5">
                 <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/40 border border-emerald-900/50 p-4 text-gold font-cinzel text-base" placeholder="CHRONICLE TITLE..." />
                 <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="w-full bg-black/40 border border-emerald-900/50 p-4 text-gray-200 text-sm h-32" placeholder="PREMISE..." />
                 <button onClick={() => onCreateCampaign(newTitle, newPrompt)} className="w-full py-5 bg-emerald-900 text-white font-cinzel font-black border border-gold">BEND REALITY</button>
               </div>
             ) : <div className="text-center py-20 text-gray-500 font-cinzel">Waiting for Host...</div>}
          </div>
          <div className="space-y-6">
             <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Ancient Scrolls</h3>
             <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
               {allCampaigns.slice().reverse().map(c => (
                 <div key={c.id} className="p-5 bg-black/40 border border-emerald-900/20 hover:border-gold flex justify-between items-center transition-all">
                   <h4 className="font-cinzel text-lg text-gold font-bold">{c.title}</h4>
                   <div className="flex gap-2">
                     <button onClick={() => onSelectCampaign(c.id)} className="px-4 py-2 border border-gold/40 text-[10px] font-cinzel text-gold hover:bg-gold hover:text-black">REBIND</button>
                     {isHost && <button onClick={() => onDeleteCampaign(c.id)} className="w-10 h-10 border border-red-900/40 text-red-500 hover:bg-red-950 transition-all">×</button>}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0c0a09]">
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="px-4 py-2 border-b-2 border-emerald-900/60 flex justify-between items-center bg-black/80 backdrop-blur shrink-0 z-20">
            <div className="flex items-center gap-3">
              <button onClick={onQuitCampaign} className="text-emerald-900 hover:text-emerald-500 font-black text-2xl">×</button>
              <h3 className="font-cinzel text-gold text-xs md:text-sm font-black tracking-[0.1em]">{campaign.title}</h3>
            </div>
            <div className="flex gap-2">
              {onSyncHistory && isHost && (
                <button onClick={onSyncHistory} className="px-3 py-1 bg-emerald-950 border border-gold/40 text-gold text-[9px] font-black uppercase hover:bg-gold hover:text-black">SYNC SOUL</button>
              )}
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-12 md:py-8 space-y-6 custom-scrollbar bg-[#0c0a09]">
            {campaign.history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-gold/[0.08] border border-gold/30 text-white p-4 rounded-l-xl' : 'bg-black border-l-4 border-emerald-900 text-[#e7e5e4] p-5 shadow-xl'}`}>
                  {msg.role === 'model' && <p className="text-[9px] font-cinzel text-emerald-500 mb-2 font-black uppercase">The Engine Speaks</p>}
                  <div className="leading-relaxed whitespace-pre-wrap font-medium">
                    {renderContentWithRewards(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in">
                 <div className="bg-black border-l-4 border-emerald-900 p-5 shadow-xl max-w-[85%]">
                    <p className="text-[9px] font-cinzel text-emerald-500 mb-2 font-black uppercase">Weaving Fate...</p>
                    <div className="flex gap-2">
                       <div className="w-2 h-2 bg-emerald-900 rounded-full animate-bounce" />
                       <div className="w-2 h-2 bg-emerald-700 rounded-full animate-bounce delay-100" />
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200" />
                    </div>
                 </div>
              </div>
            )}
          </div>

          <div className="shrink-0 bg-black border-t-2 border-emerald-900/40 p-4 pb-20 md:pb-4">
            <div className="flex gap-3 items-end max-w-5xl mx-auto w-full">
              <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                placeholder={isDying ? "THOU ART UNCONSCIOUS..." : "VOICE THY WILL..."}
                disabled={isDying || isLoading}
                className="w-full bg-[#1c1917] border-2 border-emerald-900/20 p-3 text-gold text-sm md:text-base h-24 focus:border-gold outline-none resize-none rounded-lg" 
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isLoading || !activeCharacter || isDying} className="w-24 font-cinzel font-black border-2 h-24 bg-emerald-900 text-white border-gold/60 shadow-xl hover:bg-emerald-800 disabled:opacity-50">SPEAK</button>
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex flex-col w-80 bg-[#0c0a09] border-l-2 border-emerald-900/30 overflow-hidden shrink-0 shadow-2xl">
          <div className="p-5 border-b border-emerald-900/20 bg-emerald-900/5">
             <h4 className="text-[10px] font-cinzel text-emerald-500 font-black uppercase tracking-widest mb-4">Fellowship Resonance</h4>
             <div className="space-y-4">
              {characters.map(char => (
                  <div key={char.id} className={`p-2 rounded cursor-pointer ${char.id === activeCharacter?.id ? 'bg-gold/10 border border-gold/40' : 'hover:bg-emerald-900/5'}`} onClick={() => onSelectActiveCharacter(char.id)}>
                    <div className="flex justify-between items-center mb-1">
                      <p className={`text-[11px] font-cinzel font-black uppercase ${char.id === activeCharacter?.id ? 'text-gold' : 'text-white'}`}>{char.name}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-gold text-[8px]">●</span>
                        <span className="text-white/60 font-mono text-[8px] font-black">{char.currency?.aurels || 0}</span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-gray-950 rounded-full overflow-hidden">
                      <div className={`h-full ${char.currentHp <= 0 ? 'bg-red-600' : 'bg-emerald-600'}`} style={{ width: `${(char.currentHp / char.maxHp) * 100}%` }} />
                    </div>
                  </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
             <h4 className="text-[10px] font-cinzel text-gold font-black uppercase mb-4">Manifestations</h4>
             <div className="space-y-3">
               {usableManifestations.map((spell, i) => (
                 <div key={i} className="p-3 bg-black/40 border border-emerald-900/20 hover:border-gold transition-all">
                    <p className="text-[10px] font-cinzel text-gold font-bold">{spell.name}</p>
                    <p className="text-[9px] text-gray-500 italic mt-1 leading-relaxed line-clamp-2">"{spell.description}"</p>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMWindow;