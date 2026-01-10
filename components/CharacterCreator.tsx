import React, { useState, useMemo } from 'react';
import { Character, Race, Archetype, Stats, Ability, Item, ArchetypeInfo, Currency, Role } from '../types';
import { POINT_BUY_COSTS, RACIAL_BONUSES, ARCHETYPE_INFO, RECOMMENDED_STATS } from '../constants';
import { safeId, manifestSoulLore, generateItemDetails } from '../geminiService';

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

  const usedPoints = useMemo(() => {
    return (Object.keys(stats) as Array<keyof Stats>).reduce((acc, key) => acc + (POINT_BUY_COSTS[stats[key as keyof Stats]] || 0), 0);
  }, [stats]);

  const maxPoints = 27;

  const handleStatChange = (stat: keyof Stats, delta: number) => {
    const newVal = stats[stat] + delta;
    if (newVal < 8 || newVal > 15) return;
    const costDiff = (POINT_BUY_COSTS[newVal] || 0) - (POINT_BUY_COSTS[stats[stat]] || 0);
    if (usedPoints + costDiff > maxPoints) return;
    setStats({ ...stats, [stat]: newVal });
  };

  const activeRacialBonuses = RACIAL_BONUSES[race] || {};

  const finalStats = useMemo(() => {
    return (Object.keys(stats) as Array<keyof Stats>).reduce((acc, key) => {
      acc[key] = stats[key] + (activeRacialBonuses[key] || 0);
      return acc;
    }, {} as Stats);
  }, [stats, activeRacialBonuses]);

  const handleForgeLore = async () => {
    setIsForgingLore(true);
    try {
      const lore = await manifestSoulLore({ name, race, archetype, level: 1, age, gender });
      setBiography(lore.biography || "A wanderer from the outer mists.");
      setDescription(lore.description || "A vessel of untapped potential.");
    } catch (e) {
      alert("The mists of the void are too dense to weave lore today.");
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

    const archInfo = ARCHETYPE_INFO[archetype as Archetype] || customArchetypes.find(a => a.name === archetype);
    if (archInfo) {
      hpDie = archInfo.hpDie;
      role = archInfo.role;
      baseAbilities = archInfo.coreAbilities.filter(a => a.levelReq <= 1);
      baseSpells = (archInfo.spells || []).filter(s => s.levelReq <= 1);
      starterGearNames = (archInfo as any).starterGear || ['Traveling Garb', 'Simple Blade'];
    }

    const startHp = hpDie + conMod;
    const startMana = role === 'Support' ? 50 : 30;

    const inventory: Item[] = [];
    for (const gearName of starterGearNames) {
      const details = await generateItemDetails(gearName, `Starter gear for ${archetype}`);
      inventory.push({
        id: safeId(),
        name: details.name || gearName,
        description: details.description || "Forged for the journey.",
        type: (details.type as any) || (gearName.toLowerCase().includes('armor') ? 'Armor' : 'Weapon'),
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

  const allArchetypes = [...Object.values(Archetype).filter(a => a !== Archetype.Custom), ...customArchetypes.map(a => a.name)];

  return (
    <div className="rune-border p-6 md:p-8 bg-black/80 backdrop-blur-xl max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 border-emerald-900/60">
      <div className="flex justify-between items-center border-b border-emerald-900/50 pb-4">
        <h2 className="text-2xl md:text-3xl font-cinzel text-gold font-black uppercase">Soul Forging</h2>
        <button onClick={onCancel} className="text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-900/30 px-3 py-1 hover:bg-emerald-900 hover:text-white transition-all">Cancel</button>
      </div>

      {step === 1 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-black">Aetheric Identity</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nameless Soul..." className="w-full bg-black/40 border border-emerald-900/30 p-3 text-gold font-cinzel text-sm focus:border-gold outline-none transition-all" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-black">Vessel Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-black/40 border border-emerald-900/30 px-3 py-2.5 text-gold outline-none text-xs font-cinzel font-bold">
                    <option>Female</option><option>Male</option><option>Unknown</option>
                  </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-black">Vocation</label>
                   <select value={archetype} onChange={e => setArchetype(e.target.value)} className="w-full bg-black/40 border border-emerald-900/30 px-3 py-2.5 text-gold outline-none text-xs font-cinzel font-bold">
                     {allArchetypes.map(a => <option key={a} value={a}>{a}</option>)}
                   </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-cinzel text-emerald-500 uppercase tracking-widest font-black">Ancestry (Race)</label>
                <select value={race} onChange={e => setRace(e.target.value as Race)} className="w-full bg-black/40 border border-emerald-900/30 px-3 py-2.5 text-gold outline-none text-xs font-cinzel font-bold">
                  {Object.values(Race).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="p-4 bg-emerald-900/5 border border-emerald-900/20 rounded">
                <h4 className="text-[9px] font-cinzel text-emerald-500 uppercase font-black mb-2 border-b border-emerald-900/20 pb-1">Inherited Traits</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(activeRacialBonuses).map(([stat, bonus]) => (
                    <div key={stat} className="flex items-center gap-1.5 bg-black/60 px-2 py-1 border border-emerald-900/20 rounded-sm">
                      <span className="text-[8px] text-gray-500 font-black uppercase">{stat}</span>
                      <span className="text-[10px] text-emerald-400 font-black">+{bonus}</span>
                    </div>
                  ))}
                  {Object.keys(activeRacialBonuses).length === 0 && <span className="text-[10px] text-gray-600 italic">No primary bonuses detected.</span>}
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setStep(2)} disabled={!name} className="w-full py-5 bg-emerald-900 text-white font-cinzel font-black border-2 border-gold hover:bg-emerald-800 disabled:opacity-30 transition-all uppercase tracking-widest shadow-2xl active:scale-[0.98]">CONTINUE TO ATTRIBUTES</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center bg-emerald-900/10 p-4 border border-emerald-900/30 rounded">
            <span className="text-[10px] font-cinzel text-gold font-black uppercase tracking-[0.2em]">Attribute Points</span>
            <span className={`text-2xl font-black ${usedPoints > maxPoints ? 'text-red-500' : 'text-gold'}`}>{maxPoints - usedPoints} Available</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(Object.keys(stats) as Array<keyof Stats>).map(s => {
              const bonus = activeRacialBonuses[s] || 0;
              return (
                <div key={s} className="flex flex-col p-4 bg-black/40 border border-emerald-900/20 rounded group hover:border-emerald-500 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-cinzel uppercase font-black text-gold/60">{s}</span>
                    {bonus > 0 && <span className="text-[9px] text-emerald-500 font-black">+{bonus}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleStatChange(s, -1)} className="w-8 h-8 border border-emerald-900/30 text-emerald-500 font-black hover:bg-emerald-900/20 transition-all">-</button>
                    <div className="text-center">
                      <span className="text-2xl font-black text-white">{stats[s]}</span>
                    </div>
                    <button onClick={() => handleStatChange(s, 1)} className="w-8 h-8 border border-emerald-900/30 text-emerald-500 font-black hover:bg-emerald-900/20 transition-all">+</button>
                  </div>
                  <div className="mt-2 text-center text-[9px] font-black text-emerald-400">Result: {stats[s] + bonus}</div>
                </div>
              );
            })}
          </div>
          <button onClick={() => setStep(3)} disabled={usedPoints < maxPoints} className="w-full py-5 bg-emerald-900 text-white font-cinzel border-2 border-gold font-black uppercase hover:bg-emerald-800 disabled:opacity-30 transition-all tracking-widest active:scale-[0.98]">FINALIZE SOUL</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="space-y-4">
            <button onClick={handleForgeLore} disabled={isForgingLore} className="w-full py-4 bg-gold/10 border border-gold text-gold font-cinzel text-[10px] font-black hover:bg-gold/20 disabled:opacity-30 uppercase tracking-widest transition-all">
              {isForgingLore ? 'WEAVING FROM THE VOID...' : 'MANIFEST LORE & STARTER GEAR'}
            </button>
            <textarea value={biography} onChange={e => setBiography(e.target.value)} placeholder="History shall be written here..." className="w-full bg-black/40 border border-emerald-900/30 p-5 text-xs text-gray-300 h-48 outline-none focus:border-gold resize-none leading-relaxed font-medium rounded custom-scrollbar" />
          </div>
          <button onClick={finalize} className="w-full py-5 bg-emerald-900 text-white font-cinzel font-black border-2 border-gold shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.01] active:scale-[0.98] uppercase tracking-[0.2em]">BIND SOUL TO ENGINE</button>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;