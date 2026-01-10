import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor } from './types';

// THE CLOCKWORK ENGINE: Unified on Gemini 3 Flash
const FLASH_MODEL = 'gemini-3-flash-preview';

const NARRATIVE_MODEL = FLASH_MODEL; 
const ARCHITECT_MODEL = FLASH_MODEL;
const SCRIBE_MODEL = FLASH_MODEL;

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

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * THE MECHANICAL SCRIBE
 * Audits narrative to extract state changes with high precision.
 */
export const auditNarrativeEffect = async (narrative: string, party: Character[]): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP, Lvl ${c.level})`).join(', ');
  
  const systemInstruction = `Thou art the "Mechanical Scribe". Thy duty is to audit the narrative for statistical changes.
  Current Party: ${manifest}.

  STRICT EXTRACTION RULES:
  1. DAMAGE/HEAL: Look for "takes X damage", "loses X HP", "heals X HP", or "restores X HP".
  2. EXPERIENCE: Look for "gains X EXP" or "receives X experience".
  3. SPELL SLOTS: Look for "expends level X spell slot" or "uses level X slot".
  4. NEW ENTITIES: Look for mentions of NEW monsters or items found.
  
  IGNORE all dice math like [🎲 d20(10)+5=15]. Only extract the FINAL narrated results.`;

  try {
    const response = await ai.models.generateContent({
      model: SCRIBE_MODEL,
      contents: narrative,
      config: { 
        systemInstruction, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            changes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "damage, heal, exp, or spellSlot" },
                  target: { type: Type.STRING, description: "Full or partial name of the character" },
                  value: { type: Type.NUMBER },
                  level: { type: Type.NUMBER, description: "For spellSlot type" }
                },
                required: ["type", "target"]
              }
            },
            newEntities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "monster or item" },
                  name: { type: Type.STRING }
                },
                required: ["category", "name"]
              }
            }
          },
          required: ["changes", "newEntities"]
        }
      }
    });
    const parsed = JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
    return parsed;
  } catch (e) {
    console.error("Scribe Failure:", e);
    return { changes: [], newEntities: [] };
  }
};

/**
 * THE ARBITER OF MYTHOS
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
    usageCount?: number;
  }
) => {
  const ai = getAiClient();
  trackUsage();

  const partyManifest = playerContext.party.map(c => `${c.name} (${c.archetype}, HP: ${c.currentHp}/${c.maxHp})`).join(', ');
  
  // Strict role mapping for Gemini API (must alternate user/model)
  const filteredHistory = history.filter(m => m.role === 'user' || m.role === 'model');
  
  const systemInstruction = `Thou art the "Arbiter of Mythos", a Dark Fantasy DM.
  Party: ${partyManifest}
  
  PROTOCOLS:
  1. DICE: Use [🎲 d20(roll)+mod=result] for all checks.
  2. STATS: Explicitly state results: "Name takes X damage", "Name expends level Y spell slot".
  3. LORE: Grim, cinematic, and deterministic. Avoid fluff without mechanical weight.`;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: filteredHistory.map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction, temperature: 0.75 }
    });
    return response.text || "The resonance is lost to the void.";
  } catch (error: any) {
    console.error("DM Error:", error);
    return "Aetheric disturbance detected. [System: API Error]";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: ARCHITECT_MODEL, 
      contents: `Manifest Monster: ${monsterName}. Found in context: ${context}. Return full statblock.`, 
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            hp: { type: Type.NUMBER },
            ac: { type: Type.NUMBER },
            cr: { type: Type.NUMBER },
            type: { type: Type.STRING },
            stats: {
              type: Type.OBJECT,
              properties: {
                str: { type: Type.NUMBER }, dex: { type: Type.NUMBER }, con: { type: Type.NUMBER },
                int: { type: Type.NUMBER }, wis: { type: Type.NUMBER }, cha: { type: Type.NUMBER }
              }
            }
          }
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return { name: monsterName }; }
};

export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: ARCHITECT_MODEL, 
      contents: `Manifest Relic: ${itemName}. Context: ${context}. Return properties.`, 
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, description: "Weapon, Armor, or Utility" },
            rarity: { type: Type.STRING },
            stats: {
              type: Type.OBJECT,
              properties: {
                ac: { type: Type.NUMBER },
                damage: { type: Type.STRING }
              }
            }
          }
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return { name: itemName }; }
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });
export const generateSoulSignature = (state: GameState): string => btoa(JSON.stringify(state));
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => {
  try { return JSON.parse(atob(sig)); } catch { return null; }
};
export const generateShopInventory = async (c: string, l: number): Promise<Shop> => ({ id: safeId(), merchantName: 'Barnaby', merchantAura: '', inventory: [] });
export const manifestSoulLore = async (char: any): Promise<any> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({ 
    model: ARCHITECT_MODEL, 
    contents: `Lore for ${char.name}. JSON.`, 
    config: { responseMimeType: "application/json" } 
  });
  return JSON.parse(response.text || '{}');
};
export const generateRumors = async (l: number): Promise<Rumor[]> => [];
export const generateCustomClass = async (p: string): Promise<any> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({ 
    model: ARCHITECT_MODEL, 
    contents: `Class: ${p}. JSON.`, 
    config: { responseMimeType: "application/json" } 
  });
  return JSON.parse(response.text || '{}');
};
export const parseDMCommand = (t: string) => ({ setHp: [], takeDamage: [], heals: [], usedSlot: null, shortRest: false, longRest: false, currencyRewards: [], exp: 0, items: [] });
export const generateInnkeeperResponse = async (h: any, p: any) => "Rest well, traveler.";
