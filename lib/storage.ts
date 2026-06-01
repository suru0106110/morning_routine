export type Holding = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
};

export type NewsCategory = "economy" | "tech" | "world" | "politics" | "sports" | "entertainment";

export type Settings = {
  speed: number;
  newsCount: number;
  newsKeywords: string[];
  newsCategories: NewsCategory[];
};

const HOLDINGS_KEY = "morning_holdings";
const SETTINGS_KEY = "morning_settings";

export const defaultSettings: Settings = {
  speed: 1.6,
  newsCount: 20,
  newsKeywords: [],
  newsCategories: [],
};

export function getHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HOLDINGS_KEY) || "[]"); } catch { return []; }
}

export function saveHoldings(holdings: Holding[]) {
  localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return defaultSettings; }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
