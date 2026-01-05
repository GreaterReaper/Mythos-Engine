
import React, { useState } from 'react';

const GRID_SIZE = 20;

const TacticalMap: React.FC = () => {
  const [tokens, setTokens] = useState<any[]>([
    { id: 'player-1', name: 'Hero', x: 2, y: 2, color: 'border-blue-500' },
    { id: 'enemy-1', name: 'Orc', x: 8, y: 8, color: 'border-red-500' }
  ]);

  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  const handleTileClick = (x: number, y: number) => {
    if (selectedToken) {
      setTokens(prev => prev.map(t => t.id === selectedToken ? { ...t, x, y } : t));
      setSelectedToken(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-cinzel text-gold">Tactical Grid</h2>
        <div className="text-xs font-cinzel text-red-900 flex items-center gap-4">
          <span>1 Tile = 5ft</span>
          <button className="px-3 py-1 border border-red-900 hover:bg-red-900/20 transition-all">Reset Position</button>
        </div>
      </div>

      <div className="relative overflow-auto border-2 border-[#a16207]/30 bg-black/80 shadow-2xl shadow-black rounded shadow-inner">
        <div 
          className="grid gap-[1px] bg-red-900/20" 
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 40px)` }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);
            const token = tokens.find(t => t.x === x && t.y === y);
            
            return (
              <div 
                key={i} 
                onClick={() => handleTileClick(x, y)}
                className={`w-10 h-10 border border-red-900/10 relative transition-all cursor-pointer hover:bg-white/5 ${selectedToken ? 'hover:bg-amber-900/20' : ''}`}
              >
                {token && (
                  <div 
                    onClick={(e) => { e.stopPropagation(); setSelectedToken(token.id); }}
                    className={`absolute inset-1 rounded-full border-2 ${token.color} flex items-center justify-center text-[10px] font-cinzel text-white bg-black/60 shadow-lg ${selectedToken === token.id ? 'scale-110 ring-2 ring-white animate-pulse' : ''}`}
                  >
                    {token.name[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 rune-border bg-black/60 backdrop-blur">
        <h4 className="font-cinzel text-[#a16207] mb-2">Controls</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Click a token to select it.</li>
          <li>• Click an empty tile to move the selected token.</li>
          <li>• Drag to scroll map on mobile.</li>
        </ul>
      </div>
    </div>
  );
};

export default TacticalMap;
