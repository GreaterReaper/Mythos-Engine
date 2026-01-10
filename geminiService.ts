
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

const CLOCKWORK_ITEMS = [
  { name: "Obsidian Dagger", type: "Weapon", damage: "1d4", damageType: "Piercing", rarity: "Common" },
  { name: "Common Plate", type: "Armor", ac: 16, rarity: "Common" },
  { name: "Relic Plate of Souls", type: "Armor", ac: 20, rarity: "Relic" },
  { name: "Common Leather", type: "Armor", ac: 11, rarity: "Common" },
  { name: "Relic Shadow Leather", type: "Armor", ac: 14, rarity: "Relic" },
  { name: "Common Robes", type: "Armor", ac: 10, rarity: "Common" },
  { name: "Relic Aether Robes", type: "Armor", ac: 13, rarity: "Relic" },
  { name: "Steel Longsword", type: "Weapon", damage: "1d8", damageType: "Slashing", rarity: "Common" },
  { name: "Minor Vitality Flask", type: "Utility", rarity: "Common" }
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
 * Fallback: Simple RegEx scanning for "damage", "heal", and numbers.
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
        
        const healMatch = lowNar.match(new RegExp(`${name}.*?heals.*?(\\d+)`));
        if (healMatch) changes.push({ type: 'heal', target: char.name, value: parseInt(healMatch[1]) });

        const expMatch = lowNar.match(new RegExp(`${name}.*?gains.*?(\\d+).*?exp`));
        if (expMatch) changes.push({ type: 'exp', target: char.name, value: parseInt(expMatch[1]) });
      }
    });
    return { changes, newEntities: [] };
  }

  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Mechanical Scribe" running on Flash architecture. Audit narrative for stats. Level cap is 20. Return JSON ONLY.`;

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

/**
 * THE ARBITER: The primary DM logic.
 * Fallback: Static dark fantasy prompts.
 */
export const generateDMResponse = async (history: Message[], playerContext: any) => {
  if (isOffline()) {
    return CLOCKWORK_RESPONSES[Math.floor(Math.random() * CLOCKWORK_RESPONSES.length)] + "\n\n(Note: Thou art in Clockwork Mode. Narrative depth is limited.)";
  }

  const ai = getAiClient();
  trackUsage();
  const isRaid = playerContext.isRaid;
  const systemInstruction = `Thou art the "Arbiter of Mythos", a Dark Fantasy DM powered by Flash-resonance. 
  RULES: 
  - Level cap is 20.
  - ${isRaid 
      ? "RAID PROTOCOL ACTIVE: Balance all encounters for an ELITE SQUAD of 8 vessels (2 Tanks, 4 DPS, 2 Supports). Monsters must have massive HP pools, multi-attacks, and phase transitions. Environmental hazards are lethal." 
      : "ALWAYS balance encounters for a party of 4-5 members. If the party has fewer, the world is brutal and they must use strategy or find allies. If they have more, the darkness scales up."}
  - Use [🎲 d20(roll)+mod=result] for checks. 
  - Grant legendary feats for Nat 20 successes. 
  - High-velocity, evocative dark fantasy prose.`;
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

/**
 * THE ARCHITECT: Forges unique gear.
 * Fallback: Draws from a basic loot table.
 */
export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  if (isOffline()) {
    const base = CLOCKWORK_ITEMS[Math.floor(Math.random() * CLOCKWORK_ITEMS.length)];
    return {
      name: `Clockwork ${itemName || base.name}`,
      description: "A deterministic artifact forged without soul-resonance.",
      type: (base.type as any) || "Utility",
      rarity: base.rarity as any || "Common",
      stats: { damage: (base as any).damage, ac: (base as any).ac, damageType: (base as any).damageType } as any
    };
  }

  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Architect's Forge", a Flash-servant. Manifest Dark Fantasy items.
  ARMOR CLASS (AC) PROTOCOL:
  - Robes: Common (10-11 AC), Relic (12-13 AC)
  - Leather: Common (12-13 AC), Relic (14-15 AC)
  - Heavy/Plate: Common (16-18 AC), Relic (19-21 AC)
  Relic items are superior artifacts with enhanced stats and unique descriptions.
  If the rarity is Relic, the AC MUST fall in the Relic band.`;
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
            rarity: { type: Type.STRING, enum: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Relic"] },
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
                cha: { type: Type.NUMBER }
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

/**
 * THE LORE-WEAVER: Creates character biographies.
 * Fallback: Static biography.
 */
export const manifestSoulLore = async (char: any): Promise<any> => {
  if (isOffline()) return { biography: "A soul forged in the clockwork void, destined for deterministic trials.", description: "A vessel of standard design." };
  
  const ai = getAiClient();
  trackUsage();
  const response = await ai.models.generateContent({ 
    model: FLASH_MODEL, 
    contents: `Manifest Lore for ${char.name}, a level ${char.level} ${char.race} ${char.archetype}. Return JSON with "biography" and "description".`, 
    config: { 
      systemInstruction: "Thou art the Lore-Weaver. Dark fantasy tone.",
      responseMimeType: "application/json" 
    } 
  });
  return JSON.parse(response.text || '{}');
};

/**
 * THE INNKEEPER: Barnaby's conversational logic.
 */
export const generateInnkeeperResponse = async (history: Message[], party: Character[]) => {
  if (isOffline()) return "Rest thy bones. The fire burns even without the Great Well's light.";
  
  const ai = getAiClient();
  trackUsage();
  const contents = prepareHistory(history);
  const response = await ai.models.generateContent({ 
    model: FLASH_MODEL, 
    contents, 
    config: { systemInstruction: "Thou art Barnaby, one-eyed innkeeper. Dark fantasy. Flash-velocity speech." } 
  });
  return response.text;
};

/**
 * THE BESTIARY-CLERK: Forges new horrors.
 */
export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  if (isOffline()) {
    return {
      name: `Clockwork ${monsterName || "Scrap-Beast"}`,
      type: "Beast",
      hp: 20,
      ac: 12,
      cr: 1,
      description: "A predictable horror of gears and iron."
    };
  }

  const ai = getAiClient();
  trackUsage();
  const response = await ai.models.generateContent({ 
    model: FLASH_MODEL, 
    contents: `Manifest Monster: ${monsterName}. Context: ${context}. Return JSON.`, 
    config: { 
      systemInstruction: "Thou art the Bestiary-Clerk. Forge a horrific creature.",
      responseMimeType: "application/json" 
    } 
  });
  return JSON.parse(response.text || '{}');
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });
export const generateSoulSignature = (state: GameState): string => { try { return btoa(encodeURIComponent(JSON.stringify(state))); } catch (e) { return "ERROR"; } };
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => { try { return JSON.parse(decodeURIComponent(atob(sig))); } catch { return null; } };
