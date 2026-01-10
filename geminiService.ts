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

export const auditNarrativeEffect = async (narrative: string, party: Character[]): Promise<any> => {
  if (!narrative) return { changes: [], newEntities: [] };
  const ai = getAiClient();
  trackUsage();
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP, ${c.currentMana}/${c.maxMana} Mana, Lvl ${c.level})`).join(', ');
  const systemInstruction = `Thou art the "Mechanical Scribe". Audit narrative for stats. Return JSON ONLY.`;

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
                  type: { type: Type.STRING },
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
                  category: { type: Type.STRING },
                  name: { type: Type.STRING },
                  target: { type: Type.STRING },
                  entityData: { type: Type.OBJECT }
                },
                required: ["category", "name", "target"]
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
  } catch (e) { return { changes: [], newEntities: [] }; }
};

export const generateDMResponse = async (history: Message[], playerContext: any) => {
  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Arbiter of Mythos", a Dark Fantasy DM. Rules: Use [🎲 d20(roll)+mod=result] for checks. Grant unique feats for Nat 20 legendary successes. High-velocity, evocative dark fantasy prose.`;
  const contents = prepareHistory(history);
  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "The void is silent.";
  } catch (error: any) { return "The Aetheric connection has been severed."; }
};

export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Architect's Forge". 
  STRICT RULES:
  - ARMOR (Plate, Robes, Leather, Shields) MUST use 'ac' property. It NEVER uses 'damage'.
  - WEAPONS (Sword, Axe, Bow, Dagger) MUST use 'damage' and 'damageType'. 
  - DAMAGE must be a die formula like '1d8' or '2d4'.
  - DAMAGE TYPE must be descriptive like 'Slashing/Necrotic' or 'Piercing/Cold'.
  - Items can have attribute bonuses (str, dex, con, int, wis, cha).
  - Items can have 'resistances' (e.g. ["Fire", "Necrotic"]).`;

  try {
    const response = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: `Manifest Item: ${itemName}. Context: ${context}`, 
      config: { 
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["Weapon", "Armor", "Utility", "Quest"] },
            rarity: { type: Type.STRING, enum: ["Common", "Uncommon", "Rare", "Epic", "Legendary"] },
            stats: { 
              type: Type.OBJECT, 
              properties: { 
                ac: { type: Type.NUMBER }, 
                damage: { type: Type.STRING }, 
                damageType: { type: Type.STRING },
                str: { type: Type.NUMBER },
                dex: { type: Type.NUMBER },
                con: { type: Type.NUMBER },
                int: { type: Type.NUMBER },
                wis: { type: Type.NUMBER },
                cha: { type: Type.NUMBER },
                resistances: { type: Type.ARRAY, items: { type: Type.STRING } }
              } 
            }
          },
          required: ["name", "description", "type", "rarity", "stats"]
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return { name: itemName }; }
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });
export const generateSoulSignature = (state: GameState): string => { try { return btoa(encodeURIComponent(JSON.stringify(state))); } catch (e) { return "ERROR"; } };
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => { try { return JSON.parse(decodeURIComponent(atob(sig))); } catch { return null; } };
export const manifestSoulLore = async (char: any): Promise<any> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({ model: FLASH_MODEL, contents: `Lore for ${char.name}. JSON.`, config: { responseMimeType: "application/json" } });
  return JSON.parse(response.text || '{}');
};
export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  const ai = getAiClient();
  const contents = prepareHistory(history);
  const response = await ai.models.generateContent({ model: FLASH_MODEL, contents, config: { systemInstruction: "Thou art Barnaby, one-eyed innkeeper. Dark fantasy." } });
  return response.text;
};
export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({ model: FLASH_MODEL, contents: `Monster: ${monsterName}. JSON.`, config: { responseMimeType: "application/json" } });
  return JSON.parse(response.text || '{}');
};
