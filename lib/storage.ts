export type Holding = {
  id: string;
  symbol: string;   // e.g. "7203.T" or "AAPL"
  name: string;     // 表示名
  shares: number;   // 保有口数
  avgCost: number;  // 平均取得単価（円）
};

export type Settings = {
  speed: number;        // TTS speed 0.8–1.5
  newsCount: number;    // 読むニュース本数
};

const HOLDINGS_KEY = "morning_holdings";
const SETTINGS_KEY = "morning_settings";

export const defaultSettings: Settings = { speed: 1.6, newsCount: 7 };

export function getHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HOLDINGS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]) {
  localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
