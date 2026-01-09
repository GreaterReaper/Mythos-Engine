
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
      merchantAura: parsed.merchantAura || "An unsettling presence fills the air.",
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

export const manifestSoulLore = async (char: Partial<Character>, campaignContext: string = "A grim world of blood, obsidian, and unyielding steel."): Promise<{ biography: string, description: string }> => {
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
    return { biography: "A soul lost in the bleak wilderness.", description: "A figure covered in the dust of travel and the stains of battle." };
  }
};

export const generateRumors = async (partyLevel: number): Promise<Rumor[]> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are Barnaby, the Innkeeper of 'The Broken Cask'. Generate 3 distinct dark fantasy rumors or quest hooks for a party of level ${partyLevel}.
      Emphasis on grit: mention physical danger and ancient feuds.
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
    return [{ id: safeId(), hook: "The roads are dangerous tonight.", length: 'Short', danger: 'Trivial', rewardTier: 1 }];
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
  const activeCharInfo = activeChar 
    ? `The player is currently manifesting as ${activeChar.name}, a Level ${activeChar.level} ${activeChar.race} ${activeChar.archetype}.
       AETHERIC CONSTRAINTS (Strictly Enforced):
       - This character can ONLY manifest manifestations with [levelReq] <= ${activeChar.level}.
       - Current Level: ${activeChar.level}.
       - If the player attempts a spell of a higher level, describe a "Aetheric Rejection"—their soul is not yet dense enough to hold the power, and the manifestation fails with a brief psychic shock.`
    : "No soul is currently bound to the player. Guide them to inhabit a vessel.";

  const mentorInfo = playerContext.mentors.length > 0
    ? `Allies: ${playerContext.mentors.map(m => `${m.name} (${m.archetype})`).join(', ')}.`
    : "No Mentors are currently bound.";

  // Strictly alternate turns and condense consecutive roles to avoid API errors
  const sanitizedContents: any[] = [];
  let currentParts: any[] = [];
  let currentRole: 'user' | 'model' = 'user';

  history.forEach((m, idx) => {
    const msgRole: 'user' | 'model' = (m.role === 'model') ? 'model' : 'user';
    
    if (idx === 0) {
      currentRole = msgRole;
      currentParts = [{ text: m.content || "..." }];
    } else if (msgRole === currentRole) {
      currentParts[0].text += `\n\n${m.content}`;
    } else {
      sanitizedContents.push({ role: currentRole, parts: currentParts });
      currentRole = msgRole;
      currentParts = [{ text: m.content || "..." }];
    }
  });
  
  // Final push
  if (currentParts.length > 0) {
    sanitizedContents.push({ role: currentRole, parts: currentParts });
  }

  // Ensure history starts with user and ends with user for the prompt
  if (sanitizedContents.length > 0 && sanitizedContents[0].role !== 'user') {
    sanitizedContents.unshift({ role: 'user', parts: [{ text: "The chronicle begins..." }] });
  }
  if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role !== 'user') {
    sanitizedContents.push({ role: 'user', parts: [{ text: "Narrate our next trial." }] });
  }

  const systemInstruction = `
    You are the "Mythos Engine" Dungeon Master. You are an ancient, archaic narrator of a grounded dark fantasy world.
    
    AESTHETIC & VOICE:
    - Tone: Grim, physical, heavy, archaic.
    - Style: Focus on physical sensations—the chill of shadows, the weight of plate armor, the sound of heavy steel. 
    - Avoid: Graphic gore, explicit anatomical violence, or software metaphors. Focus on "Physical Realism" and "Grim Consequences."
    
    ENGINE PROTOCOLS:
    ${activeCharInfo}
    - Progress is measured by Soul Ascension (Level). 
    - Physical outcomes are final. Narrative should reflect the danger of the environment.
    
    CONTEXT:
    ${mentorInfo}
    Party: ${playerContext.party.map(c => `${c.name} (${c.archetype})`).join(', ')}.

    COMMANDS (Append to end of your narration if triggered):
    [EXP: amount], [GOLD: amount], [ITEM: name], [SPAWN: name], [STATUS: effect, target], [ENTER_COMBAT], [EXIT_COMBAT], [USE_SLOT: level, characterName].
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: sanitizedContents,
      config: { 
        systemInstruction, 
        temperature: 0.7, // Slightly lower temperature for more stable adherence to rules
        topP: 0.9,
        topK: 40
      }
    });
    
    if (!response.text) {
      return "The Engine's core shudders... The aether is too turbulent to record this turn. Try a different approach, soul.";
    }
    
    return response.text;
  } catch (error: any) {
    console.error("DM Resonance Failure:", error);
    return "The stars go dark... The path is lost in the mists. (Aetheric Disruption)";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string, avgPartyLevel: number): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Manifest a physical monster named "${monsterName}". Context: ${context}. Level: ${avgPartyLevel}. Output strictly JSON.`,
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
            abilities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING }, levelReq: { type: Type.NUMBER } } } }
          },
          required: ["type", "hp", "ac", "cr", "description", "abilities", "stats"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Monster manifestation failed:", error);
    return { activeStatuses: [] };
  }
};

export const generateItemDetails = async (itemName: string, context: string, avgPartyLevel: number): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Manifest a dark fantasy item named "${itemName}". Context: ${context}. Level: ${avgPartyLevel}. JSON only.`,
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

export const generateInnkeeperResponse = async (history: Message[], party: Character[]): Promise<string> => {
  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `You are Barnaby, the Innkeeper. Speak archaically and grounded. You offer safety from the dark world.`;
  const sanitizedContents = history.map(m => ({ 
    role: m.role === 'model' ? 'model' : 'user', 
    parts: [{ text: m.content || "..." }] 
  }));
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: sanitizedContents as any,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "Barnaby just nods.";
  } catch (error) {
    return "Barnaby is silent, his hand resting on the hilt of a rusted blade.";
  }
};
