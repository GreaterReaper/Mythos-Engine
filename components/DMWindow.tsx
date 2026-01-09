
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Campaign, Message, Character, Item, Monster, Currency, Ability } from '../types';
import { generateDMResponse } from '../geminiService';
import { RULES_MANIFEST } from '../constants';
import SpellSlotManager from './SpellSlotManager';

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

// Sub-component for individual party HP bar with reaction animations
const VitalityMonitor: React.FC<{ character: Character, isActive: boolean, onClick: () => void }> = ({ character, isActive, onClick }) => {
  const [lastHp, setLastHp] = useState(character.currentHp);
  const [hpChange, setHpChange] = useState<{ amount: number, type: 'damage' | 'heal', id: number } | null>(null);
  
  useEffect(() => {
    if (character.currentHp !== lastHp) {
      const diff = character.currentHp - lastHp;
      setHpChange({ amount: Math.abs(diff), type: diff < 0 ? 'damage' : 'heal', id: Date.now() });
      setLastHp(character.currentHp);
      const timer = setTimeout(() => setHpChange(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [character.currentHp]);

  const percent = (character.currentHp / character.maxHp) * 100;

  return (
    <div 
      onClick={onClick}
      className={`p-2.5 rounded transition-all cursor-pointer relative overflow-hidden ${isActive ? 'bg-gold/10 border border-gold/40' : 'hover:bg-emerald-900/5 border border-transparent'}`}
    >
      <div className="flex justify-between items-center mb-1.5 relative z-10">
        <p className={`text-[10px] font-cinzel font-black uppercase tracking-tighter transition-colors ${isActive ? 'text-gold' : 'text-white/80'}`}>{character.name}</p>
        <span className={`text-[9px] font-mono font-black ${character.currentHp <= 0 ? 'text-red-500 animate-pulse' : 'text-white/60'}`}>{character.currentHp}/{character.maxHp}</span>
      </div>
      
      <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5 relative z-10">
        <div 
          className={`h-full transition-all duration-700 ${character.currentHp <= 0 ? 'bg-red-900' : 'bg-emerald-600'}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>

      {hpChange && (
        <div key={hpChange.id} className={`absolute right-2 top-0 text-[10px] font-black animate-float-up-fast z-20 pointer-events-none ${hpChange.type === 'damage' ? 'text-red-500' : 'text-emerald-400'}`}>
          {hpChange.type === 'damage' ? '-' : '+'}{hpChange.amount}
        </div>
      )}
    </div>
  );
};

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
  isHost, 
  isKeyboardOpen
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakCooldown, setSpeakCooldown] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ledgerEndRef = useRef<HTMLDivElement>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  // Fix: Defined usableManifestations to resolve "Cannot find name 'usableManifestations'" errors
  const usableManifestations = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.abilities || []), ...(activeCharacter.spells || [])]
      .filter(a => a.levelReq <= activeCharacter.level)
      .sort((a, b) => a.levelReq - b.levelReq);
  }, [activeCharacter]);

  const isDying = !!(activeCharacter && activeCharacter.currentHp <= 0);

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; 
  }, [campaign?.history, isLoading]);

  useEffect(() => {
    if (ledgerEndRef.current) ledgerEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [campaign?.history]);

  useEffect(() => {
    let timer: any;
    if (speakCooldown > 0) timer = setInterval(() => setSpeakCooldown(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [speakCooldown]);

  const handleSend = async (retryContent?: string) => {
    const messageContent = retryContent || input;
    if (!campaign || (!retryContent && !messageContent.trim()) || isLoading || speakCooldown > 0 || !activeCharacter) return;
    
    if (!retryContent) {
      const userMsg: Message = { role: 'user', content: messageContent, timestamp: Date.now() };
      onMessage(userMsg);
      setInput('');
      setSpeakCooldown(3);
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
      setIsLoading(false);
      onMessage({ role: 'system', content: "SYSTEM_ALERT: The aetheric connection flickers; the Arbiter's voice is lost to the void.", timestamp: Date.now() });
    }
  };

  const renderContentWithRewards = (content: string, isError: boolean) => {
    const expRegex = /(\+\d+\s*EXP|\[EXP:\s*\d+\])/gi;
    const parts = content.split(expRegex);
    return (
      <div className="space-y-4">
        <div className="leading-relaxed whitespace-pre-wrap font-medium text-sm md:text-base">
          {parts.map((part, i) => part.match(expRegex) ? <span key={i} className="text-gold font-cinzel font-black tracking-widest animate-pulse">{part}</span> : part)}
        </div>
        {isError && (
          <button 
            onClick={() => handleSend(campaign?.history[campaign.history.length-2]?.content)} 
            className="mt-4 px-4 py-2 border border-red-900 bg-red-950/20 text-red-500 font-cinzel text-[10px] uppercase font-black tracking-widest hover:bg-red-900 hover:text-white transition-all"
          >
            Retry Resonance
          </button>
        )}
      </div>
    );
  };

  if (!campaign) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-5xl font-cinzel text-gold font-black text-center">The Chronicles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Manifest Reality</h3>
               {isHost ? (
                 <div className="rune-border p-6 bg-black/60 backdrop-blur space-y-5">
                   <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/40 border border-emerald-900/50 p-4 text-gold font-cinzel text-base outline-none focus:border-gold" placeholder="CHRONICLE TITLE..." />
                   <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="w-full bg-black/40 border border-emerald-900/50 p-4 text-gray-200 text-sm h-32 outline-none focus:border-gold resize-none" placeholder="PREMISE..." />
                   <button onClick={() => onCreateCampaign(newTitle, newPrompt)} className="w-full py-5 bg-emerald-900 text-white font-cinzel font-black border border-gold hover:bg-emerald-800 transition-all">BEND REALITY</button>
                 </div>
               ) : <div className="text-center py-20 text-gray-500 font-cinzel">Waiting for Host...</div>}
            </div>
            <div className="space-y-6">
               <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Ancient Scrolls</h3>
               <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                 {allCampaigns.slice().reverse().map(c => (
                   <div key={c.id} className="p-5 bg-black/40 border border-emerald-900/20 hover:border-gold flex justify-between items-center transition-all group">
                     <h4 className="font-cinzel text-lg text-gold font-bold group-hover:text-white">{c.title}</h4>
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
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0c0a09]">
      <div className="md:hidden flex overflow-x-auto no-scrollbar gap-2 p-2 bg-black border-b border-emerald-900/40 shrink-0 z-30 shadow-lg">
         {characters.map(char => (
           <div 
             key={char.id} 
             onClick={() => onSelectActiveCharacter(char.id)}
             className={`min-w-[100px] p-2 rounded border transition-all ${char.id === activeCharacter?.id ? 'bg-gold/10 border-gold/60' : 'bg-black border-emerald-900/20'}`}
           >
              <p className={`text-[8px] font-black uppercase truncate mb-1 ${char.id === activeCharacter?.id ? 'text-gold' : 'text-gray-500'}`}>{char.name}</p>
              <div className="h-1 w-full bg-gray-950 rounded-full overflow-hidden">
                 <div className={`h-full ${char.currentHp <= 0 ? 'bg-red-600' : 'bg-emerald-600'}`} style={{ width: `${(char.currentHp / char.maxHp) * 100}%` }} />
              </div>
           </div>
         ))}
      </div>

      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="px-4 py-3 border-b-2 border-emerald-900/60 flex justify-between items-center bg-black/80 backdrop-blur shrink-0 z-20">
            <div className="flex items-center gap-3">
              <button onClick={onQuitCampaign} className="text-emerald-900 hover:text-emerald-500 font-black text-2xl" title="Return to Grimoire">×</button>
              <div className="min-w-0">
                <h3 className="font-cinzel text-gold text-[10px] md:text-sm font-black tracking-[0.1em] truncate">{campaign.title}</h3>
                <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                   <p className="text-[8px] text-emerald-500/60 font-black uppercase tracking-tighter">{isLoading ? 'Resonance Loading...' : 'Aether Connected'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-12 md:py-8 space-y-6 custom-scrollbar bg-[#0c0a09] relative">
            <div className="absolute inset-0 bg-leather opacity-20 pointer-events-none" />
            
            {campaign.history.map((msg, idx) => {
              const isError = msg.content.includes("voice is lost to the void") || msg.content.includes("flickers");
              return (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in relative z-10`}>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-gold/[0.08] border border-gold/30 text-white p-4 rounded-l-xl rounded-tr-xl' : isError ? 'bg-red-950/10 border-l-4 border-red-900 text-red-200 p-5 rounded-r-xl' : 'bg-black border-l-4 border-emerald-900 text-[#e7e5e4] p-5 shadow-xl rounded-r-xl'}`}>
                    {msg.role === 'model' && <p className="text-[9px] font-cinzel text-emerald-500 mb-2 font-black uppercase">The Arbiter Speaks</p>}
                    {msg.role === 'system' && <p className="text-[9px] font-cinzel text-red-500 mb-2 font-black uppercase">Engine Alert</p>}
                    {renderContentWithRewards(msg.content, isError)}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in relative z-10">
                 <div className="bg-black border-l-4 border-emerald-900 p-5 shadow-xl max-w-[85%] rounded-r-xl">
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

          <div className="shrink-0 bg-black border-t-2 border-emerald-900/40 p-4 pb-20 md:pb-4 z-20">
            <div className="flex gap-3 items-end max-w-5xl mx-auto w-full">
              <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                placeholder={isDying ? "THOU ART UNCONSCIOUS..." : "VOICE THY WILL..."}
                disabled={isDying || isLoading}
                className="flex-1 bg-[#1c1917] border-2 border-emerald-900/20 p-3 text-gold text-sm md:text-base h-24 md:h-20 focus:border-gold outline-none resize-none rounded-lg transition-all" 
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isLoading || !activeCharacter || isDying} className="w-20 md:w-28 font-cinzel font-black border-2 h-24 md:h-20 bg-emerald-900 text-white border-gold/60 shadow-xl hover:bg-emerald-800 disabled:opacity-50 transition-all">SPEAK</button>
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex flex-col w-80 bg-[#0c0a09] border-l-2 border-emerald-900/30 overflow-hidden shrink-0 shadow-2xl">
          <div className="p-5 border-b border-emerald-900/20 bg-emerald-900/5 shrink-0">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-cinzel text-emerald-500 font-black uppercase tracking-widest">Fellowship Monitor</h4>
                <div className="flex items-center gap-1.5">
                   <span className="text-[7px] text-emerald-700 font-black">SCRIBE:</span>
                   <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                </div>
             </div>
             <div className="space-y-2">
              {characters.map(char => (
                  <VitalityMonitor 
                    key={char.id} 
                    character={char} 
                    isActive={char.id === activeCharacter?.id} 
                    onClick={() => onSelectActiveCharacter(char.id)} 
                  />
              ))}
            </div>
          </div>

          {/* SCRIBE'S LEDGER SEGMENT */}
          <div className="p-5 border-b border-emerald-900/20 bg-black/40 h-40 flex flex-col shrink-0">
             <h4 className="text-[9px] font-cinzel text-emerald-800 font-black uppercase mb-3 tracking-widest">Scribe's Ledger</h4>
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {campaign.history.filter(m => m.role === 'system' && m.content.startsWith('SCRIBE_LOG:')).map((log, i) => (
                  <div key={i} className="text-[9px] font-mono text-emerald-500/80 leading-tight">
                    ✧ {log.content.replace('SCRIBE_LOG:', '')}
                  </div>
                ))}
                {campaign.history.filter(m => m.role === 'system' && m.content.startsWith('SCRIBE_LOG:')).length === 0 && (
                  <p className="text-[8px] text-gray-700 italic">Ledger is silent.</p>
                )}
                <div ref={ledgerEndRef} />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8 bg-black/20">
             {activeCharacter?.spellSlots && activeCharacter.maxSpellSlots && (
               <div>
                  <h4 className="text-[10px] font-cinzel text-amber-500 font-black uppercase mb-4 tracking-widest border-b border-amber-900/20 pb-1">Aetheric Wells</h4>
                  <SpellSlotManager 
                    currentSlots={activeCharacter.spellSlots} 
                    maxSlots={activeCharacter.maxSpellSlots} 
                    onUseSlot={() => {}} 
                    onRestoreAll={() => {}} 
                    isReadOnly 
                  />
               </div>
             )}

             <div>
                <h4 className="text-[10px] font-cinzel text-gold font-black uppercase mb-4 tracking-widest border-b border-gold/20 pb-1">Manifestations</h4>
                <div className="space-y-3">
                  {usableManifestations.length > 0 ? (
                    usableManifestations.map((spell, i) => (
                      <div key={i} className="p-3 bg-black/40 border border-emerald-900/20 hover:border-gold transition-all group rounded-sm shadow-inner">
                          <p className="text-[10px] font-cinzel text-gold font-bold group-hover:text-white">{spell.name}</p>
                          <p className="text-[9px] text-gray-500 italic mt-1 leading-relaxed line-clamp-2">"{spell.description}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[9px] text-gray-700 italic text-center py-4">No spells manifested for this vessel.</p>
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMWindow;
