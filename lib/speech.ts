let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, speed: number, onEnd: () => void): void {
  stop();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = speed;
  utter.pitch = 1.0;

  // prefer Japanese voice if available
  const voices = window.speechSynthesis.getVoices();
  const jaVoice = voices.find((v) => v.lang.startsWith("ja"));
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
