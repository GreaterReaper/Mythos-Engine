
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor, StatusEffect } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS } from './constants';
import * as fflate from 'fflate';

const ENGINE_VERSION = "1.0.0";

export const safeId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

export const generateSoulSignature = (state: GameState): string => {
  try {
    const stripped = stripState(state);
    const json = JSON.stringify({ ...stripped, engine_ver: ENGINE_VERSION, timestamp: Date.now() });
    const buf = new TextEncoder().encode(json);
    const compressed = fflate.zlibSync(buf, { level: 9 });
    let binary = '';
    const bytes = new Uint8Array(compressed);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error("Transmigration Ritual Failed:", e);
    return "";
  }
};

export const parseSoulSignature = (signature: string, defaultState: GameState): GameState | null => {
  try {
    const binary = atob(signature);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decompressed = fflate.unzlibSync(bytes);
    const json = new TextDecoder().decode(decompressed);
    const data = JSON.parse(json);
    return hydrateState(data, defaultState);
  } catch (e) {
    console.error("Soul Rebinding Failed:", e);
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
      contents: `Generate a fantasy shop. Context: ${context}. Level: ${avgPartyLevel}.
      Items (Limit 5): JSON format.`,
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
                  cost: {
                    type: Type.OBJECT,
                    properties: {
                      aurels: { type: Type.NUMBER },
                      shards: { type: Type.NUMBER },
                      ichor: { type: Type.NUMBER }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      id: safeId(),
      merchantName: parsed.merchantName || "Unseen Merchant",
      merchantAura: parsed.merchantAura || "A quiet figure.",
      inventory: (parsed.inventory || []).map((i: any) => ({ 
        ...i, 
        id: safeId(),
        cost: i.cost || { aurels: 0, shards: 0, ichor: 0 },
        stats: i.stats || {}
      }))
    };
  } catch (error) {
    console.error("Shop manifest failed:", error);
    throw error;
  }
};

export const manifestSoulLore = async (char: Partial<Character>, campaignContext: string = "A world of heavy steel and ancient stone."): Promise<{ biography: string, description: string }> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Narrate the origin and appearance of ${char.name}, a ${char.race} ${char.archetype}. JSON with biography and description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            biography: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { biography: "A soul forged in trial.", description: "A figure of quiet resolve." };
  }
};

export const generateRumors = async (partyLevel: number): Promise<Rumor[]> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 fantasy rumors for level ${partyLevel}. JSON array.`,
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
            }
          }
        }
      }
    });
    const parsed = JSON.parse(response.text || '[]');
    return parsed.map((r: any) => ({ ...r, id: safeId() }));
  } catch (e) {
    return [{ id: safeId(), hook: "Shadows lengthen in the valley.", length: 'Short', danger: 'Trivial', rewardTier: 1 }];
  }
};

export const generateCustomClass = async (prompt: string): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a fantasy class: "${prompt}". JSON.`,
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
    throw e;
  }
};

export const generateDMResponse = async (
  history: Message[],
  playerContext: { 
    activeCharacter: Character | null;
    party: Character[]; 
    mentors: Character[]; 
    activeRules: string;
    existingItems: Item[];
    existingMonsters: Monster[];
  }
) => {
  const ai = getAiClient();
  trackUsage();
  
  const activeChar = playerContext.activeCharacter;
  const partySize = playerContext.party.length;
  const activeCharInfo = activeChar 
    ? `Player: ${activeChar.name}, Level ${activeChar.level} ${activeChar.race} ${activeChar.archetype}.`
    : "No soul bound.";

  const sanitizedContents: any[] = [];
  let currentRole: 'user' | 'model' = 'user';
  let roleText = "";

  history.forEach((m) => {
    const msgRole: 'user' | 'model' = (m.role === 'model') ? 'model' : 'user';
    if (msgRole === currentRole) {
      roleText += (roleText ? "\n\n" : "") + (m.content || "...");
    } else {
      sanitizedContents.push({ role: currentRole, parts: [{ text: roleText || "..." }] });
      currentRole = msgRole;
      roleText = m.content || "...";
    }
  });
  
  if (roleText) {
    sanitizedContents.push({ role: currentRole, parts: [{ text: roleText }] });
  }

  if (sanitizedContents.length > 0 && sanitizedContents[0].role !== 'user') {
    sanitizedContents.unshift({ role: 'user', parts: [{ text: "Proceed with the chronicle." }] });
  }
  if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role !== 'user') {
    sanitizedContents.push({ role: 'user', parts: [{ text: "Narrate the next event." }] });
  }

  const systemInstruction = `
    You are the "Mythos Engine," the archaic Dungeon Master of a grounded, dark fantasy epic.
    
    EQUILIBRIUM & HEROIC MODE (STRICT PROTOCOL):
    - Baseline Balance: The world and its threats are designed for a Fellowship of 3 to 5 souls.
    - Current Party Size: ${partySize}.
    - HEROIC MODE (Solo/Duo): If Party Size < 3, you are in "Heroic Mode." 
      - The lone player is narratively empowered. Describe their actions with cinematic flair.
      - Scale down enemy HP and Action Economy (fewer attacks per turn).
      - Grant "Fate Points" in narration: describe narrow misses or unexpected environmental help that allows the lone vessel to survive.
    - Standard Mode (3-5 Players): Use full tactical depth. Enemies cooperate to flank and overwhelm.
    
    MECHANICS:
    - Perform all dice calculations (D20, damage, saves).
    - Announce results: "Thou strikest true [Roll: 18], dealing 9 damage".
    
    TONE: Archaic, heavy, grounded. Use "Thou," "Thy," "Vessel."
    
    RULES:
    ${activeCharInfo}
    Party: ${playerContext.party.map(c => `${c.name} (${c.archetype})`).join(', ')}.

    COMMANDS: [EXP: amount], [GOLD: amount], [ITEM: name], [SPAWN: name], [ENTER_COMBAT], [EXIT_COMBAT].
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: sanitizedContents,
      config: { 
        systemInstruction, 
        temperature: 0.6, 
        topP: 0.8,
        topK: 30
      }
    });
    
    if (!response.text) {
      return "The Engine's mists grow thick... (Connection Reset)";
    }
    
    return response.text;
  } catch (error: any) {
    console.error("DM Failure:", error);
    return "The stars are obscured... (Aetheric Turbulence)";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string, avgPartyLevel: number): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create monster stats for "${monsterName}". Context: ${context}. JSON format.`,
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
            stats: { type: Type.OBJECT, properties: { str: { type: Type.NUMBER }, dex: { type: Type.NUMBER }, con: { type: Type.NUMBER }, int: { type: Type.NUMBER }, wis: { type: Type.NUMBER }, cha: { type: Type.NUMBER } } }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { activeStatuses: [] };
  }
};

export const generateItemDetails = async (itemName: string, context: string, avgPartyLevel: number): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create fantasy item "${itemName}". JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            rarity: { type: Type.STRING },
            stats: { type: Type.OBJECT }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
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
    statusesToAdd: [] as { effect: StatusEffect, target: string }[],
    statusesToRemove: [] as { effect: StatusEffect, target: string }[]
  };

  const expMatch = text.match(/\[EXP:\s*(\d+)\]/i);
  if (expMatch) commands.exp = parseInt(expMatch[1]);
  const goldMatch = text.match(/\[GOLD:\s*(\d+)\]/i);
  if (goldMatch) commands.currency.aurels = parseInt(goldMatch[1]);

  const itemMatches = [...text.matchAll(/\[ITEM:\s*([^\]]+)\]/gi)];
  itemMatches.forEach(m => commands.items.push({ name: m[1].trim() }));
  const monsterMatches = [...text.matchAll(/\[SPAWN:\s*([^\]]+)\]/gi)];
  monsterMatches.forEach(m => commands.monstersToAdd.push(m[1].trim()));
  
  if (/\[ENTER_COMBAT\]/i.test(text)) commands.enterCombat = true;
  if (/\[EXIT_COMBAT\]/i.test(text)) commands.exitCombat = true;
  if (/\[OPEN_SHOP\]/i.test(text)) commands.openShop = true;

  const slotMatch = text.match(/\[USE_SLOT:\s*(\d+),\s*([^\]]+)\]/i);
  if (slotMatch) {
    commands.usedSlot = { level: parseInt(slotMatch[1]), characterName: slotMatch[2].trim() };
  }

  return commands;
};

export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  const ai = getAiClient();
  trackUsage();
  const sanitizedContents = history.map(m => ({ 
    role: m.role === 'model' ? 'model' : 'user', 
    parts: [{ text: m.content || "..." }] 
  }));
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: sanitizedContents as any,
      config: { systemInstruction: "Thou art Barnaby, the innkeeper. Speak with archaic warmth.", temperature: 0.7 }
    });
    return response.text || "Barnaby nods.";
  } catch (error) {
    return "Barnaby is silent.";
  }
};
