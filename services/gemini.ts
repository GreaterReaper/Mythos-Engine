
import { GoogleGenAI, Type } from "@google/genai";
import { Stats, ClassDef, Monster, Item, Trait, Character, GameLog, Spell, Rule } from "../types";

const cleanJson = (text: string) => {
  if (!text) return '{}';
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = Math.min(
    cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
    cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
  );
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  
  if (firstBrace !== Infinity && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
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

const isAdmin = () => (window as any).isMythosAdmin === true;

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("ARCANE_FOCI_MISSING");
  return new GoogleGenAI({ apiKey });
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 5000): Promise<T> {
  const admin = isAdmin();
  if (!admin && isHardLockoutActive()) throw new Error("RECALIBRATION_IN_PROGRESS");
  
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString().toLowerCase();
    const isQuota = errorStr.includes('quota');
    const isRateLimit = errorStr.includes('429') || errorStr.includes('rate limit') || errorStr.includes('too many requests');

    if (isQuota) {
      reportError(true, true);
      // Architects do not see the specific Quota Exhausted error if we can help it
      if (!admin) throw new Error("DAILY_QUOTA_EXHAUSTED");
    }

    if (retries > 0 && isRateLimit) {
      const wait = admin ? initialDelay / 2 : initialDelay; // Faster retries for admins
      await new Promise(resolve => setTimeout(resolve, wait));
      return withRetry(fn, retries - 1, initialDelay * 2);
    }

    if (isRateLimit) {
      reportError(true, false);
      if (!admin) throw new Error("LEY_LINES_OVERLOADED");
    }

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      return withRetry(fn, retries - 1, initialDelay * 1.5);
    }

    throw error;
  }
}

export const generateImage = async (prompt: string, referenceBase64?: string): Promise<string> => {
  trackUsage('utility', 25); 
  return withRetry(async () => {
    const ai = getAI();
    const enhancedPrompt = `High quality professional dark fantasy TTRPG concept art illustration: ${prompt}. Atmospheric lighting, detailed textures, obsidian and gold accents.`;
    
    const parts: any[] = [{ text: enhancedPrompt }];
    if (referenceBase64) {
      const base64Data = referenceBase64.includes(',') ? referenceBase64.split(',')[1] : referenceBase64;
      parts.unshift({ inlineData: { data: base64Data, mimeType: 'image/png' } });
    }
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        const cleanData = part.inlineData.data.replace(/[\n\r\s]/g, "");
        return `data:${mime};base64,${cleanData}`;
      }
    }
    return '';
  });
};

export const generateCharacterFeats = async (className: string, description: string): Promise<Trait[]> => {
  trackUsage('utility', 10);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 unique TTRPG traits/feats for a level 1 ${className}. Lore: ${description}. 
      RULES: Output ONLY JSON. Field 'description' MUST be pure mechanical rules-text. NO conversational text.`,
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
      contents: `Generate 4 thematic unique spells for a level ${maxLevel} ${className}. Lore: ${classDesc}. 
      THEMATIC INTEGRITY RULES:
      - If the class description is Arcane/Wizardly, include NO healing/restoration.
      - If the class description is Divine/Priestly, focus on buffs, healing, and holy fire.
      - If the class description is Druidic/Nature, focus on beasts and elements.
      CRITICAL RULE: The 'description' MUST ONLY contain mechanical effects and dice rolls.`,
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
      contents: `Generate ${countToGenerate} NEW unique ${contextType} traits for "${contextName}". 
      Description must be strictly mechanical rules-text. Context: ${contextDesc}`,
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
      contents: `Reroll stats for "${name}" (${className}). Locked: ${lockedStats.join(',')}.`,
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
        systemInstruction: "You are a dark fantasy Dungeon Master. Be evocative, brief, and reactive. Focus on consequences. If a roll is needed, explicitly tell the player which die to roll and what for (e.g., 'Roll a d20 for Perception').",
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
      contents: `Forge a legendary item for: ${partyDesc}. 
      Mechanics description must be pure rules text.`,
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

export const generateClassEquipment = async (className: string, classDesc: string, hitDie: string = 'd8', hasSpells: boolean = false): Promise<Item[]> => {
  trackUsage('utility', 15);
  return withRetry(async () => {
    const ai = getAI();
    const isMartialCaster = (hitDie === 'd10' || hitDie === 'd12') && hasSpells;
    const focusNote = isMartialCaster ? "IMPORTANT: This class is a martial spellcaster. Their primary signature weapon MUST also function as their arcane focus. Mention this focus property in the item's mechanical description." : "";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 2 thematic signature weapons or armor for the class: ${className}. Lore: ${classDesc}. 
      RULES: mechanics MUST be pure rules-text. ${focusNote}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
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
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
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
      contents: `Design mechanics for class: ${name}. Lore: ${description}. 
      SPELL SLOT RULES:
      - If the class is Martial/Physical (Fighter, Barbarian, Rogue style), spellSlots MUST be [0, 0, 0].
      - If the class is a Half-Caster (Paladin, Ranger style), spellSlots MUST be [2, 0, 0].
      - If the class is a Full-Caster (Wizard, Cleric style), spellSlots MUST be [4, 2, 0].
      
      THEMATIC INTEGRITY RULE: 
      - Wizard/Arcanist/Mage archetypes MUST NOT have healing spells (Cure Wounds, etc.).
      - Cleric/Priest archetypes MUST NOT have purely destructive arcane spells like Fireball unless thematic for their deity.
      - Ensure all spells and features match the class flavor description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hitDie: { type: Type.STRING },
            startingHp: { type: Type.INTEGER },
            hpPerLevel: { type: Type.INTEGER },
            spellSlots: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "Number of slots for level 1, 2, 3 spells" },
            preferredStats: { type: Type.ARRAY, items: { type: Type.STRING } },
            bonuses: { type: Type.ARRAY, items: { type: Type.STRING } },
            features: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } },
            initialSpells: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, level: { type: Type.INTEGER }, school: { type: Type.STRING }, description: { type: Type.STRING } } } }
          },
          required: ["hitDie", "startingHp", "hpPerLevel", "spellSlots", "preferredStats", "bonuses", "features", "initialSpells"]
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
      contents: `Generate monster stats for: ${name}. Description: ${description}. Is Boss: ${isBoss}. Rules text only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hp: { type: Type.INTEGER },
            ac: { type: Type.INTEGER },
            stats: { type: Type.OBJECT, properties: { strength: { type: Type.INTEGER }, dexterity: { type: Type.INTEGER }, constitution: { type: Type.INTEGER }, intelligence: { type: Type.INTEGER }, wisdom: { type: Type.INTEGER }, charisma: { type: Type.INTEGER } } },
            abilities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, effect: { type: Type.STRING } } } },
            legendaryActions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, effect: { type: Type.STRING } } } }
          },
          required: ["hp", "ac", "stats", "abilities"]
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
      contents: `Forge item mechanics for ${type}: ${name}. Lore: ${description}. Rules text only.`,
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

export const generateRules = async (plot: string): Promise<Rule[]> => {
  trackUsage('utility', 15);
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Design 5 core TTRPG rules for a world described as: ${plot}. 
      The rules should cover core mechanics like combat, magic, health, and world interaction.
      Output ONLY JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["id", "name", "category", "content"]
          }
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  });
};
