import { NextResponse } from "next/server";

type NewsItem = { title: string; summary: string; url: string };

const RSS_FEEDS = [
  "https://news.google.com/rss/search?q=経済+OR+株式+OR+ビジネス&hl=ja&gl=JP&ceid=JP:ja",
  "https://news.google.com/rss/search?q=日経平均+OR+為替+OR+金融&hl=ja&gl=JP&ceid=JP:ja",
  "https://feeds.reuters.com/reuters/JPBusinessNews",
  "https://www3.nhk.or.jp/rss/news/cat5.xml",
];

const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function extractTag(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"
  );
  return (block.match(re)?.[1] ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function parseXml(xml: string): NewsItem[] {
  const blocks = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const block of blocks.slice(0, 6)) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    if (title.length > 3) items.push({ title, summary: "", url: link });
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

async function summarizeWithGemini(items: NewsItem[]): Promise<NewsItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return items; // APIキー未設定時はタイトルのみ

  const titles = items.map((n, i) => `${i + 1}. ${n.title}`).join("\n");
  const prompt = `あなたは朝のニュースアナウンサーです。以下のニュース見出しを、ラジオの速報まとめ風に、それぞれ2〜3文で自然に読み上げられる要約文にしてください。

ルール：
- 各ニュースを「番号. 要約文」の形式で出力
- 1文目：何が起きたかを端的に
- 2〜3文目：背景や影響を簡潔に
- URLや記号は含めない
- 読み上げやすい自然な日本語で

見出し：
${titles}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      }
    );
    if (!res.ok) return items;

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // 各番号の行を抽出して対応するitemに割り当て
    const lines = text.split(/\n+/);
    const summaries: string[] = [];
    let current = "";
    for (const line of lines) {
      const m = line.match(/^(\d+)[.．、]\s*(.*)/);
      if (m) {
        if (current) summaries.push(current.trim());
        current = m[2];
      } else if (current && line.trim()) {
        current += " " + line.trim();
      }
    }
    if (current) summaries.push(current.trim());

    return items.map((item, i) => ({
      ...item,
      summary: summaries[i] ?? item.title,
    }));
  } catch {
    return items;
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
  }).slice(0, 7);

  const withSummary = await summarizeWithGemini(unique);
  return NextResponse.json({ items: withSummary });
}
