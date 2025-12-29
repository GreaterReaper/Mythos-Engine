
import { GoogleGenAI, Type } from "@google/genai";
import { Stats, ClassDef, Monster, Item, Trait, MonsterAbility, ItemMechanic, Character, GameLog } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateClassMechanics = async (name: string, description: string): Promise<Partial<ClassDef>> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Create TTRPG mechanics for a custom class named "${name}". Description: ${description}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hitDie: { type: Type.STRING },
          startingHp: { type: Type.INTEGER },
          hpPerLevel: { type: Type.INTEGER },
          spellSlots: { type: Type.ARRAY, items: { type: Type.INTEGER } },
          features: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "description"]
            } 
          }
        },
        required: ["hitDie", "startingHp", "hpPerLevel", "spellSlots", "features"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const rerollTraits = async (
  contextType: 'class' | 'monster' | 'item' | 'character',
  contextName: string,
  contextDesc: string,
  existingTraits: { name: string; description: string; locked?: boolean }[]
): Promise<{ name: string; description: string }[]> => {
  const locked = existingTraits.filter(t => t.locked);
  const countToGenerate = existingTraits.length - locked.length;
  
  if (countToGenerate <= 0) return existingTraits.map(t => ({ name: t.name, description: t.description }));

  const prompt = `You are a TTRPG designer. For a ${contextType} named "${contextName}" (${contextDesc}), 
  generate ${countToGenerate} new and unique traits/abilities/features. 
  The following traits already exist and MUST be kept (do not duplicate them): ${locked.map(l => l.name).join(', ')}.
  Provide only the new ${countToGenerate} items.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "description"]
        }
      }
    }
  });

  const newTraits = JSON.parse(response.text || '[]');
  const result: { name: string; description: string }[] = [];
  let newIdx = 0;

  existingTraits.forEach(t => {
    if (t.locked) {
      result.push({ name: t.name, description: t.description });
    } else if (newIdx < newTraits.length) {
      result.push(newTraits[newIdx++]);
    }
  });

  return result;
};

export const generateCharacterFeats = async (className: string, classDesc: string): Promise<Trait[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate 3 unique TTRPG Feats for a character of the class "${className}" (${classDesc}).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "description"]
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

export const generateMonsterStats = async (name: string, description: string, isBoss: boolean = false): Promise<Partial<Monster>> => {
  const prompt = `Create monster stats for: "${name}". Appearance/Abilities: ${description}. ${isBoss ? "IMPORTANT: This is a BOSS type monster. Give it significantly higher HP, AC, and legendary or multi-phase abilities." : ""}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hp: { type: Type.INTEGER },
          ac: { type: Type.INTEGER },
          stats: {
            type: Type.OBJECT,
            properties: {
              strength: { type: Type.INTEGER },
              dexterity: { type: Type.INTEGER },
              constitution: { type: Type.INTEGER },
              intelligence: { type: Type.INTEGER },
              wisdom: { type: Type.INTEGER },
              charisma: { type: Type.INTEGER }
            }
          },
          abilities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                effect: { type: Type.STRING }
              },
              required: ["name", "effect"]
            }
          }
        },
        required: ["hp", "ac", "stats", "abilities"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const generateItemMechanics = async (name: string, type: string, description: string): Promise<{ mechanics: ItemMechanic[], lore: string }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write TTRPG mechanics and lore for a ${type} called "${name}". Description: ${description}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mechanics: { 
            type: Type.ARRAY, 
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Trait name (e.g. Sharpness, Glowing)" },
                description: { type: Type.STRING, description: "Mechanic details (e.g. +1 to hit)" }
              },
              required: ["name", "description"]
            }
          },
          lore: { type: Type.STRING }
        },
        required: ["mechanics", "lore"]
      }
    }
  });
  return JSON.parse(response.text || '{"mechanics": [], "lore": ""}');
};

export const generateSmartLoot = async (party: Character[], classes: ClassDef[]): Promise<Item> => {
  const classDescriptions = party.map(p => {
    const c = classes.find(cl => cl.id === p.classId);
    return `${p.name} (${c?.name}): ${c?.description}`;
  }).join(", ");

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Generate a magical item for this TTRPG party: ${classDescriptions}. Ensure the item is PERFECTLY suited for at least one of these classes to wield effectively.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, description: "Weapon or Armor" },
          description: { type: Type.STRING },
          mechanics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          },
          lore: { type: Type.STRING }
        },
        required: ["name", "type", "description", "mechanics", "lore"]
      }
    }
  });
  const data = JSON.parse(response.text || '{}');
  return { ...data, id: Math.random().toString(36).substr(2, 9) };
};

export const generateSummary = async (logs: GameLog[], oldSummary: string): Promise<string> => {
  const logContext = logs.map(l => `${l.role === 'dm' ? 'DM' : 'Player'}: ${l.content}`).join('\n');
  const prompt = `Synthesize the narrative history of this TTRPG session.
  Previous Summary: "${oldSummary || 'No previous summary.'}"
  Recent Activity:
  ${logContext}

  Create a concise but comprehensive "Memory Fragment" for the Dungeon Master. Include:
  - Key events that have occurred.
  - Important NPCs and their status.
  - Current party objectives and locations.
  - Any significant changes to the world state.
  Keep it strictly under 300 words.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  return response.text || oldSummary;
};

export const getDMResponse = async (history: {role: string, content: string}[], plot: string, newMessage: string, knownCharacters: Character[], summary: string) => {
  const charList = knownCharacters.map(c => c.name).join(", ");
  const systemInstruction = `You are a professional TTRPG Dungeon Master for a Dark Fantasy adventure.
  
  LONG-TERM NARRATIVE MEMORY:
  ${summary || 'The story is just beginning.'}

  ORIGINAL PLOT VISION: "${plot}".
  KNOWN CHARACTERS IN PLAYER'S LIBRARY: ${charList || 'None'}.

  RULES:
  1. Combat is narrative and flexible. Handle "odd" matchups creatively through clever narration.
  2. Prioritize story progression over rigid stat-checking.
  3. Be descriptive but concise (1-2 paragraphs).
  4. If you introduce a companion/NPC, and their name matches one of the KNOWN CHARACTERS (${charList}), treat them as that specific character with their established lore and traits.
  5. React dynamically to player creativity. If they describe a clever use of an item or class ability, let it work or have an interesting consequence.
  6. STAY CONSISTENT with the "LONG-TERM NARRATIVE MEMORY" provided above.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: history.map(h => `${h.role === 'dm' ? 'DM' : 'Player'}: ${h.content}`).join('\n') + `\nPlayer: ${newMessage}`,
    config: {
      systemInstruction
    }
  });
  return response.text || '';
};

export const generateImage = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `Digital painting, high fantasy TTRPG style: ${prompt}` }]
    },
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return '';
};
