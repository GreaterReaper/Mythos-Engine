import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS } from './constants';

// Unified Gemini 3 Flash tier for speed, reliability, and strict JSON compliance
const NARRATIVE_MODEL = 'gemini-3-flash-preview'; 
const ARCHITECT_MODEL = 'gemini-3-flash-preview';
const SCRIBE_MODEL = 'gemini-3-flash-preview';

const PERSONAL_LIMIT = 1500;

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

const getHoursUntilRefresh = () => {
  const now = new Date();
  const nextReset = new Date();
  nextReset.setUTCHours(24, 0, 0, 0);
  const diffMs = nextReset.getTime() - now.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.max(1, Math.ceil(hours));
};

/**
 * THE MECHANICAL SCRIBE
 * Audits narrative text to extract mechanical changes.
 * Tuned for Flash to ignore dice-roll math and capture final results.
 */
export const auditNarrativeEffect = async (narrative: string, party: Character[]): Promise<any> => {
  if ((window as any).MYTHOS_OFFLINE_MODE) {
    if (narrative.includes("damage")) {
      const match = narrative.match(/takes (\d+) damage/);
      const val = match ? parseInt(match[1]) : 5;
      return { changes: [{ type: 'damage', target: party[0]?.name, value: val }], newEntities: [] };
    }
    return { changes: [], newEntities: [] };
  }

  const ai = getAiClient();
  trackUsage();
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP, Spells: ${JSON.stringify(c.spellSlots || {})})`).join(', ');
  
  const systemInstruction = `Thou art the "Mechanical Scribe" for the Mythos Engine. 
  Task: Extract state changes for characters: ${manifest}.
  
  IGNORE the math inside brackets like [d20(15)+5]. 
  FOCUS on the narrative results: "takes 5 damage", "heals 10 HP", "gains 100 EXP", "expends a level 1 spell slot".
  
  Schema: { 
    "changes": [{ "type": "damage"|"heal"|"exp"|"spellSlot", "target": "Name", "value": number, "level": number? }], 
    "newEntities": [{ "category": "monster"|"item", "name": "Name" }] 
  }
  Rules: Return JSON ONLY. Always favor the text over the bracketed math if they conflict.`;

  try {
    const response = await ai.models.generateContent({
      model: SCRIBE_MODEL,
      contents: narrative,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
  } catch (e) {
    return { changes: [], newEntities: [] };
  }
};

/**
 * THE ARBITER OF MYTHOS
 * DM model that now explicitly includes dice roll notation in narrative.
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

  const partyManifest = playerContext.party.map(c => `${c.name} (${c.archetype}, HP: ${c.currentHp}/${c.maxHp}, AC: 15)`).join(', ');
  const enemyManifest = playerContext.existingMonsters.map(m => `${m.name} (AC: ${m.ac}, HP: ${m.hp})`).join(', ');

  const systemInstruction = `Thou art the "Arbiter of Mythos", a DM for a dark fantasy TTRPG. 
  Current Party: ${partyManifest}
  Active Foes: ${enemyManifest}
  Rules: ${playerContext.activeRules}

  CRITICAL PROTOCOL:
  1. SHOW THE MATH: For every action (attack, skill check, save), show the roll in brackets.
     Format: [🎲 d20(roll) + mod = result vs DC/AC] or [💥 Damage: 1d8(5) + 2 = 7].
  2. NARRATE THE RESULT: Use cinematic prose to describe what the math means.
  3. STATE CHANGES: Explicitly state "Name takes X damage" or "Name expends a level Y spell slot" so the Scribe can audit it.
  4. INVENTORY: If they find an item, describe its name clearly.`;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: history.filter(m => m.role !== 'system').map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction, temperature: 0.75 }
    });
    return response.text || "The abyss remains silent.";
  } catch (error: any) {
    return "The aetheric connection flickers. [System: API Error or Quota Reached]";
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Monster Architect". Return JSON stat block for "${monsterName}".`;
  const response = await ai.models.generateContent({ 
    model: ARCHITECT_MODEL, 
    contents: `Monster: ${monsterName}. Context: ${context}`, 
    config: { systemInstruction, responseMimeType: "application/json" } 
  });
  return JSON.parse(response.text || '{}');
};

export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  const ai = getAiClient();
  trackUsage();
  const systemInstruction = `Thou art the "Relic Architect". Return JSON for "${itemName}".`;
  const response = await ai.models.generateContent({ 
    model: ARCHITECT_MODEL, 
    contents: `Item: ${itemName}. Context: ${context}`, 
    config: { systemInstruction, responseMimeType: "application/json" } 
  });
  return JSON.parse(response.text || '{}');
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
export const generateInnkeeperResponse = async (h: any, p: any) => "The hearth is warm, traveler.";
