import { NextRequest, NextResponse } from "next/server";

type NewsItem = { title: string; summary: string; url: string; pubDate?: number };

const NHK = "https://news.web.nhk/n-data/conf/na/rss";

const CATEGORY_FEEDS: Record<string, string[]> = {
  economy: [
    `${NHK}/cat5.xml`,
    "https://feeds.reuters.com/reuters/JPBusinessNews",
    "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtcGhHZ0pLVWlnQVAB?hl=ja&gl=JP&ceid=JP:ja",
  ],
  tech: [
    `${NHK}/cat3.xml`,
    "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",
    "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREp0YjNNU0FtcGhHZ0pLVWlnQVAB?hl=ja&gl=JP&ceid=JP:ja",
  ],
  world: [
    `${NHK}/cat6.xml`,
    "https://feeds.reuters.com/Reuters/worldNews",
    "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtcGhHZ0pLVWlnQVAB?hl=ja&gl=JP&ceid=JP:ja",
  ],
  politics: [
    `${NHK}/cat4.xml`,
    "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtcGhHZ0pLVWlnQVAB?hl=ja&gl=JP&ceid=JP:ja",
  ],
  sports: [
    `${NHK}/cat7.xml`,
    "https://news.google.com/rss/search?q=スポーツ+野球+サッカー&hl=ja&gl=JP&ceid=JP:ja",
  ],
  entertainment: [
    `${NHK}/cat2.xml`,
    "https://news.google.com/rss/search?q=炎上+スキャンダル+話題&hl=ja&gl=JP&ceid=JP:ja",
  ],
};

// デフォルト：NHK総合＋経済＋国際
const DEFAULT_FEEDS = [
  `${NHK}/cat0.xml`,
  `${NHK}/cat5.xml`,
  `${NHK}/cat6.xml`,
  "https://feeds.reuters.com/reuters/JPBusinessNews",
];

const NOISE_PATTERNS = [
  /基準価格/, /投資信託情報/, /株価情報/,
  /【\d{7}[A-Z]?】/, /yahoo.*ファイナンス/i, /みんかぶ/, /株探/,
];

const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  return (block.match(re)?.[1] ?? "")
    .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function cleanSummary(text: string): string {
  const cleaned = text
    .replace(/…+/g, "").replace(/\.{2,}/g, "")
    .replace(/　/g, " ").replace(/\s+/g, " ").trim();

  const sentences = cleaned.split(/。/).map(s => s.trim()).filter(s => s.length > 10);
  const isComplete = (s: string) =>
    /(?:した|します|ました|ません|でした|ます|です|される|された|している|していた|おり|あり|なり|という|ています|ていた|見込み|予定|方針)$/.test(s);

  const complete = sentences.filter(isComplete);
  if (complete.length === 0) return "";
  return complete.slice(0, 2).join("。") + "。";
}

function parseXml(xml: string): NewsItem[] {
  const blocks = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  const now = Date.now();
  const cutoff = now - 48 * 60 * 60 * 1000; // 48時間以内

  for (const block of blocks.slice(0, 10)) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    const desc = extractTag(block, "description");
    const pubDateStr = extractTag(block, "pubDate");

    // 日付フィルター（pubDateがある場合は24時間以内のみ）
    if (pubDateStr) {
      const pubDate = new Date(pubDateStr).getTime();
      if (!isNaN(pubDate) && pubDate < cutoff) continue;
    }

    const summary = cleanSummary(desc);
    const pubDate = new Date(pubDateStr).getTime();
    if (title.length > 3) items.push({ title, summary, url: link, pubDate: isNaN(pubDate) ? undefined : pubDate });
  }
  return items;
}

async function fetchFeed(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml,application/xml,text/xml,*/*" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return parseXml(await res.text());
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categories = searchParams.get("categories")?.split(",").filter(Boolean) ?? [];
  const keywords = searchParams.get("keywords")?.split(",").filter(Boolean) ?? [];
  const count = parseInt(searchParams.get("count") ?? "7");

  const feedUrls = categories.length > 0
    ? Array.from(new Set(categories.flatMap(c => CATEGORY_FEEDS[c] ?? [])))
    : DEFAULT_FEEDS;

  const results = await Promise.allSettled(feedUrls.map(fetchFeed));
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  const seen = new Set<string>();
  let unique = all.filter((n) => {
    if (seen.has(n.title)) return false;
    seen.add(n.title);
    if (NOISE_PATTERNS.some((p) => p.test(n.title))) return false;
    if (n.title.length < 10) return false;
    return true;
  });

  if (keywords.length > 0) {
    unique = unique.filter(n =>
      keywords.some(kw => n.title.includes(kw) || n.summary.includes(kw))
    );
  }

  // 新しい順にソート
  unique.sort((a, b) => (b.pubDate ?? 0) - (a.pubDate ?? 0));

  return NextResponse.json(
    { items: unique.slice(0, count) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
