
import React, { useState, useMemo } from 'react';
import { Item, ItemMechanic, SyncMessage } from '../types';
import { generateItemMechanics, generateImage, rerollTraits } from '../services/gemini';

interface ArmoryProps {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  broadcast?: (msg: Partial<SyncMessage>) => void;
  // Fix: Added notify prop to interface
  notify: (message: string, type?: any) => void;
}

const Armory: React.FC<ArmoryProps> = ({ items, setItems, broadcast, notify }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Weapon' | 'Armor'>('Weapon');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [regenImgId, setRegenImgId] = useState<string | null>(null);

  // Filter & Sort State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'type'>('name');

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

  const handleCreate = async () => {
    if (!name || !description || loading) return;
    setLoading(true);
    try {
      const [{ mechanics, lore }, imageUrl] = await Promise.all([
        generateItemMechanics(name, type, description),
        generateImage(`Full-frame cinematic fantasy portrait of a legendary ${type} called "${name}". Appearance: ${description}. Dark moody lighting, high texture, obsidian and gold accents, 8k resolution.`)
      ]);
      
      const newItem: Item = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        type,
        description,
        mechanics: (mechanics || []).map(m => ({ ...m, locked: false })),
        lore,
        imageUrl
      };
      setItems(prev => [...prev, newItem]);
      setName('');
      setDescription('');
      notify(`${name} forged successfully.`, "success");
    } catch (e: any) {
      console.error(e);
      // Fix: Added notify call for error reporting
      notify(e.message || "The forge failed to create the relic.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = async (item: Item) => {
    setRegenImgId(item.id);
    try {
      const newImg = await generateImage(`Full-frame cinematic fantasy portrait of a legendary ${item.type} called "${item.name}". Appearance: ${item.description}. Dark moody lighting, high texture, 8k resolution.`);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, imageUrl: newImg } : i));
      notify(`Vision for ${item.name} updated.`, "success");
    } catch (e: any) {
      console.error(e);
      // Fix: Added notify call for error reporting
      notify(e.message || "The vision failed to manifest.", "error");
    } finally {
      setRegenImgId(null);
    }
  };

  const handleShare = (item: Item) => {
    if (broadcast) {
      broadcast({ type: 'SHARE_RESOURCE', payload: { type: 'item', data: item } });
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
    setRerolling(item.id);
    try {
      const updated = await rerollTraits('item', item.name, item.description, item.mechanics);
      setItems(prev => prev.map(i => {
        if (i.id !== item.id) return i;
        return {
          ...i,
          mechanics: updated.map((u, idx) => ({ ...u, locked: item.mechanics[idx].locked }))
        };
      }));
      notify("Arcane properties rewoven.", "success");
    } catch (e: any) {
      console.error(e);
      // Fix: Added notify call for error reporting
      notify(e.message || "Failed to reweave arcane properties.", "error");
    } finally {
      setRerolling(null);
    }
  };

  const handleDelete = (item: Item) => {
    if (window.confirm(`Are you certain you wish to dismantle "${item.name}"? This action is permanent and will remove it from the royal records.`)) {
      setItems(prev => prev.filter(i => i.id !== item.id));
    }
  };

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Royal Armory</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Relics of Power & Protection</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4">
            <h3 className="text-lg font-black mb-6 fantasy-font text-neutral-300">Forge New Relic</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="NAME OF THE ARTIFACT..." 
                  className="w-full bg-black/50 border border-neutral-800 rounded-sm px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none" 
                />
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as any)} 
                  className="bg-black border border-neutral-800 rounded-sm px-4 py-3 text-[10px] text-neutral-400 uppercase tracking-widest outline-none focus:border-[#b28a48]"
                >
                  <option value="Weapon">Weapon</option>
                  <option value="Armor">Armor</option>
                </select>
              </div>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="DESCRIBE ITS FORM AND FUNCTION..." 
                className="w-full bg-black/50 border border-neutral-800 rounded-sm px-4 py-3 h-32 text-xs text-neutral-500 uppercase tracking-tight focus:border-[#b28a48] outline-none font-serif italic" 
              />
              <button 
                onClick={handleCreate} 
                disabled={loading || !name} 
                className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 text-[#b28a48] hover:border-[#b28a48] hover:text-[#cbb07a] transition-all font-black text-[10px] uppercase tracking-[0.3em] py-4 shadow-xl disabled:opacity-20"
              >
                {loading ? 'FORGING...' : 'FORGE RELIC'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="text" 
                placeholder="Search Armory..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none"
              />
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-neutral-900/50 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-400 outline-none"
            >
              <option value="All">All Types</option>
              <option value="Weapon">Weapons</option>
              <option value="Armor">Armor</option>
            </select>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-900/50 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-400 outline-none"
            >
              <option value="name">Sort: Name</option>
              <option value="type">Sort: Type</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {filteredItems.map(item => (
              <div key={item.id} className="grim-card flex flex-col group border-[#b28a48]/10 hover:border-[#b28a48]/40 transition-all duration-500">
                <div className="h-64 relative bg-black overflow-hidden">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      className={`w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ${regenImgId === item.id ? 'opacity-20' : 'opacity-70'}`} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-10">
                      {item.type === 'Weapon' ? '⚔️' : '🛡️'}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                  
                  <div className="absolute top-2 right-2 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300">
                    <button 
                      onClick={() => handleDelete(item)} 
                      className="p-2 bg-black/80 text-neutral-600 hover:text-red-500 border border-neutral-900 rounded-sm"
                    >
                      ✖️
                    </button>
                    <button 
                      onClick={() => handleRegenerateImage(item)}
                      disabled={regenImgId === item.id}
                      className="p-2 bg-black/80 text-neutral-600 hover:text-amber-500 border border-neutral-900 rounded-sm"
                    >
                      {regenImgId === item.id ? '...' : '🖼️'}
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4">
                    <h4 className="text-xl font-black fantasy-font text-[#b28a48] drop-shadow-md">{item.name}</h4>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">{item.type}</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600">Arcane Properties</span>
                    <button 
                      onClick={() => handleReroll(item)} 
                      disabled={rerolling === item.id} 
                      className="text-[9px] text-neutral-500 hover:text-[#b28a48] uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                      {rerolling === item.id ? '...' : 'Reroll 🎲'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {item.mechanics.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleLock(item.id, idx)} 
                          className={`text-[10px] transition-all ${m.locked ? 'text-amber-500 scale-110' : 'text-neutral-800 hover:text-neutral-600'}`}
                        >
                          {m.locked ? '🔒' : '🔓'}
                        </button>
                        <div className="flex-1 bg-black/40 p-2.5 rounded-sm border border-neutral-900 text-[10px] text-neutral-400 group/tooltip relative cursor-help">
                          <span className="font-bold text-neutral-300 uppercase tracking-tighter">{m.name}</span>
                          <div className="absolute bottom-full left-0 mb-3 w-64 p-3 bg-[#0a0a0a] border border-[#b28a48]/30 rounded-sm text-neutral-500 italic shadow-2xl invisible group-hover/tooltip:visible z-50 pointer-events-none transition-all duration-200">
                            <div className="text-[#b28a48] font-bold uppercase tracking-widest mb-1 text-[8px]">{m.name}</div>
                            {m.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center text-[10px] uppercase tracking-[0.5em] text-neutral-700">The Vault is empty...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Armory;
