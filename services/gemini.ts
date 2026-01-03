
import { GoogleGenAI, Type } from "@google/genai";
import { Stats, ClassDef, Monster, Item, Trait, Character, GameLog, Spell, Rule, MonsterAbility, ItemMechanic } from "../types";

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

const isAdmin = () => (window as any).isMythosAdmin === true;

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("ARCANE_FOCI_MISSING");
  return new GoogleGenAI({ apiKey });
};

async function withRetry<T>(fn: (forceModel?: string) => Promise<T>, retries = 3, initialDelay = 5000): Promise<T> {
  const admin = isAdmin();
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString().toLowerCase();
    const isQuota = errorStr.includes('quota');
    const isRateLimit = errorStr.includes('429') || errorStr.includes('rate limit') || errorStr.includes('too many requests');

    if (isQuota) {
      if (!admin) throw new Error("DAILY_QUOTA_EXHAUSTED");
      try {
        return await fn('gemini-3-flash-preview');
      } catch (fallbackError) {}
    }

    if (retries > 0 && (isRateLimit || isQuota)) {
      const wait = admin ? 1000 : initialDelay;
      await new Promise(resolve => setTimeout(resolve, wait));
      return withRetry(fn, retries - 1, initialDelay * 2);
    }

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      return withRetry(fn, retries - 1, initialDelay * 1.5);
    }

    throw error;
  }
}

export const generateImage = async (prompt: string, referenceBase64?: string): Promise<string> => {
  return withRetry(async () => {
    const ai = getAI();
    const enhancedPrompt = `High quality professional dark fantasy TTRPG concept art: ${prompt}. Atmospheric lighting, detailed textures, obsidian and gold accents. Portrait or landscape.`;
    
    const parts: any[] = [{ text: enhancedPrompt }];
    if (referenceBase64) {
      const base64Data = referenceBase64.includes(',') ? referenceBase64.split(',')[1] : referenceBase64;
      parts.push({ inlineData: { data: base64Data, mimeType: 'image/png' } });
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

export const getDMResponse = async (history: any[], plot: string, input: string, party: Character[], summary: string, model: string) => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const partyStr = party.map(c => `${c.name} (${c.race} ${c.classId === 'basic-warrior' ? 'Warrior' : c.classId === 'basic-priestess' ? 'Priestess' : 'Archer'} Level ${c.level})`).join(", ");
    
    const response = await ai.models.generateContent({
      model: forcedModel || model,
      contents: `Plot: ${plot}. Summary: ${summary}. Current Party: ${partyStr}. Action: ${input}. History: ${JSON.stringify(history.slice(-8))}`,
      config: {
        systemInstruction: `You are a dark fantasy Dungeon Master. 
        ROLEPLAY GUIDELINES:
        - Miri: Energetic human swordswoman. Confident, eager for battle, speaks with excitement. She often takes point.
        - Lina: Timid human priestess. Shy, worries about the party, clutches her holy symbol. Speaks softly and seeks safety.
        - Seris: Aloof elf archer. Stoic, observant, rarely speaks but is deadly efficient. Her words are brief and logical.
        - If players interact with these characters, YOU roleplay them.
        - The party often consists of one or more PLAYERS and these three AI heroes. 
        - Adapt the narrative uniquely to player choices. If multiple players are present (multiplayer), ensure the story centers around their collective actions.
        - Be evocative and reactive. Focus on immediate consequences. 
        - Combat: If a roll is needed, explicitly tell the player(s) which die to roll (e.g., 'Roll a d20 for Strength (Athletics)').
        - Keep responses concise but immersive.`,
      }
    });
    return response.text || "The darkness of the Grey Marches presses in, but you find no response in the silence.";
  });
};

export const generateRules = async (plot: string): Promise<Rule[]> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Design 5 core TTRPG rules for a world with this plot: ${plot}. Focus on combat, exploration, and the specific threat of the Gorechimera. Output ONLY JSON.`,
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

export const generateCharacterFeats = async (className: string, description: string): Promise<Trait[]> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Generate 3 unique TTRPG feats for a ${className}. Lore: ${description}. Output ONLY JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { 
              name: { type: Type.STRING }, 
              description: { type: Type.STRING },
              usageCheck: { type: Type.STRING },
              dc: { type: Type.INTEGER }
            },
            required: ["name", "description"]
          }
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  });
};

// Fix for missing members in gemini services
export const generateSummary = async (history: any[], currentSummary: string): Promise<string> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Previous Summary: ${currentSummary}. Recent Events: ${JSON.stringify(history.slice(-10))}. Summarize the story so far into a single cohesive paragraph.`,
    });
    return response.text || currentSummary;
  });
};

// Fix for missing members in gemini services
export const generateWorldMap = async (plot: string): Promise<string> => {
  return generateImage(`A highly detailed fantasy world map based on this plot: ${plot}. Old parchment style, intricate icons for cities and landmarks.`);
};

// Fix for missing members in gemini services
export const generateLocalTiles = async (location: string, count: number): Promise<string[]> => {
  const tiles: string[] = [];
  for (let i = 0; i < count; i++) {
    tiles.push(await generateImage(`A tactical top-down battlemap tile for: ${location}. High detail, grids, atmosphere fitting the location. Part ${i + 1} of ${count}.`));
  }
  return tiles;
};

// Fix for missing members in gemini services
export const generateSmartLoot = async (party: Character[], classes: ClassDef[]): Promise<Item> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const partyInfo = party.map(c => `${c.name} (${c.classId})`).join(", ");
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Party: ${partyInfo}. Generate one unique magical item (Weapon or Armor) tailored for this party. Output ONLY JSON.`,
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
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "description"]
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

// Fix for missing members in gemini services
export const rerollTraits = async (type: string, name: string, description: string, traits: any[]): Promise<any[]> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const unlockedTraits = traits.filter(t => !t.locked);
    if (unlockedTraits.length === 0) return [];
    
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Type: ${type}. Name: ${name}. Description: ${description}. Current Traits to replace: ${JSON.stringify(unlockedTraits)}. Generate ${unlockedTraits.length} new unique traits. Output ONLY JSON array of objects.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              usageCheck: { type: Type.STRING },
              dc: { type: Type.INTEGER }
            },
            required: ["name", "description"]
          }
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  });
};

// Fix for missing members in gemini services
export const generateSpellbook = async (className: string, description: string, count: number): Promise<Spell[]> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Class: ${className}. Description: ${description}. Generate ${count} unique spells. Output ONLY JSON.`,
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

// Fix for missing members in gemini services
export const rerollStats = async (name: string, className: string, currentStats: Stats, lockedStats: (keyof Stats)[]): Promise<Stats> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Name: ${name}. Class: ${className}. Locked Stats: ${lockedStats.join(", ")}. Current Stats: ${JSON.stringify(currentStats)}. Generate new balanced stats (range 8-15) keeping locked ones. Output ONLY JSON.`,
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
    const newStats = JSON.parse(cleanJson(response.text || '{}'));
    lockedStats.forEach(s => { newStats[s] = currentStats[s]; });
    return newStats as Stats;
  });
};

// Fix for missing members in gemini services
export const generateCharacterAppearance = async (name: string, race: string, gender: string, className: string, description: string): Promise<string> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Name: ${name}. Race: ${race}. Gender: ${gender}. Class: ${className}. Input Description: ${description}. Generate a detailed, evocative fantasy character appearance description (max 2-3 sentences).`,
    });
    return response.text || description;
  });
};

// Fix for missing members in gemini services
export const generateClassMechanics = async (name: string, description: string): Promise<any> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Class Name: ${name}. Description: ${description}. Generate TTRPG class mechanics. Output ONLY JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hitDie: { type: Type.STRING, enum: ["d6", "d8", "d10", "d12"] },
            startingHp: { type: Type.INTEGER },
            hpPerLevel: { type: Type.INTEGER },
            spellSlots: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            preferredStats: { type: Type.ARRAY, items: { type: Type.STRING } },
            bonuses: { type: Type.ARRAY, items: { type: Type.STRING } },
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
            },
            initialSpells: {
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
          },
          required: ["hitDie", "startingHp", "hpPerLevel", "spellSlots", "preferredStats", "bonuses", "features", "initialSpells"]
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  });
};

// Fix for missing members in gemini services
export const generateClassEquipment = async (name: string, description: string, hitDie: string, hasSpells: boolean): Promise<Item[]> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Class: ${name}. Description: ${description}. Hit Die: ${hitDie}. Spellcaster: ${hasSpells}. Generate 2 signature items (Weapon or Armor) for this class. Output ONLY JSON.`,
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
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["name", "description"]
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

// Fix for missing members in gemini services
export const generateSingleSpell = async (className: string, description: string, level: number): Promise<Spell> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Class: ${className}. Description: ${description}. Level: ${level}. Generate one unique spell. Output ONLY JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  });
};

// Fix for missing members in gemini services
export const getArchitectAdvice = async (type: string, name: string, description: string): Promise<string[]> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Type: ${type}. Name: ${name}. Description: ${description}. Give 3 concise balance tips for an architect designing this. Output ONLY JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  });
};

// Fix for missing members in gemini services
export const generateMonsterStats = async (name: string, description: string, isBoss: boolean): Promise<any> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Monster Name: ${name}. Description: ${description}. Is Boss: ${isBoss}. Generate TTRPG monster stats. Output ONLY JSON.`,
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
              },
              required: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
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
            },
            legendaryActions: {
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
    return JSON.parse(cleanJson(response.text || '{}'));
  });
};

// Fix for missing members in gemini services
export const generateMonsterAbilities = async (name: string, description: string): Promise<MonsterAbility[]> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Monster: ${name}. Description: ${description}. Generate 2 unique abilities. Output ONLY JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  });
};

// Fix for missing members in gemini services
export const generateItemMechanics = async (name: string, type: string, description: string): Promise<any> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Item: ${name}. Type: ${type}. Description: ${description}. Generate mechanics and lore. Output ONLY JSON.`,
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
    return JSON.parse(cleanJson(response.text || '{}'));
  });
};

// Fix for missing members in gemini services
export const generateItemMechanicsList = async (name: string, type: string, description: string): Promise<ItemMechanic[]> => {
  return withRetry(async (forcedModel) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: forcedModel || 'gemini-3-flash-preview',
      contents: `Item: ${name}. Type: ${type}. Description: ${description}. Generate 2 mechanics. Output ONLY JSON.`,
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
    return JSON.parse(cleanJson(response.text || '[]'));
  });
};
