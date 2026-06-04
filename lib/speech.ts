let currentUtterance: SpeechSynthesisUtterance | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const priorities = ["Sayaka", "Haruka", "Ayumi", "Kyoko"];
  for (const name of priorities) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith("ja")) ?? null;
}

export function speak(text: string, speed: number, onEnd: () => void): void {
  stop();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = speed;
  utter.pitch = 0.55;
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  utter.onend = onEnd;
  utter.onerror = onEnd;
  currentUtterance = utter;
  window.speechSynthesis.speak(utter);
}

export function stop(): void {
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function pause(): void {
  window.speechSynthesis.pause();
}

export function resume(): void {
  window.speechSynthesis.resume();
}
