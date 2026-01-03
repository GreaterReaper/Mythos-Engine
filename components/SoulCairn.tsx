
import React, { useState } from 'react';
import { Graveyard } from '../types';

interface SoulCairnProps {
  graveyard: Graveyard;
  onRestore: (type: keyof Graveyard, id: string) => void;
  onPurge: (type: keyof Graveyard, id: string) => void;
}

const SoulCairn: React.FC<SoulCairnProps> = ({ graveyard, onRestore, onPurge }) => {
  const [activeType, setActiveType] = useState<keyof Graveyard>('characters');

  const getIcon = (type: string) => {
    switch(type) {
      case 'characters': return '👤';
      case 'classes': return '📜';
      case 'monsters': return '🐉';
      case 'items': return '🛡️';
      default: return '✨';
    }
  };

  const list = graveyard[activeType];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-700">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-slate-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">The Soul Cairn</h2>
        <p className="text-slate-600 text-[10px] uppercase tracking-[0.5em] mt-2 font-black">Severed legends anchored in the spectral mist</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-center gap-2">
          {(Object.keys(graveyard) as Array<keyof Graveyard>).map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border transition-all rounded-sm flex items-center gap-2 ${activeType === type ? 'bg-slate-800 border-slate-400 text-white shadow-[0_0_20px_rgba(148,163,184,0.3)]' : 'bg-black border-slate-900 text-slate-700 hover:text-slate-400'}`}
            >
              <span>{getIcon(type)}</span>
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.length === 0 ? (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-900 opacity-20">
              <span className="text-4xl">🕯️</span>
              <p className="text-[10px] uppercase font-black tracking-widest mt-4">No souls drift in the mist...</p>
            </div>
          ) : (
            list.map((entity: any) => (
              <div key={entity.id} className="grim-card p-6 border-slate-900 border-2 rounded-sm bg-black/40 flex justify-between items-center group hover:border-slate-500/30 transition-all">
                <div className="text-left">
                  <h4 className="text-lg font-black fantasy-font text-slate-300 uppercase tracking-widest">{entity.name}</h4>
                  <p className="text-[7px] text-slate-600 uppercase font-black tracking-widest mt-1">Severed: {new Date(entity.deletedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onRestore(activeType, entity.id)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-[8px] font-black uppercase tracking-widest border border-slate-600 active:scale-95"
                  >
                    Resurrect
                  </button>
                  <button 
                    onClick={() => onPurge(activeType, entity.id)}
                    className="bg-black hover:bg-red-950/20 text-red-900 px-4 py-2 text-[8px] font-black uppercase tracking-widest border border-red-900/20 active:scale-95"
                  >
                    Purge
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SoulCairn;
