
import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor, Ability } from './types';

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

const prepareHistory = (history: Message[]) => {
  if (history.length === 0) return [{ role: 'user', parts: [{ text: 'Begin the chronicle.' }] }];
  const contents: any[] = [];
  let lastRole: string | null = null;
  history.forEach((m, idx) => {
    if (m.role === 'system') return;
    let currentRole = m.role === 'user' ? 'user' : 'model';
    if (idx === 0 && currentRole === 'model') {
      contents.push({
        role: 'user',
        parts: [{ text: `The chronicle begins: ${m.content}\n\nContinue.` }]
      });
      lastRole = 'user';
      return;
    }
    if (currentRole === lastRole) {
      contents[contents.length - 1].parts[0].text += `\n\n${m.content}`;
    } else {
      contents.push({ role: currentRole, parts: [{ text: m.content }] });
      lastRole = currentRole;
    }
  });
  return contents;
};

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
  2. SOLO FEAT CHECK: If a vessel vanquishes a Boss alone, ensure a "LEGENDARY_MANIFEST:" or Relic is generated.
  3. STAT SHIFTS: Look for damage, healing, exp, or mana changes.
  4. ENTITIES: Look for "Forge [Monster]" or "Manifest [Item]".
  
  Return JSON ONLY with 'changes' and 'newEntities'.`;

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
                  type: { type: Type.STRING, enum: ["damage", "heal", "exp", "mana", "ability"] },
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
  } catch (e) { return { changes: [], newEntities: [] }; }
};

/**
 * THE ARBITER: The primary DM logic.
 */
export const generateDMResponse = async (history: Message[], playerContext: any) => {
  if (isOffline()) return "The void is silent.";

  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Arbiter of Mythos", a world-class Dark Fantasy DM running on Flash.
  - Prose: Gritty, visceral, lethal.
  - High Stakes: If a player performs an act of extreme heroism, rolls a Nat 20, OR CLEARS A BOSS SOLO, thou MUST manifest a unique power.
  - Command: 
    Use "SCRIBE_COMMAND: [Name] takes [X] damage"
    Use "ARCHITECT_COMMAND: Forge [Name] (cr [X])"
    Use "LEGENDARY_MANIFEST: [Ability Name] | [Ability Description]" to grant a permanent unique power.
  - Rule 5: Reward solo boss-kills with Relic gear or Legendary Boons.`;

  // Standardize history for the SDK
  const contents = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents,
      config: { systemInstruction, temperature: 0.8 }
    });
    return response.text || "The engine hums in the dark.";
  } catch (error: any) { return "Aetheric connection severed."; }
};

export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  if (isOffline()) return { name: itemName, stats: {} };
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: [{ role: 'user', parts: [{ text: `Manifest Item: ${itemName}. Context: ${context}` }] }], 
      config: { 
        systemInstruction: "Manifest artifacts. Enforce FIDELITY OF ARMS.",
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
              properties: { ac: { type: Type.NUMBER }, damage: { type: Type.STRING }, damageType: { type: Type.STRING } } 
            }
          },
          required: ["name", "description", "type", "rarity", "stats"]
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return { name: itemName, stats: {} }; }
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
        systemInstruction: "Forge a horrific monster balanced for CR.",
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
          },
          required: ["name", "hp", "ac", "cr"]
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return { name: monsterName, hp: 30, ac: 13, cr: 1 }; }
};

export const manifestSoulLore = async (char: any): Promise<any> => {
  if (isOffline()) return { biography: "Soul forged in void.", description: "Standard." };
  const ai = getAiClient();
  trackUsage();
  const response = await ai.models.generateContent({ 
    model: FLASH_MODEL, 
    contents: [{ role: 'user', parts: [{ text: `Manifest Lore for ${char.name}. Return JSON with 'biography' and 'description'.` }] }], 
    config: { systemInstruction: "Lore-Weaver on Flash.", responseMimeType: "application/json" } 
  });
  return JSON.parse(response.text || '{}');
};

export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  if (isOffline()) return "Rest thy bones.";
  const ai = getAiClient();
  trackUsage();
  const response = await ai.models.generateContent({ 
    model: FLASH_MODEL, 
    contents: history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })), 
    config: { systemInstruction: "Barnaby, the innkeeper. Provide rumors and rest." } 
  });
  return response.text;
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });
export const generateSoulSignature = (state: GameState): string => { try { return btoa(encodeURIComponent(JSON.stringify(state))); } catch (e) { return "ERROR"; } };
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => { try { return JSON.parse(decodeURIComponent(atob(sig))); } catch { return null; } };
