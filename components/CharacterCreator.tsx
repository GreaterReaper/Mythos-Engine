
import React, { useState, useMemo } from 'react';
import { Character, Race, Archetype, Stats, Ability, Item, ArchetypeInfo, Currency, Role } from '../types';
import { POINT_BUY_COSTS, RACIAL_BONUSES, ARCHETYPE_INFO, SPELL_SLOT_PROGRESSION, INITIAL_ITEMS, RECOMMENDED_STATS } from '../constants';
import { generateCustomClass, safeId, manifestSoulLore } from '../geminiService';

interface CharacterCreatorProps {
  onCancel: () => void;
  onCreate: (char: Character) => void;
  customArchetypes: ArchetypeInfo[];
  onAddCustomArchetype: (arch: ArchetypeInfo) => void;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onCancel, onCreate, customArchetypes, onAddCustomArchetype }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState(21);
  const [gender, setGender] = useState('Female');
  const [race, setRace] = useState<Race>(Race.Human);
  const [archetype, setArchetype] = useState<Archetype | string>(Archetype.Warrior);
  const [stats, setStats] = useState<Stats>({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
  const [description, setDescription] = useState('');
  const [biography, setBiography] = useState('');
  const [isForgingClass, setIsForgingClass] = useState(false);
  const [isForgingLore, setIsForgingLore] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  
  const [previewClassData, setPreviewClassData] = useState<ArchetypeInfo | null>(null);

  const usedPoints = useMemo(() => {
    return (Object.keys(stats) as Array<keyof Stats>).reduce((acc, key) => acc + (POINT_BUY_COSTS[stats[key as keyof Stats]] || 0), 0);
  }, [stats]);

  const maxPoints = 27;

  const handleStatChange = (stat: keyof Stats, delta: number) => {
    const newVal = stats[stat] + delta;
    if (newVal < 8 || newVal > 15) return;
    const costDiff = POINT_BUY_COSTS[newVal] - POINT_BUY_COSTS[stats[stat]];
    if (usedPoints + costDiff > maxPoints) return;
    setStats({ ...stats, [stat]: newVal });
  };

  const finalStats = useMemo(() => {
    const bonuses = RACIAL_BONUSES[race];
    return (Object.keys(stats) as Array<keyof Stats>).reduce((acc, key) => {
      acc[key] = stats[key] + (bonuses[key] || 0);
      return acc;
    }, {} as Stats);
  }, [stats, race]);

  const handleForgeLore = async () => {
    setIsForgingLore(true);
    try {
      const lore = await manifestSoulLore({ name, race, archetype, level: 1, age, gender });
      setBiography(lore.biography);
      setDescription(lore.description);
    } catch (e) {
      alert("Lore weaving failed. The mists are too thick.");
    } finally {
      setIsForgingLore(false);
    }
  };

  const handleForgeClass = async () => {
    if (!customPrompt) return;
    setIsForgingClass(true);
    setPreviewClassData(null);
    try {
      const data = await generateCustomClass(customPrompt);
      const info: ArchetypeInfo = {
        name: data.name,
        description: data.description,
        hpDie: data.hpDie,
        role: data.role || 'DPS',
        coreAbilities: data.abilities,
        spells: data.spells,
        themedItems: data.themedItems,
        startingItem: data.themedItems.find((i: Item) => i.rarity === 'Common')
      };
      setPreviewClassData(info);
    } catch (e) {
      alert("Aetheric winds failed to forge the path.");
    } finally {
      setIsForgingClass(false);
    }
  };

  const acceptForgedPath = () => {
    if (previewClassData) {
      onAddCustomArchetype(previewClassData);
      setArchetype(previewClassData.name);
      setPreviewClassData(null);
      setCustomPrompt('');
    }
  };

  const finalize = () => {
    const conMod = Math.floor((finalStats.con - 10) / 2);
    let hpDie = 8;
    let role: Role = 'DPS';
    let baseAbilities: Ability[] = [];
    let baseSpells: Ability[] = [];
    let inventory: Item[] = [];

    const customMatch = customArchetypes.find(a => a.name === archetype);
    const defaultMatch = ARCHETYPE_INFO[archetype as Archetype];

    if (customMatch) {
      hpDie = customMatch.hpDie;
      role = customMatch.role;
      baseAbilities = customMatch.coreAbilities;
      baseSpells = customMatch.spells || [];
      if (customMatch.startingItem) {
        inventory = [{ ...customMatch.startingItem as Item, id: safeId(), archetypes: [customMatch.name] }];
      }
    } else if (defaultMatch) {
      hpDie = defaultMatch.hpDie;
      role = defaultMatch.role;
      baseAbilities = defaultMatch.coreAbilities;
      baseSpells = defaultMatch.spells || [];
      const classGear = INITIAL_ITEMS.filter(i => i.archetypes?.includes(archetype as Archetype));
      inventory = classGear.filter(i => i.rarity === 'Common').map(i => ({...i, id: safeId()}));
    }

    const startHp = hpDie + conMod;
    const initialSlots = SPELL_SLOT_PROGRESSION[1];
    const isCaster = [Archetype.Sorcerer, Archetype.Mage, Archetype.DarkKnight].includes(archetype as Archetype) || baseSpells.length > 0;

    // Fixed Currency object to match type definition in types.ts (removed 'shards' and 'ichor')
    const newChar: Character = {
      id: safeId(),
      name, age, gender, race, archetype, role,
      level: 1, exp: 0, maxHp: startHp, currentHp: startHp,
      stats: finalStats, currency: { aurels: 10 },
      inventory, equippedIds: inventory.map(i => i.id), spells: baseSpells,
      abilities: baseAbilities, activeStatuses: [],
      spellSlots: isCaster ? initialSlots : undefined,
      maxSpellSlots: isCaster ? initialSlots : undefined,
      description, biography, asiPoints: 0
    };
    onCreate(newChar);
  };

  const allArchetypes = useMemo(() => {
    const defaults = Object.values(Archetype).filter(a => a !== Archetype.Custom);
    const customs = customArchetypes.map(a => a.name);
    return [...defaults, ...customs];
  }, [customArchetypes]);

  const recommendedForArch = useMemo(() => RECOMMENDED_STATS[archetype] || [], [archetype]);

  return (
    <div className="rune-border p-5 md:p-8 bg-black/70 backdrop-blur-xl max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 border-emerald-900/60">
      <div className="flex justify-between items-center border-b border-emerald-900/50 pb-3">
        <h2 className="text-2xl md:text-3xl font-cinzel text-gold drop-shadow-lg">Soul Forging</h2>
        <button onClick={onCancel} className="text-emerald-500 text-[10px] md:text-xs font-bold uppercase tracking-widest border border-emerald-900/30 px-3 py-1 hover:bg-emerald-900 hover:text-white transition-all">Cancel</button>
      </div>

      {previewClassData && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rune-border bg-[#0c0a09] p-6 md:p-10 space-y-8 overflow-y-auto max-h-[90vh] custom-scrollbar shadow-2xl border-emerald-900">
            <h2 className="text-3xl font-cinzel text-gold border-b border-emerald-900 pb-3">The Forged Path: {previewClassData.name}</h2>
            <p className="text-xs md:text-sm text-gray-400 italic leading-relaxed">{previewClassData.description}</p>
            
            <div className="space-y-6">
               <div className="flex justify-between items-center border-b border-gold/20 pb-2">
                 <h3 className="text-xs font-cinzel text-gold uppercase tracking-widest">Aetheric Manifestations</h3>
                 <span className="text-[10px] bg-emerald-900 text-white px-2 py-0.5 rounded-sm font-black uppercase">{previewClassData.role}</span>
               </div>
              <div className="space-y-3">
                {previewClassData.coreAbilities.map((ab, i) => (
                  <div key={i} className="bg-emerald-900/10 p-3 border-l-2 border-emerald-900">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{ab.name} • {ab.type}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{ab.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button onClick={() => setPreviewClassData(null)} className="flex-1 py-4 border border-emerald-900 text-emerald-500 font-cinzel text-xs font-bold hover:bg-emerald-900 hover:text-white transition-all">RE-FORGE</button>
              <button onClick={acceptForgedPath} className="flex-[2] py-4 bg-emerald-900 text-white font-cinzel border border-gold text-xs font-bold shadow-lg shadow-emerald-900/40 hover:bg-emerald-800 transition-all">ACCEPT DESTINY</button>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-bold">Aetheric Identity</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nameless Soul..." className="w-full bg-black/40 border border-emerald-900/30 p-3 text-gold font-cinzel text-sm focus:border-gold outline-none transition-all placeholder:text-emerald-900/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-bold">Age</label>
                <input type="number" value={age} onChange={e => setAge(Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-black/40 border border-emerald-900/30 p-3 text-gold outline-none text-center font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-bold">Vessel</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-[46px] bg-black/40 border border-emerald-900/30 px-3 text-gold outline-none text-xs font-cinzel cursor-pointer hover:border-gold transition-colors">
                  <option>Female</option><option>Male</option><option>Unknown</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-bold">Ancestry (Race)</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {Object.values(Race).map(r => (
                <button key={r} onClick={() => setRace(r)} className={`p-2 border text-[10px] font-cinzel transition-all font-bold uppercase ${race === r ? 'bg-emerald-900 border-gold text-white' : 'border-emerald-900/30 text-gray-500 hover:text-gold hover:border-gold/50'}`}>{r}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-bold">Vocation (Class)</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {allArchetypes.map(a => (
                  <button key={a} onClick={() => setArchetype(a)} className={`p-2 border text-[10px] font-cinzel transition-all truncate font-bold uppercase ${archetype === a ? 'bg-emerald-900 border-gold text-white' : 'border-emerald-900/30 text-gray-500 hover:text-gold hover:border-gold/50'}`}>{a}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3 border-l border-emerald-900/20 pl-6">
              <label className="text-[10px] font-cinzel text-gold uppercase tracking-widest font-bold">Forge Custom Path</label>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="A wielder of cosmic decay..." className="w-full bg-black/40 border border-emerald-900/30 p-3 text-[11px] text-gray-300 h-24 outline-none focus:border-gold resize-none leading-relaxed" />
              <button onClick={handleForgeClass} disabled={isForgingClass || !customPrompt} className="w-full py-2.5 bg-gold/10 border border-gold text-gold text-[10px] font-cinzel hover:bg-gold/20 disabled:opacity-30 flex items-center justify-center gap-3 transition-all">
                {isForgingClass ? 'CONSULTING ENGINE...' : 'FORGE NEW PATH'}
              </button>
            </div>
          </div>

          <button onClick={() => setStep(2)} disabled={!name} className="w-full py-4 bg-emerald-900 text-white font-cinzel font-bold border border-gold hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/20">CONTINUE TO ATTRIBUTES</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center bg-emerald-900/10 p-4 border border-emerald-900/30">
            <span className="text-[10px] font-cinzel text-gold font-bold uppercase tracking-[0.2em]">Attribute Points</span>
            <span className={`text-lg font-bold ${usedPoints > maxPoints ? 'text-red-500' : 'text-gold'}`}>{maxPoints - usedPoints} Available</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(Object.keys(stats) as Array<keyof Stats>).map(s => {
              const isRecommended = recommendedForArch.includes(s);
              return (
                <div key={s} className={`flex flex-col p-4 bg-black/40 border transition-all relative ${isRecommended ? 'border-gold shadow-[0_0_15px_rgba(161,98,7,0.15)]' : 'border-emerald-900/20'}`}>
                  {isRecommended && <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gold text-black text-[8px] px-2 py-0.5 font-bold font-cinzel border border-black uppercase z-10">Primary</span>}
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-[10px] font-cinzel uppercase font-bold tracking-widest ${isRecommended ? 'text-gold' : 'text-gold/60'}`}>{s}</span>
                    <span className="text-xs text-emerald-500 font-bold">+{RACIAL_BONUSES[race][s] || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleStatChange(s, -1)} className="w-10 h-10 border border-emerald-900/30 bg-black/20 text-emerald-500 flex items-center justify-center font-bold text-xl active:scale-90 transition-all">-</button>
                    <span className="text-2xl font-bold text-white">{stats[s]}</span>
                    <button onClick={() => handleStatChange(s, 1)} className="w-10 h-10 border border-emerald-900/30 bg-black/20 text-emerald-500 flex items-center justify-center font-bold text-xl active:scale-90 transition-all">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(1)} className="flex-1 py-4 border border-emerald-900 font-cinzel text-emerald-500 font-bold uppercase hover:bg-emerald-900 hover:text-white transition-all">Back</button>
            <button onClick={() => setStep(3)} disabled={usedPoints < maxPoints} className="flex-[2] py-4 bg-emerald-900 text-white font-cinzel border border-gold font-bold uppercase hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/20">FINALIZE SOUL</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
          <div className="flex justify-between items-center bg-gold/5 p-4 border border-gold/20">
             <div className="min-w-0">
               <h3 className="text-[10px] font-cinzel text-gold font-bold uppercase tracking-widest">Soul Weaver</h3>
               <p className="text-[9px] text-gray-500 italic mt-0.5">Let the Engine manifest thy history.</p>
             </div>
             <button onClick={handleForgeLore} disabled={isForgingLore} className="px-4 py-2 bg-gold/10 border border-gold text-gold font-cinzel text-[10px] hover:bg-gold/20 transition-all disabled:opacity-30 font-bold uppercase tracking-tighter">
               {isForgingLore ? 'WEAVING...' : 'MANIFEST LORE'}
             </button>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-cinzel text-emerald-500 uppercase font-bold tracking-widest">Visual Manifestation</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe thy physical form..." className="w-full bg-black/40 border border-emerald-900/30 p-3 text-xs text-gray-300 h-28 outline-none focus:border-gold resize-none leading-relaxed" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-cinzel text-emerald-500 uppercase font-bold tracking-widest">Chronicle History</label>
            <textarea value={biography} onChange={e => setBiography(e.target.value)} placeholder="Record thy journey..." className="w-full bg-black/40 border border-emerald-900/30 p-4 text-xs text-gray-300 h-48 outline-none focus:border-gold resize-none leading-relaxed" />
          </div>
          <div className="flex gap-4">
             <button onClick={() => setStep(2)} className="flex-1 py-4 border border-emerald-900 font-cinzel text-emerald-500 font-bold uppercase hover:bg-emerald-900 hover:text-white transition-all">Back</button>
             <button onClick={finalize} className="flex-[3] py-4 bg-emerald-900 text-white font-cinzel font-bold border border-gold shadow-2xl shadow-emerald-900/50 transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-widest">BIND SOUL TO ENGINE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;
