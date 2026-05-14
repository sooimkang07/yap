import React, { useEffect, useRef } from 'https://esm.sh/react@18.3.1';
import {
  applyPrismWaveFrame,
  collectPrismPathCache,
  createPrismSvgShellHTML,
  prismBandsFromVizAudio,
} from '../../js/core/prism-paths.js';
import { vizAnalysisInput } from './viz-input.js';

const h = React.createElement;

function lerp(from, to, alpha) {
  return from + (to - from) * alpha;
}

/** Mic-driven prism; `isRecording` only from React — levels read from `vizAnalysisInput` each frame. */
export function VoiceVisualizer({ isRecording }) {
  const hostRef = useRef(null);
  const cacheRef = useRef(null);
  const motionRef = useRef(0);
  const smoothRef = useRef({
    envelope: 0.18,
    bass: 0,
    mid: 0,
    high: 0,
    attack: 0,
    wake: 0,
  });
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const recRef = useRef(isRecording);
  recRef.current = isRecording;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = createPrismSvgShellHTML('vv-prism', { branchesOnly: true });
    cacheRef.current = collectPrismPathCache(host.firstElementChild, 'vv-prism', { branchesOnly: true });

    const loop = time => {
      if (!lastFrameRef.current) lastFrameRef.current = time;
      const deltaMs = Math.min(32, time - lastFrameRef.current);
      lastFrameRef.current = time;
      motionRef.current += deltaMs;

      const rec = recRef.current;
      const an = vizAnalysisInput;
      const s = smoothRef.current;
      if (rec) {
        s.wake = lerp(s.wake, 1, 0.08);
        s.envelope = lerp(
          s.envelope,
          Math.max(0.12, an.envelope || 0),
          (an.envelope || 0) > s.envelope ? 0.55 : 0.12,
        );
        s.bass = lerp(s.bass, an.bass || 0, (an.bass || 0) > s.bass ? 0.38 : 0.14);
        s.mid = lerp(s.mid, an.mid || 0, (an.mid || 0) > s.mid ? 0.34 : 0.14);
        s.high = lerp(s.high, an.high || 0, (an.high || 0) > s.high ? 0.38 : 0.14);
        s.attack = lerp(s.attack, an.attack || 0, (an.attack || 0) > s.attack ? 0.48 : 0.14);
      } else {
        s.wake = lerp(s.wake, 0, 0.06);
        s.envelope = lerp(s.envelope, 0.2, 0.05);
        s.bass = lerp(s.bass, 0.12, 0.05);
        s.mid = lerp(s.mid, 0.1, 0.05);
        s.high = lerp(s.high, 0.1, 0.05);
        s.attack = lerp(s.attack, 0, 0.08);
      }

      const cache = cacheRef.current;
      if (cache) {
        applyPrismWaveFrame(cache, prismBandsFromVizAudio(s), motionRef.current * 0.001, 'vv-prism', {
          branchesOnly: true,
          wavelength: true,
          viz: s,
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      cacheRef.current = null;
    };
  }, []);

  return h(
    'div',
    { className: 'voice-visualizer voice-visualizer--embedded' },
    h('div', {
      ref: hostRef,
      className: 'voice-visualizer__prism-host',
      'aria-hidden': 'true',
    }),
  );
}
