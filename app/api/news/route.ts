import { NextResponse } from "next/server";

type NewsItem = { title: string; summary: string; url: string };

const RSS_FEEDS = [
  "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtcGhHZ0pLVWlnQVAB?hl=ja&gl=JP&ceid=JP:ja",
  "https://feeds.reuters.com/reuters/JPBusinessNews",
  "https://www3.nhk.or.jp/rss/news/cat5.xml",
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

function parseXml(xml: string): NewsItem[] {
  const blocks = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const block of blocks.slice(0, 6)) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    const desc = extractTag(block, "description");
    // descriptionから完結した文を抽出
    const summary = cleanSummary(desc);
    if (title.length > 3) items.push({ title, summary, url: link });
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

function cleanSummary(text: string): string {
  const cleaned = text
    .replace(/…+/g, "")      // … (Unicode ellipsis)
    .replace(/\.{2,}/g, "")       // ... (ASCII dots)
    .replace(/　/g, " ")           // 全角スペース
    .replace(/\s+/g, " ")
    .trim();

  const sentences = cleaned
    .split(/。/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  // 文末が自然な日本語で終わっているか（完結した文のみ使う）
  const isComplete = (s: string) =>
    /(?:した|します|ました|ません|でした|ます|です|される|された|している|していた|おり|あり|なり|という|ています|ていた|見込み|予定|方針)$/.test(s);

  const complete = sentences.filter(isComplete);
  if (complete.length === 0) return "";
  return complete.slice(0, 2).join("。") + "。";
}

export async function GET() {
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  const seen = new Set<string>();
  const unique = all.filter((n) => {
    if (seen.has(n.title)) return false;
    seen.add(n.title);
    if (NOISE_PATTERNS.some((p) => p.test(n.title))) return false;
    if (n.title.length < 10) return false;
    return true;
  }).slice(0, 7);

  return NextResponse.json({ items: unique });
}
