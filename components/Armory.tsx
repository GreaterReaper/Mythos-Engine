
import React, { useState, useMemo } from 'react';
import { Item, ItemMechanic, SyncMessage } from '../types';
import { generateItemMechanics, generateImage, rerollTraits } from '../services/gemini';

interface ArmoryProps {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  broadcast?: (msg: Partial<SyncMessage>) => void;
  notify: (message: string, type?: any) => void;
  reservoirReady: boolean;
}

const Armory: React.FC<ArmoryProps> = ({ items, setItems, broadcast, notify, reservoirReady }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Weapon' | 'Armor'>('Weapon');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    if (!name || !description || loading || !reservoirReady) return;
    setLoading(true);
    try {
      const [{ mechanics, lore }, imageUrl] = await Promise.all([
        generateItemMechanics(name, type, description),
        generateImage(`Full-frame cinematic fantasy portrait of a legendary ${type} called "${name}". Appearance: ${description}. Dark moody lighting, high texture, obsidian and gold accents.`)
      ]);
      
      const newItem: Item = {
        id: Math.random().toString(36).substr(2, 9),
        name, type, description,
        mechanics: (mechanics || []).map(m => ({ ...m, locked: false })),
        lore, imageUrl
      };
      setItems(prev => [...prev, newItem]);
      setName('');
      setDescription('');
      setExpandedId(newItem.id);
      notify(`${name} forged successfully.`, "success");
    } catch (e: any) {
      console.error(e);
      notify(e.message || "The forge failed to create the relic.", "error");
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
    if (!reservoirReady) return;
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

  return (
    <div className="space-y-12 pb-12">
      <div className="text-center">
        <h2 className="text-4xl font-black fantasy-font text-[#b28a48] drop-shadow-lg">Royal Armory</h2>
        <p className="text-neutral-600 text-xs uppercase tracking-[0.4em] mt-2">Relics of Power & Protection</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4">
            <h3 className="text-lg font-black mb-6 fantasy-font text-neutral-300">Forge New Relic</h3>
            <div className="space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="RELIC NAME..." className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none" />
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 text-[10px] text-neutral-400 uppercase tracking-widest outline-none">
                <option value="Weapon">Weapon</option>
                <option value="Armor">Armor</option>
              </select>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="DESCRIBE THE ARTIFACT'S LEGEND..." className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-3 h-32 text-xs text-neutral-500 uppercase tracking-tight focus:border-[#b28a48] outline-none font-serif italic" />
              <button onClick={handleCreate} disabled={loading || !name || !reservoirReady} className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 text-[#b28a48] py-4 font-black text-[10px] uppercase tracking-[0.3em] transition-all disabled:opacity-20 flex flex-col items-center gap-1">
                {loading ? 'FORGING...' : (
                  <>
                    <span>BIND RELIC</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <input type="text" placeholder="Search armory..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-neutral-900/50 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-widest text-[#b28a48] focus:border-[#b28a48] outline-none" />
          </div>

          <div className="space-y-6">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className={`grim-card group transition-all duration-500 border-2 cursor-pointer ${expandedId === item.id ? 'border-[#b28a48]/60 shadow-2xl' : 'border-neutral-900 hover:border-neutral-800'}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className={`h-48 md:h-auto md:w-56 relative grayscale group-hover:grayscale-0 transition-all duration-700 ${expandedId === item.id ? 'grayscale-0' : ''}`}>
                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black flex items-center justify-center text-4xl">⚔️</div>}
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-2xl font-black fantasy-font text-[#b28a48]">{item.name}</h4>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => handleShareIndividual(e, item)}
                            className="text-neutral-700 hover:text-green-500 transition-colors p-2 text-xl"
                            title="Share Relic through Portal"
                          >
                            🌀
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setItems(prev => prev.filter(x => x.id !== item.id)); }} className="text-neutral-800 hover:text-red-500 transition-colors p-2 text-xl">🗑️</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Armory;
