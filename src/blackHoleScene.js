import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCaptureParticles } from './captureParticles.js';
import { createControls } from './controls.js';
import { createOrbitingBodies } from './orbitingBodies.js';
import {
  createAccretionDisk,
  createDeepSpaceActivity,
  createEventHorizon,
  createFallingDust,
  createLowPolyDebris,
  createNebulaClouds,
  createParallaxStars,
  createStarClusters,
  createStarfield,
  createVolumetricDisk
} from './objects.js';
import { createPostProcessing } from './postprocessing.js';
import { QUALITY_PROFILES, chooseQualityProfile } from './sceneConfig.js';
import { createShaderUniforms } from './shaders.js';

function createPixelRatioReader(qualityProfile) {
  let current = Math.min(window.devicePixelRatio || 1, qualityProfile.pixelRatioCap);
  return {
    get current() {
      return current;
    },
    refresh() {
      current = Math.min(window.devicePixelRatio || 1, qualityProfile.pixelRatioCap);
      return current;
    }
  };
}

function setUniformResolution(uniforms, width, height) {
  uniforms.global.uResolution.value.set(width, height);
  uniforms.lensing.uResolution.value.set(width, height);
  uniforms.pixel.uResolution.value.set(width, height);
}

function createProjectedLensingUpdater() {
  const centerWorld = new THREE.Vector3();
  const projectedCenter = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const projectedEdge = new THREE.Vector3();

  return (camera, origin, uniforms) => {
    origin.getWorldPosition(centerWorld);
    projectedCenter.copy(centerWorld).project(camera);
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    projectedEdge.copy(centerWorld).addScaledVector(cameraRight, 1.62 * origin.scale.x).project(camera);

    uniforms.lensing.uCenter.value.set(projectedCenter.x * 0.5 + 0.5, projectedCenter.y * 0.5 + 0.5);
    uniforms.pixel.uCenter.value.copy(uniforms.lensing.uCenter.value);

    const projectedRadius = Math.abs(projectedEdge.x - projectedCenter.x) * 0.5 * camera.aspect;
    const maxRadius = camera.aspect < 0.75 ? 0.13 : 0.2;
    const minRadius = camera.aspect < 0.75 ? 0.05 : 0.065;
    uniforms.lensing.uRadius.value = THREE.MathUtils.clamp(projectedRadius * 1.16, minRadius, maxRadius);
    uniforms.pixel.uRadius.value = uniforms.lensing.uRadius.value * 1.02;
  };
}

export function createBlackHoleApp(container) {
  if (!container) {
    throw new Error('A root container is required for the black hole render.');
  }

  const profileName = chooseQualityProfile({
    width: Math.max(container.clientWidth, window.innerWidth, 1),
    height: Math.max(container.clientHeight, window.innerHeight, 1),
    devicePixelRatio: window.devicePixelRatio || 1
  });
  const qualityProfile = QUALITY_PROFILES[profileName];
  const pixelRatio = createPixelRatioReader(qualityProfile);
  const uniforms = createShaderUniforms();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(pixelRatio.current);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.domElement.setAttribute('aria-label', 'cinematic stylized black hole shader canvas');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020206, 0.013);

  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    160
  );
  const getDefaultCameraPosition = () => {
    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    return new THREE.Vector3(0, aspect < 0.75 ? 0.48 : 0.36, aspect < 0.75 ? 27.8 : 15.8);
  };
  camera.position.copy(getDefaultCameraPosition());

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.075;
  orbitControls.minDistance = 4.2;
  orbitControls.maxDistance = 30;
  orbitControls.enablePan = false;
  orbitControls.target.set(0, -0.08, 0);
  orbitControls.update();

  const blackHole = new THREE.Group();
  const volumetricDisk = createVolumetricDisk(uniforms, qualityProfile.diskSegments);
  const accretionDisk = createAccretionDisk(uniforms, qualityProfile.diskSegments);
  const eventHorizon = createEventHorizon();
  const fallingDust = createFallingDust(uniforms, qualityProfile.particles.fallingDust);
  const captureParticles = createCaptureParticles({ count: qualityProfile.particles.capture, uniforms });
  const orbitingBodies = createOrbitingBodies({ uniforms });
  const debrisBelt = createLowPolyDebris();
  const parallaxStars = createParallaxStars(qualityProfile.particles.parallax);
  const starClusters = createStarClusters(uniforms, qualityProfile.particles.clusters);
  const nebulaClouds = createNebulaClouds(uniforms);
  const deepSpaceActivity = createDeepSpaceActivity();

  scene.add(createStarfield(uniforms));
  scene.add(nebulaClouds.group);
  scene.add(starClusters.points);
  scene.add(deepSpaceActivity.group);
  scene.add(parallaxStars.points);
  blackHole.add(volumetricDisk.group);
  blackHole.add(accretionDisk);
  blackHole.add(fallingDust);
  blackHole.add(captureParticles.points);
  blackHole.add(eventHorizon);
  blackHole.add(debrisBelt);
  blackHole.add(orbitingBodies.group);
  scene.add(blackHole);

  const keyLight = new THREE.DirectionalLight(0xffb06a, 1.65);
  keyLight.position.set(-4.4, 3.8, 5.5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x6f8cff, 0.72);
  rimLight.position.set(5, -2, 4);
  scene.add(rimLight);
  scene.add(new THREE.AmbientLight(0x243040, 0.28));

  const { bloomPass, composer, setBloomEnabled, setPixelEnabled } = createPostProcessing({
    renderer,
    scene,
    camera,
    container,
    uniforms
  });
  bloomPass.strength *= qualityProfile.bloomScale;
  setBloomEnabled(qualityProfile.postprocessing.bloom);
  setPixelEnabled(qualityProfile.postprocessing.pixel);

  const clock = new THREE.Clock();
  let animationFrame = 0;
  let timeOffset = 0;
  let cameraDriftEnabled = true;
  let running = false;
  const updateProjectedLensing = createProjectedLensingUpdater();

  const getSceneTime = () => clock.getElapsedTime() - timeOffset;
  const resetAnimation = () => {
    timeOffset = clock.getElapsedTime();
    cameraDriftEnabled = true;
  };
  orbitControls.addEventListener('start', () => {
    cameraDriftEnabled = false;
  });

  const renderOnce = () => {
    updateProjectedLensing(camera, blackHole, uniforms);
    composer.render();
  };

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setPixelRatio(pixelRatio.refresh());
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    blackHole.scale.setScalar(camera.aspect < 0.75 ? qualityProfile.mobileScale : 1);
    setUniformResolution(uniforms, width, height);
    renderOnce();
  };

  const gui = createControls({
    bloomPass,
    camera,
    container,
    getDefaultCameraPosition,
    orbitControls,
    renderOnce,
    renderer,
    resetAnimation,
    bloomAvailable: qualityProfile.postprocessing.bloom,
    pixelAvailable: true,
    setBloomEnabled,
    setPixelEnabled,
    setPlanetVisibility: orbitingBodies.setVisibility,
    uniforms
  });

  const render = () => {
    if (!running) return;
    const elapsed = getSceneTime();
    uniforms.global.uTime.value = elapsed;
    uniforms.disk.uTime.value = elapsed;
    uniforms.starfield.uTime.value = elapsed;
    uniforms.lensing.uTime.value = elapsed;
    uniforms.dust.uTime.value = elapsed;
    uniforms.dust.uPixelRatio.value = pixelRatio.current;
    uniforms.capture.uPixelRatio.value = pixelRatio.current;

    blackHole.rotation.y = Math.sin(elapsed * 0.12) * 0.035;
    volumetricDisk.update(elapsed);
    debrisBelt.rotation.z = elapsed * 0.12;
    fallingDust.rotation.z = elapsed * 0.08;
    nebulaClouds.update(elapsed);
    starClusters.update(elapsed, pixelRatio.current);
    deepSpaceActivity.update(elapsed);
    parallaxStars.update(elapsed);
    captureParticles.update(elapsed);
    orbitingBodies.update(elapsed);
    if (cameraDriftEnabled && uniforms.global.uCameraDrift.value > 0) {
      const defaultPosition = getDefaultCameraPosition();
      const drift = uniforms.global.uCameraDrift.value;
      camera.position.set(
        defaultPosition.x + Math.sin(elapsed * 0.12) * 0.36 * drift,
        defaultPosition.y + Math.sin(elapsed * 0.09 + 1.2) * 0.12 * drift,
        defaultPosition.z + Math.cos(elapsed * 0.08) * 0.28 * drift
      );
      orbitControls.target.set(Math.sin(elapsed * 0.07) * 0.04 * drift, -0.08, 0);
    }
    orbitControls.update();
    renderOnce();
    animationFrame = window.requestAnimationFrame(render);
  };

  const start = () => {
    if (running) return;
    running = true;
    clock.start();
    animationFrame = window.requestAnimationFrame(render);
  };
  const stop = () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
    clock.stop();
  };
  const handleVisibilityChange = () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  };
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(container);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  resize();
  start();

  return {
    dispose() {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver?.disconnect();
      gui.destroy();
      orbitControls.dispose();
      composer.dispose();
      captureParticles.dispose();
      orbitingBodies.dispose();
      volumetricDisk.dispose();
      parallaxStars.dispose();
      starClusters.dispose();
      nebulaClouds.dispose();
      deepSpaceActivity.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
  };
}
