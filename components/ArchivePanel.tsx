import React, { useRef, useState } from 'react';

interface ArchivePanelProps {
  data: any;
  onImport: (data: any) => void;
  manifestBasics?: () => void;
}

const ArchivePanel: React.FC<ArchivePanelProps> = ({ data, onImport, manifestBasics }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = () => {
    const grimoireData = JSON.stringify(data, null, 2);
    const blob = new Blob([grimoireData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mythos_Archive_${data.playerName || 'Soul'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setStatus('Archive Manifested');
    setTimeout(() => setStatus(null), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        onImport(importedData);
        setStatus('Grimoire Restored');
        setTimeout(() => setStatus(null), 3000);
      } catch (err) {
        setStatus('Arcane Corruption in File');
        setTimeout(() => setStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-24 px-4 md:px-0">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Archive</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Preserve your sagas across the ether</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="grim-card p-8 border-2 border-[#b28a48]/20 flex flex-col justify-between rounded-sm">
          <div className="space-y-6 text-center">
            <h3 className="text-lg font-black fantasy-font text-[#b28a48]">Manifest Archive</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
              Extract your entire grimoire (characters, items, monsters, and sagas) into a portable relic file for safekeeping.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="mt-8 w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] hover:border-[#b28a48] transition-all shadow-xl"
          >
            Export Relic File
          </button>
        </div>

        <div className="grim-card p-8 border-2 border-red-950/20 flex flex-col justify-between rounded-sm">
          <div className="space-y-6 text-center">
            <h3 className="text-lg font-black fantasy-font text-red-900/60">Restore Grimoire</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
              Sacrifice your current local grimoire to restore an archive from a previous manifestation. <span className="text-red-950 font-black block mt-2">Warning: All current data will be lost.</span>
            </p>
          </div>
          <button
            onClick={handleImportClick}
            className="mt-8 w-full bg-black border border-neutral-900 hover:border-[#b28a48] py-5 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 hover:text-[#b28a48] transition-all"
          >
            Restore Archive
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".json"
          />
        </div>

        <div className="grim-card p-8 border-2 border-blue-900/20 md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6 rounded-sm">
          <div className="space-y-3 text-center md:text-left flex-1">
            <h3 className="text-lg font-black fantasy-font text-blue-400">Starter Grimoire</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
              New to the realm? Manifest a basic set of standard classes, items, monsters, and heroes (Miri, Seris, Lina) to begin your saga immediately.
            </p>
          </div>
          <button
            onClick={manifestBasics}
            className="w-full md:w-auto px-12 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-400/40 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 transition-all shadow-xl whitespace-nowrap"
          >
            Inscribe Basics
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
        <p className="text-[9px] text-neutral-700 italic uppercase tracking-widest">
          Chronicles are transient; manifest often to prevent eternal loss.
        </p>
      </div>
    </div>
  );
};

export default ArchivePanel;