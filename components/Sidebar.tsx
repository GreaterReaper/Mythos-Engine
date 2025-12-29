
import React, { useState, useEffect } from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const tabs = [
    { id: 'campaign', label: 'Play', icon: '⚔️' },
    { id: 'characters', label: 'Party', icon: '👤' },
    { id: 'classes', label: 'Classes', icon: '📜' },
    { id: 'bestiary', label: 'Bestiary', icon: '🐉' },
    { id: 'armory', label: 'Armory', icon: '🛡️' },
    { id: 'multiplayer', label: 'Portal', icon: '🌀' },
    { id: 'archive', label: 'Archive', icon: '📦' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex w-64 bg-[#080808] border-r border-[#1a1a1a] flex-col p-4 z-10 shadow-2xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-black tracking-[0.2em] text-[#b28a48] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">MYTHOS</h1>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#b28a48] to-transparent mx-auto mt-2 opacity-50"></div>
          <p className="text-[9px] text-neutral-600 uppercase tracking-widest mt-2 font-bold">Tales of Shadow & Steel</p>
        </div>

        <div className="flex flex-col gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-4 px-5 py-4 rounded-sm transition-all relative group ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#1a1a1a] to-transparent text-[#b28a48] border-l-2 border-[#b28a48]'
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${activeTab === tab.id ? 'grayscale-0' : 'grayscale'}`}>
                {tab.icon}
              </span>
              <span className="font-bold text-xs uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute right-4 w-1 h-1 bg-[#b28a48] rounded-full shadow-[0_0_8px_#b28a48]"></div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          {deferredPrompt && (
            <button 
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 py-3 border border-[#b28a48]/20 rounded-sm bg-[#b28a48]/5 hover:bg-[#b28a48]/10 text-[9px] font-black uppercase tracking-[0.2em] text-[#b28a48] transition-all"
            >
              <span>📥</span> BIND TO DEVICE
            </button>
          )}
          <div className="p-4 border-t border-[#1a1a1a]">
            <div className="flex items-center gap-2 text-[10px] text-neutral-600 uppercase font-bold tracking-tighter">
              <span className="w-2 h-2 rounded-full bg-amber-900 animate-pulse"></span>
              Mythos Engine Active
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080808] border-t border-[#1a1a1a] flex items-center justify-around px-2 py-3 backdrop-blur-md bg-opacity-95">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${
              activeTab === tab.id
                ? 'text-[#b28a48]'
                : 'text-neutral-600'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tight">{tab.label}</span>
          </button>
        ))}
        {deferredPrompt && (
          <button 
            onClick={handleInstall}
            className="flex flex-col items-center gap-1 flex-1 text-amber-600"
          >
            <span className="text-xl">📥</span>
            <span className="text-[9px] font-black uppercase tracking-tight">Bind</span>
          </button>
        )}
      </nav>
    </>
  );
};

export default Sidebar;
