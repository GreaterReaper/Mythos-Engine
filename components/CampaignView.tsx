
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CampaignState, GameLog, Character, ClassDef, SyncMessage, Item } from '../types';
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
}

const CampaignView: React.FC<CampaignViewProps> = ({ 
  campaign, setCampaign, characters, broadcast, isHost, 
  classes, playerName, notify, arcadeReady, dmModel, 
  setDmModel, isQuotaExhausted, localResetTime, items
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
    setCampaign(prev => ({ ...prev, logs: [initialLog], summary: 'The saga begins with a new party of heroes.', rules: [], party: [] }));
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto px-4 pt-16">
        <div className="text-7xl mb-8 drop-shadow-[0_0_20px_rgba(178,138,72,0.3)]">📜</div>
        <h2 className="text-4xl font-black mb-4 fantasy-font text-[#b28a48]">Forge Your Saga</h2>
        <p className="text-neutral-500 mb-10 text-sm italic tracking-widest uppercase">
          Describe the world and the conflict that awaits.
        </p>
        <textarea
          value={campaign.plot}
          onChange={(e) => setCampaign(prev => ({ ...prev, plot: e.target.value }))}
          className="w-full bg-black border-2 border-[#1a1a1a] rounded-sm p-5 mb-6 h-48 focus:border-[#b28a48]/50 outline-none text-neutral-300 font-serif text-lg shadow-inner"
          placeholder="e.g. A sprawling kingdom where ancient dragons have returned to reclaim their throne..."
        />
        <button
          onClick={handleStartCampaign}
          disabled={!campaign.plot}
          className="bg-[#b28a48] hover:bg-[#cbb07a] disabled:bg-neutral-900 text-black px-12 py-4 font-black uppercase tracking-[0.3em] transition-all w-full md:w-auto shadow-[0_5px_15_rgba(0,0,0,0.4)]"
        >
          Begin Adventure
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-64px)] space-y-4 pt-12 relative">
      <div className="bg-black/80 backdrop-blur-sm p-3 md:p-4 rounded-sm border border-[#1a1a1a] flex flex-wrap justify-between items-center shadow-2xl gap-4">
        <div className="min-w-0 flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setSheetOpen(true)}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-[#b28a48]/40 flex items-center justify-center text-lg md:text-xl hover:bg-[#b28a48] hover:text-black transition-all"
            title="Player Sheets"
          >
            📋
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] md:text-xs font-black fantasy-font text-[#b28a48] tracking-widest uppercase truncate max-w-[120px] md:max-w-none">
                {campaign.plot.slice(0, 30)}...
              </h3>
              {summarizing && <span className="text-[7px] text-amber-500 animate-pulse font-black uppercase">Reflecting...</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide max-w-[150px] md:max-w-none">
          {campaign.party.map(c => (
            <div key={c.id} className="group relative shrink-0">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-[#b28a48]/50 overflow-hidden bg-black flex items-center justify-center">
                {c.imageUrl ? <img src={c.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt={c.name} /> : <span className="text-[10px]">👤</span>}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-[#b28a48]/30 rounded text-[8px] font-black uppercase tracking-widest text-[#b28a48] invisible group-hover:visible whitespace-nowrap z-50">
                {c.name}
              </div>
            </div>
          ))}
          <button 
            onClick={() => setRecruitmentOpen(true)}
            className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-dashed border-[#b28a48]/30 flex items-center justify-center text-neutral-600 hover:text-[#b28a48] hover:border-[#b28a48] transition-all shrink-0"
            title="Recruit Members"
          >
            +
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <div className="hidden md:flex items-center gap-2 bg-neutral-900/50 p-1 rounded-sm border border-neutral-800">
            <button 
              onClick={() => setDmModel('gemini-3-pro-preview')}
              className={`text-[8px] px-2 py-1 font-black uppercase transition-all ${dmModel.includes('pro') ? 'bg-[#b28a48] text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              FIDELITY
            </button>
            <button 
              onClick={() => setDmModel('gemini-3-flash-preview')}
              className={`text-[8px] px-2 py-1 font-black uppercase transition-all ${dmModel.includes('flash') ? 'bg-[#b28a48] text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              VELOCITY
            </button>
          </div>

          <button 
            onClick={handleGenerateLoot}
            disabled={loading || !isHost}
            className="text-[8px] md:text-[9px] text-[#b28a48] hover:text-[#cbb07a] font-black uppercase tracking-widest border border-[#b28a48]/30 px-3 py-1 rounded-sm flex items-center gap-2"
          >
            LOOT
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 bg-neutral-950/40 rounded-sm border border-[#1a1a1a] overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide"
      >
        {isQuotaExhausted && dmModel.includes('pro') && (
          <div className="bg-red-950/20 border-2 border-red-900 p-4 text-center mb-6 rounded-sm shadow-2xl">
             <h4 className="text-red-500 font-black text-[10px] uppercase tracking-widest mb-1">
               Ancestral Quota Exhausted
             </h4>
             <button 
               onClick={() => setDmModel('gemini-3-flash-preview')}
               className="text-[8px] bg-red-900 text-white px-4 py-1 font-black uppercase hover:bg-red-800 transition-all shadow-xl"
             >
               Switch Velocity
             </button>
          </div>
        )}

        {campaign.logs.map((log, i) => (
          <div key={i} className={`flex ${log.role === 'player' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[95%] md:max-w-[85%] p-4 rounded-sm relative ${
              log.role === 'player' 
              ? 'bg-[#151515] text-neutral-200 border border-[#b28a48]/20' 
              : 'bg-transparent text-[#cbb07a] border-l-2 border-[#b28a48]/40'
            }`}>
              <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-2 flex justify-between gap-4 ${log.role === 'dm' ? 'text-[#b28a48]' : 'text-neutral-500'}`}>
                <span>{log.role === 'dm' ? 'DUNGEON MASTER' : (log.senderName || 'PLAYER')}</span>
              </div>
              <p className="text-sm md:text-base leading-relaxed font-serif italic">{log.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="text-[#b28a48] animate-pulse text-[10px] font-black tracking-widest uppercase">
              The Chronicle Unfolds...
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pb-4 md:pb-0">
        <div className="flex gap-2">
          <input
            value={input}
            disabled={!arcadeReady || loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={arcadeReady ? "Type your move..." : "Ether Cooling..."}
            className={`flex-1 bg-black/60 border-b border-[#1a1a1a] p-3 text-sm focus:border-[#b28a48] outline-none text-neutral-300 font-serif italic`}
          />
          <button
            onClick={handleSendMessage}
            disabled={!arcadeReady || loading || !input.trim()}
            className={`bg-[#1a1a1a] hover:bg-[#b28a48] text-[#b28a48] hover:text-black px-4 h-12 flex flex-col items-center justify-center transition-colors border border-[#333] disabled:opacity-20 rounded-sm`}
          >
            <span className="text-xl md:text-2xl">⚔️</span>
          </button>
        </div>
      </div>

      {/* Sheets Panel - Mobile Friendly Overlays */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[100] bg-black md:bg-black/95 backdrop-blur-md animate-in slide-in-from-left duration-300 overflow-y-auto">
           <div className="p-4 md:p-8 h-full flex flex-col max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6 md:mb-8 border-b border-[#b28a48]/20 pb-4">
                 <h2 className="text-lg md:text-xl font-black fantasy-font text-[#b28a48] uppercase tracking-widest">Active Fellowship</h2>
                 <button onClick={() => setSheetOpen(false)} className="text-neutral-600 hover:text-white text-3xl md:text-2xl p-2">✕</button>
              </div>
              <div className="flex-1 space-y-6 md:space-y-8 scrollbar-hide">
                 {campaign.party.length === 0 ? (
                   <p className="text-center text-neutral-600 uppercase text-[10px] font-black py-12">No members recruited to the active saga.</p>
                 ) : (
                   campaign.party.map(c => {
                     const cls = classes.find(cl => cl.id === c.classId);
                     const charItems = items.filter(i => c.inventory.includes(i.id));
                     const charSpells = c.knownSpells || [];
                     return (
                       <div key={c.id} className="grim-card p-4 md:p-8 border-neutral-900 border-2 rounded-sm text-left">
                          <div className="flex flex-col md:flex-row gap-6 mb-6">
                             <div className="w-24 h-24 md:w-32 md:h-32 rounded-sm border border-[#b28a48]/20 overflow-hidden shrink-0 mx-auto md:mx-0">
                                {c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover" alt={c.name} />}
                             </div>
                             <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl md:text-3xl font-black fantasy-font text-[#b28a48]">{c.name}</h3>
                                <p className="text-[10px] md:text-xs text-neutral-500 uppercase font-black tracking-widest">{c.race} • {cls?.name || 'Unknown'}</p>
                                <div className="mt-4 flex justify-center md:justify-start gap-8">
                                   <div className="text-center">
                                      <p className="text-[8px] md:text-[10px] text-neutral-600 font-black uppercase">Vitality</p>
                                      <p className="text-lg md:text-xl font-black text-neutral-200">{c.hp} / {c.maxHp}</p>
                                   </div>
                                   <div className="text-center">
                                      <p className="text-[8px] md:text-[10px] text-neutral-600 font-black uppercase">Level</p>
                                      <p className="text-lg md:text-xl font-black text-neutral-200">{c.level}</p>
                                   </div>
                                </div>
                             </div>
                             <button onClick={() => handleDismiss(c.id)} className="md:ml-auto self-center md:self-start text-red-900/60 hover:text-red-500 transition-all font-black uppercase text-[10px] border border-red-900/20 px-4 py-2 mt-4 md:mt-0">Dismiss Soul</button>
                          </div>
                          
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 mb-8">
                             {Object.entries(c.stats).map(([s, v]) => (
                               <div key={s} className="bg-black/60 p-2 md:p-3 border border-neutral-800 rounded-sm text-center shadow-inner">
                                  <p className="text-[7px] md:text-[8px] text-neutral-600 font-black uppercase">{s.slice(0,3)}</p>
                                  <p className="text-base md:text-lg font-black text-amber-600">{v}</p>
                                  {/* Fix: Explicitly cast v to number for the arithmetic operation to prevent TS errors in environments where Object.entries returns any or unknown */}
                                  <p className="text-[8px] text-neutral-700 font-black">+{Math.floor(((v as number)-10)/2)}</p>
                               </div>
                             ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                               <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest border-b border-neutral-900 pb-1 flex items-center gap-2">
                                 <span>🎒</span> THE VAULT
                               </h4>
                               <div className="space-y-2">
                                  {charItems.length === 0 ? (
                                    <p className="text-[10px] italic text-neutral-700">Empty vault...</p>
                                  ) : charItems.map(i => (
                                    <div key={i.id} className="bg-neutral-950/50 p-2 border border-neutral-900 rounded-sm">
                                      <p className="text-[10px] font-black text-[#b28a48] uppercase">{i.name}</p>
                                      <p className="text-[9px] text-neutral-500 font-serif italic line-clamp-1">{i.description}</p>
                                    </div>
                                  ))}
                               </div>
                            </div>
                            <div className="space-y-4">
                               <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest border-b border-neutral-900 pb-1 flex items-center gap-2">
                                 <span>✨</span> ARCANUM
                               </h4>
                               <div className="space-y-2">
                                  {charSpells.length === 0 ? (
                                    <p className="text-[10px] italic text-neutral-700">No incantations known...</p>
                                  ) : charSpells.map((s, idx) => (
                                    <div key={idx} className="bg-neutral-950/50 p-2 border border-neutral-900 rounded-sm">
                                      <div className="flex justify-between">
                                        <p className="text-[10px] font-black text-amber-600 uppercase">{s.name}</p>
                                        <p className="text-[8px] text-neutral-600 font-black">LVL {s.level}</p>
                                      </div>
                                      <p className="text-[9px] text-neutral-500 font-serif italic line-clamp-1">{s.description}</p>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          </div>
                       </div>
                     );
                   })
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Recruitment Panel - Mobile Friendly */}
      {recruitmentOpen && (
        <div className="fixed inset-0 z-[100] bg-black md:bg-black/95 backdrop-blur-md animate-in slide-in-from-right duration-300 overflow-y-auto">
           <div className="p-4 md:p-8 h-full flex flex-col max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6 md:mb-8 border-b border-[#b28a48]/20 pb-4">
                 <h2 className="text-lg md:text-xl font-black fantasy-font text-[#b28a48] uppercase tracking-widest">Recruit Adventurers</h2>
                 <button onClick={() => setRecruitmentOpen(false)} className="text-neutral-600 hover:text-white text-3xl md:text-2xl p-2">✕</button>
              </div>
              <div className="flex-1 space-y-4 scrollbar-hide">
                 {characters.filter(c => !campaign.party.some(pc => pc.id === c.id)).map(c => (
                   <div key={c.id} className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex items-center gap-4 hover:border-[#b28a48]/30 transition-all group">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-neutral-800 overflow-hidden bg-black shrink-0">
                         {c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover" alt={c.name} />}
                      </div>
                      <div className="flex-1 text-left">
                         <h4 className="text-sm md:text-base font-black text-[#b28a48] uppercase tracking-widest">{c.name}</h4>
                         <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase font-black">{c.race} • Level {c.level}</p>
                      </div>
                      <button 
                        onClick={() => handleRecruit(c)}
                        className="bg-neutral-900 hover:bg-[#b28a48] hover:text-black border border-neutral-800 px-4 md:px-6 py-2 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                      >
                        Recruit
                      </button>
                   </div>
                 ))}
                 {characters.filter(c => !campaign.party.some(pc => pc.id === c.id)).length === 0 && (
                   <p className="text-center text-neutral-600 uppercase text-[10px] font-black py-12">No available souls found in the fellowship.</p>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CampaignView;
