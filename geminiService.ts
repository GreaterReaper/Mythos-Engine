import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor, StatusEffect } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, TUTORIAL_SCENARIO } from './constants';

const NARRATIVE_MODEL = 'gemini-3-flash-preview'; 
const ARCHITECT_MODEL = 'gemini-3-pro-preview';   
const SCRIBE_MODEL = 'gemini-3-flash-preview';

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
 * Audits narrative text to extract mechanical changes.
 */
export const auditNarrativeEffect = async (narrative: string, party: Character[]): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP)`).join(', ');

  const prompt = `
    Thou art the "Mechanical Scribe" for the Mythos Engine. 
    Audit this narrative for mechanical consequences.
    
    PARTY MANIFEST: ${manifest}
    NARRATIVE SEGMENT: "${narrative}"
    
    CRITICAL INSTRUCTIONS:
    1. Damage detection: If the text says a character "takes 15 damage" or "is struck for 10", record it.
    2. Target matching: Match names exactly as they appear in the manifest (e.g., Miri, Lina).
    3. Item detection: If they "find", "obtain", or "gain" an item, list its name.
    4. New Entities: If a NEW monster or item name is introduced that doesn't exist in the party or common knowledge, flag it for the Architect.
  `;

  try {
    const response = await ai.models.generateContent({
      model: SCRIBE_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            changes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "damage | heal | item | exp | status" },
                  target: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  detail: { type: Type.STRING }
                }
              }
            },
            newEntities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING, description: "monster | item" }
                }
              }
            }
          },
          required: ["changes", "newEntities"]
        }
      }
    });
    return JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
  } catch (e) {
    console.error("Scribe audit failure:", e);
    return { changes: [], newEntities: [] };
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
    campaignTitle: string;
  }
) => {
  const ai = getAiClient();
  trackUsage();
  
  // PURIFY HISTORY: The Arbiter must not see the Scribe's system logs or internal ledger
  const purifiedHistory = history.filter(m => m.role === 'user' || m.role === 'model');

  const partyManifests = playerContext.party.map(c => {
    return `${c.name} (Lvl ${c.level} ${c.archetype}): HP ${c.currentHp}/${c.maxHp}`;
  }).join('\n');

  const systemInstruction = `
    Thou art the "Arbiter of Mythos", a dark fantasy DM.
    Focus on atmosphere, weight, and roleplay.
    The Mechanical Scribe automatically processes thy words for damage/items.
    Always describe mechanical impacts clearly (e.g., "The feedback scorches Miri for 15 damage").
    
    CURRENT PARTY:
    ${partyManifests}
  `;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: purifiedHistory.map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction, temperature: 0.8 }
    });
    return response.text || "The shadows remain silent.";
  } catch (error: any) {
    console.error("Arbiter Error:", error);
    return "The aetheric connection flickers; the Arbiter's voice is lost to the void.";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Design detailed RPG stats for "${monsterName}". Context: ${context}. JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hp: { type: Type.NUMBER },
            ac: { type: Type.NUMBER },
            cr: { type: Type.NUMBER },
            description: { type: Type.STRING },
            stats: { 
              type: Type.OBJECT, 
              properties: { str: { type: Type.NUMBER }, dex: { type: Type.NUMBER }, con: { type: Type.NUMBER }, int: { type: Type.NUMBER }, wis: { type: Type.NUMBER }, cha: { type: Type.NUMBER } } 
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { throw error; }
};

export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Design stats for fantasy item "${itemName}". Context: ${context}. JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            rarity: { type: Type.STRING },
            stats: { type: Type.OBJECT, properties: { damage: { type: Type.STRING }, ac: { type: Type.NUMBER } } }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { throw error; }
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });
export const generateSoulSignature = (state: GameState): string => "";
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => null;
export const generateShopInventory = async (c: string, l: number): Promise<Shop> => ({ id: '1', merchantName: 'Test', merchantAura: '', inventory: [] });
export const manifestSoulLore = async (c: any): Promise<any> => ({ biography: "", description: "" });
export const generateRumors = async (l: number): Promise<Rumor[]> => [];
export const generateCustomClass = async (p: string): Promise<any> => ({});
export const parseDMCommand = (t: string) => ({ setHp: [], takeDamage: [], heals: [], usedSlot: null, shortRest: false, longRest: false, currencyRewards: [], exp: 0, items: [] });
export const generateInnkeeperResponse = async (h: any, p: any) => "The fire crackles in silence.";
