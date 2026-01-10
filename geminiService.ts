
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

const CLOCKWORK_RESPONSES = [
  "The obsidian corridors shift as thou steppest forward. The darkness hungers. What is thy move?",
  "A chill wind carries the scent of iron and ancient rot. Thine enemies circle in the gloom. Prepare thyself.",
  "Thy soul resonates with the surrounding void. A heavy silence falls over the sanctuary. Fate awaits.",
  "The mechanisms of the world grind with a metallic screech. Something ancient has been disturbed."
];

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
        parts: [{ text: `The chronicle begins as follows: ${m.content}\n\nI acknowledge this. Continue.` }]
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
  if (!narrative) return { changes: [], newEntities: [] };
  
  if (isOffline()) {
    const changes: any[] = [];
    const lowNar = narrative.toLowerCase();
    party.forEach(char => {
      const name = char.name.toLowerCase();
      if (lowNar.includes(name)) {
        const damageMatch = lowNar.match(new RegExp(`${name}.*?takes.*?(\\d+)`));
        if (damageMatch) changes.push({ type: 'damage', target: char.name, value: parseInt(damageMatch[1]) });
      }
    });
    return { changes, newEntities: [] };
  }

  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Mechanical Scribe". Thy duty is to audit the Arbiter's narrative for mechanical shifts.
  DETECTION PROTOCOLS:
  1. DAMAGE/HEAL/EXP: Look for phrases like "takes X damage" or "gains X exp".
  2. ENTITY MANIFESTATION: Look for "ARCHITECT_COMMAND: Forge [Name] (cr [Value])".
  3. EXPLORATION: Look for mentions of loot or environmental discoveries.
  Return JSON ONLY.`;

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
                  type: { type: Type.STRING, enum: ["damage", "heal", "exp", "mana"] },
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
  if (isOffline()) {
    return CLOCKWORK_RESPONSES[Math.floor(Math.random() * CLOCKWORK_RESPONSES.length)];
  }

  const ai = getAiClient();
  trackUsage();
  const isRaid = playerContext.isRaid;
  const systemInstruction = `Thou art the "Arbiter of Mythos", a world-class Dark Fantasy DM.
  EXPLORATION PROTOCOL:
  - Between combat, focus on environmental storytelling, sensory details (smell of ozone, cold damp walls), and ancient lore.
  - Describe the world in "Exploration Beats": [Environment Description] -> [Sensory Detail] -> [Interactive Hook].
  - Provide meaningful choices: "The path splits: a staircase of teeth or a corridor of weeping obsidian."
  
  MECHANICAL WEIGHT:
  - Use [🎲 d20(roll)+mod=result] for checks.
  - Harm characters with "SCRIBE_COMMAND: [Name] takes [X] damage."
  - Summon horrors with "ARCHITECT_COMMAND: Forge [Name] (cr [X])."
  - Reward the party with "ARCHITECT_COMMAND: Manifest [Item Name]."
  
  PROSE: Grim, visceral, high-velocity dark fantasy. Use the term "Vessels" for characters.`;

  const contents = prepareHistory(history);
  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents,
      config: { 
        systemInstruction, 
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 4096 }
      }
    });
    return response.text || "The void consumes thy words.";
  } catch (error: any) { return "The Aetheric connection has been severed."; }
};

/**
 * THE ARCHITECT: Forges unique gear.
 */
export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  if (isOffline()) {
    return { name: itemName, type: 'Weapon', rarity: 'Common', stats: { damage: '1d6' } };
  }

  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: `Manifest Item: ${itemName}. Context: ${context}`, 
      config: { 
        systemInstruction: "Thou art the Architect's Forge. Manifest Dark Fantasy artifacts.",
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
    const data = JSON.parse(response.text || '{}');
    if (data.ac !== undefined && !data.stats?.ac) {
      if (!data.stats) data.stats = {};
      data.stats.ac = data.ac;
    }
    return data;
  } catch (e) { return { name: itemName, stats: {} }; }
};

/**
 * THE ARCHITECT (Bestiary Clerk): Forges horrors.
 */
export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  if (isOffline()) {
    return { name: monsterName, hp: 30, ac: 13, cr: 1 };
  }

  const ai = getAiClient();
  trackUsage();
  const response = await ai.models.generateContent({ 
    model: FLASH_MODEL, 
    contents: `Manifest Monster: ${monsterName}. Context: ${context}.`, 
    config: { 
      systemInstruction: "Forge a horrific monster with complete stats.",
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          hp: { type: Type.NUMBER },
          ac: { type: Type.NUMBER },
          cr: { type: Type.NUMBER },
          description: { type: Type.STRING },
          stats: { type: Type.OBJECT },
          abilities: { type: Type.ARRAY, items: { type: Type.OBJECT } }
        }
      }
    } 
  });
  return JSON.parse(response.text || '{}');
};

export const manifestSoulLore = async (char: any): Promise<any> => {
  if (isOffline()) return { biography: "Soul forged in void.", description: "Standard design." };
  const ai = getAiClient();
  trackUsage();
  const response = await ai.models.generateContent({ 
    model: FLASH_MODEL, 
    contents: `Manifest Lore for ${char.name}.`, 
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
    contents: prepareHistory(history), 
    config: { systemInstruction: "Barnaby, the weary innkeeper." } 
  });
  return response.text;
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });
export const generateSoulSignature = (state: GameState): string => { try { return btoa(encodeURIComponent(JSON.stringify(state))); } catch (e) { return "ERROR"; } };
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => { try { return JSON.parse(decodeURIComponent(atob(sig))); } catch { return null; } };
