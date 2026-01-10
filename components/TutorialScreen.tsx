import React, { useState, useMemo } from 'react';
import { MENTORS, TUTORIAL_SCENARIO } from '../constants';
import { Character } from '../types';

interface TutorialScreenProps {
  characters: Character[];
  onComplete: (partyIds: string[], campaignTitle: string, campaignPrompt: string) => void;
}

const TutorialScreen: React.FC<TutorialScreenProps> = ({ characters, onComplete }) => {
  const [step, setStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome, Neophyte",
      content: "You have arrived at the Mythos Engine—a dark realm powered by the Trinity of Aether. The Engine processes reality through three high-speed Flash protocols.",
    },
    {
      title: "The Arbiter's Pulse",
      content: "The Arbiter (Flash) is thy guide. Optimized for rapid narrative delivery, it weaves the story, roleplays inhabitants, and judges thy actions with cinematic speed.",
    },
    {
      title: "The Scribe's Audit",
      content: "The Mechanical Scribe (Flash) listens to the Arbiter. It audits narrative flow in milliseconds to synchronize thy Vitality, EXP, and Inventory data.",
    },
    {
      title: "The Architect's Forge",
      content: "The Architect (Flash) manifests the unknown. When new horrors or relics are mentioned, the Architect forges their stats and lore with tactical precision.",
    },
    {
      title: "The Fellowship of Five",
      content: "Thy journey begins with the legendary Trio—Lina, Miri, and Seris—alongside a Path-Mentor. Rest is rare; consequences are permanent. Fate moves fast in the Flash tier.",
    }
  ];

  const current = tutorialSteps[step];

  const pathMentor = useMemo(() => {
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    
    if (!primaryChar) return MENTORS.find(m => !baseMentorNames.includes(m.name)) || MENTORS[0];
    
    return MENTORS.find(m => 
      m.archetype === primaryChar.archetype && 
      !baseMentorNames.includes(m.name)
    ) || MENTORS.find(m => !baseMentorNames.includes(m.name)) || MENTORS[0];
  }, [characters]);

  const finalPartyIds = useMemo(() => {
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    const baseIds = MENTORS.filter(m => baseMentorNames.includes(m.name)).map(m => m.id);
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];

    const partySet = new Set([...baseIds]);
    if (pathMentor) partySet.add(pathMentor.id);
    if (primaryChar) partySet.add(primaryChar.id);

    return Array.from(partySet).slice(0, 5);
  }, [characters, pathMentor]);

  const finalize = () => {
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];
    const mentorFlavor = pathMentor 
      ? `${pathMentor.name} (the legendary ${pathMentor.archetype})`
      : "thy chosen mentor";

    const customPrompt = `Thou awakenest in the obsidian silence of the Sunken Sanctuary. A shimmering violet lattice of aetheric chains coils around thy Fellowship. 

Lina (Mage), Seris (Archer), and ${mentorFlavor} lie paralyzed within the magical web, their eyes wide but limbs unresponsive.

Only thou, a fledgling ${primaryChar?.archetype || 'Soul'}, hast managed to resist the total binding. Beside thee, Miri (the Fighter) strains against the violet light, her Frontier Steel Broadsword glowing. With a guttural roar, she shatters her own chains, but the backlash is severe—**Miri takes 15 damage** as the aetheric feedback scorches her armor.

A pack of **Shadow Wolves** and two **Hollow Husks** emerge from the necrotic emerald mists, drawn to the flickering resonance of thy bound companions.

**THE FIRST ACT: AWAKENING**
Thou and the wounded Miri are the only barrier between thy comrades and the coming tide. How dost thou act?`;

    onComplete(finalPartyIds, TUTORIAL_SCENARIO.title, customPrompt);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <div className="max-w-xl w-full rune-border border-emerald-900/60 bg-black shadow-[0_0_50px_rgba(16,185,129,0.15)] p-8 space-y-8 flex flex-col items-center">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-cinzel text-gold animate-in zoom-in duration-500 uppercase font-black">{current.title}</h2>
          <div className="h-0.5 w-12 bg-emerald-900 mx-auto" />
          <p className="text-gray-400 text-sm leading-relaxed min-h-[80px] flex items-center italic font-medium">{current.content}</p>
        </div>

        <div className="flex items-center justify-between w-full pt-4 border-t border-emerald-900/20">
           <div className="flex gap-1">
             {tutorialSteps.map((_, i) => (
               <div key={i} className={`h-1 w-6 rounded-full transition-all duration-500 ${step === i ? 'bg-gold shadow-[0_0_8px_#d4af37]' : 'bg-emerald-950'}`} />
             ))}
           </div>
           <button 
             onClick={() => step < tutorialSteps.length - 1 ? setStep(step + 1) : finalize()}
             className="px-8 py-3 bg-emerald-900 text-white font-cinzel text-[10px] font-black border border-gold hover:bg-emerald-700 transition-all uppercase tracking-widest shadow-xl"
           >
             {step < tutorialSteps.length - 1 ? 'CONTINUE' : 'INITIATE TRIAL'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialScreen;