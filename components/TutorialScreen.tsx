
import React, { useState } from 'react';
import { MENTORS, STARTER_CAMPAIGN_PROMPT } from '../constants';

interface TutorialScreenProps {
  onComplete: (partyIds: string[], campaignTitle: string, campaignPrompt: string) => void;
}

const TutorialScreen: React.FC<TutorialScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome, Neophyte",
      content: "You have arrived at the Mythos Engine—a dark realm where story is written in blood. The Gemini 3 Pro AI serves as your Dungeon Master.",
    },
    {
      title: "The Guardians",
      content: "Three guardians await to mentor you: Miri (Fighter), Lina (Mage), and Seris (Archer). They are your initial party, guiding you until your own soul finds strength.",
    },
    {
      title: "Sacred Rite",
      content: "Combat is a tactical dance. Growth requires EXP, granted solely by the DM's favor. Your soul persists between all Chronicles you endure.",
    }
  ];

  const current = tutorialSteps[step];

  const finalize = () => {
    // Select Lina, Miri, Seris IDs explicitly
    const partyIds = MENTORS.filter(m => ['Lina', 'Miri', 'Seris'].includes(m.name)).map(m => m.id);
    onComplete(partyIds, "The Broken Cask", STARTER_CAMPAIGN_PROMPT);
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
             {step < tutorialSteps.length - 1 ? 'CONTINUE' : 'INITIATE BINDING'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialScreen;
