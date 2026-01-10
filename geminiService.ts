
import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor, Ability } from './types';

/**
 * THE CORE ENGINE: Utilizing Gemini 3 Flash for low-latency, high-precision procedural generation.
 */
const FLASH_MODEL = 'gemini-3-flash-preview';

export const isOffline = () => (window as any).MYTHOS_OFFLINE_MODE === true;

export const safeId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const trackUsage = () => {
  if (!isOffline()) window.dispatchEvent(new CustomEvent('mythos_api_call'));
};

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * THE SCRIBE: Audits narrative text for mechanical changes.
 */
export const auditNarrativeEffect = async (narrative: string, party: Character[]): Promise<any> => {
  if (!narrative || isOffline()) return { changes: [], newEntities: [] };

  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Mechanical Scribe". Audit the Arbiter's narrative for mechanical shifts.
  DETECTION PROTOCOLS:
  1. COMMAND SCAN: Prioritize "SCRIBE_COMMAND:", "ARCHITECT_COMMAND:", and "LEGENDARY_MANIFEST:".
  2. PARTY UPDATE: Look for "SCRIBE_COMMAND: Summon [Name]". This adds a Mentor to the active party.
  3. STAT SHIFTS: Look for damage, healing, exp, or mana changes. Format: [Name] takes [X] damage.
  4. ENTITIES: Look for "Forge [Monster]" or "Manifest [Item]".
  5. LEVEL LOCK: Reject any "SCRIBE_COMMAND" that attempts to grant an ability for which the target's level is insufficient.
  
  Return valid JSON matching the provided schema.`;

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ role: 'user', parts: [{ text: `Audit narrative for changes: ${narrative}` }] }],
      config: { 
        systemInstruction, 
        responseMimeType: "application/json",
        temperature: 0.1,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            changes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["damage", "heal", "exp", "mana", "ability", "summon"] },
                  target: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  description: { type: Type.STRING } 
                },
                required: ["type", "target"]
              }
            },
            newEntities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, enum: ["monster", "item"] },
                  name: { type: Type.STRING },
                  cr: { type: Type.NUMBER }
                },
                required: ["category", "name"]
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
  } catch (e) { 
    console.error("Scribe failure:", e);
    return { changes: [], newEntities: [] }; 
  }
};

/**
 * THE ARBITER: The primary DM logic.
 */
export const generateDMResponse = async (history: Message[], playerContext: any) => {
  if (isOffline()) return "The void is silent.";

  const ai = getAiClient();
  trackUsage();
  
  const partyContext = (playerContext.party || []).map((p: Character) => 
    `${p.name} (Lvl ${p.level} ${p.archetype})`
  ).join(", ");

  const isGenesis = history.some(m => m.content.includes("[NARRATIVE_START]"));

  const systemInstruction = `Thou art the "Arbiter of Mythos", a world-class Dark Fantasy DM.
  - Context: Party is [${partyContext}].
  - Current Chronicle: ${playerContext.campaignTitle || "A New Path"}.
  - Style: Visceral, sensory, lethal.
  ${isGenesis ? "- TASK: This is the GENESIS of the campaign. Ignore technical tokens and weave a grand opening description of the surroundings, sensory details (smell of rot, chill of stone), and the immediate atmosphere. Set the tone for a dark, lethal journey." : ""}
  - Mechanics: Use "SCRIBE_COMMAND: [Name] takes [X] damage" for HP changes.
  - Archetypes: Respect core abilities.
  - Gating: Players cannot use spells above their current level.`;

  // Filter out system logs and ensure first message is User
  const validHistory = history.filter(m => m.role !== 'system');
  const contents = [];
  let foundUser = false;
  for (const m of validHistory) {
    if (m.role === 'user') foundUser = true;
    if (foundUser) {
      contents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      });
    }
  }

  if (contents.length === 0) return "The void consumes thy intent. (No user context)";

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents,
      config: { 
        systemInstruction, 
        temperature: isGenesis ? 0.9 : 0.8 // Higher temperature for the opening prose
      }
    });
    return response.text || "The engine hums in the dark.";
  } catch (error: any) { 
    console.error("Arbiter failure:", error);
    return "Aetheric connection severed. The void consumes thy words."; 
  }
};

/**
 * THE ARCHITECT: Item & Monster manifestation.
 */
export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  if (isOffline()) return { name: itemName, stats: {} };
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: [{ role: 'user', parts: [{ text: `Manifest Item: ${itemName}. Context: ${context}` }] }], 
      config: { 
        systemInstruction: "Manifest artifacts in the Mythos Engine. Return valid JSON.",
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["Weapon", "Armor", "Utility", "Quest"] },
            rarity: { type: Type.STRING, enum: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Relic"] },
            stats: { 
              type: Type.OBJECT, 
              properties: { 
                ac: { type: Type.NUMBER }, 
                damage: { type: Type.STRING }, 
                damageType: { type: Type.STRING } 
              } 
            }
          }
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { 
    return { name: itemName, stats: {} }; 
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  if (isOffline()) return { name: monsterName, hp: 30, ac: 13, cr: 1 };
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: [{ role: 'user', parts: [{ text: `Manifest Monster: ${monsterName}. Context: ${context}.` }] }], 
      config: { 
        systemInstruction: "Forge a horrific monster balanced for its Challenge Rating. Return valid JSON.",
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            hp: { type: Type.NUMBER },
            ac: { type: Type.NUMBER },
            cr: { type: Type.NUMBER },
            description: { type: Type.STRING }
          }
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { 
    return { name: monsterName, hp: 30, ac: 13, cr: 1 }; 
  }
};

export const manifestSoulLore = async (char: any): Promise<any> => {
  if (isOffline()) return { biography: "Soul forged in void.", description: "Standard." };
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: [{ role: 'user', parts: [{ text: `Manifest Lore for ${char.name}, a ${char.race} ${char.archetype}. Return JSON with 'biography' and 'description'.` }] }], 
      config: { systemInstruction: "Thou art the Lore-Weaver. Return valid JSON.", responseMimeType: "application/json" } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { biography: "A story lost to the obsidian mists.", description: "Standard vessel." };
  }
};

export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  if (isOffline()) return "Rest thy bones.";
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: history.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })), 
      config: { systemInstruction: "Thou art Barnaby, the innkeeper of The Broken Cask. Provide rumors, rest, and atmosphere. Gritty but welcoming." } 
    });
    return response.text;
  } catch (e) {
    return "Barnaby is busy cleaning the counter. He nods in silence.";
  }
};

export const hydrateState = (saved: any, fallback: GameState): GameState => {
  if (!saved) return fallback;
  return {
    ...fallback,
    ...saved,
    characters: (saved.characters || []).map((c: any) => ({
      ...c,
      inventory: c.inventory || [],
      abilities: c.abilities || [],
      spells: c.spells || [],
      activeStatuses: c.activeStatuses || []
    })),
    userAccount: {
      ...fallback.userAccount,
      ...(saved.userAccount || {}),
      friends: saved.userAccount?.friends || []
    },
    campaigns: (saved.campaigns || []).map((c: any) => ({
      ...c,
      history: (c.history || []).map((m: any) => ({ ...m })),
      participants: c.participants || []
    }))
  };
};

export const generateSoulSignature = (state: GameState): string => {
  try {
    const str = JSON.stringify(state);
    return btoa(encodeURIComponent(str));
  } catch (e) {
    console.error("Transmigration failed", e);
    return '';
  }
};

export const parseSoulSignature = (signature: string, fallback: GameState): GameState | null => {
  try {
    const str = decodeURIComponent(atob(signature));
    const parsed = JSON.parse(str);
    return hydrateState(parsed, fallback);
  } catch (e) {
    console.error("Signature corruption detected", e);
    return null;
  }
};
