"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSettings } from "@/lib/storage";
import { speak, stop, pause, resume } from "@/lib/speech";

type NewsItem = { title: string; summary: string; url: string };

type Props = {
  assetText: string;
};

type Status = "idle" | "playing" | "paused" | "done";

export default function MorningPlayer({ assetText }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = asset intro
  const [loadingNews, setLoadingNews] = useState(false);
  const settings = useRef(getSettings());
  const queue = useRef<string[]>([]);
  const queueIndex = useRef(0);
  const isStopped = useRef(false);

  const fetchNews = useCallback(async () => {
    setLoadingNews(true);
    try {
      const res = await fetch("/api/news");
      const { items }: { items: NewsItem[] } = await res.json();
      setNews(items.slice(0, settings.current.newsCount));
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    settings.current = getSettings();
  }, [fetchNews]);

  const buildQueue = useCallback(
    (items: NewsItem[]): string[] => {
      const q: string[] = [];
      if (assetText) q.push(assetText);
      items.forEach((n, i) => {
        const text = n.summary ? `${i + 1}本目。${n.summary}` : `${i + 1}本目。${n.title}。`;
        q.push(text);
      });
      q.push("以上です。");
      return q;
    },
    [assetText]
  );

  const playNext = useCallback(() => {
    if (isStopped.current) return;
    if (queueIndex.current >= queue.current.length) {
      setStatus("done");
      setCurrentIndex(queue.current.length);
      return;
    }
    const text = queue.current[queueIndex.current];
    // map queueIndex to news index (queue[0]=greeting, queue[1]=asset, queue[2]=intro, queue[3+]=news)
    const newsOffset = assetText ? 3 : 2;
    const ni = queueIndex.current - newsOffset;
    setCurrentIndex(ni);
    queueIndex.current++;
    speak(text, settings.current.speed, playNext);
  }, [assetText]);

  const handleStart = useCallback(() => {
    isStopped.current = false;
    queue.current = buildQueue(news);
    queueIndex.current = 0;
    setStatus("playing");
    playNext();
  }, [buildQueue, news, playNext]);

  const handlePause = useCallback(() => {
    pause();
    setStatus("paused");
  }, []);

  const handleResume = useCallback(() => {
    resume();
    setStatus("playing");
  }, []);

  const handleStop = useCallback(() => {
    isStopped.current = true;
    stop();
    setStatus("idle");
    setCurrentIndex(-1);
    queueIndex.current = 0;
  }, []);

  const handleSkip = useCallback(() => {
    stop();
    playNext();
  }, [playNext]);

  const currentNews = currentIndex >= 0 && currentIndex < news.length ? news[currentIndex] : null;
  const progress = news.length > 0 ? Math.max(0, Math.min(100, (currentIndex / news.length) * 100)) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Now playing card */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 min-h-[100px] flex flex-col justify-center">
        {status === "idle" && (
          <p className="text-white/30 text-sm text-center">STARTで読み上げ開始</p>
        )}
        {status === "done" && (
          <p className="text-emerald-400 text-sm text-center">✓ ダイジェスト完了！</p>
        )}
        {(status === "playing" || status === "paused") && (
          <>
            {currentIndex < 0 ? (
              <p className="text-white/60 text-sm">資産ダイジェスト読み上げ中...</p>
            ) : currentNews ? (
              <>
                <p className="text-xs text-white/30 mb-1">{currentIndex + 1} / {news.length} 本目</p>
                <p className="text-white text-sm leading-relaxed font-medium">{currentNews.title}</p>
                {currentNews.summary && (
                  <p className="text-white/50 text-xs mt-2 leading-relaxed">{currentNews.summary}</p>
                )}
              </>
            ) : (
              <p className="text-white/60 text-sm">読み上げ中...</p>
            )}
          </>
        )}
      </div>

      {/* Progress bar */}
      {(status === "playing" || status === "paused") && news.length > 0 && (
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-white/50 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {status === "idle" || status === "done" ? (
          <button
            onClick={handleStart}
            disabled={loadingNews || news.length === 0}
            className="w-20 h-20 rounded-full bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95"
          >
            {loadingNews ? "読込中" : "START"}
          </button>
        ) : (
          <>
            <button
              onClick={handleStop}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition active:scale-95"
              aria-label="停止"
            >
              <StopIcon />
            </button>

            {status === "playing" ? (
              <button
                onClick={handlePause}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition active:scale-95"
                aria-label="一時停止"
              >
                <PauseIcon />
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition active:scale-95"
                aria-label="再生"
              >
                <PlayIcon />
              </button>
            )}

            <button
              onClick={handleSkip}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition active:scale-95"
              aria-label="スキップ"
            >
              <SkipIcon />
            </button>
          </>
        )}
      </div>

      {/* News list preview */}
      {news.length > 0 && (
        <div className="space-y-1">
          {news.map((n, i) => (
            <div
              key={i}
              className={`px-3 py-2 rounded-xl text-xs transition ${
                i === currentIndex
                  ? "bg-white/15 text-white"
                  : i < currentIndex
                  ? "text-white/20 line-through"
                  : "text-white/40"
              }`}
            >
              <span className="mr-2 text-white/20">{i + 1}</span>
              {n.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}
function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
    </svg>
  );
}
