
import React from 'react';

interface DiceTrayProps {
  onRoll: (dice: string, result: number) => void;
  username: string;
}

const DiceTray: React.FC<DiceTrayProps> = ({ onRoll, username }) => {
  const dice = [
    { label: 'd4', sides: 4 },
    { label: 'd6', sides: 6 },
    { label: 'd8', sides: 8 },
    { label: 'd10', sides: 10 },
    { label: 'd12', sides: 12 },
    { label: 'd20', sides: 20 },
    { label: 'd100', sides: 100 },
  ];

  const handleRoll = (sides: number, label: string) => {
    const result = Math.floor(Math.random() * sides) + 1;
    onRoll(label, result);
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-black/60 border-t border-red-900/30 overflow-x-auto no-scrollbar">
      {dice.map((d) => (
        <button
          key={d.label}
          onClick={() => handleRoll(d.sides, d.label)}
          className="flex-1 min-w-[55px] md:min-w-[70px] py-2 md:py-3 border border-red-900/50 hover:bg-red-900/20 hover:border-gold text-[10px] md:text-xs font-cinzel text-gold transition-all active:scale-95 flex flex-col items-center justify-center bg-black/80 shadow-inner group"
        >
          <span className="opacity-60 font-black group-hover:opacity-100 transition-opacity">{d.label.toUpperCase()}</span>
          <svg className="w-4 h-4 mt-1 text-red-900 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10l8 4m8-4V7l-8-4L4 7m8 4v10M4 7l8 4m0 0l8-4" />
          </svg>
        </button>
      ))}
    </div>
  );
};

export default DiceTray;
