import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor } from './types';

// THE CLOCKWORK ENGINE: Unified on Gemini 3 Flash
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
  4. BLOOD MAGIC: Extract HP costs for blood-based spells even if the DM only implies them.
  5. NEW ENTITIES: Look for NEW monsters OR items mentioned as being found, looted, or received. 
     - Items found MUST be extracted to be added to the global Armory.
     - Associate items with a "target" character name if the narrative implies they take it.
  
  CRITICAL: Return JSON only. Do NOT hallucinate values.`;

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
                  category: { type: Type.STRING, description: "monster or item" },
                  name: { type: Type.STRING },
                  target: { type: Type.STRING, description: "Character receiving item" }
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
    console.error("Scribe Failure:", e);
    return { changes: [], newEntities: [] };
  }
};

/**
 * THE ARBITER OF MYTHOS
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
  // HIGH FIDELITY CHARACTER MANIFEST - The AI must read this to identify identity and power
  const activeDetail = active ? `
    CHARACTER MANIFEST [READ CAREFULLY]:
    - Identity: ${active.name} (${active.gender}), ${active.race} ${active.archetype}
    - Level/Progress: Level ${active.level} (Current EXP: ${active.exp})
    - Combat Stats: STR ${active.stats.str}, DEX ${active.stats.dex}, CON ${active.stats.con}, INT ${active.stats.int}, WIS ${active.stats.wis}, CHA ${active.stats.cha}
    - Vitality: HP ${active.currentHp}/${active.maxHp}, Mana ${active.currentMana}/${active.maxMana}
    - Inventory: ${active.inventory.map(i => `${i.name} (${i.type}, ${i.rarity})`).join(', ') || 'Only rags'}
    - Manifestations: ${[...(active.abilities || []), ...(active.spells || [])].map(a => a.name).join(', ')}
  ` : 'No active soul detected in the aether.';

  const partyManifest = playerContext.party.map(c => `${c.name} (HP:${c.currentHp}/${c.maxHp}, Mana:${c.currentMana}/${c.maxMana})`).join(', ');
  
  const systemInstruction = `Thou art the "Arbiter of Mythos", a Dark Fantasy DM.
  
  ${activeDetail}
  
  FELLOWSHIP CONTEXT:
  ${partyManifest}
  
  PROTOCOLS:
  1. OMNISCIENCE: Thou MUST correctly identify the character's Name, Gender, Stats, and Items. If the manifest says they are "Male" and have "18 STR", narrate accordingly. If they have "0 Mana", they cannot manifest spells.
  2. DICE: Use [🎲 d20(roll)+mod=result] for all checks. Calculate the "mod" using the Stats from the Manifest (e.g., 18 STR is +4).
  3. COST OF POWER: Spells cost Mana. Dark/Blood magic costs HP. Narrate the toll: "Name's veins blacken, losing 12 HP to manifest the rite."
  4. EXPERIENCE: Award EXP (50-500) based on deeds. Do NOT narrate level-ups; the Engine handles the Soul's Ascension.
  5. DETERMINISM: The world reacts to thy Stats. Low INT means cryptic puzzles are incomprehensible; high CHA makes the fearful follow thy lead.`;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: history.filter(m => m.role !== 'system').map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction, temperature: 0.7 }
    });
    return response.text || "The resonance fades into the void.";
  } catch (error: any) {
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
      contents: history.map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction: "Thou art Barnaby, the one-eyed innkeeper of 'The Broken Cask'. Friendly but weary. Dark fantasy tone." }
    });
    return response.text;
  } catch (e) { return "Barnaby just stares into the fire."; }
};
