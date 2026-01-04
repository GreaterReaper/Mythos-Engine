
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CampaignState, GameLog, Character, ClassDef, SyncMessage, Item, UserAccount, Stats, Monster } from '../types';
import { getDMResponse, generateSmartLoot } from '../services/gemini';
import { MENTOR_TEMPLATES } from '../App';

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
}

const SIZE_MAP = { Small: 0.8, Medium: 1, Large: 1.8, Huge: 2.8, Gargantuan: 4 };

const CampaignView: React.FC<CampaignViewProps> = ({ 
  campaign, setCampaign, characters, setCharacters, broadcast, isHost, 
  classes, playerName, notify, arcadeReady, dmModel, user, items
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMap, setViewMap] = useState<'chat' | 'world' | 'tactical'>('chat');
  const [fullscreenTactical, setFullscreenTactical] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [campaign.logs]);

  // Logic to scale a mentor to a target level
  const getScaledMentor = useCallback((template: Partial<Character>, targetLevel: number): Character => {
    const cls = classes.find(cl => cl.id === template.classId);
    const baseStats = template.stats || { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
    const scaledStats = { ...baseStats };
    
    // ASI points at 4, 8, 12, 16, 19
    const asiLevels = [4, 8, 12, 16, 19];
    const asiCount = asiLevels.filter(lvl => targetLevel >= lvl).length;
    const primary = cls?.preferredStats?.[0]?.toLowerCase() as keyof Stats || 'strength';
    scaledStats[primary] = (scaledStats[primary] || 10) + (asiCount * 2);

    const hpPerLevel = cls?.hpPerLevel || 5;
    const conMod = Math.floor((scaledStats.constitution - 10) / 2);
    
    // template.hp serves as starting HP for mentors
    const scaledMaxHp = (template.hp || 10) + ((targetLevel - 1) * (hpPerLevel + conMod));

    return {
      ...(template as Character),
      level: targetLevel,
      stats: scaledStats,
      maxHp: scaledMaxHp,
      hp: scaledMaxHp,
      expToNextLevel: targetLevel * 1000,
      exp: 0 
    };
  }, [classes]);

  // Automatically scale all mentors in the party when players level up
  useEffect(() => {
    if (!isHost) return;
    const playerLevels = campaign.party.filter(p => p.isPlayer).map(p => p.level);
    if (playerLevels.length === 0) return;
    const maxPlayerLevel = Math.max(...playerLevels);

    const needsScaling = campaign.party.some(c => c.isMentor && c.level !== maxPlayerLevel);
    if (needsScaling) {
      setCampaign(prev => ({
        ...prev,
        party: prev.party.map(c => {
          if (!c.isMentor || c.level === maxPlayerLevel) return c;
          const template = MENTOR_TEMPLATES.find(t => t.id === c.id);
          if (!template) return c;
          return getScaledMentor(template, maxPlayerLevel);
        })
      }));
    }
  }, [campaign.party, isHost, getScaledMentor, setCampaign]);

  const handleSummonMentors = () => {
    if (!isHost) return;
    const playerLevels = campaign.party.filter(p => p.isPlayer).map(p => p.level);
    const targetLevel = playerLevels.length > 0 ? Math.max(...playerLevels) : 1;

    const mentorIdsInParty = new Set(campaign.party.filter(p => p.isMentor).map(p => p.id));
    const missingMentors = MENTOR_TEMPLATES.filter(t => !mentorIdsInParty.has(t.id!));

    if (missingMentors.length === 0) {
      notify("The Mentor Trio is already present.", "info");
      return;
    }

    const scaledMentors = missingMentors.map(t => getScaledMentor(t, targetLevel));
    setCampaign(prev => ({
      ...prev,
      party: [...prev.party, ...scaledMentors]
    }));
    notify("The Mentor Trio has manifest to assist you.", "success");
  };

  const handleLevelUp = (charId: string) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      
      if (c.isMentor) {
        notify("Mentors scale automatically to match your prowess.", "info");
        return c;
      }

      if (c.exp < c.expToNextLevel) {
        notify(`${c.name} has not yet gained sufficient essence.`, "error");
        return c;
      }

      const cls = classes.find(cl => cl.id === c.classId);
      const newLevel = c.level + 1;
      const hpGain = (cls?.hpPerLevel || 5) + Math.floor((c.stats.constitution - 10) / 2);
      
      const newStats = { ...c.stats };
      let unspentAsi = c.unspentAsiPoints || 0;
      // Requirement: ASI at 4, 8, 12, 16, 19
      const isAsiLevel = [4, 8, 12, 16, 19].includes(newLevel);

      if (isAsiLevel) {
        unspentAsi += 2;
      }

      const nextExp = newLevel * 1000;

      return { 
        ...c, 
        level: newLevel, 
        maxHp: c.maxHp + hpGain, 
        hp: c.hp + hpGain, 
        stats: newStats, 
        unspentAsiPoints: unspentAsi,
        expToNextLevel: nextExp
      };
    }));
    notify("Essence Ascended.", "success");
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const playerMsg: GameLog = { role: 'player', content: input, timestamp: Date.now(), senderName: playerName };
    const newLogs = [...campaign.logs, playerMsg];
    setCampaign(prev => ({ ...prev, logs: newLogs }));
    broadcast({ type: 'NEW_LOG', payload: playerMsg });
    setInput('');
    setLoading(true);

    try {
      const dmText = await getDMResponse(newLogs, campaign.plot, input, campaign.party, campaign.summary, dmModel);
      
      const expMatch = dmText.match(/\+(\d+)\s*EXP/i);
      if (expMatch && isHost) {
        const amount = parseInt(expMatch[1]);
        setCharacters(prev => prev.map(c => ({
          ...c,
          exp: c.isMentor ? c.exp : c.exp + amount
        })));
        notify(`Fellowship gained ${amount} Essence.`, "info");
      }

      if (dmText.toLowerCase().includes("summon the mentor trio") || dmText.toLowerCase().includes("miri, lina, and seris arrive")) {
        if (isHost) handleSummonMentors();
      }

      if (dmText.includes('[') && dmText.includes(']')) {
        const itemName = dmText.match(/\[(.*?)\]/)?.[1];
        if (itemName) {
          const exists = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
          if (!exists && isHost) {
            notify(`Forging unique artifact: ${itemName}...`, "info");
            const forged = await generateSmartLoot(campaign.party, classes);
            forged.name = itemName;
            forged.id = Math.random().toString(36).substr(2,9);
            broadcast({ type: 'GIVE_LOOT', payload: forged });
            const pc = campaign.party.find(p => p.isPlayer);
            if (pc) {
              setCharacters(prev => prev.map(c => c.id === pc.id ? { ...c, inventory: [...c.inventory, forged.id] } : c));
            }
          }
        }
      }

      const dmMsg: GameLog = { role: 'dm', content: dmText, timestamp: Date.now() };
      setCampaign(prev => ({ ...prev, logs: [...prev.logs, dmMsg] }));
      broadcast({ type: 'NEW_LOG', payload: dmMsg });
    } catch (e: any) { notify("Void interference.", "error"); } finally { setLoading(false); }
  };

  const moveEntity = (id: string, x: number, y: number, isMonster = false) => {
    if (!isHost) return;
    if (isMonster) {
      setCampaign(prev => ({ ...prev, activeEnemies: prev.activeEnemies?.map(m => m.id === id ? { ...m, position: { x, y } } : m) }));
    } else {
      setCampaign(prev => ({ ...prev, party: prev.party.map(c => c.id === id ? { ...c, position: { x, y } } : c) }));
    }
  };

  const mentorPresenceCount = campaign.party.filter(p => p.isMentor).length;

  return (
    <div className="flex flex-col h-full space-y-2 relative overflow-hidden">
      <div className="bg-black/90 p-3 rounded-sm border border-neutral-900 flex flex-wrap justify-between items-center shrink-0 gap-3">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1 flex-1">
          {campaign.party.map(c => {
            const expPercent = c.isMentor ? 100 : Math.min(100, (c.exp / c.expToNextLevel) * 100);
            const canLevel = !c.isMentor && c.exp >= c.expToNextLevel;
            return (
              <div key={c.id} className="flex flex-col items-center">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border bg-neutral-900 overflow-hidden relative group shrink-0 ${canLevel ? 'border-amber-500 shadow-[0_0_10px_rgba(178,138,72,0.4)] animate-pulse' : (c.isMentor ? 'border-blue-500' : 'border-neutral-800')}`}>
                  {c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover" alt={c.name} />}
                  <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${canLevel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button onClick={() => handleLevelUp(c.id)} className="text-sm p-2">
                      {canLevel ? '✨' : (c.isMentor ? '🛡️' : '⬆️')}
                    </button>
                  </div>
                  {c.isMentor && (
                    <div className="absolute top-0 right-0 bg-blue-900 text-white text-[6px] px-1 font-black rounded-bl-sm">AI</div>
                  )}
                </div>
                <div className="w-full h-1 bg-black rounded-full mt-1.5 overflow-hidden border border-neutral-900">
                  <div className={`h-full transition-all duration-1000 ${c.isMentor ? 'bg-blue-600' : 'bg-gradient-to-r from-amber-900 to-[#b28a48]'}`} style={{ width: `${expPercent}%` }}></div>
                </div>
              </div>
            );
          })}
          {isHost && mentorPresenceCount < 3 && (
            <button 
              onClick={handleSummonMentors}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-dashed border-blue-900/40 hover:border-blue-500 flex items-center justify-center text-blue-500/40 hover:text-blue-500 transition-all group shrink-0"
              title="Summon Mentor Trio"
            >
              <span className="text-xl group-hover:scale-125 transition-transform">+</span>
            </button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {['chat', 'world', 'tactical'].map(v => (
            <button 
              key={v} 
              onClick={() => { setViewMap(v as any); if(v !== 'tactical') setFullscreenTactical(false); }} 
              className={`px-3 py-2 text-[8px] font-black uppercase tracking-widest border rounded-sm transition-all whitespace-nowrap active:scale-95 ${viewMap === v ? 'bg-[#b28a48] text-black border-[#b28a48]' : 'bg-black text-neutral-600 border-neutral-800'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 bg-black/40 rounded-sm border border-neutral-900 overflow-hidden relative shadow-inner flex flex-col ${fullscreenTactical ? 'fixed inset-0 z-[1000] bg-slate-950 p-0 rounded-none' : ''}`}>
        {viewMap === 'chat' && (
          <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {campaign.logs.map((log, i) => (
              <div key={i} className={`flex ${log.role === 'player' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 rounded-sm border max-w-[90%] md:max-w-[85%] ${log.role === 'player' ? 'bg-neutral-900/50 border-blue-900/30 shadow-[0_4px_10px_rgba(0,0,0,0.5)]' : 'border-transparent text-amber-200/80 font-serif italic'}`}>
                  <p className="text-[7px] font-black uppercase tracking-tighter opacity-40 mb-1">{log.senderName || (log.role === 'dm' ? 'Dungeon Master' : 'System')}</p>
                  <p className="text-sm leading-relaxed">{log.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMap === 'tactical' && (
          <div className="h-full w-full bg-slate-950 p-2 md:p-4 flex flex-col items-center justify-center overflow-hidden">
            {fullscreenTactical && (
              <button onClick={() => setFullscreenTactical(false)} className="absolute top-4 right-4 z-10 bg-black/60 border border-white/20 p-2 rounded-full text-white w-10 h-10 flex items-center justify-center">✕</button>
            )}
            {!fullscreenTactical && (
              <button onClick={() => setFullscreenTactical(true)} className="absolute top-2 right-2 z-10 bg-black/40 p-2 rounded text-[8px] font-black uppercase tracking-widest text-[#b28a48] lg:hidden">Full Screen ⛶</button>
            )}
            
            <div className="relative border-2 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] touch-none select-none" style={{ width: 'min(95vw, 600px)', aspectRatio: '1/1', background: 'radial-gradient(circle, #111 0%, #000 100%)' }}>
               <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-10 pointer-events-none">
                  {Array.from({length: 100}).map((_, i) => <div key={i} className="border-[0.5px] border-[#b28a48]/30"></div>)}
               </div>
               
               {campaign.party.map((c, i) => {
                 const pos = c.position || { x: 2 + i, y: 8 };
                 const size = (SIZE_MAP[c.size || 'Medium'] || 1) * 10;
                 return (
                   <div key={c.id} 
                    className={`absolute ${c.isMentor ? 'bg-blue-600' : 'bg-amber-600'} rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-move transition-all duration-300 group touch-manipulation active:scale-125 active:z-[100]`}
                    style={{ left: `${pos.x * 10}%`, top: `${pos.y * 10}%`, width: `${size}%`, height: `${size}%`, zIndex: 10 + i }}
                    onMouseDown={() => isHost && moveEntity(c.id, (pos.x + 1) % 10, pos.y)}
                    onTouchStart={(e) => {
                      if (isHost) {
                        e.preventDefault();
                        moveEntity(c.id, (pos.x + 1) % 10, pos.y);
                      }
                    }}
                   >
                     <span className="text-[8px] font-black text-white pointer-events-none uppercase">{c.name[0]}</span>
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black border border-white/20 px-2 py-0.5 rounded text-[7px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{c.name} {c.isMentor ? '(AI)' : ''}</div>
                   </div>
                 );
               })}

               {campaign.activeEnemies?.map((m, i) => {
                 const pos = m.position || { x: 4 + i, y: 2 };
                 const size = (SIZE_MAP[m.size || 'Medium'] || 1) * 10;
                 return (
                   <div key={m.id} 
                    className="absolute bg-red-600 rounded-sm border-2 border-red-400 shadow-[0_0_15px_rgba(255,0,0,0.5)] flex items-center justify-center cursor-move transition-all duration-300 group touch-manipulation active:scale-125 active:z-[100]"
                    style={{ left: `${pos.x * 10}%`, top: `${pos.y * 10}%`, width: `${size}%`, height: `${size}%`, zIndex: 50 + i }}
                    onMouseDown={() => isHost && moveEntity(m.id, pos.x, (pos.y + 1) % 10, true)}
                    onTouchStart={(e) => {
                      if (isHost) {
                        e.preventDefault();
                        moveEntity(m.id, pos.x, (pos.y + 1) % 10, true);
                      }
                    }}
                   >
                     <span className="text-[10px] pointer-events-none">💀</span>
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-950 border border-red-500 px-2 py-0.5 rounded text-[7px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{m.name}</div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 pb-safe shrink-0">
        <input 
          value={input} onChange={(e) => setInput(e.target.value)} 
          placeholder="Narrate your fate..." 
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 bg-black border border-neutral-800 p-3 md:p-4 rounded-sm outline-none text-[#b28a48] font-serif italic text-sm md:text-base active:border-[#b28a48]/60 focus:bg-neutral-900 transition-colors" 
        />
        <button onClick={handleSendMessage} disabled={loading} className="bg-[#b28a48] text-black px-6 md:px-8 font-black text-xs uppercase tracking-widest active:scale-95 disabled:opacity-30 h-auto min-h-[44px]">
          {loading ? '...' : '⚔️'}
        </button>
      </div>
    </div>
  );
};

export default CampaignView;
