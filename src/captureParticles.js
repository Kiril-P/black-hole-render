import * as THREE from 'three';
import { captureFragmentShader, captureVertexShader } from './shaders.js';

export function createCaptureParticles({ count = 460, uniforms }) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const orbits = new Float32Array(count);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    seeds[i] = ((i * 97) % count) / count;
    orbits[i] = ((i * 31) % 100) / 100;
    phases[i] = (((i * 53) % count) / count) * Math.PI * 2;
    sizes[i] = 1.0 + ((i * 17) % 6) * 0.55;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aOrbit', new THREE.BufferAttribute(orbits, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms.capture,
    vertexShader: captureVertexShader,
    fragmentShader: captureFragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'orbital capture particle streams';
  points.renderOrder = 4;
  points.rotation.x = THREE.MathUtils.degToRad(58);
  points.rotation.z = THREE.MathUtils.degToRad(-14);

  return {
    points,
    update(elapsed) {
      uniforms.capture.uTime.value = elapsed;
      points.rotation.y = Math.sin(elapsed * 0.13) * 0.06;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}
