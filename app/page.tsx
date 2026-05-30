"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import AssetCard from "@/components/AssetCard";
import MorningPlayer from "@/components/MorningPlayer";

export default function Home() {
  const [assetText, setAssetText] = useState("");

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 10 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは";

  const handleSummaryReady = useCallback((text: string) => {
    setAssetText(text);
  }, []);

  return (
    <main className="min-h-screen px-5 pt-12 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-white/40 text-sm">{greeting}</p>
          <h1 className="text-2xl font-bold mt-0.5">朝のダイジェスト</h1>
        </div>
        <Link
          href="/settings"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
          aria-label="設定"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-white/60">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>

      {/* Asset card */}
      <div className="mb-6">
        <AssetCard onSummaryReady={handleSummaryReady} />
      </div>

      {/* Player */}
      <MorningPlayer assetText={assetText} />
    </main>
  );
}
