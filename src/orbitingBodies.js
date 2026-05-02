import * as THREE from 'three';

const TAU = Math.PI * 2;
const origin = new THREE.Vector3();

function smoothstep(edge0, edge1, value) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function orbitPosition(orbit, elapsed) {
  const theta = elapsed * orbit.speed + orbit.phase;
  const p = orbit.semiMajor * (1 - orbit.eccentricity * orbit.eccentricity);
  const radius = p / (1 + orbit.eccentricity * Math.cos(theta));
  const position = new THREE.Vector3(
    Math.cos(theta) * radius,
    Math.sin(theta * 0.7 + orbit.phase) * orbit.vertical,
    Math.sin(theta) * radius * orbit.flatten
  );
  position.applyEuler(orbit.rotation);
  return position;
}

function seeded(seed) {
  return Math.abs(Math.sin(seed * 127.1) * 43758.5453) % 1;
}

function createPlanetTexture({ baseColor, accentColor, highlightColor, seed }) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const base = new THREE.Color(baseColor);
  const accent = new THREE.Color(accentColor);
  const highlight = new THREE.Color(highlightColor);

  context.fillStyle = `#${base.getHexString()}`;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    const band = Math.sin(y * 0.055 + seed * 4.7) * 0.5 + 0.5;
    const stripe = Math.sin(y * 0.19 + seed * 1.9) * 0.5 + 0.5;
    const mix = THREE.MathUtils.clamp(band * 0.52 + stripe * 0.18, 0, 1);
    const color = base.clone().lerp(accent, mix);
    context.fillStyle = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.42)`;
    context.fillRect(0, y, canvas.width, 1);
  }

  for (let i = 0; i < 90; i += 1) {
    const x = seeded(seed + i * 1.23) * canvas.width;
    const y = seeded(seed + i * 2.91) * canvas.height;
    const radiusX = 16 + seeded(seed + i * 4.4) * 76;
    const radiusY = 4 + seeded(seed + i * 5.7) * 24;
    context.save();
    context.translate(x, y);
    context.rotate((seeded(seed + i * 7.1) - 0.5) * 0.42);
    const color = accent.clone().lerp(highlight, seeded(seed + i * 3.7) * 0.45);
    context.fillStyle = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.16)`;
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
    context.fill();
    context.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

function createPlanetMaterial(options) {
  const map = createPlanetTexture(options);
  const material = new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.04,
    emissive: new THREE.Color(options.emissiveColor),
    emissiveIntensity: 0.02,
    transparent: true,
    opacity: 1
  });
  material.userData.texture = map;
  return material;
}

function createAtmosphere(color) {
  const geometry = new THREE.IcosahedronGeometry(1.04, 3);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.34 }
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.4);
        gl_FragColor = vec4(uColor * rim, rim * uOpacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide
  });
  return new THREE.Mesh(geometry, material);
}

function createPlanet(options) {
  const group = new THREE.Group();
  const material = createPlanetMaterial(options);
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, options.detail), material);
  mesh.name = options.name;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);

  const atmosphere = createAtmosphere(options.rimColor);
  atmosphere.name = `${options.name} rim glow`;
  group.add(atmosphere);

  const ring = options.ring
    ? new THREE.Mesh(
        new THREE.RingGeometry(1.28, 1.72, 96, 2),
        new THREE.MeshBasicMaterial({
          color: options.ring.color,
          transparent: true,
          opacity: options.ring.opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
    : null;

  if (ring) {
    ring.name = `${options.name} thin orbital ring`;
    ring.rotation.x = THREE.MathUtils.degToRad(78);
    ring.rotation.z = THREE.MathUtils.degToRad(-18);
    group.add(ring);
  }

  return {
    group,
    mesh,
    material,
    atmosphere,
    ring,
    baseScale: options.baseScale,
    spin: options.spin,
    orbit: options.orbit,
    heatColor: new THREE.Color(options.heatColor)
  };
}

function createTrail(orbit, color) {
  const points = [];
  for (let i = 0; i <= 180; i += 1) {
    const theta = (i / 180) * TAU;
    const p = orbit.semiMajor * (1 - orbit.eccentricity * orbit.eccentricity);
    const radius = p / (1 + orbit.eccentricity * Math.cos(theta));
    const point = new THREE.Vector3(
      Math.cos(theta) * radius,
      Math.sin(theta * 0.7 + orbit.phase) * orbit.vertical,
      Math.sin(theta) * radius * orbit.flatten
    );
    point.applyEuler(orbit.rotation);
    points.push(point);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.035,
    depthWrite: false
  });
  const line = new THREE.LineLoop(geometry, material);
  line.name = 'faint distant orbital trail';
  return line;
}

function updateBody(body, elapsed, visibility, heatBoost) {
  const position = orbitPosition(body.orbit, elapsed);
  const distance = position.length();
  const approach = 1 - smoothstep(7.2, 10.2, distance);
  const heat = THREE.MathUtils.clamp(approach * heatBoost, 0, 1.4);
  const stretch = 1 + approach * 0.22;

  body.group.position.copy(position);
  body.group.lookAt(origin);
  body.mesh.rotation.y += body.spin;
  body.mesh.rotation.x += body.spin * 0.28;
  body.group.scale.set(body.baseScale * (1 - approach * 0.035), body.baseScale, body.baseScale * stretch);
  body.material.emissive.copy(body.heatColor);
  body.material.emissiveIntensity = 0.025 + heat * 0.42;
  body.material.opacity = visibility;
  body.atmosphere.material.uniforms.uOpacity.value = (0.2 + heat * 0.34) * visibility;
  body.atmosphere.visible = visibility > 0.03;
  body.mesh.visible = visibility > 0.03;
  if (body.ring) {
    body.ring.material.opacity = 0.18 * visibility + heat * 0.08;
    body.ring.visible = visibility > 0.03;
  }

  return { position, approach, heat };
}

function createAsteroids() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x2b2b3b,
    roughness: 0.88,
    metalness: 0.06,
    flatShading: true,
    emissive: 0x120604,
    emissiveIntensity: 0.08,
    transparent: true,
    opacity: 0.55
  });
  const asteroids = [];

  for (let i = 0; i < 12; i += 1) {
    const geometry =
      i % 3 === 0
        ? new THREE.OctahedronGeometry(0.055 + ((i * 11) % 8) * 0.006, 0)
        : new THREE.DodecahedronGeometry(0.06 + ((i * 7) % 9) * 0.005, 0);
    const mesh = new THREE.Mesh(geometry, material);
    const orbit = {
      semiMajor: 11.6 + ((i * 29) % 34) * 0.17,
      eccentricity: 0.1 + (((i * 13) % 12) / 100),
      flatten: 0.34 + (((i * 17) % 10) / 100),
      vertical: (((i * 19) % 17) - 8) * 0.08,
      speed: 0.045 + (((i * 23) % 16) / 220),
      phase: (i / 12) * TAU,
      rotation: new THREE.Euler(THREE.MathUtils.degToRad(72), 0, THREE.MathUtils.degToRad(-16 + (i % 5)))
    };
    mesh.rotation.set(i * 0.7, i * 1.1, i * 0.31);
    group.add(mesh);
    asteroids.push({ mesh, orbit, spin: 0.004 + (i % 6) * 0.0015 });
  }

  return { group, asteroids, material };
}

export function createOrbitingBodies({ uniforms }) {
  const group = new THREE.Group();
  group.name = 'distant stylized orbiting planets and sparse debris';

  const planetA = createPlanet({
    name: 'large blue captured planet',
    baseColor: 0x1d416c,
    accentColor: 0x5aa2c7,
    highlightColor: 0xd8f1ff,
    emissiveColor: 0x1a3a54,
    heatColor: 0xff7a18,
    rimColor: 0x7cc8ff,
    seed: 3.2,
    detail: 5,
    baseScale: 0.58,
    spin: 0.006,
    ring: { color: 0x82b8ff, opacity: 0.16 },
    orbit: {
      semiMajor: 11.4,
      eccentricity: 0.24,
      flatten: 0.5,
      vertical: 1.05,
      speed: 0.085,
      phase: 2.4,
      rotation: new THREE.Euler(THREE.MathUtils.degToRad(23), THREE.MathUtils.degToRad(-20), THREE.MathUtils.degToRad(17))
    }
  });

  const planetB = createPlanet({
    name: 'large ember captured planet',
    baseColor: 0x613033,
    accentColor: 0xd3733d,
    highlightColor: 0xffd08a,
    emissiveColor: 0x3a1208,
    heatColor: 0xffb13c,
    rimColor: 0xff9c4b,
    seed: 8.7,
    detail: 4,
    baseScale: 0.42,
    spin: -0.007,
    orbit: {
      semiMajor: 13.2,
      eccentricity: 0.2,
      flatten: 0.42,
      vertical: 0.74,
      speed: 0.068,
      phase: 5.15,
      rotation: new THREE.Euler(THREE.MathUtils.degToRad(-12), THREE.MathUtils.degToRad(26), THREE.MathUtils.degToRad(-24))
    }
  });

  const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a8490,
    roughness: 0.86,
    metalness: 0.02,
    flatShading: true,
    emissive: 0x150d0a,
    emissiveIntensity: 0.02,
    transparent: true,
    opacity: 1
  });
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), moonMaterial);
  moon.name = 'small moon around blue planet';

  const trailA = createTrail(planetA.orbit, 0x4e77b1);
  const trailB = createTrail(planetB.orbit, 0xaa5b34);
  group.add(trailA, trailB, planetA.group, planetB.group, moon);

  const { group: asteroidGroup, asteroids, material: asteroidMaterial } = createAsteroids();
  asteroidGroup.name = 'sparse distant low-poly debris';
  group.add(asteroidGroup);

  const bodies = [planetA, planetB];

  const setVisibility = (value) => {
    const visibility = THREE.MathUtils.clamp(value, 0, 1);
    uniforms.bodies.uPlanetVisibility.value = visibility;
    group.visible = visibility > 0.01;
  };

  return {
    group,
    update(elapsed) {
      uniforms.bodies.uTime.value = elapsed;
      const visibility = uniforms.bodies.uPlanetVisibility.value;
      const heatBoost = uniforms.bodies.uBodyHeat.value;
      const stateA = updateBody(planetA, elapsed, visibility, heatBoost);
      updateBody(planetB, elapsed, visibility, heatBoost);

      const moonAngle = elapsed * 0.85 + 1.7;
      const moonOffset = new THREE.Vector3(Math.cos(moonAngle) * 0.72, Math.sin(moonAngle * 0.8) * 0.18, Math.sin(moonAngle) * 0.5);
      moon.position.copy(stateA.position).add(moonOffset);
      moon.lookAt(origin);
      moon.scale.setScalar(0.095 * visibility);
      moon.rotation.y += 0.01;
      moonMaterial.emissiveIntensity = 0.02 + stateA.heat * 0.16;
      moonMaterial.opacity = visibility;
      moon.visible = visibility > 0.05;

      asteroids.forEach((asteroid, index) => {
        const position = orbitPosition(asteroid.orbit, elapsed);
        const distance = position.length();
        const approach = 1 - smoothstep(8.5, 12.4, distance);
        asteroid.mesh.position.copy(position);
        asteroid.mesh.scale.setScalar((0.72 + approach * 0.28) * visibility);
        asteroid.mesh.rotation.x += asteroid.spin;
        asteroid.mesh.rotation.y += asteroid.spin * 0.72;
        asteroid.mesh.visible = visibility > 0.08;
        if (index % 5 === 0) asteroid.mesh.lookAt(origin);
      });
      asteroidMaterial.opacity = 0.42 * visibility;
      asteroidMaterial.emissiveIntensity = 0.08 + Math.sin(elapsed * 0.4) * 0.012;
      trailA.material.opacity = 0.032 * visibility;
      trailB.material.opacity = 0.03 * visibility;
    },
    setVisibility,
    dispose() {
      bodies.forEach((body) => {
        body.mesh.geometry.dispose();
        body.material.userData.texture.dispose();
        body.material.dispose();
        body.atmosphere.geometry.dispose();
        body.atmosphere.material.dispose();
        if (body.ring) {
          body.ring.geometry.dispose();
          body.ring.material.dispose();
        }
      });
      moon.geometry.dispose();
      moonMaterial.dispose();
      asteroidMaterial.dispose();
      asteroidGroup.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
      });
      [trailA, trailB].forEach((trail) => {
        trail.geometry.dispose();
        trail.material.dispose();
      });
    }
  };
}
