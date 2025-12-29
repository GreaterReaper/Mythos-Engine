
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CampaignState, GameLog, Character, ClassDef, SyncMessage } from '../types';
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
}

const CampaignView: React.FC<CampaignViewProps> = ({ campaign, setCampaign, characters, broadcast, isHost, classes, playerName, notify, arcadeReady, dmModel, setDmModel, isQuotaExhausted }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
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
  }, [campaign.logs.length, isHost]);

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

  const activeParty = useMemo(() => {
    const logText = campaign.logs.map(l => l.content).join(" ");
    return characters.filter(c => logText.includes(c.name));
  }, [campaign.logs, characters]);

  const handleStartCampaign = () => {
    if (!campaign.plot) return;
    const initialLog: GameLog = {
      role: 'dm',
      content: `The adventure begins. Your story of "${campaign.plot}" unfolds as the world takes shape. What is your first move?`,
      timestamp: Date.now()
    };
    setCampaign(prev => ({ ...prev, logs: [initialLog], summary: 'The saga begins with a new party of heroes.' }));
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
        characters,
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

  const handleGenerateLoot = async () => {
    if (loading || !isHost) return;
    setLoading(true);
    try {
      const lootTargets = activeParty.length > 0 ? activeParty : characters;
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

  const handleEndChronicle = () => {
    if (window.confirm("Are you certain you wish to end this chronicle? All narrative progress, logs, and summaries will be erased from existence.")) {
      setCampaign({ plot: '', summary: '', logs: [], party: [] });
    }
  };

  if (campaign.logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto px-4">
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
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-64px)] space-y-4">
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-sm border border-[#1a1a1a] flex flex-wrap justify-between items-center shadow-2xl gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black fantasy-font text-[#b28a48] tracking-widest">CURRENT SAGA</h3>
            {summarizing && <span className="text-[8px] text-amber-500 animate-pulse font-black uppercase">Reflecting...</span>}
          </div>
          <p className="text-[10px] text-neutral-500 truncate max-w-xs uppercase italic">{campaign.plot}</p>
        </div>
        
        {activeParty.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-neutral-600 uppercase">Linked Companions:</span>
            {activeParty.map(c => (
              <div key={c.id} className="group relative">
                <div className="w-8 h-8 rounded-full border border-[#b28a48]/50 overflow-hidden bg-black flex items-center justify-center">
                  {c.imageUrl ? <img src={c.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0" /> : <span className="text-xs">👤</span>}
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-[#b28a48]/30 rounded text-[8px] font-black uppercase tracking-widest text-[#b28a48] invisible group-hover:visible whitespace-nowrap z-50">
                  {c.name}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 bg-neutral-900/50 p-1 rounded-sm border border-neutral-800">
            <button 
              onClick={() => setDmModel('gemini-3-pro-preview')}
              className={`text-[8px] px-2 py-1 font-black uppercase transition-all ${dmModel.includes('pro') ? 'bg-[#b28a48] text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Best Narrative (50 msg/day limit)"
            >
              FIDELITY
            </button>
            <button 
              onClick={() => setDmModel('gemini-3-flash-preview')}
              className={`text-[8px] px-2 py-1 font-black uppercase transition-all ${dmModel.includes('flash') ? 'bg-[#b28a48] text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Fast & High Quota (1500 msg/day limit)"
            >
              VELOCITY
            </button>
          </div>

          {isHost && (
            <button 
              onClick={handleGenerateLoot}
              disabled={loading}
              className="text-[9px] text-[#b28a48] hover:text-[#cbb07a] font-black uppercase tracking-widest border border-[#b28a48]/30 px-3 py-1 rounded-sm flex items-center gap-2"
            >
              LOOT
            </button>
          )}
          <button 
            onClick={handleEndChronicle}
            className="text-[9px] text-neutral-600 hover:text-red-500 font-black uppercase tracking-widest underline decoration-neutral-800"
          >
            END
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 bg-neutral-950/40 rounded-sm border border-[#1a1a1a] overflow-y-auto p-5 md:p-8 space-y-8 scrollbar-hide"
      >
        {isQuotaExhausted && dmModel.includes('pro') && (
          <div className="bg-red-950/20 border-2 border-red-900 p-4 text-center mb-4">
             <p className="text-red-500 font-black text-xs uppercase tracking-widest">
               Ancestral Quota Exhausted (Daily Pro Limit Hit)
             </p>
             <button 
               onClick={() => setDmModel('gemini-3-flash-preview')}
               className="mt-2 text-[10px] bg-red-900 text-white px-4 py-1 font-black uppercase hover:bg-red-800 transition-all"
             >
               Switch to High Velocity Mode
             </button>
          </div>
        )}

        {campaign.logs.map((log, i) => (
          <div key={i} className={`flex ${log.role === 'player' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] md:max-w-[85%] p-5 rounded-sm relative ${
              log.role === 'player' 
              ? 'bg-[#151515] text-neutral-200 border border-[#b28a48]/20' 
              : 'bg-transparent text-[#cbb07a] border-l-2 border-[#b28a48]/40'
            }`}>
              <div className={`text-[8px] font-black uppercase tracking-[0.3em] mb-3 flex justify-between gap-4 ${log.role === 'dm' ? 'text-[#b28a48]' : 'text-neutral-500'}`}>
                <span>{log.role === 'dm' ? 'DUNGEON MASTER' : (log.senderName || 'PLAYER')}</span>
                <span className="opacity-40">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-base md:text-lg leading-[1.8] font-serif italic">{log.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="text-[#b28a48] animate-pulse text-[10px] font-black tracking-widest">
              THE CHRONICLE UNFOLDS...
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          <input
            value={input}
            disabled={!arcadeReady || loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={arcadeReady ? "Type your action..." : "Arcane Foci Cooling Down..."}
            className={`flex-1 bg-black border-b border-[#1a1a1a] p-4 text-sm focus:border-[#b28a48] outline-none text-neutral-300 font-serif italic ${!arcadeReady ? 'opacity-30 cursor-not-allowed' : ''}`}
          />
          <button
            onClick={handleSendMessage}
            disabled={!arcadeReady || loading || !input.trim()}
            className={`bg-[#1a1a1a] hover:bg-[#b28a48] text-[#b28a48] hover:text-black w-32 h-12 flex flex-col items-center justify-center transition-colors border border-[#333] disabled:opacity-20`}
          >
            <span className="text-lg">⚔️</span>
            <span className="text-[8px] font-black uppercase tracking-tighter">[-1 Token]</span>
          </button>
        </div>
        {!arcadeReady && (
          <div className="text-[8px] font-black uppercase text-amber-900 tracking-widest text-center animate-pulse">
            {isQuotaExhausted && dmModel.includes('pro') ? 'PRO QUOTA DEPLETED - SWITCH TO VELOCITY MODE' : 'Resonating with the Ether...'}
          </div>
        )}
      </div>

      {campaign.summary && (
        <div className="text-[8px] text-neutral-700 uppercase tracking-widest text-center opacity-50 hover:opacity-100 transition-opacity cursor-help" title={campaign.summary}>
          Saga Memory Engaged: {campaign.summary.length} Arcane Fragments Bound
        </div>
      )}
    </div>
  );
};

export default CampaignView;
