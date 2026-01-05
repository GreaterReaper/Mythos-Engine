
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability } from './types';

// Safety check for environment variables to prevent top-level crashes
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

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
  if (!getApiKey()) return "The Aetheric connection is severed (API Key missing). Please check your Vercel Environment Variables.";

  const systemInstruction = `
    You are the "Mythos Engine" Dungeon Master. 
    Aesthetics: Obsidian, blood-red, gold. Font: Cinzel (Headers), Inter (UI). 
    
    CORE DIRECTIVE:
    Provide a living, breathing dark fantasy world. Your responses must blend evocative narrative prose with immersive NPC dialogue that reacts dynamically to the players.

    IMMERSIVE DIALOGUE & NPC RULES:
    - Every NPC has a distinct "Voice". Consider their background, race, and current emotional state.
    - Mentors (Maintain these voices strictly):
        Lina (Mage/Human/Female): Petite, shy, hesitant priestess. Stutters slightly when stressed.
        Seris (Archer/Elf/Female): Reserved, sharp-eyed, composed. Speaks in short, clinical sentences.
        Miri (Fighter/Human/Female): Energetic, impulsive, playful. Uses exclamations.
        Kaelen (Dark Knight/Human/Male): Cold, emotionless, total emotional control.
    - Campaign NPCs: For non-mentor NPCs, invent a personality and maintain it.

    SITUATIONAL AWARENESS:
    - If the party is wounded, NPCs should express concern, malice, or opportunistic greed.
    
    MECHANICAL COMMANDS (Keep these distinct from narrative):
    - Grant EXP: "+[Amount] EXP" (DM ONLY).
    - Grant Loot: "[Item Name]". 
    - Provide stats in JSON after the name if generating a new artifact: [Item Name] { "type": "Weapon", "rarity": "Rare", "description": "...", "stats": { "damage": "1d8+STR" }, "archetypes": ["Warrior"] }. 
    
    SPELLCASTING:
    - Casters use spell slots (1st-9th level).
    - Higher level slots can be used to "Upcast" spells for increased power.
    
    EXP Scaling: Level Up = 1000 * Level.
    
    PARTY: ${JSON.stringify(playerContext.characters.map(c => ({ 
      name: c.name, 
      class: c.archetype, 
      level: c.level, 
      health: `${c.currentHp}/${c.maxHp}`,
      slots: c.spellSlots
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

/**
 * Procedurally generates a custom class based on a player's prompt.
 * Now populates at least 10 spells and a suite of armory items.
 */
export const generateCustomClass = async (prompt: string): Promise<{ 
  name: string; 
  description: string; 
  hpDie: number; 
  abilities: Ability[]; 
  spells: Ability[]; 
  themedItems: Item[];
}> => {
  if (!getApiKey()) throw new Error("API Key is missing. Forge thy connection in the Vercel settings.");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Forge a unique dark fantasy TTRPG class for Mythos Engine based on this concept: "${prompt}".
      Rules:
      1. Flavorful class name and grim description.
      2. Hit die (6, 8, 10, or 12).
      3. 3 core abilities (at least 1 Passive, 1 Active).
      4. IF THE CLASS HAS MAGIC: Create exactly 12 themed spells (Levels 1-9) with upcasting scaling.
      5. Create 5 themed items (1 Common, 1 Uncommon, 1 Rare, 1 Epic, 1 Legendary) for the Armory. 
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
                  type: { type: Type.STRING, description: "Passive, Active, or Feat" },
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
                  type: { type: Type.STRING, enum: ["Spell"] },
                  levelReq: { type: Type.NUMBER },
                  baseLevel: { type: Type.NUMBER, description: "1 to 9" },
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
                  type: { type: Type.STRING, enum: ["Weapon", "Armor", "Utility"] },
                  rarity: { type: Type.STRING, enum: ["Common", "Uncommon", "Rare", "Epic", "Legendary"] },
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

    const data = JSON.parse(response.text);
    // Ensure IDs are present for items
    data.themedItems = data.themedItems.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      archetypes: [data.name]
    }));
    return data;
  } catch (error) {
    console.error("Custom class generation failed:", error);
    throw error;
  }
};

export const generateItemDetails = async (itemName: string, context: string, partyLevel: number): Promise<Partial<Item>> => {
  if (!getApiKey()) return {};

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Manifest the essence of a dark fantasy TTRPG item named "${itemName}". 
      Setting: Mythos Engine (Grimdark, Obsidian, Gold aesthetic).
      Campaign Context: ${context}.
      Average Party Level: ${partyLevel}.
      Provide balanced TTRPG stats, rarity, and a flavorful description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Weapon, Armor, or Utility" },
            rarity: { type: Type.STRING, description: "Common, Uncommon, Rare, Epic, or Legendary" },
            description: { type: Type.STRING },
            stats: { 
              type: Type.OBJECT,
              properties: {
                damage: { type: Type.STRING },
                ac: { type: Type.NUMBER },
                str: { type: Type.NUMBER },
                dex: { type: Type.NUMBER },
                con: { type: Type.NUMBER },
                int: { type: Type.NUMBER },
                wis: { type: Type.NUMBER },
                cha: { type: Type.NUMBER },
              }
            },
            archetypes: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }
            }
          },
          required: ["type", "rarity", "description", "stats"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to manifest item details:", error);
    return {};
  }
};

export const generateVisual = async (prompt: string): Promise<string | null> => {
  if (!getApiKey()) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Dark fantasy, obsidian and gold aesthetic, cinematic, blood-red highlights: ${prompt}` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Visual manifestation failed", error);
    return null;
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
    items.push({ name, data });
  }
  
  return {
    exp: expMatch ? parseInt(expMatch[1]) : 0,
    items
  };
};
