
import { GoogleGenAI, Type } from "@google/genai";
import { Stats, ClassDef, Monster, Item, Trait, MonsterAbility, ItemMechanic, Character, GameLog } from "../types";

// Helper to get AI instance safely
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("ARCANE_FOCI_MISSING: The API Key is not set in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const handleAIError = (error: any) => {
  const msg = error?.message || "";
  if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("limit")) {
    throw new Error("ARCANE_FATIGUE: The Forge is cooling down. Please wait 60 seconds before your next ritual.");
  }
  throw error;
};

export const generateClassMechanics = async (name: string, description: string): Promise<Partial<ClassDef>> => {
  try {
    const ai = getAI();
    // Using Flash for higher quota availability
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
  } catch (e) {
    return handleAIError(e);
  }
};

export const rerollTraits = async (
  contextType: 'class' | 'monster' | 'item' | 'character',
  contextName: string,
  contextDesc: string,
  existingTraits: { name: string; description: string; locked?: boolean }[]
): Promise<{ name: string; description: string }[]> => {
  try {
    const ai = getAI();
    const locked = existingTraits.filter(t => t.locked);
    const countToGenerate = existingTraits.length - locked.length;
    
    if (countToGenerate <= 0) return existingTraits.map(t => ({ name: t.name, description: t.description }));

    const prompt = `You are a TTRPG designer. For a ${contextType} named "${contextName}" (${contextDesc}), 
    generate ${countToGenerate} new and unique traits/abilities/features. 
    The following traits already exist and MUST be kept: ${locked.map(l => l.name).join(', ')}.`;

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
  } catch (e) {
    return handleAIError(e);
  }
};

export const generateCharacterFeats = async (className: string, classDesc: string): Promise<Trait[]> => {
  try {
    const ai = getAI();
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
  } catch (e) {
    return handleAIError(e);
  }
};

export const generateMonsterStats = async (name: string, description: string, isBoss: boolean = false): Promise<Partial<Monster>> => {
  try {
    const ai = getAI();
    const prompt = `Create monster stats for: "${name}". Appearance: ${description}. ${isBoss ? "This is a BOSS." : ""}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Switched to Flash for higher quota
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
                strength: { type: Type.INTEGER }, dexterity: { type: Type.INTEGER },
                constitution: { type: Type.INTEGER }, intelligence: { type: Type.INTEGER },
                wisdom: { type: Type.INTEGER }, charisma: { type: Type.INTEGER }
              }
            },
            abilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, effect: { type: Type.STRING } },
                required: ["name", "effect"]
              }
            }
          },
          required: ["hp", "ac", "stats", "abilities"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return handleAIError(e);
  }
};

export const generateItemMechanics = async (name: string, type: string, description: string): Promise<{ mechanics: ItemMechanic[], lore: string }> => {
  try {
    const ai = getAI();
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
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
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
  } catch (e) {
    return handleAIError(e);
  }
};

export const generateSmartLoot = async (party: Character[], classes: ClassDef[]): Promise<Item> => {
  try {
    const ai = getAI();
    const classDescriptions = party.map(p => {
      const c = classes.find(cl => cl.id === p.classId);
      return `${p.name} (${c?.name}): ${c?.description}`;
    }).join(", ");

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate a magical item for this TTRPG party: ${classDescriptions}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING },
            description: { type: Type.STRING },
            mechanics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }
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
  } catch (e) {
    return handleAIError(e);
  }
};

export const generateSummary = async (logs: GameLog[], oldSummary: string): Promise<string> => {
  try {
    const ai = getAI();
    const logContext = logs.map(l => `${l.role === 'dm' ? 'DM' : 'Player'}: ${l.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Synthesize the narrative history. Previous: "${oldSummary}". Recent: ${logContext}`
    });
    return response.text || oldSummary;
  } catch (e) {
    return handleAIError(e);
  }
};

export const getDMResponse = async (history: {role: string, content: string}[], plot: string, newMessage: string, knownCharacters: Character[], summary: string) => {
  try {
    const ai = getAI();
    const charList = knownCharacters.map(c => c.name).join(", ");
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: history.map(h => `${h.role === 'dm' ? 'DM' : 'Player'}: ${h.content}`).join('\n') + `\nPlayer: ${newMessage}`,
      config: {
        systemInstruction: `You are a Dark Fantasy TTRPG DM. Summary: ${summary}. Plot: ${plot}. Known Heroes: ${charList}.`
      }
    });
    return response.text || '';
  } catch (e) {
    return handleAIError(e);
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Digital painting, high fantasy TTRPG style: ${prompt}` }]
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return '';
  } catch (e) {
    return handleAIError(e);
  }
};
