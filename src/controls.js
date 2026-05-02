import { VISUAL_PRESETS, getDebugEnabled } from './sceneConfig.js';

function applyValues(
  { bloomAvailable, params, pixelAvailable, renderer, uniforms, bloomPass, setBloomEnabled, setPixelEnabled, setPlanetVisibility },
  values
) {
  params.lensing = values.lensing;
  params.diskDepth = values.diskDepth;
  params.diskBrightness = values.diskBrightness;
  params.diskTurbulence = values.diskTurbulence;
  params.photonRing = values.photonRing;
  params.planetVisibility = values.planetVisibility;
  params.bloom = values.bloom;
  params.stars = values.stars;
  params.cleanCinematic = values.cleanCinematic;

  uniforms.lensing.uLensingStrength.value = values.lensing;
  uniforms.lensing.uPhotonRingStrength.value = values.photonRing;
  uniforms.disk.uDiskSpeed.value = values.diskSpeed;
  uniforms.disk.uGlowIntensity.value = values.diskBrightness;
  uniforms.disk.uPaletteWarmth.value = values.warmth;
  uniforms.disk.uDiskTurbulence.value = values.diskTurbulence;
  uniforms.disk.uDiskDepth.value = values.diskDepth;
  uniforms.disk.uDiskAsymmetry.value = values.diskAsymmetry;
  uniforms.disk.uDopplerStrength.value = values.doppler;
  uniforms.disk.uPhotonRingStrength.value = values.photonRing;
  uniforms.starfield.uStarDensity.value = values.stars;
  uniforms.dust.uDiskSpeed.value = values.diskSpeed;
  uniforms.dust.uCaptureIntensity.value = values.objectCapture;
  uniforms.capture.uCaptureIntensity.value = values.objectCapture;
  uniforms.bodies.uBodyHeat.value = values.bodyHeat;
  uniforms.bodies.uPlanetVisibility.value = values.planetVisibility;
  uniforms.global.uCameraDrift.value = values.cameraDrift;
  uniforms.pixel.uPixelSize.value = values.pixels;
  uniforms.pixel.uColorSteps.value = values.colorSteps;
  setPlanetVisibility(values.planetVisibility);
  bloomPass.strength = values.bloom;
  renderer.toneMappingExposure = values.exposure;
  setBloomEnabled(bloomAvailable && values.bloom > 0);
  setPixelEnabled(pixelAvailable && !values.cleanCinematic);
}

function downloadBlob(blob) {
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const url = URL.createObjectURL(blob);
  link.download = `black-hole-${timestamp}.png`;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createExporter({ renderOnce, renderer }) {
  return () => {
    renderOnce();
    renderer.domElement.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob);
      }
    }, 'image/png');
  };
}

function createButton(label, onClick, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = className;
  button.addEventListener('click', onClick);
  return button;
}

function createViewerControls({ container, onPresetChange, onCleanToggle, params, presetNames, exportImage, resetView }) {
  const panel = document.createElement('section');
  panel.className = 'viewer-controls';
  panel.setAttribute('aria-label', 'Black hole render controls');

  const title = document.createElement('div');
  title.className = 'viewer-title';
  title.textContent = 'Black Hole Render';

  const presetSelect = document.createElement('select');
  presetSelect.setAttribute('aria-label', 'Visual preset');
  presetNames.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    presetSelect.appendChild(option);
  });
  presetSelect.value = params.preset;
  const handlePresetChange = () => onPresetChange(presetSelect.value);
  presetSelect.addEventListener('change', handlePresetChange);

  const cleanLabel = document.createElement('label');
  cleanLabel.className = 'toggle-control';
  const cleanToggle = document.createElement('input');
  cleanToggle.type = 'checkbox';
  cleanToggle.checked = params.cleanCinematic;
  const handleCleanToggle = () => onCleanToggle(cleanToggle.checked);
  cleanToggle.addEventListener('change', handleCleanToggle);
  cleanLabel.append(cleanToggle, document.createTextNode(' clean'));

  const resetButton = createButton('reset', resetView);
  const exportButton = createButton('export', exportImage, 'primary-action');

  const actions = document.createElement('div');
  actions.className = 'viewer-actions';
  actions.append(resetButton, exportButton);

  panel.append(title, presetSelect, cleanLabel, actions);
  container.appendChild(panel);

  return {
    setPreset(name) {
      presetSelect.value = name;
      cleanToggle.checked = params.cleanCinematic;
    },
    setClean(value) {
      cleanToggle.checked = value;
    },
    destroy() {
      presetSelect.removeEventListener('change', handlePresetChange);
      cleanToggle.removeEventListener('change', handleCleanToggle);
      panel.remove();
    }
  };
}

async function createDebugGui(context, onUpdateDisplays) {
  if (!getDebugEnabled()) return null;

  const { default: GUI } = await import('lil-gui');
  const { bloomPass, params, renderOnce, uniforms, applyPreset, setPlanetVisibility } = context;
  const gui = new GUI({ title: 'shader controls', width: 300 });
  const controllers = [];

  controllers.push(gui.add(params, 'preset', Object.keys(VISUAL_PRESETS)).name('preset').onChange(applyPreset));
  controllers.push(
    gui.add(params, 'lensing', 0.2, 2.2, 0.01).name('lensing').onChange((value) => {
      uniforms.lensing.uLensingStrength.value = value;
    })
  );
  controllers.push(
    gui.add(params, 'diskDepth', 0.25, 1.25, 0.01).name('disk depth').onChange((value) => {
      uniforms.disk.uDiskDepth.value = value;
    })
  );
  controllers.push(
    gui.add(params, 'diskBrightness', 0.25, 1.25, 0.01).name('disk brightness').onChange((value) => {
      uniforms.disk.uGlowIntensity.value = value;
    })
  );
  controllers.push(
    gui.add(params, 'photonRing', 0.1, 1.35, 0.01).name('photon ring').onChange((value) => {
      uniforms.disk.uPhotonRingStrength.value = value;
      uniforms.lensing.uPhotonRingStrength.value = value;
    })
  );
  controllers.push(
    gui.add(params, 'planetVisibility', 0, 1, 0.01).name('planet visibility').onChange((value) => {
      uniforms.bodies.uPlanetVisibility.value = value;
      setPlanetVisibility(value);
    })
  );
  controllers.push(
    gui.add(params, 'bloom', 0, 0.8, 0.01).name('bloom').onChange((value) => {
      bloomPass.strength = value;
    })
  );
  controllers.push(
    gui.add(params, 'stars', 0.1, 1, 0.01).name('stars').onChange((value) => {
      uniforms.starfield.uStarDensity.value = value;
    })
  );
  gui.add(params, 'cleanCinematic').name('clean render').onChange((value) => {
    context.setPixelEnabled(context.pixelAvailable && !value);
    renderOnce();
  });
  gui.add(params, 'resetView').name('reset view');
  gui.add(params, 'exportImage').name('export png');

  onUpdateDisplays(() => controllers.forEach((controller) => controller.updateDisplay()));
  return gui;
}

export function createControls({
  bloomPass,
  bloomAvailable = true,
  camera,
  container,
  getDefaultCameraPosition,
  orbitControls,
  renderOnce,
  renderer,
  resetAnimation,
  pixelAvailable = true,
  setBloomEnabled,
  setPixelEnabled,
  setPlanetVisibility = () => {},
  uniforms
}) {
  const params = {
    preset: 'Cinematic',
    cleanCinematic: true,
    lensing: uniforms.lensing.uLensingStrength.value,
    diskDepth: uniforms.disk.uDiskDepth.value,
    diskBrightness: uniforms.disk.uGlowIntensity.value,
    diskTurbulence: uniforms.disk.uDiskTurbulence.value,
    photonRing: uniforms.disk.uPhotonRingStrength.value,
    planetVisibility: uniforms.bodies.uPlanetVisibility.value,
    bloom: bloomPass.strength,
    stars: uniforms.starfield.uStarDensity.value,
    resetView: () => {
      resetAnimation();
      camera.position.copy(getDefaultCameraPosition());
      orbitControls.target.set(0, -0.08, 0);
      orbitControls.update();
      renderOnce();
    },
    exportImage: createExporter({ renderer, renderOnce })
  };

  const presetContext = {
    params,
    bloomAvailable,
    pixelAvailable,
    renderer,
    uniforms,
    bloomPass,
    setBloomEnabled,
    setPixelEnabled,
    setPlanetVisibility
  };
  let updateDebugDisplays = () => {};
  let debugGui = null;
  let destroyed = false;

  const applyPreset = (name) => {
    params.preset = name;
    applyValues(presetContext, VISUAL_PRESETS[name]);
    viewerControls.setPreset(name);
    updateDebugDisplays();
    renderOnce();
  };

  const viewerControls = createViewerControls({
    container,
    params,
    presetNames: Object.keys(VISUAL_PRESETS),
    exportImage: params.exportImage,
    resetView: params.resetView,
    onPresetChange: applyPreset,
    onCleanToggle: (enabled) => {
      params.cleanCinematic = enabled;
      setPixelEnabled(pixelAvailable && !enabled);
      viewerControls.setClean(enabled);
      renderOnce();
    }
  });

  applyValues(presetContext, VISUAL_PRESETS.Cinematic);
  viewerControls.setPreset('Cinematic');

  createDebugGui(
    {
      ...presetContext,
      applyPreset,
      bloomPass,
      params,
      renderOnce,
      setPlanetVisibility,
      setPixelEnabled,
      uniforms
    },
    (updater) => {
      updateDebugDisplays = updater;
    }
  ).then((gui) => {
    if (destroyed) {
      gui?.destroy();
      return;
    }
    debugGui = gui;
    updateDebugDisplays();
  });

  return {
    destroy() {
      destroyed = true;
      debugGui?.destroy();
      viewerControls.destroy();
    }
  };
}
