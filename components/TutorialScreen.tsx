
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
      title: "Solitary Awakening",
      content: "Thou awakenest in the obsidian heart of the Sunken Sanctuary. Thy breath is the only sound; thy heartbeat the only rhythm. Thou art 'Unbound'—the only soul the void failed to chain.",
      action: "Step into the Dark"
    },
    {
      title: "The Kinetic Drain (Miri)",
      content: "Before thee, Miri is suspended in a web of silver needles. Her vitality is being siphoned to power the sanctuary's gates. Thou must reach into the mesh and shatter the needles with thy bare hands.",
      action: "Shatter the Kinetic Web"
    },
    {
      title: "The Gordian Knot (Lina & Seris)",
      content: "Lina and Seris are bound back-to-back by a coil of necrotic smoke. As thy resonance touches them, the smoke screams. Thou feelest the Scribe auditing thy very soul as thou severest the connection.",
      action: "Sever the Smoke-Cords"
    },
    {
      title: "The Negation Shell",
      content: "Thy Path Mentor lies ahead, encased in a Negation Shell. The air vibrates with the Architect's presence, ready to manifest the horrors that guard this final prism.",
      action: "Initiate Resonance"
    },
    {
      title: "The Soul-Forge",
      content: "As the shells shatter, thy own soul reaches its zenith. A unique manifestation of power—a Legendary Action—ignites within thy marrow. Describe thy soul's ultimate form to the Arbiter.",
      action: "Manifest Thy Power"
    }
  ];

  const current = tutorialSteps[step];
  const primaryChar = useMemo(() => characters.find(c => c.isPrimarySoul) || characters[0], [characters]);

  const pathMentor = useMemo(() => {
    if (!primaryChar) return mentors[0];
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    const match = mentors.find(m => m.archetype === primaryChar.archetype && !baseMentorNames.includes(m.name));
    return match || mentors.find(m => !baseMentorNames.includes(m.name)) || mentors[0];
  }, [primaryChar, mentors]);

  const finalize = () => {
    const baseMentorNames = ['Lina', 'Miri', 'Seris'];
    const boundThreeIds = mentors.filter(m => baseMentorNames.includes(m.name)).map(m => m.id);
    const finalPartyIds = [primaryChar.id, ...boundThreeIds];
    
    const playerIsBaseClass = ['Fighter', 'Mage', 'Archer'].includes(primaryChar.archetype as string);
    if (!playerIsBaseClass && pathMentor) {
      finalPartyIds.push(pathMentor.id);
    }

    const arch = primaryChar.archetype as string;
    
    const customPrompt = `The Sunken Sanctuary groans. Thy Fellowship stands complete, and thou hast manifest thy TRUE SOUL.

[LEGENDARY_MANIFEST: The Unbound's ${arch} Signature | A unique legendary action manifest from the ritual of the Sunken Sanctuary. This power defies standard vocation limits.]

[EXPLORATION_BEAT]
Environment: The grand staircase ahead is carved from the ribs of an ancient dragon, ascending toward a gate of white fire.
Sensory: The sound of a thousand weeping voices echoes from the walls. A low hum vibrates in thy marrow.
Hook: A massive set of iron doors etched with runes of 'The Sentinel' stands locked.

Suddenly, the green mist thickens. **VOID-THRALLS** manifest from the very air to block thy ascent! Beyond them, the silhouette of the **VOID-SENT SENTINEL** (cr 6) begins to stir.

[ARCHITECT_COMMAND: Forge 3 Void-Thralls for the encounter.]

The first battle of thy chronicle begins now. How dost thou strike?`;

    onComplete(finalPartyIds, "Ascension: The Sunken Sanctuary", customPrompt);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4">
      <div className="max-w-xl w-full rune-border border-emerald-900/60 bg-black shadow-[0_0_60px_rgba(16,185,129,0.2)] p-10 space-y-10 flex flex-col items-center">
        <div className="space-y-4 text-center">
          <div className="flex items-center gap-4 justify-center">
             <div className="h-px w-8 bg-gold/30" />
             <h2 className="text-3xl font-cinzel text-gold uppercase font-black tracking-tighter">{current.title}</h2>
             <div className="h-px w-8 bg-gold/30" />
          </div>
          <p className="text-gray-400 text-sm leading-relaxed min-h-[100px] flex items-center italic font-medium">"{current.content}"</p>
        </div>

        <div className="w-full space-y-6">
           <div className="flex justify-between items-center text-[8px] font-cinzel text-emerald-900 font-black tracking-widest uppercase">
              <span>Resonance Progress</span>
              <span>Stage {step + 1} / 5</span>
           </div>
           <div className="h-1 w-full bg-emerald-950 rounded-full overflow-hidden">
              <div className="h-full bg-gold transition-all duration-700 shadow-[0_0_10px_#d4af37]" style={{ width: `${((step + 1) / 5) * 100}%` }} />
           </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
           <button 
             onClick={() => step < tutorialSteps.length - 1 ? setStep(step + 1) : finalize()}
             className="px-8 py-4 bg-emerald-900 text-white font-cinzel text-[11px] font-black border-2 border-gold hover:bg-emerald-700 transition-all uppercase tracking-widest shadow-xl active:scale-95"
           >
             {current.action}
           </button>
        </div>
      </div>
    </div>
  );
};
export default TutorialScreen;
