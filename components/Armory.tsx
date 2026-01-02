import React, { useState, useMemo } from 'react';
import { Item, ItemMechanic, SyncMessage, UserAccount } from '../types';
import { generateItemMechanics, generateImage, rerollTraits, generateItemMechanicsList, getArchitectAdvice } from '../services/gemini';

interface ArmoryProps {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  broadcast?: (msg: Partial<SyncMessage>) => void;
  notify: (message: string, type?: any) => void;
  reservoirReady: boolean;
  manifestBasics?: (scope: 'items') => void;
  currentUser: UserAccount;
}

const Armory: React.FC<ArmoryProps> = ({ items, setItems, broadcast, notify, reservoirReady, manifestBasics, currentUser }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Weapon' | 'Armor'>('Weapon');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'type'>('name');

  // Admin Manual Fields
  const [manualMode, setManualMode] = useState(false);
  const [manualLore, setManualLore] = useState('');
  const [pendingMechanics, setPendingMechanics] = useState<ItemMechanic[]>([]);
  const [suggestingMechanics, setSuggestingMechanics] = useState(false);
  const [advice, setAdvice] = useState<string[]>([]);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const filteredItems = useMemo(() => {
    return items
      .filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'All' || i.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'type') return a.type.localeCompare(b.type);
        return 0;
      });
  }, [items, search, typeFilter, sortBy]);

  const handleFetchAdvice = async () => {
    if (!name || !description || loadingAdvice) return;
    setLoadingAdvice(true);
    try {
      const guidance = await getArchitectAdvice('item', name, description);
      setAdvice(guidance);
    } catch (e) {
      notify("Architect guidance failed to manifest.", "error");
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !description || loading) return;
    if (!manualMode && !reservoirReady && !currentUser.isAdmin) return;

    setLoading(true);
    try {
      let mechanics;
      let lore = '';
      let imageUrl = '';

      if (manualMode && currentUser.isAdmin) {
        mechanics = pendingMechanics;
        lore = manualLore || description;
      } else {
        const result = await generateItemMechanics(name, type, description);
        mechanics = result.mechanics || [];
        lore = result.lore || description;
        imageUrl = await generateImage(`Full-frame cinematic fantasy portrait of a legendary ${type} called "${name}". Appearance: ${description}. Dark moody lighting, high texture, obsidian and gold accents.`);
      }
      
      const newItem: Item = {
        id: Math.random().toString(36).substr(2, 9),
        name, type, description,
        mechanics: (mechanics).map((m: any) => ({ ...m, locked: false })),
        lore: lore,
        imageUrl
      };
      setItems(prev => [...prev, newItem]);
      setName('');
      setDescription('');
      setManualLore('');
      setAdvice([]);
      setPendingMechanics([]);
      setExpandedId(newItem.id);
      notify(`${name} forged.`, "success");
    } catch (e: any) {
      console.error(e);
      notify(e.message || "The forge failed to create the relic.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestMechanics = async () => {
    if (!name || !description || suggestingMechanics) return;
    setSuggestingMechanics(true);
    try {
      const suggested = await generateItemMechanicsList(name, type, description);
      setPendingMechanics(prev => [...prev, ...suggested]);
      notify("Arcane properties manifest.", "success");
    } catch (e) {
      notify("The ether failed to respond.", "error");
    } finally {
      setSuggestingMechanics(false);
    }
  };

  const handleRegenerateMissingImages = async () => {
    if ((!reservoirReady && !currentUser.isAdmin) || loading) return;
    setLoading(true);
    notify("Forging Visual Relics for the Armory...", "info");
    const list = [...items];
    let count = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        if (!list[i].imageUrl) {
          const img = await generateImage(`Full-frame cinematic fantasy portrait of a legendary ${list[i].type} called "${list[i].name}". Lore: ${list[i].description}. Obsidian and gold accents.`);
          list[i] = { ...list[i], imageUrl: img };
          setItems([...list]);
          count++;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      notify(`Visualized ${count} relics.`, "success");
    } catch (e) {
      notify("Ether interference stopped relic manifestation.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSingleImage = async (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    if ((!reservoirReady && !currentUser.isAdmin) || loading) return;
    setLoading(true);
    try {
      const img = await generateImage(`Full-frame cinematic fantasy portrait of a legendary ${item.type} called "${item.name}". Lore: ${item.description}. Obsidian and gold accents.`);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, imageUrl: img } : i));
      notify(`Sigil for ${item.name} manifest.`, "success");
    } catch (e) {
      notify("Failed to reweave sigil.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = (itemId: string, mechIdx: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newMechanics = [...item.mechanics];
      newMechanics[mechIdx] = { ...newMechanics[mechIdx], locked: !newMechanics[mechIdx].locked };
      return { ...item, mechanics: newMechanics };
    }));
  };

  const handleReroll = async (item: Item) => {
    if (!reservoirReady && !currentUser.isAdmin) return;
    setRerolling(item.id);
    try {
      const updated = await rerollTraits('item', item.name, item.description, item.mechanics);
      setItems(prev => prev.map(i => {
        if (i.id !== item.id) return i;
        let updateIdx = 0;
        const finalMergedMechanics = i.mechanics.map(original => {
          if (original.locked) return original;
          const replacement = updated[updateIdx];
          updateIdx++;
          return replacement ? { ...replacement, locked: false } : original;
        });
        return { ...i, mechanics: finalMergedMechanics };
      }));
      notify("Arcane properties rewoven.", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setRerolling(null);
    }
  };

  const handleShareIndividual = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    if (broadcast) {
      broadcast({
        type: 'SHARE_RESOURCE',
        payload: {
          resourceType: 'item',
          resourceData: item
        }
      });
      notify(`Shared Relic: ${item.name}`, 'success');
    } else {
      notify("Portal link not active.", "error");
    }
  };

  const handleDelete = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    if (window.confirm(`Are you certain you want to banish "${item.name}"?`)) {
      setItems(prev => prev.filter(x => x.id !== item.id));
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-[#b28a48]/20 pb-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black fantasy-font text-[#b28a48] tracking-widest">Royal Armory</h2>
          <p className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black mt-2">Relics of Power & Protection</p>
        </div>
        
        <div className="flex gap-2">
           <button 
            onClick={handleRegenerateMissingImages}
            disabled={loading || (!reservoirReady && !currentUser.isAdmin)}
            className="bg-blue-950/20 border border-blue-500/30 hover:border-blue-500 text-blue-400 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-3 active:scale-95"
           >
            <span className="text-sm">🖼️</span>
            Manifest Visuals
           </button>
           <button 
            onClick={() => manifestBasics && manifestBasics('items')}
            className="bg-blue-950/20 border border-blue-500/30 hover:border-blue-500 text-blue-400 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-3 active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
           >
            <span className="animate-pulse">✨</span>
            Manifest Relics
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black fantasy-font text-neutral-300 uppercase">Forge Relic</h3>
              {currentUser.isAdmin && (
                <button 
                  onClick={() => setManualMode(!manualMode)}
                  className={`text-[8px] px-2 py-1 border font-black uppercase transition-all ${manualMode ? 'bg-blue-500 text-black border-blue-500' : 'text-neutral-600 border-neutral-800 hover:text-white'}`}
                >
                  {manualMode ? 'Manual Mode ON' : 'AI Mode'}
                </button>
              )}
            </div>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest text-left block">Artifact Name</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="RELIC NAME..." 
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest text-left block">Relic Category</label>
                <div className="relative">
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value as any)} 
                    className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-[10px] text-neutral-400 uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-[#b28a48]"
                  >
                    <option value="Weapon">Weapon</option>
                    <option value="Armor">Armor</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-neutral-600 font-black">▼</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest text-left block">Appearance & Myth</label>
                  {currentUser.isAdmin && (
                    <button 
                      onClick={handleFetchAdvice}
                      disabled={loadingAdvice || !name || !description}
                      className="text-[8px] font-black text-blue-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all"
                    >
                      <span>{loadingAdvice ? 'Analyzing...' : '⚖️ Balance Insight'}</span>
                    </button>
                  )}
                </div>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="DESCRIBE THE ARTIFACT'S LEGEND..." 
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 h-32 text-xs text-neutral-500 focus:border-[#b28a48] outline-none font-serif italic leading-relaxed shadow-inner" 
                />
              </div>

              {advice.length > 0 && (
                <div className="bg-blue-950/10 border border-blue-900/30 p-4 rounded-sm animate-in fade-in slide-in-from-top-2 text-left">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-900/20 pb-1">Artisan's Guidance</p>
                  <ul className="space-y-2">
                    {advice.map((point, i) => (
                      <li key={i} className="text-[10px] text-neutral-300 font-serif italic leading-relaxed flex gap-2">
                        <span className="text-blue-600">•</span> {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {manualMode && currentUser.isAdmin && (
                <div className="space-y-4 text-left animate-in fade-in slide-in-from-top-2 bg-black/40 p-4 border border-blue-900/20 rounded-sm">
                  <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest block mb-1">Architect: Manual Forging</p>
                  <div>
                    <label className="text-[7px] text-neutral-500 font-black uppercase block mb-1">Custom Lore (Admin)</label>
                    <textarea 
                      value={manualLore} 
                      onChange={(e) => setManualLore(e.target.value)} 
                      placeholder="Enter final lore text..." 
                      className="w-full bg-black border border-neutral-800 rounded-sm px-3 py-2 h-20 text-[9px] text-neutral-300 outline-none" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[7px] text-neutral-500 font-black uppercase">Pending Mechanics</label>
                      <button 
                        onClick={handleSuggestMechanics}
                        disabled={suggestingMechanics || !name || !description}
                        className="text-[7px] font-black text-blue-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all"
                      >
                        <span>{suggestingMechanics ? 'Channeling...' : '✨ Suggest Mechanics'}</span>
                      </button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                      {pendingMechanics.map((m, i) => (
                        <div key={i} className="bg-black/40 p-2 border border-neutral-900 rounded-sm group relative">
                          <p className="text-[8px] font-black text-blue-400 uppercase">{m.name}</p>
                          <p className="text-[7px] text-neutral-500 font-serif italic">{m.description}</p>
                          <button onClick={() => setPendingMechanics(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-900 hover:text-red-500 text-[8px]">✕</button>
                        </div>
                      ))}
                      {pendingMechanics.length === 0 && <p className="text-[7px] italic text-neutral-700 text-center py-2">No mechanics suggested</p>}
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleCreate} 
                disabled={loading || !name || (!manualMode && !reservoirReady && !currentUser.isAdmin)} 
                className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 text-[#b28a48] py-5 text-[11px] font-black uppercase tracking-[0.4em] transition-all disabled:opacity-20 shadow-xl active:scale-95 flex flex-col items-center gap-1"
              >
                {loading ? 'BINDING RELIC...' : (manualMode ? 'FORGE MANUALLY' : (
                  <>
                    <span>FORGE RELIC</span>
                    <span className="text-[8px] opacity-70 uppercase tracking-widest">{currentUser.isAdmin ? '[∞ ARCHITECT]' : '[-10⚡ ESSENCE]'}</span>
                  </>
                ))}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <input 
              type="text" 
              placeholder="Search Royal Armory..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="flex-1 min-w-[200px] bg-black border border-neutral-900 px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none rounded-sm" 
            />
            <div className="flex gap-2">
              {['All', 'Weapon', 'Armor'].map(f => (
                <button 
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest border transition-all rounded-sm ${typeFilter === f ? 'bg-[#b28a48] border-[#b28a48] text-black' : 'bg-black border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {filteredItems.length === 0 ? (
               <div className="py-24 px-8 text-center bg-black/40 border-2 border-dashed border-[#b28a48]/10 rounded-sm flex flex-col items-center justify-center min-h-[400px]">
                  <div className="text-6xl mb-6 opacity-30">🛡️</div>
                  <h3 className="text-xl font-black fantasy-font text-neutral-600 mb-4 uppercase tracking-[0.2em]">The Vault is Empty</h3>
                  <p className="text-xs text-neutral-500 max-w-sm font-serif italic mb-8">
                    No relics have been forged or manifest in this chronicle yet.
                  </p>
                  <button 
                    onClick={() => manifestBasics && manifestBasics('items')}
                    className="bg-blue-950/20 border-2 border-blue-500/50 hover:bg-blue-500 text-blue-400 hover:text-white px-12 py-5 text-xs font-black uppercase tracking-[0.5em] transition-all shadow-[0_0_30px_rgba(59,130,246,0.1)] active:scale-95"
                  >
                    Manifest Relic Archive
                  </button>
               </div>
            ) : filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className={`grim-card group transition-all duration-500 border-2 cursor-pointer rounded-sm overflow-hidden ${expandedId === item.id ? 'border-[#b28a48]/60 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'border-neutral-900 hover:border-neutral-800'}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className={`h-48 md:h-auto md:w-56 relative grayscale group-hover:grayscale-0 transition-all duration-700 overflow-hidden flex-shrink-0 ${expandedId === item.id ? 'grayscale-0' : ''}`}>
                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-110" alt={item.name} onError={(e) => e.currentTarget.style.display = 'none'} /> : <div className="w-full h-full bg-black flex items-center justify-center text-4xl opacity-20">⚔️</div>}
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div className="text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <h4 className="text-2xl md:text-3xl font-black fantasy-font text-[#b28a48] tracking-widest">{item.name}</h4>
                          {item.id.startsWith('sys') && <span className="text-[7px] font-black text-neutral-400 bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded-sm tracking-[0.2em] uppercase opacity-60">System</span>}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => handleShareIndividual(e, item)}
                            className="text-neutral-700 hover:text-green-500 transition-colors p-2 text-xl"
                            title="Share Relic through Portal"
                          >
                            🌀
                          </button>
                          <button onClick={(e) => handleDelete(e, item)} className="text-neutral-800 hover:text-red-500 transition-colors p-2 text-xl">🗑️</button>
                        </div>
                      </div>
                      <p className="text-[9px] text-amber-900 uppercase tracking-[0.4em] font-black mb-3">{item.type}</p>
                      <p className={`text-sm md:text-base text-neutral-400 font-serif italic leading-relaxed ${expandedId === item.id ? '' : 'line-clamp-2'}`}>{item.description}</p>
                    </div>
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="p-8 md:p-12 border-t border-neutral-900 bg-black/40 space-y-12 animate-in slide-in-from-top-2 duration-500">
                    <div className="flex justify-end">
                        <button 
                           onClick={(e) => handleRegenerateSingleImage(e, item)}
                           disabled={loading || (!reservoirReady && !currentUser.isAdmin)}
                           className="text-[8px] font-black text-neutral-500 hover:text-[#b28a48] uppercase tracking-widest flex items-center gap-2 transition-all"
                        >
                           <span>Regenerate Sigil 🖼️</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-left">
                      <div className="space-y-6">
                        <h5 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] border-b border-neutral-900 pb-2">Ancient Lore</h5>
                        <p className="text-sm md:text-base text-neutral-400 font-serif italic leading-relaxed whitespace-pre-wrap">{item.lore}</p>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                          <h5 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em]">Arcane Properties</h5>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleReroll(item); }}
                            disabled={rerolling === item.id || (!reservoirReady && !currentUser.isAdmin)}
                            className="text-[9px] font-black text-[#b28a48] hover:text-[#cbb07a] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-20"
                          >
                            {rerolling === item.id ? 'REWEAVING...' : <span>Reroll Properties 🎲</span>}
                          </button>
                        </div>
                        <div className="space-y-3">
                          {item.mechanics.map((mech, i) => (
                            <div 
                              key={i}
                              onClick={(e) => { e.stopPropagation(); toggleLock(item.id, i); }}
                              className={`p-6 border rounded-sm transition-all cursor-pointer relative group/mech ${mech.locked ? 'bg-amber-950/5 border-amber-900/40 shadow-inner' : 'bg-black/60 border-neutral-900 hover:border-neutral-700'}`}
                            >
                              <div className="flex items-start gap-4">
                                <span className={`text-xl mt-0.5 transition-colors ${mech.locked ? 'text-amber-600' : 'text-neutral-800'}`}>{mech.locked ? '†' : '○'}</span>
                                <div>
                                  <h6 className={`text-sm font-black uppercase tracking-wider mb-1 ${mech.locked ? 'text-amber-600' : 'text-[#b28a48]'}`}>{mech.name}</h6>
                                  <p className="text-xs md:text-sm text-neutral-400 italic font-serif leading-relaxed">{mech.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Armory;