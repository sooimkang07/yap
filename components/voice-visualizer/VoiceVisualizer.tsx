import type { CSSProperties } from 'react';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, DoubleSide, MathUtils, ShaderMaterial } from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMicAnalyser } from './useMicAnalyser';
import {
  backdropFragmentShader,
  backdropVertexShader,
  ribbonFragmentShader,
  ribbonVertexShader,
} from './shaders';
import './voice-visualizer.css';

type VoiceVisualizerProps = {
  isRecording: boolean;
  className?: string;
  style?: CSSProperties;
};

type RibbonConfig = {
  offsetY: number;
  offsetZ: number;
  rotationZ: number;
  scale: [number, number, number];
  amplitudeMultiplier: number;
  frequencyMultiplier: number;
  thickness: number;
  opacity: number;
  colors: [string, string, string, string];
  layerOffset: number;
};

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

const createRibbonUniforms = (config: RibbonConfig) => ({
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

const RIBBONS: RibbonConfig[] = [
  {
    offsetY: 0.18,
    offsetZ: -0.55,
    rotationZ: -0.11,
    scale: [4.8, 1.45, 1],
    amplitudeMultiplier: 1.12,
    frequencyMultiplier: 0.18,
    thickness: 0.24,
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
    thickness: 0.24,
    opacity: 0.46,
    layerOffset: 0.84,
    colors: ['#ffffff', '#d9eeff', '#ffddf6', '#a9f7ff'],
  },
];

const lerp = (from: number, to: number, alpha: number) => from + (to - from) * alpha;

function ReactiveScene({
  isRecording,
  analysis,
}: {
  isRecording: boolean;
  analysis: ReturnType<typeof useMicAnalyser>;
}) {
  const backdropRef = useRef<ShaderMaterial | null>(null);
  const ribbonRefs = useRef<(ShaderMaterial | null)[]>([]);
  const wakeRef = useRef(0);
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
    const ambientPulse = 0.18 + Math.sin(state.clock.elapsedTime * 0.38) * 0.03;
    const wakeTarget = isRecording ? 1 : 0;
    wakeRef.current = lerp(wakeRef.current, wakeTarget, isRecording ? 0.1 : 0.045);

    visualState.current.envelope = lerp(
      visualState.current.envelope,
      Math.max(ambientPulse, analysis.envelope),
      analysis.envelope > visualState.current.envelope ? 0.16 : 0.05
    );
    visualState.current.bass = lerp(visualState.current.bass, analysis.bass, 0.1);
    visualState.current.mid = lerp(visualState.current.mid, analysis.mid, 0.1);
    visualState.current.high = lerp(visualState.current.high, analysis.high, 0.12);
    visualState.current.attack = lerp(visualState.current.attack, analysis.attack, 0.14);

    const envelope = visualState.current.envelope;
    const bass = visualState.current.bass;
    const mid = visualState.current.mid;
    const high = visualState.current.high;
    const attack = visualState.current.attack;
    const wake = wakeRef.current;

    if (backdropRef.current) {
      const uniforms = backdropRef.current.uniforms;
      uniforms.uTime.value = state.clock.elapsedTime;
      uniforms.uEnvelope.value = envelope;
      uniforms.uBass.value = bass;
      uniforms.uMid.value = mid;
      uniforms.uHigh.value = high;
      uniforms.uWake.value = wake;
    }

    ribbonRefs.current.forEach(material => {
      if (!material) return;
      const uniforms = material.uniforms;

      // Audio mapping:
      // envelope -> broad swelling, opacity and overall body movement
      // bass -> slower large bends
      // mid -> cross-wave deformation
      // high -> shimmer / iridescent edge energy
      // attack -> transient sharpness when speech starts or consonants hit
      uniforms.uTime.value = state.clock.elapsedTime;
      uniforms.uEnvelope.value = envelope;
      uniforms.uBass.value = bass;
      uniforms.uMid.value = mid;
      uniforms.uHigh.value = high;
      uniforms.uAttack.value = attack;
      uniforms.uWake.value = wake;
    });

    // A very subtle camera drift keeps the scene from feeling mechanically static.
    state.camera.position.x = MathUtils.damp(state.camera.position.x, (mid - 0.18) * 0.16, 4.2, dt);
    state.camera.position.y = MathUtils.damp(state.camera.position.y, (bass - 0.18) * 0.08, 4.2, dt);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <mesh position={[0, 0, -1.5]} scale={[5.8, 3.3, 1]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <shaderMaterial
          ref={backdropRef}
          args={[
            {
              uniforms: backdropUniforms,
              vertexShader: backdropVertexShader,
              fragmentShader: backdropFragmentShader,
              transparent: true,
              depthWrite: false,
              depthTest: false,
              blending: AdditiveBlending,
            },
          ]}
        />
      </mesh>

      {RIBBONS.map((config, index) => (
        <mesh
          key={config.layerOffset}
          position={[0, config.offsetY, config.offsetZ]}
          rotation={[0, 0, config.rotationZ]}
          scale={config.scale}
        >
          <planeGeometry args={[1, 1, 220, 48]} />
          <shaderMaterial
            ref={material => {
              ribbonRefs.current[index] = material;
            }}
            args={[
              {
                uniforms: ribbonUniforms[index],
                vertexShader: ribbonVertexShader,
                fragmentShader: ribbonFragmentShader,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
                side: DoubleSide,
              },
            ]}
          />
        </mesh>
      ))}
    </>
  );
}

export function VoiceVisualizer({
  isRecording,
  className,
  style,
}: VoiceVisualizerProps) {
  const analysis = useMicAnalyser({ enabled: isRecording });
  const statusMessage =
    analysis.permission === 'denied'
      ? 'Microphone access was denied. The visualizer will idle until access is granted.'
      : analysis.permission === 'unsupported'
        ? 'This browser does not expose live microphone analysis.'
        : analysis.permission === 'error'
          ? analysis.error || 'Unable to initialize microphone input.'
          : null;

  return (
    <div className={['voice-visualizer', className].filter(Boolean).join(' ')} style={style}>
      <Canvas
        className="voice-visualizer__canvas"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 4.6], fov: 32 }}
      >
        <ReactiveScene isRecording={isRecording} analysis={analysis} />
      </Canvas>

      {statusMessage ? (
        <div className="voice-visualizer__status">
          <strong>Microphone unavailable</strong>
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
}
