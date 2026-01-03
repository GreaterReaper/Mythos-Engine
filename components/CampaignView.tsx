
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CampaignState, GameLog, Character, ClassDef, SyncMessage, Item, UserAccount, Stats, Monster } from '../types';
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
}

const GRID_SIZE = 10;
const SIZE_MAP = { Small: 0.8, Medium: 1, Large: 1.8, Huge: 2.8, Gargantuan: 4 };

const CampaignView: React.FC<CampaignViewProps> = ({ 
  campaign, setCampaign, characters, setCharacters, broadcast, isHost, 
  classes, playerName, notify, arcadeReady, dmModel, user, items
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMap, setViewMap] = useState<'chat' | 'world' | 'tactical'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync scroll on logs
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [campaign.logs]);

  const handleLevelUp = (charId: string) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const cls = classes.find(cl => cl.id === c.classId);
      const newLevel = c.level + 1;
      const hpGain = (cls?.hpPerLevel || 5) + Math.floor((c.stats.constitution - 10) / 2);
      // AI Party Members apply ASI to primary stats automatically
      const newStats = { ...c.stats };
      if (!c.isPlayer && [4, 8, 12, 16, 19].includes(newLevel)) {
        const primary = cls?.preferredStats?.[0]?.toLowerCase() as keyof Stats || 'strength';
        newStats[primary] = (newStats[primary] || 10) + 2;
      }
      return { ...c, level: newLevel, maxHp: c.maxHp + hpGain, hp: c.hp + hpGain, stats: newStats };
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
      // Pass full context for dynamic balancing
      const dmText = await getDMResponse(newLogs, campaign.plot, input, campaign.party, campaign.summary, dmModel);
      
      // Smart Loot Check
      if (dmText.includes('[') && dmText.includes(']')) {
        const itemName = dmText.match(/\[(.*?)\]/)?.[1];
        if (itemName) {
          const exists = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
          if (!exists && isHost) {
            notify(`Forging unique artifact: ${itemName}...`, "info");
            const forged = await generateSmartLoot(campaign.party, classes);
            forged.name = itemName; // Keep DM's name
            forged.id = Math.random().toString(36).substr(2,9);
            broadcast({ type: 'GIVE_LOOT', payload: forged });
            // Add to armory & host's first player character for now
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

  return (
    <div className="flex flex-col h-full space-y-2 relative overflow-hidden">
      <div className="bg-black/90 p-3 rounded-sm border border-neutral-900 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          {campaign.party.map(c => (
            <div key={c.id} className="w-8 h-8 rounded-full border border-blue-500/50 bg-blue-900/20 overflow-hidden">
               {c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover" />}
            </div>
          ))}
          <div className="ml-4 text-left">
            <p className="text-[10px] font-black text-[#b28a48] uppercase">{campaign.locationName || 'The Marches'}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {['chat', 'world', 'tactical'].map(v => (
            <button key={v} onClick={() => setViewMap(v as any)} className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest border rounded-sm transition-all ${viewMap === v ? 'bg-[#b28a48] text-black border-[#b28a48]' : 'bg-black text-neutral-600 border-neutral-800'}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-black/40 rounded-sm border border-neutral-900 overflow-hidden relative shadow-inner">
        {viewMap === 'chat' && (
          <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {campaign.logs.map((log, i) => (
              <div key={i} className={`flex ${log.role === 'player' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 rounded-sm border max-w-[85%] ${log.role === 'player' ? 'bg-neutral-900/50 border-blue-900/30' : 'border-transparent text-amber-200/80 font-serif italic'}`}>
                  <p className="text-[7px] font-black uppercase tracking-tighter opacity-40 mb-1">{log.senderName || 'DM'}</p>
                  <p className="text-sm leading-relaxed">{log.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMap === 'tactical' && (
          <div className="h-full w-full bg-slate-950 p-4 flex items-center justify-center">
            <div className="relative border-2 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]" style={{ width: 'min(90vw, 600px)', aspectRatio: '1/1', background: 'radial-gradient(circle, #111 0%, #000 100%)' }}>
               {/* Grid */}
               <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-10 pointer-events-none">
                  {Array.from({length: 100}).map((_, i) => <div key={i} className="border-[0.5px] border-[#b28a48]/30"></div>)}
               </div>
               
               {/* Party Tokens */}
               {campaign.party.map((c, i) => {
                 const pos = c.position || { x: 2 + i, y: 8 };
                 const size = SIZE_MAP[c.size || 'Medium'] * 10;
                 return (
                   <div key={c.id} 
                    className="absolute bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-move transition-all duration-300 group"
                    style={{ left: `${pos.x * 10}%`, top: `${pos.y * 10}%`, width: `${size}%`, height: `${size}%` }}
                    onMouseDown={() => isHost && moveEntity(c.id, (pos.x + 1) % 10, pos.y)}
                   >
                     <span className="text-[8px] font-black text-white pointer-events-none uppercase">{c.name[0]}</span>
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black border border-white/20 px-2 py-0.5 rounded text-[7px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">{c.name}</div>
                   </div>
                 );
               })}

               {/* Monster Tokens */}
               {campaign.activeEnemies?.map((m, i) => {
                 const pos = m.position || { x: 4 + i, y: 2 };
                 const size = SIZE_MAP[m.size || 'Medium'] * 10;
                 return (
                   <div key={m.id} 
                    className="absolute bg-red-600 rounded-sm border-2 border-red-400 shadow-[0_0_15px_rgba(255,0,0,0.5)] flex items-center justify-center cursor-move transition-all duration-300 group"
                    style={{ left: `${pos.x * 10}%`, top: `${pos.y * 10}%`, width: `${size}%`, height: `${size}%` }}
                    onMouseDown={() => isHost && moveEntity(m.id, pos.x, (pos.y + 1) % 10, true)}
                   >
                     <span className="text-[10px] pointer-events-none">💀</span>
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-950 border border-red-500 px-2 py-0.5 rounded text-[7px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">{m.name}</div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <input 
          value={input} onChange={(e) => setInput(e.target.value)} 
          placeholder="Narrate your fate..." 
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 bg-black border border-neutral-800 p-3 rounded-sm outline-none text-[#b28a48] font-serif italic text-sm" 
        />
        <button onClick={handleSendMessage} disabled={loading} className="bg-[#b28a48] text-black px-6 font-black text-xs uppercase tracking-widest active:scale-95 disabled:opacity-30">{loading ? '...' : '⚔️'}</button>
      </div>
    </div>
  );
};

export default CampaignView;
