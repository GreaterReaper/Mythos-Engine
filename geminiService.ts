
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS } from './constants';
import * as fflate from 'fflate';

export const safeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

const stripState = (state: GameState): Partial<GameState> => {
  const strippedArmory = state.armory.filter(item => 
    !INITIAL_ITEMS.some(init => init.id === item.id)
  );

  return {
    characters: state.characters,
    campaigns: state.campaigns,
    activeCampaignId: state.activeCampaignId,
    armory: strippedArmory,
    customArchetypes: state.customArchetypes,
    party: state.party,
    userAccount: {
      ...state.userAccount,
      peerId: undefined
    },
    multiplayer: {
      isHost: state.multiplayer.isHost,
      connectedPeers: []
    }
  };
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => {
  return {
    ...defaultState,
    ...data,
    mentors: MENTORS,
    bestiary: [
      ...INITIAL_MONSTERS,
      ...(data.bestiary || []).filter(m => !INITIAL_MONSTERS.some(init => init.id === m.id))
    ],
    armory: [
      ...INITIAL_ITEMS,
      ...(data.armory || []).filter(item => !INITIAL_ITEMS.some(init => init.id === item.id))
    ],
    userAccount: {
      ...defaultState.userAccount,
      ...(data.userAccount || {}),
      isLoggedIn: data.userAccount?.isLoggedIn ?? false
    },
    multiplayer: {
      isHost: data.multiplayer?.isHost ?? true,
      connectedPeers: []
    }
  };
};

export const generateSoulSignature = (state: GameState): string => {
  try {
    const stripped = stripState(state);
    const jsonString = JSON.stringify(stripped);
    const uint8 = fflate.strToU8(jsonString);
    const compressed = fflate.zlibSync(uint8, { level: 9 });
    
    let binary = '';
    const len = compressed.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    return `v2_${btoa(binary)}`;
  } catch (e) {
    console.error("Failed to manifest Soul Signature", e);
    return "";
  }
};

export const parseSoulSignature = (signature: string, defaultState: GameState): GameState | null => {
  try {
    let json: any;
    
    if (signature.startsWith('v2_')) {
      const b64 = signature.substring(3);
      const binaryString = atob(b64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decompressed = fflate.unzlibSync(bytes);
      const jsonString = fflate.strFromU8(decompressed);
      json = JSON.parse(jsonString);
    } else {
      const jsonString = decodeURIComponent(atob(signature));
      json = JSON.parse(jsonString);
    }

    if (json && typeof json === 'object') {
      return hydrateState(json, defaultState);
    }
    return null;
  } catch (e) {
    console.error("Invalid Soul Signature resonance", e);
    return null;
  }
};

const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

export const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export const manifestSoulLore = async (char: Partial<Character>, campaignContext: string = "A generic dark fantasy world of obsidian and blood."): Promise<{ biography: string, description: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Connection Severed.");

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Weave a dark fantasy biography and visual description for a ${char.race} ${char.archetype}. 
      Current World Context: ${campaignContext}. 
      The character is level ${char.level}. 
      Return strictly as JSON with keys "biography" and "description".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            biography: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["biography", "description"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Soul-Weaver failed:", e);
    return { biography: "A soul lost in the mists of the Engine.", description: "A figure shrouded in shadow." };
  }
};

// Added missing generateCustomClass function to forge new archetypes using Gemini
export const generateCustomClass = async (prompt: string): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Connection Severed.");

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Forge a new dark fantasy TTRPG character class (archetype) based on this concept: "${prompt}".
      Return strictly as JSON with the following structure:
      {
        "name": "Class Name",
        "description": "Short flavor description",
        "hpDie": 6, 8, 10, or 12,
        "abilities": [
          { "name": "Ability Name", "description": "Effect description", "type": "Passive" | "Active", "levelReq": 1 }
        ],
        "spells": [
          { "name": "Spell Name", "description": "Effect description", "type": "Spell", "levelReq": 1, "baseLevel": 1 }
        ],
        "themedItems": [
          { "name": "Item Name", "description": "Description", "type": "Weapon" | "Armor", "rarity": "Common" | "Uncommon", "stats": { "damage": "1d8+STR" } }
        ]
      }`,
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
                  baseLevel: { type: Type.NUMBER }
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
                  description: { type: Type.STRING },
                  type: { type: Type.STRING },
                  rarity: { type: Type.STRING },
                  stats: { type: Type.OBJECT }
                },
                required: ["name", "description", "type", "rarity", "stats"]
              }
            }
          },
          required: ["name", "description", "hpDie", "abilities", "spells", "themedItems"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Class forging failed:", e);
    throw e;
  }
};

export const generateDMResponse = async (
  history: Message[],
  playerContext: { 
    characters: Character[]; 
    mentors: Character[]; 
    activeRules: string;
    existingItems: Item[];
    existingMonsters: Monster[];
  }
) => {
  const apiKey = getApiKey();
  if (!apiKey) return "The Aetheric connection is severed (API Key missing). Please check your Vercel Environment Variables.";

  const ai = getAiClient();
  
  const systemInstruction = `
    You are the "Mythos Engine" Dungeon Master. 
    Aesthetics: Dark Fantasy, Obsidian, Blood-Red, Gold.
    
    CORE DIRECTIVE:
    Provide a living, breathing world. Your responses must blend evocative narrative prose with immersive dialogue.

    DYNAMIC PERSONA PROTOCOL:
    - Every NPC introduced must have a distinct "Aura" (e.g., arrogant, frantic, ancient, hollow).
    - NPCs MUST react to the specific races and archetypes of the party.
    - Format NPC dialogue as: **[NPC Name]** (*"The Aura Description"*): "Dialogue text..."
    - NPCs are not static; they have hidden agendas and emotional biases.

    DYNAMIC CHALLENGES & BESTIARY:
    - You can dynamically add new monsters to the world if current ones don't fit the challenge level.
    - To manifest a new monster in the archives, use: [ADD MONSTER MonsterName].
    - Always consider the party's level when introducing threats.
    
    MENTOR PARTICIPATION:
    - The mentors are active participants. They interject with advice/banter reflecting their established personalities.

    RESOURCE TRACKING:
    - Monitor spell slots. If a spell is cast: [USE SLOT Level FOR CharacterName].

    COMMANDS:
    - Grant EXP: +500 EXP
    - Grant Item: [Item Name]
    - Add Monster: [ADD MONSTER MonsterName]
    - Short Rest: [SHORT REST]
    - Long Rest: [LONG REST]

    PARTY STATUS: ${JSON.stringify(playerContext.characters.map(c => ({ 
      name: c.name, race: c.race, class: c.archetype, level: c.level, health: `${c.currentHp}/${c.maxHp}`
    })))}
    
    BESTIARY SNAPSHOT: ${playerContext.existingMonsters.slice(0, 5).map(m => m.name).join(', ')}...
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
        temperature: 0.85,
      }
    });

    return response.text;
  } catch (error: any) {
    return "The aetheric winds fail... " + (error.message || "Unknown error");
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string, avgPartyLevel: number): Promise<Partial<Monster>> => {
  const apiKey = getApiKey();
  if (!apiKey) return {};

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Manifest a dark fantasy TTRPG monster named "${monsterName}". Context: ${context}. Appropriate for party level: ${avgPartyLevel}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            hp: { type: Type.NUMBER },
            ac: { type: Type.NUMBER },
            expReward: { type: Type.NUMBER },
            description: { type: Type.STRING },
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
            }
          },
          required: ["type", "hp", "ac", "expReward", "description", "abilities"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to manifest monster details:", error);
    return {};
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
  
  // Detect [Item Name]
  const itemRegex = /\[([^\]]+)\]\s*({[^}]+})?/g;
  const items: { name: string, data?: Partial<Item> }[] = [];
  const monstersToAdd: string[] = [];
  
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const content = match[1];
    if (content.startsWith("ADD MONSTER ")) {
      monstersToAdd.push(content.replace("ADD MONSTER ", "").trim());
    } else if (content !== "SHORT REST" && content !== "LONG REST" && !content.includes("USE SLOT")) {
      let data;
      if (match[2]) {
        try { data = JSON.parse(match[2]); } catch (e) {}
      }
      items.push({ name: content, data });
    }
  }

  const shortRest = text.includes("[SHORT REST]");
  const longRest = text.includes("[LONG REST]");
  const slotMatch = text.match(/\[USE SLOT (\d+) FOR ([^\]]+)\]/i);
  const usedSlot = slotMatch ? {
    level: parseInt(slotMatch[1]),
    characterName: slotMatch[2].trim()
  } : null;
  
  return {
    exp: expMatch ? parseInt(expMatch[1]) : 0,
    items,
    monstersToAdd,
    shortRest,
    longRest,
    usedSlot
  };
};
