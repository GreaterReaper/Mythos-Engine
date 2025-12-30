
import { GoogleGenAI, Type } from "@google/genai";
import { Stats, ClassDef, Monster, Item, Trait, Character, GameLog, Spell } from "../types";

// Helper to clean JSON output from potential markdown formatting
const cleanJson = (text: string) => {
  if (!text) return '{}';
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

// Event dispatchers for UI Mana system
const trackUsage = (type: 'dm' | 'utility', cost: number = 0) => {
  window.dispatchEvent(new CustomEvent('mythos:arcane_use', { detail: { type, cost } }));
};

const reportError = (isRateLimit: boolean, isQuotaExceeded: boolean = false) => {
  window.dispatchEvent(new CustomEvent('mythos:arcane_error', { detail: { isRateLimit, isQuotaExceeded } }));
};

// Check if a hard lockout is currently active in the UI
const isHardLockoutActive = () => {
  return window.sessionStorage.getItem('mythos_lockout_active') === 'true';
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
async function withRetry<T>(fn: () => Promise<T>, retries = 2, initialDelay = 10000): Promise<T> {
  if (isHardLockoutActive()) {
    throw new Error("RECALIBRATION_IN_PROGRESS: The Ley Lines are currently resetting.");
  }

  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString().toLowerCase();
    
    const isRateLimit = errorStr.includes('429') || 
                       errorStr.includes('too many requests');
    
    const isQuotaExceeded = errorStr.includes('quota') || errorStr.includes('limit exceeded');
    
    const isServerError = errorStr.includes('500') || errorStr.includes('503') || errorStr.includes('overloaded');
    
    if (isQuotaExceeded) {
      reportError(true, true);
      throw new Error("DAILY_QUOTA_EXHAUSTED: You have used your 50 daily 'Pro' messages. Switch to 'High Velocity' mode to continue.");
    }

    if (isRateLimit) {
      reportError(true, false);
      throw new Error("[429] Ley Lines Overloaded. Initiating Hard Recalibration (65s).");
    }

    if (isServerError && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      return withRetry(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

const handleAIError = (error: any) => {
  console.error("AI Service Error:", error);
  return error;
};

// Generate image using gemini-2.5-flash-image with optional reference image
export const generateImage = async (prompt: string, referenceBase64?: string): Promise<string> => {
  trackUsage('utility', 25); 
  return withRetry(async () => {
    try {
      const ai = getAI();
      const parts: any[] = [{ text: prompt }];

      if (referenceBase64) {
        // Extract just the base64 data if it includes the data URL prefix
        const base64Data = referenceBase64.includes(',') ? referenceBase64.split(',')[1] : referenceBase64;
        const mimeTypeMatch = referenceBase64.match(/^data:(image\/[a-z]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

        parts.unshift({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: parts },
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
  trackUsage('utility', 10);
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design detailed TTRPG mechanics for a custom class named "${name}". Lore: ${description}.`,
        config: {
          systemInstruction: "You are an expert TTRPG game designer. Always respond with raw JSON.",
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

// Generate a comprehensive spell list for a character based on class
export const generateSpellbook = async (className: string, classDesc: string, maxLevel: number): Promise<Spell[]> => {
  trackUsage('utility', 15);
  return withRetry(async () => {
    try {
      const ai = getAI();
      const prompt = `Generate a comprehensive list of unique spells for a level ${maxLevel} ${className}. Lore context: ${classDesc}. Include spells from level 1 up to level ${maxLevel}.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are an expert fantasy writer and game designer. Create thematic, atmospheric spells. Return a JSON array of spell objects.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                level: { type: Type.INTEGER },
                school: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "level", "school", "description"]
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

// Reroll traits using gemini-3-flash-preview
export const rerollTraits = async (
  contextType: 'class' | 'monster' | 'item' | 'character',
  contextName: string,
  contextDesc: string,
  existingTraits: { name: string; description: string; locked?: boolean }[]
): Promise<{ name: string; description: string }[]> => {
  trackUsage('utility', 5);
  return withRetry(async () => {
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
      return JSON.parse(cleanJson(response.text || '[]'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

// Generate character feats using gemini-3-flash-preview
export const generateCharacterFeats = async (className: string, classDesc: string): Promise<Trait[]> => {
  trackUsage('utility', 5);
  return withRetry(async () => {
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
  trackUsage('utility', 10);
  return withRetry(async () => {
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
  trackUsage('utility', 10);
  return withRetry(async () => {
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

// Get Dungeon Master response - now accepts model parameter
export const getDMResponse = async (
  history: { role: string; content: string }[],
  plot: string,
  lastInput: string,
  party: Character[],
  summary: string,
  modelName: string = 'gemini-3-pro-preview'
): Promise<string> => {
  trackUsage('dm', 0);
  return withRetry(async () => {
    try {
      const ai = getAI();
      const contents = history.map(h => ({
        role: h.role === 'dm' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }));

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: `You are a DM. Plot: ${plot}. Summary: ${summary}. React to player actions narratives. Keep responses relatively concise but atmospheric.`,
        }
      });
      return response.text || "...";
    } catch (e) {
      throw handleAIError(e);
    }
  }, 0); 
};

// Generate narrative summary using gemini-3-flash-preview
export const generateSummary = async (logs: GameLog[], currentSummary: string): Promise<string> => {
  trackUsage('utility', 5);
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize the saga so far into a single paragraph. Current summary: ${currentSummary}. New events: ${logs.map(l => l.content).join(' ')}`,
      });
      return response.text || currentSummary;
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

// Generate smart loot for party using gemini-3-flash-preview
export const generateSmartLoot = async (party: Character[], classes: ClassDef[]): Promise<Item> => {
  trackUsage('utility', 15);
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a unique magic item for a party consisting of: ${party.map(p => p.name).join(', ')}.`,
        config: {
          systemInstruction: "Return JSON for a unique magic item.",
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
