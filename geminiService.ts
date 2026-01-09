import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor, StatusEffect } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, TUTORIAL_SCENARIO } from './constants';

const NARRATIVE_MODEL = 'gemini-3-pro-preview'; 
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
    Thou art the "Mechanical Scribe". 
    Read this segment and extract mechanical changes into JSON.
    
    PARTY: ${manifest}
    TEXT: "${narrative}"
    
    Rules:
    - If a character takes damage (e.g., "Miri takes 15 damage"), record type: "damage", target: "Miri", value: 15.
    - If a character heals (e.g., "Lina mends for 10"), record type: "heal", target: "Lina", value: 10.
    - If items are found, name them in "newEntities".
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
                  type: { type: Type.STRING, description: "damage | heal | exp" },
                  target: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                },
                required: ["type", "target", "value"]
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
          }
        }
      }
    });
    return JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
  } catch (e) {
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
  
  // 1. Filter out system logs
  let purifiedHistory = history.filter(m => m.role === 'user' || m.role === 'model');

  // 2. ENSURE ALTERNATION: Gemini requires User -> Model -> User.
  // If history starts with 'model', prepend a synthetic 'user' start.
  if (purifiedHistory.length > 0 && purifiedHistory[0].role === 'model') {
    purifiedHistory = [
      { role: 'user', content: "Begin the chronicle.", timestamp: Date.now() },
      ...purifiedHistory
    ];
  }

  const partyManifests = playerContext.party.map(c => `${c.name}: ${c.currentHp}/${c.maxHp} HP`).join(', ');

  const systemInstruction = `
    Thou art the Arbiter of Mythos.
    Focus on grim atmosphere and cinematic consequence.
    
    MECHANICAL LOGIC:
    State damage clearly: "[Name] takes [X] damage."
    State healing clearly: "[Name] heals [X] HP."
    
    Current Party: ${partyManifests}
  `;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: purifiedHistory.map(m => ({ 
        role: m.role, 
        parts: [{ text: m.content }] 
      })) as any,
      config: { systemInstruction, temperature: 0.8 }
    });
    return response.text || "The shadows lengthen...";
  } catch (error: any) {
    console.error("Arbiter API Error:", error);
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
            stats: { type: Type.OBJECT, properties: { str: { type: Type.NUMBER }, dex: { type: Type.NUMBER }, con: { type: Type.NUMBER }, int: { type: Type.NUMBER }, wis: { type: Type.NUMBER }, cha: { type: Type.NUMBER } } }
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
export const generateInnkeeperResponse = async (h: any, p: any) => "The fire crackles.";
