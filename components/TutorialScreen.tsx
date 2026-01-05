
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
      title: "The Guardians",
      content: "A fellowship of legendary souls awaits to mentor you. They are your initial party, guiding you until your own soul finds strength.",
    },
    {
      title: "The Sacred Trial",
      content: "Combat is a tactical dance. To begin your journey, we recommend the 'Trial of Resonance'—a guided experience to learn the laws of steel and aether.",
    }
  ];

  const current = tutorialSteps[step];

  const finalPartyIds = useMemo(() => {
    // Standard tutorial trio
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    const baseIds = MENTORS.filter(m => baseMentorNames.includes(m.name)).map(m => m.id);
    
    // Add mentors that match the user's current characters
    const matchingMentorIds = characters.map(pc => {
        return MENTORS.find(m => m.archetype === pc.archetype)?.id;
    }).filter((id): id is string => !!id);

    // Ensure unique IDs
    return Array.from(new Set([...baseIds, ...matchingMentorIds]));
  }, [characters]);

  const finalize = () => {
    onComplete(finalPartyIds, TUTORIAL_SCENARIO.title, TUTORIAL_SCENARIO.prompt);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <div className="max-w-xl w-full rune-border bg-black shadow-[0_0_50px_rgba(127,29,29,0.3)] p-8 space-y-8 flex flex-col items-center">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-cinzel text-gold animate-in zoom-in duration-500">{current.title}</h2>
          <div className="h-0.5 w-12 bg-red-900 mx-auto" />
          <p className="text-gray-400 text-sm leading-relaxed min-h-[80px] flex items-center">{current.content}</p>
        </div>

        <div className="flex items-center justify-between w-full pt-4 border-t border-red-900/20">
           <div className="flex gap-1">
             {tutorialSteps.map((_, i) => (
               <div key={i} className={`h-0.5 w-4 rounded-full transition-all ${step === i ? 'bg-gold' : 'bg-red-900/20'}`} />
             ))}
           </div>
           <button 
             onClick={() => step < tutorialSteps.length - 1 ? setStep(step + 1) : finalize()}
             className="px-6 py-2 bg-red-900 text-white font-cinzel text-xs border border-gold hover:bg-red-800 transition-all"
           >
             {step < tutorialSteps.length - 1 ? 'CONTINUE' : 'INITIATE TRIAL'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialScreen;
