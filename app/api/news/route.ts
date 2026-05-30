import { NextResponse } from "next/server";

type NewsItem = { title: string; summary: string; url: string };

const RSS_FEEDS = [
  "https://www.nikkei.com/rss/index.rss",         // 日経 トップ
  "https://www.nikkei.com/rss/marketedit.rss",    // 日経 マーケット
  "https://www3.nhk.or.jp/rss/news/cat5.xml",    // NHK 経済（補完）
];

function extractText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

async function parseFeed(url: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "MorningApp/1.0" },
    next: { revalidate: 600 },
  });
  if (!res.ok) return [];
  const xml = await res.text();

  const items: NewsItem[] = [];
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  for (const block of itemBlocks.slice(0, 5)) {
    const title = extractText(block, "title");
    const desc = extractText(block, "description");
    const link = extractText(block, "link");
    if (title) {
      const summary = desc.replace(/<[^>]+>/g, "").slice(0, 120);
      items.push({ title, summary, url: link });
    }
  }
  return items;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(RSS_FEEDS.map(parseFeed));
    const all: NewsItem[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") all.push(...r.value);
    }
    // dedupe by title
    const seen = new Set<string>();
    const unique = all.filter((n) => {
      if (seen.has(n.title)) return false;
      seen.add(n.title);
      return true;
    });
    return NextResponse.json({ items: unique.slice(0, 10) });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
