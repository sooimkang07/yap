import {
  applyPrismWaveFrame,
  collectPrismPathCache,
  createPrismSvgShellHTML,
  prismBandsFromVizAudio,
} from '../../js/core/prism-paths.js';
import { resetVizAnalysisInput, vizAnalysisInput } from './viz-input.js';

const mountEl = document.getElementById('voice-visualizer-root');

if (mountEl) {
  const initialAnalysis = {
    amplitude: 0,
    envelope: 0,
    bass: 0,
    mid: 0,
    high: 0,
    attack: 0,
    decay: 0,
    speaking: 0,
  };

  const state = {
    isRecording: false,
    analysis: { ...initialAnalysis },
  };

  let reactBridge = null;
  let rafId = 0;
  let useReactVisualizer = false;

  mountEl.innerHTML = `
    <div class="voice-visualizer-fallback" aria-hidden="true">
      <div class="vv-prism-mount"></div>
    </div>
    <div class="voice-visualizer-react-root"></div>
  `;

  const fallbackEl = mountEl.querySelector('.voice-visualizer-fallback');
  const vvPrismMount = mountEl.querySelector('.vv-prism-mount');
  const reactRootEl = mountEl.querySelector('.voice-visualizer-react-root');

  function lerp(from, to, alpha) {
    return from + (to - from) * alpha;
  }

  const smooth = {
    envelope: 0.18,
    bass: 0,
    mid: 0,
    high: 0,
    attack: 0,
    wake: 0,
  };
  let motionTime = 0;
  let lastFrameTime = 0;
  let prismCache = null;

  function ensurePrismCache() {
    if (prismCache) return prismCache;
    if (!vvPrismMount) return null;
    const existing = vvPrismMount.firstElementChild;
    if (
      !existing
      || !existing.classList.contains('vv-prism--waves-only')
      || existing.getAttribute('data-vv-rec') !== '7'
    ) {
      vvPrismMount.innerHTML = createPrismSvgShellHTML('vv-prism', { branchesOnly: true });
      prismCache = null;
    }
    prismCache = collectPrismPathCache(vvPrismMount.firstElementChild, 'vv-prism', { branchesOnly: true });
    return prismCache;
  }

  function tick(time) {
    if (useReactVisualizer) {
      return;
    }

    const rect = mountEl.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!lastFrameTime) lastFrameTime = time;
    const deltaMs = Math.min(32, time - lastFrameTime);
    lastFrameTime = time;

    if (width && height) {
      motionTime += deltaMs;
      if (state.isRecording) {
        const an = vizAnalysisInput;
        smooth.wake = lerp(smooth.wake, 1, 0.08);
        smooth.envelope = lerp(
          smooth.envelope,
          Math.max(0.12, an.envelope || 0),
          (an.envelope || 0) > smooth.envelope ? 0.55 : 0.12,
        );
        smooth.bass = lerp(smooth.bass, an.bass || 0, (an.bass || 0) > smooth.bass ? 0.38 : 0.14);
        smooth.mid = lerp(smooth.mid, an.mid || 0, (an.mid || 0) > smooth.mid ? 0.34 : 0.14);
        smooth.high = lerp(smooth.high, an.high || 0, (an.high || 0) > smooth.high ? 0.38 : 0.14);
        smooth.attack = lerp(smooth.attack, an.attack || 0, (an.attack || 0) > smooth.attack ? 0.48 : 0.14);
      } else {
        smooth.wake = lerp(smooth.wake, 0, 0.06);
        smooth.envelope = lerp(smooth.envelope, 0.2, 0.05);
        smooth.bass = lerp(smooth.bass, 0.12, 0.05);
        smooth.mid = lerp(smooth.mid, 0.1, 0.05);
        smooth.high = lerp(smooth.high, 0.1, 0.05);
        smooth.attack = lerp(smooth.attack, 0, 0.08);
      }

      const cache = ensurePrismCache();
      if (cache) {
        const bands = prismBandsFromVizAudio(smooth);
        applyPrismWaveFrame(cache, bands, motionTime * 0.001, 'vv-prism', {
          branchesOnly: true,
          wavelength: true,
          viz: smooth,
        });
      }
    }

    rafId = window.requestAnimationFrame(tick);
  }

  function updateFallbackVisibility() {
    fallbackEl.style.opacity = '1';
    fallbackEl.style.display = '';
  }

  function syncReactBridge() {
    if (!reactBridge) return;
    reactBridge.setRecording(state.isRecording);
  }

  window.__yapVoiceVisualizerBridge = {
    setRecording(value) {
      state.isRecording = Boolean(value);
      if (state.isRecording) {
        lastFrameTime = 0;
      }
      syncReactBridge();
    },
    setAnalysis(nextAnalysis) {
      if (!nextAnalysis) return;
      state.analysis = { ...state.analysis, ...nextAnalysis };
      Object.assign(vizAnalysisInput, nextAnalysis);
    },
    reset() {
      state.isRecording = false;
      state.analysis = { ...initialAnalysis };
      resetVizAnalysisInput();
      syncReactBridge();
    },
  };

  rafId = window.requestAnimationFrame(tick);

  async function tryMountReactVisualizer() {
    try {
      const React = await import('https://esm.sh/react@18.3.1');
      const { createRoot } = await import('https://esm.sh/react-dom@18.3.1/client?external=react');
      const { VoiceVisualizer } = await import('./VoiceVisualizer.runtime.js');

      function BridgeApp() {
        const [isRecording, setIsRecording] = React.useState(state.isRecording);

        React.useEffect(() => {
          reactBridge = {
            setRecording(value) {
              setIsRecording(Boolean(value));
            },
          };
          reactBridge.setRecording(state.isRecording);
          Object.assign(vizAnalysisInput, state.analysis);

          return () => {
            reactBridge = null;
          };
        }, []);

        return React.createElement(VoiceVisualizer, { isRecording });
      }

      createRoot(reactRootEl).render(React.createElement(BridgeApp));
      useReactVisualizer = true;
      window.cancelAnimationFrame(rafId);
      reactRootEl.style.opacity = '1';
      fallbackEl.style.display = 'none';
    } catch (error) {
      console.warn('[yAp] React voice visualizer mount failed, using prism fallback.', error);
      updateFallbackVisibility();
    }
  }

  tryMountReactVisualizer();

  window.addEventListener('beforeunload', () => {
    window.cancelAnimationFrame(rafId);
  });
}
