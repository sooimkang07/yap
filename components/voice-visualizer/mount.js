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

  mountEl.innerHTML = `
    <div class="voice-visualizer-fallback" aria-hidden="true">
      <canvas class="voice-visualizer-fallback__canvas"></canvas>
    </div>
    <div class="voice-visualizer-react-root"></div>
  `;

  const fallbackEl = mountEl.querySelector('.voice-visualizer-fallback');
  const canvas = mountEl.querySelector('.voice-visualizer-fallback__canvas');
  const reactRootEl = mountEl.querySelector('.voice-visualizer-react-root');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = mountEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lerp(from, to, alpha) {
    return from + (to - from) * alpha;
  }

  const smooth = {
    envelope: 0,
    bass: 0,
    mid: 0,
    high: 0,
    attack: 0,
    wake: 0,
  };
  let motionTime = 0;
  let lastFrameTime = 0;

  function sampleRibbonPoints(width, height, time, config, audio) {
    const baseY = height * config.baseY;
    const samples = 44;
    const spine = [];
    const envelope = audio.envelope;
    const bass = audio.bass;
    const mid = audio.mid;
    const high = audio.high;
    const attack = audio.attack;

    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      const x = width * t;
      const swell = Math.sin((t * config.frequency) + time * config.speed + config.phase);
      const ripple = Math.sin((t * config.frequency * 2.2) - time * (config.speed * 0.65) + config.phase * 0.8);
      const shimmer = Math.sin((t * config.frequency * 4.4) + time * (config.speed * 1.8));
      const y =
        baseY +
        swell * (18 + bass * config.bassLift) * (0.55 + envelope * config.envelopeLift) +
        ripple * (8 + mid * config.midLift) * (0.35 + envelope * config.rippleLift) +
        shimmer * (2 + high * config.highLift + attack * 24) * config.shimmerLift;
      spine.push({ x, y });
    }
    return spine;
  }

  function strokeSpinePath(ctx, spine) {
    ctx.beginPath();
    ctx.moveTo(spine[0].x, spine[0].y);
    for (let i = 1; i < spine.length - 1; i += 1) {
      const xc = (spine[i].x + spine[i + 1].x) / 2;
      const yc = (spine[i].y + spine[i + 1].y) / 2;
      ctx.quadraticCurveTo(spine[i].x, spine[i].y, xc, yc);
    }
    const last = spine[spine.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  function drawRibbon(width, height, time, config, audio) {
    const spine = sampleRibbonPoints(width, height, time, config, audio);
    ctx.save();

    const thickness = config.thickness;

    const top = spine.map(point => ({
      x: point.x,
      y: point.y - thickness * config.depth,
    }));
    const bottom = spine.map(point => ({
      x: point.x,
      y: point.y + thickness * config.depth,
    }));

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = config.fillColor;
    ctx.globalAlpha = config.alpha * (0.42 + smooth.wake * 0.55);
    ctx.shadowBlur = 52;
    ctx.shadowColor = config.glowRgb;

    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);

    for (let i = 1; i < top.length - 1; i += 1) {
      const xc = (top[i].x + top[i + 1].x) / 2;
      const yc = (top[i].y + top[i + 1].y) / 2;
      ctx.quadraticCurveTo(top[i].x, top[i].y, xc, yc);
    }

    const lastTop = top[top.length - 1];
    ctx.lineTo(lastTop.x, lastTop.y);

    for (let i = bottom.length - 1; i > 0; i -= 1) {
      const prev = bottom[i - 1];
      const current = bottom[i];
      const xc = (current.x + prev.x) / 2;
      const yc = (current.y + prev.y) / 2;
      ctx.quadraticCurveTo(current.x, current.y, xc, yc);
    }

    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    const baseW = Math.max(3, thickness * config.edgeWidth * 1.22);
    const strokeRgb = config.strokeColor;
    const glowRgb = config.glowRgb;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = strokeRgb;
    ctx.globalCompositeOperation = 'screen';

    const passes = [
      { width: baseW * 2.75, blur: 52, alpha: 0.3, color: strokeRgb },
      { width: baseW * 2.0, blur: 34, alpha: 0.46, color: strokeRgb },
      { width: baseW * 1.32, blur: 18, alpha: 0.78, color: strokeRgb },
      { width: baseW, blur: 9, alpha: 0.96, color: strokeRgb },
    ];

    passes.forEach(pass => {
      ctx.lineWidth = pass.width;
      ctx.globalAlpha = pass.alpha;
      ctx.shadowBlur = pass.blur;
      ctx.shadowColor = glowRgb;
      strokeSpinePath(ctx, spine);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function drawBackdrop(width, height, audio) {
    ctx.clearRect(0, 0, width, height);

    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, 'rgba(246, 248, 255, 0.08)');
    wash.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    wash.addColorStop(1, 'rgba(244, 246, 255, 0.06)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    const leftGlow = ctx.createRadialGradient(width * 0.16, height * 0.44, 0, width * 0.16, height * 0.44, width * 0.34);
    leftGlow.addColorStop(0, `rgba(255, 222, 184, ${0.16 + audio.envelope * 0.16})`);
    leftGlow.addColorStop(0.28, `rgba(222, 192, 248, ${0.12 + audio.mid * 0.14})`);
    leftGlow.addColorStop(0.5, `rgba(184, 216, 255, ${0.12 + audio.mid * 0.1})`);
    leftGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, 0, width, height);

    const rightGlow = ctx.createRadialGradient(width * 0.84, height * 0.46, 0, width * 0.84, height * 0.46, width * 0.28);
    rightGlow.addColorStop(0, `rgba(184, 216, 255, ${0.16 + audio.high * 0.18})`);
    rightGlow.addColorStop(0.3, `rgba(223, 255, 184, ${0.12 + audio.bass * 0.12})`);
    rightGlow.addColorStop(0.48, `rgba(222, 192, 248, ${0.1 + audio.envelope * 0.1})`);
    rightGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(0, 0, width, height);

    const centerGlow = ctx.createRadialGradient(width * 0.48, height * 0.56, 0, width * 0.48, height * 0.56, width * 0.24);
    centerGlow.addColorStop(0, `rgba(255,255,255,${0.07 + audio.envelope * 0.07})`);
    centerGlow.addColorStop(0.38, `rgba(222, 192, 248, ${0.06 + audio.attack * 0.1})`);
    centerGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, width, height);
  }

  function tick(time) {
    const rect = mountEl.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!lastFrameTime) lastFrameTime = time;
    const deltaMs = Math.min(32, time - lastFrameTime);
    lastFrameTime = time;

    if (width && height) {
      if (state.isRecording) {
        motionTime += deltaMs;
        smooth.wake = lerp(smooth.wake, 1, 0.08);
        smooth.envelope = lerp(smooth.envelope, Math.max(0.12, state.analysis.envelope || 0), (state.analysis.envelope || 0) > smooth.envelope ? 0.16 : 0.05);
        smooth.bass = lerp(smooth.bass, state.analysis.bass || 0, 0.08);
        smooth.mid = lerp(smooth.mid, state.analysis.mid || 0, 0.1);
        smooth.high = lerp(smooth.high, state.analysis.high || 0, 0.12);
        smooth.attack = lerp(smooth.attack, state.analysis.attack || 0, 0.16);
      }

      drawBackdrop(width, height, smooth);

      const yapRibbonPalette = [
        { stroke: 'rgba(184, 216, 255, 0.96)', fill: 'rgba(184, 216, 255, 0.2)', glow: 'rgba(184, 216, 255, 0.75)' },
        { stroke: 'rgba(222, 192, 248, 0.96)', fill: 'rgba(222, 192, 248, 0.2)', glow: 'rgba(222, 192, 248, 0.75)' },
        { stroke: 'rgba(255, 222, 184, 0.96)', fill: 'rgba(255, 222, 184, 0.2)', glow: 'rgba(255, 222, 184, 0.75)' },
        { stroke: 'rgba(223, 255, 184, 0.96)', fill: 'rgba(223, 255, 184, 0.2)', glow: 'rgba(223, 255, 184, 0.75)' },
      ];

      const yapRibbonBase = {
        thickness: 32,
        depth: 0.62,
        edgeWidth: 0.22,
        alpha: 0.7,
      };

      const ribbons = [
        {
          ...yapRibbonBase,
          strokeColor: yapRibbonPalette[0].stroke,
          fillColor: yapRibbonPalette[0].fill,
          glowRgb: yapRibbonPalette[0].glow,
          baseY: 0.48,
          frequency: 5.8,
          speed: 0.00115,
          phase: 0,
          bassLift: 24,
          midLift: 18,
          highLift: 10,
          envelopeLift: 1.12,
          rippleLift: 0.84,
          shimmerLift: 0.18,
        },
        {
          ...yapRibbonBase,
          strokeColor: yapRibbonPalette[1].stroke,
          fillColor: yapRibbonPalette[1].fill,
          glowRgb: yapRibbonPalette[1].glow,
          baseY: 0.52,
          frequency: 7.6,
          speed: 0.00145,
          phase: 1.45,
          bassLift: 18,
          midLift: 22,
          highLift: 18,
          envelopeLift: 0.96,
          rippleLift: 0.92,
          shimmerLift: 0.22,
        },
        {
          ...yapRibbonBase,
          strokeColor: yapRibbonPalette[2].stroke,
          fillColor: yapRibbonPalette[2].fill,
          glowRgb: yapRibbonPalette[2].glow,
          baseY: 0.5,
          frequency: 4.4,
          speed: 0.00088,
          phase: 3.1,
          bassLift: 28,
          midLift: 12,
          highLift: 10,
          envelopeLift: 1.22,
          rippleLift: 0.62,
          shimmerLift: 0.12,
        },
        {
          ...yapRibbonBase,
          strokeColor: yapRibbonPalette[3].stroke,
          fillColor: yapRibbonPalette[3].fill,
          glowRgb: yapRibbonPalette[3].glow,
          baseY: 0.49,
          frequency: 9.8,
          speed: 0.00185,
          phase: 2.15,
          bassLift: 10,
          midLift: 20,
          highLift: 26,
          envelopeLift: 0.72,
          rippleLift: 1.02,
          shimmerLift: 0.28,
        },
      ];

      ribbons.forEach(ribbon => drawRibbon(width, height, motionTime, ribbon, smooth));
    }

    rafId = window.requestAnimationFrame(tick);
  }

  function updateFallbackVisibility() {
    fallbackEl.style.opacity = '1';
  }

  function syncReactBridge() {
    if (!reactBridge) return;
    reactBridge.setRecording(state.isRecording);
    reactBridge.setAnalysis(state.analysis);
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
      syncReactBridge();
    },
    reset() {
      state.isRecording = false;
      state.analysis = { ...initialAnalysis };
      syncReactBridge();
    },
  };

  resizeCanvas();
  rafId = window.requestAnimationFrame(tick);
  window.addEventListener('resize', resizeCanvas);

  async function tryMountReactVisualizer() {
    try {
      const React = await import('https://esm.sh/react@18.3.1');
      const { createRoot } = await import('https://esm.sh/react-dom@18.3.1/client?external=react');
      const { VoiceVisualizer } = await import('./VoiceVisualizer.runtime.js');

      function BridgeApp() {
        const [isRecording, setIsRecording] = React.useState(state.isRecording);
        const [analysis, setAnalysis] = React.useState(state.analysis);

        React.useEffect(() => {
          reactBridge = {
            setRecording(value) {
              setIsRecording(Boolean(value));
            },
            setAnalysis(nextAnalysis) {
              if (!nextAnalysis) return;
              setAnalysis(current => ({ ...current, ...nextAnalysis }));
            },
          };
          updateFallbackVisibility();
          reactBridge.setRecording(state.isRecording);
          reactBridge.setAnalysis(state.analysis);

          return () => {
            reactBridge = null;
            updateFallbackVisibility();
          };
        }, []);

        return React.createElement(VoiceVisualizer, { isRecording, analysis });
      }

      createRoot(reactRootEl).render(React.createElement(BridgeApp));
    } catch (error) {
      console.warn('[yAp] React voice visualizer mount failed, using canvas fallback.', error);
      updateFallbackVisibility();
    }
  }

  tryMountReactVisualizer();

  window.addEventListener('beforeunload', () => {
    window.cancelAnimationFrame(rafId);
  });
}
