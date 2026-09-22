import { useCallback, useEffect, useRef, useState } from "react";

/** One-shot avatar video; the supplied image stays underneath every frame. */
export default function AvatarVideo({ src, fallbackImage, accessibleLabel, alt, width, height }) {
  const container = useRef(null);
  const video = useRef(null);
  const alive = useRef(false);
  const busy = useRef(false);
  const automaticUsed = useRef(false);
  const frameRequest = useRef(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [state, setState] = useState("loading");
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    alive.current = true;
    const media = video.current;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(query.matches);
      if (query.matches) {
        media.pause();
        busy.current = false;
        setShowVideo(false);
        setState("idle");
      }
    };
    query.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(container.current);
    return () => {
      alive.current = false;
      busy.current = false;
      observer.disconnect();
      query.removeEventListener("change", update);
      if (frameRequest.current !== null) media.cancelVideoFrameCallback?.(frameRequest.current);
      media.pause();
    };
  }, []);

  const play = useCallback(async () => {
    if (!alive.current || busy.current || failed || !ready) return;
    automaticUsed.current = true;
    busy.current = true;
    setState("starting");
    try {
      video.current.currentTime = 0;
      await video.current.play();
    } catch {
      if (!alive.current) return;
      busy.current = false;
      setShowVideo(false);
      setState("blocked");
    }
  }, [failed, ready]);

  useEffect(() => {
    if (visible && ready && !reduced && !failed && !automaticUsed.current) void play();
  }, [visible, ready, reduced, failed, play]);

  const onPlaying = () => {
    setState("playing");
    const reveal = () => {
      if (alive.current && busy.current) setShowVideo(true);
    };
    // Reveal a decoded frame, never the empty video surface during loading.
    if (video.current.requestVideoFrameCallback) {
      frameRequest.current = video.current.requestVideoFrameCallback(reveal);
    } else reveal();
  };

  return (
    <div ref={container} className="avatar-video" data-state={state}
      style={{ "--avatar-ratio": `${width} / ${height}` }}>
      <div className="avatar-video-media">
        <img src={fallbackImage} alt={alt} width={width} height={height}
          aria-hidden={!failed || undefined} decoding="async" fetchPriority="high" />
        {!failed && <video ref={video} src={src} poster={fallbackImage}
          width={width} height={height} muted playsInline preload="auto"
          aria-hidden="true" className={showVideo ? "is-visible" : ""}
          onCanPlay={() => { setReady(true); setState(s => s === "loading" ? "idle" : s); }}
          onPlaying={onPlaying}
          onEnded={() => {
            busy.current = false;
            // The source ends in a relaxed seated pose: retain its final frame.
            setState("ended");
          }}
          onError={() => {
            busy.current = false;
            setShowVideo(false);
            setFailed(true);
            setState("fallback");
          }} />}
      </div>
      {!failed && <button type="button" className="avatar-video-activate"
        aria-label={accessibleLabel} aria-disabled={!ready || state === "starting" || state === "playing"}
        onClick={play} />}
    </div>
  );
}
