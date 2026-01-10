
import React, { useState, useMemo } from 'react';
import { Character } from '../types';
import { TUTORIAL_SCENARIO } from '../constants';

interface TutorialScreenProps {
  characters: Character[];
  mentors: Character[];
  onComplete: (partyIds: string[], campaignTitle: string, campaignPrompt: string) => void;
}

const TutorialScreen: React.FC<TutorialScreenProps> = ({ characters, mentors, onComplete }) => {
  const [step, setStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome, Neophyte",
      content: "You have arrived at the Mythos Engine—a dark realm where thy soul ascends from Level 1 to the ultimate Level 20 cap.",
    },
    {
      title: "The Arbiter's Pulse",
      content: "The Arbiter balances all challenges for a party of 4 vessels. Thy mentors will scale their power to match thine once thou hast reached Level 5.",
    },
    {
      title: "The Scribe's Audit",
      content: "Death is real. Strategy is paramount. The void does not care if thou art alone; encounters remain balanced for a full fellowship.",
    },
    {
      title: "Ascension Peak",
      content: "At Level 15 and 20, thou shalt unlock Manifestations of world-altering power. Thy journey to godhood begins now.",
    },
    {
      title: "The Final Test",
      content: "Defeat the Void-Sent Sentinel to prove thy worth. Success shall surge thy resonance, leaping thee and thy party directly to Level 5.",
    }
  ];

  const current = tutorialSteps[step];

  const pathMentor = useMemo(() => {
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    if (primaryChar) {
      const match = mentors.find(m => m.archetype === primaryChar.archetype && !baseMentorNames.includes(m.name));
      if (match) return match;
    }
    return mentors.find(m => !baseMentorNames.includes(m.name)) || mentors[0];
  }, [characters, mentors]);

  const finalPartyIds = useMemo(() => {
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    const baseIds = mentors.filter(m => baseMentorNames.includes(m.name)).map(m => m.id);
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];
    const partySet = new Set([...baseIds]);
    if (pathMentor) partySet.add(pathMentor.id);
    if (primaryChar) partySet.add(primaryChar.id);
    return Array.from(partySet).slice(0, 5);
  }, [characters, mentors, pathMentor]);

  const finalize = () => {
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];
    const mentorFlavor = pathMentor ? `${pathMentor.name} (the ${pathMentor.archetype})` : "thy chosen mentor";

    const customPrompt = `Thou awakenest in the obsidian silence. The **VOID-SENT SENTINEL**, a construct of shadow and screaming aether, stands between thee and the exit of the Sunken Sanctuary.

Lina, Seris, and ${mentorFlavor} are exhausted. Miri is bleeding. The Sentinel raises its blade of pure negation.

**THE FINAL TRIAL**
Defeat this horror. If thou succeedest, thy collective soul shall surge with Level 5 resonance. How dost thou strike?`;

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
             {step < tutorialSteps.length - 1 ? 'CONTINUE' : 'FACE THE SENTINEL'}
           </button>
        </div>
      </div>
    </div>
  );
};
export default TutorialScreen;
