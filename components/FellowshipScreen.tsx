
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
  username: string;
}

const FellowshipScreen: React.FC<FellowshipScreenProps> = ({ 
  characters, onAdd, onDelete, onUpdate, mentors, party, setParty, customArchetypes, onAddCustomArchetype, username
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

  const localSouls = characters.filter(c => c.ownerName === username || !c.ownerName);
  const remoteSouls = characters.filter(c => c.ownerName && c.ownerName !== username);

  const renderCharacterCard = (char: Character) => (
    <div 
      key={char.id}
      onClick={() => setSelectedCharId(char.id)}
      className={`group relative cursor-pointer rune-border p-6 bg-black/60 backdrop-blur hover:border-gold/50 transition-all flex flex-col md:flex-row md:items-center gap-5 ${party.includes(char.id) ? 'border-gold shadow-[0_0_20px_rgba(212,175,55,0.2)] bg-gold/[0.03]' : 'border-emerald-900/40'}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-900/20 border-2 border-emerald-900/40 flex items-center justify-center font-cinzel text-2xl font-black text-gold shrink-0">
            {char.name[0]}
          </div>
          <div className="min-w-0">
            <h3 className="font-cinzel text-xl text-gold truncate leading-none font-black">{char.name}</h3>
            <p className="text-[10px] text-emerald-500 font-cinzel uppercase tracking-[0.2em] mt-1 font-bold">{char.race} {char.archetype}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
           <div className="text-center bg-black/40 px-3 py-1 rounded border border-emerald-900/20">
             <p className="text-[8px] text-gray-500 uppercase font-black">Level</p>
             <p className="text-sm font-black text-white">{char.level}</p>
           </div>
           <div className="flex-1 bg-black/40 p-1.5 rounded border border-emerald-900/20 flex flex-col justify-center">
              <div className="flex justify-between items-center text-[8px] uppercase font-black text-gray-500 mb-0.5">
                <span>Vitality</span>
                <span className="text-emerald-500">{char.currentHp}/{char.maxHp}</span>
              </div>
              <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-900" style={{ width: `${(char.currentHp/char.maxHp)*100}%` }} />
              </div>
           </div>
        </div>
      </div>
      
      {!viewingMentors && (
        <div className="flex md:flex-col gap-2 pt-2 md:pt-0">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleParty(char.id); }}
            className={`flex-1 md:flex-none px-5 py-3 border-2 text-[10px] font-black uppercase font-cinzel transition-all active:scale-95 ${party.includes(char.id) ? 'bg-gold border-gold text-black shadow-lg shadow-gold/20' : 'border-emerald-900/40 text-emerald-500 hover:text-gold hover:border-gold'}`}
          >
            {party.includes(char.id) ? 'DEPLOYED' : 'BIND SOUL'}
          </button>
          {char.ownerName === username && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(char.id); }}
              className="w-12 h-12 flex items-center justify-center text-emerald-900 hover:text-emerald-500 border border-emerald-900/20 rounded hover:bg-emerald-900/5 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-10 pb-28 max-w-5xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-emerald-900/40 pb-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-cinzel text-gold font-black tracking-tight">The Hall of Souls</h2>
          <p className="text-xs text-emerald-500 uppercase tracking-[0.4em] font-black opacity-80 mt-2">Bonded by Blood and Aether</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => { setViewingMentors(!viewingMentors); setSelectedCharId(null); }}
            className={`flex-1 md:flex-none px-5 py-3 border-2 font-black font-cinzel text-[10px] tracking-widest transition-all ${viewingMentors ? 'bg-emerald-900/20 border-gold text-gold shadow-lg shadow-emerald-900/30' : 'border-emerald-900/50 text-gray-500 hover:text-gold hover:border-gold'}`}
          >
            {viewingMentors ? 'VIEW LOCAL SOULS' : 'CONSULT MENTORS'}
          </button>
          {!viewingMentors && (
            <button 
              onClick={() => setIsCreating(true)}
              className="flex-1 md:flex-none px-6 py-3 bg-emerald-900 text-white font-black font-cinzel text-[10px] tracking-widest border-2 border-gold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/40 active:scale-95"
            >
              FORGE NEW SOUL
            </button>
          )}
        </div>
      </div>

      {isCreating ? (
        <CharacterCreator 
          customArchetypes={customArchetypes}
          onAddCustomArchetype={onAddCustomArchetype}
          onCancel={() => setIsCreating(false)} 
          onCreate={(c) => { onAdd(c); setIsCreating(false); }} 
        />
      ) : selectedChar ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <button onClick={() => setSelectedCharId(null)} className="flex items-center gap-2 text-xs text-gold hover:text-white font-black font-cinzel uppercase tracking-[0.2em] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            RECALL TO ROSTER
          </button>
          <div className="h-[75vh]">
            <CharacterSheet 
              character={selectedChar} 
              onUpdate={viewingMentors || selectedChar.ownerName !== username ? undefined : onUpdate} 
              isMentor={viewingMentors} 
            />
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {viewingMentors ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {mentors.map(renderCharacterCard)}
             </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xs font-cinzel text-emerald-500 uppercase tracking-[0.3em] font-black border-l-4 border-emerald-900 pl-4">Thy Local Lineage</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {localSouls.map(renderCharacterCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FellowshipScreen;
