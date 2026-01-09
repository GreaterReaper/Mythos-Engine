
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor, StatusEffect } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, TUTORIAL_SCENARIO } from './constants';
import * as fflate from 'fflate';

const ENGINE_VERSION = "1.0.0";

// Model Constants for clear split
const NARRATIVE_MODEL = 'gemini-3-flash-preview'; // For Campaign Load & Storytelling
const ARCHITECT_MODEL = 'gemini-3-pro-preview';   // For Monsters, Rewards, & Classes

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

/**
 * WORLD ARCHITECT (PRO): Handles Shop Generation
 */
export const generateShopInventory = async (context: string, avgPartyLevel: number): Promise<Shop> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Generate a fantasy shop inventory. Context: ${context}. Level: ${avgPartyLevel}.
      Provide unique items with stats. JSON format.`,
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

/**
 * NARRATIVE CORE (FLASH): Handles Lore flavor
 */
export const manifestSoulLore = async (char: Partial<Character>, campaignContext: string = "A world of heavy steel and ancient stone."): Promise<{ biography: string, description: string }> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: `Narrate the origin and appearance of ${char.name}, a ${char.race} ${char.archetype}. JSON with biography and description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { biography: { type: Type.STRING }, description: { type: Type.STRING } }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { biography: "A soul forged in trial.", description: "A figure of quiet resolve." };
  }
};

/**
 * NARRATIVE CORE (FLASH): Handles Rumors
 */
export const generateRumors = async (partyLevel: number): Promise<Rumor[]> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
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

/**
 * WORLD ARCHITECT (PRO): Handles Custom Classes
 */
export const generateCustomClass = async (prompt: string): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
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

/**
 * NARRATIVE CORE (FLASH): Handles DMing / Campaign Load
 */
export const generateDMResponse = async (
  history: Message[],
  playerContext: { 
    activeCharacter: Character | null;
    party: Character[]; 
    mentors: Character[]; 
    activeRules: string;
    existingItems: Item[];
    existingMonsters: Monster[];
    campaignTitle: string;
  }
) => {
  const ai = getAiClient();
  trackUsage();
  
  const partyManifests = playerContext.party.map(c => {
    const isUsableAbilities = c.abilities.filter(a => a.levelReq <= c.level).map(a => a.name).join(', ');
    const isUsableSpells = c.spells.filter(s => s.levelReq <= c.level).map(s => s.name).join(', ');
    const ownerStatus = c.id.startsWith('mentor-') ? "MENTOR" : "PLAYER";
    return `${c.name} [${ownerStatus}] (Lvl ${c.level} ${c.archetype}) - Feats: [${isUsableAbilities || "None"}], Spells: [${isUsableSpells || "None"}].`;
  }).join('\n    ');

  const sanitizedContents = history.map(m => ({ 
    role: m.role === 'model' ? 'model' : 'user', 
    parts: [{ text: m.content || "..." }] 
  }));

  const isTutorial = playerContext.campaignTitle === "The Fellowship of Five";
  const tutorialInstruction = isTutorial 
    ? `TUTORIAL PROTOCOL ACTIVE:
    - Act 1 (Awakening): 3 Wolves, 2 Husks.
    - Act 2 (Ritual of Steel): Razor Bridge trap.
    - Act 3 (The Breach): Shattered Warden mini-boss.
    - Instruct the player clearly but immersion stays dark.`
    : "";

  const systemInstruction = `
    Thou art the "Narrative Core" of the Mythos Engine (Model: Flash).
    
    THY SCOPE:
    - High-speed atmospheric narration and character dialogue.
    - Tracking active character manifests and enforcing level requirements.
    - Managing combat flow and rest outcomes.
    
    WORLD ARCHITECT HANDOFF:
    - Thou shalt NOT generate stats for new items or monsters.
    - Instead, use these tags to invoke the Architecture Core:
    - [SPAWN: Name] - To manifest a threat.
    - [ITEM: Name] - To manifest a reward.
    
    ${tutorialInstruction}

    MECHANICS:
    - Perform all dice logic. Tone: Archaic, Heavy, Grounded. Use "Thou/Thy".
    
    PARTY MANIFESTS:
    ${partyManifests}

    COMMANDS: [EXP: amount], [GOLD: amount], [ITEM: name], [SPAWN: name], [ENTER_COMBAT], [EXIT_COMBAT], [USE_SLOT: level, name].
  `;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: sanitizedContents as any,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "The Engine hums...";
  } catch (error: any) {
    return "The stars are obscured... (Aetheric Turbulence)";
  }
};

/**
 * WORLD ARCHITECT (PRO): Handles Monster Stat Creation
 */
export const generateMonsterDetails = async (monsterName: string, context: string, avgPartyLevel: number): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Design detailed dark fantasy stats for "${monsterName}". Context: ${context}. Party Level: ${avgPartyLevel}.
      Provide JSON including type, hp, ac, cr, stats, and unique abilities.`,
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
            abilities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING } } } }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { throw error; }
};

/**
 * WORLD ARCHITECT (PRO): Handles Item Stat Creation
 */
export const generateItemDetails = async (itemName: string, context: string, avgPartyLevel: number): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Design detailed stats for item "${itemName}". Tier: ${avgPartyLevel}.
      Provide JSON including description, type, rarity, and stats (e.g., damage, ac, attribute bonuses).`,
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
  } catch (error) { throw error; }
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

/**
 * NARRATIVE CORE (FLASH): Tavern Response
 */
export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  const ai = getAiClient();
  trackUsage();
  const sanitizedContents = history.map(m => ({ 
    role: m.role === 'model' ? 'model' : 'user', 
    parts: [{ text: m.content || "..." }] 
  }));
  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: sanitizedContents as any,
      config: { systemInstruction: "Thou art Barnaby, the innkeeper. Speak with archaic warmth.", temperature: 0.7 }
    });
    return response.text || "Barnaby nods.";
  } catch (error) { return "Barnaby is silent."; }
};
