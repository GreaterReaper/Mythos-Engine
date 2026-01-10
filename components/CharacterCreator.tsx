import React, { useState, useMemo } from 'react';
import { Character, Race, Archetype, Stats, Ability, Item, ArchetypeInfo, Currency, Role } from '../types';
import { POINT_BUY_COSTS, RACIAL_BONUSES, ARCHETYPE_INFO, RECOMMENDED_STATS } from '../constants';
import { generateCustomClass, safeId, manifestSoulLore, generateItemDetails } from '../geminiService';

interface CharacterCreatorProps {
  onCancel: () => void;
  onCreate: (char: Character, newItems: Item[]) => void;
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
  const [isForgingLore, setIsForgingLore] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isForgingClass, setIsForgingClass] = useState(false);
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
      alert("The mists are too thick.");
    } finally {
      setIsForgingLore(false);
    }
  };

  const finalize = async () => {
    const conMod = Math.floor((finalStats.con - 10) / 2);
    let hpDie = 8;
    let role: Role = 'DPS';
    let baseAbilities: Ability[] = [];
    let baseSpells: Ability[] = [];
    let starterGearNames: string[] = [];

    const customMatch = customArchetypes.find(a => a.name === archetype);
    const defaultMatch = ARCHETYPE_INFO[archetype as Archetype];

    if (customMatch) {
      hpDie = customMatch.hpDie;
      role = customMatch.role;
      baseAbilities = customMatch.coreAbilities.filter(a => a.levelReq <= 1);
      baseSpells = (customMatch.spells || []).filter(s => s.levelReq <= 1);
      starterGearNames = ['Fledgling Gear'];
    } else if (defaultMatch) {
      hpDie = defaultMatch.hpDie;
      role = defaultMatch.role;
      baseAbilities = defaultMatch.coreAbilities.filter(a => a.levelReq <= 1);
      baseSpells = (defaultMatch.spells || []).filter(s => s.levelReq <= 1);
      starterGearNames = defaultMatch.starterGear;
    }

    const startHp = hpDie + conMod;
    const startMana = role === 'Support' ? 50 : role === 'DPS' ? 40 : 30;

    const inventory: Item[] = [];
    for (const gearName of starterGearNames) {
      const details = await generateItemDetails(gearName, `Starter gear for ${archetype}`);
      inventory.push({
        id: safeId(),
        name: details.name || gearName,
        description: details.description || "Forged for the journey.",
        type: (details.type as any) || (gearName.toLowerCase().includes('armor') || gearName.toLowerCase().includes('plate') || gearName.toLowerCase().includes('robe') ? 'Armor' : 'Weapon'),
        rarity: 'Common',
        stats: details.stats || {}
      });
    }

    const newChar: Character = {
      id: safeId(),
      name, age, gender, race, archetype, role,
      level: 1, exp: 0, maxHp: startHp, currentHp: startHp,
      maxMana: startMana, currentMana: startMana,
      stats: finalStats, currency: { aurels: 25 },
      inventory, equippedIds: inventory.map(i => i.id), spells: baseSpells,
      abilities: baseAbilities, activeStatuses: [],
      description, biography, asiPoints: 0
    };
    onCreate(newChar, inventory);
  };

  const allArchetypes = useMemo(() => {
    const defaults = Object.values(Archetype).filter(a => a !== Archetype.Custom);
    const customs = customArchetypes.map(a => a.name);
    return [...defaults, ...customs];
  }, [customArchetypes]);

  const activeRacialBonuses = RACIAL_BONUSES[race];

  return (
    <div className="rune-border p-5 md:p-8 bg-black/70 backdrop-blur-xl max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 border-emerald-900/60">
      <div className="flex justify-between items-center border-b border-emerald-900/50 pb-3">
        <h2 className="text-2xl md:text-3xl font-cinzel text-gold drop-shadow-lg font-black uppercase">Soul Forging</h2>
        <button onClick={onCancel} className="text-emerald-500 text-[10px] md:text-xs font-black uppercase tracking-widest border border-emerald-900/30 px-3 py-1 hover:bg-emerald-900 hover:text-white transition-all">Cancel</button>
      </div>

      {step === 1 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-black">Aetheric Identity</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nameless Soul..." className="w-full bg-black/40 border border-emerald-900/30 p-3 text-gold font-cinzel text-sm focus:border-gold outline-none transition-all placeholder:text-emerald-900/30" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-black">Vessel Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-[46px] bg-black/40 border border-emerald-900/30 px-3 text-gold outline-none text-xs font-cinzel cursor-pointer hover:border-gold transition-colors font-bold">
                    <option>Female</option><option>Male</option><option>Unknown</option>
                  </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-black">Vocation</label>
                   <select value={archetype} onChange={e => setArchetype(e.target.value)} className="w-full h-[46px] bg-black/40 border border-emerald-900/30 px-3 text-gold outline-none text-xs font-cinzel font-bold">
                     {allArchetypes.map(a => <option key={a} value={a}>{a}</option>)}
                   </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-black">Ancestry (Race)</label>
                <select value={race} onChange={e => setRace(e.target.value as Race)} className="w-full h-[46px] bg-black/40 border border-emerald-900/30 px-3 text-gold outline-none text-xs font-cinzel cursor-pointer hover:border-gold transition-colors font-bold">
                  {Object.values(Race).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-emerald-900/5 border border-emerald-900/20 rounded shadow-inner">
                <h4 className="text-[9px] font-cinzel text-emerald-500 uppercase font-black mb-2 tracking-widest border-b border-emerald-900/20 pb-1">Inherited Traits</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(activeRacialBonuses).map(([stat, bonus]) => (
                    <div key={stat} className="flex items-center gap-1.5 bg-black/40 px-2 py-1 border border-emerald-900/20 rounded">
                      <span className="text-[8px] text-gray-500 font-black uppercase">{stat}</span>
                      <span className="text-[10px] text-emerald-400 font-black">+{bonus}</span>
                    </div>
                  ))}
                  {Object.keys(activeRacialBonuses).length === 0 && <span className="text-[10px] text-gray-600 italic">No primary bonuses detected.</span>}
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setStep(2)} disabled={!name} className="w-full py-5 bg-emerald-900 text-white font-cinzel font-black border-2 border-gold hover:bg-emerald-800 disabled:opacity-30 transition-all shadow-2xl uppercase tracking-widest active:scale-95">CONTINUE TO ATTRIBUTES</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center bg-emerald-900/10 p-4 border border-emerald-900/30 rounded shadow-xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-cinzel text-gold font-black uppercase tracking-[0.2em]">Attribute Points</span>
              <span className="text-[8px] text-emerald-500/60 uppercase font-black">Standard Fantasy Protocol</span>
            </div>
            <span className={`text-2xl font-black ${usedPoints > maxPoints ? 'text-red-500' : 'text-gold'}`}>{maxPoints - usedPoints} Available</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(Object.keys(stats) as Array<keyof Stats>).map(s => {
              const bonus = activeRacialBonuses[s] || 0;
              return (
                <div key={s} className="flex flex-col p-4 bg-black/40 border border-emerald-900/20 rounded group hover:border-emerald-500 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-cinzel uppercase font-black tracking-widest text-gold/60">{s}</span>
                    {bonus > 0 && <span className="text-[9px] text-emerald-500 font-black">+{bonus} Race</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleStatChange(s, -1)} className="w-10 h-10 border border-emerald-900/30 bg-black/20 text-emerald-500 hover:bg-emerald-900/20 transition-all text-xl font-black rounded">-</button>
                    <div className="text-center">
                      <span className="text-2xl font-black text-white">{stats[s]}</span>
                      <p className="text-[8px] text-gray-500 uppercase font-bold">Base</p>
                    </div>
                    <button onClick={() => handleStatChange(s, 1)} className="w-10 h-10 border border-emerald-900/30 bg-black/20 text-emerald-500 hover:bg-emerald-900/20 transition-all text-xl font-black rounded">+</button>
                  </div>
                  <div className="mt-3 pt-2 border-t border-emerald-900/10 text-center">
                    <span className="text-xs font-black text-emerald-400">Total: {stats[s] + bonus}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => setStep(3)} disabled={usedPoints < maxPoints} className="w-full py-5 bg-emerald-900 text-white font-cinzel border-2 border-gold font-black uppercase hover:bg-emerald-800 disabled:opacity-30 transition-all shadow-2xl tracking-widest active:scale-95">FINALIZE SOUL</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={handleForgeLore} disabled={isForgingLore} className="flex-1 py-4 bg-gold/10 border border-gold text-gold font-cinzel text-[10px] font-black hover:bg-gold/20 disabled:opacity-30 uppercase tracking-widest transition-all">
                {isForgingLore ? 'WEAVING FROM THE VOID...' : 'MANIFEST LORE & STARTER GEAR'}
              </button>
            </div>
            <textarea value={biography} onChange={e => setBiography(e.target.value)} placeholder="History shall be written here..." className="w-full bg-black/40 border border-emerald-900/30 p-5 text-xs text-gray-300 h-48 outline-none focus:border-gold resize-none leading-relaxed font-medium rounded custom-scrollbar shadow-inner" />
          </div>
          <button onClick={finalize} className="w-full py-5 bg-emerald-900 text-white font-cinzel font-black border-2 border-gold shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.01] active:scale-95 uppercase tracking-[0.2em]">BIND SOUL TO ENGINE</button>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;