import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor, StatusEffect } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, TUTORIAL_SCENARIO } from './constants';
import * as fflate from 'fflate';

const ENGINE_VERSION = "1.2.1";

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
  
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP, Lvl ${c.level})`).join(', ');

  const prompt = `
    Thou art the "Mechanical Scribe". Read this narrative segment and the current party manifest.
    Extract all mechanical changes into JSON.
    
    PARTY MANIFEST: ${manifest}
    NARRATIVE: "${narrative}"
    
    Rules:
    - Identify damage taken or healing received by name.
    - Identify if items were gained (provide names).
    - Identify if EXP was granted.
    - Identify status effects applied.
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
          }
        }
      }
    });
    return JSON.parse(response.text || '{"changes":[]}');
  } catch (e) {
    console.error("Scribe audit failure:", e);
    return { changes: [] };
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
  
  // PURIFY HISTORY: The Arbiter must not see the Scribe's system logs
  const purifiedHistory = history.filter(m => m.role === 'user' || m.role === 'model');

  const partyManifests = playerContext.party.map(c => {
    const usableSpells = c.spells.filter(s => s.levelReq <= c.level).map(s => s.name).join(', ');
    const unlockedAbilities = c.abilities.filter(a => a.levelReq <= c.level).map(a => a.name).join(', ');
    return `${c.name} (Lvl ${c.level} ${c.race} ${c.archetype}): HP ${c.currentHp}/${c.maxHp}, Spells: [${usableSpells}], Abilities: [${unlockedAbilities}]`;
  }).join('\n');

  const systemInstruction = `
    Thou art the "Arbiter of Mythos". 
    Focus on dark fantasy narrative, atmosphere, and cinematic arbitration.
    The Mechanical Scribe follows thy words to update stats. 
    State actions clearly so the Scribe can audit them (e.g., "The beast strikes Lina for 12 damage").
    
    PARTY STATE:
    ${partyManifests}
  `;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: purifiedHistory.map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction, temperature: 0.8 }
    });
    return response.text || "The Engine hums...";
  } catch (error: any) {
    return "Aetheric turbulence has obscured the path.";
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

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => {
  return { ...defaultState, ...data };
};
export const generateSoulSignature = (state: GameState): string => { return ""; };
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => { return null; };
export const generateShopInventory = async (c: string, l: number): Promise<Shop> => { return { id: '1', merchantName: 'Test', merchantAura: '', inventory: [] }; };
export const manifestSoulLore = async (c: any): Promise<any> => { return { biography: "", description: "" }; };
export const generateRumors = async (l: number): Promise<Rumor[]> => { return []; };
export const generateCustomClass = async (p: string): Promise<any> => { return {}; };
export const parseDMCommand = (t: string) => { return { setHp: [], takeDamage: [], heals: [], usedSlot: null, shortRest: false, longRest: false, currencyRewards: [], exp: 0, items: [] }; };
export const generateInnkeeperResponse = async (h: any, p: any) => { return ""; };
