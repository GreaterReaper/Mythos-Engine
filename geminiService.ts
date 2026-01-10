import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor, Ability } from './types';

// THE CLOCKWORK ENGINE: Unified on Gemini 3 Flash for maximum narrative velocity
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
 * Runs under Flash Protocol.
 */
export const auditNarrativeEffect = async (narrative: string, party: Character[]): Promise<any> => {
  const ai = getAiClient();
  trackUsage();
  
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP, ${c.currentMana}/${c.maxMana} Mana, Lvl ${c.level})`).join(', ');
  
  const systemInstruction = `Thou art the "Mechanical Scribe". Thy duty is to audit the narrative for statistical changes and physical manifestations.
  Current Party: ${manifest}.

  STRICT EXTRACTION RULES:
  1. DAMAGE/HEAL: Look for "takes X damage", "loses X HP", "heals X HP", or "restores X HP".
  2. EXPERIENCE: Look for "gains X EXP" or "receives X EXP".
  3. MANA/STAMINA: Look for "expends X mana", "uses X stamina", or "loses X mana".
  4. NEW ENTITIES: Look for NEW monsters, items, OR custom ABILITIES/FEATS mentioned as being found, looted, or RECEIVED. 
     - "entityData" property should contain detailed stats for the new entity if it is an item or ability.
     - For ABILITIES: Include name, description, and scaling if mentioned.
  
  CRITICAL: Return JSON only. Do NOT hallucinate values. Running on Flash Tier.`;

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
                  type: { type: Type.STRING, description: "damage, heal, exp, or mana" },
                  target: { type: Type.STRING, description: "Character name" },
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
                  target: { type: Type.STRING, description: "Character name" },
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
    console.error("Scribe Failure:", e);
    return { changes: [], newEntities: [] };
  }
};

/**
 * THE ARBITER OF MYTHOS
 * Runs under Flash Protocol for low-latency storytelling.
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

  const active = playerContext.activeCharacter;
  const activeDetail = active ? `
    CHARACTER MANIFEST [READ CAREFULLY]:
    - Identity: ${active.name} (${active.gender}), ${active.race} ${active.archetype}
    - Level: Level ${active.level}
    - Manifestations: ${[...(active.abilities || []), ...(active.spells || [])].map(a => a.name).join(', ')}
  ` : 'No active soul detected in the aether.';

  const partyManifest = playerContext.party.map(c => `${c.name} (HP:${c.currentHp}/${c.maxHp}, Mana:${c.currentMana}/${c.maxMana})`).join(', ');
  
  const systemInstruction = `Thou art the "Arbiter of Mythos", a Dark Fantasy DM running on the high-speed Flash Tier.
  
  ${activeDetail}
  
  FELLOWSHIP CONTEXT:
  ${partyManifest}
  
  PROTOCOLS:
  1. OMNISCIENCE: Thou MUST correctly identify the character's Name, Level, and current Abilities.
  2. LEGENDARY FEATS: For truly exceptional roleplay or extreme success (Nat 20 on a high-stakes task), thou mayst grant a unique custom ABILITY or FEAT. 
     - Example: "For thy legendary defense of the gate, thou gainest the 'Bulwark of Souls' feat: +1 AC when adjacent to allies."
     - Tailor these to the character's class and context.
  3. DICE: Use [🎲 d20(roll)+mod=result] for all checks.
  4. DETERMINISM: The world reacts harshly to thy Stats.
  5. VELOCITY: Deliver narrative with speed and punchy, evocative prose.`;

  // Gemini requires strictly alternating roles: user -> model -> user -> model.
  const contents = [];
  let lastRole = null;
  
  for (const m of history) {
    if (m.role === 'system') continue;
    const role = m.role === 'user' ? 'user' : 'model';
    if (role === lastRole && contents.length > 0) {
      contents[contents.length - 1].parts[0].text += `\n\n${m.content}`;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
      lastRole = role;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "The resonance fades into the void.";
  } catch (error: any) {
    console.error("Arbiter Disturbance:", error);
    return "Aetheric disturbance detected. [API Error]";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({ 
      model: ARCHITECT_MODEL, 
      contents: `Manifest Monster Statblock: ${monsterName}. Context: ${context}. Return full stats.`, 
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
      contents: `Manifest Relic Properties: ${itemName}. Context: ${context}. Return JSON. Weapon, Armor, or Utility.`, 
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            rarity: { type: Type.STRING },
            isUnique: { type: Type.BOOLEAN },
            stats: {
              type: Type.OBJECT,
              properties: { ac: { type: Type.NUMBER }, damage: { type: Type.STRING } }
            }
          }
        }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return { name: itemName }; }
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });

export const generateSoulSignature = (state: GameState): string => {
  try {
    const json = JSON.stringify(state);
    return btoa(encodeURIComponent(json));
  } catch (e) { return "ERROR: Soul Corruption."; }
};

export const parseSoulSignature = (sig: string, def: GameState): GameState | null => {
  try { return JSON.parse(decodeURIComponent(atob(sig))); } catch { return null; }
};

export const manifestSoulLore = async (char: any): Promise<any> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({ 
    model: ARCHITECT_MODEL, 
    contents: `Lore for ${char.name} (${char.race} ${char.archetype}). JSON.`, 
    config: { responseMimeType: "application/json" } 
  });
  return JSON.parse(response.text || '{}');
};

export const generateCustomClass = async (p: string): Promise<any> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({ 
    model: ARCHITECT_MODEL, 
    contents: `Class Concept: ${p}. JSON.`, 
    config: { responseMimeType: "application/json" } 
  });
  return JSON.parse(response.text || '{}');
};

export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  const ai = getAiClient();
  trackUsage();
  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: history.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })) as any,
      config: { systemInstruction: "Thou art Barnaby, the one-eyed innkeeper of 'The Broken Cask'. Friendly but weary. Dark fantasy tone. Running on Flash." }
    });
    return response.text;
  } catch (e) { return "Barnaby just stares into the fire."; }
};