
import React, { useState, useMemo } from 'react';
import { MapToken, Character, Monster, StatusEffect } from '../types';

const GRID_SIZE = 20;
const MOVE_RANGE = 6; // Standard movement in tiles

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
  const [hoverTile, setHoverTile] = useState<{x: number, y: number} | null>(null);
  
  const currentGridSize = compact ? 10 : GRID_SIZE;
  const tileSize = compact ? 30 : 50; // Increased tile size for better readability

  const selectedToken = useMemo(() => tokens.find(t => t.id === selectedTokenId), [tokens, selectedTokenId]);

  const handleTileClick = (x: number, y: number) => {
    if (selectedTokenId) {
      onUpdateTokens(tokens.map(t => t.id === selectedTokenId ? { ...t, x, y } : t));
      setSelectedTokenId(null);
    }
  };

  const getUnitData = (token: MapToken) => {
    if (token.type === 'Hero') return characters.find(c => c.id === token.id || c.name === token.name);
    if (token.type === 'Enemy') return monsters.find(m => m.id === token.id || m.name === token.name);
    return null;
  };

  // Calculate distance between two points
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  };

  const isWithinRange = (x: number, y: number) => {
    if (!selectedToken) return false;
    return getDistance(selectedToken.x, selectedToken.y, x, y) <= MOVE_RANGE;
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-6 animate-in fade-in duration-700 ${compact ? 'max-w-full' : 'pb-24'}`}>
      <div className="flex-1 space-y-4">
        {!compact && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-emerald-900/30 pb-4">
            <div className="space-y-1">
              <h2 className="text-4xl font-cinzel text-gold font-black tracking-tighter">The Blood Field</h2>
              <p className="text-[10px] text-emerald-500 uppercase font-black tracking-[0.3em] opacity-70">Physical Presence Projection</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
               <div className="flex items-center gap-4 bg-black/60 border border-emerald-900/30 px-4 py-2 rounded-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                    <span className="text-[10px] font-black text-blue-500 uppercase">Vessel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-600 shadow-[0_0_8px_#059669]" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Horror</span>
                  </div>
               </div>
               <button onClick={() => onUpdateTokens(tokens.map(t => ({ ...t, x: 0, y: 0 })))} className="px-4 py-2 border-2 border-emerald-900 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-900 hover:text-white transition-all">Recall Units</button>
            </div>
          </div>
        )}

        <div className={`relative overflow-auto border-4 border-emerald-950 bg-[#0c0a09] shadow-[0_0_50px_rgba(0,0,0,1)] rounded-sm custom-scrollbar ${compact ? 'h-[280px]' : 'h-[650px]'}`}>
          <div 
            className="grid gap-0 bg-emerald-950/5 relative" 
            style={{ 
              gridTemplateColumns: `repeat(${currentGridSize}, ${tileSize}px)`, 
              width: currentGridSize * tileSize, 
              height: currentGridSize * tileSize,
              backgroundImage: 'radial-gradient(circle, #064e3b 1px, transparent 1px)',
              backgroundSize: `${tileSize}px ${tileSize}px`
            }}
            onMouseLeave={() => setHoverTile(null)}
          >
            {Array.from({ length: currentGridSize * currentGridSize }).map((_, i) => {
              const x = i % currentGridSize; 
              const y = Math.floor(i / currentGridSize);
              const token = tokens.find(t => t.x === x && t.y === y);
              const unitData = token ? getUnitData(token) : null;
              const inRange = isWithinRange(x, y);
              const isTargeted = hoverTile?.x === x && hoverTile?.y === y;

              return (
                <div 
                  key={i} 
                  onClick={() => handleTileClick(x, y)}
                  onMouseEnter={() => setHoverTile({x, y})}
                  style={{ width: tileSize, height: tileSize }} 
                  className={`border border-emerald-900/5 relative transition-all cursor-crosshair
                    ${selectedTokenId ? (inRange ? 'bg-emerald-500/5' : 'bg-black/40') : 'hover:bg-emerald-900/10'}
                    ${isTargeted && selectedTokenId ? 'ring-2 ring-inset ring-gold/40' : ''}
                  `}
                >
                  {/* Movement Range Highlight */}
                  {selectedTokenId && inRange && (
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none" />
                  )}

                  {/* Token Rendering */}
                  {token && (
                    <div 
                      onClick={(e) => { e.stopPropagation(); setSelectedTokenId(token.id === selectedTokenId ? null : token.id); }} 
                      className={`absolute inset-1.5 rounded-sm border-2 ${token.color} flex flex-col items-center justify-center bg-black shadow-[0_0_15px_rgba(0,0,0,0.8)] z-10 transition-all
                        ${selectedTokenId === token.id ? 'scale-110 ring-4 ring-gold/50 shadow-gold/20' : 'hover:scale-105'}
                      `}
                    >
                      <span className="text-sm font-black text-white drop-shadow-md font-cinzel">{token.name[0]}</span>
                      
                      {/* Integrated HP Bar */}
                      {unitData && (
                        <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-black overflow-hidden rounded-full border border-black">
                           <div 
                             className={`h-full transition-all duration-500 ${token.type === 'Hero' ? 'bg-blue-500' : 'bg-emerald-600'} 
                               ${(('currentHp' in unitData) ? unitData.currentHp / unitData.maxHp : 1) < 0.25 ? 'animate-pulse bg-red-600' : ''}
                             `} 
                             style={{ width: `${((('currentHp' in unitData!) ? (unitData as Character).currentHp : (unitData as Monster).hp) / (('maxHp' in unitData!) ? (unitData as Character).maxHp : (unitData as Monster).hp)) * 100}%` }} 
                           />
                        </div>
                      )}

                      {/* Name Plate on selection/hover */}
                      {(selectedTokenId === token.id || (hoverTile?.x === x && hoverTile?.y === y)) && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black border border-gold/40 px-2 py-0.5 whitespace-nowrap z-50 pointer-events-none rounded shadow-2xl">
                           <p className="text-[9px] font-black text-gold font-cinzel uppercase tracking-tighter">{token.name}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tile Coordinates (Faded) */}
                  {!compact && <span className="absolute bottom-0.5 right-1 text-[7px] text-emerald-900/10 font-mono pointer-events-none">{x},{y}</span>}
                </div>
              );
            })}

            {/* Distance Ruler SVG Layer */}
            {selectedToken && hoverTile && (
              <svg className="absolute inset-0 pointer-events-none z-20 w-full h-full">
                <line 
                  x1={selectedToken.x * tileSize + tileSize/2} 
                  y1={selectedToken.y * tileSize + tileSize/2} 
                  x2={hoverTile.x * tileSize + tileSize/2} 
                  y2={hoverTile.y * tileSize + tileSize/2} 
                  stroke="rgba(212, 175, 55, 0.4)" 
                  strokeWidth="2" 
                  strokeDasharray="4"
                />
                <foreignObject 
                  x={hoverTile.x * tileSize + 5} 
                  y={hoverTile.y * tileSize - 25} 
                  width="60" 
                  height="20"
                >
                  <div className="text-[10px] font-black text-gold font-mono bg-black/80 px-1 rounded border border-gold/20">
                    {getDistance(selectedToken.x, selectedToken.y, hoverTile.x, hoverTile.y) * 5}ft
                  </div>
                </foreignObject>
              </svg>
            )}
          </div>
        </div>

        {/* Tactical Guidance Footer */}
        {!compact && (
          <div className="p-4 bg-emerald-950/10 border border-emerald-900/30 rounded flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4">
               <div className="p-2 bg-emerald-900/20 rounded border border-emerald-900/40">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
               </div>
               <div>
                  <p className="text-[10px] font-black text-gold font-cinzel uppercase tracking-widest">Tactical Intuition</p>
                  <p className="text-[9px] text-gray-400 italic">"Click a Vessel to focus, then click a tile to shift thy physical presence. Range is marked in spectral green."</p>
               </div>
             </div>
             <div className="flex gap-4">
                <div className="text-center">
                   <p className="text-[8px] text-emerald-700 font-black uppercase">Grid Scale</p>
                   <p className="text-[10px] text-white font-mono">1 Tile = 5ft</p>
                </div>
                <div className="text-center">
                   <p className="text-[8px] text-emerald-700 font-black uppercase">Max Reach</p>
                   <p className="text-[10px] text-white font-mono">30ft (6 Tiles)</p>
                </div>
             </div>
          </div>
        )}
      </div>

      {!compact && (
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="rune-border p-5 bg-black/80 border-emerald-900/40 min-h-[400px]">
            <div className="flex justify-between items-center border-b border-emerald-900/30 pb-3 mb-4">
              <h3 className="text-xs font-cinzel text-gold font-black uppercase tracking-[0.2em]">Presence List</h3>
              <span className="text-[8px] bg-emerald-900 text-white px-2 py-0.5 rounded-sm font-black animate-pulse">DETECTING</span>
            </div>
            <div className="space-y-4">
              {tokens.map(token => {
                const data = getUnitData(token); if (!data) return null;
                const curHp = ('currentHp' in data) ? (data as Character).currentHp : (data as Monster).hp;
                const maxHp = ('maxHp' in data) ? (data as Character).maxHp : (data as Monster).hp;
                const isSelected = selectedTokenId === token.id;
                
                return (
                  <div 
                    key={token.id} 
                    onClick={() => setSelectedTokenId(isSelected ? null : token.id)} 
                    className={`p-3 border transition-all cursor-pointer group flex flex-col gap-2 rounded-sm
                      ${isSelected ? 'bg-gold/10 border-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'bg-emerald-950/5 border-emerald-900/20 hover:border-gold/30'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                       <p className={`text-[10px] font-cinzel font-black uppercase transition-colors ${token.type === 'Hero' ? (isSelected ? 'text-gold' : 'text-blue-400') : (isSelected ? 'text-gold' : 'text-emerald-500')}`}>
                         {token.name}
                       </p>
                       <span className="text-[8px] font-mono text-gray-500">{token.x},{token.y}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-gray-600 uppercase">Vitality</span>
                        <span className="text-[9px] font-mono text-white">{curHp}/{maxHp}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full transition-all duration-1000 ${token.type === 'Hero' ? 'bg-blue-600' : 'bg-emerald-700'}`} 
                          style={{ width: `${(curHp / maxHp) * 100}%` }} 
                        />
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-1 pt-1 border-t border-gold/10 animate-in fade-in slide-in-from-top-1 duration-300">
                         <p className="text-[8px] text-gold uppercase font-black italic">Focused Vessel</p>
                      </div>
                    )}
                  </div>
                );
              })}
              {tokens.length === 0 && (
                <div className="py-10 text-center opacity-30">
                   <p className="text-[10px] font-cinzel text-gray-500 uppercase tracking-widest italic">No souls manifest here.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-gold/5 border border-gold/20 rounded-sm">
             <h4 className="text-[9px] font-cinzel text-gold font-black uppercase mb-2 tracking-widest">Terrain Rules</h4>
             <ul className="space-y-2">
                <li className="flex items-start gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1 shrink-0" />
                   <p className="text-[9px] text-gray-400 leading-relaxed">Vessels cannot overlap physical space.</p>
                </li>
                <li className="flex items-start gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1 shrink-0" />
                   <p className="text-[9px] text-gray-400 leading-relaxed">Diagonal movement consumes equal effort as cardinal.</p>
                </li>
             </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalMap;
