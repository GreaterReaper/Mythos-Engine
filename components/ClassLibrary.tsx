
import React, { useState, useMemo } from 'react';
import { ClassDef, SyncMessage, Spell, UserAccount, Item } from '../types';
import { generateClassMechanics, generateSpellbook, rerollTraits, generateClassEquipment, generateImage } from '../services/gemini';

interface ClassLibraryProps {
  classes: ClassDef[];
  setClasses: React.Dispatch<React.SetStateAction<ClassDef[]>>;
  broadcast?: (msg: Partial<SyncMessage>) => void;
  notify: (msg: string, type?: any) => void;
  reservoirReady: boolean;
  syncSpells?: (classList: ClassDef[]) => ClassDef[];
  currentUser: UserAccount;
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

const ClassLibrary: React.FC<ClassLibraryProps> = ({ classes, setClasses, broadcast, notify, reservoirReady, syncSpells, currentUser, items, setItems }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [identifyingId, setIdentifyingId] = useState<string | null>(null);
  const [learningSpellsId, setLearningSpellsId] = useState<string | null>(null);
  const [forgingHeirloomId, setForgingHeirloomId] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Admin Manual Fields
  const [manualMode, setManualMode] = useState(false);
  const [manualHitDie, setManualHitDie] = useState('d8');
  const [manualStartingHp, setManualStartingHp] = useState(8);
  const [manualHpPerLevel, setManualHpPerLevel] = useState(5);
  const [manualSlots, setManualSlots] = useState('0,0,0');

  const filteredClasses = useMemo(() => {
    return classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [classes, search]);

  const legacyRecords = useMemo(() => {
    return classes.filter(c => 
      (!c.preferredStats || c.preferredStats.length === 0) || 
      (!c.initialSpells || c.initialSpells.length === 0) ||
      (c.spellSlots && c.spellSlots.every(s => s === 0) && c.initialSpells && c.initialSpells.length > 0) // Spells but no slots
    );
  }, [classes]);

  const isAuthor = (cls: ClassDef) => {
    return cls.authorId === currentUser.username;
  };

  const canEditOrManage = (cls: ClassDef) => {
    return currentUser.isAdmin || isAuthor(cls) || cls.authorId === 'system';
  };

  const updateAndSync = (newList: ClassDef[]) => {
    setClasses(newList);
    if (broadcast) {
      broadcast({ type: 'STATE_UPDATE', payload: { classes: newList } });
    }
  };

  const handleCreate = async () => {
    if (!name || !description || loading) return;
    if (!manualMode && !reservoirReady && !currentUser.isAdmin) return;

    setLoading(true);
    try {
      let mechanics;
      
      if (manualMode && currentUser.isAdmin) {
        mechanics = {
          hitDie: manualHitDie,
          startingHp: manualStartingHp,
          hpPerLevel: manualHpPerLevel,
          spellSlots: manualSlots.split(',').map(s => parseInt(s.trim()) || 0),
          preferredStats: [],
          bonuses: [],
          features: [],
          initialSpells: []
        };
      } else {
        mechanics = await generateClassMechanics(name, description);
      }

      const hasSpells = mechanics.spellSlots && mechanics.spellSlots.some((s: number) => s > 0);
      const newClass: ClassDef = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        description,
        hitDie: mechanics.hitDie || 'd8',
        startingHp: mechanics.startingHp || 8,
        hpPerLevel: mechanics.hpPerLevel || 5,
        spellSlots: mechanics.spellSlots || [],
        preferredStats: mechanics.preferredStats || [],
        bonuses: mechanics.bonuses || [],
        features: (mechanics.features || []).map((f: any) => ({ ...f, locked: false })),
        initialSpells: mechanics.initialSpells || [],
        authorId: currentUser.username,
        authorName: currentUser.displayName
      };
      
      const updatedList = syncSpells ? syncSpells([...classes, newClass]) : [...classes, newClass];
      updateAndSync(updatedList);
      
      if (!manualMode) {
        try {
          const signatureItems = await generateClassEquipment(name, description, newClass.hitDie, hasSpells);
          const keyedItems = [];
          for (const si of signatureItems) {
              const imgUrl = await generateImage(`TTRPG concept art: ${si.name}, a signature ${si.type} for a ${name} hero. Lore: ${description}. Item Lore: ${si.lore}. Highly detailed obsidian and gold accents, cinematic lighting.`);
              keyedItems.push({ ...si, id: Math.random().toString(36).substr(2, 9), imageUrl: imgUrl });
              await new Promise(r => setTimeout(r, 1000)); 
          }
          setItems(prev => [...prev, ...keyedItems]);
          if (broadcast) {
            keyedItems.forEach(ki => broadcast({ type: 'GIVE_LOOT', payload: ki }));
          }
        } catch (itemErr) {
          console.error("Failed to forge starter items:", itemErr);
        }
      }

      notify(`Archetype Bound.`, "success");
      setName('');
      setDescription('');
      setExpandedId(newClass.id);
    } catch (e: any) {
      console.error(e);
      notify(e.message || "The Forge failed to respond.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManifestHeirloom = async (cls: ClassDef) => {
    if ((!reservoirReady && !currentUser.isAdmin) || forgingHeirloomId) return;
    setForgingHeirloomId(cls.id);
    try {
      const hasSpells = cls.spellSlots && cls.spellSlots.some(s => s > 0);
      const signatureItems = await generateClassEquipment(cls.name, cls.description, cls.hitDie, hasSpells);
      const keyedItems = [];
      for (const si of signatureItems) {
        const imgUrl = await generateImage(`Signature relic: ${si.name} (${si.type}). Bound to class ${cls.name}. Theme: ${cls.description}. Item Details: ${si.description}. Dark moody painting.`);
        keyedItems.push({ ...si, id: Math.random().toString(36).substr(2, 9), imageUrl: imgUrl });
        await new Promise(r => setTimeout(r, 1000));
      }
      setItems(prev => [...prev, ...keyedItems]);
      if (broadcast) {
        keyedItems.forEach(ki => broadcast({ type: 'GIVE_LOOT', payload: ki }));
      }
      notify(`Heirlooms manifest in Armory`, "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setForgingHeirloomId(null);
    }
  };

  const handleIdentifyDepths = async (cls: ClassDef) => {
    if (!canEditOrManage(cls)) {
      notify("Only authors or architects can recalibrate this archetype.", "error");
      return;
    }
    if ((!reservoirReady && !currentUser.isAdmin) || identifyingId) return;
    setIdentifyingId(cls.id);
    try {
      const mechanics = await generateClassMechanics(cls.name, cls.description);
      
      const updated = classes.map(c => c.id === cls.id ? {
        ...c,
        preferredStats: mechanics.preferredStats || [],
        bonuses: mechanics.bonuses || [],
        spellSlots: (mechanics.spellSlots && mechanics.spellSlots.length > 0) ? mechanics.spellSlots : [0, 0, 0],
        hitDie: mechanics.hitDie || c.hitDie,
        startingHp: mechanics.startingHp || c.startingHp,
        hpPerLevel: mechanics.hpPerLevel || c.hpPerLevel,
        initialSpells: mechanics.initialSpells || [] 
      } : c);
      
      const synced = syncSpells ? syncSpells(updated) : updated;
      updateAndSync(synced);
      notify(`Depths of "${cls.name}" Reassigned`, "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setIdentifyingId(null);
    }
  };

  const handleManifestSpells = async (cls: ClassDef) => {
    if (!canEditOrManage(cls)) {
      notify("Only authors or architects can inscribe these spells.", "error");
      return;
    }
    if ((!reservoirReady && !currentUser.isAdmin) || learningSpellsId) return;
    setLearningSpellsId(cls.id);
    try {
      const uniqueSpells = await generateSpellbook(cls.name, cls.description, 3);
      const updated = classes.map(c => c.id === cls.id ? {
        ...c,
        initialSpells: uniqueSpells
      } : c);
      
      const synced = syncSpells ? syncSpells(updated) : updated;
      updateAndSync(synced);
      notify(`Grimoire for "${cls.name}" Inscribed`, "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setLearningSpellsId(null);
    }
  };

  const handleBulkManifest = async () => {
    const listToProcess = currentUser.isAdmin ? classes : legacyRecords.filter(canEditOrManage);
    if ((!reservoirReady && !currentUser.isAdmin) || loading || listToProcess.length === 0) return;
    
    setLoading(true);
    notify(`Purging & Recalibrating ${listToProcess.length} Archetypes...`, "info");

    let currentClasses = [...classes];
    for (const cls of listToProcess) {
      try {
        const mechanics = await generateClassMechanics(cls.name, cls.description);
        currentClasses = currentClasses.map(c => c.id === cls.id ? {
          ...c,
          preferredStats: mechanics.preferredStats || [],
          bonuses: mechanics.bonuses || [],
          spellSlots: (mechanics.spellSlots && mechanics.spellSlots.length > 0) ? mechanics.spellSlots : [0,0,0],
          hitDie: mechanics.hitDie || c.hitDie,
          startingHp: mechanics.startingHp || c.startingHp,
          hpPerLevel: mechanics.hpPerLevel || c.hpPerLevel,
          initialSpells: mechanics.initialSpells || [] 
        } : c);
        await new Promise(r => setTimeout(r, 800));
      } catch (e) {
        console.error(`Failed to manifest ${cls.name}`, e);
      }
    }
    const synced = syncSpells ? syncSpells(currentClasses) : currentClasses;
    updateAndSync(synced);
    setLoading(false);
    notify("Archetype Synchronization Complete", "success");
  };

  const handleBulkGearManifest = async () => {
    if ((!reservoirReady && !currentUser.isAdmin) || loading) return;
    setLoading(true);
    notify("Manifesting Signature Relics for Archetypes...", "info");
    
    try {
      let count = 0;
      for (const cls of classes) {
        const classTerms = cls.name.toLowerCase().split(' ');
        const exists = items.some(i => classTerms.some(term => i.name.toLowerCase().includes(term) || i.description.toLowerCase().includes(term)));
        
        if (!exists || canEditOrManage(cls)) {
          const hasSpells = cls.spellSlots && cls.spellSlots.some(s => s > 0);
          const signatureItems = await generateClassEquipment(cls.name, cls.description, cls.hitDie, hasSpells);
          const newItems = [];
          for (const si of signatureItems) {
            const imgUrl = await generateImage(`High-fidelity TTRPG relic: ${si.name}. For class ${cls.name}. Lore: ${cls.description}. Item Power: ${si.description}. Cinematic dark fantasy masterpiece.`);
            newItems.push({ ...si, id: Math.random().toString(36).substr(2, 9), imageUrl: imgUrl });
            await new Promise(r => setTimeout(r, 1200));
          }
          
          if (newItems.length > 0) {
            setItems(prev => [...prev, ...newItems]);
            if (broadcast) newItems.forEach(ki => broadcast({ type: 'GIVE_LOOT', payload: ki }));
            count++;
          }
        }
      }
      notify(`Signature Relics for ${count} Archetypes added to Armory.`, "success");
    } catch (e: any) {
      notify("Ether instability during mass forging.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatureLock = (cls: ClassDef, featIdx: number) => {
    if (!canEditOrManage(cls)) {
      notify("The grimoire prevents you from locking features of foreign archetypes.", "error");
      return;
    }
    const updated = classes.map(c => {
      if (c.id !== cls.id) return c;
      const newFeatures = [...c.features];
      newFeatures[featIdx] = { ...newFeatures[featIdx], locked: !newFeatures[featIdx].locked };
      return { ...c, features: newFeatures };
    });
    updateAndSync(updated);
  };

  const handleMove = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = classes.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === classes.length - 1) return;

    const newClasses = [...classes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newClasses[index], newClasses[targetIndex]] = [newClasses[targetIndex], newClasses[index]];
    updateAndSync(newClasses);
  };

  const handleReroll = async (cls: ClassDef) => {
    if (!canEditOrManage(cls)) {
      notify("Only authors or architects may reweave this archetype's destiny.", "error");
      return;
    }
    if (!reservoirReady && !currentUser.isAdmin) return;
    setRerolling(cls.id);
    try {
      const updated = await rerollTraits('class', cls.name, cls.description, cls.features);
      const newClasses = classes.map(c => {
        if (c.id !== cls.id) return c;
        
        let updateIdx = 0;
        const finalMergedFeatures = c.features.map(original => {
          if (original.locked) return original;
          const replacement = updated[updateIdx];
          updateIdx++;
          return replacement ? { ...replacement, locked: false } : original;
        });

        return { ...c, features: finalMergedFeatures };
      });
      updateAndSync(newClasses);
      notify("Features Rewoven", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setRerolling(null);
    }
  };

  const handleShareIndividual = (e: React.MouseEvent, cls: ClassDef) => {
    e.stopPropagation();
    if (broadcast) {
      broadcast({
        type: 'SHARE_RESOURCE',
        payload: {
          resourceType: 'class',
          resourceData: cls
        }
      });
      notify(`Shared Archetype: ${cls.name}`, 'success');
    } else {
      notify("Portal not active.", "error");
    }
  };

  const handleDelete = (e: React.MouseEvent, cls: ClassDef) => {
    e.stopPropagation();
    if (window.confirm("Banish this archetype from the grimoire forever?")) {
      const updated = classes.filter(x => x.id !== cls.id);
      updateAndSync(updated);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center lg:text-left flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black fantasy-font text-[#b28a48]">Grimoire of Archetypes</h2>
          <p className="text-neutral-500 text-xs uppercase tracking-widest font-black mt-2">Design your legends. AI translates lore into mechanics.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center lg:justify-end">
          <button 
            onClick={handleBulkGearManifest}
            disabled={loading || (!reservoirReady && !currentUser.isAdmin)}
            className="bg-blue-950/20 border border-blue-500/30 hover:border-blue-500 text-blue-400 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
          >
            <span className="text-sm">🛡️</span>
            Manifest All Archetype Gear
          </button>

          {(currentUser.isAdmin || legacyRecords.some(canEditOrManage)) && (
            <button 
              onClick={handleBulkManifest}
              disabled={loading || (!reservoirReady && !currentUser.isAdmin)}
              className="bg-amber-950/20 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
            >
              <span className="animate-pulse">✨</span>
              {currentUser.isAdmin ? 'Force Re-sync All Archetypes' : 'Purge & Sync Legacies'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <div className="grim-card p-6 border-dashed border-[#b28a48]/20 border-2 rounded-sm sticky top-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold fantasy-font text-neutral-300">Forge Archetype</h3>
              {currentUser.isAdmin && (
                <button 
                  onClick={() => setManualMode(!manualMode)}
                  className={`text-[8px] px-2 py-1 border font-black uppercase transition-all ${manualMode ? 'bg-amber-500 text-black border-amber-500' : 'text-neutral-600 border-neutral-800 hover:text-white'}`}
                >
                  {manualMode ? 'Manual Mode ON' : 'AI Mode'}
                </button>
              )}
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-2 block text-left">Class Identity</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Bloodweaver, Void Knight..." 
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-4 text-sm text-[#b28a48] focus:border-[#b28a48] outline-none tracking-widest uppercase font-bold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-2 block text-left">Arcane Focus & Lore</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Describe playstyle, themes, and source of power..." 
                  className="w-full bg-black border border-neutral-800 rounded-sm px-4 py-4 h-40 text-sm text-neutral-400 focus:border-[#b28a48] outline-none font-serif italic leading-relaxed" 
                />
              </div>

              {manualMode && currentUser.isAdmin && (
                <div className="p-4 bg-black/60 border border-amber-900/30 space-y-4 rounded-sm animate-in fade-in slide-in-from-top-2">
                   <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Admin Override: Manual Inscription</p>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[7px] text-neutral-500 font-black uppercase mb-1 block">Hit Die</label>
                       <select value={manualHitDie} onChange={(e) => setManualHitDie(e.target.value)} className="w-full bg-black border border-neutral-800 text-[10px] p-2 text-[#b28a48] outline-none">
                         <option value="d6">d6</option>
                         <option value="d8">d8</option>
                         <option value="d10">d10</option>
                         <option value="d12">d12</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[7px] text-neutral-500 font-black uppercase mb-1 block">Start HP</label>
                       <input type="number" value={manualStartingHp} onChange={(e) => setManualStartingHp(parseInt(e.target.value))} className="w-full bg-black border border-neutral-800 text-[10px] p-2 text-[#b28a48] outline-none" />
                     </div>
                   </div>
                   <div>
                     <label className="text-[7px] text-neutral-500 font-black uppercase mb-1 block">Spell Slots (L1,L2,L3)</label>
                     <input value={manualSlots} onChange={(e) => setManualSlots(e.target.value)} placeholder="4,2,0" className="w-full bg-black border border-neutral-800 text-[10px] p-2 text-[#b28a48] outline-none" />
                   </div>
                </div>
              )}

              <button 
                onClick={handleCreate} 
                disabled={loading || !name || (!manualMode && !reservoirReady && !currentUser.isAdmin)} 
                className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-[#b28a48]/40 py-5 text-[11px] font-black uppercase tracking-[0.5em] text-[#b28a48] hover:border-[#b28a48] transition-all shadow-xl active:scale-[0.98] disabled:opacity-20 flex flex-col items-center gap-1"
              >
                {loading ? 'BINDING SOUL...' : (manualMode ? 'INSCRIBE MANUALLY' : (
                  <>
                    <span>FORGE ARCHETYPE</span>
                    <span className="text-[8px] text-amber-600/80 tracking-widest">{currentUser.isAdmin ? '[∞ ARCHITECT]' : '[-15⚡ ESSENCE]'}</span>
                  </>
                ))}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          <div className="bg-black/60 border border-[#b28a48]/20 p-4 rounded-sm flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Search grimoire..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="flex-1 bg-black border border-neutral-900 px-4 py-3 text-xs uppercase tracking-widest text-[#b28a48] outline-none focus:border-[#b28a48]" 
            />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {filteredClasses.map((c, idx) => {
              const originalIndex = classes.findIndex(oc => oc.id === c.id);
              const isLegacy = !c.preferredStats || c.preferredStats.length === 0;
              const hasCorruptedArcanum = c.spellSlots && c.spellSlots.every(s => s === 0) && c.initialSpells && c.initialSpells.length > 0;
              const manageable = canEditOrManage(c);

              return (
                <div 
                  key={c.id} 
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className={`grim-card group transition-all duration-500 cursor-pointer border-2 ${
                    expandedId === c.id 
                      ? 'border-[#b28a48]/60 shadow-[0_0_50px_rgba(0,0,0,0.5)]' 
                      : 'border-neutral-900 hover:border-neutral-800'
                  }`}
                >
                  <div className="p-8 flex flex-col md:flex-row justify-between gap-8">
                    <div className="flex-1 text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          {!search && (
                            <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => handleMove(e, c.id, 'up')}
                                disabled={originalIndex === 0}
                                className="text-[#b28a48] hover:text-white disabled:opacity-10 transition-colors px-1"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button 
                                onClick={(e) => handleMove(e, c.id, 'down')}
                                disabled={originalIndex === classes.length - 1}
                                className="text-[#b28a48] hover:text-white disabled:opacity-10 transition-colors px-1"
                                title="Move Down"
                              >
                                ▼
                              </button>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="text-3xl font-black text-[#b28a48] fantasy-font tracking-widest uppercase">{c.name}</h4>
                              {isLegacy && (
                                <span className="text-[7px] font-black text-amber-700 uppercase tracking-widest bg-amber-950/20 px-2 py-0.5 rounded-sm border border-amber-900/30">
                                  Legacy
                                </span>
                              )}
                              {hasCorruptedArcanum && (
                                <span className="text-[7px] font-black text-red-500 uppercase tracking-widest bg-red-950/20 px-2 py-0.5 rounded-sm border border-red-900/30 animate-pulse">
                                  Corrupted Arcanum
                                </span>
                              )}
                              {isAuthor(c) ? (
                                <span className="text-[7px] font-black text-green-700 uppercase tracking-widest bg-green-950/20 px-2 py-0.5 rounded-sm border border-green-900/30">
                                  Your Legend
                                </span>
                              ) : (
                                <span className="text-[7px] font-black text-neutral-700 uppercase tracking-widest bg-neutral-950/40 px-2 py-0.5 rounded-sm border border-neutral-900/50">
                                  By {c.authorName || 'Ancient Grimoire'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => handleShareIndividual(e, c)}
                            className="text-neutral-700 hover:text-green-500 transition-colors p-2 text-xl"
                            title="Share Archetype through Portal"
                          >
                            🌀
                          </button>
                          <button 
                            onClick={(e) => handleDelete(e, c)} 
                            className="text-neutral-800 hover:text-red-500 transition-colors p-2 text-xl"
                            title="Banish Archetype"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className={`text-base text-neutral-400 mt-4 italic font-serif italic leading-relaxed ${expandedId === c.id ? '' : 'line-clamp-2'}`}>
                        {c.description}
                      </p>
                    </div>

                    <div className="flex gap-4 items-center self-start">
                      <div className="bg-black/80 border border-neutral-800 px-6 py-4 rounded-sm text-center min-w-[90px]">
                        <div className="text-[10px] uppercase text-neutral-600 font-black mb-1 text-center">Hit Die</div>
                        <div className="text-lg font-black text-[#b28a48] text-center">{c.hitDie}</div>
                      </div>
                    </div>
                  </div>

                  {expandedId === c.id && (
                    <div className="border-t border-neutral-900 bg-[#080808] p-8 md:p-12 space-y-12 animate-in slide-in-from-top duration-500">
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                          <div>
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
                              <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em] text-left">Core Attributes</h5>
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleManifestHeirloom(c); }}
                                  disabled={forgingHeirloomId === c.id || (!reservoirReady && !currentUser.isAdmin)}
                                  className="text-[8px] font-black text-amber-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-all bg-amber-950/40 px-2 py-1 border border-amber-900/40 rounded-sm"
                                >
                                  {forgingHeirloomId === c.id ? 'FORGING...' : 'Manifest Relics ⚔️'}
                                </button>
                                
                                {manageable && (
                                  <>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleManifestSpells(c); }}
                                      disabled={learningSpellsId === c.id || (!reservoirReady && !currentUser.isAdmin)}
                                      className="text-[8px] font-black text-blue-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-all bg-blue-950/40 px-2 py-1 border border-blue-900/40 rounded-sm"
                                    >
                                      {learningSpellsId === c.id ? 'SYNCHRONIZING...' : 'Sync Arcanum ✨'}
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleIdentifyDepths(c); }}
                                      disabled={identifyingId === c.id || (!reservoirReady && !currentUser.isAdmin)}
                                      className="text-[8px] font-black text-amber-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-all bg-amber-950/40 px-2 py-1 border border-amber-900/40 rounded-sm"
                                    >
                                      {identifyingId === c.id ? 'REASSIGNING...' : 'Recalibrate Slots ⚡'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black/40 p-4 border border-neutral-900 rounded-sm text-left">
                                <p className="text-[8px] font-black text-neutral-600 uppercase mb-2">Primary Stats</p>
                                <div className="flex flex-wrap gap-2">
                                  {c.preferredStats && c.preferredStats.length > 0 ? (
                                    c.preferredStats.map((s, idx) => (
                                      <span key={idx} className="bg-amber-950/20 text-[#b28a48] text-[10px] font-black px-2 py-1 rounded-sm border border-amber-900/30 uppercase tracking-tighter">
                                        {s}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-neutral-700 text-[10px] italic">Undetermined</span>
                                  )}
                                </div>
                              </div>
                              <div className="bg-black/40 p-4 border border-neutral-900 rounded-sm text-left">
                                <p className="text-[8px] font-black text-neutral-600 uppercase mb-2">Health Growth</p>
                                <p className="text-xs font-black text-neutral-300">+{c.hpPerLevel} / LEVEL</p>
                                <p className="text-[9px] text-neutral-500 italic mt-1 font-serif">Starting: {c.startingHp} + CON</p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em] border-b border-neutral-800 pb-2 mb-4 text-left">Class Proficiencies</h5>
                            <div className="bg-black/40 p-5 border border-neutral-900 rounded-sm text-left">
                              <ul className="grid grid-cols-1 gap-2">
                                {c.bonuses && c.bonuses.length > 0 ? (
                                  c.bonuses.map((b, idx) => (
                                    <li key={idx} className="flex items-center gap-3">
                                      <span className="w-1.5 h-1.5 bg-[#b28a48] rounded-full"></span>
                                      <span className="text-xs text-neutral-400 font-serif italic">{b}</span>
                                    </li>
                                  ))
                                ) : (
                                  <li className="text-neutral-700 text-[10px] italic">No specific bonuses recorded</li>
                                )}
                              </ul>
                            </div>
                          </div>

                          {c.spellSlots && c.spellSlots.some(s => s > 0) && (
                            <div>
                              <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em] border-b border-neutral-800 pb-2 mb-4 text-left">Spell Reservoirs</h5>
                              <div className="flex gap-2">
                                {c.spellSlots.map((slots, idx) => (
                                  <div key={idx} className="flex-1 bg-black/40 border border-neutral-900 p-3 rounded-sm text-center">
                                    <p className="text-[8px] font-black text-neutral-600 uppercase mb-1">LVL {idx + 1}</p>
                                    <p className={`text-sm font-black ${slots > 0 ? 'text-amber-500' : 'text-neutral-800'}`}>
                                      {slots}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em] border-b border-neutral-800 pb-2 mb-4 text-left">Archetype Spells</h5>
                            <div className="grid grid-cols-1 gap-2">
                              {c.initialSpells && c.initialSpells.length > 0 ? (
                                c.initialSpells.map((s, idx) => (
                                  <div key={idx} className="bg-black/40 p-3 border border-neutral-900 rounded-sm text-left">
                                    <div className="flex justify-between">
                                      <p className="text-[10px] font-black text-amber-600 uppercase">{s.name}</p>
                                      <p className="text-[8px] text-neutral-600 font-black">LVL {s.level}</p>
                                    </div>
                                    <p className="text-[10px] text-neutral-400 font-serif italic line-clamp-2 leading-relaxed">{s.description}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-neutral-700 text-[10px] italic p-3 text-center border border-dashed border-neutral-900">No spells inscribed in grimoire</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div className="flex justify-between items-end border-b border-neutral-800 pb-2 mb-4">
                            <h5 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.4em]">Archetype Features</h5>
                            {manageable ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleReroll(c); }}
                                disabled={rerolling === c.id || (!reservoirReady && !currentUser.isAdmin)}
                                className="text-[10px] font-black text-[#b28a48] hover:text-[#cbb07a] uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 disabled:opacity-20"
                              >
                                {rerolling === c.id ? 'REWEAVING...' : <span>Reroll Unlocked 🎲</span>}
                              </button>
                            ) : (
                              <span className="text-[9px] font-black text-neutral-700 uppercase tracking-widest">
                                Read Only
                              </span>
                            )}
                          </div>

                          <div className="space-y-4">
                            {c.features.map((f, i) => (
                              <div 
                                key={i} 
                                onClick={(e) => { e.stopPropagation(); toggleFeatureLock(c, i); }}
                                className={`p-6 border transition-all rounded-sm relative group/feat flex flex-col justify-center min-h-[100px] text-left ${
                                  f.locked ? 'bg-amber-950/5 border-amber-900/40 shadow-inner' : 'bg-black border-neutral-900 hover:border-neutral-700'
                                } ${!manageable ? 'cursor-default' : 'cursor-pointer'}`}
                              >
                                <div className="flex items-start gap-4">
                                  <span className={`text-xl mt-0.5 ${f.locked ? 'text-amber-600' : 'text-neutral-800'}`}>
                                    {f.locked ? '†' : '○'}
                                  </span>
                                  <div>
                                    <h6 className={`text-base font-black uppercase tracking-wider mb-2 ${f.locked ? 'text-amber-600' : 'text-[#b28a48]'}`}>
                                      {f.name}
                                    </h6>
                                    <p className="text-sm text-neutral-400 font-serif leading-relaxed italic">
                                      {f.description}
                                    </p>
                                  </div>
                                </div>
                                {f.locked && !manageable && (
                                  <div className="absolute top-2 right-2 text-[8px] font-black text-amber-900/40 uppercase tracking-widest">
                                    Author Locked
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassLibrary;
