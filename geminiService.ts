import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor, StatusEffect } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, TUTORIAL_SCENARIO } from './constants';
import * as fflate from 'fflate';

const ENGINE_VERSION = "1.1.4";

const NARRATIVE_MODEL = 'gemini-3-flash-preview'; 
const ARCHITECT_MODEL = 'gemini-3-pro-preview';   

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

export const generateShopInventory = async (context: string, avgPartyLevel: number): Promise<Shop> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Generate a fantasy shop inventory. Context: ${context}. Level: ${avgPartyLevel}. Provide unique items with stats. JSON format.`,
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
                      aurels: { type: Type.NUMBER }
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
        cost: i.cost || { aurels: 0 },
        stats: i.stats || {}
      }))
    };
  } catch (error) { throw error; }
};

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
            themedItems: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING }, rarity: { type: Type.STRING }, stats: { type: Type.OBJECT, properties: { damage: { type: Type.STRING }, ac: { type: Type.NUMBER } } } } } }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { throw e; }
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
    campaignTitle: string;
  }
) => {
  const ai = getAiClient();
  trackUsage();
  
  const partyManifests = playerContext.party.map(c => {
    // CRITICAL: Only manifest abilities/spells the character has reached the level for
    const usableSpells = c.spells
        .filter(s => s.levelReq <= c.level)
        .map(s => `${s.name} [Lvl ${s.baseLevel || 1}]`)
        .join(', ');
    
    const unlockedAbilities = c.abilities
        .filter(a => a.levelReq <= c.level)
        .map(a => `${a.name} (${a.description})`)
        .join(', ');

    const currentSlotsStr = c.spellSlots 
        ? ` Slots: ${Object.entries(c.spellSlots).map(([l, v]) => `L${l}:${v}`).join(', ')}` 
        : "";
    
    const status = c.id.startsWith('mentor-') ? "VETERAN IMMORTAL MENTOR" : "FLEDGLING PLAYER VESSEL";
    const hpStatus = c.currentHp <= 0 ? "UNCONSCIOUS (0 HP)" : `${c.currentHp}/${c.maxHp} HP`;
    const deathSaveStatus = (c.deathSaves && (c.deathSaves.successes > 0 || c.deathSaves.failures > 0)) 
      ? ` Death Saves: ${c.deathSaves.successes}S/${c.deathSaves.failures}F` : "";

    return `${c.name} [${status}] (${c.race} ${c.archetype} Lvl ${c.level})
    - VITALITY: ${hpStatus}.${deathSaveStatus}
    - UNLOCKED PASSIVES: [${unlockedAbilities || "None"}]
    - RESOURCES: ${currentSlotsStr || "None"}
    - MANIFESTATIONS: [${usableSpells || "None"}]
    - AURELS: ${c.currency.aurels}`;
  }).join('\n\n    ');

  const systemInstruction = `
    Thou art the "Arbiter of Mythos" (Gemini Flash). 
    
    THE LAWS OF LEVELING:
    - Thou shalt NOT attribute powers to a vessel they have not earned. 
    - Check the UNLOCKED PASSIVES carefully. If a Level 1 character tries to use a Level 15 ability (like Reaper's Toll), narrate their failure and the void's rejection.
    
    THE LAWS OF MORTALITY:
    1. ARBITRATION LEDGER: For every combat action, thou MUST explicitly state thy mathematical logic using [DICE_ROLL: result, "Notation"]. 
       Example: "[DICE_ROLL: 14, '1d20+STR'] hits AC 12. [TAKE_DAMAGE: 8, 'Hollow Husk']"
    
    2. MATHEMATICAL HP TRACKING: 
       - Use [TAKE_DAMAGE: amount, "Target"] when a hit lands.
       - Use [HEAL: amount, "Target"] when mending occurs.
       - If thy ledger is out of sync with the manifest, use [SET_HP: value, "Target"].
    
    3. THE VOID'S GRASP (0 HP):
       - 0 HP TRIGGER: When a character hits 0 HP, immediately use [TAKE_DAMAGE] to bring them to 0 and narrate their collapse.
       - DEATH SAVES: Any character starting their turn at 0 HP MUST be called to perform the "Death Save Ritual". Use [ROLL_DEATH_SAVE: "Name"].
       - DARK KNIGHT EXCEPTION (Living Dead): If a Dark Knight has "Living Dead" and hits 0 HP, they act for ONE TURN at 0 HP. During this turn, they are "Defiant". If they are not HEALED above 0 before their NEXT turn begins, they immediately collapse and must ROLL DEATH SAVES.
    
    PARTY MANIFEST:
    ${partyManifests}
  `;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: history.filter(m => m.role === 'user' || m.role === 'model').map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "The Engine hums...";
  } catch (error: any) {
    return "Aetheric turbulence has obscured the path.";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string, avgPartyLevel: number): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Design detailed RPG stats for "${monsterName}". JSON format.`,
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
            stats: { 
              type: Type.OBJECT, 
              properties: { str: { type: Type.NUMBER }, dex: { type: Type.NUMBER }, con: { type: Type.NUMBER }, int: { type: Type.NUMBER }, wis: { type: Type.NUMBER }, cha: { type: Type.NUMBER } } 
            },
            abilities: { 
              type: Type.ARRAY, 
              items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING } } } 
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { throw error; }
};

export const generateItemDetails = async (itemName: string, context: string, avgPartyLevel: number): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Design stats for item "${itemName}". JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            rarity: { type: Type.STRING },
            stats: { 
              type: Type.OBJECT, 
              properties: { damage: { type: Type.STRING }, ac: { type: Type.NUMBER } }
            }
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
    currencyRewards: [] as { amount: number, target: string }[],
    currencyLosses: [] as { amount: number, target: string }[],
    items: [] as { name: string, item?: string, target?: string }[],
    consumedItems: [] as { name: string, target: string }[],
    monstersToAdd: [] as string[],
    shortRest: false,
    longRest: false,
    openShop: false,
    enterCombat: false,
    exitCombat: false,
    usedSlot: null as { level: number, characterName: string } | null,
    statusesToAdd: [] as { effect: StatusEffect, target: string }[],
    statusesToRemove: [] as { effect: StatusEffect, target: string }[],
    recalls: [] as string[],
    heals: [] as { amount: number, targetName: string }[],
    takeDamage: [] as { amount: number, targetName: string }[],
    setHp: [] as { amount: number, targetName: string }[],
    rollDeathSaveFor: null as string | null
  };

  const expMatch = text.match(/\[EXP:\s*(\d+)\]/i);
  if (expMatch) commands.exp = parseInt(expMatch[1]);

  const goldMatches = [...text.matchAll(/\[GOLD:\s*(\d+)(?:,\s*"?([^"\]]+)"?)?\]/gi)];
  goldMatches.forEach(m => commands.currencyRewards.push({ amount: parseInt(m[1]), target: m[2] || 'Party' }));

  const takeGoldMatches = [...text.matchAll(/\[TAKE_GOLD:\s*(\d+)(?:,\s*"?([^"\]]+)"?)?\]/gi)];
  takeGoldMatches.forEach(m => commands.currencyLosses.push({ amount: parseInt(m[1]), target: m[2] || 'Leader' }));

  const itemMatches = [...text.matchAll(/\[ITEM:\s*"?([^",\]]+)"?(?:,\s*"?([^"\]]+)"?)?\]/gi)];
  itemMatches.forEach(m => commands.items.push({ name: m[1].trim(), item: m[1].trim(), target: m[2]?.trim() }));

  const monsterMatches = [...text.matchAll(/\[SPAWN:\s*"?([^"\]]+)"?\]/gi)];
  monsterMatches.forEach(m => commands.monstersToAdd.push(m[1].trim()));
  
  if (/\[REST:\s*short\]/i.test(text)) commands.shortRest = true;
  if (/\[REST:\s*long\]/i.test(text)) commands.longRest = true;

  const usedSlotMatch = text.match(/\[USE_SLOT:\s*(\d+),\s*"?([^"\]]+)"?\]/i);
  if (usedSlotMatch) {
    commands.usedSlot = { 
      level: parseInt(usedSlotMatch[1]), 
      characterName: usedSlotMatch[2].trim() 
    };
  }

  const healMatches = [...text.matchAll(/\[HEAL:\s*(\d+),\s*([^\]]+)\]/gi)];
  healMatches.forEach(m => commands.heals.push({ amount: parseInt(m[1]), targetName: m[2].trim() }));

  const damageMatches = [...text.matchAll(/\[TAKE_DAMAGE:\s*(\d+),\s*([^\]]+)\]/gi)];
  damageMatches.forEach(m => commands.takeDamage.push({ amount: parseInt(m[1]), targetName: m[2].trim() }));

  const setHpMatches = [...text.matchAll(/\[SET_HP:\s*(\d+),\s*([^\]]+)\]/gi)];
  setHpMatches.forEach(m => commands.setHp.push({ amount: parseInt(m[1]), targetName: m[2].trim() }));

  const deathSaveMatch = text.match(/\[ROLL_DEATH_SAVE:\s*"?([^"\]]+)"?\]/i);
  if (deathSaveMatch) commands.rollDeathSaveFor = deathSaveMatch[1].trim();

  return commands;
};

export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: history.filter(m => m.role === 'user' || m.role === 'model').map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction: "Thou art Barnaby, the innkeeper. Speak with archaic warmth.", temperature: 0.7 }
    });
    return response.text || "Barnaby nods.";
  } catch (error) { return "Barnaby is silent."; }
};