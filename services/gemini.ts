
import { GoogleGenAI, Type } from "@google/genai";
import { Stats, ClassDef, Monster, Item, Trait, Character, GameLog } from "../types";

// Helper to clean JSON output from potential markdown formatting
const cleanJson = (text: string) => {
  if (!text) return '{}';
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

// Event dispatchers for UI Mana system
const trackUsage = (type: 'dm' | 'utility', cost: number = 0) => {
  window.dispatchEvent(new CustomEvent('mythos:arcane_use', { detail: { type, cost } }));
};

const reportError = (isRateLimit: boolean) => {
  window.dispatchEvent(new CustomEvent('mythos:arcane_error', { detail: { isRateLimit } }));
};

// Helper to get AI instance safely
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("ARCANE_FOCI_MISSING: The API Key is not set in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Resiliency Wrapper: Implements exponential backoff for transient errors (429, 5xx)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString().toLowerCase();
    
    // Precise detection only: avoid "exhausted" as it appears in non-rate-limit msgs
    const isRateLimit = errorStr.includes('429') || 
                       errorStr.includes('too many requests') || 
                       errorStr.includes('quota exceeded');
    
    const isServerError = errorStr.includes('500') || errorStr.includes('503') || errorStr.includes('overloaded');
    
    if (isRateLimit && retries === 0) reportError(true);

    if ((isRateLimit || isServerError) && retries > 0) {
      console.warn(`Ley Line interference. Retrying in ${initialDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      return withRetry(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

const handleAIError = (error: any) => {
  console.error("AI Service Error:", error);
  const msg = error.message || "The ether is unstable.";
  if (msg.includes("429") || msg.includes("quota")) {
    return new Error("[429] The Ley Lines are temporarily overloaded. Please wait 15-30 seconds.");
  }
  return error;
};

// Generate image using gemini-2.5-flash-image
export const generateImage = async (prompt: string): Promise<string> => {
  return withRetry(async () => {
    trackUsage('utility', 15); // Reduced cost
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return '';
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

// Generate TTRPG class mechanics using gemini-3-flash-preview
export const generateClassMechanics = async (name: string, description: string): Promise<Partial<ClassDef>> => {
  return withRetry(async () => {
    trackUsage('utility', 4); // Reduced cost
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design detailed TTRPG mechanics for a custom class named "${name}". Lore: ${description}. Focus on balance and flavor.`,
        config: {
          systemInstruction: "You are an expert TTRPG game designer. Always respond with raw JSON. No markdown.",
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
                  properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
                  required: ["name", "description"]
                } 
              }
            },
            required: ["hitDie", "startingHp", "hpPerLevel", "spellSlots", "features"]
          }
        }
      });
      return JSON.parse(cleanJson(response.text || '{}'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

// Reroll traits using gemini-3-flash-preview
export const rerollTraits = async (
  contextType: 'class' | 'monster' | 'item' | 'character',
  contextName: string,
  contextDesc: string,
  existingTraits: { name: string; description: string; locked?: boolean }[]
): Promise<{ name: string; description: string }[]> => {
  return withRetry(async () => {
    trackUsage('utility', 1); // Nearly free rerolls
    try {
      const ai = getAI();
      const locked = existingTraits.filter(t => t.locked);
      const countToGenerate = existingTraits.length - locked.length;
      if (countToGenerate <= 0) return existingTraits.map(t => ({ name: t.name, description: t.description }));

      const prompt = `Generate ${countToGenerate} new unique ${contextType} traits for "${contextName}". Avoid: ${locked.map(l => l.name).join(', ')}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Return a JSON array of objects with 'name' and 'description'.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
              required: ["name", "description"]
            }
          }
        }
      });

      const newTraits = JSON.parse(cleanJson(response.text || '[]'));
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
      throw handleAIError(e);
    }
  });
};

// Generate character feats using gemini-3-flash-preview
export const generateCharacterFeats = async (className: string, classDesc: string): Promise<Trait[]> => {
  return withRetry(async () => {
    trackUsage('utility', 2); // Reduced cost
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 3 character feats for a ${className}.`,
        config: {
          systemInstruction: "Return a JSON array of 3 feat objects.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
              required: ["name", "description"]
            }
          }
        }
      });
      return JSON.parse(cleanJson(response.text || '[]'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

// Generate monster stats using gemini-3-flash-preview
export const generateMonsterStats = async (name: string, description: string, isBoss: boolean = false): Promise<Partial<Monster>> => {
  return withRetry(async () => {
    trackUsage('utility', 5);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Stats for: "${name}". ${isBoss ? "Boss." : ""}`,
        config: {
          systemInstruction: "Generate TTRPG monster JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hp: { type: Type.INTEGER }, ac: { type: Type.INTEGER },
              stats: {
                type: Type.OBJECT,
                properties: {
                  strength: { type: Type.INTEGER }, dexterity: { type: Type.INTEGER }, constitution: { type: Type.INTEGER },
                  intelligence: { type: Type.INTEGER }, wisdom: { type: Type.INTEGER }, charisma: { type: Type.INTEGER }
                },
                required: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
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
      return JSON.parse(cleanJson(response.text || '{}'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

// Generate item mechanics using gemini-3-flash-preview
export const generateItemMechanics = async (name: string, type: 'Weapon' | 'Armor', description: string): Promise<{ mechanics: { name: string; description: string }[]; lore: string }> => {
  return withRetry(async () => {
    trackUsage('utility', 4);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Mechanics for ${type} "${name}".`,
        config: {
          systemInstruction: "Return JSON for item mechanics and lore.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mechanics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
                  required: ["name", "description"]
                }
              },
              lore: { type: Type.STRING }
            },
            required: ["mechanics", "lore"]
          }
        }
      });
      return JSON.parse(cleanJson(response.text || '{}'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

// Get Dungeon Master response using gemini-3-pro-preview
export const getDMResponse = async (
  history: { role: string; content: string }[],
  plot: string,
  lastInput: string,
  party: Character[],
  summary: string
): Promise<string> => {
  return withRetry(async () => {
    trackUsage('dm', 0);
    try {
      const ai = getAI();
      const contents = history.map(h => ({
        role: h.role === 'dm' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: contents,
        config: {
          systemInstruction: `You are a DM. Plot: ${plot}. Summary: ${summary}.`,
        }
      });
      return response.text || "...";
    } catch (e) {
      throw handleAIError(e);
    }
  }, 2);
};

// Generate narrative summary using gemini-3-flash-preview
export const generateSummary = async (logs: GameLog[], currentSummary: string): Promise<string> => {
  return withRetry(async () => {
    trackUsage('utility', 2);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Update summary. Current: ${currentSummary}. Logs: ${logs.length}`,
      });
      return response.text || currentSummary;
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

// Generate smart loot for party using gemini-3-flash-preview
export const generateSmartLoot = async (party: Character[], classes: ClassDef[]): Promise<Item> => {
  return withRetry(async () => {
    trackUsage('utility', 6);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create loot for party: ${party.map(p => p.name).join(', ')}.`,
        config: {
          systemInstruction: "Return JSON for magic item.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING }, type: { type: Type.STRING },
              description: { type: Type.STRING }, lore: { type: Type.STRING },
              mechanics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
                  required: ["name", "description"]
                }
              }
            },
            required: ["name", "type", "description", "lore", "mechanics"]
          }
        }
      });
      const itemData = JSON.parse(cleanJson(response.text || '{}'));
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...itemData,
        type: (itemData.type === 'Armor' ? 'Armor' : 'Weapon') as 'Weapon' | 'Armor'
      } as Item;
    } catch (e) {
      throw handleAIError(e);
    }
  });
};
