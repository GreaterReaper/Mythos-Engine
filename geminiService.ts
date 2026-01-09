
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
      Emphasis on grit: mention blood, iron, ancient feuds, and physical danger.
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
    return [{ id: safeId(), hook: "The roads are blood-soaked tonight.", length: 'Short', danger: 'Trivial', rewardTier: 1 }];
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
  
  const partySize = playerContext.party.length;
  const totalLevels = playerContext.party.reduce((acc, c) => acc + c.level, 0);
  const avgLevel = partySize > 0 ? totalLevels / partySize : 1;

  const activeCharInfo = playerContext.activeCharacter 
    ? `The user is inhabiting the soul of ${playerContext.activeCharacter.name}, a Level ${playerContext.activeCharacter.level} ${playerContext.activeCharacter.race} ${playerContext.activeCharacter.archetype}. 
       CRITICAL: Strictly enforce spellcasting requirements. This character can ONLY manifest spells where their Level (${playerContext.activeCharacter.level}) is >= the spell's [levelReq]. 
       Addresses them directly by name or persona.`
    : "The user has not yet possessed a soul. Encourage them to inhabit one of their roster.";

  const mentorInfo = playerContext.mentors.length > 0
    ? `The following Mentors are in the party: ${playerContext.mentors.map(m => `${m.name} (${m.archetype})`).join(', ')}. Mentors are FIXED ENTITIES controlled by YOU. 
    Lina: Mage (Staff, Robes). Miri: Fighter (1H Sword, Shield, Plate). Seris: Archer (Bow, Leather). Kaelen: Dark Knight (2H Blade, Plate). Valerius: Blood Artist (Sickle/Scythe, Robes). Jax: Thief (Daggers, Leather). Xylar: Sorcerer (Staff, Robes). Brunnhilde: Warrior (Maul, Plate). Alaric: Alchemist (Shortsword/Vial, Leather).`
    : "No Mentors are currently bound to the party.";

  const sanitizedContents: any[] = [];
  let lastRole: 'user' | 'model' | null = null;

  history.forEach((m) => {
    const currentRole: 'user' | 'model' = (m.role === 'model') ? 'model' : 'user';
    const textContent = m.content || "...";
    if (sanitizedContents.length === 0) {
      sanitizedContents.push({ role: 'user', parts: [{ text: textContent }] });
      lastRole = 'user';
    } else if (currentRole === lastRole) {
      sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n\n${textContent}`;
    } else {
      sanitizedContents.push({ role: currentRole, parts: [{ text: textContent }] });
      lastRole = currentRole;
    }
  });

  if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role !== 'user') {
    sanitizedContents.push({ role: 'user', parts: [{ text: "The journey continues. Narrate our fate." }] });
  }

  const systemInstruction = `
    You are the "Mythos Engine" Dungeon Master. You are an ancient, grim narrator of a visceral, physical world.

    AESTHETICS:
    - Obsidian, Necrotic Emerald (#065f46), Gold.
    - Archaic, grim voice. Focus on physical sensation: snap of bone, weight of plate, smell of rot.

    NARRATIVE CORE:
    - Blood is warm and lethal. Steel is heavy. Desribe wounds vividly. 
    - Avoid metaphors involving software or code.

    SPELLCASTING VALIDATION:
    ${activeCharInfo}
    - Validate character archetypes. A Warrior cannot cast "Fireball". 
    - Validate Level Requirements (levelReq). A Level 1 character cannot manifest Level 5 requirements. 
    - If a user attempts an invalid spell, narrate the failure as a mental strain or the aether rejecting their insufficient soul.

    PLAYER AND PARTY CONTEXT:
    ${mentorInfo}

    COMMANDS: [EXP: amount], [GOLD: amount], [SHARDS: amount], [ICHOR: amount], [ITEM: name], [SPAWN: name], [STATUS: effect, target], [CURE: effect, target], [ENTER_COMBAT], [EXIT_COMBAT], [USE_SLOT: level, characterName].
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: sanitizedContents,
      config: { systemInstruction, temperature: 0.85 }
    });
    if (!response.text) throw new Error("Empty resonance.");
    return response.text;
  } catch (error: any) {
    console.error("DM Resonance Failure:", error);
    return "The stars go dark... The path is lost in the mists of blood. (Connection Severed)";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string, avgPartyLevel: number): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Manifest a physical, visceral dark fantasy monster named "${monsterName}". Context: ${context}. Party Level: ${avgPartyLevel}. Focus on biological horror and physical threat.`,
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
    const monster = JSON.parse(response.text || '{}');
    return { ...monster, activeStatuses: [] };
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
      contents: `Manifest a dark fantasy item named "${itemName}". Context: ${context}. Party Level: ${avgPartyLevel}. Ensure rarity and stats match the physical nature of the object.`,
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
    lootDrops: [] as { itemName: string, chance: number }[],
    statusesToAdd: [] as { effect: StatusEffect, target: string }[],
    statusesToRemove: [] as { effect: StatusEffect, target: string }[]
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
  const statusMatches = [...text.matchAll(/\[STATUS:\s*([^,\]]+),\s*([^\]]+)\]/gi)];
  statusMatches.forEach(m => commands.statusesToAdd.push({ effect: m[1].trim() as StatusEffect, target: m[2].trim() }));
  const cureMatches = [...text.matchAll(/\[CURE:\s*([^,\]]+),\s*([^\]]+)\]/gi)];
  cureMatches.forEach(m => commands.statusesToRemove.push({ effect: m[1].trim() as StatusEffect, target: m[2].trim() }));

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
  const systemInstruction = `You are Barnaby, the Innkeeper of 'The Broken Cask'. Speak archaically. You offer safety from the brutal world outside.`;
  const sanitizedContents: any[] = [];
  let lastRole: 'user' | 'model' | null = null;
  history.forEach(m => {
    const currentRole: 'user' | 'model' = (m.role === 'model') ? 'model' : 'user';
    const textContent = m.content || "...";
    if (sanitizedContents.length === 0) {
      sanitizedContents.push({ role: 'user', parts: [{ text: textContent }] });
      lastRole = 'user';
    } else if (currentRole === lastRole) {
      sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n\n${textContent}`;
    } else {
      sanitizedContents.push({ role: currentRole, parts: [{ text: textContent }] });
      lastRole = currentRole;
    }
  });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: sanitizedContents,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "Barnaby just nods, his eyes heavy with the sights of a hard world.";
  } catch (error) {
    return "Barnaby is silent, his hand resting on the hilt of a rusted blade.";
  }
};
