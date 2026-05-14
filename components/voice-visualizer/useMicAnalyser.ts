import { useEffect, useRef, useState } from 'react';

export type MicPermissionState =
  | 'idle'
  | 'prompting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error';

export type MicAnalysis = {
  permission: MicPermissionState;
  error: string | null;
  ready: boolean;
  amplitude: number;
  envelope: number;
  bass: number;
  mid: number;
  high: number;
  attack: number;
  decay: number;
  speaking: number;
};

type UseMicAnalyserOptions = {
  enabled: boolean;
  fftSize?: number;
  smoothingTimeConstant?: number;
  attackSmoothing?: number;
  releaseSmoothing?: number;
};

const INITIAL_ANALYSIS: MicAnalysis = {
  permission: 'idle',
  error: null,
  ready: false,
  amplitude: 0,
  envelope: 0,
  bass: 0,
  mid: 0,
  high: 0,
  attack: 0,
  decay: 0,
  speaking: 0,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const lerp = (from: number, to: number, alpha: number) => from + (to - from) * alpha;

const averageRange = (data: Uint8Array, start: number, end: number) => {
  let sum = 0;
  let count = 0;
  const safeEnd = Math.min(end, data.length - 1);
  for (let i = start; i <= safeEnd; i++) {
    sum += data[i] ?? 0;
    count += 1;
  }
  return count ? sum / count / 255 : 0;
};

export function useMicAnalyser({
  enabled,
  fftSize = 1024,
  smoothingTimeConstant = 0.82,
  attackSmoothing = 0.22,
  releaseSmoothing = 0.055,
}: UseMicAnalyserOptions): MicAnalysis {
  const [analysis, setAnalysis] = useState<MicAnalysis>(INITIAL_ANALYSIS);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);
  const smoothedRef = useRef({
    amplitude: 0,
    envelope: 0,
    bass: 0,
    mid: 0,
    high: 0,
    attack: 0,
    decay: 0,
    speaking: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const stopLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const releaseAudio = async () => {
      stopLoop();
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      streamRef.current?.getTracks().forEach(track => track.stop());
      sourceRef.current = null;
      analyserRef.current = null;
      streamRef.current = null;
      freqDataRef.current = null;
      timeDataRef.current = null;

      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch {
          // Ignore close failures on teardown.
        }
        audioContextRef.current = null;
      }
    };

    const startLoop = () => {
      const tick = () => {
        const analyser = analyserRef.current;
        const freqData = freqDataRef.current;
        const timeData = timeDataRef.current;

        if (!analyser || !freqData || !timeData) return;

        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        let rms = 0;
        for (let i = 0; i < timeData.length; i += 1) {
          const normalized = (timeData[i] - 128) / 128;
          rms += normalized * normalized;
        }
        rms = Math.sqrt(rms / timeData.length);

        const amplitude = clamp01(rms * 3.6);
        const bass = averageRange(freqData, 2, 16);
        const mid = averageRange(freqData, 17, 72);
        const high = averageRange(freqData, 73, 180);

        const prev = smoothedRef.current;
        const envAlpha = amplitude > prev.envelope ? attackSmoothing : releaseSmoothing;
        const nextEnvelope = lerp(prev.envelope, amplitude, envAlpha);
        const nextAttack = lerp(prev.attack, Math.max(0, amplitude - prev.envelope) * 6, 0.18);
        const nextDecay = lerp(prev.decay, Math.max(0, prev.envelope - amplitude) * 4.5, 0.12);
        const nextBass = lerp(prev.bass, bass, 0.12);
        const nextMid = lerp(prev.mid, mid, 0.12);
        const nextHigh = lerp(prev.high, high, 0.14);
        const speakingTarget = clamp01(nextEnvelope * 1.35 + nextAttack * 0.6);
        const nextSpeaking = lerp(prev.speaking, speakingTarget, speakingTarget > prev.speaking ? 0.18 : 0.05);

        smoothedRef.current = {
          amplitude: lerp(prev.amplitude, amplitude, 0.2),
          envelope: nextEnvelope,
          bass: nextBass,
          mid: nextMid,
          high: nextHigh,
          attack: nextAttack,
          decay: nextDecay,
          speaking: nextSpeaking,
        };

        setAnalysis({
          permission: 'granted',
          error: null,
          ready: true,
          ...smoothedRef.current,
        });

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const decayLoop = () => {
      const tick = () => {
        const prev = smoothedRef.current;
        const next = {
          amplitude: lerp(prev.amplitude, 0, 0.14),
          envelope: lerp(prev.envelope, 0, 0.08),
          bass: lerp(prev.bass, 0, 0.08),
          mid: lerp(prev.mid, 0, 0.08),
          high: lerp(prev.high, 0, 0.08),
          attack: lerp(prev.attack, 0, 0.16),
          decay: lerp(prev.decay, 0, 0.12),
          speaking: lerp(prev.speaking, 0, 0.07),
        };

        smoothedRef.current = next;
        setAnalysis(current => ({
          ...current,
          ready: current.permission === 'granted',
          ...next,
        }));

        const hasEnergy = Object.values(next).some(value => value > 0.002);
        if (hasEnergy) rafRef.current = requestAnimationFrame(tick);
        else rafRef.current = null;
      };

      stopLoop();
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      if (!enabled) {
        decayLoop();
        await releaseAudio();
        return;
      }

      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        setAnalysis(current => ({
          ...current,
          permission: 'unsupported',
          error: 'Microphone input is not supported in this browser.',
        }));
        return;
      }

      if (!window.isSecureContext) {
        setAnalysis(current => ({
          ...current,
          permission: 'denied',
          error:
            'Microphone requires a secure page (https:// or http://localhost). Open yap from a secure URL.',
        }));
        return;
      }

      setAnalysis(current => ({
        ...current,
        permission: 'prompting',
        error: null,
      }));

      try {
        let stream = null;
        const attempts = [
          { audio: true },
          { video: false, audio: true },
          { audio: {} },
          { audio: { channelCount: 1 } },
          { audio: { channelCount: { ideal: 1 } } },
          {
            audio: {
              echoCancellation: { ideal: true },
              noiseSuppression: { ideal: true },
              autoGainControl: { ideal: true },
            },
          },
          {
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          },
        ];
        let lastErr: unknown = null;
        const recoverable = (name: string) =>
          name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'AbortError';

        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (error) {
            lastErr = error;
            const name = error instanceof DOMException ? error.name : '';
            if (!recoverable(name)) {
              throw error;
            }
          }
        }
        if (!stream) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            for (const d of inputs) {
              if (!d.deviceId) continue;
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  audio: { deviceId: { ideal: d.deviceId } },
                });
                break;
              } catch (error) {
                lastErr = error;
                const name = error instanceof DOMException ? error.name : '';
                if (!recoverable(name)) throw error;
              }
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  audio: { deviceId: { exact: d.deviceId } },
                });
                break;
              } catch (error) {
                lastErr = error;
                const name = error instanceof DOMException ? error.name : '';
                if (!recoverable(name)) throw error;
              }
            }
            if (!stream && inputs.length > 0) {
              try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              } catch (error) {
                lastErr = error;
              }
            }
          } catch (error) {
            lastErr = error;
            const name = error instanceof DOMException ? error.name : '';
            if (name && !recoverable(name)) throw error;
          }
        }
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (error) {
            lastErr = error;
          }
        }
        if (!stream) {
          throw lastErr instanceof Error ? lastErr : new Error('No microphone input is available.');
        }

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const AudioContextCtor =
          window.AudioContext ||
          // @ts-expect-error webkitAudioContext is still needed on iOS Safari.
          window.webkitAudioContext;

        const context = new AudioContextCtor();
        const analyser = context.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;

        const source = context.createMediaStreamSource(stream);
        source.connect(analyser);

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const timeData = new Uint8Array(analyser.fftSize);

        audioContextRef.current = context;
        analyserRef.current = analyser;
        sourceRef.current = source;
        streamRef.current = stream;
        freqDataRef.current = freqData;
        timeDataRef.current = timeData;

        startLoop();
      } catch (error) {
        const name = error instanceof DOMException ? error.name : '';
        const denied = name === 'NotAllowedError' || name === 'SecurityError';
        setAnalysis(current => ({
          ...current,
          permission: denied ? 'denied' : 'error',
          error: denied
            ? 'Microphone access was denied.'
            : error instanceof Error
              ? error.message
              : 'Unable to initialize microphone input.',
        }));
      }
    };

    void start();

    return () => {
      cancelled = true;
      void releaseAudio();
    };
  }, [
    attackSmoothing,
    enabled,
    fftSize,
    releaseSmoothing,
    smoothingTimeConstant,
  ]);

  return analysis;
}
