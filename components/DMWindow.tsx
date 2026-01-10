
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Campaign, Message, Character, Item, Monster, Currency, Ability, ApiUsage } from '../types';
import { generateDMResponse } from '../geminiService';
import { RULES_MANIFEST, RAID_RECOMMENDATION } from '../constants';

interface DMWindowProps {
  campaign: Campaign | null; 
  allCampaigns: Campaign[]; 
  characters: Character[]; 
  bestiary: Monster[]; 
  activeCharacter: Character | null; 
  onSelectActiveCharacter: (id: string) => void; 
  onMessage: (msg: Message) => void; 
  onCreateCampaign: (title: string, prompt: string, isRaid?: boolean) => void; 
  onSelectCampaign: (id: string) => void; 
  onDeleteCampaign: (id: string) => void; 
  onQuitCampaign: () => void; 
  onShortRest: () => void; 
  onSyncHistory?: () => void;
  updateCharacter?: (id: string, updates: Partial<Character>) => void;
  isHost: boolean; 
  isKeyboardOpen?: boolean;
  apiUsage?: ApiUsage;
  isLoadingExternally?: boolean;
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
  campaign, allCampaigns, characters, bestiary, activeCharacter, onSelectActiveCharacter, onMessage, onCreateCampaign, onSelectCampaign, onDeleteCampaign, onQuitCampaign, onShortRest, onSyncHistory, isHost, isKeyboardOpen, apiUsage, isLoadingExternally
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const ledgerEndRef = useRef<HTMLDivElement>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [isRaidManifest, setIsRaidManifest] = useState(false);

  useEffect(() => {
    if (!activeCharacter && characters.length > 0) {
      onSelectActiveCharacter(characters[0].id);
    }
  }, [characters, activeCharacter, onSelectActiveCharacter]);

  const usableManifestations = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.abilities || []), ...(activeCharacter.spells || [])]
      .filter(a => a.levelReq <= activeCharacter.level)
      .sort((a, b) => a.levelReq - b.levelReq);
  }, [activeCharacter]);

  const isDying = !!(activeCharacter && activeCharacter.currentHp <= 0);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [campaign?.history, isLoadingExternally]);
  useEffect(() => { if (ledgerEndRef.current) ledgerEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [campaign?.history]);

  const handleSend = async () => {
    if (!campaign || !input.trim() || isLoadingExternally) return;
    
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    onMessage(userMsg);
    setInput('');
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
                 
                 <div className="space-y-3">
                   <div className="flex items-center gap-3">
                     <div 
                       onClick={() => setIsRaidManifest(!isRaidManifest)}
                       className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isRaidManifest ? 'bg-red-900 shadow-[0_0_10px_rgba(153,27,27,0.5)]' : 'bg-emerald-900/30'}`}
                     >
                       <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isRaidManifest ? 'translate-x-6' : 'translate-x-0'}`} />
                     </div>
                     <span className={`text-[10px] font-cinzel font-black uppercase tracking-widest ${isRaidManifest ? 'text-red-500' : 'text-emerald-900/60'}`}>RAID MANIFESTATION</span>
                   </div>

                   {isRaidManifest && (
                     <div className="p-3 bg-red-950/20 border border-red-900/40 animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[10px] text-red-500 font-black uppercase mb-2">{RAID_RECOMMENDATION.warning}</p>
                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-black uppercase tracking-tighter">
                          <span>{RAID_RECOMMENDATION.tanks} TANKS</span>
                          <span>{RAID_RECOMMENDATION.dps} DPS</span>
                          <span>{RAID_RECOMMENDATION.support} SUPPORT</span>
                        </div>
                     </div>
                   )}
                 </div>

                 <button onClick={() => onCreateCampaign(newTitle, newPrompt, isRaidManifest)} className={`w-full py-5 font-cinzel font-black border transition-all ${isRaidManifest ? 'bg-red-900 text-white border-red-500 shadow-[0_0_20px_rgba(153,27,27,0.4)]' : 'bg-emerald-900 text-white border-gold'}`}>BEND REALITY</button>
               </div>
            </div>
            <div className="space-y-6">
               <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Ancient Scrolls</h3>
               <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                 {allCampaigns.slice().reverse().map(c => (
                   <div key={c.id} className={`p-5 bg-black/40 border flex justify-between items-center group ${c.isRaid ? 'border-red-900/40 hover:border-red-500' : 'border-emerald-900/20 hover:border-gold'}`}>
                     <div className="flex items-center gap-3">
                        <h4 className="font-cinzel text-lg text-gold font-bold group-hover:text-white">{c.title}</h4>
                        {c.isRaid && <span className="text-[8px] bg-red-900 text-white px-1.5 py-0.5 rounded font-black uppercase">RAID</span>}
                     </div>
                     <button onClick={() => onSelectCampaign(c.id)} className={`px-4 py-2 border text-[10px] font-cinzel ${c.isRaid ? 'border-red-500/40 text-red-500' : 'border-gold/40 text-gold'}`}>REBIND</button>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const effectivePOV = activeCharacter || characters[0];
  
  // CRITICAL: Filter out technical genesis prompts from the visual history
  const visibleHistory = campaign.history.filter(m => !m.content.startsWith('[NARRATIVE_START]'));

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0c0a09]">
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="px-4 py-3 border-b-2 border-emerald-900/60 flex justify-between items-center bg-black/80 backdrop-blur shrink-0 z-20">
            <div className="flex items-center gap-3">
              <button onClick={onQuitCampaign} className="text-emerald-900 hover:text-emerald-500 font-black text-2xl">×</button>
              <h3 className="font-cinzel text-gold text-[10px] md:text-sm font-black tracking-[0.1em] truncate">
                {campaign.title} {campaign.isRaid && <span className="text-red-500 ml-2">[RAID]</span>}
              </h3>
            </div>
            {effectivePOV && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/30 rounded-full">
                <span className="text-[8px] font-black font-cinzel text-gold uppercase tracking-tighter">POV: {effectivePOV.name}</span>
              </div>
            )}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-12 md:py-8 space-y-6 custom-scrollbar relative">
            <div className="absolute inset-0 bg-leather opacity-20 pointer-events-none" />
            {visibleHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in relative z-10`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-gold/[0.08] border border-gold/30 p-4 rounded-xl' : 'bg-black border-l-4 border-emerald-900 p-5 shadow-xl rounded-xl'}`}>
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}
            {isLoadingExternally && <div className="flex justify-start relative z-10"><div className="bg-black border-l-4 border-emerald-900 p-5 shadow-xl rounded-xl animate-pulse text-emerald-500 text-xs font-black uppercase tracking-widest">WEAVING FATE...</div></div>}
          </div>
          <div className="shrink-0 bg-black border-t-2 border-emerald-900/40 p-4 pb-20 md:pb-4 z-20">
            <div className="flex gap-3 items-end max-w-5xl mx-auto w-full">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder={isDying ? "UNCONSCIOUS..." : !effectivePOV ? "SELECT A SOUL..." : "SPEAK..."} disabled={isDying || isLoadingExternally || !effectivePOV} className="flex-1 bg-[#1c1917] border-2 border-emerald-900/20 p-3 text-gold text-sm h-20 outline-none resize-none rounded-lg" />
              <button onClick={() => handleSend()} disabled={!input.trim() || isLoadingExternally || !effectivePOV || isDying} className={`w-20 md:w-28 font-cinzel font-black border-2 h-20 text-white shadow-xl disabled:opacity-30 ${campaign.isRaid ? 'bg-red-900 border-red-500' : 'bg-emerald-900 border-gold/60'}`}>SPEAK</button>
            </div>
          </div>
        </div>
        <div className="hidden md:flex flex-col w-80 bg-[#0c0a09] border-l-2 border-emerald-900/30 overflow-hidden shrink-0 shadow-2xl">
          <div className="p-5 border-b border-emerald-900/20 bg-emerald-900/5 shrink-0">
             <h4 className="text-[10px] font-cinzel text-emerald-500 font-black uppercase mb-4 tracking-widest">Aetheric Monitor</h4>
             <div className="space-y-2">{characters.map(char => <VitalityMonitor key={char.id} character={char} isActive={char.id === effectivePOV?.id} onClick={() => onSelectActiveCharacter(char.id)} />)}</div>
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
                  {usableManifestations.length === 0 && <p className="text-[9px] text-gray-600 italic">No focused power manifested.</p>}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DMWindow;
