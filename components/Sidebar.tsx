
import React from 'react';
import { UserAccount } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onSignOut: () => void;
  user: UserAccount;
  onlineFriends?: string[];
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onSignOut, 
  user, 
  onlineFriends = [],
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const tabs = [
    { id: 'campaign', label: 'Chronicle', icon: '⚔️' },
    { id: 'characters', label: 'Fellowship', icon: '👤' },
    { id: 'classes', label: 'Archetypes', icon: '📜' },
    { id: 'spells', label: 'Grimoire', icon: '✨' },
    { id: 'rules', label: 'Laws', icon: '⚖️' },
    { id: 'bestiary', label: 'Bestiary', icon: '🐉' },
    { id: 'armory', label: 'Armory', icon: '🛡️' },
    { id: 'soul-cairn', label: 'Soul Cairn', icon: '👻' },
    { id: 'profile', label: 'Your Soul', icon: '🆔' },
    { id: 'multiplayer', label: 'Portal', icon: '🌀' },
    { id: 'archive', label: 'Archive', icon: '📦' },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      ></div>

      {/* Sidebar Container */}
      <nav className={`
        fixed inset-y-0 left-0 z-[120] bg-[#050505] border-r border-[#1a1a1a] flex flex-col transition-all duration-300 shadow-2xl
        ${mobileOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* Toggle Button Container */}
        <div className="p-4 md:p-6 border-b border-[#1a1a1a] flex items-center justify-between">
          {(!collapsed || mobileOpen) ? (
            <h1 className="text-xl font-black tracking-[0.2em] text-[#b28a48] fantasy-font truncate">MYTHOS</h1>
          ) : (
            <div className="text-xl font-black text-[#b28a48] mx-auto">M</div>
          )}
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-8 h-8 items-center justify-center text-[#b28a48] hover:text-white transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? '▶' : '◀'}
          </button>
          
          {/* Mobile Close Button */}
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-[#b28a48] p-2 text-2xl active:scale-90">✕</button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-custom space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={collapsed ? tab.label : ''}
                className={`flex items-center gap-5 px-6 py-4 transition-all relative group w-full text-left
                  ${isActive
                    ? 'bg-neutral-900/50 text-[#b28a48] border-l-4 border-[#b28a48]'
                    : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900/20 active:bg-neutral-900/40'
                  }
                `}
              >
                <span className="text-2xl md:text-xl shrink-0">{tab.icon}</span>
                {(!collapsed || mobileOpen) && (
                  <span className="font-bold text-[11px] md:text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">
                    {tab.label}
                  </span>
                )}
                {isActive && !collapsed && (
                   <span className="absolute right-4 text-[#b28a48]/40 animate-pulse">◈</span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Info & Footer */}
        <div className="p-4 md:p-6 border-t border-[#1a1a1a] bg-black/40">
          {(!collapsed || mobileOpen) && (
            <div className="mb-4 text-left px-2">
              <p className="text-[7px] text-neutral-600 font-black uppercase tracking-widest mb-1">Soul Identified</p>
              <p className="text-xs font-black text-[#b28a48] truncate">{user.displayName}</p>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="flex items-center gap-5 px-2 py-3 text-red-900/60 hover:text-red-500 active:scale-95 transition-all w-full"
            title={collapsed ? "Sever Bond" : ""}
          >
            <span className="text-2xl md:text-xl shrink-0">🚪</span>
            {(!collapsed || mobileOpen) && (
              <span className="font-bold text-[11px] md:text-[10px] uppercase tracking-widest">Sever Bond</span>
            )}
          </button>
        </div>
      </nav>

      <style>{`
        .scrollbar-custom::-webkit-scrollbar {
          width: 3px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(178, 138, 72, 0.1);
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(178, 138, 72, 0.3);
        }
      `}</style>
    </>
  );
};

export default Sidebar;
