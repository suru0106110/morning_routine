import { NextRequest, NextResponse } from "next/server";

function pcmToWav(pcmBuffer: Buffer, sampleRate: number, channels: number): Buffer {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no key" }, { status: 500 });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
            },
          },
        }),
      }
    );

    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part?.data) return NextResponse.json({ error: "no audio" }, { status: 500 });

    const pcm = Buffer.from(part.data, "base64");
    const rateMatch = part.mimeType?.match(/rate=(\d+)/);
    const chMatch = part.mimeType?.match(/channels=(\d+)/);
    const wav = pcmToWav(pcm, rateMatch ? parseInt(rateMatch[1]) : 24000, chMatch ? parseInt(chMatch[1]) : 1);

    return new NextResponse(new Uint8Array(wav), {
      headers: { "Content-Type": "audio/wav", "Content-Length": String(wav.length) },
    });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
