import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" });
  }

  // Gemini に簡単なテストリクエスト
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "「日経平均が上昇した」を1文で要約して" }] }],
        }),
      }
    );
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "no text";
    return NextResponse.json({ ok: true, keyPrefix: apiKey.slice(0, 8) + "...", result: text });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
