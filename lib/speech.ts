let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

function cleanup() {
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

export async function speak(text: string, _speed: number, onEnd: () => void): Promise<void> {
  cleanup();
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) { onEnd(); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentObjectUrl = url;
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => { cleanup(); onEnd(); };
    audio.onerror = () => { cleanup(); onEnd(); };
    await audio.play();
  } catch {
    cleanup();
    onEnd();
  }
}

export function stop(): void {
  cleanup();
}

export function pause(): void {
  currentAudio?.pause();
}

export function resume(): void {
  currentAudio?.play();
}
