import * as THREE from 'three';
import {
  clusterStarFragmentShader,
  clusterStarVertexShader,
  cometFragmentShader,
  cometVertexShader,
  diskFragmentShader,
  diskVertexShader,
  dustFragmentShader,
  dustVertexShader,
  eventHorizonFragmentShader,
  eventHorizonVertexShader,
  nebulaFragmentShader,
  nebulaVertexShader,
  starfieldFragmentShader,
  starfieldVertexShader,
  volumeDiskFragmentShader,
  volumeDiskVertexShader
} from './shaders.js';

const diskTilt = {
  x: THREE.MathUtils.degToRad(73),
  z: THREE.MathUtils.degToRad(-8)
};

export function createEventHorizon() {
  const geometry = new THREE.IcosahedronGeometry(1.62, 3);
  geometry.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    vertexShader: eventHorizonVertexShader,
    fragmentShader: eventHorizonFragmentShader,
    transparent: false,
    depthTest: true,
    depthWrite: true
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'absorbing event horizon';
  mesh.renderOrder = 3;
  return mesh;
}

function createDiskLayer(uniforms, layer, renderOrder, segments) {
  const geometry = new THREE.RingGeometry(1.78, 3.86, segments.radial, segments.tubular);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms.disk,
      uDiskLayer: { value: layer }
    },
    vertexShader: diskVertexShader,
    fragmentShader: diskFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = renderOrder;
  mesh.name = layer > 0.5 ? 'front accretion disk layer' : 'rear accretion disk layer';
  return mesh;
}

export function createAccretionDisk(uniforms, segments) {
  const group = new THREE.Group();
  group.name = 'layered shader accretion disk';
  group.rotation.x = diskTilt.x;
  group.rotation.z = diskTilt.z;
  group.add(createDiskLayer(uniforms, 0, 1, segments));
  group.add(createDiskLayer(uniforms, 1, 5, segments));
  return group;
}

function createVolumeLayer(uniforms, volumeOffset, renderOrder, segments) {
  const geometry = new THREE.RingGeometry(1.84, 4.42, segments.volumeRadial, segments.volumeTubular);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms.disk,
      uVolumeOffset: { value: volumeOffset }
    },
    vertexShader: volumeDiskVertexShader,
    fragmentShader: volumeDiskFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = renderOrder;
  mesh.name = 'volumetric accretion disk shell';
  return mesh;
}

export function createVolumetricDisk(uniforms, segments) {
  const group = new THREE.Group();
  group.name = 'thick volumetric accretion disk';
  group.rotation.x = diskTilt.x;
  group.rotation.z = diskTilt.z;
  group.add(createVolumeLayer(uniforms, -1.0, 0, segments));
  group.add(createVolumeLayer(uniforms, 0.0, 2, segments));
  group.add(createVolumeLayer(uniforms, 1.0, 4, segments));

  return {
    group,
    update(elapsed) {
      group.rotation.z = diskTilt.z + Math.sin(elapsed * 0.08) * 0.012;
    },
    dispose() {
      group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
    }
  };
}

export function createFallingDust(uniforms, count = 360) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const angles = new Float32Array(count);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    seeds[i] = ((i * 37) % count) / count;
    angles[i] = (((i * 17) % count) / count) * Math.PI * 2;
    speeds[i] = 0.45 + ((i * 29) % 100) / 100;
    sizes[i] = 2.4 + ((i * 13) % 7);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms.dust,
    vertexShader: dustVertexShader,
    fragmentShader: dustFragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'inner capture dust streaks';
  points.renderOrder = 4;
  points.rotation.x = diskTilt.x;
  points.rotation.z = diskTilt.z;
  return points;
}

export function createStarfield(uniforms) {
  const geometry = new THREE.SphereGeometry(72, 64, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms.starfield,
    vertexShader: starfieldVertexShader,
    fragmentShader: starfieldFragmentShader,
    side: THREE.BackSide,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'procedural starfield';
  return mesh;
}

export function createParallaxStars(count = 260) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const seed = Math.sin(i * 91.7) * 43758.5453;
    const a = ((seed % 1) + 1) % 1;
    const b = ((Math.sin(i * 37.3) * 21845.112) % 1 + 1) % 1;
    const radius = 26 + (((Math.sin(i * 17.9) * 9543.21) % 1 + 1) % 1) * 38;
    const theta = a * Math.PI * 2;
    const phi = Math.acos(2 * b - 1);
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius * 0.72;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

    const warm = i % 5 === 0 ? 1 : 0;
    colors[i * 3] = warm ? 1.0 : 0.56;
    colors[i * 3 + 1] = warm ? 0.66 : 0.72;
    colors[i * 3 + 2] = warm ? 0.38 : 1.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.032,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'subtle parallax foreground stars';

  return {
    points,
    update(elapsed) {
      points.rotation.y = elapsed * 0.006;
      points.rotation.x = Math.sin(elapsed * 0.04) * 0.015;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}

export function createStarClusters(uniforms, count = 520) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const clusterCenters = [
    new THREE.Vector3(-18, 5.8, -28),
    new THREE.Vector3(20, -3.4, -36),
    new THREE.Vector3(7, 10.2, -44),
    new THREE.Vector3(-26, -8.4, -34)
  ];

  for (let i = 0; i < count; i += 1) {
    const center = clusterCenters[i % clusterCenters.length];
    const seedA = Math.sin(i * 31.7) * 43758.5453;
    const seedB = Math.sin(i * 67.1) * 23421.631;
    const seedC = Math.sin(i * 91.9) * 12987.231;
    const spread = 3.2 + (i % clusterCenters.length) * 1.2;
    positions[i * 3] = center.x + (((seedA % 1) + 1) % 1 - 0.5) * spread * 2.8;
    positions[i * 3 + 1] = center.y + (((seedB % 1) + 1) % 1 - 0.5) * spread;
    positions[i * 3 + 2] = center.z + (((seedC % 1) + 1) % 1 - 0.5) * spread * 1.8;

    const warm = i % 7 === 0;
    const bright = i % 29 === 0;
    colors[i * 3] = warm ? 1.0 : bright ? 0.82 : 0.55;
    colors[i * 3 + 1] = warm ? 0.72 : bright ? 0.88 : 0.7;
    colors[i * 3 + 2] = warm ? 0.42 : 1.0;
    sizes[i] = bright ? 4.2 : 1.1 + (((Math.sin(i * 12.4) * 7331.1) % 1 + 1) % 1) * 2.6;
    twinkles[i] = ((Math.sin(i * 53.2) * 9412.7) % 1 + 1) % 1;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.global.uTime,
      uPixelRatio: { value: 1 }
    },
    vertexShader: clusterStarVertexShader,
    fragmentShader: clusterStarFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'distant star clusters';

  return {
    points,
    update(elapsed, pixelRatio) {
      material.uniforms.uPixelRatio.value = pixelRatio;
      points.rotation.y = elapsed * 0.0025;
      points.rotation.z = Math.sin(elapsed * 0.025) * 0.01;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}

function createNebulaSheet({ uniforms, colorA, colorB, opacity, seed, position, rotation, scale }) {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.global.uTime,
      uSeed: { value: seed },
      uOpacity: { value: opacity },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) }
    },
    vertexShader: nebulaVertexShader,
    fragmentShader: nebulaFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  mesh.scale.set(scale.x, scale.y, 1);
  mesh.name = 'distant shader nebula sheet';
  return mesh;
}

export function createNebulaClouds(uniforms) {
  const group = new THREE.Group();
  group.name = 'layered distant nebula clouds';
  const sheets = [
    createNebulaSheet({
      uniforms,
      colorA: 0x17245d,
      colorB: 0x6d285f,
      opacity: 0.28,
      seed: 2.4,
      position: new THREE.Vector3(-11, 4.6, -32),
      rotation: new THREE.Euler(0.04, -0.18, THREE.MathUtils.degToRad(-14)),
      scale: new THREE.Vector2(28, 12)
    }),
    createNebulaSheet({
      uniforms,
      colorA: 0x0b3355,
      colorB: 0x87511f,
      opacity: 0.22,
      seed: 7.1,
      position: new THREE.Vector3(13, -4.2, -38),
      rotation: new THREE.Euler(-0.02, 0.2, THREE.MathUtils.degToRad(10)),
      scale: new THREE.Vector2(34, 14)
    }),
    createNebulaSheet({
      uniforms,
      colorA: 0x1a163c,
      colorB: 0x473b79,
      opacity: 0.18,
      seed: 11.8,
      position: new THREE.Vector3(2, 10.4, -46),
      rotation: new THREE.Euler(0.08, 0.03, THREE.MathUtils.degToRad(4)),
      scale: new THREE.Vector2(42, 16)
    })
  ];
  group.add(...sheets);

  return {
    group,
    update(elapsed) {
      group.rotation.y = Math.sin(elapsed * 0.018) * 0.018;
      group.rotation.x = Math.sin(elapsed * 0.013 + 1.2) * 0.008;
    },
    dispose() {
      group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
    }
  };
}

function createOrbitalArc({ radius, color, opacity, rotation, position }) {
  const points = [];
  const start = THREE.MathUtils.degToRad(-136);
  const end = THREE.MathUtils.degToRad(118);
  const steps = 96;
  for (let i = 0; i <= steps; i += 1) {
    const t = start + ((end - start) * i) / steps;
    points.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius * 0.42, 0));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const line = new THREE.Line(geometry, material);
  line.position.copy(position);
  line.rotation.set(rotation.x, rotation.y, rotation.z);
  line.name = 'distant faint orbital arc';
  return line;
}

function createComet(index) {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  const warm = index % 3 === 0;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(warm ? 0xffb45a : 0x82b9ff) },
      uOpacity: { value: 0 },
      uHeadBias: { value: index * 0.137 }
    },
    vertexShader: cometVertexShader,
    fragmentShader: cometFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  const yBand = [-8.8, -4.8, 5.8, 9.2, 1.8][index % 5];
  const zBand = [-18, -23, -31, -36, -27][index % 5];
  const direction = new THREE.Vector3(index % 2 === 0 ? 1 : -1, index % 3 === 0 ? 0.28 : -0.18, 0).normalize();
  const angle = Math.atan2(direction.y, direction.x);
  mesh.rotation.z = angle;
  mesh.userData = {
    start: new THREE.Vector3(index % 2 === 0 ? -38 : 38, yBand, zBand),
    direction,
    span: 76,
    speed: 0.018 + (index % 4) * 0.006,
    phase: (index * 0.173) % 1,
    length: 4.4 + (index % 4) * 1.1,
    thickness: 0.11 + (index % 3) * 0.035
  };
  mesh.name = 'distant shooting star streak';
  return mesh;
}

export function createDeepSpaceActivity() {
  const group = new THREE.Group();
  group.name = 'busy distant space activity';

  const arcs = [
    createOrbitalArc({
      radius: 20,
      color: 0x375dff,
      opacity: 0.09,
      position: new THREE.Vector3(-18, -4, -22),
      rotation: new THREE.Euler(THREE.MathUtils.degToRad(16), THREE.MathUtils.degToRad(4), THREE.MathUtils.degToRad(-8))
    }),
    createOrbitalArc({
      radius: 25,
      color: 0xff6f36,
      opacity: 0.06,
      position: new THREE.Vector3(20, 2, -30),
      rotation: new THREE.Euler(THREE.MathUtils.degToRad(-9), THREE.MathUtils.degToRad(-6), THREE.MathUtils.degToRad(14))
    }),
    createOrbitalArc({
      radius: 31,
      color: 0x67d7ff,
      opacity: 0.052,
      position: new THREE.Vector3(2, 8, -42),
      rotation: new THREE.Euler(THREE.MathUtils.degToRad(22), THREE.MathUtils.degToRad(12), THREE.MathUtils.degToRad(5))
    })
  ];
  group.add(...arcs);

  const cometGroup = new THREE.Group();
  const comets = [];
  for (let i = 0; i < 9; i += 1) {
    const comet = createComet(i);
    cometGroup.add(comet);
    comets.push(comet);
  }
  group.add(cometGroup);

  const beaconMaterial = new THREE.MeshBasicMaterial({
    color: 0x9fc7ff,
    transparent: true,
    opacity: 0.46,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const shardMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb35f,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    wireframe: true
  });
  const glints = [];
  for (let i = 0; i < 12; i += 1) {
    const geometry = i % 2 === 0 ? new THREE.OctahedronGeometry(0.16, 0) : new THREE.TetrahedronGeometry(0.18, 0);
    const material = i % 3 === 0 ? shardMaterial : beaconMaterial;
    const mesh = new THREE.Mesh(geometry, material);
    const side = i % 2 === 0 ? -1 : 1;
    mesh.position.set(
      side * (16 + ((i * 19) % 12)),
      -8 + ((i * 23) % 18),
      -20 - ((i * 17) % 24)
    );
    mesh.rotation.set(i * 0.31, i * 0.73, i * 0.19);
    mesh.scale.setScalar(0.6 + (i % 4) * 0.22);
    mesh.name = 'distant low-poly space glint';
    group.add(mesh);
    glints.push(mesh);
  }

  return {
    group,
    update(elapsed) {
      arcs.forEach((arc, index) => {
        arc.rotation.z += 0.00035 + index * 0.00015;
        arc.material.opacity = 0.04 + Math.sin(elapsed * 0.18 + index) * 0.015 + index * 0.012;
      });
      comets.forEach((comet, index) => {
        const data = comet.userData;
        const travel = (elapsed * data.speed + data.phase) % 1;
        const eased = travel * travel * (3 - 2 * travel);
        comet.position.copy(data.start).addScaledVector(data.direction, data.span * eased);
        comet.scale.set(data.length * (0.75 + travel * 0.45), data.thickness, 1);
        comet.material.uniforms.uOpacity.value = Math.sin(travel * Math.PI) * (index % 3 === 0 ? 0.38 : 0.28);
        comet.material.uniforms.uHeadBias.value = elapsed * 0.2 + index * 0.137;
      });
      glints.forEach((glint, index) => {
        glint.rotation.x += 0.002 + index * 0.0002;
        glint.rotation.y += 0.003 + index * 0.00015;
        glint.material.opacity = (index % 3 === 0 ? 0.22 : 0.34) + Math.sin(elapsed * 0.5 + index) * 0.08;
      });
    },
    dispose() {
      group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
    }
  };
}

export function createLowPolyDebris() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x151825,
    roughness: 0.76,
    metalness: 0.18,
    flatShading: true,
    emissive: 0x0c0506,
    emissiveIntensity: 0.24,
    transparent: true,
    opacity: 0.62
  });

  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2;
    const radius = 6.4 + ((i * 37) % 24) * 0.12;
    const height = (((i * 19) % 13) - 6) * 0.06;
    const geometry = new THREE.TetrahedronGeometry(0.028 + ((i * 13) % 9) * 0.005, 0);
    const shard = new THREE.Mesh(geometry, material);
    shard.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius * 0.38);
    shard.rotation.set(angle * 0.7, angle * 1.3, angle * 0.41);
    group.add(shard);
  }

  group.rotation.x = diskTilt.x;
  group.rotation.z = diskTilt.z;
  group.name = 'low-poly inner debris belt';
  return group;
}
