import React, { useMemo, useRef } from 'https://esm.sh/react@18.3.1';
import { Canvas, useFrame } from 'https://esm.sh/@react-three/fiber@8.17.10?external=react,react-dom,three';
import { AdditiveBlending, Color, DoubleSide, MathUtils } from 'https://esm.sh/three@0.160.0';
import {
  backdropFragmentShader,
  backdropVertexShader,
  ribbonFragmentShader,
  ribbonVertexShader,
} from './shaders.runtime.js';

const h = React.createElement;

const BACKDROP_UNIFORMS = () => ({
  uTime: { value: 0 },
  uEnvelope: { value: 0 },
  uBass: { value: 0 },
  uMid: { value: 0 },
  uHigh: { value: 0 },
  uWake: { value: 0 },
  uGlowA: { value: new Color('#ffcc7f') },
  uGlowB: { value: new Color('#d88cff') },
  uGlowC: { value: new Color('#86e8ff') },
});

const RIBBONS = [
  {
    offsetY: 0.18,
    offsetZ: -0.55,
    rotationZ: -0.11,
    scale: [4.8, 1.45, 1],
    amplitudeMultiplier: 1.12,
    frequencyMultiplier: 0.18,
    thickness: 0.34,
    opacity: 0.72,
    layerOffset: 0.16,
    colors: ['#ffe08e', '#ff9d70', '#cd72ff', '#f9f6ff'],
  },
  {
    offsetY: 0.0,
    offsetZ: 0.0,
    rotationZ: 0.04,
    scale: [5.0, 1.25, 1],
    amplitudeMultiplier: 0.88,
    frequencyMultiplier: 0.42,
    thickness: 0.24,
    opacity: 0.58,
    layerOffset: 0.48,
    colors: ['#eafaff', '#72dfff', '#f6b4ff', '#fff2c4'],
  },
  {
    offsetY: -0.16,
    offsetZ: 0.42,
    rotationZ: 0.12,
    scale: [5.2, 1.0, 1],
    amplitudeMultiplier: 0.66,
    frequencyMultiplier: 0.82,
    thickness: 0.16,
    opacity: 0.46,
    layerOffset: 0.84,
    colors: ['#ffffff', '#d9eeff', '#ffddf6', '#a9f7ff'],
  },
];

const createRibbonUniforms = config => ({
  uTime: { value: 0 },
  uEnvelope: { value: 0 },
  uBass: { value: 0 },
  uMid: { value: 0 },
  uHigh: { value: 0 },
  uAttack: { value: 0 },
  uWake: { value: 0 },
  uLayerOffset: { value: config.layerOffset },
  uIdleStrength: { value: 0.06 },
  uAmplitudeMultiplier: { value: config.amplitudeMultiplier },
  uFrequencyMultiplier: { value: config.frequencyMultiplier },
  uThickness: { value: config.thickness },
  uOpacity: { value: config.opacity },
  uColorA: { value: new Color(config.colors[0]) },
  uColorB: { value: new Color(config.colors[1]) },
  uColorC: { value: new Color(config.colors[2]) },
  uColorD: { value: new Color(config.colors[3]) },
});

const lerp = (from, to, alpha) => from + (to - from) * alpha;

function ReactiveScene({ isRecording, analysis }) {
  const backdropRef = useRef(null);
  const ribbonRefs = useRef([]);
  const wakeRef = useRef(0);
  const motionTimeRef = useRef(0);
  const visualState = useRef({
    envelope: 0,
    bass: 0,
    mid: 0,
    high: 0,
    attack: 0,
  });

  const ribbonUniforms = useMemo(
    () => RIBBONS.map(config => createRibbonUniforms(config)),
    []
  );
  const backdropUniforms = useMemo(() => BACKDROP_UNIFORMS(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const wakeTarget = isRecording ? 1 : 0;
    wakeRef.current = lerp(wakeRef.current, wakeTarget, isRecording ? 0.1 : 0.045);
    if (isRecording) {
      motionTimeRef.current += delta;
    }

    visualState.current.envelope = lerp(
      visualState.current.envelope,
      isRecording ? Math.max(0.18, analysis.envelope || 0) : visualState.current.envelope,
      (analysis.envelope || 0) > visualState.current.envelope ? 0.16 : 0.05
    );
    visualState.current.bass = lerp(visualState.current.bass, isRecording ? (analysis.bass || 0) : visualState.current.bass, 0.1);
    visualState.current.mid = lerp(visualState.current.mid, isRecording ? (analysis.mid || 0) : visualState.current.mid, 0.1);
    visualState.current.high = lerp(visualState.current.high, isRecording ? (analysis.high || 0) : visualState.current.high, 0.12);
    visualState.current.attack = lerp(visualState.current.attack, isRecording ? (analysis.attack || 0) : visualState.current.attack, 0.14);

    const envelope = visualState.current.envelope;
    const bass = visualState.current.bass;
    const mid = visualState.current.mid;
    const high = visualState.current.high;
    const attack = visualState.current.attack;
    const wake = wakeRef.current;

    if (backdropRef.current) {
      const uniforms = backdropRef.current.uniforms;
      uniforms.uTime.value = motionTimeRef.current;
      uniforms.uEnvelope.value = envelope;
      uniforms.uBass.value = bass;
      uniforms.uMid.value = mid;
      uniforms.uHigh.value = high;
      uniforms.uWake.value = wake;
    }

    ribbonRefs.current.forEach(material => {
      if (!material) return;
      const uniforms = material.uniforms;
      uniforms.uTime.value = motionTimeRef.current;
      uniforms.uEnvelope.value = envelope;
      uniforms.uBass.value = bass;
      uniforms.uMid.value = mid;
      uniforms.uHigh.value = high;
      uniforms.uAttack.value = attack;
      uniforms.uWake.value = wake;
    });

    state.camera.position.x = MathUtils.damp(state.camera.position.x, (mid - 0.18) * 0.16, 4.2, dt);
    state.camera.position.y = MathUtils.damp(state.camera.position.y, (bass - 0.18) * 0.08, 4.2, dt);
    state.camera.lookAt(0, 0, 0);
  });

  return h(
    React.Fragment,
    null,
    h(
      'mesh',
      { position: [0, 0, -1.5], scale: [5.8, 3.3, 1] },
      h('planeGeometry', { args: [1, 1, 1, 1] }),
      h('shaderMaterial', {
        ref: backdropRef,
        args: [{
          uniforms: backdropUniforms,
          vertexShader: backdropVertexShader,
          fragmentShader: backdropFragmentShader,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          blending: AdditiveBlending,
        }],
      })
    ),
    ...RIBBONS.map((config, index) =>
      h(
        'mesh',
        {
          key: config.layerOffset,
          position: [0, config.offsetY, config.offsetZ],
          rotation: [0, 0, config.rotationZ],
          scale: config.scale,
        },
        h('planeGeometry', { args: [1, 1, 220, 48] }),
        h('shaderMaterial', {
          ref: material => {
            ribbonRefs.current[index] = material;
          },
          args: [{
            uniforms: ribbonUniforms[index],
            vertexShader: ribbonVertexShader,
            fragmentShader: ribbonFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            side: DoubleSide,
          }],
        })
      )
    )
  );
}

export function VoiceVisualizer({ isRecording, analysis }) {
  return h(
    'div',
    { className: 'voice-visualizer voice-visualizer--embedded' },
    h(
      Canvas,
      {
        className: 'voice-visualizer__canvas',
        dpr: [1, 2],
        gl: { alpha: true, antialias: true, powerPreference: 'high-performance' },
        camera: { position: [0, 0, 4.6], fov: 32 },
      },
      h(ReactiveScene, { isRecording, analysis })
    )
  );
}
