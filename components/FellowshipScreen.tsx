
import React, { useState } from 'react';
import { Character, ArchetypeInfo } from '../types';
import CharacterCreator from './CharacterCreator';
import CharacterSheet from './CharacterSheet';

interface FellowshipScreenProps {
  characters: Character[];
  onAdd: (char: Character) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  mentors: Character[];
  onUpdateMentor: (id: string, updates: Partial<Character>) => void;
  party: string[];
  setParty: (ids: string[]) => void;
  customArchetypes: ArchetypeInfo[];
  onAddCustomArchetype: (arch: ArchetypeInfo) => void;
}

const FellowshipScreen: React.FC<FellowshipScreenProps> = ({ 
  characters, onAdd, onDelete, onUpdate, mentors, party, setParty, customArchetypes, onAddCustomArchetype
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [viewingMentors, setViewingMentors] = useState(false);

  const activeCharacters = viewingMentors ? mentors : characters;
  const selectedChar = activeCharacters.find(c => c.id === selectedCharId);

  const toggleParty = (id: string) => {
    if (viewingMentors) return;
    if (party.includes(id)) {
      setParty(party.filter(p => p !== id));
    } else {
      setParty([...party, id]);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-red-900/30 pb-4">
        <div>
          <h2 className="text-3xl font-cinzel text-gold">The Fellowship</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest italic">Bound by blood and aether.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setViewingMentors(!viewingMentors); setSelectedCharId(null); }}
            className={`px-3 py-1.5 border text-[10px] font-cinzel transition-all ${viewingMentors ? 'bg-amber-900/20 border-gold text-gold' : 'border-red-900/50 text-gray-500 hover:border-gold'}`}
          >
            {viewingMentors ? 'RETURN TO SOULS' : 'VIEW MENTORS'}
          </button>
          {!viewingMentors && (
            <button 
              onClick={() => setIsCreating(true)}
              className="px-4 py-1.5 bg-red-900 text-white text-[10px] font-cinzel border border-gold hover:bg-red-800 transition-all shadow-lg shadow-red-900/20"
            >
              FORGE NEW SOUL
            </button>
          )}
        </div>
      </div>

      {isCreating ? (
        <CharacterCreator 
          customArchetypes={customArchetypes}
          onSaveCustomArchetype={onAddCustomArchetype}
          onCancel={() => setIsCreating(false)} 
          onCreate={(c) => { onAdd(c); setIsCreating(false); }} 
        />
      ) : selectedChar ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <button onClick={() => setSelectedCharId(null)} className="text-[10px] text-gold hover:underline font-cinzel uppercase">← Return to Roster</button>
          <div className="h-[75vh]">
            <CharacterSheet 
              character={selectedChar} 
              onUpdate={viewingMentors ? undefined : onUpdate} 
              isMentor={viewingMentors} 
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCharacters.map(char => (
            <div 
              key={char.id}
              onClick={() => setSelectedCharId(char.id)}
              className={`group relative cursor-pointer rune-border p-4 bg-black/60 backdrop-blur hover:bg-red-900/10 transition-all flex items-center gap-4 ${party.includes(char.id) ? 'border-gold shadow-[0_0_10px_rgba(161,98,7,0.3)]' : 'border-red-900/50'}`}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-cinzel text-gold truncate leading-tight">{char.name}</h3>
                <p className="text-[8px] text-gray-500 uppercase">{char.race} {char.archetype} • LVL {char.level}</p>
              </div>
              
              {!viewingMentors && (
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleParty(char.id); }}
                    className={`p-1.5 border text-[8px] font-bold ${party.includes(char.id) ? 'bg-gold border-gold text-black' : 'border-red-900 text-red-900 hover:text-gold hover:border-gold'}`}
                  >
                    {party.includes(char.id) ? 'IN PARTY' : 'ADD'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(char.id); }}
                    className="p-1 text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    DEL
                  </button>
                </div>
              )}
            </div>
          ))}

          {activeCharacters.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed border-red-900/20">
              <p className="text-gray-600 font-cinzel text-xs uppercase italic">No souls bound to the engine yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FellowshipScreen;
