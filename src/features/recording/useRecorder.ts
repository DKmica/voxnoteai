import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "paused";

type RecorderState = {
  status: RecorderStatus;
  elapsedMs: number;
  autoPauseOnSilence: boolean;
  supportsPause: boolean;
  level: number; // 0..1
  error?: string;
};

type RecorderControls = {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<Blob>;
  setAutoPauseOnSilence: (v: boolean) => void;
};

const SILENCE_THRESHOLD = 0.02;
const SILENCE_HOLD_MS = 1400;

function rmsFromTimeDomain(bytes: Uint8Array) {
  let sumSq = 0;
  for (let i = 0; i < bytes.length; i++) {
    const v = (bytes[i] - 128) / 128;
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / bytes.length);
}

export function useRecorder(): RecorderState & RecorderControls {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [autoPauseOnSilence, setAutoPauseOnSilence] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startedAtRef = useRef<number>(0);
  const pausedAccumulatedRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceSinceRef = useRef<number | null>(null);
  const pausedBySilenceRef = useRef<boolean>(false);

  const supportsPause = useMemo(() => {
    return typeof MediaRecorder !== "undefined" && "pause" in MediaRecorder.prototype;
  }, []);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];
    silenceSinceRef.current = null;
    pausedBySilenceRef.current = false;
    pausedAtRef.current = null;
    pausedAccumulatedRef.current = 0;
    startedAtRef.current = 0;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const tick = useCallback(() => {
    const now = performance.now();

    if (startedAtRef.current) {
      const pausedExtra = pausedAtRef.current ? now - pausedAtRef.current : 0;
      const elapsed = now - startedAtRef.current - pausedAccumulatedRef.current - pausedExtra;
      setElapsedMs(Math.max(0, Math.floor(elapsed)));
    }

    const analyser = analyserRef.current;
    if (analyser) {
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      const rms = rmsFromTimeDomain(data);
      setLevel(rms);

      if (autoPauseOnSilence && supportsPause) {
        const isSilent = rms < SILENCE_THRESHOLD;
        const t = performance.now();

        if (status === "recording") {
          if (isSilent) {
            silenceSinceRef.current ??= t;
            if (t - (silenceSinceRef.current ?? t) >= SILENCE_HOLD_MS) {
              try {
                mediaRecorderRef.current?.pause();
                pausedBySilenceRef.current = true;
                pausedAtRef.current = performance.now();
                setStatus("paused");
              } catch {
                // ignore
              }
              silenceSinceRef.current = null;
            }
          } else {
            silenceSinceRef.current = null;
          }
        } else if (status === "paused" && pausedBySilenceRef.current) {
          if (!isSilent) {
            try {
              mediaRecorderRef.current?.resume();
              pausedBySilenceRef.current = false;
              if (pausedAtRef.current) {
                pausedAccumulatedRef.current += performance.now() - pausedAtRef.current;
                pausedAtRef.current = null;
              }
              setStatus("recording");
            } catch {
              // ignore
            }
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [autoPauseOnSilence, status, supportsPause]);

  const start = useCallback(async () => {
    setError(undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(250);

      // Waveform + silence detection
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      startedAtRef.current = performance.now();
      pausedAccumulatedRef.current = 0;
      pausedAtRef.current = null;
      setElapsedMs(0);
      setStatus("recording");

      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setError("Microphone permission was denied or unavailable.");
      cleanup();
      setStatus("idle");
    }
  }, [cleanup, tick]);

  const pause = useCallback(() => {
    if (!supportsPause) return;
    if (status !== "recording") return;
    pausedBySilenceRef.current = false;
    pausedAtRef.current = performance.now();
    try {
      mediaRecorderRef.current?.pause();
      setStatus("paused");
    } catch {
      // ignore
    }
  }, [status, supportsPause]);

  const resume = useCallback(() => {
    if (!supportsPause) return;
    if (status !== "paused") return;
    pausedBySilenceRef.current = false;
    try {
      mediaRecorderRef.current?.resume();
      if (pausedAtRef.current) {
        pausedAccumulatedRef.current += performance.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      setStatus("recording");
    } catch {
      // ignore
    }
  }, [status, supportsPause]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return Promise.reject(new Error("not recording"));

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setStatus("idle");
        cleanup();
        resolve(blob);
      };
      try {
        recorder.stop();
      } catch {
        // Best effort
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setStatus("idle");
        cleanup();
        resolve(blob);
      }
    });
  }, [cleanup]);

  return {
    status,
    elapsedMs,
    autoPauseOnSilence,
    supportsPause,
    level,
    error,
    start,
    pause,
    resume,
    stop,
    setAutoPauseOnSilence,
  };
}
