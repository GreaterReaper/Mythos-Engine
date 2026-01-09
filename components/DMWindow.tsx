
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Campaign, Message, Character, Item, Monster, Currency, Ability } from '../types';
import { generateDMResponse, parseDMCommand } from '../geminiService';
import { RULES_MANIFEST, TUTORIAL_SCENARIO } from '../constants';

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
  onAwardExp: (amount: number) => void; 
  onAwardCurrency: (curr: Partial<Currency>) => void; 
  onAwardItem: (name: string, data?: Partial<Item>) => void; 
  onAwardMonster: (name: string) => Promise<Monster>; 
  onShortRest: () => void; 
  onLongRest: () => void; 
  onAIRuntimeUseSlot: (level: number, characterName: string) => boolean; 
  onOpenShop: () => void; 
  onSetCombatActive: (active: boolean) => void; 
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
  onAwardExp, 
  onAwardCurrency, 
  onAwardItem, 
  onAwardMonster, 
  onShortRest, 
  onLongRest, 
  onAIRuntimeUseSlot, 
  onOpenShop, 
  onSetCombatActive, 
  isHost, 
  isKeyboardOpen
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakCooldown, setSpeakCooldown] = useState(0);
  const [showMobileGrimoire, setShowMobileGrimoire] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  // Strictly filter manifestations by the Soul's current Level Ascension
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

  const handleSend = async () => {
    if (!campaign || !input.trim() || isLoading || speakCooldown > 0 || !activeCharacter) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    onMessage(userMsg); setInput(''); setSpeakCooldown(8);
    if (!isHost) return;
    setIsLoading(true);
    try {
      const responseText = await generateDMResponse(campaign.history.concat(userMsg), { 
        activeCharacter, 
        party: characters, 
        mentors: characters.filter(c => c.id.startsWith('mentor-')), 
        activeRules: RULES_MANIFEST, 
        existingItems: [], 
        existingMonsters: bestiary 
      });
      const dmMsg: Message = { role: 'model', content: responseText || "The Engine hums silently...", timestamp: Date.now() };
      onMessage(dmMsg);
      if (responseText) {
        const { exp, currency, items, monstersToAdd, shortRest, longRest, openShop, enterCombat, exitCombat, usedSlot } = parseDMCommand(responseText);
        if (exp > 0) onAwardExp(exp);
        if (currency.aurels > 0) onAwardCurrency(currency);
        items.forEach(item => onAwardItem(item.name, item.data));
        for (const mName of monstersToAdd) await onAwardMonster(mName);
        if (usedSlot) onAIRuntimeUseSlot(usedSlot.level, usedSlot.characterName);
        if (shortRest) onShortRest(); if (longRest) onLongRest(); if (openShop) onOpenShop();
        if (enterCombat) onSetCombatActive(true); if (exitCombat) onSetCombatActive(false);
      }
    } catch (err: any) { 
      console.error(err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleManifestSpell = (spell: Ability) => {
    // Only send the name of the spell. Description is handled internally by the DM rules.
    const text = `I manifest the spell: ${spell.name.toUpperCase()}.`;
    setInput(text);
    setShowMobileGrimoire(false);
  };

  if (!campaign) {
    return (
      <div className="space-y-12 max-w-4xl mx-auto animate-in fade-in px-4 py-8">
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-cinzel text-gold font-black drop-shadow-2xl">The Chronicles</h2>
          <p className="text-emerald-500 font-cinzel text-xs tracking-[0.3em] uppercase font-bold opacity-80">Aetheric Records of Blood and Glory</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
             <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Manifest Reality</h3>
             {isHost ? (
               <div className="space-y-6">
                  <div className="rune-border p-6 bg-black/60 backdrop-blur space-y-5 border-emerald-900/40">
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/40 border border-emerald-900/50 p-4 text-gold font-cinzel text-base focus:border-gold outline-none transition-all placeholder:text-emerald-900/30" placeholder="CHRONICLE TITLE..." />
                    <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="w-full bg-black/40 border border-emerald-900/50 p-4 text-gray-200 text-sm h-32 focus:border-gold outline-none resize-none" placeholder="PREMISE..." />
                    <button onClick={() => onCreateCampaign(newTitle, newPrompt)} disabled={!newTitle || !newPrompt || characters.length === 0} className="w-full py-5 bg-emerald-900 text-white font-cinzel font-black border border-gold disabled:opacity-30 transition-all">BEND REALITY</button>
                  </div>
               </div>
             ) : <div className="rune-border p-12 bg-black/40 text-gray-500 font-cinzel text-center border-emerald-900/40">Waiting for Host...</div>}
          </div>
          <div className="space-y-6">
             <h3 className="text-sm font-cinzel text-gold uppercase tracking-widest font-black border-b border-emerald-900/30 pb-2">Ancient Scrolls</h3>
             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
               {allCampaigns.slice().reverse().map(c => (
                 <div key={c.id} className="p-5 bg-black/40 border-2 border-emerald-900/20 hover:border-gold/60 transition-all flex justify-between items-center group shadow-2xl">
                   <div className="min-w-0 pr-4"><h4 className="font-cinzel text-lg text-gold group-hover:text-white truncate font-black">{c.title}</h4></div>
                   <div className="flex gap-2">
                     <button onClick={() => onSelectCampaign(c.id)} className="px-4 py-2 bg-emerald-900/10 border border-emerald-900/40 text-[10px] font-cinzel text-gold hover:bg-emerald-900 hover:text-white font-black transition-all">REBIND</button>
                     {isHost && (
                       <button onClick={() => onDeleteCampaign(c.id)} className="w-10 h-10 flex items-center justify-center border border-emerald-900/40 text-emerald-900 hover:bg-emerald-900 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                     )}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  const totalSlots = activeCharacter?.spellSlots 
    ? (Object.values(activeCharacter.spellSlots) as number[]).reduce((acc: number, val: number) => acc + (val || 0), 0)
    : 0;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0c0a09]">
      {/* Mobile Grimoire Toggle */}
      {!isKeyboardOpen && usableManifestations.length > 0 && (
        <button 
          onClick={() => setShowMobileGrimoire(true)}
          className="md:hidden fixed bottom-24 right-4 w-12 h-12 bg-emerald-900 border-2 border-gold text-gold rounded-full shadow-2xl flex items-center justify-center z-[60] animate-bounce"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
      )}

      {/* Mobile Grimoire Modal */}
      {showMobileGrimoire && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
           <div className="flex justify-between items-center border-b border-emerald-900 pb-4 mb-4">
             <h3 className="text-xl font-cinzel text-gold font-black uppercase">Thy Usable Manifestations</h3>
             <button onClick={() => setShowMobileGrimoire(false)} className="text-emerald-500 text-3xl font-black">&times;</button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
             {usableManifestations.map((spell, i) => (
               <div key={i} className="p-4 bg-emerald-900/10 border-l-4 border-emerald-900">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-cinzel text-gold font-bold">{spell.name}</p>
                    <span className="text-[8px] text-emerald-500 uppercase font-black">Level {spell.baseLevel}</span>
                  </div>
                  <p className="text-xs text-gray-400 italic mb-3 leading-relaxed">{spell.description}</p>
                  <button 
                    onClick={() => handleManifestSpell(spell)}
                    className="w-full py-2 bg-emerald-900/40 text-emerald-400 border border-emerald-900 text-[10px] font-black uppercase tracking-widest"
                  >
                    PREPARE MANIFESTATION
                  </button>
               </div>
             ))}
           </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-1 min-w-0">
          <div className={`px-4 py-2 border-b-2 border-emerald-900/60 flex justify-between items-center bg-black/80 backdrop-blur shrink-0 z-20 transition-all ${isKeyboardOpen ? 'h-10 py-1' : ''}`}>
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onQuitCampaign} className="text-emerald-900 hover:text-emerald-500 font-black text-2xl px-1">×</button>
              <div className="flex flex-col min-w-0">
                <h3 className="font-cinzel text-gold text-xs md:text-sm truncate font-black tracking-[0.1em]">{campaign.title}</h3>
              </div>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-12 md:py-8 space-y-6 custom-scrollbar bg-[#0c0a09] relative">
            {campaign.history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}>
                <div className={`max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'bg-gold/[0.08] border border-gold/30 text-white p-4 rounded-l-xl' : msg.role === 'system' ? 'bg-gray-950/40 border border-emerald-900/10 text-emerald-500/60 text-[10px] text-center w-full max-w-lg mx-auto py-2 px-4 rounded-sm' : 'bg-black border-l-4 border-emerald-900 text-[#e7e5e4] p-5 shadow-xl'}`}>
                  {msg.role === 'model' && <p className="text-[9px] font-cinzel text-emerald-500 mb-2 font-black uppercase border-b border-emerald-900/10 pb-1">The Engine Speaks</p>}
                  <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={`shrink-0 z-10 bg-black border-t-2 border-emerald-900/40 transition-all ${isKeyboardOpen ? 'pb-2' : 'pb-20 md:pb-0'}`}>
            <div className={`p-3 md:p-5 flex gap-3 items-end max-w-5xl mx-auto w-full ${isKeyboardOpen ? 'p-2' : ''}`}>
              <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                placeholder="VOICE THY WILL..." 
                className={`w-full bg-[#1c1917] border-2 border-emerald-900/20 p-3 text-gold text-sm md:text-base focus:border-gold outline-none resize-none rounded-lg placeholder:text-emerald-900/20 font-cinzel transition-all ${isKeyboardOpen ? 'h-14 py-2' : 'h-16 md:h-24'}`} 
              />
              <button onClick={handleSend} disabled={!input.trim() || isLoading || speakCooldown > 0 || !activeCharacter} className={`w-20 md:w-28 font-cinzel font-black border-2 transition-all flex items-center justify-center uppercase tracking-widest text-[10px] rounded-lg ${isKeyboardOpen ? 'h-14' : 'h-16 md:h-24'} ${speakCooldown > 0 || !activeCharacter ? 'bg-black/50 text-emerald-900 border-emerald-900/20 opacity-50' : 'bg-emerald-900 text-white border-gold/60 shadow-xl hover:bg-emerald-800 active:scale-95'}`}>SPEAK</button>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar: Party & Grimoire */}
        <div className="hidden md:flex flex-col w-80 bg-[#0c0a09] border-l-2 border-emerald-900/30 overflow-hidden shrink-0 shadow-2xl">
          <div className="p-5 border-b border-emerald-900/20 bg-emerald-900/5">
             <h4 className="text-[10px] font-cinzel text-emerald-500 font-black uppercase tracking-widest mb-4">Fellowship Resonance</h4>
             <div className="space-y-4">
              {characters.map(char => (
                <div key={char.id} className={`space-y-2 p-2 rounded transition-all cursor-pointer ${char.id === activeCharacter?.id ? 'bg-gold/5 border border-gold/40 shadow-[0_0_10px_rgba(212,175,55,0.1)]' : 'border border-transparent hover:bg-emerald-900/5'}`} onClick={() => onSelectActiveCharacter(char.id)}>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs font-cinzel font-black truncate ${char.id === activeCharacter?.id ? 'text-gold' : 'text-white'}`}>{char.name}</p>
                    <span className="text-[8px] font-mono text-gray-500">LVL {char.level}</span>
                  </div>
                  <div className="h-1 w-full bg-gray-950 rounded-full overflow-hidden border border-emerald-900/10">
                    <div className="h-full bg-emerald-900" style={{ width: `${(char.currentHp / char.maxHp) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            <div className="flex justify-between items-center border-b border-gold/20 pb-2 mb-4">
               <h4 className="text-[10px] font-cinzel text-gold font-black uppercase tracking-[0.2em]">Sacred Grimoire</h4>
               <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${totalSlots > 0 ? 'bg-blue-500' : 'bg-gray-800'}`} />
                  <span className="text-[9px] font-mono text-gray-500">{totalSlots} SLOTS</span>
               </div>
            </div>
            
            {usableManifestations.length > 0 ? (
              <div className="space-y-4">
                {usableManifestations.map((spell, i) => (
                  <div key={i} className="group/spell p-3 bg-black/40 border border-emerald-900/20 hover:border-gold/30 transition-all rounded-sm">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[11px] font-cinzel text-gold font-bold leading-tight group-hover/spell:text-white transition-colors">{spell.name}</p>
                      <span className="text-[7px] text-emerald-800 font-black">LV {spell.baseLevel}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 italic line-clamp-2 leading-relaxed mb-2">{spell.description}</p>
                    <button 
                      onClick={() => handleManifestSpell(spell)}
                      className="w-full py-1.5 bg-emerald-900/5 hover:bg-emerald-900/20 border border-emerald-900/40 text-[8px] font-black text-emerald-500 uppercase tracking-tighter transition-all"
                    >
                      Resonate Mind
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center opacity-30">
                 <p className="text-[9px] font-cinzel text-gray-500 uppercase tracking-widest italic">Aetheric reach limited by Soul Ascension level.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-emerald-950/20 border-t border-emerald-900/30">
             <p className="text-[8px] text-emerald-700 font-black uppercase text-center tracking-widest">Thy level dictates thy aetheric reach.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMWindow;
