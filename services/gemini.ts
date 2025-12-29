import { GoogleGenAI, Type } from "@google/genai";
import { Stats, ClassDef, Monster, Item, Trait, MonsterAbility, ItemMechanic, Character, GameLog } from "../types";

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
async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString().toLowerCase();
    const isRateLimit = errorStr.includes('429') || errorStr.includes('rate limit') || errorStr.includes('quota');
    const isServerError = errorStr.includes('500') || errorStr.includes('503') || errorStr.includes('overloaded');
    
    if (isRateLimit) reportError(true);

    if ((isRateLimit || isServerError) && retries > 0) {
      console.warn(`Resonance interference detected. Retrying in ${initialDelay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      return withRetry(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

const handleAIError = (error: any) => {
  console.error("AI Error:", error);
  const msg = error.message || "The ether is unstable.";
  if (msg.includes("429")) return new Error("The Arcane Foci are exhausted. Please wait a few moments for the ley lines to stabilize.");
  return error;
};

export const generateImage = async (prompt: string): Promise<string> => {
  return withRetry(async () => {
    trackUsage('utility', 40); // Image gen is expensive
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

export const generateClassMechanics = async (name: string, description: string): Promise<Partial<ClassDef>> => {
  return withRetry(async () => {
    trackUsage('utility', 15);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design detailed TTRPG mechanics for a custom class named "${name}". Lore: ${description}. Focus on balance and flavor.`,
        config: {
          systemInstruction: "You are an expert TTRPG game designer. Always respond with raw JSON matching the requested schema. Do not include any commentary or markdown formatting outside the JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hitDie: { type: Type.STRING, description: "e.g., 'd8' or 'd10'" },
              startingHp: { type: Type.INTEGER },
              hpPerLevel: { type: Type.INTEGER },
              spellSlots: { 
                type: Type.ARRAY, 
                items: { type: Type.INTEGER },
                description: "Number of slots for levels 1-5"
              },
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
      return JSON.parse(cleanJson(response.text || '{}'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

export const rerollTraits = async (
  contextType: 'class' | 'monster' | 'item' | 'character',
  contextName: string,
  contextDesc: string,
  existingTraits: { name: string; description: string; locked?: boolean }[]
): Promise<{ name: string; description: string }[]> => {
  return withRetry(async () => {
    trackUsage('utility', 10);
    try {
      const ai = getAI();
      const locked = existingTraits.filter(t => t.locked);
      const countToGenerate = existingTraits.length - locked.length;
      
      if (countToGenerate <= 0) return existingTraits.map(t => ({ name: t.name, description: t.description }));

      const prompt = `Generate ${countToGenerate} new unique ${contextType} traits for "${contextName}". Avoid repeating existing locked traits: ${locked.map(l => l.name).join(', ')}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are a creative TTRPG designer. Return only a JSON array of objects with 'name' and 'description' keys.",
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

export const generateCharacterFeats = async (className: string, classDesc: string): Promise<Trait[]> => {
  return withRetry(async () => {
    trackUsage('utility', 10);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 3 character feats for the class "${className}" (${classDesc}).`,
        config: {
          systemInstruction: "You are a TTRPG designer. Return only a JSON array of 3 feat objects.",
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
      return JSON.parse(cleanJson(response.text || '[]'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

export const generateMonsterStats = async (name: string, description: string, isBoss: boolean = false): Promise<Partial<Monster>> => {
  return withRetry(async () => {
    trackUsage('utility', 15);
    try {
      const ai = getAI();
      const prompt = `Create TTRPG stats for: "${name}". Appearance: ${description}. ${isBoss ? "Make it a Boss encounter." : ""}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are a TTRPG monster designer. Generate balanced and interesting stat blocks in JSON format.",
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
      return JSON.parse(cleanJson(response.text || '{}'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

export const generateItemMechanics = async (name: string, type: string, description: string): Promise<{ mechanics: ItemMechanic[], lore: string }> => {
  return withRetry(async () => {
    trackUsage('utility', 10);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Define TTRPG mechanics and flavorful lore for: "${name}" (${type}). Lore focus: ${description}.`,
        config: {
          systemInstruction: "You are a TTRPG item designer. Focus on interesting mechanics and atmospheric lore.",
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
      return JSON.parse(cleanJson(response.text || '{"mechanics": [], "lore": ""}'));
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

export const generateSmartLoot = async (party: Character[], classes: ClassDef[]): Promise<Item> => {
  return withRetry(async () => {
    trackUsage('utility', 20);
    try {
      const ai = getAI();
      const classDescriptions = party.map(p => {
        const c = classes.find(cl => cl.id === p.classId);
        return `${p.name} (${c?.name})`;
      }).join(", ");

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design a unique loot item tailored for a party consisting of: ${classDescriptions}.`,
        config: {
          systemInstruction: "You are a TTRPG loot master. Generate a single magical item in JSON format.",
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
      const data = JSON.parse(cleanJson(response.text || '{}'));
      return { ...data, id: Math.random().toString(36).substr(2, 9) };
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

export const generateSummary = async (logs: GameLog[], oldSummary: string): Promise<string> => {
  return withRetry(async () => {
    trackUsage('utility', 5);
    try {
      const ai = getAI();
      const logContext = logs.map(l => `${l.role === 'dm' ? 'DM' : 'Player'}: ${l.content}`).join('\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize this narrative session into a concise memory. Current summary: "${oldSummary}". New logs:\n${logContext}`
      });
      return response.text || oldSummary;
    } catch (e) {
      throw handleAIError(e);
    }
  });
};

export const getDMResponse = async (history: {role: string, content: string}[], plot: string, newMessage: string, knownCharacters: Character[], summary: string) => {
  return withRetry(async () => {
    trackUsage('dm'); // Consumes one Token
    try {
      const ai = getAI();
      const charContext = knownCharacters.map(c => `${c.name} (${c.race})`).join(", ");
      const systemPrompt = `You are a dark fantasy Dungeon Master. Plot: ${plot}. Party: ${charContext}. Summary of recent events: ${summary}. Be evocative, descriptive, and respond to player actions. Keep responses under 200 words.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: history.map(h => ({ role: h.role === 'dm' ? 'model' : 'user', parts: [{ text: h.content }] })),
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.9,
          thinkingConfig: { thinkingBudget: 4000 }
        }
      });
      return response.text || "The shadows shift, but the path remains unclear...";
    } catch (e) {
      throw handleAIError(e);
    }
  }, 2);
};