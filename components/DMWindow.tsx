import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Campaign, Message, Character, Item, Monster, Currency, Ability, ApiUsage } from '../types';
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
  apiUsage?: ApiUsage;
}

const VitalityMonitor: React.FC<{ character: Character, isActive: boolean, onClick: () => void }> = ({ character, isActive, onClick }) => {
  const hpPercent = (character.currentHp / character.maxHp) * 100;
  const manaPercent = (character.currentMana / character.maxMana) * 100;

  return (
    <div onClick={onClick} className={`p-2.5 rounded transition-all cursor-pointer border ${isActive ? 'bg-gold/10 border-gold/40 shadow-lg shadow-gold/5' : 'bg-black/20 border-transparent hover:bg-emerald-900/5'}`}>
      <div className="flex justify-between items-center mb-1.5">
        <p className={`text-[10px] font-cinzel font-black uppercase tracking-tighter ${isActive ? 'text-gold' : 'text-white/80'}`}>{character.name}</p>
        <span className="text-[8px] font-mono text-white/40">{character.level}</span>
      </div>
      <div className="space-y-1.5">
        <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
          <div className={`h-full transition-all duration-700 ${character.currentHp <= 0 ? 'bg-red-600' : 'bg-emerald-600'}`} style={{ width: `${hpPercent}%` }} />
        </div>
        <div className="h-1 w-full bg-black rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${manaPercent}%` }} />
        </div>
      </div>
    </div>
  );
};

const DMWindow: React.FC<DMWindowProps> = ({ 
  campaign, allCampaigns, characters, bestiary, activeCharacter, onSelectActiveCharacter, onMessage, onCreateCampaign, onSelectCampaign, onDeleteCampaign, onQuitCampaign, onShortRest, onSyncHistory, isHost, isKeyboardOpen, apiUsage
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ledgerEndRef = useRef<HTMLDivElement>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const usableManifestations = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.abilities || []), ...(activeCharacter.spells || [])]
      .filter(a => a.levelReq <= activeCharacter.level)
      .sort((a, b) => a.levelReq - b.levelReq);
  }, [activeCharacter]);

  const isDying = !!(activeCharacter && activeCharacter.currentHp <= 0);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [campaign?.history, isLoading]);
  useEffect(() => { if (ledgerEndRef.current) ledgerEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [campaign?.history]);

  const handleSend = async (retryContent?: string) => {
    const messageContent = retryContent || input;
    if (!campaign || (!retryContent && !messageContent.trim()) || isLoading || !activeCharacter) return;
    
    if (!retryContent) {
      const userMsg: Message = { role: 'user', content: messageContent, timestamp: Date.now() };
      onMessage(userMsg);
      setInput('');
    }
    
    if (!isHost) return;
    setIsLoading(true);
    
    try {
      const currentHistory: Message[] = retryContent ? campaign.history : [...campaign.history, { role: 'user', content: messageContent, timestamp: Date.now() } as Message];
      const responseText = await generateDMResponse(currentHistory, { activeCharacter, party: characters, mentors: characters.filter(c => c.id.startsWith('mentor-')), activeRules: RULES_MANIFEST, existingItems: [], existingMonsters: bestiary, campaignTitle: campaign.title, usageCount: apiUsage?.count });
      onMessage({ role: 'model', content: responseText || "The Engine hums...", timestamp: Date.now() });
      setIsLoading(false);
    } catch (error: any) { 
      setIsLoading(false);
      onMessage({ role: 'system', content: "SYSTEM_ALERT: Aetheric connection flickering.", timestamp: Date.now() });
    }
  };

  const renderContent = (content: string) => {
    const rollRegex = /(\[.*?\])/g;
    const parts = content.split(rollRegex);
    return (
      <div className="leading-relaxed whitespace-pre-wrap font-medium text-sm md:text-base">
        {parts.map((part, i) => {
          if (part.match(rollRegex)) {
            return (
              <span key={i} className="inline-block px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] md:text-xs font-black rounded mx-1">
                {part}
              </span>
            );
          }
          return part;
        })}
      </div>
    );
  };

  if (!campaign) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-5xl font-cinzel text-gold font-black text-center">Chronicles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Manifest New</h3>
               <div className="rune-border p-6 bg-black/60 space-y-5">
                 <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/40 border border-emerald-900/50 p-4 text-gold font-cinzel outline-none" placeholder="TITLE..." />
                 <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="w-full bg-black/40 border border-emerald-900/50 p-4 text-gray-200 text-sm h-32 outline-none resize-none" placeholder="PREMISE..." />
                 <button onClick={() => onCreateCampaign(newTitle, newPrompt)} className="w-full py-5 bg-emerald-900 text-white font-cinzel font-black border border-gold">BEND REALITY</button>
               </div>
            </div>
            <div className="space-y-6">
               <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Ancient Scrolls</h3>
               <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                 {allCampaigns.slice().reverse().map(c => (
                   <div key={c.id} className="p-5 bg-black/40 border border-emerald-900/20 flex justify-between items-center group">
                     <h4 className="font-cinzel text-lg text-gold font-bold group-hover:text-white">{c.title}</h4>
                     <button onClick={() => onSelectCampaign(c.id)} className="px-4 py-2 border border-gold/40 text-[10px] font-cinzel text-gold">REBIND</button>
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
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="px-4 py-3 border-b-2 border-emerald-900/60 flex justify-between items-center bg-black/80 backdrop-blur shrink-0 z-20">
            <div className="flex items-center gap-3">
              <button onClick={onQuitCampaign} className="text-emerald-900 hover:text-emerald-500 font-black text-2xl">×</button>
              <h3 className="font-cinzel text-gold text-[10px] md:text-sm font-black tracking-[0.1em] truncate">{campaign.title}</h3>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-12 md:py-8 space-y-6 custom-scrollbar relative">
            <div className="absolute inset-0 bg-leather opacity-20 pointer-events-none" />
            {campaign.history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in relative z-10`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-gold/[0.08] border border-gold/30 p-4 rounded-xl' : 'bg-black border-l-4 border-emerald-900 p-5 shadow-xl rounded-xl'}`}>
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}
            {isLoading && <div className="flex justify-start relative z-10"><div className="bg-black border-l-4 border-emerald-900 p-5 shadow-xl rounded-xl animate-pulse text-emerald-500 text-xs font-black">WEAVING FATE...</div></div>}
          </div>
          <div className="shrink-0 bg-black border-t-2 border-emerald-900/40 p-4 pb-20 md:pb-4 z-20">
            <div className="flex gap-3 items-end max-w-5xl mx-auto w-full">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder={isDying ? "UNCONSCIOUS..." : "SPEAK..."} disabled={isDying || isLoading} className="flex-1 bg-[#1c1917] border-2 border-emerald-900/20 p-3 text-gold text-sm h-20 outline-none resize-none rounded-lg" />
              <button onClick={() => handleSend()} disabled={!input.trim() || isLoading || !activeCharacter || isDying} className="w-20 md:w-28 font-cinzel font-black border-2 h-20 bg-emerald-900 text-white border-gold/60 shadow-xl">SPEAK</button>
            </div>
          </div>
        </div>
        <div className="hidden md:flex flex-col w-80 bg-[#0c0a09] border-l-2 border-emerald-900/30 overflow-hidden shrink-0 shadow-2xl">
          <div className="p-5 border-b border-emerald-900/20 bg-emerald-900/5 shrink-0">
             <h4 className="text-[10px] font-cinzel text-emerald-500 font-black uppercase mb-4 tracking-widest">Aetheric Monitor</h4>
             <div className="space-y-2">{characters.map(char => <VitalityMonitor key={char.id} character={char} isActive={char.id === activeCharacter?.id} onClick={() => onSelectActiveCharacter(char.id)} />)}</div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8 bg-black/20">
             <div>
                <h4 className="text-[10px] font-cinzel text-gold font-black uppercase mb-4 tracking-widest border-b border-gold/20 pb-1">Manifestations</h4>
                <div className="space-y-3">
                  {usableManifestations.map((spell, i) => (
                    <div key={i} className="p-3 bg-black/40 border border-emerald-900/20 group hover:border-gold transition-all rounded-sm">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-cinzel text-gold font-bold group-hover:text-white">{spell.name}</p>
                          {spell.manaCost && <span className="text-[8px] text-blue-400 font-black">-{spell.manaCost} MP</span>}
                        </div>
                        <p className="text-[9px] text-gray-500 italic mt-1 leading-relaxed line-clamp-2">"{spell.description}"</p>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DMWindow;