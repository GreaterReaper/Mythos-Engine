import React, { useState, useMemo } from 'react';
import { MapToken, Character, Monster } from '../types';

const GRID_SIZE = 20;

interface TacticalMapProps {
  tokens: MapToken[];
  onUpdateTokens: (tokens: MapToken[]) => void;
  compact?: boolean;
  characters?: Character[];
  monsters?: Monster[];
}

const TacticalMap: React.FC<TacticalMapProps> = ({ 
  tokens, 
  onUpdateTokens, 
  compact = false, 
  characters = [], 
  monsters = [] 
}) => {
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  
  // Use a smaller grid for compact mode (e.g. preview)
  const currentGridSize = compact ? 10 : GRID_SIZE;
  const tileSize = compact ? 30 : 45;

  const handleTileClick = (x: number, y: number) => {
    if (selectedTokenId) {
      onUpdateTokens(tokens.map(t => t.id === selectedTokenId ? { ...t, x, y } : t));
      setSelectedTokenId(null);
    }
  };

  // Helper to find unit data (HP/Stats) for a token
  const getUnitData = (token: MapToken) => {
    if (token.type === 'Hero') {
      return characters.find(c => c.id === token.id || c.name === token.name);
    }
    if (token.type === 'Enemy') {
      return monsters.find(m => m.id === token.id || m.name === token.name);
    }
    return null;
  };

  const selectedToken = useMemo(() => tokens.find(t => t.id === selectedTokenId), [tokens, selectedTokenId]);
  const selectedUnit = useMemo(() => selectedToken ? getUnitData(selectedToken) : null, [selectedToken, characters, monsters]);

  return (
    <div className={`flex flex-col lg:flex-row gap-6 animate-in fade-in duration-700 ${compact ? 'max-w-full' : 'pb-24'}`}>
      
      {/* Main Grid Area */}
      <div className="flex-1 space-y-4">
        {!compact && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-red-900/30 pb-4">
            <div>
              <h2 className="text-4xl font-cinzel text-gold font-black tracking-tighter">Command Center</h2>
              <p className="text-[10px] text-red-900 uppercase font-black tracking-[0.3em] mt-1 opacity-70">Aetheric Battlefield Projection</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-black/40 border border-gold/20 px-3 py-1.5 rounded-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                  <span className="text-[9px] font-bold text-blue-500 uppercase">Bonded</span>
                  <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626] ml-2" />
                  <span className="text-[9px] font-bold text-red-600 uppercase">Horrors</span>
               </div>
               <button 
                onClick={() => onUpdateTokens(tokens.map(t => ({ ...t, x: 0, y: 0 })))}
                className="px-4 py-2 border border-red-900 text-red-900 text-[9px] font-black uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all active:scale-95"
              >
                Reset Positions
              </button>
            </div>
          </div>
        )}

        <div className={`relative overflow-auto border-4 border-red-950 bg-[#0c0a09] shadow-[0_0_50px_rgba(0,0,0,1)] rounded-sm custom-scrollbar ${compact ? 'h-[280px]' : 'h-[650px]'}`}>
          {/* Subtle Grid Pattern Overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#991b1b 1px, transparent 1px)', backgroundSize: '45px 45px' }} />
          
          <div 
            className="grid gap-0 bg-red-950/20" 
            style={{ 
              gridTemplateColumns: `repeat(${currentGridSize}, ${tileSize}px)`,
              width: currentGridSize * tileSize,
              height: currentGridSize * tileSize
            }}
          >
            {Array.from({ length: currentGridSize * currentGridSize }).map((_, i) => {
              const x = i % currentGridSize;
              const y = Math.floor(i / currentGridSize);
              const token = tokens.find(t => t.x === x && t.y === y);
              
              return (
                <div 
                  key={i} 
                  onClick={() => handleTileClick(x, y)}
                  style={{ width: tileSize, height: tileSize }}
                  className={`border border-red-900/10 relative transition-all cursor-crosshair hover:bg-gold/5 ${selectedTokenId ? 'hover:bg-amber-900/20' : ''}`}
                >
                  {token && (
                    <div 
                      onClick={(e) => { e.stopPropagation(); setSelectedTokenId(token.id); }}
                      className={`absolute inset-1.5 rounded-sm border-2 ${token.color} flex items-center justify-center font-cinzel text-white bg-black shadow-[0_0_15px_rgba(0,0,0,0.8)] z-10 transition-transform ${selectedTokenId === token.id ? 'scale-110 ring-2 ring-gold shadow-[0_0_20px_#d4af37]' : 'hover:scale-105'}`}
                    >
                      <span className="text-xs font-black drop-shadow-md">{token.name[0]}</span>
                      
                      {/* Mini HP bar on token */}
                      {getUnitData(token) && (
                        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-black overflow-hidden rounded-full">
                           <div 
                            className={`h-full ${token.type === 'Hero' ? 'bg-blue-500' : 'bg-red-600'}`} 
                            style={{ 
                              width: `${((('currentHp' in getUnitData(token)!) ? (getUnitData(token) as Character).currentHp : (getUnitData(token) as Monster).hp) / (('maxHp' in getUnitData(token)!) ? (getUnitData(token) as Character).maxHp : (getUnitData(token) as Monster).hp)) * 100}%` 
                            }} 
                           />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Grid Coordinates (Subtle) */}
                  <span className="absolute bottom-0.5 right-1 text-[6px] text-red-900/20 font-mono pointer-events-none">{x},{y}</span>
                </div>
              );
            })}
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rune-border p-4 bg-black/60 backdrop-blur">
              <h4 className="text-[10px] font-cinzel text-gold font-black uppercase tracking-widest mb-2">Battlefield Intel</h4>
              <ul className="text-[10px] text-gray-500 space-y-2 font-medium">
                <li className="flex items-center gap-2"><span className="text-gold">●</span> Click a Soul to focus or move them across the grid.</li>
                <li className="flex items-center gap-2"><span className="text-gold">●</span> 1 Tile represents 5ft of reality. Shared in real-time.</li>
                <li className="flex items-center gap-2"><span className="text-gold">●</span> The Engine automatically updates health from the DM's Chronicle.</li>
              </ul>
            </div>
            {selectedToken && (
               <div className="rune-border p-4 bg-gold/5 border-gold/40 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-cinzel text-gold font-black uppercase tracking-widest">Focused Unit: {selectedToken.name}</h4>
                    <button onClick={() => setSelectedTokenId(null)} className="text-gold/40 hover:text-gold text-xs">×</button>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className={`w-10 h-10 border-2 ${selectedToken.color} bg-black flex items-center justify-center font-cinzel text-lg font-black`}>{selectedToken.name[0]}</div>
                    <div className="flex-1">
                       <p className="text-[9px] text-gray-400 uppercase font-bold italic mb-1">Awaiting relocation command...</p>
                       <div className="h-1 w-full bg-gold/10 rounded-full overflow-hidden">
                         <div className="h-full bg-gold animate-pulse" style={{ width: '100%' }} />
                       </div>
                    </div>
                  </div>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Combat Status Roster (Accessible UI element) */}
      {!compact && (
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="rune-border p-5 bg-black/80 border-red-900/40 min-h-[400px]">
            <div className="flex justify-between items-center border-b border-red-900/30 pb-3 mb-4">
              <h3 className="text-xs font-cinzel text-gold font-black uppercase tracking-[0.2em]">Unit Resonance</h3>
              <span className="text-[8px] bg-red-900 text-white px-2 py-0.5 rounded-sm font-black animate-pulse">LIVE</span>
            </div>
            
            <div className="space-y-4">
              {tokens.length === 0 && (
                <p className="text-[10px] text-gray-600 italic text-center py-20">The battlefield is silent.</p>
              )}
              
              {tokens.map(token => {
                const data = getUnitData(token);
                if (!data) return null;
                
                const curHp = ('currentHp' in data) ? (data as Character).currentHp : (data as Monster).hp;
                const maxHp = ('maxHp' in data) ? (data as Character).maxHp : (data as Monster).hp;
                const hpPercent = (curHp / maxHp) * 100;
                
                return (
                  <div 
                    key={token.id} 
                    onClick={() => setSelectedTokenId(token.id)}
                    className={`p-3 border transition-all cursor-pointer group ${selectedTokenId === token.id ? 'bg-gold/10 border-gold shadow-[0_0_15px_#d4af37]' : 'bg-red-950/5 border-red-900/20 hover:border-gold/40'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex gap-2 items-center min-w-0">
                          <div className={`w-6 h-6 border ${token.color} bg-black flex items-center justify-center font-cinzel text-[10px] font-black shrink-0`}>
                            {token.name[0]}
                          </div>
                          <span className={`text-[10px] font-cinzel font-black truncate uppercase ${token.type === 'Hero' ? 'text-blue-400' : 'text-red-500'}`}>
                            {token.name}
                          </span>
                       </div>
                       <span className="text-[8px] text-gray-500 font-bold font-mono">({token.x},{token.y})</span>
                    </div>
                    
                    <div className="space-y-1">
                       <div className="flex justify-between items-center text-[7px] font-black uppercase">
                          <span className="text-gray-500">Vitality</span>
                          <span className={hpPercent < 30 ? 'text-red-600 animate-pulse' : 'text-gray-300'}>{curHp} / {maxHp}</span>
                       </div>
                       <div className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden border border-white/5">
                         <div 
                           className={`h-full transition-all duration-1000 shadow-[0_0_8px] ${token.type === 'Hero' ? 'bg-blue-600 shadow-blue-900' : 'bg-red-700 shadow-red-900'}`} 
                           style={{ width: `${hpPercent}%` }} 
                         />
                       </div>
                    </div>
                    
                    {/* Status/Archetype subtext */}
                    <div className="mt-2 flex justify-between items-center">
                       <span className="text-[7px] text-gray-600 uppercase font-black tracking-tighter">
                         {('archetype' in data) ? (data as Character).archetype : (data as Monster).type}
                       </span>
                       {selectedTokenId === token.id && (
                         <span className="text-[7px] text-gold font-black uppercase animate-pulse">FOCUSED</span>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="p-4 bg-gold/5 border border-gold/20 rounded-sm">
             <p className="text-[9px] text-gold/60 uppercase font-black italic text-center">"Command the souls, arbitrate the end."</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalMap;