"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowsMaximize, IconLoader2, IconMaximizeOff, IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const youtubeOrigin = "https://www.youtube-nocookie.com";

type PlayerCommand = "playVideo" | "pauseVideo" | "seekTo" | "getCurrentTime" | "getDuration" | "setPlaybackRate";
type PlaybackRate = 1 | 2;

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
    const parsed = JSON.parse(data) as {
      event?: string;
      info?: { currentTime?: number; duration?: number; playerState?: number; playbackRate?: number };
    };
    return parsed.event === "infoDelivery" ? parsed.info ?? null : null;
  } catch {
    return null;
  }
}

export function StudentVideoPlayer({ videoId, title }: { videoId: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [playerState, setPlayerState] = useState<"idle" | "playing" | "paused">("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      if (info.playbackRate === 1 || info.playbackRate === 2) setPlaybackRate(info.playbackRate);
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    iframeRef.current?.contentWindow?.postMessage(commandMessage("setPlaybackRate", [playbackRate]), youtubeOrigin);
  }, [loaded, playbackRate]);

  const sendCommand = (command: "playVideo" | "pauseVideo") => {
    iframeRef.current?.contentWindow?.postMessage(commandMessage(command), youtubeOrigin);
    setPlayerState(command === "playVideo" ? "playing" : "paused");
  };

  const changePlaybackRate = (rate: PlaybackRate) => {
    setPlaybackRate(rate);
    iframeRef.current?.contentWindow?.postMessage(commandMessage("setPlaybackRate", [rate]), youtubeOrigin);
  };

  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    iframeRef.current?.contentWindow?.postMessage(commandMessage("seekTo", [seconds, true]), youtubeOrigin);
  };

  const toggleFullscreen = async () => {
    const element = containerRef.current;
    if (!element) return;

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch {
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden rounded-md bg-card", isFullscreen && "flex h-screen w-screen flex-col rounded-none bg-black")}
    >
      <div className={cn("relative bg-black", isFullscreen && "min-h-0 flex-1")}>
        <iframe
          ref={iframeRef}
          className={cn("pointer-events-none w-full", isFullscreen ? "h-full" : "aspect-video")}
          src={src}
          title={title}
          tabIndex={-1}
          onLoad={() => setLoaded(true)}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {!loaded ? (
          <div className="absolute inset-0 grid place-items-center bg-black/80 text-white">
            <div className="flex items-center gap-2 text-sm">
              <IconLoader2 className="size-4 animate-spin" />
              Loading video
            </div>
          </div>
        ) : null}
      </div>
      <div className={cn("grid gap-3 border-t border-border/70 bg-card px-3 py-3", isFullscreen && "border-white/10 bg-zinc-950 text-white")}>
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex rounded-sm border border-border/70 bg-background/70 p-0.5">
              {[1, 2].map((rate) => (
                <Button
                  key={rate}
                  type="button"
                  size="sm"
                  variant={playbackRate === rate ? "secondary" : "ghost"}
                  aria-pressed={playbackRate === rate}
                  onClick={() => changePlaybackRate(rate as PlaybackRate)}
                  disabled={!loaded}
                  className="h-7 px-2"
                >
                  {rate}x
                </Button>
              ))}
            </div>
            <Button type="button" onClick={() => sendCommand("playVideo")} disabled={!loaded}>
              <IconPlayerPlay className="size-4" />
              Play
            </Button>
            <Button type="button" variant="outline" onClick={() => sendCommand("pauseVideo")} disabled={!loaded}>
              <IconPlayerPause className="size-4" />
              Pause
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
              disabled={!loaded}
            >
              {isFullscreen ? <IconMaximizeOff className="size-4" /> : <IconArrowsMaximize className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
