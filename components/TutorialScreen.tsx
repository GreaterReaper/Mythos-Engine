
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
      content: "You have arrived at the Mythos Engine—a dark realm where story is written in blood. The Gemini 3 Pro AI serves as your Dungeon Master.",
    },
    {
      title: "The Fellowship of Guardians",
      content: "The legendary trio—Lina the Mage, Miri the Fighter, and Seris the Archer—shall bind their souls to thine. Additionally, a specialized Mentor matching thy own path shall join the fray.",
    },
    {
      title: "The Path to Ascension",
      content: "This journey is an epic saga. By the time thou reachest the Engine's heart, thou shalt have ascended to Level 5. Steel thy heart.",
    }
  ];

  const current = tutorialSteps[step];

  const finalPartyIds = useMemo(() => {
    // 1. Mandatory Trio
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    const baseIds = MENTORS.filter(m => baseMentorNames.includes(m.name)).map(m => m.id);
    
    // 2. Class-specific Mentor for the player's primary character (or any local character)
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];
    let classMentorId: string | null = null;
    
    if (primaryChar) {
      const mentor = MENTORS.find(m => m.archetype === primaryChar.archetype);
      if (mentor) {
        classMentorId = mentor.id;
      }
    }

    // 3. Combine and filter unique
    const partySet = new Set([...baseIds]);
    if (classMentorId) partySet.add(classMentorId);
    
    // Add the player's actual character(s) too
    characters.forEach(c => partySet.add(c.id));

    return Array.from(partySet);
  }, [characters]);

  const finalize = () => {
    onComplete(finalPartyIds, TUTORIAL_SCENARIO.title, TUTORIAL_SCENARIO.prompt);
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
