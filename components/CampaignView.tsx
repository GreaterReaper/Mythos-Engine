import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CampaignState, GameLog, Character, ClassDef, SyncMessage, Item, UserAccount } from '../types';
import { getDMResponse, generateSmartLoot, generateSummary } from '../services/gemini';

interface CampaignViewProps {
  campaign: CampaignState;
  setCampaign: React.Dispatch<React.SetStateAction<CampaignState>>;
  characters: Character[];
  broadcast: (msg: Partial<SyncMessage>) => void;
  isHost: boolean;
  classes: ClassDef[];
  playerName: string;
  notify: (message: string, type?: any) => void;
  arcadeReady: boolean;
  dmModel: string;
  setDmModel: (val: string) => void;
  isQuotaExhausted: boolean;
  localResetTime: string;
  items: Item[];
  user: UserAccount;
}

const CampaignView: React.FC<CampaignViewProps> = ({ 
  campaign, setCampaign, characters, broadcast, isHost, 
  classes, playerName, notify, arcadeReady, dmModel, 
  setDmModel, isQuotaExhausted, localResetTime, items, user
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [campaign.logs]);

  useEffect(() => {
    const playerLogsCount = campaign.logs.filter(l => l.role === 'player').length;
    if (isHost && playerLogsCount > 0 && playerLogsCount % 5 === 0 && !summarizing) {
      handleNarrativeSynthesis();
    }
  }, [campaign.logs.length, isHost, summarizing]);

  const handleNarrativeSynthesis = async () => {
    setSummarizing(true);
    try {
      const recentLogs = campaign.logs.slice(-10);
      const newSummary = await generateSummary(recentLogs, campaign.summary);
      setCampaign(prev => ({ ...prev, summary: newSummary }));
      broadcast({ type: 'SUMMARY_UPDATE', payload: newSummary });
    } catch (error: any) {
      console.error("Failed to synthesize narrative:", error);
      notify(error.message || "Failed to synthesize narrative memory.", "error");
    } finally {
      setLoading(false);
      setSummarizing(false);
    }
  };

  const handleStartCampaign = () => {
    if (!campaign.plot) return;
    const initialLog: GameLog = {
      role: 'dm',
      content: `The adventure begins. Your story of "${campaign.plot}" unfolds as the world takes shape. What is your first move?`,
      timestamp: Date.now()
    };
    setCampaign(prev => ({ ...prev, logs: [initialLog], summary: 'The saga begins with a new party of heroes.', party: [] }));
    broadcast({ type: 'NEW_LOG', payload: initialLog });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading || !arcadeReady) return;
    const playerMsg: GameLog = { 
      role: 'player', 
      content: input, 
      timestamp: Date.now(),
      senderName: playerName
    };
    const newLogs = [...campaign.logs, playerMsg];
    setCampaign(prev => ({ ...prev, logs: newLogs }));
    broadcast({ type: 'NEW_LOG', payload: playerMsg });
    
    setInput('');
    setLoading(true);
    try {
      const dmText = await getDMResponse(
        newLogs.slice(-10).map(l => ({ role: l.role, content: l.content })), 
        campaign.plot,
        input,
        campaign.party,
        campaign.summary,
        dmModel
      );
      const dmMsg: GameLog = { role: 'dm', content: dmText, timestamp: Date.now() };
      setCampaign(prev => ({
        ...prev,
        logs: [...prev.logs, dmMsg]
      }));
      broadcast({ type: 'NEW_LOG', payload: dmMsg });
    } catch (error: any) {
      console.error(error);
      notify(error.message || "The Dungeon Master's connection is unstable.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRecruit = (char: Character) => {
    if (campaign.party.some(c => c.id === char.id)) return;
    const newParty = [...campaign.party, char];
    setCampaign(prev => ({ ...prev, party: newParty }));
    broadcast({ type: 'STATE_UPDATE', payload: { campaign: { ...campaign, party: newParty } } });
    notify(`${char.name} recruited.`, "success");
  };

  const handleDismiss = (charId: string) => {
    const newParty = campaign.party.filter(c => c.id !== charId);
    setCampaign(prev => ({ ...prev, party: newParty }));
    broadcast({ type: 'STATE_UPDATE', payload: { campaign: { ...campaign, party: newParty } } });
    notify("Member dismissed.", "info");
  };

  const handleGenerateLoot = async () => {
    if (loading || !isHost) return;
    setLoading(true);
    try {
      const lootTargets = campaign.party.length > 0 ? campaign.party : characters;
      const item = await generateSmartLoot(lootTargets, classes);
      const lootMsg: GameLog = { 
        role: 'dm', 
        content: `Amidst the journey, you discover an artifact forged for those like you: [${item.name}].`, 
        timestamp: Date.now() 
      };
      setCampaign(prev => ({ ...prev, logs: [...prev.logs, lootMsg] }));
      broadcast({ type: 'NEW_LOG', payload: lootMsg });
      broadcast({ type: 'GIVE_LOOT', payload: item });
    } catch (error: any) {
      console.error(error);
      notify(error.message || "Failed to forge smart loot artifact.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (campaign.logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto px-4 py-8">
        <div className="text-6xl md:text-7xl mb-6 drop-shadow-[0_0_20px_rgba(178,138,72,0.3)]">📜</div>
        <h2 className="text-3xl md:text-4xl font-black mb-4 fantasy-font text-[#b28a48]">Forge Your Saga</h2>
        <p className="text-neutral-500 mb-8 text-[10px] italic tracking-widest uppercase">
          Describe the world and the conflict that awaits.
        </p>
        <textarea
          value={campaign.plot}
          onChange={(e) => setCampaign(prev => ({ ...prev, plot: e.target.value }))}
          className="w-full bg-black border-2 border-[#1a1a1a] rounded-sm p-4 mb-6 flex-1 max-h-[300px] focus:border-[#b28a48]/50 outline-none text-neutral-300 font-serif text-base shadow-inner"
          placeholder="e.g. A kingdom where dragons returned..."
        />
        <button
          onClick={handleStartCampaign}
          disabled={!campaign.plot}
          className="bg-[#b28a48] hover:bg-[#cbb07a] disabled:bg-neutral-900 text-black px-12 py-5 font-black uppercase tracking-[0.3em] transition-all w-full md:w-auto shadow-xl"
        >
          Begin Adventure
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 relative overflow-hidden">
      {/* Campaign Bar */}
      <div className="bg-black/90 backdrop-blur-lg p-3 rounded-sm border border-[#1a1a1a] flex justify-between items-center shadow-2xl gap-2 shrink-0">
        <div className="min-w-0 flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setSheetOpen(true)}
            className="w-10 h-10 rounded-full border border-[#b28a48]/40 flex items-center justify-center text-xl hover:bg-[#b28a48] hover:text-black transition-all shadow-lg active:scale-95"
            title="Player Sheets"
          >
            📋
          </button>
          <div className="min-w-0">
            <h3 className="text-[10px] font-black fantasy-font text-[#b28a48] tracking-widest uppercase truncate max-w-[100px] sm:max-w-none">
              {campaign.plot.slice(0, 40)}
            </h3>
            {summarizing && <span className="text-[7px] text-amber-500 animate-pulse font-black uppercase">Reflecting...</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-[100px] sm:max-w-none">
          {campaign.party.map(c => (
            <div key={c.id} className="group relative shrink-0">
              <div className="w-8 h-8 rounded-full border border-[#b28a48]/50 overflow-hidden bg-black flex items-center justify-center shadow-inner">
                {c.imageUrl ? <img src={c.imageUrl} className="w-full h-full object-cover" alt={c.name} /> : <span className="text-[10px]">👤</span>}
              </div>
            </div>
          ))}
          <button 
            onClick={() => setRecruitmentOpen(true)}
            className="w-8 h-8 rounded-full border border-dashed border-[#b28a48]/30 flex items-center justify-center text-neutral-600 hover:text-[#b28a48] hover:border-[#b28a48] transition-all shrink-0 active:scale-95"
            title="Recruit Members"
          >
            +
          </button>
        </div>

        <div className="flex gap-1 items-center">
          <button 
            onClick={handleGenerateLoot}
            disabled={loading || !isHost}
            className="text-[8px] text-[#b28a48] font-black uppercase tracking-widest border border-[#b28a48]/30 px-3 h-8 flex items-center justify-center rounded-sm hover:bg-amber-950/20 active:scale-95"
          >
            LOOT
          </button>
        </div>
      </div>

      {/* Chat Logs Area */}
      <div 
        ref={scrollRef}
        className="flex-1 bg-neutral-950/20 rounded-sm border border-[#1a1a1a] overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-hide"
      >
        {campaign.logs.map((log, i) => (
          <div key={i} className={`flex ${log.role === 'player' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[80%] p-3 md:p-4 rounded-sm relative ${
              log.role === 'player' 
              ? 'bg-[#121212] text-neutral-200 border border-[#b28a48]/10' 
              : 'bg-transparent text-[#cbb07a] border-l-2 border-[#b28a48]/40'
            }`}>
              <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 flex justify-between gap-4 ${log.role === 'dm' ? 'text-[#b28a48]' : 'text-neutral-500'}`}>
                <span>{log.role === 'dm' ? 'DUNGEON MASTER' : (log.senderName || 'PLAYER')}</span>
              </div>
              <p className="text-sm md:text-base leading-relaxed font-serif italic">{log.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="text-[#b28a48] animate-pulse text-[10px] font-black tracking-widest uppercase py-2">
              The Chronicle Unfolds...
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Optimized for Mobile Typing */}
      <div className="bg-black/40 border-t border-[#1a1a1a] pt-3 pb-1 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            value={input}
            disabled={!arcadeReady || loading}
            onChange={(e) => {
              setInput(e.target.value);
              // Simple auto-height
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={arcadeReady ? "Describe your move..." : "Ether Cooling..."}
            className="flex-1 bg-black/60 border border-[#1a1a1a] rounded-sm p-3 text-[16px] focus:border-[#b28a48] outline-none text-neutral-300 font-serif italic resize-none min-h-[48px]"
          />
          <button
            onClick={handleSendMessage}
            disabled={!arcadeReady || loading || !input.trim()}
            className="bg-[#1a1a1a] hover:bg-[#b28a48] text-[#b28a48] hover:text-black w-14 h-[48px] flex items-center justify-center transition-all border border-[#333] disabled:opacity-20 rounded-sm active:scale-95 shadow-lg"
          >
            <span className="text-2xl">⚔️</span>
          </button>
        </div>
      </div>

      {/* Sheets Panel - Full Screen on Mobile */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[110] bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] overflow-y-auto animate-in fade-in duration-300 pt-[var(--safe-top)]">
           <div className="p-4 md:p-8 h-full flex flex-col max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6 border-b border-[#b28a48]/20 pb-4 shrink-0">
                 <h2 className="text-lg font-black fantasy-font text-[#b28a48] tracking-widest">Active Fellowship</h2>
                 <button onClick={() => setSheetOpen(false)} className="text-neutral-600 hover:text-white text-3xl p-2 active:scale-90">✕</button>
              </div>
              <div className="flex-1 space-y-6 pb-24">
                 {campaign.party.length === 0 ? (
                   <p className="text-center text-neutral-600 uppercase text-[10px] font-black py-12">No members recruited.</p>
                 ) : (
                   campaign.party.map(c => {
                     const cls = classes.find(cl => cl.id === c.classId);
                     return (
                       <div key={c.id} className="grim-card p-5 border-neutral-900 border-2 rounded-sm text-left shadow-2xl">
                          <div className="flex items-center gap-4 mb-5">
                             <div className="w-20 h-20 rounded-sm border border-[#b28a48]/20 overflow-hidden shrink-0 shadow-inner">
                                {c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover" alt={c.name} />}
                             </div>
                             <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-black fantasy-font text-[#b28a48] truncate">{c.name}</h3>
                                <p className="text-[9px] text-neutral-500 uppercase font-black">{c.race} • {cls?.name || 'Classless'}</p>
                                <div className="mt-2 flex gap-4">
                                   <div className="bg-neutral-950/80 px-2 py-1 border border-neutral-900 rounded-sm">
                                      <p className="text-[7px] text-neutral-600 font-black uppercase">Vitality</p>
                                      <p className="text-sm font-black text-neutral-200">{c.hp} / {c.maxHp}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mb-4">
                             {Object.entries(c.stats).map(([s, v]) => (
                               <div key={s} className="bg-black/60 p-2 border border-neutral-800 rounded-sm text-center">
                                  <p className="text-[8px] text-neutral-600 font-black uppercase">{s.slice(0,3)}</p>
                                  <p className="text-base font-black text-amber-600">{v as number}</p>
                               </div>
                             ))}
                          </div>
                          <button onClick={() => handleDismiss(c.id)} className="w-full text-red-900/60 hover:text-red-500 transition-all font-black uppercase text-[9px] border border-red-900/20 py-3 rounded-sm bg-red-950/5 mt-2 active:bg-red-950/20">Dismiss Soul</button>
                       </div>
                     );
                   })
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Recruitment Panel - Full Screen on Mobile */}
      {recruitmentOpen && (
        <div className="fixed inset-0 z-[110] bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] overflow-y-auto pt-[var(--safe-top)]">
           <div className="p-4 h-full flex flex-col max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6 border-b border-[#b28a48]/20 pb-4 shrink-0">
                 <h2 className="text-lg font-black fantasy-font text-[#b28a48] tracking-widest">Recruit Adventurers</h2>
                 <button onClick={() => setRecruitmentOpen(false)} className="text-neutral-600 hover:text-white text-3xl p-2 active:scale-90">✕</button>
              </div>
              <div className="flex-1 space-y-4 pb-24">
                 {characters.filter(c => !campaign.party.some(pc => pc.id === c.id)).map(c => (
                   <div key={c.id} className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-sm flex items-center gap-3 hover:border-[#b28a48]/30 transition-all group active:bg-neutral-800">
                      <div className="w-14 h-14 rounded-full border border-neutral-700 overflow-hidden bg-black shrink-0 shadow-lg">
                         {c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover" alt={c.name} />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                         <h4 className="text-sm font-black text-[#b28a48] uppercase tracking-widest truncate">{c.name}</h4>
                         <p className="text-[9px] text-neutral-500 uppercase font-black">Level {c.level} {c.race}</p>
                      </div>
                      <button 
                        onClick={() => handleRecruit(c)}
                        className="bg-[#b28a48] text-black border border-[#b28a48] px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                      >
                        Recruit
                      </button>
                   </div>
                 ))}
                 {characters.filter(c => !campaign.party.some(pc => pc.id === c.id)).length === 0 && (
                   <div className="text-center py-20 opacity-40">
                      <p className="text-[10px] font-black uppercase tracking-widest">No unrecruited souls available</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CampaignView;