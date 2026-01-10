
import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor, Ability } from './types';

// THE CLOCKWORK ENGINE: Unified on Gemini 3 Flash for maximum narrative velocity
const FLASH_MODEL = 'gemini-3-flash-preview';

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
 * CLEANSING PROTOCOL
 * Gemini requires history to start with 'user' and alternate strictly.
 */
const prepareHistory = (history: Message[]) => {
  if (history.length === 0) return [{ role: 'user', parts: [{ text: 'Begin the chronicle.' }] }];

  const contents: any[] = [];
  let lastRole: string | null = null;

  history.forEach((m, idx) => {
    if (m.role === 'system') return;
    
    let currentRole = m.role === 'user' ? 'user' : 'model';
    
    // If first message is from model, convert it to a user context prompt to avoid 400 error
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

  // Final check: must end with model to receive user, or vice versa. 
  // For generateContent, standard list is fine.
  return contents;
};

/**
 * THE MECHANICAL SCRIBE
 */
export const auditNarrativeEffect = async (narrative: string, party: Character[]): Promise<any> => {
  if (!narrative) return { changes: [], newEntities: [] };
  
  const ai = getAiClient();
  trackUsage();
  
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP, ${c.currentMana}/${c.maxMana} Mana, Lvl ${c.level})`).join(', ');
  
  const systemInstruction = `Thou art the "Mechanical Scribe". Audit narrative for stats.
  Party: ${manifest}.
  RULES:
  1. Look for damage/heal/exp/mana changes.
  2. Detect new items, monsters, or bonus class abilities.
  3. Return JSON ONLY. Flash protocol active.`;

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ role: 'user', parts: [{ text: `Audit this text for changes: ${narrative}` }] }],
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
                  type: { type: Type.STRING, description: "damage, heal, exp, or mana" },
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
                  category: { type: Type.STRING, description: "monster, item, or ability" },
                  name: { type: Type.STRING },
                  target: { type: Type.STRING },
                  entityData: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      stats: { type: Type.OBJECT, properties: { ac: { type: Type.NUMBER }, damage: { type: Type.STRING } } },
                      manaCost: { type: Type.NUMBER },
                      hpCost: { type: Type.NUMBER },
                      scaling: { type: Type.STRING }
                    }
                  }
                },
                required: ["category", "name", "target"]
              }
            }
          },
          required: ["changes", "newEntities"]
        }
      }
    });
    return JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
  } catch (e) {
    console.error("Scribe Logic Breach:", e);
    return { changes: [], newEntities: [] };
  }
};

/**
 * THE ARBITER OF MYTHOS
 */
// Fix: align playerContext type with caller in DMWindow.tsx to include extra metadata and fix "Object literal may only specify known properties" error
export const generateDMResponse = async (
  history: Message[],
  playerContext: { 
    activeCharacter: Character | null;
    party: Character[]; 
    activeRules: string;
    campaignTitle: string;
    mentors?: Character[];
    existingItems?: Item[];
    existingMonsters?: Monster[];
    usageCount?: number;
  }
) => {
  const ai = getAiClient();
  trackUsage();

  const active = playerContext.activeCharacter;
  const activeDetail = active ? `
    CHARACTER MANIFEST:
    - Identity: ${active.name}, ${active.race} ${active.archetype}
    - Level: ${active.level}
    - Abilities: ${[...(active.abilities || []), ...(active.spells || [])].map(a => a.name).join(', ')}
  ` : 'No active soul.';

  const systemInstruction = `Thou art the "Arbiter of Mythos", a Dark Fantasy DM running on Gemini 3 Flash.
  ${activeDetail}
  Rules:
  1. Use [🎲 d20(roll)+mod=result] for checks.
  2. Grant unique feats for Nat 20 legendary successes.
  3. High-velocity, evocative dark fantasy prose.`;

  const contents = prepareHistory(history);

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "The void is silent.";
  } catch (error: any) {
    console.error("Arbiter Disconnect:", error);
    return "The Aetheric connection has been severed. [API ERROR 400: History Malformed or Key Invalid]";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: `Manifest Monster Statblock: ${monsterName}. Context: ${context}`, 
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
            stats: { type: Type.OBJECT, properties: { str: { type: Type.NUMBER }, dex: { type: Type.NUMBER }, con: { type: Type.NUMBER }, int: { type: Type.NUMBER }, wis: { type: Type.NUMBER }, cha: { type: Type.NUMBER } } }
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
      model: FLASH_MODEL, 
      contents: `Manifest Item: ${itemName}. Context: ${context}`, 
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            rarity: { type: Type.STRING },
            stats: { type: Type.OBJECT, properties: { ac: { type: Type.NUMBER }, damage: { type: Type.STRING } } }
          }
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return { name: itemName }; }
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });

export const generateSoulSignature = (state: GameState): string => {
  try { return btoa(encodeURIComponent(JSON.stringify(state))); } catch (e) { return "ERROR"; }
};

export const parseSoulSignature = (sig: string, def: GameState): GameState | null => {
  try { return JSON.parse(decodeURIComponent(atob(sig))); } catch { return null; }
};

export const manifestSoulLore = async (char: any): Promise<any> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({ 
    model: FLASH_MODEL, 
    contents: `Lore for ${char.name} (${char.race} ${char.archetype}). JSON.`, 
    config: { responseMimeType: "application/json" } 
  });
  return JSON.parse(response.text || '{}');
};

export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  const ai = getAiClient();
  trackUsage();
  try {
    const contents = prepareHistory(history);
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents,
      config: { systemInstruction: "Thou art Barnaby, one-eyed innkeeper. Dark fantasy. Flash tier." }
    });
    return response.text;
  } catch (e) { return "Barnaby just stares into the fire."; }
};
