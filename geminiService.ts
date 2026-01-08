
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor, StatusEffect } from './types';
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

  // SANITIZE HISTORY: Strict role alternation for Gemini API
  const sanitizedContents: any[] = [];
  let lastRole: 'user' | 'model' | null = null;

  // Ensure history is not empty and begins with a 'user' turn
  history.forEach((m, index) => {
    // Map 'system' and 'user' to API 'user', map 'model' to API 'model'
    const currentRole: 'user' | 'model' = (m.role === 'model') ? 'model' : 'user';
    const textContent = m.content || "...";

    if (sanitizedContents.length === 0) {
      // FORCE first message to be 'user'
      sanitizedContents.push({
        role: 'user',
        parts: [{ text: textContent }]
      });
      lastRole = 'user';
    } else if (currentRole === lastRole) {
      // Merge consecutive roles into one turn
      sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n\n${textContent}`;
    } else {
      // Standard alternation
      sanitizedContents.push({
        role: currentRole,
        parts: [{ text: textContent }]
      });
      lastRole = currentRole;
    }
  });

  // Ensure history ends with a user message to prompt response
  if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role !== 'user') {
    sanitizedContents.push({
      role: 'user',
      parts: [{ text: "The resonance continues. Narrate our fate." }]
    });
  }

  const systemInstruction = `
    You are the "Mythos Engine" Dungeon Master, an ancient architect of dark fantasy reality.

    IDENTITY & PERSONA:
    - Aesthetics: Obsidian, Blood-Red, Gold. Archaic, grim, evocative voice.
    - Narrative Core: Reality is fragile code manifested from the void.

    STATUS EFFECTS (CRITICAL):
    - Poisoned: Disadvantage on attacks/checks. [STATUS: Poisoned, targetName]
    - Blinded: Fail sight checks, disadvantage on attacks. [STATUS: Blinded, targetName]
    - Stunned: No actions, auto-fail DEX saves. [STATUS: Stunned, targetName]
    - Frightened: Disadvantage while source in view. [STATUS: Frightened, targetName]
    - Paralyzed: Incapacitated, no movement/speech. [STATUS: Paralyzed, targetName]
    - Charmed: Cannot attack the charmer. [STATUS: Charmed, targetName]

    THE NINE PATHS (CLASSES, FEATS, SPELLS):
    I. Sorcerer: Feat: Arcane Memory. Spells: Chaos Bolt, Fireball, Exequy (Ultimate).
    II. Mage: Feat: Harmonized Aether. Spells: Cure Wounds, Heal, Revivify.
    III. Dark Knight: Feat: Living Dead. Spells: Blood Rite, Vampiric Touch, Power Word Kill.
    IV. Blood Artist: Feat: Sanguine Link. Spells: Life Tap, Sanguine Puppet, Gore Cascade.
    V. Warrior: Feat: Charged Devastation. Plate, 2H Swords.
    VI. Fighter: Feat: Shield Bash. Plate, Shields.
    VII. Thief: Feat: Lethal Ambush. Leather, Daggers.
    VIII. Archer: Feat: Sky-Splitter. Leather, Bows.
    IX. Alchemist: Feat: Monster Part Harvester. Leather, Vials.

    LAWS OF REALITY:
    - Ascension: 1,000 EXP * Level.
    - Attributes: STR, DEX, CON, INT, WIS, CHA.
    - Tactical Grid: 20x20. 1 tile = 5ft.
    - Encounter CR Baseline: ${hiddenPartyCR.toFixed(1)}.

    MANIFESTATION COMMANDS (Inject into narration):
    - [EXP: amount]
    - [GOLD: amount], [SHARDS: amount], [ICHOR: amount]
    - [ITEM: name]
    - [SPAWN: name]
    - [STATUS: effectName, targetName]
    - [CURE: effectName, targetName]
    - [ENTER_COMBAT] / [EXIT_COMBAT]

    CELESTIAL AWARENESS:
    - The "Celestial Cycle" (Timer) and "Aetheric Reservoir" (Quota) govern reality's stability.

    Narrate with weight. Be the Architect.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: sanitizedContents,
      config: { systemInstruction, temperature: 0.85 }
    });
    
    if (!response.text) throw new Error("Empty resonance.");
    return response.text;
  } catch (error: any) {
    console.error("DM Resonance Failure:", error);
    return "The aetheric winds fail... Reality becomes thin. Seek the Great Refill or wait for the stars to align. (Resonance Error: API Connection Severed)";
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
  const partyComp = party.map(c => `${c.name} (${c.archetype})`).join(', ');
  const systemInstruction = `You are Barnaby, the Innkeeper of 'The Broken Cask'. The party is: ${partyComp}. Speak archaically. You are aware of the Celestial Cycle and the Turning of the Stars (Quota). If asked about the reservoir, you see it as a holy gauge of the world's stability.`;

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
    return response.text || "Barnaby just nods and smiles, glancing at the celestial clock above.";
  } catch (error) {
    return "Barnaby seems distracted by the fading resonance of the world.";
  }
};
