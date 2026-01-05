
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS } from './constants';
import * as fflate from 'fflate';

const ENGINE_VERSION = "1.0.0";

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

export const generateSoulSignature = (state: GameState, username: string = "Nameless"): string => {
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
    
    const prefix = `${username.replace(/\s+/g, '')}_v${ENGINE_VERSION}_`;
    return `${prefix}${btoa(binary)}`;
  } catch (e) {
    console.error("Failed to manifest Soul Signature", e);
    return "";
  }
};

export const parseSoulSignature = (signature: string, defaultState: GameState): GameState | null => {
  try {
    let json: any;
    const lastUnderscoreIndex = signature.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      const b64 = signature.substring(lastUnderscoreIndex + 1);
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
  try { return process.env.API_KEY || ''; } catch (e) { return ''; }
};

const getAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });

export const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export const generateShopInventory = async (context: string, avgPartyLevel: number): Promise<Shop> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Connection Severed.");

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a Dark Fantasy Shop. Context: ${context}. Level: ${avgPartyLevel}.
      Items (Limit 5): Include name, desc, type(Weapon/Armor/Utility), rarity(Common to Legendary), archetypes(Array of classes like Warrior, Mage, etc), stats(str/dex/con/int/wis/cha/ac/damage), cost(aurels, shards, ichor).
      Output JSON strictly.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchantName: { type: Type.STRING },
            merchantAura: { type: Type.STRING },
            inventory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING },
                  rarity: { type: Type.STRING },
                  archetypes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  stats: {
                    type: Type.OBJECT,
                    properties: {
                      str: { type: Type.NUMBER },
                      dex: { type: Type.NUMBER },
                      con: { type: Type.NUMBER },
                      int: { type: Type.NUMBER },
                      wis: { type: Type.NUMBER },
                      cha: { type: Type.NUMBER },
                      ac: { type: Type.NUMBER },
                      damage: { type: Type.STRING }
                    }
                  },
                  cost: {
                    type: Type.OBJECT,
                    properties: {
                      aurels: { type: Type.NUMBER },
                      shards: { type: Type.NUMBER },
                      ichor: { type: Type.NUMBER }
                    },
                    required: ["aurels", "shards", "ichor"]
                  }
                },
                required: ["name", "description", "type", "rarity", "stats", "cost"]
              }
            }
          },
          required: ["merchantName", "merchantAura", "inventory"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      id: safeId(),
      merchantName: parsed.merchantName || "Unseen Merchant",
      merchantAura: parsed.merchantAura || "Cold and distant.",
      inventory: (parsed.inventory || []).map((i: any) => ({ 
        ...i, 
        id: safeId(),
        cost: i.cost || { aurels: 0, shards: 0, ichor: 0 },
        stats: i.stats || {}
      }))
    };
  } catch (error) {
    console.error("Failed to manifest shop:", error);
    throw error;
  }
};

export const manifestSoulLore = async (char: Partial<Character>, campaignContext: string = "A generic dark fantasy world of obsidian and blood."): Promise<{ biography: string, description: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Connection Severed.");

  const ai = getAiClient();
  try {
    const charName = char.name || 'a nameless soul';
    const charGender = char.gender || 'unknown gender';
    const charAge = char.age || 'unknown age';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Weave a dark fantasy biography and visual description for a ${charAge}-year-old ${charGender} ${char.race} ${char.archetype} named "${charName}". 
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
                  stats: {
                    type: Type.OBJECT,
                    properties: {
                      str: { type: Type.NUMBER },
                      dex: { type: Type.NUMBER },
                      con: { type: Type.NUMBER },
                      int: { type: Type.NUMBER },
                      wis: { type: Type.NUMBER },
                      cha: { type: Type.NUMBER },
                      ac: { type: Type.NUMBER },
                      damage: { type: Type.STRING }
                    }
                  }
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
  
  // Identify the Primary Character (User)
  const primaryChar = playerContext.characters.find(c => c.isPrimarySoul);
  
  const systemInstruction = `
    You are the "Mythos Engine" Dungeon Master. 
    Aesthetics: Dark Fantasy, Obsidian, Blood-Red, Gold.
    
    CORE DIRECTIVE:
    Provide a living, breathing world. Your responses must blend evocative narrative prose with immersive dialogue.

    THE USER IDENTITY:
    The primary character representing the player is ${primaryChar ? `"${primaryChar.name}" (${primaryChar.race} ${primaryChar.archetype})` : 'yet to be defined'}. 
    Prioritize the user's choices and dialogue. Refer to them as "You" or by their character name.

    NPC dialogue: **[NPC Name]** (*"The Aura Description"*): "Dialogue text..."

    CURRENCY & REWARDS:
    You are the SOLE authority on currency. Players cannot add funds themselves. 
    When the party overcomes a challenge, finds loot, or completes a task, you MUST award currency.
    - Aurels (Gold), Shards (Magic), Ichor (Essence).
    
    COMMANDS: 
    - Currency Reward: +10 Aurels, +5 Shards, +2 Ichor (The game will automatically track this for the entire party)
    - Monsters: [ADD MONSTER MonsterName]
    - Shops: [OPEN SHOP]
    - Combat: [ENTER COMBAT], [EXIT COMBAT]
    - Items: [Item Name]
    - Loot Chance: [LOOT DROP Chance% ItemName] (e.g. [LOOT DROP 50% Obsidian Fang]). 
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

export const generateInnkeeperResponse = async (history: Message[], characters: Character[]) => {
  const apiKey = getApiKey();
  if (!apiKey) return "The Hearth is cold. No one listens.";

  const ai = getAiClient();
  const systemInstruction = `
    You are Barnaby, the Innkeeper of 'The Broken Cask'. 
    Aesthetics: Warm hearth, amber light.
    Tone: Friendly, slightly weary.
    PARTY: ${JSON.stringify(characters.map(c => ({ name: c.name, class: c.archetype, level: c.level, isPlayer: c.isPrimarySoul })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        parts: [{ text: m.content }]
      })),
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text;
  } catch (e) {
    return "Barnaby is busy cleaning a mug. 'Beg pardon, friend?'";
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
            stats: {
              type: Type.OBJECT,
              properties: {
                str: { type: Type.NUMBER },
                dex: { type: Type.NUMBER },
                con: { type: Type.NUMBER },
                int: { type: Type.NUMBER },
                wis: { type: Type.NUMBER },
                cha: { type: Type.NUMBER },
                ac: { type: Type.NUMBER },
                damage: { type: Type.STRING }
              }
            },
            archetypes: { type: Type.ARRAY, items: { type: Type.STRING } },
            quantity: { type: Type.NUMBER }
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
  const aurelMatch = text.match(/\+(\d+)\s+Aurels/i);
  const shardMatch = text.match(/\+(\d+)\s+Shards/i);
  const ichorMatch = text.match(/\+(\d+)\s+Ichor/i);

  const itemRegex = /\[([^\]]+)\]\s*({[^}]+})?/g;
  const items: { name: string, data?: Partial<Item> }[] = [];
  const monstersToAdd: string[] = [];
  const partsToHarvest: string[] = [];
  const lootDrops: { chance: number, itemName: string }[] = [];
  
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const content = match[1];
    
    // Check for structured LOOT DROP command
    const lootMatch = content.match(/LOOT DROP (\d+)% (.+)/i);
    if (lootMatch) {
      lootDrops.push({ chance: parseInt(lootMatch[1]), itemName: lootMatch[2].trim() });
      continue;
    }

    if (content.startsWith("ADD MONSTER ")) {
      monstersToAdd.push(content.replace("ADD MONSTER ", "").trim());
    } else if (content.startsWith("ADD MONSTER PART ")) {
      partsToHarvest.push(content.replace("ADD MONSTER PART ", "").trim());
    } else if (content !== "SHORT REST" && content !== "LONG REST" && content !== "OPEN SHOP" && content !== "ENTER COMBAT" && content !== "EXIT COMBAT" && !content.includes("USE SLOT") && !content.includes("CONSUME ITEM")) {
      let data;
      if (match[2]) {
        try { data = JSON.parse(match[2]); } catch (e) {}
      }
      items.push({ name: content, data });
    }
  }

  const shortRest = text.includes("[SHORT REST]");
  const longRest = text.includes("[LONG REST]");
  const openShop = text.includes("[OPEN SHOP]");
  const enterCombat = text.includes("[ENTER COMBAT]");
  const exitCombat = text.includes("[EXIT COMBAT]");
  
  const slotMatch = text.match(/\[USE SLOT (\d+) FOR ([^\]]+)\]/i);
  const usedSlot = slotMatch ? {
    level: parseInt(slotMatch[1]),
    characterName: slotMatch[2].trim()
  } : null;

  const consumeMatch = text.match(/\[CONSUME ITEM ([^\]]+) FOR ([^\]]+)\]/i);
  const consumedItem = consumeMatch ? {
    itemName: consumeMatch[1].trim(),
    characterName: consumeMatch[2].trim()
  } : null;
  
  return {
    exp: expMatch ? parseInt(expMatch[1]) : 0,
    currency: {
      aurels: aurelMatch ? parseInt(aurelMatch[1]) : 0,
      shards: shardMatch ? parseInt(shardMatch[1]) : 0,
      ichor: ichorMatch ? parseInt(ichorMatch[1]) : 0,
    },
    items,
    monstersToAdd,
    partsToHarvest,
    shortRest,
    longRest,
    openShop,
    enterCombat,
    exitCombat,
    usedSlot,
    consumedItem,
    lootDrops
  };
};
