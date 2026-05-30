import { NextResponse } from "next/server";

type NewsItem = { title: string; summary: string; url: string };

const RSS_FEEDS = [
  // Google ニュース（日本・経済） - サーバーからの取得に強い
  "https://news.google.com/rss/search?q=経済+OR+株式+OR+ビジネス&hl=ja&gl=JP&ceid=JP:ja",
  "https://news.google.com/rss/search?q=日経平均+OR+為替+OR+金融&hl=ja&gl=JP&ceid=JP:ja",
  // Reuters Japan
  "https://feeds.reuters.com/reuters/JPBusinessNews",
  // NHK
  "https://www3.nhk.or.jp/rss/news/cat5.xml",
];

const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function extractTag(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i"
  );
  return (block.match(re)?.[1] ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseXml(xml: string): NewsItem[] {
  const blocks = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const block of blocks.slice(0, 6)) {
    const title = extractTag(block, "title");
    const desc = extractTag(block, "description").slice(0, 120);
    const link = extractTag(block, "link") || extractTag(block, "guid");
    if (title.length > 3) items.push({ title, summary: desc, url: link });
  }
  return items;
}

async function fetchFeed(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml,application/xml,text/xml,*/*" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    return parseXml(await res.text());
  } catch {
    return [];
  }
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
    return true;
  });

  return NextResponse.json({ items: unique.slice(0, 10) });
}
