
import React from 'react';
import { UserAccount } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onSignOut: () => void;
  user: UserAccount;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onSignOut, user }) => {
  const tabs = [
    { id: 'campaign', label: 'Play', icon: '⚔️' },
    { id: 'characters', label: 'Party', icon: '👤' },
    { id: 'classes', label: 'Classes', icon: '📜' },
    { id: 'spells', label: 'Spells', icon: '✨' },
    { id: 'bestiary', label: 'Bestiary', icon: '🐉' },
    { id: 'armory', label: 'Armory', icon: '🛡️' },
    { id: 'rules', label: 'Rules', icon: '⚖️' },
    { id: 'multiplayer', label: 'Portal', icon: '🌀' },
    { id: 'archive', label: 'Archive', icon: '📦' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex w-64 bg-[#080808] border-r border-[#1a1a1a] flex-col p-4 z-10 shadow-2xl">
        <div className="mb-8 text-center px-4">
          <h1 className="text-3xl font-black tracking-[0.2em] text-[#b28a48] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">MYTHOS</h1>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#b28a48] to-transparent mx-auto mt-2 opacity-50"></div>
          
          <div className="mt-6 p-4 bg-black/40 border border-[#b28a48]/10 rounded-sm relative overflow-hidden group">
            <div className="text-left">
              <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest mb-1">Active Soul</p>
              <h4 className="text-xs font-black text-[#b28a48] uppercase truncate">{user.displayName}</h4>
              <p className="text-[7px] text-neutral-700 font-mono mt-1">SIGIL ID: {user.username}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-4 px-5 py-2.5 rounded-sm transition-all relative group ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#1a1a1a] to-transparent text-[#b28a48] border-l-2 border-[#b28a48]'
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${activeTab === tab.id ? 'grayscale-0' : 'grayscale'}`}>
                {tab.icon}
              </span>
              <span className="font-bold text-[11px] uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute right-4 w-1 h-1 bg-[#b28a48] rounded-full shadow-[0_0_8px_#b28a48]"></div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-1">
          <button
            onClick={onSignOut}
            className="flex items-center gap-4 px-5 py-3 text-red-900/60 hover:text-red-500 hover:bg-red-950/10 transition-all group border-t border-[#1a1a1a]"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">🚪</span>
            <span className="font-bold text-[10px] uppercase tracking-widest">Sever Bond</span>
          </button>
          <div className="p-4 border-t border-[#1a1a1a]">
            <div className="flex items-center gap-2 text-[10px] text-neutral-600 uppercase font-bold tracking-tighter">
              <span className="w-2 h-2 rounded-full bg-amber-900 animate-pulse"></span>
              Mythos Engine Online
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080808] border-t border-[#1a1a1a] flex items-center justify-around px-2 py-3 backdrop-blur-md bg-opacity-95 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${
              activeTab === tab.id
                ? 'text-[#b28a48]'
                : 'text-neutral-600'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tight">{tab.label}</span>
          </button>
        ))}
        <button
          onClick={onSignOut}
          className="flex flex-col items-center gap-1 min-w-[60px] text-red-900/60"
        >
          <span className="text-xl">🚪</span>
          <span className="text-[9px] font-black uppercase tracking-tight">Sever</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;