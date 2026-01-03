
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
    { id: 'campaign', label: 'Play', icon: '⚔️' },
    { id: 'characters', label: 'Party', icon: '👤' },
    { id: 'classes', label: 'Classes', icon: '📜' },
    { id: 'spells', label: 'Spells', icon: '✨' },
    { id: 'rules', label: 'Laws', icon: '⚖️' },
    { id: 'bestiary', label: 'Beasts', icon: '🐉' },
    { id: 'armory', label: 'Gear', icon: '🛡️' },
    { id: 'profile', label: 'Soul', icon: '🆔' },
    { id: 'multiplayer', label: 'Portal', icon: '🌀' },
    { id: 'archive', label: 'Archive', icon: '📦' },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      ></div>

      {/* Main Sidebar Container */}
      <nav className={`
        fixed inset-y-0 left-0 z-[120] bg-[#080808] border-r border-[#1a1a1a] flex flex-col transition-all duration-300
        ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* Header / Brand */}
        <div className={`mb-8 flex flex-col items-center pt-8 px-4 transition-all duration-300 overflow-hidden`}>
          <div className="flex items-center justify-center w-full relative mb-4">
             {!collapsed && (
                <h1 className="text-3xl font-black tracking-[0.2em] text-[#b28a48] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in fade-in duration-500">MYTHOS</h1>
             )}
             {collapsed && (
                <div className="text-2xl font-black text-[#b28a48] animate-in zoom-in duration-300">M</div>
             )}
             
             {/* Desktop Collapse Toggle */}
             <button 
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-black border border-[#1a1a1a] items-center justify-center rounded-full text-[#b28a48] hover:text-white transition-all z-20"
             >
                <span className="text-[10px] transform transition-transform duration-300" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ◀
                </span>
             </button>
          </div>
          
          {!collapsed && (
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#b28a48] to-transparent mx-auto mt-2 opacity-50"></div>
          )}
          
          {/* User Profile Summary */}
          {!collapsed && (
            <div className="mt-6 w-full p-4 bg-black/40 border border-[#b28a48]/10 rounded-sm relative overflow-hidden group animate-in slide-in-from-top-4 duration-500">
              <div className="text-left">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest">Active Soul</p>
                  {user.isAdmin && (
                    <span className="text-[7px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded-sm tracking-tighter animate-pulse">
                      ARCHITECT
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-black text-[#b28a48] uppercase truncate">{user.displayName}</h4>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[7px] text-neutral-700 font-mono">SIGIL: {user.username}</p>
                  {onlineFriends.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-[7px] text-green-700 font-black">{onlineFriends.length}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden flex-1 px-2 pb-12">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={collapsed ? tab.label : ''}
                className={`flex items-center gap-4 px-4 py-3 rounded-sm transition-all relative group h-12 w-full
                  ${isActive
                    ? 'bg-gradient-to-r from-[#1a1a1a] to-transparent text-[#b28a48] border-l-2 border-[#b28a48]'
                    : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900/50'
                  }
                `}
              >
                <span className={`text-xl transition-transform duration-300 group-hover:scale-110 shrink-0 ${isActive ? 'grayscale-0' : 'grayscale'}`}>
                  {tab.icon}
                </span>
                {(!collapsed || mobileOpen) && (
                  <span className="font-bold text-[11px] uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                    {tab.label}
                  </span>
                )}
                {isActive && !collapsed && (
                  <div className="absolute right-4 w-1 h-1 bg-[#b28a48] rounded-full shadow-[0_0_8px_#b28a48]"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto flex flex-col gap-1 p-2 border-t border-[#1a1a1a]">
          <button
            onClick={onSignOut}
            className={`flex items-center gap-4 px-4 py-4 text-red-900/60 hover:text-red-500 hover:bg-red-950/10 transition-all group rounded-sm
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Sever Bond' : ''}
          >
            <span className="text-xl group-hover:scale-110 transition-transform shrink-0">🚪</span>
            {(!collapsed || mobileOpen) && (
              <span className="font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">Sever Bond</span>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Sticky Mini-Header (Optional if resonance header handles it) */}
      <div className="lg:hidden fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
         {/* Floating buttons could go here */}
      </div>
    </>
  );
};

export default Sidebar;
