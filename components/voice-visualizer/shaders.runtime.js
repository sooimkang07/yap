export const backdropVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const backdropFragmentShader = `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uEnvelope;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uWake;
  uniform vec3 uGlowA;
  uniform vec3 uGlowB;
  uniform vec3 uGlowC;

  float softCircle(vec2 p, vec2 center, float radius, float blur) {
    float d = distance(p, center);
    return 1.0 - smoothstep(radius, radius + blur, d);
  }

  void main() {
    vec2 uv = vUv;
    vec2 drift = vec2(
      sin(uTime * 0.17) * 0.018,
      cos(uTime * 0.13) * 0.012
    );

    float leftGlow = softCircle(uv, vec2(0.22, 0.43) + drift, 0.24 + uBass * 0.12, 0.22);
    float lowerGlow = softCircle(uv, vec2(0.42, 0.72) + drift * 1.3, 0.22 + uMid * 0.10, 0.24);
    float rightGlow = softCircle(uv, vec2(0.80, 0.40) - drift, 0.22 + uHigh * 0.08, 0.22);

    vec3 color = vec3(0.0);
    color += uGlowA * leftGlow;
    color += uGlowB * lowerGlow;
    color += uGlowC * rightGlow;

    float wash = 0.04 + uEnvelope * 0.08;
    color += vec3(0.99, 0.99, 1.0) * wash;

    float alpha = (leftGlow * 0.22 + lowerGlow * 0.18 + rightGlow * 0.18) * (0.5 + uWake * 0.5);
    gl_FragColor = vec4(color, alpha);
  }
`;

export const ribbonVertexShader = `
  precision highp float;

  varying vec2 vUv;
  varying float vDepth;
  varying float vSheen;
  varying float vCenterGlow;

  uniform float uTime;
  uniform float uEnvelope;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uAttack;
  uniform float uWake;
  uniform float uLayerOffset;
  uniform float uIdleStrength;
  uniform float uAmplitudeMultiplier;
  uniform float uFrequencyMultiplier;
  uniform float uThickness;

  void main() {
    vUv = uv;

    vec3 pos = position;
    float x = uv.x;
    float centerFalloff = sin(x * 3.14159265);

    float broadWave =
      sin((x * (2.3 + uFrequencyMultiplier) + uTime * (0.45 + uLayerOffset * 0.2)) * 6.2831853);
    float crossWave =
      cos((x * (1.4 + uFrequencyMultiplier * 0.45) - uTime * (0.32 + uLayerOffset * 0.14)) * 6.2831853);
    float shimmer =
      sin((x * 8.0 + uTime * (0.9 + uLayerOffset * 0.3)) * 6.2831853) * uHigh;

    float audioShape =
      (uEnvelope * 1.1 + uBass * 0.85 + uAttack * 0.6) * uAmplitudeMultiplier;

    pos.y += broadWave * (0.24 + audioShape * 0.48) * centerFalloff;
    pos.y += crossWave * (0.07 + uMid * 0.18);
    pos.y += sin((x + uLayerOffset) * 6.2831853 + uTime * 0.18) * uIdleStrength;

    pos.z += broadWave * (0.16 + uBass * 0.35) * centerFalloff;
    pos.z += crossWave * (0.05 + uMid * 0.08);
    pos.z += shimmer * 0.06;

    pos.x += sin((uv.y * 3.14159265 + uTime * 0.22 + uLayerOffset) * 2.0) * 0.04 * centerFalloff;

    float ribbonBody = 1.0 - abs(uv.y - 0.5) * 2.0;
    pos.z += ribbonBody * uThickness * (0.45 + audioShape * 0.5);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vDepth = clamp((pos.z + 1.0) * 0.5, 0.0, 1.0);
    vSheen = shimmer;
    vCenterGlow = ribbonBody;
  }
`;

export const ribbonFragmentShader = `
  precision highp float;

  varying vec2 vUv;
  varying float vDepth;
  varying float vSheen;
  varying float vCenterGlow;

  uniform float uTime;
  uniform float uEnvelope;
  uniform float uHigh;
  uniform float uWake;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uColorD;
  uniform float uOpacity;

  void main() {
    float x = vUv.x;
    float y = vUv.y;

    float edge = 1.0 - smoothstep(0.0, 0.18, y) - smoothstep(1.0, 0.82, y);
    edge = clamp(edge, 0.0, 1.0);

    float iridescenceA = sin((x * 2.3 + y * 0.65 + uTime * 0.08) * 6.2831853) * 0.5 + 0.5;
    float iridescenceB = sin((x * 1.35 - y * 0.9 - uTime * 0.05) * 6.2831853) * 0.5 + 0.5;

    vec3 gradientAB = mix(uColorA, uColorB, iridescenceA);
    vec3 gradientCD = mix(uColorC, uColorD, iridescenceB);
    vec3 baseColor = mix(gradientAB, gradientCD, clamp(y * 0.85 + vDepth * 0.35, 0.0, 1.0));

    float fresnelLike = pow(1.0 - abs(y - 0.5) * 2.0, 1.8);
    float shimmer = smoothstep(0.0, 1.0, vSheen * 0.5 + 0.5) * uHigh;
    float pearl = fresnelLike * (0.35 + shimmer * 0.5);

    vec3 color = baseColor + vec3(1.0) * pearl * 0.42;
    float alpha = edge * (0.12 + vCenterGlow * 0.48 + uEnvelope * 0.18) * uOpacity * (0.4 + uWake * 0.6);

    gl_FragColor = vec4(color, alpha);
  }
`;
