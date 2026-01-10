
import React, { useState, useMemo } from 'react';
import { Character, Role, Archetype } from '../types';

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
      content: "Thou awakenest in a cathedral of weeping obsidian. Beside thee stand Miri, Lina, and Seris—the 'Bound Three'. They are held in spectral chains, unable to act without thy guidance.",
    },
    {
      title: "The Unbound Soul",
      content: "Thou art the only soul here without chains. This makes thee the catalyst. Thy own Path Mentor is held deep within the sanctuary, trapped in a Negation Shell that feeds on their essence.",
    },
    {
      title: "The Fellowship of Five",
      content: "Once thy Mentor is freed, thy Fellowship shall be complete. Thou must lead Miri's shield, Lina's light, and Seris's arrows toward the heart of the void.",
    },
    {
      title: "The Arbiter's Pulse",
      content: "The Arbiter (Gemini 3 Flash) balances all challenges for thy Fellowship. The world reacts to thy presence. Every shadow holds a sensory detail; every footfall echoes with lore.",
    },
    {
      title: "Automated Resonance",
      content: "The Scribe is always listening. If the Arbiter speaks of damage, death, or discovery, the Scribe audits thy stats in zero-latency Flash time using [SCRIBE_COMMAND] tags.",
    },
    {
      title: "The Sentinel Awaits",
      content: "The 'Void-Sent Sentinel' guards the final gate. To free thy Mentor, thou must survive the climb. Thy resonance shall leap to Level 5 upon victory.",
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
    // Fallback if player is one of the base 3 classes: Pick a unique mentor anyway for a 5-man party
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
    const isSupportMentor = pathMentor?.role === 'Support' || pathMentor?.archetype === Archetype.Mage || pathMentor?.archetype === Archetype.Alchemist || pathMentor?.archetype === Archetype.BloodArtist;

    let branchText = "";
    if (isSupportMentor) {
      branchText = `Seeing ${mentorName} fading within the Negation Shell, Miri lets out a guttural roar. "Thy light shall not go out while I still stand!" 
      
      She strikes the crystalline prison with her bare gauntlets, shattering the geometry of the void through sheer martial will. The feedback of necrotic energy is absolute. 
      
      [SCRIBE_COMMAND: Miri takes 15 damage.]
      
      ${mentorName} is freed, gasping as the void-cords dissolve. Miri staggers, her hands seared by silver flame, but she holds her shield high. The fellowship is complete.`;
    } else {
      branchText = `With a combined effort of blade and spell, the Negation Shell shatters into a thousand shards of silence. ${mentorName} stumbles forward, gasping as the void-cords dissolve. "Thy timing is... adequate, Vessel." Thy fellowship is complete.`;
    }

    const customPrompt = `The air in the heart of the Sunken Sanctuary is thick with the smell of iron and ozone. Beside thee stand Miri, Lina, and Seris. They look to thee, the only Unbound Soul, to lead.

Ahead, thy mentor ${mentorName} is suspended in a flickering prism of shadow.

${branchText}

[EXPLORATION_BEAT]
Environment: The grand staircase ahead is carved from the ribs of an ancient dragon, ascending toward a gate of white fire.
Sensory: The sound of a thousand weeping voices echoes from the walls. A low hum vibrates in thy marrow.
Hook: A massive set of iron doors etched with runes of 'The Sentinel' stands locked.

Suddenly, the green mist thickens. **VOID-THRALLS** (cr 1) manifest from the very air to block thy ascent! Beyond them, the silhouette of the **VOID-SENT SENTINEL** (cr 6) begins to stir.

[ARCHITECT_COMMAND: Forge 3 Void-Thralls for the encounter.]

The first battle of thy chronicle begins now. How dost thou strike?`;

    // Final party includes the freed mentor
    const finalParty = [...initialPartyIds];
    if (pathMentor && !finalParty.includes(pathMentor.id)) finalParty.push(pathMentor.id);
    
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
