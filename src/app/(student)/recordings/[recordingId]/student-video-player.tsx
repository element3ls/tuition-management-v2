"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const youtubeOrigin = "https://www.youtube-nocookie.com";

type PlayerCommand = "playVideo" | "pauseVideo" | "seekTo" | "getCurrentTime" | "getDuration";

function commandMessage(func: PlayerCommand, args: unknown[] = []) {
  return JSON.stringify({ event: "command", func, args });
}

function listeningMessage() {
  return JSON.stringify({ event: "listening" });
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function parsePlayerInfoEvent(data: unknown) {
  if (typeof data !== "string") return null;

  try {
    const parsed = JSON.parse(data) as { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } };
    return parsed.event === "infoDelivery" ? parsed.info ?? null : null;
  } catch {
    return null;
  }
}

export function StudentVideoPlayer({ videoId, title }: { videoId: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [playerState, setPlayerState] = useState<"idle" | "playing" | "paused">("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const src = useMemo(() => {
    const params = new URLSearchParams({
      enablejsapi: "1",
      controls: "0",
      disablekb: "1",
      fs: "0",
      rel: "0",
      modestbranding: "1",
      playsinline: "1"
    });

    return `${youtubeOrigin}/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== youtubeOrigin && event.origin !== "https://www.youtube.com") return;

      const info = parsePlayerInfoEvent(event.data);
      if (!info) return;

      if (typeof info.duration === "number") setDuration(info.duration);
      if (typeof info.currentTime === "number") setCurrentTime(info.currentTime);
      if (info.playerState === 1) setPlayerState("playing");
      if (info.playerState === 2) setPlayerState("paused");
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    iframeRef.current?.contentWindow?.postMessage(listeningMessage(), youtubeOrigin);
    iframeRef.current?.contentWindow?.postMessage(commandMessage("getDuration"), youtubeOrigin);

    const interval = window.setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(listeningMessage(), youtubeOrigin);
      iframeRef.current?.contentWindow?.postMessage(commandMessage("getCurrentTime"), youtubeOrigin);
      iframeRef.current?.contentWindow?.postMessage(commandMessage("getDuration"), youtubeOrigin);
    }, 500);

    return () => window.clearInterval(interval);
  }, [loaded]);

  const sendCommand = (command: "playVideo" | "pauseVideo") => {
    iframeRef.current?.contentWindow?.postMessage(commandMessage(command), youtubeOrigin);
    setPlayerState(command === "playVideo" ? "playing" : "paused");
  };

  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    iframeRef.current?.contentWindow?.postMessage(commandMessage("seekTo", [seconds, true]), youtubeOrigin);
  };

  return (
    <div className="overflow-hidden rounded-md">
      <div className="relative bg-black">
        <iframe
          ref={iframeRef}
          className="pointer-events-none aspect-video w-full"
          src={src}
          title={title}
          tabIndex={-1}
          onLoad={() => setLoaded(true)}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {!loaded ? (
          <div className="absolute inset-0 grid place-items-center bg-black/80 text-white">
            <div className="flex items-center gap-2 text-sm">
              <LoaderCircle className="size-4 animate-spin" />
              Loading video
            </div>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 border-t border-border/70 bg-card px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="w-12 text-xs tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
          <input
            aria-label="Video timeline"
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={Math.min(currentTime, duration || currentTime)}
            disabled={!loaded || duration <= 0}
            onChange={(event) => seekTo(Number(event.target.value))}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {playerState === "playing" ? "Playing" : playerState === "paused" ? "Paused" : "Ready"}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => sendCommand("playVideo")} disabled={!loaded}>
              <Play className="size-4" />
              Play
            </Button>
            <Button type="button" variant="outline" onClick={() => sendCommand("pauseVideo")} disabled={!loaded}>
              <Pause className="size-4" />
              Pause
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
