/**
 * Shared SVG prism geometry for the analysis overlay; recording uses branches-only
 * horizontal wavelengths with the same neon palette and gradient stroke treatment.
 */

/** Avoid style thrash: only touch CSS vars when glow strength meaningfully changes. */
const neonStyleLast = new WeakMap();

export function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** SVG viewBox space (disc centered ~200,110). */
export const PRISM_SPLIT = { x: 200, y: 110 };
/** Final fan angles (rad, east = 0). */
export const PRISM_BRANCH_ANGLES = [-0.22, -0.072, 0.072, 0.22];

export function prismPointsToPathD(pts) {
  if (!pts.length) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  }
  return d;
}

export function prismPointsToHubStubD(pts, lengthPx) {
  if (!pts || pts.length < 2 || lengthPx <= 0) return '';
  let remaining = lengthPx;
  const out = [{ x: pts[0].x, y: pts[0].y }];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg < 1e-9) continue;
    if (remaining <= seg) {
      const t = remaining / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      break;
    }
    remaining -= seg;
    out.push({ x: b.x, y: b.y });
  }
  if (out.length < 2) return '';
  return prismPointsToPathD(out);
}

export function smoothPrismPathYs(pts, weight = 0.3) {
  if (!pts || pts.length < 3) return pts;
  const w = Math.max(0, Math.min(0.45, weight));
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return { x: p.x, y: p.y };
    const y = (1 - w) * p.y + (w * 0.5) * (pts[i - 1].y + pts[i + 1].y);
    return { x: p.x, y };
  });
}

export function buildPrismIncomingPts(tSec, level) {
  const { x: splitX, y: splitY } = PRISM_SPLIT;
  const pts = [];
  const L = Math.min(1, Math.max(0.1, level));
  const tSlow = tSec * 0.52;
  const A = 4.1 + 9.5 * L;
  const B = 1.6 + 3.8 * L;
  const xStart = -92;
  for (let x = xStart; x <= splitX; x += 3) {
    const u = (x - xStart) / (splitX - xStart);
    const w =
      A * Math.sin(u * Math.PI * 2 * 1.42 + tSlow * 1.05) +
      B * Math.sin(u * Math.PI * 2 * 2.15 + tSlow * 0.72 + 0.35);
    pts.push({ x, y: splitY + w });
  }
  return smoothPrismPathYs(pts, 0.32);
}

export function prismIncomingExitTangent(pts) {
  if (pts.length < 2) return 0;
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export const PRISM_INCOMING_STROKE_HALF = 9;
export const PRISM_BRANCH_STROKE_WIDTH = 7;
export const PRISM_BRANCH_STROKE_HALF = PRISM_BRANCH_STROKE_WIDTH / 2;
export const PRISM_BRANCH_GRADIENT_FADE = 54;
export const PRISM_BRANCH_HUB_STUB_LEN = 36;
export const PRISM_INCOMING_TAPER_LEN = 28;

function buildPrismIncomingTaperFillD(pts, startIdx, strokeHalf, tipHalf) {
  const n = pts.length;
  if (startIdx >= n - 1) return '';
  const left = [];
  const right = [];
  const denom = Math.max(1e-6, n - 1 - startIdx);
  for (let i = startIdx; i < n; i += 1) {
    const t = (i - startIdx) / denom;
    const hw = strokeHalf * (1 - t) + tipHalf * t;
    let ang;
    if (i < n - 1) {
      ang = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
    } else {
      ang = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    }
    const px = -Math.sin(ang);
    const py = Math.cos(ang);
    left.push({ x: pts[i].x + px * hw, y: pts[i].y + py * hw });
    right.push({ x: pts[i].x - px * hw, y: pts[i].y - py * hw });
  }
  let d = `M ${left[0].x.toFixed(2)} ${left[0].y.toFixed(2)}`;
  for (let j = 1; j < left.length; j += 1) {
    d += ` L ${left[j].x.toFixed(2)} ${left[j].y.toFixed(2)}`;
  }
  for (let j = right.length - 1; j >= 0; j -= 1) {
    d += ` L ${right[j].x.toFixed(2)} ${right[j].y.toFixed(2)}`;
  }
  return `${d} Z`;
}

export function computeIncomingStrokeAndTipD(pts, taperLength, strokeHalf) {
  const n = pts.length;
  if (n < 3) {
    return { mainD: prismPointsToPathD(pts), tipD: '', startIdx: Math.max(0, n - 2) };
  }
  let startIdx = n - 2;
  let acc = 0;
  for (let i = n - 2; i >= 0 && acc < taperLength; i -= 1) {
    acc += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    startIdx = i;
  }
  startIdx = Math.max(1, Math.min(startIdx, n - 3));
  const mainD = prismPointsToPathD(pts.slice(0, startIdx + 1));
  const tipD = buildPrismIncomingTaperFillD(pts, startIdx, strokeHalf, PRISM_BRANCH_STROKE_HALF);
  return { mainD, tipD, startIdx };
}

export function updatePrismHubGradients(svg, inc, taperStartIdx, branchPtsList, idPrefix = 'analysis-prism') {
  if (!svg) return;
  if (inc && inc.length >= 2) {
    const tipGrad = svg.querySelector(`#${idPrefix}-incoming-tip-grad`);
    if (tipGrad) {
      const iWide = Math.min(Math.max(0, taperStartIdx), inc.length - 2);
      const pA = inc[iWide];
      const pB = inc[inc.length - 1];
      tipGrad.setAttribute('x1', pA.x.toFixed(2));
      tipGrad.setAttribute('y1', pA.y.toFixed(2));
      tipGrad.setAttribute('x2', pB.x.toFixed(2));
      tipGrad.setAttribute('y2', pB.y.toFixed(2));
    }
  }
  for (let i = 0; i < 4; i += 1) {
    const grad = svg.querySelector(`#${idPrefix}-branch-${i}-grad`);
    const pts = branchPtsList[i];
    if (!grad || !pts || pts.length < 2) continue;
    const p0 = pts[0];
    const p1 = pts[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1e-6;
    const ux = dx / len;
    const uy = dy / len;
    const x2 = p0.x + ux * PRISM_BRANCH_GRADIENT_FADE;
    const y2 = p0.y + uy * PRISM_BRANCH_GRADIENT_FADE;
    grad.setAttribute('x1', p0.x.toFixed(2));
    grad.setAttribute('y1', p0.y.toFixed(2));
    grad.setAttribute('x2', x2.toFixed(2));
    grad.setAttribute('y2', y2.toFixed(2));
  }
}

export function buildPrismBranchPts(branchIndex, tSec, level, startAng) {
  const { x: sx, y: sy } = PRISM_SPLIT;
  const target = PRISM_BRANCH_ANGLES[branchIndex];
  const L = Math.min(1, Math.max(0.1, level));
  const pts = [{ x: sx, y: sy }];
  const maxLen = 212;
  const tSlow = tSec * 0.48;
  for (let u = 0.048; u <= 1.0001; u += 0.036) {
    const fan = smoothstep01(Math.min(1, u * 1.22));
    const ang = startAng * (1 - fan) + target * fan;
    const len = u * maxLen;
    let x = sx + Math.cos(ang) * len;
    let y = sy + Math.sin(ang) * len;
    const px = -Math.sin(ang);
    const py = Math.cos(ang);
    const grow = 0.16 + u * u;
    const mag = (3.6 + 7.2 * L) * grow;
    const ph = 8.5 * u + tSlow * (1.15 + branchIndex * 0.16) + branchIndex * 0.55;
    x += px * mag * Math.sin(ph);
    y += py * mag * Math.sin(ph);
    const sep = (branchIndex - 1.5) * 4 * u * u * u * (0.22 + L * 0.45);
    x += px * sep;
    y += py * sep;
    pts.push({ x, y });
  }
  return smoothPrismPathYs(pts, 0.34);
}

/** Horizontal recording “ribbons” — same layer tuning as legacy canvas `mount.js`. */
const REC_WAVE_LAYERS = [
  {
    frequency: 5.8,
    speed: 0.00144,
    phase: 0,
    bassLift: 24,
    midLift: 18,
    highLift: 10,
    envelopeLift: 1.12,
    rippleLift: 0.84,
    shimmerLift: 0.18,
    yBias: 0,
  },
  {
    frequency: 7.6,
    speed: 0.00182,
    phase: 1.45,
    bassLift: 18,
    midLift: 22,
    highLift: 18,
    envelopeLift: 0.96,
    rippleLift: 0.92,
    shimmerLift: 0.22,
    yBias: 0.85,
  },
  {
    frequency: 4.4,
    speed: 0.0011,
    phase: 3.1,
    bassLift: 28,
    midLift: 12,
    highLift: 10,
    envelopeLift: 1.22,
    rippleLift: 0.62,
    shimmerLift: 0.12,
    yBias: -0.75,
  },
  {
    frequency: 9.8,
    speed: 0.00232,
    phase: 2.15,
    bassLift: 10,
    midLift: 20,
    highLift: 26,
    envelopeLift: 0.72,
    rippleLift: 1.02,
    shimmerLift: 0.28,
    yBias: -0.95,
  },
];

/** Recording strokes = style-guide palette; glow uses same RGB in CSS (fewer filters = less jank). */
const REC_WAVE_BRANCH_HEX = ['#B8D8FF', '#DEC0F8', '#FFDEB8', '#DFFFB8'];

/**
 * Four horizontal flowing polylines (viewBox space), live-reactive to mic snapshot.
 * @param {number} tMs motion time in milliseconds (matches legacy ribbon phase)
 */
export function buildRecordingWavelengthPts(branchIndex, tMs, level, viz) {
  const cfg = REC_WAVE_LAYERS[branchIndex];
  /* Span symmetric around viewBox x≈200 so the bundle reads centered in the card */
  const x0 = -98;
  const x1 = 502;
  const step = 7.5;
  const envelope = Math.max(0, Math.min(1, Number(viz?.envelope) || 0));
  const bass = Math.max(0, Math.min(1, Number(viz?.bass) || 0));
  const mid = Math.max(0, Math.min(1, Number(viz?.mid) || 0));
  const high = Math.max(0, Math.min(1, Number(viz?.high) || 0));
  const attack = Math.max(0, Math.min(1, Number(viz?.attack) || 0));
  const L = Math.min(1, Math.max(0.05, level));
  /* Overall vertical gain tracks loudness (envelope + level); quiet ≈ small motion, loud ≈ tall waves. */
  const vol = Math.min(1, Math.max(0.06, envelope * 0.5 + L * 0.5));
  const gain = 0.08 + vol * 0.92;
  const envM = 0.38 + Math.max(0.06, envelope) * cfg.envelopeLift * 0.52;
  const baseY = 110 + cfg.yBias * 16;
  const pts = [];
  const time = tMs;
  for (let x = x0; x <= x1 + 0.1; x += step) {
    const u = (x - x0) / (x1 - x0);
    const swell = Math.sin(u * cfg.frequency + time * cfg.speed + cfg.phase);
    const ripple = Math.sin(u * cfg.frequency * 2.2 - time * (cfg.speed * 0.65) + cfg.phase * 0.8);
    const shimmer = Math.sin(u * cfg.frequency * 4.4 + time * (cfg.speed * 1.8));
    const swellAmp =
      swell * (20 + bass * cfg.bassLift * 1.1) * envM * (0.18 + L * 0.82);
    const rippleAmp =
      ripple * (9 + mid * cfg.midLift) * (0.22 + envelope * cfg.rippleLift * 0.58) * (0.42 + L * 0.58);
    const shimmerAmp =
      shimmer * (2.2 + high * cfg.highLift + attack * 24) * cfg.shimmerLift * (0.32 + L * 0.68);
    const y = baseY + gain * (swellAmp + rippleAmp) + gain * 0.55 * shimmerAmp;
    pts.push({ x, y });
  }
  return smoothPrismPathYs(pts, 0.4);
}

/**
 * Map FFT-style bands (analysis) or smoothed mic snapshot to prism `level` inputs.
 */
export function prismBandsFromVizAudio(v) {
  const envelope = Math.max(0.08, Math.min(1, Number(v?.envelope) || 0.18));
  const bass = Math.max(0, Math.min(1, Number(v?.bass) || 0));
  const mid = Math.max(0, Math.min(1, Number(v?.mid) || 0));
  const high = Math.max(0, Math.min(1, Number(v?.high) || 0));
  const master = Math.min(1, Math.max(0.04, envelope * 0.72 + bass * 0.22 + mid * 0.06));
  return { master, mids: mid, treble: high, bass };
}

/**
 * @param {object} cache `{ svg, incoming?, incomingTip?, branches[], branchHubs[] }`
 * @param {object} bands `{ master, mids, treble }` (same weighting as analysis overlay)
 * @param {object} [opts] `branchesOnly` omit disc/incoming DOM; `wavelength` horizontal ribbons + `viz` mic snapshot
 */
export function applyPrismWaveFrame(cache, bands, tSec, idPrefix = 'analysis-prism', opts = {}) {
  if (!cache) return;
  const { svg, incoming, incomingTip, branches, branchHubs } = cache;
  if (!branches || !branchHubs) return;
  const branchesOnly = Boolean(opts.branchesOnly);
  const wavelength = Boolean(opts.wavelength);
  const viz = opts.viz || {};
  if (!branchesOnly && (!incoming || !incomingTip)) return;

  const m = Math.min(1, Math.max(0.08, Number(bands?.master) || 0.28));
  const mid = Math.min(1, Math.max(0, Number(bands?.mids) || 0));
  const tr = Math.min(1, Math.max(0, Number(bands?.treble) || 0));
  const level = Math.min(1, Math.max(0.05, m * 0.78 + mid * 0.12 + tr * 0.14));
  const tMs = tSec * 1000;

  let inc = [];
  let startIdx = 0;
  if (!branchesOnly || !wavelength) {
    inc = buildPrismIncomingPts(tSec, level);
  }
  if (!branchesOnly) {
    const { mainD, tipD, startIdx: si } = computeIncomingStrokeAndTipD(
      inc,
      PRISM_INCOMING_TAPER_LEN,
      PRISM_INCOMING_STROKE_HALF,
    );
    startIdx = si;
    incoming.setAttribute('d', mainD);
    incomingTip.setAttribute('d', tipD);
  }
  const tan = wavelength ? 0 : prismIncomingExitTangent(inc);
  const branchPts = [];
  for (let i = 0; i < 4; i += 1) {
    if (wavelength) {
      branchPts.push(buildRecordingWavelengthPts(i, tMs, level, viz));
    } else {
      branchPts.push(buildPrismBranchPts(i, tSec, level, tan));
    }
    branches[i].setAttribute('d', prismPointsToPathD(branchPts[i]));
    if (!(branchesOnly && wavelength)) {
      branchHubs[i].setAttribute('d', prismPointsToHubStubD(branchPts[i], PRISM_BRANCH_HUB_STUB_LEN));
    }
  }
  if (!(branchesOnly && wavelength)) {
    updatePrismHubGradients(svg, inc.length ? inc : null, startIdx, branchPts, idPrefix);
  }

  if (branchesOnly && wavelength && svg) {
    const wrap = svg.closest('.vv-prism');
    if (wrap) {
      const env = Math.max(0, Math.min(1, Number(viz.envelope) || 0));
      const pk = Math.max(env * 0.58 + level * 0.42, 0.14);
      const neonMul = 0.68 + pk * 0.62;
      const ambientA = 0.28 + pk * 0.3;
      let last = neonStyleLast.get(wrap);
      if (!last) {
        last = { n: -99, a: -99 };
        neonStyleLast.set(wrap, last);
      }
      if (
        Math.abs(last.n - neonMul) > 0.03
        || Math.abs(last.a - ambientA) > 0.04
      ) {
        wrap.style.setProperty('--vv-neon-mul', neonMul.toFixed(3));
        wrap.style.setProperty('--vv-ambient-a', ambientA.toFixed(3));
        last.n = neonMul;
        last.a = ambientA;
      }
    }
  }
}

/**
 * HTML for `.analysis-prism`-equivalent subtree; `idPrefix` e.g. `analysis-prism` or `vv-prism`.
 * Classes are `${idPrefix}__*` with BEM-style modifiers (--a, --b, …).
 * @param {{ branchesOnly?: boolean }} [opts] recording: four threads only (no disc / incoming)
 */
export function createPrismSvgShellHTML(idPrefix, opts = {}) {
  const branchesOnly = Boolean(opts.branchesOnly);
  const c = (base, mod) => (mod ? `${idPrefix}__${base} ${idPrefix}__${base}--${mod}` : `${idPrefix}__${base}`);
  const discBlock = branchesOnly ? '' : `<div class="${idPrefix}__disc"></div>`;
  const incomingTipGradBlock = branchesOnly
    ? ''
    : `
      <linearGradient id="${idPrefix}-incoming-tip-grad" gradientUnits="userSpaceOnUse" x1="-80" y1="110" x2="200" y2="110">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
        <stop offset="62%" stop-color="#ffffff" stop-opacity="0.88" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>`;
  const incomingPathsBlock = branchesOnly
    ? ''
    : `
    <path id="${idPrefix}-incoming" class="${idPrefix}__incoming" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" d="M -50 110 L 200 110" />
    <path id="${idPrefix}-incoming-tip" class="${idPrefix}__incoming-tip" fill="url(#${idPrefix}-incoming-tip-grad)" d="" />`;
  const branchStrokeW = branchesOnly ? 17 : 7;
  const branchGradBlock = branchesOnly
    ? ''
    : `
      <linearGradient id="${idPrefix}-branch-0-grad" gradientUnits="userSpaceOnUse" x1="200" y1="110" x2="254" y2="110">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="24%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#B8D8FF" />
      </linearGradient>
      <linearGradient id="${idPrefix}-branch-1-grad" gradientUnits="userSpaceOnUse" x1="200" y1="110" x2="254" y2="110">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="24%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#DEC0F8" />
      </linearGradient>
      <linearGradient id="${idPrefix}-branch-2-grad" gradientUnits="userSpaceOnUse" x1="200" y1="110" x2="254" y2="110">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="24%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#FFDEB8" />
      </linearGradient>
      <linearGradient id="${idPrefix}-branch-3-grad" gradientUnits="userSpaceOnUse" x1="200" y1="110" x2="254" y2="110">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="24%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#DFFFB8" />
      </linearGradient>`;
  const s0 = branchesOnly ? REC_WAVE_BRANCH_HEX[0] : `url(#${idPrefix}-branch-0-grad)`;
  const s1 = branchesOnly ? REC_WAVE_BRANCH_HEX[1] : `url(#${idPrefix}-branch-1-grad)`;
  const s2 = branchesOnly ? REC_WAVE_BRANCH_HEX[2] : `url(#${idPrefix}-branch-2-grad)`;
  const s3 = branchesOnly ? REC_WAVE_BRANCH_HEX[3] : `url(#${idPrefix}-branch-3-grad)`;
  /* Recording: paint green→peach→lavender→blue so blue (branch-0) reads on top. Analysis: hub order unchanged. */
  const branchAndHubPaths = branchesOnly
    ? `
    <path id="${idPrefix}-branch-3" class="${c('branch', 'd')}" fill="none" stroke="${s3}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="M 200 110 L 368 188" />
    <path id="${idPrefix}-branch-2" class="${c('branch', 'c')}" fill="none" stroke="${s2}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="M 200 110 L 388 148" />
    <path id="${idPrefix}-branch-1" class="${c('branch', 'b')}" fill="none" stroke="${s1}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="M 200 110 L 392 102" />
    <path id="${idPrefix}-branch-0" class="${c('branch', 'a')}" fill="none" stroke="${s0}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="M 200 110 L 380 70" />
    <path id="${idPrefix}-branch-3-hub" class="${c('branch-hub', 'd')}" fill="none" stroke="${s3}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="" />
    <path id="${idPrefix}-branch-2-hub" class="${c('branch-hub', 'c')}" fill="none" stroke="${s2}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="" />
    <path id="${idPrefix}-branch-1-hub" class="${c('branch-hub', 'b')}" fill="none" stroke="${s1}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="" />
    <path id="${idPrefix}-branch-0-hub" class="${c('branch-hub', 'a')}" fill="none" stroke="${s0}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="" />`
    : `
    <path id="${idPrefix}-branch-0" class="${c('branch', 'a')}" fill="none" stroke="${s0}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="M 200 110 L 380 70" />
    <path id="${idPrefix}-branch-1" class="${c('branch', 'b')}" fill="none" stroke="${s1}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="M 200 110 L 392 102" />
    <path id="${idPrefix}-branch-2" class="${c('branch', 'c')}" fill="none" stroke="${s2}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="M 200 110 L 388 148" />
    <path id="${idPrefix}-branch-3" class="${c('branch', 'd')}" fill="none" stroke="${s3}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="M 200 110 L 368 188" />
    <path id="${idPrefix}-branch-0-hub" class="${c('branch-hub', 'a')}" fill="none" stroke="${s0}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="" />
    <path id="${idPrefix}-branch-1-hub" class="${c('branch-hub', 'b')}" fill="none" stroke="${s1}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="" />
    <path id="${idPrefix}-branch-2-hub" class="${c('branch-hub', 'c')}" fill="none" stroke="${s2}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="" />
    <path id="${idPrefix}-branch-3-hub" class="${c('branch-hub', 'd')}" fill="none" stroke="${s3}" stroke-width="${branchStrokeW}" stroke-linecap="round" stroke-linejoin="round" d="" />`;
  return `
<div class="${idPrefix}${branchesOnly ? ` ${idPrefix}--waves-only` : ''}"${branchesOnly ? ' data-vv-rec="7"' : ''} aria-hidden="true">
  ${discBlock}
  <svg class="${idPrefix}__svg" viewBox="-100 0 600 220" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>${incomingTipGradBlock}${branchGradBlock}
    </defs>
    ${branchAndHubPaths}
    ${incomingPathsBlock}
  </svg>
</div>`;
}

export function collectPrismPathCache(container, idPrefix, opts = {}) {
  if (!container) return null;
  const svg = container.querySelector('svg');
  if (!svg) return null;
  const branchesOnly = Boolean(opts.branchesOnly);
  const incoming = branchesOnly ? null : svg.querySelector(`#${idPrefix}-incoming`);
  const incomingTip = branchesOnly ? null : svg.querySelector(`#${idPrefix}-incoming-tip`);
  const branches = [
    svg.querySelector(`#${idPrefix}-branch-0`),
    svg.querySelector(`#${idPrefix}-branch-1`),
    svg.querySelector(`#${idPrefix}-branch-2`),
    svg.querySelector(`#${idPrefix}-branch-3`),
  ];
  const branchHubs = [
    svg.querySelector(`#${idPrefix}-branch-0-hub`),
    svg.querySelector(`#${idPrefix}-branch-1-hub`),
    svg.querySelector(`#${idPrefix}-branch-2-hub`),
    svg.querySelector(`#${idPrefix}-branch-3-hub`),
  ];
  if (branches.some(el => !el) || branchHubs.some(el => !el)) return null;
  if (!branchesOnly && (!incoming || !incomingTip)) return null;
  return { svg, incoming, incomingTip, branches, branchHubs };
}
