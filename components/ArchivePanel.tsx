
import React, { useRef, useState } from 'react';

interface ArchivePanelProps {
  data: any;
  onImport: (data: any) => void;
}

const ArchivePanel: React.FC<ArchivePanelProps> = ({ data, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

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
        setStatus('Import Successful');
        setTimeout(() => setStatus(null), 3000);
      } catch (err) {
        setStatus('Invalid Archive File');
        setTimeout(() => setStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">The Archive</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Restore your sagas across time and space</p>
      </div>

      <div className="grim-card p-8 border-2 border-[#b28a48]/20 relative flex justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <h3 className="text-lg font-black fantasy-font text-neutral-300">Restore Grimoire</h3>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
            Upload a previously exported Mythos archive to restore your entire library on this device. <span className="text-red-900 font-bold block mt-2 uppercase">Warning: This will overwrite existing data.</span>
          </p>
          <button
            onClick={handleImportClick}
            className="w-full bg-black border border-neutral-800 hover:border-[#b28a48] py-5 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400 hover:text-[#b28a48] transition-all shadow-lg"
          >
            Upload Archive File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".json"
          />
        </div>

        {status && (
          <div className="absolute -bottom-12 left-0 right-0 text-center animate-bounce">
            <span className="text-[10px] font-black text-[#b28a48] uppercase tracking-widest bg-black px-4 py-2 border border-[#b28a48]/20">
              {status}
            </span>
          </div>
        )}
      </div>

      <div className="mt-20 p-6 border-t border-[#1a1a1a] text-center">
        <p className="text-[9px] text-neutral-700 italic uppercase tracking-widest">
          The Archive is for restoring legacy fragments. Local storage remains the primary vessel for current sagas.
        </p>
      </div>
    </div>
  );
};

export default ArchivePanel;
