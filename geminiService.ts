import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, Character, Monster, Item, Archetype, Ability, GameState, Shop, ShopItem, Role, Rumor, StatusEffect } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS, TUTORIAL_SCENARIO } from './constants';

// Models optimized for task type
const NARRATIVE_MODEL = 'gemini-3-flash-preview'; // Flash for dialogue (faster, higher availability)
const ARCHITECT_MODEL = 'gemini-3-pro-preview';  // Pro for procedural generation
const SCRIBE_MODEL = 'gemini-3-flash-preview';    // Flash for mechanical extraction

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
    Read this narrative segment and extract state changes into JSON.
    
    PARTY MANIFEST: ${manifest}
    NARRATIVE: "${narrative}"
    
    INSTRUCTIONS:
    1. If a character takes damage (e.g., "Miri is struck for 10"), record type: "damage", target: "[Name]", value: [Number].
    2. If a character heals (e.g., "Lina mends for 5"), record type: "heal", target: "[Name]", value: [Number].
    3. If new items or monsters are introduced, list them in "newEntities".
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
    console.error("Scribe failure:", e);
    return { changes: [], newEntities: [] };
  }
};

/**
 * THE ARBITER OF MYTHOS
 * Core narrative generation.
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
  
  // 1. FILTER HISTORY: Remove technical logs and system messages
  let purifiedHistory = history.filter(m => m.role === 'user' || m.role === 'model');

  // 2. ENFORCE STARTING TURN: Must begin with 'user'
  if (purifiedHistory.length === 0 || purifiedHistory[0].role === 'model') {
    purifiedHistory = [
      { role: 'user', content: "A soul awakens in the dark. Chronicle their journey.", timestamp: Date.now() },
      ...purifiedHistory
    ];
  }

  // 3. ENFORCE TRAILING TURN: Must end with 'user' for the model to respond to.
  // If the last message was the DM (model), the DM has no prompt to answer.
  if (purifiedHistory[purifiedHistory.length - 1].role === 'model') {
    purifiedHistory.push({
      role: 'user',
      content: "The mists swirl. What happens next?",
      timestamp: Date.now()
    });
  }

  const partyManifests = playerContext.party.map(c => `${c.name}: ${c.currentHp}/${c.maxHp} HP`).join(', ');

  const systemInstruction = `
    Thou art the "Arbiter of Mythos", a senior DM for a dark fantasy TTRPG.
    Atmosphere: Grim, visceral, cinematic. Use archaic but readable prose.
    
    MECHANICAL RULE:
    When damage occurs, state it clearly in the narrative (e.g., "Miri takes 12 damage").
    When items are found, name them clearly.
    
    CURRENT PARTY: ${partyManifests}
    ACTIVE RULES: ${playerContext.activeRules}
  `;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: purifiedHistory.map(m => ({ 
        role: m.role, 
        parts: [{ text: m.content }] 
      })) as any,
      config: { 
        systemInstruction, 
        temperature: 0.85,
        topP: 0.95
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty resonance from the Void.");
    return text;
  } catch (error: any) {
    console.error("Arbiter Resonance Error:", error);
    // Return a descriptive error to help debugging
    if (error.message?.includes("User and Model turns must alternate")) {
      return "The chronicle is out of sync; the roles have merged in the void. (Role Alternation Error)";
    }
    return "The aetheric connection flickers; the Arbiter's voice is lost to the void. (Check Console or API Key)";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: `Design detailed stats for "${monsterName}" in a dark TTRPG. Context: ${context}. Return JSON.`,
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
      contents: `Design fantasy item stats for "${itemName}". Context: ${context}. Return JSON.`,
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
export const generateSoulSignature = (state: GameState): string => btoa(JSON.stringify(state));
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => {
  try { return JSON.parse(atob(sig)); } catch { return null; }
};
export const generateShopInventory = async (c: string, l: number): Promise<Shop> => ({ id: safeId(), merchantName: 'Barnaby', merchantAura: 'Smells of old dust.', inventory: [] });
export const manifestSoulLore = async (char: any): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  const response = await ai.models.generateContent({
    model: ARCHITECT_MODEL,
    contents: `Write a dark biography and physical description for a ${char.race} ${char.archetype} named ${char.name}. JSON: {biography, description}`
  });
  return JSON.parse(response.text || '{"biography":"", "description":""}');
};
export const generateRumors = async (l: number): Promise<Rumor[]> => [];
export const generateCustomClass = async (p: string): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  const response = await ai.models.generateContent({
    model: ARCHITECT_MODEL,
    contents: `Forge a TTRPG class from this prompt: "${p}". Return JSON with name, description, role, hpDie, abilities (array of {name, description, type, levelReq}), spells (array).`
  });
  return JSON.parse(response.text || '{}');
};
export const parseDMCommand = (t: string) => ({ setHp: [], takeDamage: [], heals: [], usedSlot: null, shortRest: false, longRest: false, currencyRewards: [], exp: 0, items: [] });
export const generateInnkeeperResponse = async (h: any, p: any) => "The ale is bitter today, traveler.";
