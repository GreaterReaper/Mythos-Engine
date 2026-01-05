
import React, { useState } from 'react';
import { MapToken } from '../types';

const GRID_SIZE = 20;

interface TacticalMapProps {
  tokens: MapToken[];
  onUpdateTokens: (tokens: MapToken[]) => void;
  compact?: boolean;
}

const TacticalMap: React.FC<TacticalMapProps> = ({ tokens, onUpdateTokens, compact = false }) => {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  
  // Use a smaller grid for compact mode
  const currentGridSize = compact ? 10 : GRID_SIZE;
  const tileSize = compact ? 30 : 40;

  const handleTileClick = (x: number, y: number) => {
    if (selectedToken) {
      onUpdateTokens(tokens.map(t => t.id === selectedToken ? { ...t, x, y } : t));
      setSelectedToken(null);
    }
  };

  return (
    <div className={`space-y-4 ${compact ? 'max-w-full' : ''}`}>
      {!compact && (
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-cinzel text-gold">Tactical Grid</h2>
          <div className="text-xs font-cinzel text-red-900 flex items-center gap-4">
            <span>1 Tile = 5ft</span>
            <button 
              onClick={() => onUpdateTokens(tokens.map(t => ({ ...t, x: 0, y: 0 })))}
              className="px-3 py-1 border border-red-900 hover:bg-red-900/20 transition-all"
            >
              Recall All
            </button>
          </div>
        </div>
      )}

      <div className={`relative overflow-auto border-2 border-[#a16207]/30 bg-black/80 shadow-2xl rounded shadow-inner custom-scrollbar ${compact ? 'h-[280px]' : ''}`}>
        <div 
          className="grid gap-[1px] bg-red-900/20" 
          style={{ gridTemplateColumns: `repeat(${currentGridSize}, ${tileSize}px)` }}
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
                className={`border border-red-900/10 relative transition-all cursor-pointer hover:bg-white/5 ${selectedToken ? 'hover:bg-amber-900/20' : ''}`}
              >
                {token && (
                  <div 
                    onClick={(e) => { e.stopPropagation(); setSelectedToken(token.id); }}
                    className={`absolute inset-1 rounded-full border-2 ${token.color} flex items-center justify-center font-cinzel text-white bg-black/60 shadow-lg ${selectedToken === token.id ? 'scale-110 ring-2 ring-white animate-pulse' : ''} ${compact ? 'text-[8px]' : 'text-[10px]'}`}
                  >
                    {token.name[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!compact && (
        <div className="p-4 rune-border bg-black/60 backdrop-blur">
          <h4 className="font-cinzel text-[#a16207] mb-2">Controls</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Click a token to select it.</li>
            <li>• Click an empty tile to move the selected token.</li>
            <li>• Tactical positioning is shared with all bonded souls.</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TacticalMap;
