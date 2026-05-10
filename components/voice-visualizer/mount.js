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

    const fillGradient = ctx.createLinearGradient(0, height * config.baseY, width, height * (config.baseY + 0.06));
    fillGradient.addColorStop(0, config.colors[0]);
    fillGradient.addColorStop(0.28, config.colors[1]);
    fillGradient.addColorStop(0.62, config.colors[2]);
    fillGradient.addColorStop(1, config.colors[3]);

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = fillGradient;
    ctx.globalAlpha = config.alpha * (0.42 + smooth.wake * 0.55);
    ctx.shadowBlur = 42;
    ctx.shadowColor = config.shadow;

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

    const strokeGradient = ctx.createLinearGradient(0, height * config.baseY, width, height * config.baseY);
    strokeGradient.addColorStop(0, 'rgba(255,255,255,0.66)');
    strokeGradient.addColorStop(0.22, config.edgeColors[0]);
    strokeGradient.addColorStop(0.58, config.edgeColors[1]);
    strokeGradient.addColorStop(1, 'rgba(255,255,255,0.5)');

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.4, thickness * config.edgeWidth);
    ctx.strokeStyle = strokeGradient;
    ctx.globalAlpha = 0.78;
    ctx.shadowBlur = 18;
    ctx.shadowColor = config.edgeShadow;

    ctx.beginPath();
    ctx.moveTo(spine[0].x, spine[0].y);
    for (let i = 1; i < spine.length - 1; i += 1) {
      const xc = (spine[i].x + spine[i + 1].x) / 2;
      const yc = (spine[i].y + spine[i + 1].y) / 2;
      ctx.quadraticCurveTo(spine[i].x, spine[i].y, xc, yc);
    }
    const last = spine[spine.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    ctx.lineWidth = Math.max(1, thickness * 0.08);
    ctx.strokeStyle = 'rgba(255,255,255,0.58)';
    ctx.globalAlpha = 0.42;
    ctx.shadowBlur = 0;
    ctx.stroke();

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
    leftGlow.addColorStop(0, `rgba(255, 177, 110, ${0.18 + audio.envelope * 0.18})`);
    leftGlow.addColorStop(0.24, `rgba(255, 145, 210, ${0.12 + audio.mid * 0.16})`);
    leftGlow.addColorStop(0.46, `rgba(212, 127, 255, ${0.16 + audio.mid * 0.12})`);
    leftGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, 0, width, height);

    const rightGlow = ctx.createRadialGradient(width * 0.84, height * 0.46, 0, width * 0.84, height * 0.46, width * 0.28);
    rightGlow.addColorStop(0, `rgba(130, 238, 255, ${0.18 + audio.high * 0.22})`);
    rightGlow.addColorStop(0.28, `rgba(180, 255, 233, ${0.12 + audio.bass * 0.1})`);
    rightGlow.addColorStop(0.44, `rgba(255, 182, 244, ${0.1 + audio.envelope * 0.12})`);
    rightGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(0, 0, width, height);

    const centerGlow = ctx.createRadialGradient(width * 0.48, height * 0.56, 0, width * 0.48, height * 0.56, width * 0.24);
    centerGlow.addColorStop(0, `rgba(255,255,255,${0.08 + audio.envelope * 0.08})`);
    centerGlow.addColorStop(0.36, `rgba(210, 160, 255, ${0.05 + audio.attack * 0.1})`);
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

      const ribbons = [
        {
          baseY: 0.48,
          frequency: 5.8,
          speed: 0.00115,
          phase: 0,
          thickness: 20,
          bassLift: 24,
          midLift: 18,
          highLift: 10,
          envelopeLift: 1.12,
          rippleLift: 0.84,
          shimmerLift: 0.18,
          depth: 0.72,
          edgeWidth: 0.14,
          alpha: 0.74,
          shadow: 'rgba(255, 132, 215, 0.28)',
          edgeShadow: 'rgba(180, 120, 255, 0.2)',
          colors: ['rgba(255, 226, 158, 0.54)', 'rgba(255, 122, 178, 0.48)', 'rgba(120, 92, 255, 0.58)', 'rgba(182, 243, 255, 0.44)'],
          edgeColors: ['rgba(255, 211, 123, 0.9)', 'rgba(140, 228, 255, 0.86)'],
        },
        {
          baseY: 0.52,
          frequency: 7.6,
          speed: 0.00145,
          phase: 1.45,
          thickness: 20,
          bassLift: 18,
          midLift: 22,
          highLift: 18,
          envelopeLift: 0.96,
          rippleLift: 0.92,
          shimmerLift: 0.22,
          depth: 0.52,
          edgeWidth: 0.14,
          alpha: 0.6,
          shadow: 'rgba(122, 234, 255, 0.26)',
          edgeShadow: 'rgba(130, 238, 255, 0.22)',
          colors: ['rgba(255,255,255,0.34)', 'rgba(151, 246, 255, 0.46)', 'rgba(232, 165, 255, 0.44)', 'rgba(255, 244, 206, 0.32)'],
          edgeColors: ['rgba(255,255,255,0.76)', 'rgba(171, 237, 255, 0.84)'],
        },
        {
          baseY: 0.5,
          frequency: 4.4,
          speed: 0.00088,
          phase: 3.1,
          thickness: 20,
          bassLift: 28,
          midLift: 12,
          highLift: 10,
          envelopeLift: 1.22,
          rippleLift: 0.62,
          shimmerLift: 0.12,
          depth: 0.88,
          edgeWidth: 0.14,
          alpha: 0.36,
          shadow: 'rgba(255, 214, 132, 0.16)',
          edgeShadow: 'rgba(255, 225, 164, 0.16)',
          colors: ['rgba(255, 243, 202, 0.18)', 'rgba(255, 160, 238, 0.18)', 'rgba(182, 122, 255, 0.2)', 'rgba(198, 247, 255, 0.16)'],
          edgeColors: ['rgba(255, 248, 214, 0.54)', 'rgba(255,255,255,0.46)'],
        },
        {
          baseY: 0.49,
          frequency: 9.8,
          speed: 0.00185,
          phase: 2.15,
          thickness: 20,
          bassLift: 10,
          midLift: 20,
          highLift: 26,
          envelopeLift: 0.72,
          rippleLift: 1.02,
          shimmerLift: 0.28,
          depth: 0.28,
          edgeWidth: 0.14,
          alpha: 0.54,
          shadow: 'rgba(190, 244, 255, 0.24)',
          edgeShadow: 'rgba(255,255,255,0.16)',
          colors: ['rgba(255,255,255,0.16)', 'rgba(130, 236, 255, 0.24)', 'rgba(255, 175, 234, 0.24)', 'rgba(255, 255, 255, 0.12)'],
          edgeColors: ['rgba(255,255,255,0.88)', 'rgba(200, 246, 255, 0.82)'],
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
