import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createLensingShader, createPixelShader } from './shaders.js';

export function createPostProcessing({ renderer, scene, camera, container, uniforms }) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const lensPass = new ShaderPass(createLensingShader(uniforms));

  uniforms.lensing = lensPass.uniforms;

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0.22,
    0.12,
    0.74
  );
  const pixelPass = new ShaderPass(createPixelShader(uniforms));

  uniforms.pixel = pixelPass.uniforms;

  composer.addPass(renderPass);
  composer.addPass(lensPass);
  composer.addPass(bloomPass);
  composer.addPass(pixelPass);
  composer.addPass(new OutputPass());

  return {
    bloomPass,
    composer,
    lensPass,
    pixelPass,
    setBloomEnabled(enabled) {
      bloomPass.enabled = enabled;
    },
    setPixelEnabled(enabled) {
      pixelPass.enabled = enabled;
    }
  };
}
