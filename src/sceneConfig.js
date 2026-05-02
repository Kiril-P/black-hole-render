export const QUALITY_PROFILES = {
  'cinematic-desktop': {
    label: 'Cinematic Desktop',
    pixelRatioCap: 2,
    diskSegments: { radial: 384, tubular: 28, volumeRadial: 288, volumeTubular: 22 },
    particles: { fallingDust: 360, capture: 460, clusters: 520, parallax: 260 },
    postprocessing: { bloom: true, pixel: false },
    bloomScale: 1,
    mobileScale: 1
  },
  'cinematic-mobile': {
    label: 'Cinematic Mobile',
    pixelRatioCap: 1.35,
    diskSegments: { radial: 256, tubular: 20, volumeRadial: 192, volumeTubular: 16 },
    particles: { fallingDust: 260, capture: 320, clusters: 360, parallax: 180 },
    postprocessing: { bloom: true, pixel: false },
    bloomScale: 0.78,
    mobileScale: 0.58
  },
  'performance-mobile': {
    label: 'Performance Mobile',
    pixelRatioCap: 1,
    diskSegments: { radial: 176, tubular: 14, volumeRadial: 128, volumeTubular: 10 },
    particles: { fallingDust: 180, capture: 220, clusters: 240, parallax: 120 },
    postprocessing: { bloom: false, pixel: false },
    bloomScale: 0,
    mobileScale: 0.58
  }
};

export const VISUAL_PRESETS = {
  Minimal: {
    lensing: 0.86,
    diskDepth: 0.5,
    diskBrightness: 0.56,
    diskTurbulence: 0.48,
    diskAsymmetry: 0.52,
    photonRing: 0.3,
    planetVisibility: 0.44,
    objectCapture: 0.18,
    bloom: 0.13,
    stars: 0.58,
    diskSpeed: 1.2,
    warmth: 0.78,
    doppler: 0.34,
    bodyHeat: 0.62,
    cameraDrift: 0.16,
    pixels: 1.0,
    colorSteps: 80,
    exposure: 0.84,
    cleanCinematic: true
  },
  Cinematic: {
    lensing: 1.28,
    diskDepth: 0.82,
    diskBrightness: 0.78,
    diskTurbulence: 0.75,
    diskAsymmetry: 0.76,
    photonRing: 0.52,
    planetVisibility: 0.86,
    objectCapture: 0.42,
    bloom: 0.3,
    stars: 0.75,
    diskSpeed: 1.65,
    warmth: 0.92,
    doppler: 0.7,
    bodyHeat: 1.0,
    cameraDrift: 0.38,
    pixels: 1.0,
    colorSteps: 64,
    exposure: 0.9,
    cleanCinematic: true
  },
  'High Energy': {
    lensing: 1.65,
    diskDepth: 1.0,
    diskBrightness: 0.96,
    diskTurbulence: 1.0,
    diskAsymmetry: 1.0,
    photonRing: 0.84,
    planetVisibility: 0.94,
    objectCapture: 0.78,
    bloom: 0.52,
    stars: 0.9,
    diskSpeed: 2.05,
    warmth: 0.98,
    doppler: 1.0,
    bodyHeat: 1.28,
    cameraDrift: 0.5,
    pixels: 1.08,
    colorSteps: 52,
    exposure: 1.0,
    cleanCinematic: false
  }
};

export function chooseQualityProfile({ width, height, devicePixelRatio }) {
  const shortSide = Math.min(width, height);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const narrowViewport = width < 720 || shortSide < 480;
  const highDensityMobile = narrowViewport && devicePixelRatio > 2;

  if (highDensityMobile) return 'performance-mobile';
  if (narrowViewport || coarsePointer) return 'cinematic-mobile';
  return 'cinematic-desktop';
}

export function getDebugEnabled() {
  return new URLSearchParams(window.location.search).has('debug');
}
