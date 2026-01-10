
import React, { useMemo } from 'react';
import { Character } from '../types';

interface TutorialScreenProps {
  characters: Character[];
  mentors: Character[];
  onComplete: (primaryId: string, campaignTitle: string, campaignPrompt: string) => void;
}

const TutorialScreen: React.FC<TutorialScreenProps> = ({ characters, onComplete }) => {
  const primaryChar = useMemo(() => characters.find(c => c.isPrimarySoul) || characters[0], [characters]);

  const handleAwaken = () => {
    if (!primaryChar) return;

    const prologuePrompt = `Thou awakenest in total darkness. The air is cold, tasting of ancient dust and copper. Thy breath echoes against obsidian walls.

Thou art in the Sunken Sanctuary. Thy companions are nowhere to be found. Somewhere in the gloom, thou hearest the rhythmic hum of a 'Kinetic Web'.

Thou art the Unbound. Thy first objective: Survive. Thy second: Find the others.

[TUTORIAL_PROTOCOL: Thou art alone. To free thy companions, thou must locate their shells. Miri, Lina, and Seris are trapped nearby.]

Describe thy first movement into the void.`;

    onComplete(primaryChar.id, "Ascension: The Sunken Sanctuary", prologuePrompt);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6 md:p-12 overflow-hidden">
      {/* Immersive Background Particles */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-900 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="max-w-2xl w-full space-y-12 relative z-10 text-center">
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
           <h1 className="text-5xl md:text-7xl font-cinzel text-gold font-black tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
             PROLOGUE
           </h1>
           <div className="h-px w-24 bg-emerald-900 mx-auto" />
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          <p className="text-gray-400 font-cinzel text-sm md:text-lg leading-relaxed italic">
            "The Sunken Sanctuary was never meant for the living. It is a tomb for resonance, where souls are siphoned to feed the Engine's hunger."
          </p>
          <p className="text-emerald-500 font-cinzel text-xs font-black uppercase tracking-[0.4em] animate-pulse">
            Thy resonance is flickering...
          </p>
        </div>

        <div className="pt-10 animate-in fade-in zoom-in duration-1000 delay-1000">
          <button 
            onClick={handleAwaken}
            className="group relative px-12 py-5 bg-transparent border-2 border-gold text-gold font-cinzel font-black uppercase tracking-[0.3em] overflow-hidden transition-all hover:text-black"
          >
            <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10">AWAKEN</span>
          </button>
        </div>

        <div className="pt-20 opacity-20 animate-in fade-in duration-1000 delay-1500">
           <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.5em]">ᛟ ᚱ ᛞ ᛖ ᚱ • ᚺ ᚨ ᛟ ᛊ</p>
        </div>
      </div>
    </div>
  );
};

export default TutorialScreen;
