import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not set" });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://morning-routine-liard.vercel.app",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: [{ role: "user", content: "「日経平均が上昇」を1文で要約して" }],
        max_tokens: 100,
      }),
    });
    const json = await res.json();
    return NextResponse.json({ status: res.status, raw: json });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
