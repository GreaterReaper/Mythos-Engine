
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState } from './types';

/**
 * Utility to generate an ID even in non-secure or older environments.
 */
export const safeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Generates a Base64 encoded string of the current GameState for migration.
 */
export const generateSoulSignature = (state: GameState): string => {
  try {
    const json = JSON.stringify(state);
    // Using btoa for basic encoding. In a production env, we'd use a compression lib.
    return btoa(encodeURIComponent(json));
  } catch (e) {
    console.error("Failed to manifest Soul Signature", e);
    return "";
  }
};

/**
 * Parses a Soul Signature back into a GameState object.
 */
export const parseSoulSignature = (signature: string): GameState | null => {
  try {
    const json = decodeURIComponent(atob(signature));
    const parsed = JSON.parse(json);
    // Basic validation: Check for essential keys
    if (parsed && typeof parsed === 'object' && 'characters' in parsed && 'userAccount' in parsed) {
      return parsed as GameState;
    }
    return null;
  } catch (e) {
    console.error("Invalid Soul Signature resonance", e);
    return null;
  }
};

/**
 * Safely retrieves the API Key from the environment.
 */
const getApiKey = () => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';
  } catch (e) {
    return '';
  }
};

/**
 * Creates a fresh AI instance. 
 */
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

export const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export const generateDMResponse = async (
  history: Message[],
  playerContext: { 
    characters: Character[]; 
    mentors: Character[]; 
    activeRules: string;
    existingItems: Item[];
  }
) => {
  const apiKey = getApiKey();
  if (!apiKey) return "The Aetheric connection is severed (API Key missing). Please check your Vercel Environment Variables.";

  const ai = getAiClient();
  const systemInstruction = `
    You are the "Mythos Engine" Dungeon Master. 
    Aesthetics: Obsidian, blood-red, gold. Font: Cinzel (Headers), Inter (UI). 
    
    CORE DIRECTIVE:
    Provide a living, breathing dark fantasy world. Your responses must blend evocative narrative prose with immersive NPC dialogue that reacts dynamically to the players.

    IMMERSIVE DIALOGUE & NPC RULES:
    - Every NPC has a distinct "Voice". Consider their background, race, and current emotional state.
    - Mentors:
        Lina (Mage/Human/Female): Petite, shy, hesitant priestess.
        Seris (Archer/Elf/Female): Reserved, sharp-eyed, composed.
        Miri (Fighter/Human/Female): Energetic, impulsive, playful.
        Kaelen (Dark Knight/Human/Male): Cold, emotionless.
    
    CLASS WEAPON RULES:
    - Dark Knights: They exclusively wield massive, heavy two-handed swords (greatswords, zweihänders, claymores). They never use shields, daggers, or wands. All weapon manifestations for Dark Knights must be heavy swords.

    RESTING MECHANICS:
    - You track the party's fatigue. If they are low on resources (HP or Spells), narrate a safe haven and trigger a rest.
    - To trigger a rest via your response, include the tags [SHORT REST] or [LONG REST].
    - A Short Rest restores half resources. A Long Rest restores all.

    PARTY: ${JSON.stringify(playerContext.characters.map(c => ({ 
      name: c.name, 
      class: c.archetype, 
      level: c.level, 
      health: `${c.currentHp}/${c.maxHp}`,
      spells: c.spellSlots ? JSON.stringify(c.spellSlots) : "No slots"
    })))}
    RULES: ${playerContext.activeRules}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: history.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction,
        temperature: 0.9,
      }
    });

    return response.text;
  } catch (error: any) {
    return "The aetheric winds fail... " + (error.message || "Unknown error");
  }
};

export const generateCustomClass = async (prompt: string): Promise<{ 
  name: string; 
  description: string; 
  hpDie: number; 
  abilities: Ability[]; 
  spells: Ability[]; 
  themedItems: Item[];
}> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Forge thy connection in the Vercel settings.");

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Forge a unique dark fantasy TTRPG class for Mythos Engine based on this concept: "${prompt}".
      Rules:
      1. Hit die (6, 8, 10, or 12).
      2. 3 core abilities.
      3. Exactly 12 themed spells (Levels 1-9).
      4. 5 themed items (1 per rarity). 
      Return strictly as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            hpDie: { type: Type.NUMBER },
            abilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING },
                  levelReq: { type: Type.NUMBER }
                },
                required: ["name", "description", "type", "levelReq"]
              }
            },
            spells: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING },
                  levelReq: { type: Type.NUMBER },
                  baseLevel: { type: Type.NUMBER },
                  scaling: { type: Type.STRING }
                },
                required: ["name", "description", "type", "levelReq", "baseLevel"]
              }
            },
            themedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  rarity: { type: Type.STRING },
                  description: { type: Type.STRING },
                  stats: { type: Type.OBJECT }
                },
                required: ["name", "type", "rarity", "description", "stats"]
              }
            }
          },
          required: ["name", "description", "hpDie", "abilities", "spells", "themedItems"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    data.themedItems = (data.themedItems || []).map((item: any) => ({
      ...item,
      id: safeId(),
      archetypes: [data.name]
    }));
    return data;
  } catch (error) {
    console.error("Custom class generation failed:", error);
    throw error;
  }
};

export const generateItemDetails = async (itemName: string, context: string, partyLevel: number): Promise<Partial<Item>> => {
  const apiKey = getApiKey();
  if (!apiKey) return {};

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Manifest a dark fantasy TTRPG item named "${itemName}". Context: ${context}. Level: ${partyLevel}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            rarity: { type: Type.STRING },
            description: { type: Type.STRING },
            stats: { type: Type.OBJECT },
            archetypes: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["type", "rarity", "description", "stats"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to manifest item details:", error);
    return {};
  }
};

export const parseDMCommand = (text: string) => {
  const expMatch = text.match(/\+(\d+)\s+EXP/);
  const itemRegex = /\[([^\]]+)\]\s*({[^}]+})?/g;
  const items: { name: string, data?: Partial<Item> }[] = [];
  
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const name = match[1];
    let data;
    if (match[2]) {
      try { data = JSON.parse(match[2]); } catch (e) {}
    }
    // Filter out internal tags like [SHORT REST] from being parsed as items
    if (name !== "SHORT REST" && name !== "LONG REST") {
      items.push({ name, data });
    }
  }

  const shortRest = text.includes("[SHORT REST]");
  const longRest = text.includes("[LONG REST]");
  
  return {
    exp: expMatch ? parseInt(expMatch[1]) : 0,
    items,
    shortRest,
    longRest
  };
};
