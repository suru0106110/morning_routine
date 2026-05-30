import { NextRequest, NextResponse } from "next/server";

type PriceResult = {
  symbol: string;
  price: number;
  prevClose: number;
  currency: string;
};

async function fetchPrice(symbol: string): Promise<PriceResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      symbol,
      price: meta.regularMarketPrice ?? 0,
      prevClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
      currency: meta.currency ?? "JPY",
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { symbols }: { symbols: string[] } = await req.json();
    if (!symbols?.length) return NextResponse.json({ prices: [] });

    const results = await Promise.all(symbols.map(fetchPrice));
    const prices = results.filter(Boolean) as PriceResult[];
    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json({ prices: [] }, { status: 500 });
  }
}
