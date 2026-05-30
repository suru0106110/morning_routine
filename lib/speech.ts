let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, speed: number, onEnd: () => void): void {
  stop();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = speed;
  utter.pitch = 0.55;

  // prefer Japanese voice if available
  const voices = window.speechSynthesis.getVoices();
  const priorities = ["Sayaka", "Haruka", "Ayumi", "Kyoko"];
  let jaVoice = null;
  for (const p of priorities) {
    jaVoice = voices.find((v) => v.name.includes(p)) ?? null;
    if (jaVoice) break;
  }
  if (!jaVoice) jaVoice = voices.find((v) => v.lang.startsWith("ja")) ?? null;
  if (jaVoice) utter.voice = jaVoice;

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
