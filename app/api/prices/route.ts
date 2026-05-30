import { NextRequest, NextResponse } from "next/server";

type PriceResult = {
  symbol: string;
  price: number;
  prevClose: number;
  currency: string;
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "ja,en;q=0.9",
  "Origin": "https://finance.yahoo.com",
  "Referer": "https://finance.yahoo.com/",
};

async function fetchPrice(symbol: string): Promise<PriceResult | null> {
  // v7 quote endpoint（v8より安定）
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice,regularMarketPreviousClose,currency`;
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const q = json?.quoteResponse?.result?.[0];
    if (!q) throw new Error("no result");
    return {
      symbol,
      price: q.regularMarketPrice ?? 0,
      prevClose: q.regularMarketPreviousClose ?? 0,
      currency: q.currency ?? "JPY",
    };
  } catch {
    // fallback to v8 chart endpoint
    return fetchPriceV8(symbol);
  }
}

async function fetchPriceV8(symbol: string): Promise<PriceResult | null> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  try {
    const res = await fetch(url, {
      headers: HEADERS,
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

// デバッグ用（確認後削除）
export async function GET() {
  const result = await fetchPrice("1475.T");
  return NextResponse.json({ test: result });
}

// 数字のみのシンボルは日本株として .T を補完
function normalizeSymbol(symbol: string): string {
  return /^\d+$/.test(symbol) ? `${symbol}.T` : symbol;
}

export async function POST(req: NextRequest) {
  try {
    const { symbols }: { symbols: string[] } = await req.json();
    if (!symbols?.length) return NextResponse.json({ prices: [] });
    const normalized = symbols.map(normalizeSymbol);
    const results = await Promise.all(normalized.map(fetchPrice));
    const prices = results.filter(Boolean) as PriceResult[];
    // 元のシンボルに戻して返す（クライアント側のマップと一致させる）
    const mapped = prices.map((p, i) => ({ ...p, symbol: symbols[i] }));
    return NextResponse.json({ prices: mapped });
  } catch {
    return NextResponse.json({ prices: [] }, { status: 500 });
  }
}
