
import React, { useState } from 'react';

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
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userAccount, multiplayer }) => {
  const [collapsed, setCollapsed] = useState(false);

  const tabs = [
    { id: 'Fellowship', label: 'Souls', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'Chronicles', label: 'Chronicles', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'Tactics', label: 'Tactics', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
    { id: 'Nexus', label: 'Nexus', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { id: 'Archetypes', label: 'Paths', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'Spells', label: 'Grimoire', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
    { id: 'Bestiary', label: 'Bestiary', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: 'Armory', label: 'Armory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'Rules', label: 'Laws', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0c0a09]/95 backdrop-blur-md border-t border-red-900/50 flex justify-around items-center px-1 py-3 z-[100] safe-area-bottom overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all min-w-[50px] ${
              activeTab === tab.id ? 'text-gold' : 'text-gray-500'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === tab.id ? 'mobile-nav-active' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="text-[7px] font-cinzel uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <nav className={`hidden md:flex ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 bg-[#0c0a09] border-r border-red-900 flex flex-col z-50 shrink-0`}>
        <div className="p-4 border-b border-red-900 flex items-center justify-between">
          {!collapsed && <h1 className="text-xl font-cinzel font-bold text-[#a16207] truncate">Mythos</h1>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-red-900 text-xs">
            {collapsed ? '>>' : '<<'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-3 transition-all ${
                activeTab === tab.id 
                ? 'bg-red-900/20 text-[#a16207] border-r-2 border-[#a16207]' 
                : 'text-[#d6d3d1] hover:bg-white/5'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {!collapsed && <span className="ml-3 font-cinzel text-xs tracking-widest truncate">{tab.label}</span>}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-red-900 bg-black/40">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
              multiplayer.connectedPeers.length > 0 ? 'bg-green-900/20 border-green-500 text-green-500' : 'bg-red-900 border-gold text-gold'
            }`}>
              {userAccount.username[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gold truncate uppercase">{userAccount.username}</p>
                <div className="flex items-center gap-1">
                   <div className={`w-1 h-1 rounded-full ${multiplayer.connectedPeers.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                   <p className="text-[8px] text-gray-500">{multiplayer.isHost ? 'ENGINE HOST' : 'BOUND SOUL'}</p>
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
