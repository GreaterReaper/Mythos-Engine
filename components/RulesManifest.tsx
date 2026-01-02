import React, { useState } from 'react';
import { CampaignState, Rule, SyncMessage } from '../types';
import { generateRules } from '../services/gemini';

interface RulesManifestProps {
  campaign: CampaignState;
  setCampaign: React.Dispatch<React.SetStateAction<CampaignState>>;
  notify: (msg: string, type?: any) => void;
  isHost: boolean;
  reservoirReady: boolean;
  broadcast: (msg: Partial<SyncMessage>) => void;
}

const RulesManifest: React.FC<RulesManifestProps> = ({ campaign, setCampaign, notify, isHost, reservoirReady, broadcast }) => {
  const [loading, setLoading] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customContent, setCustomContent] = useState('');

  const handleManifestRules = async () => {
    if (!reservoirReady || loading) return;
    setLoading(true);
    try {
      const generated = await generateRules(campaign.plot);
      setCampaign(prev => ({ ...prev, rules: generated }));
      broadcast({ type: 'STATE_UPDATE', payload: { campaign: { ...campaign, rules: generated } } });
      notify("Mechanics manifested from the ether.", "success");
    } catch (error: any) {
      notify(error.message || "Failed to manifest rules.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
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
    notify("Rule inscribed.", "success");
  };

  const deleteRule = (id: string) => {
    const updatedRules = campaign.rules.filter(r => r.id !== id);
    setCampaign(prev => ({ ...prev, rules: updatedRules }));
    broadcast({ type: 'STATE_UPDATE', payload: { campaign: { ...campaign, rules: updatedRules } } });
  };

  return (
    <div className="space-y-8 md:space-y-12 pb-12 pt-16 px-4 md:px-0">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Laws of the Realm</h2>
        <p className="text-neutral-600 text-[10px] md:text-xs uppercase tracking-[0.4em] mt-2 font-black">The Inscribed Mechanics of Your Saga</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">
        <div className="lg:w-1/3 space-y-8 order-2 lg:order-1">
          {isHost && (
            <div className="grim-card p-6 md:p-8 border-2 border-dashed border-[#b28a48]/20 rounded-sm">
              <h3 className="text-lg font-black fantasy-font text-neutral-300 mb-6">Inscribe Law</h3>
              <div className="space-y-4">
                <input 
                  value={customName} 
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="RULE NAME..." 
                  className="w-full bg-black border border-neutral-900 p-4 text-xs uppercase tracking-widest text-[#b28a48] outline-none"
                />
                <input 
                  value={customCategory} 
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="CATEGORY (Combat, Magic, etc)..." 
                  className="w-full bg-black border border-neutral-900 p-4 text-xs uppercase tracking-widest text-neutral-500 outline-none"
                />
                <textarea 
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="THE MECHANICAL LAW..." 
                  className="w-full bg-black border border-neutral-900 p-4 h-40 text-xs text-neutral-400 outline-none font-serif italic"
                />
                <button 
                  onClick={handleAddRule}
                  disabled={!customName || !customContent}
                  className="w-full bg-[#b28a48] text-black py-4 font-black text-[10px] uppercase tracking-widest disabled:opacity-20 transition-all"
                >
                  Inscribe
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-neutral-900">
                <button 
                  onClick={handleManifestRules}
                  disabled={loading || !reservoirReady}
                  className="w-full bg-neutral-900 border border-amber-950/40 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#b28a48] hover:bg-black transition-all flex flex-col items-center gap-1"
                >
                  {loading ? 'CHANNELING...' : (
                    <>
                      <span>Manifest Mechanics</span>
                      <span className="text-[7px] opacity-40">[-20⚡ ESSENCE]</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6 order-1 lg:order-2">
          {campaign.rules.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-neutral-900 opacity-20 flex flex-col items-center rounded-sm">
               <span className="text-4xl mb-4">⚖️</span>
               <p className="text-xs uppercase tracking-widest font-black px-4">No laws have been inscribed for this realm.</p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {campaign.rules.map(rule => (
                <div key={rule.id} className="grim-card p-6 md:p-8 border-neutral-900 border-2 rounded-sm text-left group hover:border-[#b28a48]/20 transition-all shadow-xl">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest block mb-1">{rule.category}</span>
                        <h3 className="text-xl md:text-2xl font-black fantasy-font text-[#b28a48] tracking-widest">{rule.name}</h3>
                      </div>
                      {isHost && (
                        <button onClick={() => deleteRule(rule.id)} className="text-neutral-800 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all text-[10px] font-black uppercase">Abolish</button>
                      )}
                   </div>
                   <p className="text-sm md:text-base text-neutral-400 font-serif leading-relaxed italic">{rule.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RulesManifest;