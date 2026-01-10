import { GoogleGenAI, Type } from "@google/genai";
import { Message, Character, Monster, Item, GameState, Shop, Rumor } from './types';
import { MENTORS, INITIAL_MONSTERS, INITIAL_ITEMS } from './constants';

const NARRATIVE_MODEL = 'gemini-3-flash-preview'; 
const ARCHITECT_MODEL = 'gemini-3-pro-preview';
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
 * THE ORACLE ENGINE (OFFLINE FALLBACK)
 * Generates deterministic TTRPG responses based on game state and keywords.
 */
const generateOracleResponse = (history: Message[], context: any): string => {
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content.toLowerCase() || '';
  const monsters = context.existingMonsters as Monster[];
  
  if (lastUserMsg.includes('attack') || lastUserMsg.includes('fight')) {
    const target = monsters.length > 0 ? monsters[0].name : "a shadow in the dark";
    const damage = Math.floor(Math.random() * 10) + 5;
    return `[CLOCKWORK ARBITER]: Analyzing combat protocol. ${context.activeCharacter?.name || 'The hero'} strikes at the ${target}. Precision calculated. **Target takes ${damage} damage**. The gears of fate turn; the enemy recoils from the physical impact.`;
  }

  if (lastUserMsg.includes('search') || lastUserMsg.includes('look') || lastUserMsg.includes('loot')) {
    const items = ["Rusted Key", "Dim Aether Shard", "Tattered Map", "Dried Blood Vial"];
    const found = items[Math.floor(Math.random() * items.length)];
    return `[CLOCKWORK ARBITER]: Visual scan complete. Beneath the dust of the Sunken Sanctuary, thou findest a ${found}. The object resonates with minor utility. **Item added to thy potential manifests.**`;
  }

  if (lastUserMsg.includes('heal') || lastUserMsg.includes('rest')) {
    return `[CLOCKWORK ARBITER]: Vitality optimization engaged. The party focuses on biological recovery. **All party members restore 10 HP**. The physical vessels are mended by temporary stasis.`;
  }

  const prompts = [
    "The environment remains static. Obsidian walls echo with the sound of distant gears.",
    "A cold draft flows from the north. The rules of physics remain consistent.",
    "The path forward is clear, though darkened by the absence of aetheric light.",
    "Thy presence is noted by the architecture of the void."
  ];
  return `[CLOCKWORK ARBITER]: ${prompts[Math.floor(Math.random() * prompts.length)]} What is thy next logical input?`;
};

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
  const manifest = party.map(c => `${c.name} (${c.currentHp}/${c.maxHp} HP)`).join(', ');
  const systemPrompt = `Thou art the "Mechanical Scribe". Extract mechanical changes from text for ${manifest}. Return JSON ONLY.`;

  try {
    const response = await ai.models.generateContent({
      model: SCRIBE_MODEL,
      contents: narrative,
      config: { systemInstruction: systemPrompt, responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{"changes":[], "newEntities":[]}');
  } catch (e) {
    return { changes: [], newEntities: [] };
  }
};

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
  if ((window as any).MYTHOS_OFFLINE_MODE) {
    return generateOracleResponse(history, playerContext);
  }

  if (playerContext.usageCount !== undefined && playerContext.usageCount >= PERSONAL_LIMIT) {
    const wait = getHoursUntilRefresh();
    return `The Arbiter's mind is clouded by the heavy aetheric toll. My resonance is spent for this cycle. I must enter a state of deep meditation for the next ${wait} hours to restore my connection to the Great Well. Seek me then, when the stars turn once more (UTC Midnight). (Note: Sever the Aether Link in the Nexus to continue in Clockwork Mode).`;
  }

  const ai = getAiClient();
  trackUsage();

  let purifiedHistory = history.filter(m => m.role === 'user' || m.role === 'model');
  if (purifiedHistory.length === 0 || purifiedHistory[0].role === 'model') {
    purifiedHistory = [{ role: 'user', content: "Begin.", timestamp: Date.now() }, ...purifiedHistory];
  }

  const systemInstruction = `Thou art the "Arbiter of Mythos", a DM for a dark fantasy TTRPG. Rules: ${playerContext.activeRules}`;

  try {
    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: purifiedHistory.map(m => ({ role: m.role, parts: [{ text: m.content }] })) as any,
      config: { systemInstruction, temperature: 0.85 }
    });
    return response.text || "The abyss stares back.";
  } catch (error: any) {
    if (error.status === 429 || error.message?.toLowerCase().includes('quota')) {
        const wait = getHoursUntilRefresh();
        return `The Arbiter's mind is clouded by aetheric exhaustion. I must rest for ${wait} hours. (Sever the Aether Link in the Nexus to continue in Clockwork Mode).`;
    }
    return generateOracleResponse(history, playerContext);
  }
};

export const generateMonsterDetails = async (monsterName: string, context: string): Promise<Partial<Monster>> => {
  if ((window as any).MYTHOS_OFFLINE_MODE) return { name: monsterName, hp: 30, ac: 12, cr: 1 };
  const ai = getAiClient();
  const response = await ai.models.generateContent({ model: ARCHITECT_MODEL, contents: `Design stats for monster "${monsterName}". Context: ${context}.`, config: { responseMimeType: "application/json" } });
  return JSON.parse(response.text || '{}');
};

export const generateItemDetails = async (itemName: string, context: string): Promise<Partial<Item>> => {
  if ((window as any).MYTHOS_OFFLINE_MODE) return { name: itemName, rarity: 'Common', type: 'Utility' };
  const ai = getAiClient();
  const response = await ai.models.generateContent({ model: ARCHITECT_MODEL, contents: `Design stats for item "${itemName}". Context: ${context}.`, config: { responseMimeType: "application/json" } });
  return JSON.parse(response.text || '{}');
};

export const hydrateState = (data: Partial<GameState>, defaultState: GameState): GameState => ({ ...defaultState, ...data });
export const generateSoulSignature = (state: GameState): string => btoa(JSON.stringify(state));
export const parseSoulSignature = (sig: string, def: GameState): GameState | null => {
  try { return JSON.parse(atob(sig)); } catch { return null; }
};
export const generateShopInventory = async (c: string, l: number): Promise<Shop> => ({ id: safeId(), merchantName: 'Barnaby', merchantAura: '', inventory: [] });
export const manifestSoulLore = async (char: any): Promise<any> => {
  if ((window as any).MYTHOS_OFFLINE_MODE) return { biography: "A soul forged in silence.", description: "Standard vessel." };
  const ai = getAiClient();
  const response = await ai.models.generateContent({ model: ARCHITECT_MODEL, contents: `Lore for ${char.name}, a ${char.race} ${char.archetype}`, config: { responseMimeType: "application/json" } });
  return JSON.parse(response.text || '{"biography":"", "description":""}');
};
export const generateRumors = async (l: number): Promise<Rumor[]> => [];
export const generateCustomClass = async (p: string): Promise<any> => {
    if ((window as any).MYTHOS_OFFLINE_MODE) return {};
    const ai = getAiClient();
    const response = await ai.models.generateContent({ model: ARCHITECT_MODEL, contents: `Forge class: ${p}`, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text || '{}');
};
export const parseDMCommand = (t: string) => ({ setHp: [], takeDamage: [], heals: [], usedSlot: null, shortRest: false, longRest: false, currencyRewards: [], exp: 0, items: [] });
export const generateInnkeeperResponse = async (h: any, p: any) => "The ale is bitter today, traveler.";
