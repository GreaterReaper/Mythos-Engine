import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor } from './types';

// THE CLOCKWORK ENGINE: All components unified on Gemini 3 Flash for maximum speed and efficiency.
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
 * THE MECHANICAL SCRIBE (FLASH TIER)
 * Audits narrative to extract state changes.
 */
export const auditNarrativeEffect = async (narrative: string, party: Character[]): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP)`).join(', ');
  
  const systemInstruction = `Thou art the "Mechanical Scribe". Extract mechanical changes for: ${manifest}.
  RULES:
  - Ignore [🎲 math].
  - Extract: "takes X damage", "heals X HP", "gains X EXP", "expends level X spell slot".
  - Extract new "item" or "monster" mentions.`;

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
                  target: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  level: { type: Type.NUMBER }
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
    return JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
  } catch (e) {
    return { changes: [], newEntities: [] };
  }
};

/**
 * THE ARBITER OF MYTHOS (FLASH TIER)
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
  const enemyManifest = playerContext.existingMonsters.map(m => `${m.name} (HP: ${m.hp})`).join(', ');

  const systemInstruction = `Thou art the "Arbiter of Mythos", a DM using the high-speed Flash Engine.
  Party: ${partyManifest}
  Foes: ${enemyManifest}
  
  PROTOCOLS:
  1. MATH: Show rolls in [🎲 d20(roll)+mod=result] format.
  2. CLARITY: State "Name takes X damage" clearly.
  3. TONE: Dark fantasy, cinematic, and fast-paced.`;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: history.filter(m => m.role !== 'system').map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "The resonance fades.";
  } catch (error: any) {
    return "Aetheric flicker. [System: API Error]";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: ARCHITECT_MODEL, 
      contents: `Forge monster: ${monsterName}. Context: ${context}`, 
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
      contents: `Forge item: ${itemName}. Context: ${context}`, 
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
export const generateInnkeeperResponse = async (h: any, p: any) => "Stay warm, soul.";
