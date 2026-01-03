
import React, { useRef, useState } from 'react';

interface ArchivePanelProps {
  data: any;
  onImport: (data: any) => void;
  manifestBasics?: () => void;
  onCloudSync?: (action: 'push' | 'pull') => void;
}

const ArchivePanel: React.FC<ArchivePanelProps> = ({ data, onImport, manifestBasics, onCloudSync }) => {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 px-4 md:px-0">
      <div className="text-center pt-8">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Archive</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2 font-black">Preserve your sagas across the ether</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Cloud Persistence */}
        <div className="grim-card p-8 border-2 border-[#b28a48]/30 flex flex-col md:flex-row items-center justify-between gap-6 rounded-sm shadow-2xl bg-amber-950/10">
          <div className="space-y-3 text-center md:text-left flex-1">
            <h3 className="text-lg font-black fantasy-font text-amber-500 uppercase tracking-widest">Cloud Sync (The Ether)</h3>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest leading-relaxed font-bold">
              Bind your saga to the global Ether using your sigil and 4-digit Arcane PIN. Access your chronicle from any device without the need for ancient file relics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button
              onClick={() => onCloudSync?.('push')}
              className="w-full md:w-auto px-10 bg-amber-950/30 hover:bg-[#b28a48] hover:text-black border border-[#b28a48]/40 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] transition-all shadow-xl whitespace-nowrap active:scale-95"
            >
              Sync to Ether ☁️
            </button>
            <button
              onClick={() => onCloudSync?.('pull')}
              className="w-full md:w-auto px-10 bg-black hover:bg-neutral-800 border border-neutral-700 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-300 transition-all shadow-xl whitespace-nowrap active:scale-95"
            >
              Restore from Ether 🌀
            </button>
          </div>
        </div>

        <div className="grim-card p-8 border-2 border-blue-900/20 flex flex-col md:flex-row items-center justify-between gap-6 rounded-sm shadow-2xl bg-blue-950/5">
          <div className="space-y-3 text-center md:text-left flex-1">
            <h3 className="text-lg font-black fantasy-font text-blue-400 uppercase tracking-widest">Starter Grimoire</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed font-bold">
              Manifest basic classes, items, monsters, and default heroes to begin your journey.
            </p>
          </div>
          <button
            onClick={manifestBasics}
            className="w-full md:w-auto px-12 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-400/40 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 transition-all shadow-xl whitespace-nowrap active:scale-95"
          >
            Inscribe Basics & Sigils ✨
          </button>
        </div>
      </div>

      {status && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] animate-bounce">
          <span className="text-[11px] font-black text-[#b28a48] uppercase tracking-[0.6em] bg-black/90 px-8 py-3 border border-[#b28a48]/30 shadow-[0_0_30px_rgba(178,138,72,0.2)]">
            {status}
          </span>
        </div>
      )}

      <div className="mt-20 p-6 border-t border-[#1a1a1a] text-center">
        <p className="text-[9px] text-neutral-700 italic uppercase tracking-widest font-black">
          Chronicles are transient; manifest often through the Ether to prevent eternal loss.
        </p>
      </div>
    </div>
  );
};

export default ArchivePanel;
