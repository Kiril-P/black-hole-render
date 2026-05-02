import * as THREE from 'three';

export function createShaderUniforms() {
  return {
    global: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCameraDrift: { value: 0.38 }
    },
    disk: {
      uTime: { value: 0 },
      uDiskSpeed: { value: 1.65 },
      uGlowIntensity: { value: 0.76 },
      uPaletteWarmth: { value: 0.92 },
      uDiskTurbulence: { value: 0.75 },
      uDopplerStrength: { value: 0.7 },
      uPhotonRingStrength: { value: 0.54 },
      uDiskDepth: { value: 0.72 },
      uDiskAsymmetry: { value: 0.72 }
    },
    starfield: {
      uTime: { value: 0 },
      uStarDensity: { value: 0.75 }
    },
    dust: {
      uTime: { value: 0 },
      uDiskSpeed: { value: 1.65 },
      uPixelRatio: { value: 1 },
      uCaptureIntensity: { value: 0.42 }
    },
    capture: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uCaptureIntensity: { value: 0.42 }
    },
    bodies: {
      uTime: { value: 0 },
      uBodyHeat: { value: 0.9 },
      uPlanetVisibility: { value: 0.86 }
    },
    lensing: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uRadius: { value: 0.18 },
      uLensingStrength: { value: 1.28 },
      uPhotonRingStrength: { value: 0.54 }
    },
    pixel: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uRadius: { value: 0.14 },
      uPixelSize: { value: 1.0 },
      uColorSteps: { value: 64.0 }
    }
  };
}

export const eventHorizonVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const eventHorizonFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewDirection);
    float fresnel = 1.0 - max(dot(normal, viewDirection), 0.0);
    float rim = pow(fresnel, 8.0);
    float facet = step(0.0, dot(normal, normalize(vec3(-0.25, 0.38, 0.88))));
    vec3 color = vec3(0.0);
    color += vec3(0.011, 0.008, 0.018) * rim;
    color += vec3(0.012, 0.006, 0.002) * rim * facet * 0.38;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const diskVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uDiskSpeed;
  uniform float uDiskTurbulence;

  varying float vRadius;
  varying float vAngle;
  varying float vFacet;
  varying vec2 vDiskUv;

  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;

  void main() {
    vec3 transformed = position;
    float radius = length(position.xy);
    float angle = atan(position.y, position.x);
    float steppedTime = floor(uTime * 48.0) / 48.0;
    float waveA = sin(angle * 11.0 + radius * 3.1 - steppedTime * 2.1 * uDiskSpeed);
    float waveB = sin(angle * 23.0 - radius * 4.0 + steppedTime * 1.35 * uDiskSpeed);
    float outer = smoothstep(1.82, 3.92, radius);

    transformed.z += (waveA * 0.032 + waveB * 0.018) * outer * uDiskTurbulence;

    vRadius = radius;
    vAngle = angle;
    vFacet = (angle + PI) / TAU * 320.0;
    vDiskUv = position.xy;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

export const diskFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uDiskSpeed;
  uniform float uGlowIntensity;
  uniform float uPaletteWarmth;
  uniform float uDiskTurbulence;
  uniform float uDopplerStrength;
  uniform float uPhotonRingStrength;
  uniform float uDiskDepth;
  uniform float uDiskAsymmetry;
  uniform float uDiskLayer;

  varying float vRadius;
  varying float vAngle;
  varying float vFacet;
  varying vec2 vDiskUv;

  const float TAU = 6.28318530718;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 74.7);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      value += noise(p) * amp;
      p = p * 2.03 + 17.13;
      amp *= 0.52;
    }
    return value;
  }

  void main() {
    float frontMask = smoothstep(-0.1, 0.16, sin(vAngle + 0.08));
    float rearMask = 1.0 - smoothstep(-0.18, 0.08, sin(vAngle + 0.08));
    float layerMask = mix(rearMask, frontMask, uDiskLayer);
    if (layerMask < 0.01) discard;

    float innerMask = smoothstep(1.86, 2.08, vRadius);
    float outerMask = 1.0 - smoothstep(3.42, 3.86, vRadius);
    float radialMask = innerMask * outerMask;

    float steppedTime = floor(uTime * 48.0) / 48.0;
    float radial = (vRadius - 1.72) * 11.0;
    float turbulence = fbm(vec2(vAngle * 3.4 + steppedTime * uDiskSpeed * 0.55, vRadius * 5.4));
    float filament = fbm(vec2(vAngle * 7.5 - steppedTime * uDiskSpeed * 1.08, radial * 0.55 + turbulence * 1.6));
    float fineFilament = fbm(vec2(vAngle * 18.0 - steppedTime * uDiskSpeed * 1.8, vRadius * 14.0));
    float spiral = sin(vAngle * 12.0 + vRadius * 9.2 - steppedTime * (4.55 + turbulence * 1.8) * uDiskSpeed);
    float ribbon = smoothstep(0.18, 0.92, 0.5 + 0.5 * spiral);
    float hotBand = smoothstep(0.5, 0.98, filament * 0.72 + ribbon * 0.34);
    float brokenBand = mix(0.86, 1.09, filament) * mix(0.94, 1.08, fineFilament);
    float hotInner = pow(1.0 - smoothstep(1.94, 3.22, vRadius), 1.7);
    float sideGate = smoothstep(0.14, 0.94, abs(cos(vAngle - 0.1)));
    float photonBreak = mix(0.44, 1.0, max(sideGate * 0.75, filament * 0.62 + fineFilament * 0.38));
    float photon = exp(-pow((vRadius - 1.91) / 0.072, 2.0)) * uPhotonRingStrength * photonBreak;
    float whiteHot = pow((hotBand * 0.72 + hotInner * 0.48 + photon * 0.36), 1.48);
    float asymmetry = smoothstep(-0.15, 1.0, cos(vAngle - 0.18));
    float doppler = 1.0 + asymmetry * 0.55 * uDopplerStrength * uDiskAsymmetry;
    float darkSide = mix(0.68, 1.0, asymmetry * uDiskAsymmetry + (1.0 - uDiskAsymmetry));
    float rearDim = mix(0.42, 1.0, uDiskLayer);

    vec3 ember = vec3(0.75, 0.08, 0.015);
    vec3 orange = vec3(1.0, 0.38, 0.035);
    vec3 gold = vec3(1.0, 0.72, 0.16);
    vec3 white = vec3(1.0, 0.95, 0.76);
    vec3 warm = mix(ember, orange, uPaletteWarmth);
    vec3 color = mix(warm, gold, hotBand * 0.54 + hotInner * 0.34 + turbulence * 0.16);
    color = mix(color, white, clamp(whiteHot * 0.38 + photon * 0.2, 0.0, 0.72));
    color *= (0.44 + hotBand * 0.6 + hotInner * 0.72 + turbulence * 0.18 + fineFilament * 0.08);
    color *= doppler * rearDim * darkSide * uGlowIntensity;
    color += vec3(1.0, 0.68, 0.22) * photon * rearDim * 0.44;
    color = min(color, vec3(2.1));
    color = floor(color * 72.0) / 72.0;

    float alpha = radialMask * layerMask * brokenBand;
    alpha *= 0.2 + hotBand * 0.28 + hotInner * 0.2 + photon * 0.42;
    alpha *= mix(0.5, 1.0, uDiskLayer);
    alpha *= mix(0.78, 1.18, uDiskDepth) * mix(0.86, 1.12, uDiskTurbulence);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.94));
  }
`;

export const volumeDiskVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uDiskSpeed;
  uniform float uDiskDepth;
  uniform float uDiskTurbulence;
  uniform float uVolumeOffset;

  varying float vRadius;
  varying float vAngle;
  varying float vDepthFade;
  varying float vNoiseSeed;

  void main() {
    vec3 transformed = position;
    float radius = length(position.xy);
    float angle = atan(position.y, position.x);
    float steppedTime = floor(uTime * 36.0) / 36.0;
    float rimLift = smoothstep(2.35, 4.35, radius);
    float wave = sin(angle * 8.0 + radius * 2.6 - steppedTime * uDiskSpeed * 1.4);
    float fine = sin(angle * 19.0 - radius * 4.2 + steppedTime * uDiskSpeed * 1.1);
    float depth = (0.17 + rimLift * 0.22) * uDiskDepth;

    transformed.z += (uVolumeOffset * depth + wave * 0.045 + fine * 0.018) * uDiskTurbulence;

    vRadius = radius;
    vAngle = angle;
    vDepthFade = abs(uVolumeOffset);
    vNoiseSeed = wave * 0.5 + fine * 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

export const volumeDiskFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uGlowIntensity;
  uniform float uDiskDepth;
  uniform float uDiskAsymmetry;
  uniform float uPhotonRingStrength;

  varying float vRadius;
  varying float vAngle;
  varying float vDepthFade;
  varying float vNoiseSeed;

  float hash21(vec2 p) {
    p = fract(p * vec2(113.7, 271.9));
    p += dot(p, p + 31.8);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    float innerMask = smoothstep(1.9, 2.18, vRadius);
    float outerMask = 1.0 - smoothstep(3.55, 4.4, vRadius);
    float radialMask = innerMask * outerMask;
    float edgeVolume = smoothstep(2.18, 4.2, vRadius);
    float asymmetry = smoothstep(-0.2, 1.0, cos(vAngle - 0.2));
    float grain = noise(vec2(vAngle * 8.0 + uTime * 0.08, vRadius * 4.6 + vNoiseSeed));
    float sideGate = smoothstep(0.2, 0.95, abs(cos(vAngle - 0.1)));
    float photon = exp(-pow((vRadius - 1.96) / 0.1, 2.0)) * uPhotonRingStrength * mix(0.36, 0.9, clamp(sideGate + grain * 0.25, 0.0, 1.0));
    float sideGlow = mix(0.46, 1.0, asymmetry * uDiskAsymmetry + (1.0 - uDiskAsymmetry));

    vec3 smoke = vec3(0.42, 0.08, 0.025);
    vec3 ember = vec3(1.0, 0.42, 0.07);
    vec3 color = mix(smoke, ember, grain * 0.35 + photon * 0.36 + asymmetry * 0.24);
    color *= sideGlow * uGlowIntensity;

    float alpha = radialMask * edgeVolume;
    alpha *= (0.035 + grain * 0.055 + photon * 0.12) * uDiskDepth;
    alpha *= mix(0.55, 1.0, vDepthFade);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.22));
  }
`;

export const starfieldVertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDirection = normalize(worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const starfieldFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uStarDensity;

  varying vec3 vDirection;

  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      value += noise(p) * amp;
      p = p * 2.0 + vec2(19.1, 7.7);
      amp *= 0.52;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    vec2 sphereUv = vec2(atan(dir.z, dir.x) / TAU + 0.5, asin(dir.y) / PI + 0.5);
    vec2 gridUv = sphereUv * vec2(280.0, 148.0);
    vec2 cell = floor(gridUv);
    vec2 local = fract(gridUv) - 0.5;
    float rnd = hash21(cell);
    float threshold = mix(0.9982, 0.977, uStarDensity);
    float star = step(threshold, rnd);
    float starSize = mix(0.19, 0.024, hash21(cell + 18.4));
    float core = smoothstep(starSize, 0.0, length(local));
    float sparkle = 0.8 + 0.2 * sin(uTime * (0.25 + rnd * 1.8) + rnd * 60.0);
    float nebula = fbm(sphereUv * vec2(6.8, 3.2) + vec2(uTime * 0.004, -0.07));
    float largeNebula = fbm(sphereUv * vec2(2.2, 1.35) + vec2(-0.16, uTime * 0.002));
    float dustLaneNoise = fbm(sphereUv * vec2(13.0, 4.8) + 2.0);
    float dustLaneShape = 1.0 - smoothstep(0.08, 0.28, abs(sphereUv.y - (0.48 + sin(sphereUv.x * TAU * 1.8) * 0.045)));
    float dustLane = smoothstep(0.36, 0.78, dustLaneNoise) * dustLaneShape;
    float cluster = smoothstep(0.74, 1.0, fbm(sphereUv * vec2(18.0, 9.0) + vec2(4.2, 1.7)));

    vec3 deepSpace = vec3(0.002, 0.003, 0.01);
    vec3 blueHaze = vec3(0.024, 0.04, 0.1);
    vec3 violetHaze = vec3(0.055, 0.025, 0.085);
    vec3 amberHaze = vec3(0.105, 0.042, 0.018);
    vec3 haze = mix(blueHaze, amberHaze, smoothstep(0.08, 0.92, sphereUv.y));
    haze = mix(haze, violetHaze, smoothstep(0.52, 0.96, largeNebula) * 0.52);
    vec3 starColor = mix(vec3(0.55, 0.7, 1.0), vec3(1.0, 0.78, 0.48), hash21(cell + 91.7));
    vec3 color = deepSpace;
    color += haze * smoothstep(0.44, 1.0, nebula) * 0.34;
    color += mix(vec3(0.02, 0.024, 0.05), vec3(0.1, 0.055, 0.12), largeNebula) * smoothstep(0.55, 1.0, largeNebula) * 0.22;
    color -= vec3(0.012, 0.01, 0.018) * dustLane * 0.82;
    color += vec3(0.09, 0.06, 0.11) * dustLane * smoothstep(0.64, 0.98, nebula) * 0.18;
    color += starColor * star * core * sparkle * (1.62 + cluster * 0.9);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const clusterStarVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uPixelRatio;

  attribute float aSize;
  attribute float aTwinkle;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.74 + 0.26 * sin(uTime * (0.35 + aTwinkle * 1.1) + aTwinkle * 37.0);
    vColor = aColor;
    vTwinkle = twinkle;
    gl_PointSize = aSize * uPixelRatio * twinkle * (58.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const clusterStarFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float distanceToCenter = length(uv);
    float core = smoothstep(0.34, 0.0, distanceToCenter);
    float halo = smoothstep(0.5, 0.06, distanceToCenter) * 0.28;
    float rays = pow(max(abs(uv.x), abs(uv.y)), 0.7);
    float glint = (1.0 - smoothstep(0.02, 0.18, min(abs(uv.x), abs(uv.y)))) * (1.0 - smoothstep(0.18, 0.5, rays)) * 0.12;
    float alpha = max(core, halo + glint) * 0.68;
    gl_FragColor = vec4(vColor * (0.55 + vTwinkle * 0.78), alpha);
  }
`;

export const nebulaVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const nebulaFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(167.3, 281.9));
    p += dot(p, p + 41.7);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.52;
    for (int i = 0; i < 5; i++) {
      value += noise(p) * amp;
      p = p * 2.04 + vec2(13.2, 7.8);
      amp *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 centered = vUv - 0.5;
    centered.x *= 1.72;
    float radial = 1.0 - smoothstep(0.08, 0.82, length(centered));
    float lane = 1.0 - smoothstep(0.035, 0.22, abs(centered.y + sin(centered.x * 2.8 + uSeed) * 0.07));
    vec2 flowUv = vUv * vec2(3.0, 1.25) + vec2(uSeed, -uSeed * 0.37 + uTime * 0.006);
    float cloud = fbm(flowUv);
    float detail = fbm(flowUv * 3.1 + 9.0);
    float body = smoothstep(0.32, 0.92, cloud * 0.72 + detail * 0.28);
    float alpha = body * radial * (0.22 + lane * 0.5) * uOpacity;
    vec3 color = mix(uColorA, uColorB, smoothstep(0.28, 1.0, cloud + detail * 0.35));
    color *= 0.55 + lane * 0.34 + detail * 0.22;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.42));
  }
`;

export const cometVertexShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cometFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uHeadBias;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float head = smoothstep(0.72, 1.0, uv.x);
    float tail = pow(1.0 - uv.x, 1.45);
    float width = mix(0.025, 0.18, tail);
    float core = smoothstep(width, 0.0, abs(uv.y - 0.5));
    float glow = smoothstep(width * 3.2, 0.0, abs(uv.y - 0.5)) * 0.28;
    float taper = smoothstep(0.0, 0.1, uv.x) * (1.0 - smoothstep(0.98, 1.0, uv.x));
    float sparkle = 0.72 + 0.28 * sin((uv.x + uHeadBias) * 46.0);
    vec3 color = mix(uColor * 0.3, vec3(1.0, 0.92, 0.72), head * 0.58);
    float alpha = (core + glow) * taper * sparkle * uOpacity;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.88));
  }
`;

export const dustVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uDiskSpeed;
  uniform float uPixelRatio;
  uniform float uCaptureIntensity;

  attribute float aSeed;
  attribute float aAngle;
  attribute float aSpeed;
  attribute float aSize;

  varying float vFade;
  varying float vHeat;
  varying float vSpin;

  void main() {
    float steppedTime = floor(uTime * 28.0) / 28.0;
    float fall = fract(aSeed + steppedTime * (0.055 + aSpeed * 0.032) * uDiskSpeed);
    float fallCurve = pow(fall, 1.28);
    float radius = mix(4.35, 1.18, fallCurve);
    float angle = aAngle + steppedTime * (2.2 + aSpeed * 2.4) * uDiskSpeed + fallCurve * 5.5;
    float wobble = sin(angle * 4.0 + aSeed * 18.0) * 0.12 * (1.0 - fallCurve);
    vec3 p = vec3(cos(angle) * radius, sin(angle) * radius, wobble);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

    vFade = smoothstep(0.02, 0.18, fall) * (1.0 - smoothstep(0.86, 1.0, fall));
    vFade *= uCaptureIntensity * 0.78;
    vHeat = smoothstep(0.42, 1.0, fall);
    vSpin = angle + aSeed * 6.28318;
    gl_PointSize = aSize * uPixelRatio * vFade * (48.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const dustFragmentShader = /* glsl */ `
  precision highp float;

  varying float vFade;
  varying float vHeat;
  varying float vSpin;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vSpin);
    float s = sin(vSpin);
    uv = mat2(c, -s, s, c) * uv;
    float streak = smoothstep(0.52, 0.04, abs(uv.y)) * smoothstep(0.5, 0.02, abs(uv.x));
    float core = 1.0 - smoothstep(0.04, 0.22, length(uv));
    float particle = max(streak * 0.72, core);
    vec3 ember = mix(vec3(0.95, 0.22, 0.035), vec3(1.0, 0.86, 0.32), vHeat);
    gl_FragColor = vec4(ember * (0.48 + vHeat * 1.25), particle * vFade * 0.28);
  }
`;

export const captureVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uCaptureIntensity;

  attribute float aSeed;
  attribute float aOrbit;
  attribute float aPhase;
  attribute float aSize;

  varying float vFade;
  varying float vHeat;
  varying float vSpin;

  const float TAU = 6.28318530718;

  void main() {
    float steppedTime = floor(uTime * 30.0) / 30.0;
    float fall = fract(aSeed + steppedTime * (0.018 + aOrbit * 0.035));
    float curve = pow(fall, 1.45);
    float radius = mix(8.3, 1.16, curve);
    float angle = aPhase + curve * TAU * (1.55 + aOrbit * 0.7) + steppedTime * (0.28 + aOrbit * 0.46);
    float lift = sin(angle * 1.7 + aSeed * 20.0) * mix(0.72, 0.08, curve);
    vec3 p = vec3(cos(angle) * radius, sin(angle) * radius * 0.42, lift);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

    vHeat = smoothstep(0.36, 1.0, fall);
    vFade = smoothstep(0.02, 0.18, fall) * (1.0 - smoothstep(0.9, 1.0, fall));
    vFade *= uCaptureIntensity * 0.62;
    vSpin = angle + aSeed * TAU;
    gl_PointSize = aSize * uPixelRatio * vFade * (44.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const captureFragmentShader = /* glsl */ `
  precision highp float;

  varying float vFade;
  varying float vHeat;
  varying float vSpin;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vSpin);
    float s = sin(vSpin);
    uv = mat2(c, -s, s, c) * uv;
    float tail = smoothstep(0.38, 0.018, abs(uv.y)) * smoothstep(0.42, 0.0, uv.x + 0.14);
    float core = 1.0 - smoothstep(0.06, 0.28, length(uv));
    float shape = max(tail * 0.82, core);
    vec3 cool = vec3(0.18, 0.28, 0.72);
    vec3 hot = vec3(1.0, 0.72, 0.18);
    vec3 color = mix(cool, hot, vHeat);
    gl_FragColor = vec4(color * (0.36 + vHeat * 1.35), shape * vFade * 0.24);
  }
`;

export const planetVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = worldPosition.xyz;
    vLocalPosition = position;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const planetFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uSeed;
  uniform float uHeat;
  uniform float uOpacity;
  uniform float uBodyHeat;
  uniform vec3 uBaseColor;
  uniform vec3 uAccentColor;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  float hash21(vec2 p) {
    p = fract(p * vec2(131.7, 289.3));
    p += dot(p, p + 43.2);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(-0.65, 0.42, 0.62));
    vec3 fillDir = normalize(vec3(0.45, -0.18, 0.75));
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float light = max(dot(normal, lightDir), 0.0);
    float fill = max(dot(normal, fillDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.4);
    float bands = sin((vLocalPosition.y * 7.0 + noise(vLocalPosition.xz * 3.3 + uSeed) * 2.0 + uTime * 0.07) * 3.14159);
    float terrain = noise(vLocalPosition.xz * 4.0 + vec2(uSeed, uSeed * 0.37));
    float bandMask = smoothstep(-0.35, 0.85, bands) * 0.55 + terrain * 0.45;
    vec3 color = mix(uBaseColor, uAccentColor, bandMask);
    color *= 0.16 + light * 0.98 + fill * 0.18;
    color *= 0.72 + smoothstep(-0.25, 0.8, normal.y) * 0.22;
    float heat = clamp(uHeat * uBodyHeat, 0.0, 1.6);
    color += vec3(1.0, 0.32, 0.04) * rim * heat * 1.15;
    color += vec3(0.25, 0.38, 0.8) * rim * (1.0 - heat * 0.4) * 0.12;
    color += vec3(1.0, 0.72, 0.22) * pow(heat, 1.4) * 0.12;
    color = floor(color * 18.0) / 18.0;
    gl_FragColor = vec4(color, uOpacity);
  }
`;

export function createLensingShader(uniforms) {
  return {
    uniforms: uniforms.lensing,
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform vec2 uCenter;
      uniform float uRadius;
      uniform float uLensingStrength;
      uniform float uPhotonRingStrength;
      uniform float uTime;

      varying vec2 vUv;

      void main() {
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        vec2 delta = vUv - uCenter;
        delta.x *= aspect;

        float dist = length(delta);
        vec2 dir = delta / max(dist, 0.0001);
        float field = smoothstep(uRadius * 3.2, uRadius * 0.68, dist);
        float bend = field * uLensingStrength * 0.011 / (dist + 0.065);
        float steppedTime = floor(uTime * 24.0) / 24.0;
        float swirl = sin(dist * 30.0 - steppedTime * 1.8) * field * 0.0022 * uLensingStrength;

        vec2 offset = dir * bend + vec2(-dir.y, dir.x) * swirl;
        offset.x /= aspect;

        vec2 redUv = clamp(vUv - offset * 1.015, 0.001, 0.999);
        vec2 greenUv = clamp(vUv - offset, 0.001, 0.999);
        vec2 blueUv = clamp(vUv - offset * 0.985, 0.001, 0.999);

        vec3 color;
        color.r = texture2D(tDiffuse, redUv).r;
        color.g = texture2D(tDiffuse, greenUv).g;
        color.b = texture2D(tDiffuse, blueUv).b;

        float coreShadow = 1.0 - smoothstep(uRadius * 0.72, uRadius * 1.02, dist);
        float angle = atan(delta.y, delta.x);
        float brokenPhoton = 0.68 + 0.22 * sin(angle * 5.0 + uTime * 0.7) + 0.1 * sin(angle * 13.0 - uTime * 0.35);
        float photonRing = exp(-pow((dist - uRadius * 1.15) / max(uRadius * 0.058, 0.001), 2.0)) * brokenPhoton;
        float outerCaustic = exp(-pow((dist - uRadius * 1.62) / max(uRadius * 0.12, 0.001), 2.0));
        vec3 ringColor = vec3(1.0, 0.62, 0.14) * photonRing * 0.026 * uPhotonRingStrength;
        ringColor += vec3(0.95, 0.26, 0.04) * outerCaustic * 0.015 * uLensingStrength;

        color += ringColor;
        color = mix(color, vec3(0.0), coreShadow);
        color *= 1.0 + field * 0.07;

        gl_FragColor = vec4(color, 1.0);
      }
    `
  };
}

export function createPixelShader(uniforms) {
  return {
    uniforms: uniforms.pixel,
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform vec2 uCenter;
      uniform float uRadius;
      uniform float uPixelSize;
      uniform float uColorSteps;

      varying vec2 vUv;

      const float TAU = 6.28318530718;

      void main() {
        vec2 pixel = vec2(uPixelSize) / max(uResolution, vec2(1.0));
        vec2 uv = (floor(vUv / pixel) + 0.5) * pixel;
        vec3 color = texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;

        float aspect = uResolution.x / max(uResolution.y, 1.0);
        vec2 delta = vUv - uCenter;
        delta.x *= aspect;
        float sides = 72.0;
        float sector = TAU / sides;
        float angle = atan(delta.y, delta.x);
        float polygon = cos(sector * 0.5) / cos(mod(angle + sector * 0.5, sector) - sector * 0.5);
        float polyDist = length(delta) * polygon;
        float horizon = 1.0 - smoothstep(uRadius * 0.94, uRadius * 1.02, polyDist);
        float finalRing = exp(-pow((polyDist - uRadius * 1.1) / max(uRadius * 0.06, 0.001), 2.0));

        color += vec3(1.0, 0.58, 0.12) * finalRing * 0.006;
        color = mix(color, vec3(0.0), horizon);
        color = pow(color, vec3(0.94));
        float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        color += dither / uColorSteps * 0.16 * (1.0 - horizon);
        color = floor(color * uColorSteps) / uColorSteps;
        float scanline = 0.992 + 0.008 * step(0.5, fract(gl_FragCoord.y * 0.5));
        gl_FragColor = vec4(color * scanline, 1.0);
      }
    `
  };
}
