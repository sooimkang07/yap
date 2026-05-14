import { applyPrismWaveFrame, smoothstep01 } from '../core/prism-paths.js';

// ═══════════════════════════════════════════════════════
// yAp — AnalysisModal
// Apple-style transition while AI breaks a memo into topics
// ═══════════════════════════════════════════════════════
//
// Analysis visual — `.analysis-prism` (SVG + disc) only while `data-phase='loading'`.
// ─────────────────────────────────────────────────────────
// `data-phase='segments'` hides `.analysis-visual-field` in CSS (Topics Ready / topic list).
// Legacy: ANALYSIS_VISUAL_MODE + _drawSegmentingWaveVisual for non-phase callers.
const ANALYSIS_VISUAL_MODE = 'segmenting';
// Legacy orbital ribbons (CSS-only). Keep off so the prism visual reads clearly.
const ANALYSIS_SHOW_ORBITAL_RIBBONS = false;
// Debug: prove the canvas draw loop is running (small non-UI heartbeat).
const ANALYSIS_DEBUG_DRAW_LOOP = false;

const ANALYSIS_COPY = {
  idleLabel: 'Analyzing',
  idleTitle: 'Breaking your memo into topics',
  idleStatus: 'Sorting the voice dump',
};

const ANALYSIS_STATUS_STEPS = [
  'Unraveling the plot',
  'Sorting the voice dump',
  'Recapping the rant',
];

// How long each loading status line stays on screen.
const ANALYSIS_STATUS_STEP_MS = 3400;

// Temporary tuning knobs for visual iteration.
const ANALYSIS_DEBUG_KEEP_VISUAL_PLAYING = false;

/**
 * Same ribbon math as the recording prism (`js/core/prism-paths.js` + legacy
 * canvas thread stack): swell + ripple + shimmer, phase from `motionTimeMs`.
 */
function mountRibbonYDelta(u, motionTimeMs, cfg, audio, heightScale) {
  const {
    frequency,
    speed,
    phase,
    bassLift,
    midLift,
    highLift,
    envelopeLift,
    rippleLift,
    shimmerLift,
  } = cfg;
  const { envelope, bass, mid, high, attack } = audio;
  const time = motionTimeMs;
  const swell = Math.sin(u * frequency + time * speed + phase);
  const ripple = Math.sin(u * frequency * 2.2 - time * (speed * 0.65) + phase * 0.8);
  const shimmer = Math.sin(u * frequency * 4.4 + time * (speed * 1.8));
  const k = heightScale;
  return (
    swell * (18 + bass * bassLift) * (0.55 + envelope * envelopeLift) * k +
    ripple * (8 + mid * midLift) * (0.35 + envelope * rippleLift) * k +
    shimmer * (2 + high * highLift + attack * 24) * shimmerLift * k
  );
}

/** Ribbon rows copied from mount.js `ribbons` (2D fallback). */
const MOUNT_RIBBON_INCOMING = {
  frequency: 7.6,
  speed: 0.00145,
  phase: 1.45,
  bassLift: 18,
  midLift: 22,
  highLift: 18,
  envelopeLift: 0.96,
  rippleLift: 0.92,
  shimmerLift: 0.22,
};
/** Scales ribbon scroll phase (lower = slower wave travel vs wall clock). */
const ANALYSIS_WAVE_SCROLL_MULT = 0.38;
/** Split / unify envelope speed (radians per ms). */
const ANALYSIS_SPLIT_ANGULAR_MS = 0.00009;
/** Vertical motion + fan spread multiplier vs default mount ribbon scale. */
const ANALYSIS_WAVE_AMPLITUDE_MULT = 2;

/**
 * Horizontal center of the device viewport in client (CSS) pixels — same space as
 * `getBoundingClientRect()`, so the four threads fork from true screen center (not
 * the letterboxed `#app` box).
 */
function segmentingSplitAnchorClientX() {
  const vv = window.visualViewport;
  if (vv && vv.width > 1) {
    return vv.left + vv.width * 0.5;
  }
  return window.innerWidth * 0.5;
}

/**
 * Canvas-space x where merged ribbon becomes four threads: aligned to the viewport
 * center, mapped into canvas pixels (not merely canvas box center).
 */
function segmentingSplitCenterCanvasPx(canvas, w) {
  if (!canvas || !w) return w * 0.5;
  const rect = canvas.getBoundingClientRect();
  const cxCss = segmentingSplitAnchorClientX() - rect.left;
  const clamped = Math.max(0, Math.min(rect.width, cxCss));
  if (rect.width <= 0) return w * 0.5;
  return clamped * (w / rect.width);
}

/** Build evenly spaced samples along x for smooth quadratic stroking. */
function buildWaveSpine(x0, x1, stepPx, yAt) {
  const spine = [];
  const span = x1 - x0;
  if (span <= 0) return spine;
  for (let x = x0; x <= x1; x += stepPx) {
    spine.push({ x, y: yAt(x) });
  }
  const last = spine[spine.length - 1];
  if (!last || last.x < x1 - 0.5) {
    spine.push({ x: x1, y: yAt(x1) });
  }
  return spine;
}

/** Same midpoint-quadratic pattern as `mount.js` `drawRibbon` spine stroke. */
function strokeSpineQuadratic(ctx, spine) {
  if (spine.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i < spine.length - 1; i += 1) {
    const xc = (spine[i].x + spine[i + 1].x) / 2;
    const yc = (spine[i].y + spine[i + 1].y) / 2;
    ctx.quadraticCurveTo(spine[i].x, spine[i].y, xc, yc);
  }
  const end = spine[spine.length - 1];
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

const AnalysisModal = {
  _onComplete: null,
  _timeouts: [],
  _statusInterval: null,
  _audioCtx: null,
  _audioSource: null,
  _audioAnalyser: null,
  _audioGain: null,
  _audioData: null,
  _audioRaf: 0,
  _smoothedLevel: 0.32,
  /** Heavily low-passed; drives CSS glow vars only (canvas uses _smoothedLevel). */
  _smoothedGlowLevel: 0.32,
  _vizMotionTimeMs: 0,
  _vizLastNow: 0,
  _vizAudio: {
    envelope: 0.18,
    bass: 0,
    mid: 0,
    high: 0,
    attack: 0,
  },
  _canvas: null,
  _ctx2d: null,
  _canvasDpr: 1,
  _canvasW: 0,
  _canvasH: 0,
  _visualPreviewRaf: 0,
  _debugFrame: 0,
  _debugLoggedStart: false,
  _debugLoggedPreviewTick: false,
  _debugLoggedAudioTick: false,
  /** Cached `#analysis-prism-*` path elements; cleared on `close`. */
  _prismPathCache: null,

  _setAnalysisStatusStrip(text, showDots = true) {
    const line = DOM.analysisStatusLine;
    const wrap = DOM.analysisStatusCopy;
    if (line && wrap) {
      line.textContent = text;
      wrap.classList.toggle('analysis-status-copy--no-dots', !showDots);
      return;
    }
    if (DOM.analysisStatusCopy) DOM.analysisStatusCopy.textContent = showDots ? `${text}...` : text;
  },

  open(audioBlob = null) {
    this._clearTimers();
    DOM.analysisOverlay.classList.add('visible');
    DOM.analysisOverlay.setAttribute('aria-hidden', 'false');
    DOM.analysisBars.innerHTML = '';
    DOM.analysisOverlay.dataset.phase = 'loading';
    if (DOM.analysisVisualField) {
      DOM.analysisVisualField.classList.toggle('analysis-visual-field--orbital', ANALYSIS_SHOW_ORBITAL_RIBBONS);
    }
    DOM.analysisLabel.textContent = ANALYSIS_COPY.idleLabel;
    DOM.analysisTitle.textContent = ANALYSIS_COPY.idleTitle;
    this._setAnalysisStatusStrip(ANALYSIS_COPY.idleStatus, true);
    this._resetVisualFieldCss();
    this._vizMotionTimeMs = 0;
    this._vizLastNow = 0;
    this._vizAudio = { envelope: 0.18, bass: 0, mid: 0, high: 0, attack: 0 };
    this._initCanvas();
    if (ANALYSIS_DEBUG_DRAW_LOOP && !this._debugLoggedStart) {
      this._debugLoggedStart = true;
      console.log('[yAp][analysis] visual open; starting draw loop');
    }
    // Always start a preview loop immediately so the sheet never goes blank.
    // If audio-reactive mode becomes available, it will replace the preview loop.
    this._startVisualPreviewLoop();
    if (audioBlob && audioBlob.size) {
      void this._startReactiveAudio(audioBlob);
    }
    let stepIndex = 0;
    this._statusInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % ANALYSIS_STATUS_STEPS.length;
      this._setAnalysisStatusStrip(ANALYSIS_STATUS_STEPS[stepIndex], true);
    }, ANALYSIS_STATUS_STEP_MS);
  },

  close() {
    this._clearTimers();
    DOM.analysisOverlay.classList.remove('visible');
    DOM.analysisOverlay.setAttribute('aria-hidden', 'true');
    DOM.analysisOverlay.dataset.phase = 'idle';
    this._invalidatePrismPathCache();
  },

  animateSegments(segments, onComplete) {
    this._clearTimers();
    this._onComplete = onComplete;
    const container = DOM.analysisBars;
    container.innerHTML = '';
    DOM.analysisOverlay.dataset.phase = ANALYSIS_DEBUG_KEEP_VISUAL_PLAYING ? 'loading' : 'segments';
    DOM.analysisLabel.textContent = 'Topics Ready';
    DOM.analysisTitle.textContent = 'Here’s how yap is shaping the thread';
    this._setAnalysisStatusStrip(`${segments.length || 0} topic${segments.length === 1 ? '' : 's'} detected`, false);

    const barEls = segments.map((seg, index) => {
      const durationMs = Math.max(0, Number(seg.end_ms || 0) - Number(seg.start_ms || 0));
      const durLabel = formatDurationClock(durationMs);
      const label = clipWords(seg.label || `Topic ${index + 1}`, 9);
      const el = document.createElement('div');
      el.className = 'analysis-bar';
      el.innerHTML = `
        <div class="analysis-bar__header">
          <div class="analysis-bar__label">${escapeHtml(label)}</div>
          <div class="analysis-bar__dur">${durLabel}</div>
        </div>
        <div class="analysis-bar__track">
          <div class="analysis-bar__fill"></div>
        </div>
      `;
      container.appendChild(el);
      return el;
    });

    if (!barEls.length) {
      this._setAnalysisStatusStrip('No new topics found', false);
      this._timeouts.push(setTimeout(() => {
        if (!ANALYSIS_DEBUG_KEEP_VISUAL_PLAYING) {
          this.close();
          if (this._onComplete) this._onComplete();
        }
      }, 900));
      return;
    }

    barEls.forEach((el, index) => {
      const delay = 40 + (index * 60);
      this._timeouts.push(setTimeout(() => {
        el.classList.add('reveal');
        this._timeouts.push(setTimeout(() => {
          el.classList.add('filling');
          el.querySelector('.analysis-bar__fill')?.classList.add('filled');
        }, 50));
      }, delay));
    });

    /* Dwell on the topic list so it’s readable before the sheet dismisses */
    const totalDelay = Math.min(7200, 4200 + (barEls.length * 320));
    this._timeouts.push(setTimeout(() => {
      if (!ANALYSIS_DEBUG_KEEP_VISUAL_PLAYING) {
        this.close();
        if (this._onComplete) this._onComplete();
      }
    }, totalDelay));
  },

  showError(message = 'Something went wrong') {
    this._clearTimers();
    DOM.analysisOverlay.dataset.phase = 'error';
    DOM.analysisLabel.textContent = 'Couldn’t Finish';
    DOM.analysisTitle.textContent = 'The memo hit a snag';
    this._setAnalysisStatusStrip(clipAnalysisError(message) || 'Try recording that one more time.', false);
    DOM.analysisBars.innerHTML = '';
    this._timeouts.push(setTimeout(() => this.close(), 2200));
  },

  _clearTimers() {
    this._timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this._timeouts = [];
    if (this._statusInterval) {
      clearInterval(this._statusInterval);
      this._statusInterval = null;
    }
    this._stopVisualPreviewLoop();
    this._stopReactiveAudio();
  },

  _resetVisualFieldCss() {
    const el = DOM.analysisVisualField;
    if (!el) return;
    el.style.setProperty('--analysis-level', '0.32');
    el.style.setProperty('--analysis-glow-mul', '1');
  },

  _invalidatePrismPathCache() {
    this._prismPathCache = null;
  },

  _updatePrismWavePaths(bands, tSec) {
    const root = DOM.analysisOverlay;
    if (!root) return;
    if (!this._prismPathCache) {
      const svg = root.querySelector('.analysis-prism__svg');
      const incoming = root.querySelector('#analysis-prism-incoming');
      const incomingTip = root.querySelector('#analysis-prism-incoming-tip');
      const branches = [
        root.querySelector('#analysis-prism-branch-0'),
        root.querySelector('#analysis-prism-branch-1'),
        root.querySelector('#analysis-prism-branch-2'),
        root.querySelector('#analysis-prism-branch-3'),
      ];
      const branchHubs = [
        root.querySelector('#analysis-prism-branch-0-hub'),
        root.querySelector('#analysis-prism-branch-1-hub'),
        root.querySelector('#analysis-prism-branch-2-hub'),
        root.querySelector('#analysis-prism-branch-3-hub'),
      ];
      if (!svg || !incoming || !incomingTip || branches.some(el => !el) || branchHubs.some(el => !el)) return;
      this._prismPathCache = { svg, incoming, incomingTip, branches, branchHubs };
    }
    applyPrismWaveFrame(this._prismPathCache, bands, tSec, 'analysis-prism');
  },

  _stepVizAudioFromBands(bands) {
    const envTarget = Math.max(0.08, bands.master);
    const prevEnv = this._vizAudio.envelope;
    const aEnv = envTarget > prevEnv ? 0.16 : 0.05;
    this._vizAudio.envelope = prevEnv + (envTarget - prevEnv) * aEnv;
    const spike = Math.max(0, bands.master - prevEnv) * 6;
    this._vizAudio.attack = this._vizAudio.attack + (spike - this._vizAudio.attack) * 0.16;
    this._vizAudio.bass = this._vizAudio.bass + (bands.bass - this._vizAudio.bass) * 0.05;
    this._vizAudio.mid = this._vizAudio.mid + (bands.mids - this._vizAudio.mid) * 0.065;
    this._vizAudio.high = this._vizAudio.high + (bands.treble - this._vizAudio.high) * 0.08;
  },

  _stepVizAudioPreview(elapsedSec) {
    const ambientPulse = 0.18 + Math.sin(elapsedSec * 0.38) * 0.03;
    const prevEnv = this._vizAudio.envelope;
    const envTarget = Math.max(ambientPulse, 0.12);
    const aEnv = envTarget > prevEnv ? 0.16 : 0.05;
    this._vizAudio.envelope = prevEnv + (envTarget - prevEnv) * aEnv;
    const spike = Math.max(0, envTarget - prevEnv) * 6;
    this._vizAudio.attack = this._vizAudio.attack + (spike - this._vizAudio.attack) * 0.16;
    const wobble = ambientPulse * 0.85;
    this._vizAudio.bass = this._vizAudio.bass + (wobble - this._vizAudio.bass) * 0.05;
    this._vizAudio.mid = this._vizAudio.mid + (wobble - this._vizAudio.mid) * 0.065;
    this._vizAudio.high = this._vizAudio.high + (wobble * 0.9 - this._vizAudio.high) * 0.08;
  },

  _advanceSegmentingMotion(rawBands, previewElapsedSec = null) {
    const now = performance.now();
    if (!this._vizLastNow) this._vizLastNow = now;
    const deltaMs = Math.min(32, now - this._vizLastNow);
    this._vizLastNow = now;
    this._vizMotionTimeMs += deltaMs;
    if (previewElapsedSec != null) {
      this._stepVizAudioPreview(previewElapsedSec);
    } else {
      this._stepVizAudioFromBands(rawBands);
    }
  },

  _bandsFromFreqData(data) {
    const n = data.length;
    const bassEnd = Math.min(14, n - 1);
    const midEnd = Math.min(52, n - 1);
    const trebEnd = Math.min(110, n - 1);
    const avg = (a, b) => {
      let s = 0;
      let c = 0;
      for (let i = a; i <= b; i++) {
        s += data[i] || 0;
        c++;
      }
      return c ? (s / c) / 255 : 0;
    };
    const bass = avg(0, bassEnd);
    const mids = avg(Math.min(15, n - 1), midEnd);
    const treble = avg(Math.min(53, n - 1), trebEnd);
    const master = (bass * 0.42) + (mids * 0.38) + (treble * 0.2);
    return { bass, mids, treble, master };
  },

  _initCanvas() {
    const canvas = DOM.analysisWaveformCanvas;
    if (!canvas) return;
    this._canvas = canvas;
    // iOS Safari may return null for unsupported context attributes (notably `desynchronized`).
    // Fall back to a plain 2D context so the visual always renders.
    this._ctx2d = canvas.getContext('2d', { alpha: true, desynchronized: true }) || canvas.getContext('2d');
    this._resizeCanvas();
  },

  _resizeCanvas() {
    const canvas = this._canvas;
    const ctx = this._ctx2d;
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      this._canvasDpr = dpr;
      this._canvasW = w;
      this._canvasH = h;
    }
  },

  _startVisualPreviewLoop() {
    this._stopVisualPreviewLoop();
    const tick = () => {
      try {
        if (ANALYSIS_DEBUG_DRAW_LOOP && !this._debugLoggedPreviewTick) {
          this._debugLoggedPreviewTick = true;
          console.log('[yAp][analysis] preview tick running');
        }

        if (!this._ctx2d || !this._canvas) {
          this._initCanvas();
        }
        this._resizeCanvas();

        const phase = DOM.analysisOverlay?.dataset?.phase;
        const allow = phase === 'loading' || phase === 'segments';
        if (!DOM.analysisOverlay?.classList.contains('visible') || !allow) {
          if (ANALYSIS_DEBUG_DRAW_LOOP) {
            console.log('[yAp][analysis] preview tick stopped', {
              visible: DOM.analysisOverlay?.classList?.contains?.('visible'),
              phase,
              allow,
            });
          }
          this._stopVisualPreviewLoop();
          return;
        }

        const t = performance.now() / 1000;
        const fake = 0.38 + 0.22 * Math.sin(t * 1.15) + 0.08 * Math.sin(t * 2.7);
        const fakeGlow = 0.38 + 0.22 * Math.sin(t * 0.2) + 0.08 * Math.sin(t * 0.38);
        const bands = {
          bass: fake * 0.75,
          mids: fake,
          treble: fake * 0.85,
          master: fake,
        };
        const field = DOM.analysisVisualField;
        if (field && phase === 'loading') {
          const L = Math.min(1, Math.max(0.1, fakeGlow));
          field.style.setProperty('--analysis-level', L.toFixed(4));
          field.style.setProperty('--analysis-glow-mul', (0.9 + L * 0.22).toFixed(4));
        }
        this._drawAnalysisVisual(bands, t);

        if (ANALYSIS_DEBUG_DRAW_LOOP && this._ctx2d && this._canvasW && this._canvasH) {
          // Heartbeat pixel: draw AFTER main render (otherwise clearRect wipes it).
          this._debugFrame += 1;
          this._ctx2d.save();
          this._ctx2d.setTransform(1, 0, 0, 1, 0, 0);
          this._ctx2d.globalCompositeOperation = 'source-over';
          this._ctx2d.globalAlpha = 1;
          this._ctx2d.filter = 'none';
          this._ctx2d.shadowBlur = 0;
          this._ctx2d.fillStyle = (this._debugFrame % 2) ? 'rgba(255,0,0,0.95)' : 'rgba(0,0,255,0.95)';
          this._ctx2d.fillRect(2, 2, 6, 6);
          this._ctx2d.restore();
        }
      } catch (err) {
        console.error('[yAp][analysis] preview tick error:', err);
      } finally {
        this._visualPreviewRaf = requestAnimationFrame(tick);
      }
    };
    this._visualPreviewRaf = requestAnimationFrame(tick);
  },

  _stopVisualPreviewLoop() {
    if (this._visualPreviewRaf) {
      cancelAnimationFrame(this._visualPreviewRaf);
      this._visualPreviewRaf = 0;
    }
  },

  _drawAnalysisVisual(bands, previewElapsedSec = null) {
    const phase = DOM.analysisOverlay?.dataset?.phase;
    if (phase === 'loading' || phase === 'segments') {
      const ctx = this._ctx2d;
      const cw = this._canvasW;
      const ch = this._canvasH;
      if (ctx && cw && ch) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
      }
      if (phase === 'loading') {
        const b = bands || { bass: 0.3, mids: 0.35, treble: 0.3, master: 0.32 };
        const tSec = previewElapsedSec != null ? previewElapsedSec : performance.now() / 1000;
        this._updatePrismWavePaths(b, tSec);
      }
      return;
    }
    if (ANALYSIS_VISUAL_MODE === 'symmetric-blob') {
      this._drawSymmetricBlobWaveform(bands);
    } else {
      this._drawSegmentingWaveVisual(bands, previewElapsedSec);
    }
  },

  /** v1 — symmetric blob (user reference: centered mirrored waveform) */
  _drawSymmetricBlobWaveform({ bass, mids, treble, master }) {
    const ctx = this._ctx2d;
    const w = this._canvasW;
    const h = this._canvasH;
    if (!ctx || !w || !h) return;

    const t = performance.now() / 1000;
    const cx = w / 2;
    const cy = h / 2;

    // Reset context state each frame (Safari can retain state across draws unexpectedly).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.clearRect(0, 0, w, h);

    const dpr = this._canvasDpr || 1;

    // Soft glass disc (after.png): luminous center behind ribbons — drawn here so prism can stay hidden in loading.
    const discRx = Math.min(w, h) * 0.38;
    const discRy = discRx * 0.82;
    const discCy = cy * 0.94;
    const discG = ctx.createRadialGradient(cx, discCy, 0, cx, discCy, discRx * 1.05);
    discG.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
    discG.addColorStop(0.42, 'rgba(255, 252, 248, 0.22)');
    discG.addColorStop(0.72, 'rgba(230, 244, 255, 0.08)');
    discG.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = discG;
    ctx.beginPath();
    ctx.ellipse(cx, discCy, discRx * 0.88, discRy * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    // Background subtle vignette (keeps center brighter like reference)
    const bg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.05, cx, cy, Math.min(w, h) * 0.62);
    bg.addColorStop(0, 'rgba(255,255,255,0.06)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Lobe generator: sum of a few Gaussian bumps, symmetric, breathing.
    const level = Math.min(1, Math.max(0.08, master));
    const ampMax = (h * 0.34) * (0.32 + level * 1.1);
    const wobble = 0.10 + mids * 0.35;
    const pinch = 0.6 + (0.4 - bass * 0.25);

    const lobes = [
      { x: -0.66, s: 0.18, a: 0.72 },
      { x: -0.30, s: 0.14, a: 0.84 },
      { x:  0.00, s: 0.11, a: 1.18 },
      { x:  0.30, s: 0.14, a: 0.84 },
      { x:  0.66, s: 0.18, a: 0.72 },
    ];

    const yAt = (nx) => {
      let y = 0;
      for (let i = 0; i < lobes.length; i++) {
        const L = lobes[i];
        const dx = nx - (L.x + Math.sin(t * (0.55 + i * 0.08)) * wobble * 0.06);
        const g = Math.exp(-(dx * dx) / (2 * L.s * L.s));
        const pulse = 0.88 + 0.12 * Math.sin(t * (1.15 + i * 0.12) + nx * 2.2);
        y += g * L.a * pulse;
      }
      // Center pinch / expand (creates the narrow center frame you showed)
      const center = Math.exp(-(nx * nx) / (2 * 0.09 * 0.09));
      const centerPulse = 0.86 + 0.28 * Math.sin(t * (1.05 + treble * 0.8));
      y *= (1 - center * 0.22 * pinch) + (center * 0.22 * centerPulse);
      return y;
    };

    // Color ramps (approx reference: blue outer, pink mid, orange core)
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.00, 'rgba(88, 190, 255, 0.75)');
    grad.addColorStop(0.18, 'rgba(255, 96, 214, 0.70)');
    grad.addColorStop(0.50, 'rgba(255, 170, 72, 0.78)');
    grad.addColorStop(0.82, 'rgba(255, 96, 214, 0.70)');
    grad.addColorStop(1.00, 'rgba(88, 190, 255, 0.75)');

    // Outer glow layer
    ctx.save();
    // On the (light) analysis sheet background, `screen` can wash out to invisible.
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = `blur(${(10 + level * 14) * this._canvasDpr}px)`;
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6 * this._canvasDpr) {
      const nx = (x / w) * 2 - 1;
      const y = yAt(nx);
      ctx.lineTo(x, cy - y * ampMax);
    }
    for (let x = w; x >= 0; x -= 6 * this._canvasDpr) {
      const nx = (x / w) * 2 - 1;
      const y = yAt(nx);
      ctx.lineTo(x, cy + y * ampMax);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Core fill (sharper)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${(2.5 + level * 2.5) * this._canvasDpr}px)`;
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3 * this._canvasDpr) {
      const nx = (x / w) * 2 - 1;
      const y = yAt(nx);
      ctx.lineTo(x, cy - y * ampMax * 0.74);
    }
    for (let x = w; x >= 0; x -= 3 * this._canvasDpr) {
      const nx = (x / w) * 2 - 1;
      const y = yAt(nx);
      ctx.lineTo(x, cy + y * ampMax * 0.74);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Airy center pulse (after.png — no dark void)
    ctx.save();
    const pulseR = Math.min(w, h) * (0.22 + level * 0.06);
    const pulseG = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
    pulseG.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    pulseG.addColorStop(0.55, 'rgba(244, 248, 255, 0.08)');
    pulseG.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = pulseG;
    ctx.filter = `blur(${(5 + level * 5) * dpr}px)`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, pulseR, pulseR * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Primary white “spine” along upper wave (reads as the bright ribbon in after.png)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    const step = Math.max(2 * dpr, 1.5);
    for (let x = 0; x <= w; x += step) {
      const nx = (x / w) * 2 - 1;
      const y = yAt(nx);
      const py = cy - y * ampMax * 0.74;
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.lineWidth = Math.max(2.75 * dpr, 3.2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.65)';
    ctx.shadowBlur = 14 * dpr;
    ctx.filter = 'none';
    ctx.stroke();
    ctx.restore();

    // Secondary colored spine (subtle trail under white)
    ctx.save();
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      const nx = (x / w) * 2 - 1;
      const y = yAt(nx);
      const py = cy - y * ampMax * 0.74 + 5 * dpr;
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
    lineGrad.addColorStop(0, 'rgba(184, 216, 255, 0.55)');
    lineGrad.addColorStop(0.33, 'rgba(222, 192, 248, 0.5)');
    lineGrad.addColorStop(0.66, 'rgba(255, 222, 184, 0.52)');
    lineGrad.addColorStop(1, 'rgba(223, 255, 184, 0.5)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = Math.max(2 * dpr, 2.25);
    ctx.shadowColor = 'rgba(184, 216, 255, 0.35)';
    ctx.shadowBlur = 10 * dpr;
    ctx.globalAlpha = 0.72;
    ctx.stroke();
    ctx.restore();
  },

  /** v2 — one continuous ribbon (mount.js motion) that stays merged on the left and splits smoothly right of center. */
  _drawSegmentingWaveVisual({ bass, mids, treble, master }, previewElapsedSec = null) {
    const ctx = this._ctx2d;
    const w = this._canvasW;
    const h = this._canvasH;
    if (!ctx || !w || !h) return;

    const dpr = this._canvasDpr;
    this._advanceSegmentingMotion({ bass, mids, treble, master }, previewElapsedSec);

    const cx = segmentingSplitCenterCanvasPx(this._canvas, w);
    const cy = h / 2;
    const level = Math.min(1, Math.max(0.08, master));
    const motionMs = this._vizMotionTimeMs;
    const scrollMs = motionMs * ANALYSIS_WAVE_SCROLL_MULT;
    const heightScale = h / 400;
    const audio = this._vizAudio;
    const spineStep = Math.max(1.25 * dpr, 1);
    const waveStroke = 14 * dpr;
    const AMP = ANALYSIS_WAVE_AMPLITUDE_MULT;

    // Reset context state each frame so no stale filter/shadow/composite can "hide" strokes.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.clearRect(0, 0, w, h);
    // Safety: if anything upstream zeros the canvas size, this makes it obvious.
    // (Kept extremely subtle so it won't read as UI.)
    ctx.fillStyle = 'rgba(0,0,0,0.001)';
    ctx.fillRect(0, 0, 1, 1);

    const split01 = 0.5 - 0.5 * Math.cos(motionMs * ANALYSIS_SPLIT_ANGULAR_MS);
    const split = (0.18 + 0.82 * split01) * (0.48 + 0.52 * level);
    const fan = (h * 0.26) * split * AMP;

    const waveDu = (x, uJitter = 0) => {
      const u = Math.min(1, Math.max(0, x / w + uJitter));
      return mountRibbonYDelta(u, scrollMs, MOUNT_RIBBON_INCOMING, audio, heightScale);
    };

    const spreadRight = (x, i) => {
      if (x <= cx) return 0;
      const xr = Math.min(1, (x - cx) / Math.max(1e-6, w - cx));
      const st = smoothstep01(xr);
      const idx = i - 1.5;
      return idx * fan * st * (0.18 + xr * xr * 1.12);
    };

    const threadY = (x, i, threadJitter = 0) => {
      const uJ = threadJitter * 0.015;
      return cy + AMP * waveDu(x, uJ) + spreadRight(x, i);
    };

    const threadRibbon = [
      { stroke: 'rgba(184, 216, 255, 0.98)', glow: 'rgba(184, 216, 255, 0.42)' },
      { stroke: 'rgba(222, 192, 248, 0.98)', glow: 'rgba(222, 192, 248, 0.42)' },
      { stroke: 'rgba(255, 222, 184, 0.98)', glow: 'rgba(255, 222, 184, 0.40)' },
      { stroke: 'rgba(223, 255, 184, 0.98)', glow: 'rgba(223, 255, 184, 0.38)' },
    ];

    const THREADS_PER_BRANCH = 2;
    ctx.save();
    // On the (light) analysis sheet background, `screen` can wash out to invisible.
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) {
      const { stroke, glow } = threadRibbon[i];
      for (let k = 0; k < THREADS_PER_BRANCH; k++) {
        const jitter = (k - (THREADS_PER_BRANCH - 1) / 2) * 0.55;
        const spine = buildWaveSpine(0, w, spineStep, x => threadY(x, i, jitter));
        // Glow pass (no filter blur; rely on shadow only for stability across browsers).
        ctx.strokeStyle = stroke;
        ctx.lineWidth = waveStroke;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = glow;
        ctx.shadowBlur = (22 - k * 4) * dpr;
        ctx.globalAlpha = 0.6;
        strokeSpineQuadratic(ctx, spine);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      const coreSpine = buildWaveSpine(0, w, spineStep, x => threadY(x, i, 0));
      // Core glow (slightly stronger).
      ctx.strokeStyle = stroke;
      ctx.lineWidth = waveStroke;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = glow;
      ctx.shadowBlur = 26 * dpr;
      strokeSpineQuadratic(ctx, coreSpine);
      ctx.shadowBlur = 0;

      // Crisp pass to guarantee visibility across blend/compositor differences.
      ctx.save();
      ctx.filter = 'none';
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(5 * dpr, 2);
      strokeSpineQuadratic(ctx, coreSpine);
      ctx.restore();
    }
    ctx.restore();
  },

  async _startReactiveAudio(blob) {
    this._stopReactiveAudio();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !DOM.analysisVisualField) return;

    try {
      const ctx = new AC();
      this._audioCtx = ctx;
      const raw = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(raw.slice(0));

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.58;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);

      this._audioSource = source;
      this._audioAnalyser = analyser;
      this._audioGain = gain;
      this._audioData = new Uint8Array(analyser.frequencyBinCount);
      this._smoothedLevel = 0.28;
      this._smoothedGlowLevel = 0.28;

      source.start(0);
      // Keep the preview loop alive until audio is actually running.
      // On iOS/Safari, resume may be blocked without a user gesture.
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      if (ctx.state !== 'suspended') {
        this._stopVisualPreviewLoop();
      } else {
        // Still suspended — stay on preview visuals instead of going blank.
        this._stopReactiveAudio();
        return;
      }
      this._audioRaf = requestAnimationFrame(() => this._audioTick());
    } catch (err) {
      console.warn('[yAp] Analysis visual audio reactive unavailable:', err);
      this._stopReactiveAudio();
      this._startVisualPreviewLoop();
    }
  },

  _audioTick() {
    if (!this._audioAnalyser || !this._audioData) return;
    try {
      if (ANALYSIS_DEBUG_DRAW_LOOP && !this._debugLoggedAudioTick) {
        this._debugLoggedAudioTick = true;
        console.log('[yAp][analysis] audio tick running');
      }

      const phase = DOM.analysisOverlay?.dataset?.phase;
      const allow = phase === 'loading' || phase === 'segments';
      if (!DOM.analysisOverlay?.classList.contains('visible') || !allow) {
        if (ANALYSIS_DEBUG_DRAW_LOOP) {
          console.log('[yAp][analysis] audio tick stopped', {
            visible: DOM.analysisOverlay?.classList?.contains?.('visible'),
            phase,
            allow,
          });
        }
        this._stopReactiveAudio();
        return;
      }

      this._resizeCanvas();
      this._audioAnalyser.getByteFrequencyData(this._audioData);
      const bands = this._bandsFromFreqData(this._audioData);
      this._smoothedLevel = (this._smoothedLevel * 0.82) + (bands.master * 0.18);
      this._smoothedGlowLevel = (this._smoothedGlowLevel * 0.994) + (bands.master * 0.006);
      const smoothedBands = {
        bass: bands.bass,
        mids: bands.mids,
        treble: bands.treble,
        master: this._smoothedLevel,
      };

      const field = DOM.analysisVisualField;
      if (field && phase === 'loading') {
        const L = Math.min(1, Math.max(0.08, this._smoothedGlowLevel));
        field.style.setProperty('--analysis-level', L.toFixed(4));
        field.style.setProperty('--analysis-glow-mul', (0.88 + L * 0.28).toFixed(4));
      }
      this._drawAnalysisVisual(smoothedBands);

      if (ANALYSIS_DEBUG_DRAW_LOOP && this._ctx2d && this._canvasW && this._canvasH) {
        // Heartbeat pixel: draw AFTER main render (otherwise clearRect wipes it).
        this._debugFrame += 1;
        this._ctx2d.save();
        this._ctx2d.setTransform(1, 0, 0, 1, 0, 0);
        this._ctx2d.globalCompositeOperation = 'source-over';
        this._ctx2d.globalAlpha = 1;
        this._ctx2d.filter = 'none';
        this._ctx2d.shadowBlur = 0;
        this._ctx2d.fillStyle = (this._debugFrame % 2) ? 'rgba(0,160,255,0.98)' : 'rgba(255,120,0,0.98)';
        this._ctx2d.fillRect(2, 2, 6, 6);
        this._ctx2d.restore();
      }
    } catch (err) {
      console.error('[yAp][analysis] audio tick error:', err);
    } finally {
      this._audioRaf = requestAnimationFrame(() => this._audioTick());
    }
  },

  _stopReactiveAudio() {
    if (this._audioRaf) {
      cancelAnimationFrame(this._audioRaf);
      this._audioRaf = 0;
    }
    try {
      this._audioSource?.stop(0);
    } catch (_) {
      /* already stopped */
    }
    this._audioSource = null;
    this._audioAnalyser = null;
    this._audioGain = null;
    this._audioData = null;

    if (this._audioCtx) {
      const ctx = this._audioCtx;
      this._audioCtx = null;
      ctx.close?.().catch(() => {});
    }

    const field = DOM.analysisVisualField;
    if (field) {
      field.style.removeProperty('--analysis-level');
      field.style.removeProperty('--analysis-glow-mul');
    }

    if (this._ctx2d && this._canvasW && this._canvasH) {
      this._ctx2d.clearRect(0, 0, this._canvasW, this._canvasH);
    }
  },
};

function clipAnalysisError(message) {
  const normalized = String(message || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Something went wrong';
  return normalized.length > 92 ? `${normalized.slice(0, 89)}...` : normalized;
}

window.AnalysisModal = AnalysisModal;
