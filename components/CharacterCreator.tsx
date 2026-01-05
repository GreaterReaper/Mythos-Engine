
import React, { useState, useMemo } from 'react';
import { Character, Race, Archetype, Stats, Ability, Item, ArchetypeInfo } from '../types';
import { POINT_BUY_COSTS, RACIAL_BONUSES, ARCHETYPE_INFO, SPELL_SLOT_PROGRESSION, INITIAL_ITEMS, RECOMMENDED_STATS } from '../constants';
import { generateVisual, generateCustomClass, safeId } from '../geminiService';

interface CharacterCreatorProps {
  onCancel: () => void;
  onCreate: (char: Character) => void;
  customArchetypes: ArchetypeInfo[];
  onSaveCustomArchetype: (arch: ArchetypeInfo) => void;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onCancel, onCreate, customArchetypes, onSaveCustomArchetype }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState(21);
  const [gender, setGender] = useState('Female');
  const [race, setRace] = useState<Race>(Race.Human);
  const [archetype, setArchetype] = useState<Archetype | string>(Archetype.Warrior);
  const [stats, setStats] = useState<Stats>({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
  const [description, setDescription] = useState('');
  const [biography, setBiography] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isForgingClass, setIsForgingClass] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  
  const [previewClassData, setPreviewClassData] = useState<ArchetypeInfo | null>(null);

  const usedPoints = useMemo(() => {
    return (Object.keys(stats) as Array<keyof Stats>).reduce((acc, key) => acc + (POINT_BUY_COSTS[stats[key]] || 0), 0);
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
      onSaveCustomArchetype(previewClassData);
      setArchetype(previewClassData.name);
      setPreviewClassData(null);
      setCustomPrompt('');
    }
  };

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    const promptText = `${gender} ${race} ${archetype}, wearing tier-appropriate gear, dark fantasy: ${description}`;
    const url = await generateVisual(promptText);
    if (url) setImageUrl(url);
    setIsGenerating(false);
  };

  const finalize = () => {
    const conMod = Math.floor((finalStats.con - 10) / 2);
    
    let hpDie = 8;
    let baseAbilities: Ability[] = [];
    let baseSpells: Ability[] = [];
    let inventory: Item[] = [];

    const customMatch = customArchetypes.find(a => a.name === archetype);
    const defaultMatch = ARCHETYPE_INFO[archetype as Archetype];

    if (customMatch) {
      hpDie = customMatch.hpDie;
      baseAbilities = customMatch.coreAbilities;
      baseSpells = customMatch.spells || [];
      if (customMatch.startingItem) {
        inventory = [{
          ...customMatch.startingItem as Item,
          id: safeId(),
          archetypes: [customMatch.name]
        }];
      }
    } else if (defaultMatch) {
      hpDie = defaultMatch.hpDie;
      baseAbilities = defaultMatch.coreAbilities;
      baseSpells = defaultMatch.spells || [];
      // Add standard starting gear
      const classGear = INITIAL_ITEMS.filter(i => i.archetypes?.includes(archetype as Archetype));
      inventory = classGear.filter(i => i.rarity === 'Common').map(i => ({...i, id: safeId()}));
    }

    const startHp = hpDie + conMod;
    
    const initialSlots = SPELL_SLOT_PROGRESSION[1];
    const isCaster = [Archetype.Sorcerer, Archetype.Mage, Archetype.DarkKnight].includes(archetype as Archetype) || baseSpells.length > 0;

    const newChar: Character = {
      id: safeId(),
      name,
      age,
      gender,
      race,
      archetype,
      level: 1,
      exp: 0,
      maxHp: startHp,
      currentHp: startHp,
      stats: finalStats,
      inventory,
      spells: baseSpells,
      abilities: baseAbilities,
      spellSlots: isCaster ? initialSlots : undefined,
      maxSpellSlots: isCaster ? initialSlots : undefined,
      description,
      biography,
      imageUrl: imageUrl || `https://picsum.photos/seed/${name}/400/600`,
      asiPoints: 0
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
    <div className="rune-border p-6 bg-black/60 backdrop-blur max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-red-900 pb-2">
        <h2 className="text-2xl font-cinzel text-gold">Soul Forging</h2>
        <button onClick={onCancel} className="text-red-900 text-xs uppercase tracking-tighter">Cancel</button>
      </div>

      {previewClassData && (
        <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4">
          <div className="max-w-xl w-full rune-border bg-[#0c0a09] p-8 space-y-6 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-3xl font-cinzel text-gold border-b border-red-900 pb-2">The Forged Path: {previewClassData.name}</h2>
            <p className="text-xs text-gray-400 italic leading-relaxed">{previewClassData.description}</p>
            <div className="grid grid-cols-2 gap-4 text-[10px] font-cinzel text-red-900 uppercase">
              <span>Vitality: d{previewClassData.hpDie}</span>
              {previewClassData.startingItem && <span>Initiation Gift: {previewClassData.startingItem.name}</span>}
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xs font-cinzel text-gold border-b border-gold/20">Themed Armory Additions</h3>
              <div className="grid grid-cols-1 gap-2">
                {previewClassData.themedItems?.map((item, i) => (
                  <div key={i} className="text-[9px] bg-red-900/10 p-1.5 border border-red-900/20 flex justify-between">
                    <span className="text-gold uppercase font-bold">{item.name}</span>
                    <span className="text-gray-500 uppercase">{item.rarity} {item.type}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-xs font-cinzel text-gold border-b border-gold/20">Aetheric Manifestations ({previewClassData.spells?.length || 0} Spells)</h3>
              {previewClassData.coreAbilities.map((ab, i) => (
                <div key={i} className="bg-red-900/5 p-2 border-l border-red-900">
                  <p className="text-[10px] font-bold text-red-900 uppercase">{ab.name} [{ab.type}]</p>
                  <p className="text-[10px] text-gray-500">{ab.description}</p>
                </div>
              ))}
              <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                {previewClassData.spells?.map((sp, i) => (
                  <div key={i} className="bg-blue-900/5 p-2 border-l-2 border-blue-900">
                    <p className="text-[10px] font-bold text-blue-900 uppercase">{sp.name} [Lvl {sp.baseLevel} Spell]</p>
                    <p className="text-[10px] text-gray-500">{sp.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setPreviewClassData(null)} className="flex-1 py-3 border border-red-900 text-red-900 font-cinzel text-xs">RE-FORGE</button>
              <button onClick={acceptForgedPath} className="flex-[2] py-3 bg-red-900 text-white font-cinzel border border-gold text-xs shadow-lg shadow-red-900/40">ACCEPT THIS DESTINY</button>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-cinzel text-red-900 uppercase">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-red-900/30 p-2 text-gold font-cinzel text-sm focus:border-gold outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-cinzel text-red-900 uppercase">Chronicle Age</label>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setAge(Math.max(0, age - 1))}
                  className="w-10 h-10 border border-red-900/30 bg-black/40 text-gold flex items-center justify-center hover:bg-red-900/20 active:scale-90 transition-all"
                >-</button>
                <input 
                  type="number" 
                  value={age} 
                  onChange={e => setAge(Math.max(0, parseInt(e.target.value) || 0))} 
                  className="flex-1 bg-black/40 border border-red-900/30 p-2 text-gold outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                />
                <button 
                  onClick={() => setAge(age + 1)}
                  className="w-10 h-10 border border-red-900/30 bg-black/40 text-gold flex items-center justify-center hover:bg-red-900/20 active:scale-90 transition-all"
                >+</button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-cinzel text-red-900 uppercase">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-black/40 border border-red-900/30 p-2 text-gold outline-none">
                <option>Female</option>
                <option>Male</option>
                <option>Unknown</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-cinzel text-red-900 uppercase">Ancestry</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
              {Object.values(Race).map(r => (
                <button key={r} onClick={() => setRace(r)} className={`p-1.5 border text-[10px] font-cinzel transition-all ${race === r ? 'bg-red-900 border-gold text-white' : 'border-red-900/30 text-gray-500'}`}>{r}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-cinzel text-red-900 uppercase">Vocation</label>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {allArchetypes.map(a => (
                  <button key={a} onClick={() => { setArchetype(a); }} className={`p-1.5 border text-[10px] font-cinzel transition-all truncate ${archetype === a ? 'bg-red-900 border-gold text-white' : 'border-red-900/30 text-gray-500 hover:text-gold'}`}>{a}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2 border-l border-red-900/20 pl-4">
              <label className="text-[10px] font-cinzel text-gold uppercase tracking-widest">Forge Custom Path</label>
              <textarea 
                value={customPrompt} 
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="A wielder of lightning and shadows..."
                className="w-full bg-black/40 border border-red-900/30 p-2 text-[10px] text-gray-300 h-16 outline-none focus:border-gold resize-none"
              />
              <button 
                onClick={handleForgeClass} 
                disabled={isForgingClass || !customPrompt}
                className="w-full py-1.5 bg-gold/10 border border-gold text-gold text-[10px] font-cinzel hover:bg-gold/20 disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {isForgingClass ? <div className="w-2 h-2 bg-gold animate-ping rounded-full" /> : null}
                {isForgingClass ? 'CONSULTING ENGINE...' : 'FORGE NEW PATH'}
              </button>
            </div>
          </div>

          <button onClick={() => setStep(2)} disabled={!name} className="w-full py-3 bg-red-900 text-white font-cinzel border border-gold hover:bg-red-800 disabled:opacity-50">Continue to Attributes</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-red-900/5 p-2 border border-red-900/20">
            <span className="text-[10px] font-cinzel text-red-900">ATTRIBUTE POINTS</span>
            <span className={`text-sm font-bold ${usedPoints > maxPoints ? 'text-red-500' : 'text-gold'}`}>{maxPoints - usedPoints} Available</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(stats) as Array<keyof Stats>).map(s => {
              const isRecommended = recommendedForArch.includes(s);
              return (
                <div key={s} className={`flex flex-col p-2 bg-black/40 border transition-all relative ${isRecommended ? 'border-gold shadow-[0_0_10px_rgba(161,98,7,0.2)]' : 'border-red-900/20'}`}>
                  {isRecommended && <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-gold text-black text-[7px] px-1 font-bold font-cinzel border border-black uppercase z-10">Primary</span>}
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-cinzel uppercase ${isRecommended ? 'text-gold' : 'text-gold/60'}`}>{s}</span>
                    <span className="text-xs text-red-500">+{RACIAL_BONUSES[race][s] || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleStatChange(s, -1)} className="w-10 h-10 border border-red-900/30 bg-black/20 text-red-900 flex items-center justify-center active:scale-90 transition-all">-</button>
                    <span className="text-xl font-bold">{stats[s]}</span>
                    <button onClick={() => handleStatChange(s, 1)} className="w-10 h-10 border border-red-900/30 bg-black/20 text-red-900 flex items-center justify-center active:scale-90 transition-all">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border border-red-900 font-cinzel text-red-900">Back</button>
            <button onClick={() => setStep(3)} disabled={usedPoints < maxPoints} className="flex-[2] py-3 bg-red-900 text-white font-cinzel border border-gold">Finalize Soul</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-cinzel text-red-900 uppercase">Visual Description (AI Prompt)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Describe thy appearance for the Engine to manifest..."
                  className="w-full bg-black/40 border border-red-900/30 p-2 text-xs text-gray-300 h-24 outline-none focus:border-gold resize-none" 
                />
              </div>
              <button onClick={handleGenerateImage} disabled={isGenerating || !description} className="w-full py-2 border border-gold text-gold text-[10px] font-cinzel hover:bg-gold/10 disabled:opacity-50 transition-all">
                {isGenerating ? 'Manifesting...' : 'Manifest AI Portrait'}
              </button>
            </div>
            <div className="rune-border h-48 flex items-center justify-center bg-black/60 overflow-hidden relative">
              {imageUrl ? (
                <img src={imageUrl} alt="Portrait" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <span className="text-[10px] font-cinzel text-red-900/20 uppercase block">Aether Empty</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-cinzel text-red-900 uppercase">Detailed Character Lore</label>
            <textarea 
              value={biography} 
              onChange={e => setBiography(e.target.value)} 
              placeholder="Record thy background, motivations, and destiny..."
              className="w-full bg-black/40 border border-red-900/30 p-3 text-xs text-gray-300 h-40 outline-none focus:border-gold resize-none leading-relaxed" 
            />
          </div>

          <button onClick={finalize} className="w-full py-4 bg-red-900 text-white font-cinzel font-bold border border-gold shadow-lg shadow-red-900/30 transition-all hover:scale-[1.01]">
            Bind Soul to Engine
          </button>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;
