
import React, { useState, useRef, useEffect } from 'react';
import { CampaignState, GameLog, Character, ClassDef, SyncMessage, Item, UserAccount, Stats } from '../types';
import { getDMResponse, generateSmartLoot, generateSummary, generateWorldMap, generateLocalTiles } from '../services/gemini';

interface CampaignViewProps {
  campaign: CampaignState;
  setCampaign: React.Dispatch<React.SetStateAction<CampaignState>>;
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
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
  manifestBasics?: (scope: 'adventure') => void;
}

const ASI_LEVELS = [4, 8, 12, 16, 19];

const CampaignView: React.FC<CampaignViewProps> = ({ 
  campaign, setCampaign, characters, setCharacters, broadcast, isHost, 
  classes, playerName, notify, arcadeReady, dmModel, 
  setDmModel, isQuotaExhausted, localResetTime, items, user,
  manifestBasics
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [focusedCharId, setFocusedCharId] = useState<string | null>(null);
  const [viewMap, setViewMap] = useState<'chat' | 'world' | 'tactical'>('chat');
  // Fix: Added missing recruitmentOpen state
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [campaign.logs, viewMap]);

  const handleLevelUp = (charId: string) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const cls = classes.find(cl => cl.id === c.classId);
      const newLevel = c.level + 1;
      const hpGain = (cls?.hpPerLevel || 5) + Math.floor((c.stats.constitution - 10) / 2);
      const newMaxHp = c.maxHp + hpGain;
      return { ...c, level: newLevel, maxHp: newMaxHp, hp: newMaxHp };
    }));
    notify("Soul Essence Ascended. Level Gained.", "success");
  };

  const calculateTotalAsiPoints = (level: number) => {
    const gainedAsis = ASI_LEVELS.filter(l => level >= l).length;
    return gainedAsis * 2;
  };

  const handleApplyAsi = (charId: string, stat: keyof Stats) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const totalAvailable = calculateTotalAsiPoints(c.level);
      const spent = c.usedAsiPoints || 0;
      if (spent >= totalAvailable) return c;
      
      const newStats = { ...c.stats, [stat]: c.stats[stat] + 1 };
      const newUsed = spent + 1;
      
      // Recalculate max HP if CON changed
      let newMaxHp = c.maxHp;
      let newHp = c.hp;
      if (stat === 'constitution') {
        const oldMod = Math.floor((c.stats.constitution - 10) / 2);
        const newMod = Math.floor((newStats.constitution - 10) / 2);
        if (newMod > oldMod) {
          const hpDiff = c.level; // 1 HP per level per modifier increase
          newMaxHp += hpDiff;
          newHp += hpDiff;
        }
      }

      return { ...c, stats: newStats, usedAsiPoints: newUsed, maxHp: newMaxHp, hp: newHp };
    }));
  };

  const handleNarrativeSynthesis = async () => {
    setSummarizing(true);
    try {
      const recentLogs = campaign.logs.slice(-10);
      const newSummary = await generateSummary(recentLogs, campaign.summary);
      setCampaign(prev => ({ ...prev, summary: newSummary }));
      broadcast({ type: 'SUMMARY_UPDATE', payload: newSummary });
    } catch (error: any) {
      notify(error.message || "Failed to synthesize narrative memory.", "error");
    } finally {
      setSummarizing(false);
    }
  };

  const handleGenerateMaps = async () => {
    if (!isHost || loading) return;
    setLoading(true);
    notify("Manifesting location visuals...", "info");
    try {
      const worldMap = await generateWorldMap(campaign.plot);
      const tiles = await generateLocalTiles(campaign.locationName || "The Current Area", 3);
      const newState = { ...campaign, worldMapUrl: worldMap, localMapTiles: tiles };
      setCampaign(newState);
      broadcast({ type: 'STATE_UPDATE', payload: { campaign: newState } });
      notify("Cartography updated.", "success");
    } catch (e: any) {
      notify("The ether is too clouded for maps.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = () => {
    if (!campaign.plot) return;
    const initialLog: GameLog = {
      role: 'dm',
      content: `The adventure begins in "${campaign.locationName}". Your story of "${campaign.plot}" unfolds. What is your first move?`,
      timestamp: Date.now()
    };
    setCampaign(prev => ({ ...prev, logs: [initialLog], summary: 'The saga begins.', party: [] }));
    broadcast({ type: 'NEW_LOG', payload: initialLog });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading || !arcadeReady) return;
    const playerMsg: GameLog = { role: 'player', content: input, timestamp: Date.now(), senderName: playerName };
    const newLogs = [...campaign.logs, playerMsg];
    setCampaign(prev => ({ ...prev, logs: newLogs }));
    broadcast({ type: 'NEW_LOG', payload: playerMsg });
    setInput('');
    setLoading(true);
    try {
      const dmText = await getDMResponse(newLogs.slice(-10).map(l => ({ role: l.role, content: l.content })), campaign.plot, input, campaign.party, campaign.summary, dmModel);
      const dmMsg: GameLog = { role: 'dm', content: dmText, timestamp: Date.now() };
      setCampaign(prev => ({ ...prev, logs: [...prev.logs, dmMsg] }));
      broadcast({ type: 'NEW_LOG', payload: dmMsg });
    } catch (error: any) {
      notify(error.message || "Connection unstable.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRecruit = (char: Character) => {
    if (campaign.party.some(c => c.id === char.id)) return;
    const newParty = [...campaign.party, char];
    setCampaign(prev => ({ ...prev, party: newParty }));
    broadcast({ type: 'STATE_UPDATE', payload: { campaign: { ...campaign, party: newParty } } });
    notify(`${char.name} joined.`, "success");
  };

  const handleGenerateLoot = async () => {
    if (loading || !isHost) return;
    setLoading(true);
    try {
      const item = await generateSmartLoot(campaign.party, classes);
      const lootMsg: GameLog = { role: 'dm', content: `Found: [${item.name}].`, timestamp: Date.now() };
      setCampaign(prev => ({ ...prev, logs: [...prev.logs, lootMsg] }));
      broadcast({ type: 'GIVE_LOOT', payload: item });
    } catch (e) {} finally { setLoading(false); }
  };

  const focusedChar = characters.find(c => c.id === focusedCharId);
  const focusedClass = focusedChar ? classes.find(cl => cl.id === focusedChar.classId) : null;
  const focusedInventory = focusedChar ? items.filter(i => focusedChar.inventory.includes(i.id)) : [];

  const totalAsi = focusedChar ? calculateTotalAsiPoints(focusedChar.level) : 0;
  const asiRemaining = focusedChar ? totalAsi - (focusedChar.usedAsiPoints || 0) : 0;

  if (campaign.logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-4xl font-black mb-4 fantasy-font text-[#b28a48]">Forge Your Saga</h2>
        <textarea
          value={campaign.plot}
          onChange={(e) => setCampaign(prev => ({ ...prev, plot: e.target.value }))}
          className="w-full bg-black border-2 border-[#1a1a1a] rounded-sm p-4 mb-6 h-40 focus:border-[#b28a48]/50 outline-none text-neutral-300 font-serif"
          placeholder="Describe the world..."
        />
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <button onClick={handleStartCampaign} disabled={!campaign.plot} className="bg-[#b28a48] text-black px-12 py-5 font-black uppercase tracking-[0.3em] flex-1">Begin Saga</button>
          <button onClick={() => manifestBasics?.('adventure')} className="bg-blue-900/20 border-2 border-blue-500/30 text-blue-400 px-12 py-5 font-black uppercase tracking-[0.3em] flex-1">Quickstart ✨</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-2 relative overflow-hidden">
      {/* Campaign Bar */}
      <div className="bg-black/90 backdrop-blur-lg p-3 rounded-sm border border-[#1a1a1a] flex justify-between items-center shadow-2xl gap-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {campaign.party.map(c => (
              <button key={c.id} onClick={() => setFocusedCharId(c.id)} className="w-9 h-9 rounded-full border border-[#b28a48]/50 overflow-hidden bg-black active:scale-90 transition-all">
                {c.imageUrl ? <img src={c.imageUrl} className="w-full h-full object-cover" /> : <span className="text-[10px]">👤</span>}
              </button>
            ))}
            <button onClick={() => setRecruitmentOpen(true)} className="w-9 h-9 rounded-full border border-dashed border-[#b28a48]/30 flex items-center justify-center text-neutral-600 hover:text-[#b28a48] transition-all">+</button>
          </div>
          <div className="hidden sm:block">
            <h3 className="text-[10px] font-black fantasy-font text-[#b28a48] tracking-widest uppercase">{campaign.locationName}</h3>
            <p className="text-[8px] text-neutral-600 font-black uppercase">{campaign.summary.slice(0, 40)}...</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {['chat', 'world', 'tactical'].map(v => (
            <button key={v} onClick={() => setViewMap(v as any)} className={`px-3 py-2 text-[8px] font-black uppercase tracking-widest border rounded-sm transition-all ${viewMap === v ? 'bg-[#b28a48] text-black border-[#b28a48]' : 'bg-black text-neutral-500 border-neutral-800'}`}>
              {v}
            </button>
          ))}
          {isHost && (
            <button onClick={handleGenerateMaps} disabled={loading} className="px-3 py-2 text-[8px] font-black uppercase tracking-widest bg-blue-900/20 text-blue-400 border border-blue-500/30 rounded-sm active:scale-95">🗺️ Gen</button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-neutral-950/20 rounded-sm border border-[#1a1a1a] overflow-hidden relative">
        {viewMap === 'chat' && (
          <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {campaign.logs.map((log, i) => (
              <div key={i} className={`flex ${log.role === 'player' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-sm border ${log.role === 'player' ? 'bg-[#0f0f0f] border-[#b28a48]/10' : 'border-l-2 border-l-[#b28a48]/40 border-transparent text-[#cbb07a]'}`}>
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-50">{log.role === 'dm' ? 'Dungeon Master' : (log.senderName || 'Soul')}</p>
                  <p className="text-sm md:text-base leading-relaxed font-serif italic">{log.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMap === 'world' && (
          <div className="h-full w-full bg-black relative flex items-center justify-center p-4">
            {campaign.worldMapUrl ? (
              <img src={campaign.worldMapUrl} className="max-h-full max-w-full object-contain shadow-2xl rounded-sm border border-[#b28a48]/20" />
            ) : (
              <div className="text-center opacity-30">
                <p className="text-5xl mb-4">🌍</p>
                <p className="text-xs uppercase font-black tracking-widest">No world map manifest</p>
              </div>
            )}
          </div>
        )}

        {viewMap === 'tactical' && (
          <div className="h-full w-full bg-black/80 p-4 overflow-y-auto scrollbar-hide">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mb-4 text-center">Tactical Surroundings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campaign.localMapTiles?.map((tile, idx) => (
                <div key={idx} className="aspect-square bg-neutral-900 border border-[#b28a48]/10 rounded-sm overflow-hidden group shadow-xl">
                  <img src={tile} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                </div>
              ))}
              {(!campaign.localMapTiles || campaign.localMapTiles.length === 0) && (
                <div className="col-span-full py-20 text-center opacity-20 border-2 border-dashed border-neutral-800">
                  <p className="text-xs uppercase font-black tracking-widest">Local area obscured by shadows</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-2 flex gap-2">
        <textarea
          value={input}
          disabled={loading || !arcadeReady}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your fate..."
          className="flex-1 bg-black/50 border border-[#1a1a1a] rounded-sm p-3 text-[15px] outline-none text-neutral-300 font-serif italic min-h-[48px] resize-none"
        />
        <button onClick={handleSendMessage} disabled={loading || !input.trim()} className="bg-[#111] hover:bg-[#b28a48] text-[#b28a48] hover:text-black w-14 h-[48px] flex items-center justify-center border border-[#222] rounded-sm active:scale-95 shadow-lg">⚔️</button>
      </div>

      {/* Full Screen Character Sheet */}
      {focusedChar && (
        <div className="fixed inset-0 z-[120] bg-black bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] flex flex-col pt-[var(--safe-top)]">
          <div className="p-4 md:p-10 flex flex-col h-full max-w-6xl mx-auto w-full">
            <div className="flex justify-between items-start border-b border-[#b28a48]/20 pb-6 mb-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 md:w-32 md:h-32 border-2 border-[#b28a48]/40 rounded-sm overflow-hidden shadow-2xl">
                  {focusedChar.imageUrl && <img src={focusedChar.imageUrl} className="w-full h-full object-cover" />}
                </div>
                <div className="text-left">
                  <h2 className="text-4xl md:text-6xl font-black fantasy-font text-[#b28a48] tracking-widest">{focusedChar.name}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm md:text-lg text-neutral-500 font-black uppercase tracking-[0.4em]">{focusedChar.race} • Level {focusedChar.level} {focusedClass?.name}</p>
                    <button 
                      onClick={() => handleLevelUp(focusedChar.id)}
                      className="bg-green-900/30 hover:bg-green-700/50 border border-green-500/40 text-green-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all"
                    >
                      Ascend Level ⚡
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setFocusedCharId(null)} className="text-neutral-600 hover:text-white text-5xl active:scale-90">✕</button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-10 overflow-y-auto scrollbar-hide pb-20">
              {/* Stats & Vitals */}
              <div className="space-y-8">
                <div className="bg-neutral-900/40 p-6 border border-[#b28a48]/10 rounded-sm">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Vitality</span>
                    <span className="text-[10px] font-black text-red-500 uppercase">HP</span>
                  </div>
                  <div className="relative h-4 bg-black rounded-full overflow-hidden border border-neutral-800">
                    <div className="h-full bg-red-800 transition-all duration-1000" style={{ width: `${(focusedChar.hp / focusedChar.maxHp) * 100}%` }}></div>
                  </div>
                  <p className="text-center mt-2 font-black text-xl text-neutral-200">{focusedChar.hp} / {focusedChar.maxHp}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Sacred Attributes</h4>
                    {asiRemaining > 0 && (
                      <span className="text-[10px] font-black text-amber-500 animate-pulse uppercase tracking-widest">
                        {asiRemaining} ASI PTS AVAILABLE
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-left">
                    {(Object.keys(focusedChar.stats) as Array<keyof Stats>).map((s) => (
                      <div key={s} className="bg-black/60 p-4 border border-neutral-900 rounded-sm text-center relative group">
                        <p className="text-[8px] text-neutral-600 font-black uppercase mb-1">{s.slice(0,3)}</p>
                        <p className="text-2xl font-black text-amber-600">{focusedChar.stats[s]}</p>
                        {asiRemaining > 0 && (
                          <button 
                            onClick={() => handleApplyAsi(focusedChar.id, s)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 text-black text-xs font-black rounded-full shadow-lg border border-black hover:bg-amber-400 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-950/10 p-6 border border-amber-900/20 rounded-sm text-left">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black fantasy-font text-[#b28a48]">Treasury</h4>
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-amber-500 font-mono">{focusedChar.gold}</span>
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Imperial Gold Pieces</span>
                  </div>
                </div>
              </div>

              {/* Feats & Inventory */}
              <div className="lg:col-span-2 space-y-10 text-left">
                <section>
                  <h4 className="text-sm font-black fantasy-font text-neutral-500 border-b border-neutral-900 pb-2 mb-4">Satchel & Armaments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {focusedInventory.length > 0 ? focusedInventory.map(item => (
                      <div key={item.id} className="p-4 bg-black/40 border border-neutral-900 rounded-sm flex items-center gap-4 hover:border-amber-900/30 transition-all">
                        <div className="w-16 h-16 bg-neutral-950 rounded-sm border border-neutral-800 overflow-hidden shrink-0">
                          {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#b28a48] uppercase truncate">{item.name}</p>
                          <p className="text-[9px] text-neutral-500 font-serif italic mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-neutral-700 text-xs italic">Only shadows fill this satchel.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-black fantasy-font text-neutral-500 border-b border-neutral-900 pb-2 mb-4">Class & Innate Destinies</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Native racial feats and initial class feats */}
                    {focusedChar.feats.map((f, i) => (
                      <div key={i} className="p-5 bg-black/20 border border-neutral-900 rounded-sm border-l-2 border-l-amber-900/50">
                        <div className="flex justify-between items-start mb-1">
                          <h6 className="text-xs font-black text-[#b28a48] uppercase">{f.name}</h6>
                          {f.usageCheck && (
                            <span className="text-[8px] font-black px-2 py-0.5 bg-amber-950 text-amber-500 border border-amber-900/30 rounded-sm uppercase tracking-widest">
                              {f.dc ? `DC ${f.dc} ` : ''}{f.usageCheck}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400 font-serif italic leading-relaxed">{f.description}</p>
                      </div>
                    ))}
                    {/* Features from the actual class record */}
                    {focusedClass?.features.map((f, i) => (
                      <div key={`class-${i}`} className="p-5 bg-blue-900/5 border border-neutral-900 rounded-sm border-l-2 border-l-blue-900/50">
                        <div className="flex justify-between items-start mb-1">
                          <h6 className="text-xs font-black text-blue-400 uppercase">{f.name}</h6>
                          <span className="text-[7px] font-black px-2 py-0.5 bg-blue-900/20 text-blue-500 border border-blue-900/30 rounded-sm uppercase tracking-widest">Archetype</span>
                        </div>
                        <p className="text-sm text-neutral-400 font-serif italic leading-relaxed">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recruitment Modal */}
      {recruitmentOpen && (
        <div className="fixed inset-0 z-[130] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-neutral-950 border border-[#b28a48]/20 p-8 rounded-sm shadow-2xl">
            <div className="flex justify-between items-center mb-8 border-b border-neutral-900 pb-4">
              <h3 className="text-xl font-black fantasy-font text-[#b28a48]">Recruit Fellowship</h3>
              <button onClick={() => setRecruitmentOpen(false)} className="text-4xl text-neutral-600 hover:text-white">✕</button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {characters.filter(c => !campaign.party.some(pc => pc.id === c.id)).map(c => (
                <div key={c.id} className="p-4 bg-black border border-neutral-800 rounded-sm flex items-center justify-between hover:border-[#b28a48]/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-neutral-700">
                      {c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover" />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-[#b28a48] uppercase tracking-widest">{c.name}</p>
                      <p className="text-[8px] text-neutral-600 font-black uppercase">LVL {c.level} {c.race}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRecruit(c)} className="bg-amber-950/20 text-[#b28a48] border border-[#b28a48]/40 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm active:scale-95">Accept Soul</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignView;
