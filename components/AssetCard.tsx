"use client";

import { useEffect, useState } from "react";
import { getHoldings, type Holding } from "@/lib/storage";

type PriceData = { symbol: string; price: number; prevClose: number; currency: string };

type AssetSummary = {
  totalValue: number;
  totalChange: number;
  totalChangeRate: number;
  holdings: (Holding & { price: number; change: number; changeRate: number })[];
};

export default function AssetCard({ onSummaryReady }: { onSummaryReady: (text: string) => void }) {
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const holdings = getHoldings();
    if (!holdings.length) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: holdings.map((h) => h.symbol) }),
        });
        const { prices }: { prices: PriceData[] } = await res.json();

        const priceMap = new Map(prices.map((p) => [p.symbol, p]));

        let totalValue = 0;
        let totalChange = 0;
        const detailed = holdings.map((h) => {
          const p = priceMap.get(h.symbol);
          const price = p?.price ?? h.avgCost;
          const prevClose = p?.prevClose ?? h.avgCost;
          const change = (price - prevClose) * h.shares;
          const changeRate = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
          totalValue += price * h.shares;
          totalChange += change;
          return { ...h, price, change, changeRate };
        });

        const totalChangeRate = totalValue ? (totalChange / (totalValue - totalChange)) * 100 : 0;
        const result = { totalValue, totalChange, totalChangeRate, holdings: detailed };
        setSummary(result);

        // build TTS text
        const sign = totalChange >= 0 ? "プラス" : "マイナス";
        const absChange = Math.abs(Math.round(totalChange)).toLocaleString();
        const absRate = Math.abs(totalChangeRate).toFixed(2);
        let text = `資産ダイジェストです。本日の資産変動は${sign}${absChange}円、${sign}${absRate}パーセントです。`;
        for (const h of detailed) {
          const s = h.change >= 0 ? "プラス" : "マイナス";
          text += `${h.name}は${s}${Math.abs(h.changeRate).toFixed(1)}パーセント。`;
        }
        onSummaryReady(text);
      } catch {
        setLoading(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [onSummaryReady]);

  const fmt = (n: number) => Math.round(n).toLocaleString("ja-JP");

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/5 p-5 animate-pulse h-28" />
    );
  }

  if (!summary || !summary.holdings.length) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center text-sm text-white/40">
        <p>資産未登録</p>
        <p className="text-xs mt-1">設定から銘柄を追加してください</p>
      </div>
    );
  }

  const isPos = summary.totalChange >= 0;

  return (
    <div className={`rounded-2xl p-5 border ${isPos ? "bg-emerald-950/40 border-emerald-700/30" : "bg-red-950/40 border-red-700/30"}`}>
      <p className="text-xs text-white/40 mb-1">本日の資産変動</p>
      <div className="flex items-baseline gap-3">
        <span className={`text-3xl font-bold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
          {isPos ? "+" : "−"}¥{fmt(Math.abs(summary.totalChange))}
        </span>
        <span className={`text-sm ${isPos ? "text-emerald-500" : "text-red-500"}`}>
          {isPos ? "+" : "-"}{Math.abs(summary.totalChangeRate).toFixed(2)}%
        </span>
      </div>
      <p className="text-xs text-white/30 mt-2">総資産 ¥{fmt(summary.totalValue)}</p>
      <div className="mt-3 space-y-1">
        {summary.holdings.map((h) => (
          <div key={h.id} className="flex justify-between text-xs text-white/50">
            <span>{h.name}</span>
            <span className={h.change >= 0 ? "text-emerald-500" : "text-red-400"}>
              {h.change >= 0 ? "+" : "-"}{Math.abs(h.changeRate).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
