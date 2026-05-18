"use client";

import { useMemo, useRef, useState } from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const youtubeOrigin = "https://www.youtube-nocookie.com";

function commandMessage(func: "playVideo" | "pauseVideo") {
  return JSON.stringify({ event: "command", func, args: [] });
}

export function StudentVideoPlayer({ videoId, title }: { videoId: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [playerState, setPlayerState] = useState<"idle" | "playing" | "paused">("idle");

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

  const sendCommand = (command: "playVideo" | "pauseVideo") => {
    iframeRef.current?.contentWindow?.postMessage(commandMessage(command), youtubeOrigin);
    setPlayerState(command === "playVideo" ? "playing" : "paused");
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
      <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-card px-3 py-3">
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
  );
}
