import { GoogleGenAI, Type } from "@google/genai";
import { Stats, ClassDef, Monster, Item, Trait, Character, GameLog, Spell } from "../types";

const cleanJson = (text: string) => {
  if (!text) return '{}';
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

const trackUsage = (type: 'dm' | 'utility', cost: number = 0) => {
  window.dispatchEvent(new CustomEvent('mythos:arcane_use', { detail: { type, cost } }));
};

const reportError = (isRateLimit: boolean, isQuotaExceeded: boolean = false) => {
  window.dispatchEvent(new CustomEvent('mythos:arcane_error', { detail: { isRateLimit, isQuotaExceeded } }));
};

const isHardLockoutActive = () => {
  return window.sessionStorage.getItem('mythos_lockout_active') === 'true';
};

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("ARCANE_FOCI_MISSING");
  return new GoogleGenAI({ apiKey });
};

async function withRetry<T>(fn: () => Promise<T>, retries = 2, initialDelay = 10000): Promise<T> {
  if (isHardLockoutActive()) throw new Error("RECALIBRATION_IN_PROGRESS");
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString().toLowerCase();
    if (errorStr.includes('quota')) {
      reportError(true, true);
      throw new Error("DAILY_QUOTA_EXHAUSTED");
    }
    if (errorStr.includes('429')) {
      reportError(true, false);
      throw new Error("LEY_LINES_OVERLOADED");
    }
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      return withRetry(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

export const generateImage = async (prompt: string, referenceBase64?: string): Promise<string> => {
  trackUsage('utility', 25); 
  return withRetry(async () => {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (referenceBase64) {
      const base64Data = referenceBase64.includes(',') ? referenceBase64.split(',')[1] : referenceBase64;
      parts.unshift({ inlineData: { data: base64Data, mimeType: 'image/png' } });
    }
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
    });
    const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : '';
  });
};

export const generateCharacterFeats = async (className: string, description: string): Promise<Trait[]> => {
  trackUsage('utility', 10);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 unique TTRPG traits/feats for a level 1 ${className}. Lore: ${description}.`,
      config: {
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
  });
};

export const generateSpellbook = async (className: string, classDesc: string, maxLevel: number): Promise<Spell[]> => {
  trackUsage('utility', 15);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate thematic spells for a level ${maxLevel} ${className}. Lore: ${classDesc}.`,
      config: {
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
  });
};

export const rerollTraits = async (
  contextType: string,
  contextName: string,
  contextDesc: string,
  existingTraits: Trait[]
): Promise<Trait[]> => {
  trackUsage('utility', 5);
  return withRetry(async () => {
    const locked = existingTraits.filter(t => t.locked);
    const countToGenerate = Math.max(0, existingTraits.length - locked.length);
    if (countToGenerate === 0) return locked;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${countToGenerate} NEW unique ${contextType} traits for "${contextName}". Avoid: ${locked.map(l => l.name).join(', ')}. Context: ${contextDesc}`,
      config: {
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
  });
};

export const rerollStats = async (
  name: string,
  className: string,
  existingStats: Stats,
  lockedStats: (keyof Stats)[]
): Promise<Stats> => {
  trackUsage('utility', 5);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Reroll TTRPG stats (range 8-18) for "${name}" (${className}). KEEP THESE: ${lockedStats.map(s => `${s}:${existingStats[s]}`).join(', ')}. Make others thematic.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strength: { type: Type.INTEGER },
            dexterity: { type: Type.INTEGER },
            constitution: { type: Type.INTEGER },
            intelligence: { type: Type.INTEGER },
            wisdom: { type: Type.INTEGER },
            charisma: { type: Type.INTEGER }
          },
          required: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
        }
      }
    });
    const rolled = JSON.parse(cleanJson(response.text || '{}'));
    // Enforce locks programmatically to be safe
    lockedStats.forEach(s => { rolled[s] = existingStats[s]; });
    return rolled;
  });
};

export const getDMResponse = async (history: any[], plot: string, input: string, party: Character[], summary: string, model: string) => {
  trackUsage('dm');
  return withRetry(async () => {
    const ai = getAI();
    const partyStr = party.map(c => `${c.name} (${c.race} ${c.level})`).join(", ");
    const response = await ai.models.generateContent({
      model: model,
      contents: `Plot: ${plot}. Summary: ${summary}. Party: ${partyStr}. Action: ${input}. History: ${JSON.stringify(history.slice(-5))}`,
      config: {
        systemInstruction: "You are a dark fantasy Dungeon Master. Be evocative, brief, and reactive. Focus on consequences.",
      }
    });
    return response.text || "The shadows lengthen, but the path remains unclear.";
  });
};

export const generateSmartLoot = async (party: Character[], classes: ClassDef[]): Promise<Item> => {
  trackUsage('utility', 15);
  return withRetry(async () => {
    const ai = getAI();
    const partyDesc = party.map(p => `${p.name} (${p.race} ${classes.find(c => c.id === p.classId)?.name})`).join(", ");
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Forge a legendary item for one of these heroes: ${partyDesc}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["Weapon", "Armor"] },
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
    return JSON.parse(cleanJson(response.text || '{}'));
  });
};

export const generateSummary = async (logs: GameLog[], currentSummary: string): Promise<string> => {
  trackUsage('utility', 5);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Update TTRPG summary. Current: ${currentSummary}. New events: ${logs.map(l => l.content).join(" ")}`,
      config: { systemInstruction: "Update the summary of the TTRPG saga in 2 sentences." }
    });
    return response.text || currentSummary;
  });
};

export const generateClassMechanics = async (name: string, description: string): Promise<any> => {
  trackUsage('utility', 10);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Design mechanics for class: ${name}. Lore: ${description}. Include primary stats and unique bonuses.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hitDie: { type: Type.STRING },
            startingHp: { type: Type.INTEGER },
            hpPerLevel: { type: Type.INTEGER },
            spellSlots: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "Number of spell slots for levels 1-5" },
            preferredStats: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Recommended core stats (e.g. Strength, Intelligence)" },
            bonuses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Innate class proficiencies or minor passive bonuses" },
            features: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } }
          },
          required: ["hitDie", "startingHp", "hpPerLevel", "spellSlots", "preferredStats", "bonuses", "features"]
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  });
};

export const generateMonsterStats = async (name: string, description: string, isBoss: boolean): Promise<any> => {
  trackUsage('utility', 10);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate stats for monster: ${name}. Description: ${description}. Boss: ${isBoss}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hp: { type: Type.INTEGER },
            ac: { type: Type.INTEGER },
            stats: { type: Type.OBJECT, properties: { strength: { type: Type.INTEGER }, dexterity: { type: Type.INTEGER }, constitution: { type: Type.INTEGER }, intelligence: { type: Type.INTEGER }, wisdom: { type: Type.INTEGER }, charisma: { type: Type.INTEGER } } },
            abilities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, effect: { type: Type.STRING } } } }
          }
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  });
};

export const generateItemMechanics = async (name: string, type: string, description: string): Promise<any> => {
  trackUsage('utility', 10);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Forge item mechanics for ${type}: ${name}. Lore: ${description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mechanics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } },
            lore: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  });
};