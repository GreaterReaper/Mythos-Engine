
import React, { useRef, useState } from 'react';

interface ArchivePanelProps {
  data: any;
  onImport: (data: any) => void;
}

const ArchivePanel: React.FC<ArchivePanelProps> = ({ data, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mythos_archive_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus('Export Complete');
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
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Preserve your sagas across time and space</p>
      </div>

      <div className="grim-card p-8 border-2 border-[#b28a48]/20 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-black fantasy-font text-neutral-300">Preserve Grimoire</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
              Export all your characters, custom classes, unique monsters, armory items, and current campaign logs into a single arcane file.
            </p>
            <button
              onClick={handleExport}
              className="w-full bg-[#1a1a1a] hover:bg-[#b28a48] hover:text-black border border-[#b28a48]/30 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#b28a48] transition-all shadow-lg"
            >
              Export JSON Archive
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black fantasy-font text-neutral-300">Restore Grimoire</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
              Upload a previously exported Mythos archive to restore your entire library on this device. <span className="text-red-900 font-bold">Warning: This will overwrite existing data.</span>
            </p>
            <button
              onClick={handleImportClick}
              className="w-full bg-black border border-neutral-800 hover:border-[#b28a48] py-4 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400 hover:text-[#b28a48] transition-all shadow-lg"
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
          Archives are stored locally in the grimoire's physical form. Transfer them manually between devices.
        </p>
      </div>
    </div>
  );
};

export default ArchivePanel;
