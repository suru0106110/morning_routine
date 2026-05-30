import { NextResponse } from "next/server";

type NewsItem = { title: string; summary: string; url: string };

// 日経 → NHK の順で試す（フォールバック構成）
const RSS_FEEDS = [
  {
    url: "https://www.nikkei.com/rss/index.rss",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
      "Accept-Language": "ja,en;q=0.9",
      "Referer": "https://www.nikkei.com/",
    },
  },
  {
    url: "https://www.nikkei.com/rss/marketedit.rss",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
      "Referer": "https://www.nikkei.com/",
    },
  },
  {
    url: "https://www3.nhk.or.jp/rss/news/cat5.xml",
    headers: { "User-Agent": "MorningApp/1.0" },
  },
  {
    url: "https://www3.nhk.or.jp/rss/news/cat1.xml",
    headers: { "User-Agent": "MorningApp/1.0" },
  },
];

function extractCdata(block: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

function parseItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) || [];
  for (const block of blocks.slice(0, 6)) {
    const title = extractCdata(block, "title").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
    const desc = extractCdata(block, "description").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").slice(0, 120).trim();
    const link = extractCdata(block, "link") || extractCdata(block, "guid");
    if (title && title.length > 3) {
      items.push({ title, summary: desc, url: link });
    }
  }
  return items;
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: feed.headers,
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseItems(xml);
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

  // 重複除去
  const seen = new Set<string>();
  const unique = all.filter((n) => {
    if (seen.has(n.title)) return false;
    seen.add(n.title);
    return true;
  });

  return NextResponse.json({ items: unique.slice(0, 10) });
}
