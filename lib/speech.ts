let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let currentUtter: SpeechSynthesisUtterance | null = null;

function cleanupAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function cleanupSpeech() {
  window.speechSynthesis.cancel();
  currentUtter = null;
}

// Web Speech API フォールバック（Sayaka）
function speakFallback(text: string, speed: number, onEnd: () => void) {
  cleanupSpeech();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = speed;
  utter.pitch = 0.55;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ["Sayaka", "Haruka", "Ayumi", "Kyoko"];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name));
    if (v) { utter.voice = v; break; }
  }
  utter.onend = onEnd;
  utter.onerror = onEnd;
  currentUtter = utter;
  window.speechSynthesis.speak(utter);
}

export async function speak(text: string, speed: number, onEnd: () => void): Promise<void> {
  cleanupAudio();
  cleanupSpeech();

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      // TTS API失敗 → Web Speech APIにフォールバック
      speakFallback(text, speed, onEnd);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentObjectUrl = url;
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => { cleanupAudio(); onEnd(); };
    audio.onerror = () => {
      cleanupAudio();
      // 再生エラー → フォールバック
      speakFallback(text, speed, onEnd);
    };
    await audio.play();
  } catch {
    cleanupAudio();
    // 例外 → フォールバック
    speakFallback(text, speed, onEnd);
  }
}

export function stop(): void {
  cleanupAudio();
  cleanupSpeech();
}

export function pause(): void {
  currentAudio?.pause();
  window.speechSynthesis.pause();
}

export function resume(): void {
  currentAudio?.play();
  window.speechSynthesis.resume();
}
