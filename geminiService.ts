
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS } from './constants';
import * as fflate from 'fflate';

const ENGINE_VERSION = "1.0.0";

export const safeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

const trackUsage = () => {
  window.dispatchEvent(new CustomEvent('mythos_api_call'));
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
    slainMonsterTypes: state.slainMonsterTypes,
    activeRumors: state.activeRumors,
    apiUsage: state.apiUsage,
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
    slainMonsterTypes: data.slainMonsterTypes || [],
    activeRumors: data.activeRumors || [],
    apiUsage: data.apiUsage || { count: 0, lastReset: Date.now() },
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

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export const generateShopInventory = async (context: string, avgPartyLevel: number): Promise<Shop> => {
  const ai = getAiClient();
  trackUsage();
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
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Weave a dark fantasy biography and visual description for a ${char.age}-year-old ${char.gender} ${char.race} ${char.archetype} named "${char.name}". 
      Current World Context: ${campaignContext}. 
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

export const generateRumors = async (partyLevel: number): Promise<Rumor[]> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are Barnaby, the Innkeeper of 'The Broken Cask'. Generate 3 distinct dark fantasy rumors or quest hooks for a party of level ${partyLevel}.
      For each rumor, assign length (Short-Epic), danger (Trivial-Cataclysmic), and rewardTier (1-5).
      Output strictly JSON array of objects.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              hook: { type: Type.STRING },
              length: { type: Type.STRING },
              danger: { type: Type.STRING },
              rewardTier: { type: Type.NUMBER }
            },
            required: ["hook", "length", "danger", "rewardTier"]
          }
        }
      }
    });
    const parsed = JSON.parse(response.text || '[]');
    return parsed.map((r: any) => ({ ...r, id: safeId() }));
  } catch (e) {
    console.error("Rumor mill failed:", e);
    return [{ id: safeId(), hook: "The mists are quiet tonight.", length: 'Short', danger: 'Trivial', rewardTier: 1 }];
  }
};

export const generateCustomClass = async (prompt: string): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Forge a new dark fantasy character class based on: "${prompt}". Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            description: { type: Type.STRING },
            hpDie: { type: Type.NUMBER },
            abilities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING }, levelReq: { type: Type.NUMBER } } } },
            spells: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING }, levelReq: { type: Type.NUMBER }, baseLevel: { type: Type.NUMBER } } } },
            themedItems: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING }, rarity: { type: Type.STRING }, stats: { type: Type.OBJECT } } } }
          }
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
  const ai = getAiClient();
  trackUsage();
  
  const partySize = playerContext.characters.length;
  const totalLevels = playerContext.characters.reduce((acc, c) => acc + c.level, 0);
  const avgLevel = partySize > 0 ? totalLevels / partySize : 1;
  const hiddenPartyCR = Math.max(1, (avgLevel * partySize) / 4);

  const systemInstruction = `
    You are the "Mythos Engine" Dungeon Master. 
    Aesthetics: Dark Fantasy, Obsidian, Blood-Red, Gold.
    
    LAWS OF REALITY:
    ${playerContext.activeRules}

    STARTING A CAMPAIGN:
    - Provide a rich, multi-sensory description of the immediate environment.
    - Include lighting, weather, scents, and at least two distinct points of interest (one near, one far).
    - Ensure players have enough context to make an informed tactical decision immediately.

    MECHANICS TRACKING (CRITICAL):
    - Track EXPERIENCE progression: After significant events or combat, grant EXP using [EXP: amount].
    - Track SPELL SLOT usage: When a character casts a spell, send [USE_SLOT: level, characterName].
    - Track CURRENCY: [GOLD: amount], [SHARDS: amount], [ICHOR: amount].
    
    ENCOUNTER BALANCING:
    - Party Power Rating: ${hiddenPartyCR.toFixed(1)}.
    - Encounter CR (sum of monsters) should match this rating for balance, or exceed it for high rewards.
    
    MANIFESTATION COMMANDS:
    - [ITEM: name] - Manifest gear.
    - [SPAWN: name] - Manifest horrors.
    - [SHORT_REST] / [LONG_REST] - Force party recovery.

    Focus on grim atmosphere.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: history.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        parts: [{ text: m.content }]
      })),
      config: { systemInstruction, temperature: 0.85 }
    });
    return response.text;
  } catch (error: any) {
    return "The aetheric winds fail... Try again later.";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string, avgPartyLevel: number): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Manifest a dark fantasy monster named "${monsterName}". Context: ${context}. Party Level: ${avgPartyLevel}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            hp: { type: Type.NUMBER },
            ac: { type: Type.NUMBER },
            cr: { type: Type.NUMBER },
            description: { type: Type.STRING },
            stats: { type: Type.OBJECT, properties: { str: { type: Type.NUMBER }, dex: { type: Type.NUMBER }, con: { type: Type.NUMBER }, int: { type: Type.NUMBER }, wis: { type: Type.NUMBER }, cha: { type: Type.NUMBER } } },
            abilities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING }, levelReq: { type: Type.NUMBER } } } },
            resistances: { type: Type.ARRAY, items: { type: Type.STRING } },
            vulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["type", "hp", "ac", "cr", "description", "abilities", "stats"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Monster manifestation failed:", error);
    return {};
  }
};

export const generateItemDetails = async (itemName: string, context: string, avgPartyLevel: number): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Manifest a dark fantasy item named "${itemName}". Context: ${context}. Party Level: ${avgPartyLevel}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            rarity: { type: Type.STRING },
            archetypes: { type: Type.ARRAY, items: { type: Type.STRING } },
            stats: { type: Type.OBJECT, properties: { str: { type: Type.NUMBER }, dex: { type: Type.NUMBER }, con: { type: Type.NUMBER }, int: { type: Type.NUMBER }, wis: { type: Type.NUMBER }, cha: { type: Type.NUMBER }, ac: { type: Type.NUMBER }, damage: { type: Type.STRING } } }
          },
          required: ["name", "description", "type", "rarity", "stats"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Item manifestation failed:", error);
    return {};
  }
};

export const parseDMCommand = (text: string) => {
  const commands = {
    exp: 0,
    currency: { aurels: 0, shards: 0, ichor: 0 },
    items: [] as { name: string, data?: any }[],
    monstersToAdd: [] as string[],
    shortRest: false,
    longRest: false,
    openShop: false,
    enterCombat: false,
    exitCombat: false,
    usedSlot: null as { level: number, characterName: string } | null,
    lootDrops: [] as { itemName: string, chance: number }[]
  };

  const expMatch = text.match(/\[EXP:\s*(\d+)\]/i);
  if (expMatch) commands.exp = parseInt(expMatch[1]);

  const goldMatch = text.match(/\[GOLD:\s*(\d+)\]/i);
  if (goldMatch) commands.currency.aurels = parseInt(goldMatch[1]);
  const shardsMatch = text.match(/\[SHARDS:\s*(\d+)\]/i);
  if ( shardsMatch) commands.currency.shards = parseInt(shardsMatch[1]);
  const ichorMatch = text.match(/\[ICHOR:\s*(\d+)\]/i);
  if (ichorMatch) commands.currency.ichor = parseInt(ichorMatch[1]);

  const itemMatches = [...text.matchAll(/\[ITEM:\s*([^\]]+)\]/gi)];
  itemMatches.forEach(m => commands.items.push({ name: m[1].trim() }));

  const monsterMatches = [...text.matchAll(/\[SPAWN:\s*([^\]]+)\]/gi)];
  monsterMatches.forEach(m => commands.monstersToAdd.push(m[1].trim()));

  if (/\[SHORT_REST\]/i.test(text)) commands.shortRest = true;
  if (/\[LONG_REST\]/i.test(text)) commands.longRest = true;
  if (/\[OPEN_SHOP\]/i.test(text)) commands.openShop = true;
  if (/\[ENTER_COMBAT\]/i.test(text)) commands.enterCombat = true;
  if (/\[EXIT_COMBAT\]/i.test(text)) commands.exitCombat = true;
  
  const slotMatch = text.match(/\[USE_SLOT:\s*(\d+),\s*([^\]]+)\]/i);
  if (slotMatch) {
    commands.usedSlot = { level: parseInt(slotMatch[1]), characterName: slotMatch[2].trim() };
  }

  const lootMatches = [...text.matchAll(/\[LOOT:\s*([^,\]]+),\s*(\d+)\]/gi)];
  lootMatches.forEach(m => commands.lootDrops.push({ itemName: m[1].trim(), chance: parseInt(m[2]) }));

  return commands;
};

export const generateInnkeeperResponse = async (history: Message[], party: Character[]): Promise<string> => {
  const ai = getAiClient();
  trackUsage();
  const partyComp = party.map(c => `${c.name} (${c.archetype})`).join(', ');
  const systemInstruction = `You are Barnaby, the Innkeeper of 'The Broken Cask'. The party is: ${partyComp}. Speak archaically. Keep under 3 paragraphs.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        parts: [{ text: m.content }]
      })),
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "Barnaby just nods and smiles.";
  } catch (error) {
    return "Barnaby seems distracted.";
  }
};
