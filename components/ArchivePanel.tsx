
import React, { useRef, useState } from 'react';

interface ArchivePanelProps {
  data: any;
  onImport: (data: any) => void;
  manifestBasics?: () => void;
  onCloudSync?: (action: 'push' | 'pull') => void;
  onMigrationExport?: () => string;
  onMigrationImport?: (migrationString: string) => boolean;
  onFileExport?: () => void;
}

const ArchivePanel: React.FC<ArchivePanelProps> = ({ data, onImport, manifestBasics, onCloudSync, onMigrationExport, onMigrationImport, onFileExport }) => {
  const [status, setStatus] = useState<string | null>(null);
  const [migrationInput, setMigrationInput] = useState('');

  const handleExportMigration = () => {
    if (!onMigrationExport) return;
    const sigil = onMigrationExport();
    navigator.clipboard.writeText(sigil);
    setStatus("Soul Sigil copied to clipboard.");
    setTimeout(() => setStatus(null), 3000);
  };

  const handleImportMigration = () => {
    if (!onMigrationImport || !migrationInput) return;
    if (window.confirm("This will overwrite your current local soul with the imported one. Proceed?")) {
      const success = onMigrationImport(migrationInput);
      if (success) {
        setMigrationInput('');
        setStatus("Soul Migration successful.");
        setTimeout(() => setStatus(null), 3000);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 px-4 md:px-0">
      <div className="text-center pt-8">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Archive</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2 font-black">Preserve your sagas across the ether</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Soul Migration (Device Transfer) */}
        <div className="grim-card p-8 border-2 border-purple-900/40 flex flex-col items-stretch gap-6 rounded-sm shadow-2xl bg-purple-950/5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left flex-1">
              <h3 className="text-lg font-black fantasy-font text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <span>Soul Migration</span>
                <span className="text-[10px] bg-purple-900 text-white px-2 py-0.5 rounded-full">Device Transfer</span>
              </h3>
              <p className="text-[10px] text-neutral-400 uppercase tracking-widest leading-relaxed font-bold">
                Carry your entire soul (characters, classes, campaign logs) to another device.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <button
                onClick={onFileExport}
                className="bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40 py-4 px-8 text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
              >
                📜 Solidify Soul to Scroll
              </button>
              <button
                onClick={handleExportMigration}
                className="bg-purple-950/30 hover:bg-purple-900 border border-purple-400/40 py-3 text-[9px] font-black uppercase tracking-[0.4em] text-purple-400 transition-all active:scale-95"
              >
                Copy Sigil String 🔮
              </button>
            </div>
          </div>
          
          <div className="mt-4 border-t border-purple-900/20 pt-6">
            <label className="text-[8px] font-black text-purple-800 uppercase tracking-widest mb-2 block text-left">Restore from Sigil String</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                value={migrationInput} 
                onChange={(e) => setMigrationInput(e.target.value)}
                placeholder="PASTE SIGIL HERE..." 
                className="flex-1 bg-black border border-purple-900/30 p-4 text-[9px] font-mono text-purple-300 outline-none focus:border-purple-500 rounded-sm"
              />
              <button
                onClick={handleImportMigration}
                disabled={!migrationInput}
                className="w-full md:w-auto px-10 bg-purple-900/20 hover:bg-purple-800 border border-purple-500/50 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 transition-all disabled:opacity-20 active:scale-95"
              >
                Inscribe Sigil
              </button>
            </div>
          </div>
        </div>

        {/* Cloud Persistence */}
        <div className="grim-card p-8 border-2 border-amber-900/30 flex flex-col md:flex-row items-center justify-between gap-6 rounded-sm shadow-2xl bg-amber-950/10 opacity-70">
          <div className="space-y-3 text-center md:text-left flex-1">
            <h3 className="text-lg font-black fantasy-font text-amber-500 uppercase tracking-widest">Local Browser Sync</h3>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
              Backup progress within this specific browser. 
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button
              onClick={() => onCloudSync?.('push')}
              className="bg-amber-950/30 hover:bg-[#b28a48] hover:text-black border border-[#b28a48]/40 py-4 px-8 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] transition-all"
            >
              Backup ☁️
            </button>
            <button
              onClick={() => onCloudSync?.('pull')}
              className="bg-black hover:bg-neutral-800 border border-neutral-700 py-4 px-8 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-300 transition-all"
            >
              Restore 🌀
            </button>
          </div>
        </div>

        <div className="grim-card p-8 border-2 border-blue-900/20 flex flex-col md:flex-row items-center justify-between gap-6 rounded-sm shadow-2xl bg-blue-950/5">
          <div className="space-y-3 text-center md:text-left flex-1">
            <h3 className="text-lg font-black fantasy-font text-blue-400 uppercase tracking-widest">Starter Grimoire</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed font-bold">
              Manifest basic classes, monsters, and heroes.
            </p>
          </div>
          <button
            onClick={manifestBasics}
            className="w-full md:w-auto px-12 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-400/40 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 transition-all"
          >
            Inscribe Basics ✨
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
    </div>
  );
};

export default ArchivePanel;
