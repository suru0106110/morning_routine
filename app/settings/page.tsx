"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getHoldings,
  saveHoldings,
  getSettings,
  saveSettings,
  type Holding,
  type Settings,
} from "@/lib/storage";

export default function SettingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [settings, setSettings] = useState<Settings>({ speed: 1.0, newsCount: 7 });

  // new holding form
  const [form, setForm] = useState({ symbol: "", name: "", shares: "", avgCost: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHoldings(getHoldings());
    setSettings(getSettings());
  }, []);

  const addHolding = () => {
    const shares = parseFloat(form.shares);
    const avgCost = parseFloat(form.avgCost);
    if (!form.symbol || !form.name || isNaN(shares) || isNaN(avgCost)) return;
    const next: Holding[] = [
      ...holdings,
      { id: crypto.randomUUID(), symbol: form.symbol.toUpperCase(), name: form.name, shares, avgCost },
    ];
    setHoldings(next);
    saveHoldings(next);
    setForm({ symbol: "", name: "", shares: "", avgCost: "" });
  };

  const removeHolding = (id: string) => {
    const next = holdings.filter((h) => h.id !== id);
    setHoldings(next);
    saveHoldings(next);
  };

  const handleSaveSettings = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="min-h-screen px-5 pt-12 pb-12 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold">設定</h1>
      </div>

      {/* Holdings */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">保有銘柄</h2>
        <p className="text-xs text-white/30 mb-4">
          国内株: <code className="text-white/50">7203.T</code>　米国株: <code className="text-white/50">AAPL</code>　投信ETF: <code className="text-white/50">0331418A.T</code>
        </p>

        {/* Add form */}
        <div className="bg-white/5 rounded-2xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="ティッカー (例: 7203.T)"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              className="bg-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 outline-none focus:ring-1 focus:ring-white/30"
            />
            <input
              placeholder="銘柄名 (例: トヨタ)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="保有口数"
              type="number"
              value={form.shares}
              onChange={(e) => setForm({ ...form, shares: e.target.value })}
              className="bg-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 outline-none focus:ring-1 focus:ring-white/30"
            />
            <input
              placeholder="平均取得単価 (円)"
              type="number"
              value={form.avgCost}
              onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
              className="bg-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <button
            onClick={addHolding}
            disabled={!form.symbol || !form.name || !form.shares || !form.avgCost}
            className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-30 hover:bg-white/90 transition"
          >
            追加
          </button>
        </div>

        {/* Holdings list */}
        {holdings.length === 0 ? (
          <p className="text-center text-white/20 text-sm py-4">銘柄が登録されていません</p>
        ) : (
          <ul className="space-y-2">
            {holdings.map((h) => (
              <li key={h.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-white/30">{h.symbol} · {h.shares}口 · 取得¥{h.avgCost.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => removeHolding(h.id)}
                  className="text-white/20 hover:text-red-400 transition ml-3"
                  aria-label="削除"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reading settings */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">読み上げ設定</h2>
        <div className="bg-white/5 rounded-2xl p-4 space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>読み上げ速度</span>
              <span className="text-white/50">{settings.speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.8}
              step={0.1}
              value={settings.speed}
              onChange={(e) => setSettings({ ...settings, speed: parseFloat(e.target.value) })}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs text-white/20 mt-1">
              <span>ゆっくり</span><span>速い</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>ニュース本数</span>
              <span className="text-white/50">{settings.newsCount}本</span>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={settings.newsCount}
              onChange={(e) => setSettings({ ...settings, newsCount: parseInt(e.target.value) })}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs text-white/20 mt-1">
              <span>3本</span><span>10本</span>
            </div>
          </div>
        </div>
      </section>

      <button
        onClick={handleSaveSettings}
        className="w-full py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition"
      >
        {saved ? "✓ 保存しました" : "設定を保存"}
      </button>
    </main>
  );
}
