
import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userAccount: {
    username: string;
    friends: { id: string; name: string; active: boolean }[];
  };
  multiplayer: {
    isHost: boolean;
    connectedPeers: string[];
  };
  showTactics?: boolean;
  isKeyboardOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userAccount, multiplayer, showTactics, isKeyboardOpen }) => {
  const [collapsed, setCollapsed] = React.useState(false);

  const tabs = [
    { id: 'Tavern', label: 'Hearth', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'Fellowship', label: 'Souls', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'Chronicles', label: 'Quest', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'Tactics', label: 'Grid', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', hidden: !showTactics },
    { id: 'Archetypes', label: 'Paths', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'Bestiary', label: 'Bestiary', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: 'Armory', label: 'Armory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'Alchemy', label: 'Alchemy', icon: 'M19.423 15.641a7 7 0 00-2.344-2.344V4.005c0-1.1-.9-2-2-2H8.923c-1.1 0-2 .9-2 2v9.292a7 7 0 00-2.344 2.344 7 7 1014.844 0zM12.923 4.005v3h-2v-3h2z' },
    { id: 'Spells', label: 'Grimoire', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
    { id: 'Nexus', label: 'Nexus', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { id: 'Rules', label: 'Laws', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];

  return (
    <>
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-[#0c0a09]/98 backdrop-blur-xl border-t-2 border-emerald-900/60 flex justify-start items-center px-2 py-2 pb-safe z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.8)] overflow-x-auto no-scrollbar transition-transform duration-300 ${isKeyboardOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        {tabs.filter(t => !t.hidden).map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1.5 min-w-[72px] px-1 py-1 rounded-lg transition-all duration-300 ${
                isActive ? 'scale-110 bg-emerald-900/10' : 'opacity-60 grayscale'
              }`}
            >
              <div className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-emerald-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : ''}`}>
                <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 1.5} d={tab.icon} />
                </svg>
              </div>
              <span className={`text-[9px] font-cinzel font-bold tracking-tighter uppercase leading-none ${isActive ? 'text-gold' : 'text-emerald-900/40'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <nav className={`hidden md:flex ${collapsed ? 'w-18' : 'w-72'} transition-all duration-500 bg-[#0c0a09] border-r-2 border-emerald-900/40 flex flex-col z-50 shrink-0 shadow-2xl`}>
        <div className="p-6 border-b border-emerald-900/30 flex items-center justify-between bg-black/20">
          {!collapsed && <h1 className="text-2xl font-cinzel font-black text-gold drop-shadow-lg tracking-widest truncate">MYTHOS</h1>}
          <button onClick={() => setCollapsed(!collapsed)} className="w-8 h-8 flex items-center justify-center rounded border border-emerald-900/30 text-gold hover:bg-emerald-900/20 transition-all">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar bg-black/10">
          <div className="px-3 space-y-2">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              if (tab.hidden) return null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-5 py-4 rounded transition-all duration-300 ${
                    isActive 
                    ? 'bg-emerald-900/80 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-gold/20' 
                    : 'text-emerald-900/60 hover:bg-emerald-950/20 hover:text-emerald-500'
                  }`}
                >
                  <svg className={`w-6 h-6 shrink-0 ${isActive ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {!collapsed && <span className="ml-5 font-cinzel text-xs font-bold tracking-[0.2em] truncate uppercase">{tab.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 border-t border-emerald-900/30 bg-black/60">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded shadow-inner border-2 flex items-center justify-center text-sm font-black transition-all ${
              multiplayer.connectedPeers.length > 0 ? 'bg-emerald-900/30 border-emerald-500 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-black/80 border-gold text-gold'
            }`}>
              {userAccount.username[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-black text-gold truncate uppercase tracking-tighter">{userAccount.username}</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-2 h-2 rounded-full ${multiplayer.connectedPeers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-900 animate-ping'}`} />
                   <p className="text-[9px] text-emerald-500/60 font-bold uppercase">{multiplayer.isHost ? 'ENGINE HOST' : 'BOUND SOUL'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
