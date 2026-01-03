
import React, { useState } from 'react';
import { CampaignState, Rule, SyncMessage, UserAccount } from '../types';
import { generateRules } from '../services/gemini';

interface RulesManifestProps {
  user: UserAccount;
  campaign: CampaignState;
  setCampaign: React.Dispatch<React.SetStateAction<CampaignState>>;
  notify: (msg: string, type?: any) => void;
  isHost: boolean;
  reservoirReady: boolean;
  broadcast: (msg: Partial<SyncMessage>) => void;
  setActiveTab: (tab: any) => void;
}

const RulesManifest: React.FC<RulesManifestProps> = ({ user, campaign, setCampaign, notify, isHost, reservoirReady, broadcast, setActiveTab }) => {
  const [loading, setLoading] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customContent, setCustomContent] = useState('');

  const isAdmin = user.isAdmin === true;

  const handleManifestRules = async () => {
    if (!isAdmin) {
      notify("Only an Architect can reweave the fundamental laws.", "error");
      return;
    }
    if (!reservoirReady || loading) return;
    setLoading(true);
    try {
      const generated = await generateRules(campaign.plot);
      setCampaign(prev => ({ ...prev, rules: generated }));
      broadcast({ type: 'STATE_UPDATE', payload: { campaign: { ...campaign, rules: generated } } });
      notify("Laws of the Realm Synchronized.", "success");
    } catch (error: any) {
      notify(error.message || "Failed to manifest rules.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    if (!isAdmin) return;
    if (!customName || !customContent) return;
    const newRule: Rule = {
      id: Math.random().toString(36).substr(2, 9),
      category: customCategory || 'General',
      name: customName,
      content: customContent
    };
    const updatedRules = [...campaign.rules, newRule];
    setCampaign(prev => ({ ...prev, rules: updatedRules }));
    broadcast({ type: 'STATE_UPDATE', payload: { campaign: { ...campaign, rules: updatedRules } } });
    setCustomName(''); setCustomCategory(''); setCustomContent('');
    notify("Rule inscribed into the Codex.", "success");
  };

  const deleteRule = (id: string) => {
    if (!isAdmin) return;
    const updatedRules = campaign.rules.filter(r => r.id !== id);
    setCampaign(prev => ({ ...prev, rules: updatedRules }));
    broadcast({ type: 'STATE_UPDATE', payload: { campaign: { ...campaign, rules: updatedRules } } });
    notify("Law abolished.", "info");
  };

  return (
    <div className="space-y-8 md:space-y-12 pb-24 pt-16 px-4 md:px-0 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-[#b28a48]/20 pb-8">
        <button 
          onClick={() => setActiveTab('campaign')}
          className="bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800 px-4 py-2 text-[10px] font-black text-[#b28a48] uppercase tracking-[0.4em] transition-all flex items-center gap-2 group rounded-sm shadow-xl"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Saga
        </button>
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-black fantasy-font text-[#b28a48] drop-shadow-[0_2px_10px_rgba(178,138,72,0.3)]">Laws of the Realm</h2>
          <p className="text-neutral-500 text-[10px] md:text-xs uppercase tracking-[0.4em] mt-2 font-black">Fundamental Mechanics & Balanced Constraints</p>
        </div>
        <div className="hidden md:block w-[180px]"></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Left Sidebar: Architect Tools */}
        {isAdmin && (
          <div className="w-full lg:w-80 space-y-8 shrink-0 animate-in slide-in-from-left duration-500">
            <div className="grim-card p-6 border-2 border-amber-500/30 rounded-sm shadow-2xl bg-black">
              <div className="flex items-center justify-between mb-6 border-b border-amber-900/30 pb-2">
                <h3 className="text-sm font-black fantasy-font text-amber-500 uppercase tracking-widest">Architect Codex</h3>
                <span className="text-[7px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 border border-amber-500/30 rounded-sm">ADMIN</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest text-left block">Law Title</label>
                  <input 
                    value={customName} 
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Mortal Fatigue..." 
                    className="w-full bg-black border border-neutral-800 p-3 text-xs uppercase tracking-widest text-amber-500 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest text-left block">Category</label>
                  <input 
                    value={customCategory} 
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Combat, Social..." 
                    className="w-full bg-black border border-neutral-800 p-3 text-xs uppercase tracking-widest text-neutral-500 outline-none focus:border-neutral-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest text-left block">Mechanical Text</label>
                  <textarea 
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    placeholder="Define the mechanical constraints precisely..." 
                    className="w-full bg-black border border-neutral-900 p-4 h-40 text-xs text-neutral-400 outline-none font-serif italic focus:border-neutral-700 resize-none"
                  />
                </div>
                <button 
                  onClick={handleAddRule}
                  disabled={!customName || !customContent}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-black py-4 font-black text-[10px] uppercase tracking-[0.3em] disabled:opacity-20 transition-all shadow-xl active:scale-95 rounded-sm"
                >
                  Inscribe New Law
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-amber-900/20">
                <button 
                  onClick={handleManifestRules}
                  disabled={loading || !reservoirReady}
                  className="w-full bg-neutral-950 border border-amber-950/20 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-amber-700 hover:text-amber-500 hover:bg-black transition-all flex flex-col items-center gap-1 group rounded-sm"
                >
                  {loading ? 'REWEAVING REALITY...' : (
                    <>
                      <span className="group-hover:animate-pulse">Generate Balanced Laws</span>
                      <span className="text-[7px] opacity-40">[-20⚡ ESSENCE]</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content: The Rules */}
        <div className="flex-1 w-full space-y-8">
          {campaign.rules.length === 0 ? (
            <div className="py-24 px-8 text-center bg-black/40 border-2 border-dashed border-[#b28a48]/10 rounded-sm flex flex-col items-center justify-center min-h-[400px]">
               <div className="text-6xl mb-6 opacity-40 drop-shadow-[0_0_20px_rgba(178,138,72,0.2)]">⚖️</div>
               <h3 className="text-xl font-black fantasy-font text-[#b28a48] mb-4 uppercase tracking-[0.2em]">The Codex is Empty</h3>
               <p className="text-xs md:text-sm text-neutral-500 max-w-md font-serif italic leading-relaxed mb-10">
                 {isAdmin 
                   ? "No laws have been inscribed for this realm. As an Architect, you can manifest fundamental balanced laws or craft custom mechanics."
                   : "The Architect has not yet manifest the laws of this chronicle. Consult with your party leader to establish the rules of engagement."
                 }
               </p>
               
               {isAdmin && (
                 <button 
                   onClick={handleManifestRules}
                   disabled={loading || !reservoirReady}
                   className="bg-amber-950/20 border-2 border-[#b28a48] hover:bg-[#b28a48] text-[#b28a48] hover:text-black px-12 py-5 text-xs font-black uppercase tracking-[0.5em] transition-all shadow-[0_0_30px_rgba(178,138,72,0.1)] active:scale-95 disabled:opacity-20"
                 >
                   {loading ? 'REWEAVING REALITY...' : 'MANIFEST BALANCED LAWS'}
                 </button>
               )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:gap-8">
              {campaign.rules.map(rule => (
                <div key={rule.id} className="grim-card p-6 md:p-10 border-neutral-900 border-2 rounded-sm text-left group hover:border-[#b28a48]/40 transition-all shadow-2xl relative overflow-hidden">
                   {/* Rule Background Motif */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-[#b28a48]/5 rotate-45 translate-x-16 -translate-y-16 pointer-events-none"></div>
                   
                   <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 relative z-10">
                      <div>
                        <span className="text-[9px] font-black text-amber-800 uppercase tracking-[0.4em] block mb-2">{rule.category || 'GENERAL LAW'}</span>
                        <h3 className="text-2xl md:text-3xl font-black fantasy-font text-[#b28a48] tracking-widest drop-shadow-sm">{rule.name}</h3>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => deleteRule(rule.id)} 
                          className="bg-red-950/10 border border-red-900/20 hover:border-red-600 hover:text-red-500 text-red-900 px-3 py-1.5 transition-all text-[9px] font-black uppercase tracking-widest rounded-sm"
                        >
                          Abolish Law
                        </button>
                      )}
                   </div>
                   <div className="relative z-10">
                     <p className="text-sm md:text-lg text-neutral-300 font-serif leading-relaxed italic whitespace-pre-wrap border-l-2 border-[#b28a48]/20 pl-6 py-2">
                       {rule.content}
                     </p>
                   </div>
                </div>
              ))}
              
              <div className="pt-12 text-center opacity-30">
                 <div className="h-px w-24 bg-[#b28a48] mx-auto mb-4"></div>
                 <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.8em]">End of Manifested Laws</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RulesManifest;
