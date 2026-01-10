
import React, { useState, useMemo } from 'react';
import { Character, Role } from '../types';
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
      title: "The Sunken Sanctuary",
      content: "Thou awakenest in a chamber of weeping obsidian. Beside thee stand Miri, Lina, and Seris—the 'Bound Three'. Thy Path Mentor is missing, held by the void cords.",
    },
    {
      title: "The Arbiter's Pulse",
      content: "The Arbiter (Gemini 3 Flash) balances all challenges for thy Fellowship. The world reacts to thy presence. Every shadow holds a sensory detail; every footfall echoes with lore.",
    },
    {
      title: "Exploration & Discovery",
      content: "Between the blood and iron of combat, thou shalt explore the world's ruins. The Scribe audits thy discoveries, automatically manifestion gear or lore from the Architect's forge.",
    },
    {
      title: "The Scribe's Audit",
      content: "The Scribe is always listening. If the Arbiter speaks of damage, death, or discovery, the Scribe audits thy stats in zero-latency Flash time.",
    },
    {
      title: "The Architect's Forge",
      content: "When horrors appear, the Architect manifests their anatomy (Stat Blocks) from the void in real-time, scaling their cruelty to thy party's strength.",
    },
    {
      title: "The Final Ascent",
      content: "Thou must fight through the Sanctuary to free thy Mentor and destroy the Sentinel. Thy resonance shall leap to Level 5 upon the boss's dissolution.",
    }
  ];

  const current = tutorialSteps[step];

  const pathMentor = useMemo(() => {
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    if (primaryChar) {
      // Find a mentor matching the player's class that ISN'T one of the base three
      const match = mentors.find(m => m.archetype === primaryChar.archetype && !baseMentorNames.includes(m.name));
      if (match) return match;
    }
    return mentors.find(m => !baseMentorNames.includes(m.name)) || mentors[0];
  }, [characters, mentors]);

  const initialPartyIds = useMemo(() => {
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    const boundThree = mentors.filter(m => baseMentorNames.includes(m.name)).map(m => m.id);
    const primaryChar = characters.find(c => c.isPrimarySoul) || characters[0];
    const ids = [...boundThree];
    if (primaryChar) ids.push(primaryChar.id);
    return ids;
  }, [characters, mentors]);

  const finalize = () => {
    const mentorName = pathMentor?.name || "Thy Mentor";
    const isSupportMentor = pathMentor?.role === 'Support';

    let branchText = "";
    if (isSupportMentor) {
      branchText = `Seeing ${mentorName} fading within the Negation Shell, Miri lets out a guttural roar. She strikes the crystalline prison with her bare gauntlets, shattering the geometry of the void. The feedback is absolute. 
      
      [SCRIBE_COMMAND: Miri takes 15 damage.]
      
      ${mentorName} is freed, though Miri's hands bleed a thick, silver fluid. The fellowship is complete.`;
    } else {
      branchText = `With a combined effort of blade and spell, the Negation Shell shatters into a thousand shards of silence. ${mentorName} stumbles forward, gasping as the void-cords dissolve. Thy fellowship is complete.`;
    }

    const customPrompt = `The air in the Sunken Sanctuary is cold enough to crack bone. Beside thee stand Miri, Lina, and Seris. 

Ahead, thy mentor ${mentorName} is suspended in a flickering prism of shadow.

${branchText}

[EXPLORATION_BEAT]
Environment: The chamber is a cathedral of ribs, the ceiling lost in a soup of green mist.
Sensory: A smell of copper and old wet stone fills thy lungs. The ribs hum with a low, necrotic frequency.
Hook: A massive set of iron doors etched with runes of 'The Sentinel' stands locked before thee.

Suddenly, the green mist thickens. **VOID-THRALLS** (cr 1) manifest from the very air! They guard the path to the **VOID-SENT SENTINEL** (cr 6).

[ARCHITECT_COMMAND: Forge 3 Void-Thralls for the encounter.]

The first battle of thy chronicle begins now. How dost thou strike?`;

    const finalParty = [...initialPartyIds];
    if (pathMentor) finalParty.push(pathMentor.id);
    
    onComplete(finalParty, "Ascension: The Sunken Sanctuary", customPrompt);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <div className="max-w-xl w-full rune-border border-emerald-900/60 bg-black shadow-[0_0_50px_rgba(16,185,129,0.15)] p-8 space-y-8 flex flex-col items-center">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-cinzel text-gold animate-in zoom-in duration-500 uppercase font-black tracking-tighter">{current.title}</h2>
          <div className="h-0.5 w-12 bg-emerald-900 mx-auto" />
          <p className="text-gray-400 text-sm leading-relaxed min-h-[80px] flex items-center italic font-medium">"{current.content}"</p>
        </div>
        <div className="flex items-center justify-between w-full pt-4 border-t border-emerald-900/20">
           <div className="flex gap-1">
             {tutorialSteps.map((_, i) => (
               <div key={i} className={`h-1 w-6 rounded-full transition-all duration-500 ${step === i ? 'bg-gold shadow-[0_0_8px_#d4af37]' : 'bg-emerald-950'}`} />
             ))}
           </div>
           <button 
             onClick={() => step < tutorialSteps.length - 1 ? setStep(step + 1) : finalize()}
             className="px-8 py-3 bg-emerald-900 text-white font-cinzel text-[10px] font-black border border-gold hover:bg-emerald-700 transition-all uppercase tracking-widest shadow-xl active:scale-95"
           >
             {step < tutorialSteps.length - 1 ? 'CONTINUE' : 'SHATTER THE SHELL'}
           </button>
        </div>
      </div>
    </div>
  );
};
export default TutorialScreen;
