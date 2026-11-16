import * as THREE from 'three';
import type { ObservatoryTextures } from './materials';

export interface EnvironmentState {
  zenithColor: THREE.Color;
  horizonColor: THREE.Color;
  sunColor: THREE.Color;
  angularSizeRatio: number;
  albedo: number;
  tau: number;
  tidalShadow: number;
  starAlpha: number;
  vaporIntensity: number;
  tempK: number;
  waterPhase: string;
}

export interface EnvironmentSystem {
  root: THREE.Group;
  starWorldPos: THREE.Vector3;
  earthWorldPos: THREE.Vector3;
  update: (state: EnvironmentState, tSec: number, dt: number, prefersReduced: boolean) => void;
  dispose: () => void;
}

function seeded(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _c3 = new THREE.Color();
const _dir = new THREE.Vector3();

export function createEnvironmentSystem(
  scene: THREE.Scene,
  textures: ObservatoryTextures
): EnvironmentSystem {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const starWorldPos = new THREE.Vector3(-13.5, 11.8, -34.0);
  const earthWorldPos = new THREE.Vector3(11.5, 6.2, -22.5);

  // -------------------------------------------------------------------------
  // 1. PROCEDURAL SKY DOME (Zenith -> Horizon + Tidal Shadow + Heat Blanket)
  // -------------------------------------------------------------------------
  const skyUniforms = {
    uZenith: { value: new THREE.Color('#0c1e3e') },
    uHorizon: { value: new THREE.Color('#4d7fb3') },
    uTidalShadow: { value: 0 },
    uBlanket: { value: 0.45 },
    uVapor: { value: 0 },
    uTime: { value: 0 },
  };
  const skyMat = trackMat(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform float uTidalShadow;
        uniform float uBlanket;
        uniform float uVapor;
        uniform float uTime;
        varying vec3 vWorldPos;

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 zenith = uZenith * (1.0 - uTidalShadow * 0.48);
          vec3 col = mix(uHorizon, zenith, pow(h, 0.58));

          // Soft horizon haze
          float mist = smoothstep(0.28, 0.0, h) * (0.18 + uVapor * 0.25);
          col = mix(col, mix(uHorizon, vec3(0.92, 0.88, 0.84), 0.35), mist);

          // Tidal-locking night shadow sweeping right hemisphere
          float rightSide = smoothstep(-0.15, 0.62, dir.x);
          col = mix(col, vec3(0.015, 0.025, 0.055), rightSide * uTidalShadow * 0.84);

          // Upper atmosphere shimmering IR heat blanket ribbon
          float band = exp(-pow((h - 0.52) / 0.11, 2.0));
          float shimmer = 0.85 + 0.15 * sin(dir.x * 12.0 + uTime * 1.4);
          col += vec3(0.98, 0.52, 0.18) * band * uBlanket * 0.22 * shimmer;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  const skyDome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(140, 40, 24)), skyMat);
  root.add(skyDome);

  // -------------------------------------------------------------------------
  // 2. ZENITH STARS + AURORA RIBBONS (Cold or Tidally Locked)
  // -------------------------------------------------------------------------
  const starCount = 280;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = seeded(i * 3 + 1) * Math.PI * 2;
    const phi = 0.12 + seeded(i * 3 + 2) * (Math.PI * 0.38); // upper hemisphere
    const r = 112;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = trackGeo(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starsMat = trackMat(
    new THREE.PointsMaterial({
      color: '#f1f7ff',
      size: 0.72,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    })
  );
  const zenithStars = new THREE.Points(starGeo, starsMat);
  root.add(zenithStars);

  // Aurora ribbons
  const auroraGroup = new THREE.Group();
  const auroraMats: THREE.MeshBasicMaterial[] = [];
  for (let b = 0; b < 2; b++) {
    const ribbonGeo = trackGeo(new THREE.PlaneGeometry(56, 5.5, 28, 2));
    const posAttr = ribbonGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      posAttr.setZ(i, Math.sin(vx * 0.14 + b * 1.4) * 3.5);
    }
    ribbonGeo.computeVertexNormals();
    const rMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: b === 0 ? '#34d399' : '#a78bfa',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    const ribbon = new THREE.Mesh(ribbonGeo, rMat);
    ribbon.position.set(2 + b * 3, 25 + b * 3.2, -48 - b * 4);
    ribbon.rotation.x = 0.38;
    auroraGroup.add(ribbon);
    auroraMats.push(rMat);
  }
  root.add(auroraGroup);

  // -------------------------------------------------------------------------
  // 3. HOST STAR + MULTI-LAYER CORONA + VOLUMETRIC GOD-RAYS
  // -------------------------------------------------------------------------
  const starGroup = new THREE.Group();
  starGroup.position.copy(starWorldPos);

  const starDiskMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#fffbeb',
      toneMapped: false,
      fog: false,
    })
  );
  const starDisk = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.45, 28, 20)), starDiskMat);
  starGroup.add(starDisk);

  const coronaInnerMat = trackMat(
    new THREE.SpriteMaterial({
      map: textures.radialGlow,
      color: '#fde047',
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const coronaInner = new THREE.Sprite(coronaInnerMat);
  coronaInner.scale.set(9, 9, 1);
  starGroup.add(coronaInner);

  const coronaOuterMat = trackMat(
    new THREE.SpriteMaterial({
      map: textures.radialGlow,
      color: '#f59e0b',
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const coronaOuter = new THREE.Sprite(coronaOuterMat);
  coronaOuter.scale.set(21, 21, 1);
  starGroup.add(coronaOuter);

  // Soft volumetric god-rays radiating downward toward ocean & ice
  const rayMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#fde68a',
      transparent: true,
      opacity: 0.032,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    })
  );
  const rayCones: THREE.Mesh[] = [];
  for (let r = 0; r < 4; r++) {
    const coneGeo = trackGeo(new THREE.ConeGeometry(2.6 + r * 0.55, 34, 16, 1, true));
    coneGeo.translate(0, -17, 0);
    const cone = new THREE.Mesh(coneGeo, rayMat);
    cone.rotation.z = 0.25 + r * 0.24;
    cone.rotation.x = 0.34;
    starGroup.add(cone);
    rayCones.push(cone);
  }
  root.add(starGroup);

  // -------------------------------------------------------------------------
  // 4. DISTANT 3D SPHERICAL EARTH (Upper-Right Orbital Mirror)
  // -------------------------------------------------------------------------
  const earthGroup = new THREE.Group();
  earthGroup.position.copy(earthWorldPos);

  const earthUniforms = {
    uColorMap: { value: textures.earthColor },
    uNightMap: { value: textures.earthNight },
    uSunDir: { value: new THREE.Vector3(-0.7, 0.25, -0.35).normalize() },
    uFrozenMix: { value: 0 },
    uHotMix: { value: 0 },
    uCapReach: { value: 0.16 },
    uTidalLocked: { value: 0 },
    uAtmoColor: { value: new THREE.Color('#38bdf8') },
    uSpin: { value: 0 },
  };
  const earthMat = trackMat(
    new THREE.ShaderMaterial({
      uniforms: earthUniforms,
      fog: false,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalWorld;
        varying vec3 vPosLocal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vPosLocal = position;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vNormalWorld = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uColorMap;
        uniform sampler2D uNightMap;
        uniform vec3 uSunDir;
        uniform float uFrozenMix;
        uniform float uHotMix;
        uniform float uCapReach;
        uniform float uTidalLocked;
        uniform vec3 uAtmoColor;
        uniform float uSpin;

        varying vec2 vUv;
        varying vec3 vNormalWorld;
        varying vec3 vPosLocal;
        varying vec3 vViewDir;

        void main() {
          vec2 uv = vec2(fract(vUv.x + uSpin), vUv.y);
          vec3 baseCol = texture2D(uColorMap, uv).rgb;
          vec3 nightLights = texture2D(uNightMap, uv).rgb;

          // Frozen snowball tint & scorched boiling tint
          baseCol = mix(baseCol, vec3(0.84, 0.93, 0.99), uFrozenMix * 0.78);
          baseCol = mix(baseCol, vec3(0.76, 0.42, 0.18), uHotMix * 0.82);

          // Live North & South Polar Ice Caps driven by albedo
          float lat = abs(normalize(vPosLocal).y);
          float iceThreshold = 1.0 - uCapReach * 0.92;
          float polarIce = smoothstep(iceThreshold - 0.05, iceThreshold + 0.05, lat);
          baseCol = mix(baseCol, vec3(0.95, 0.98, 1.0), polarIce * 0.94);

          // Illumination & Day-Night Terminator
          float ndotl = dot(normalize(vNormalWorld), normalize(uSunDir));
          float day = smoothstep(-0.14, 0.24, ndotl);
          vec3 lit = baseCol * (0.14 + 0.96 * max(ndotl, 0.0));
          vec3 dark = baseCol * 0.05;
          vec3 col = mix(dark, lit, day);

          // Dramatic twilight band & night city lights when tidally locked
          float twilight = exp(-pow(ndotl / 0.13, 2.0)) * uTidalLocked;
          col += vec3(0.98, 0.54, 0.22) * twilight * 0.45;
          float nightMask = smoothstep(0.05, -0.22, ndotl) * uTidalLocked;
          col += nightLights * nightMask * 0.9;

          // Fresnel atmospheric limb glow
          float fresnel = pow(1.0 - max(dot(normalize(vNormalWorld), normalize(vViewDir)), 0.0), 3.0);
          col += mix(uAtmoColor, vec3(0.82, 0.94, 1.0), 0.35) * fresnel * 0.72;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  const earthSphere = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(2.6, 48, 36)), earthMat);
  earthSphere.rotation.z = 0.22; // Axial tilt
  earthGroup.add(earthSphere);

  // Cloud layer shell
  const earthCloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.earthClouds,
      transparent: true,
      opacity: 0.42,
      roughness: 0.9,
      metalness: 0.0,
      depthWrite: false,
      fog: false,
    })
  );
  const earthClouds = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(2.67, 40, 28)), earthCloudMat);
  earthClouds.rotation.z = 0.22;
  earthGroup.add(earthClouds);

  // Outer Rayleigh atmospheric halo
  const earthHaloMat = trackMat(
    new THREE.SpriteMaterial({
      map: textures.radialGlow,
      color: '#38bdf8',
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const earthHalo = new THREE.Sprite(earthHaloMat);
  earthHalo.scale.set(8.0, 8.0, 1);
  earthGroup.add(earthHalo);
  root.add(earthGroup);

  // -------------------------------------------------------------------------
  // 5. OCEAN SURFACE (Multi-Wave Swells + Seafoam Crests + Shoreline Glow)
  // -------------------------------------------------------------------------
  const oceanTimeUniform = { value: 0 };
  const oceanAmpUniform = { value: 0.09 };
  const oceanIceUniform = { value: 0 };
  const oceanMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#114170',
      normalMap: textures.oceanNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.18,
      metalness: 0.36,
      envMapIntensity: 1.25,
    })
  );
  oceanMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanTimeUniform;
    shader.uniforms.uAmp = oceanAmpUniform;
    shader.uniforms.uOceanIce = oceanIceUniform;
    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uAmp;
      varying float vWaveCrest;
      varying vec2 vOceanXZ;
      ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float w1 = sin(position.x * 0.34 + uTime * 1.35) * cos(position.y * 0.27 + uTime * 1.05);
      float w2 = sin(position.x * 0.82 - uTime * 2.05 + position.y * 0.62) * 0.45;
      float w3 = cos(position.x * 1.45 + position.y * 1.15 - uTime * 2.6) * 0.18;
      float waveSum = w1 + w2 + w3;
      transformed.z += waveSum * uAmp;
      vWaveCrest = waveSum;
      vec4 wpOcean = modelMatrix * vec4(transformed, 1.0);
      vOceanXZ = wpOcean.xz;
      `
    );
    shader.fragmentShader =
      `
      uniform float uTime;
      uniform float uOceanIce;
      varying float vWaveCrest;
      varying vec2 vOceanXZ;
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Frothy wave crest highlights
      float crestFoam = smoothstep(0.68, 1.48, vWaveCrest) * (1.0 - uOceanIce * 0.65);

      // Gentle shoreline foam collars around rocky capes, ice shelf, and deck pilings
      float dLeftCape = length(vOceanXZ - vec2(-7.4, 1.1));
      float dRightCape = length(vOceanXZ - vec2(7.7, -1.8));
      float dIceShelf = length((vOceanXZ - vec2(-6.5, -3.4)) * vec2(0.78, 1.0));
      float shorePulse = sin(uTime * 1.9 + vOceanXZ.x * 0.8 + vOceanXZ.y * 0.7) * 0.16;
      float shoreLeft = smoothstep(5.35 + shorePulse, 4.15, dLeftCape) * smoothstep(3.15, 4.05, dLeftCape);
      float shoreRight = smoothstep(4.65 + shorePulse, 3.55, dRightCape) * smoothstep(2.65, 3.45, dRightCape);
      float shoreIce = smoothstep(3.85 + shorePulse, 2.75, dIceShelf) * smoothstep(1.9, 2.65, dIceShelf);
      float shoreFoam = clamp(shoreLeft + shoreRight + shoreIce, 0.0, 1.0) * 0.55;

      float totalFoam = clamp(crestFoam * 0.36 + shoreFoam, 0.0, 0.72);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.94, 1.0), totalFoam);
      `
    );
  };
  const oceanMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(240, 240, 104, 104)), oceanMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.receiveShadow = true;
  root.add(oceanMesh);

  // Floating sculpted hexagonal ice floes (mostlyFrozen / frozen)
  const floeCount = 36;
  const floeShape = new THREE.Shape();
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * Math.PI * 2;
    const rad = 0.78 + seeded(s * 11 + 3) * 0.28;
    if (s === 0) floeShape.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else floeShape.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  floeShape.closePath();
  const floeGeo = trackGeo(
    new THREE.ExtrudeGeometry(floeShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.06,
      bevelSegments: 2,
    })
  );
  floeGeo.rotateX(-Math.PI / 2);
  floeGeo.computeVertexNormals();
  const floeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: textures.iceColor,
      normalMap: textures.iceNormal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: textures.iceRoughness,
      color: '#cde7fa',
      roughness: 0.48,
      metalness: 0.04,
      clearcoat: 0.35,
      clearcoatRoughness: 0.24,
      envMapIntensity: 0.8,
      flatShading: true,
    })
  );
  const floeMesh = new THREE.InstancedMesh(floeGeo, floeMat, floeCount);
  const floeMeta = Array.from({ length: floeCount }, (_, i) => ({
    x: (seeded(i * 5 + 1) - 0.5) * 34,
    z: -2 - seeded(i * 5 + 2) * 36,
    sx: 0.6 + seeded(i * 5 + 3) * 1.6,
    sz: 0.5 + seeded(i * 5 + 4) * 1.2,
    rot: seeded(i * 5 + 5) * Math.PI * 2,
    phase: seeded(i * 5 + 6) * Math.PI * 2,
  }));
  floeMesh.visible = false;
  root.add(floeMesh);

  // Rising 3D vapor puff sprites across the bay
  const vaporCount = 38;
  const vaporGroup = new THREE.Group();
  const vaporItems: { sprite: THREE.Sprite; x: number; z: number; speed: number; offset: number; baseScale: number }[] = [];
  for (let i = 0; i < vaporCount; i++) {
    const vMat = trackMat(
      new THREE.SpriteMaterial({
        map: textures.vaporPuff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    const sp = new THREE.Sprite(vMat);
    const x = (seeded(i * 7 + 1) - 0.5) * 26;
    const z = -2 - seeded(i * 7 + 2) * 22;
    sp.position.set(x, 0.4, z);
    vaporGroup.add(sp);
    vaporItems.push({
      sprite: sp,
      x,
      z,
      speed: 0.14 + seeded(i * 7 + 3) * 0.22,
      offset: seeded(i * 7 + 4),
      baseScale: 1.4 + seeded(i * 7 + 5) * 2.4,
    });
  }
  root.add(vaporGroup);

  // -------------------------------------------------------------------------
  // 6. SCULPTED BASALT HEADLANDS, VOLCANIC HORIZON RIDGE & BEVELED PROMENADE DECK
  // -------------------------------------------------------------------------
  const matBasalt = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.rockColor,
      normalMap: textures.rockNormal,
      normalScale: new THREE.Vector2(0.92, 0.92),
      roughnessMap: textures.rockRoughness,
      bumpMap: textures.rockBump,
      bumpScale: 0.055,
      color: '#253044',
      roughness: 0.88,
      metalness: 0.09,
      flatShading: true,
    })
  );
  const matWetBasalt = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.rockColor,
      normalMap: textures.rockNormal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      color: '#172030',
      roughness: 0.36,
      metalness: 0.14,
      flatShading: true,
    })
  );
  const matFarMountain = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.rockNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: textures.rockRoughness,
      color: '#151e30',
      roughness: 0.94,
      metalness: 0.05,
      flatShading: true,
    })
  );

  // Helper: Sculpted terraced basalt plateau (flat top terrace for instruments, jagged cliff sides)
  const buildBasaltTerraceGeo = (
    topR: number,
    botR: number,
    height: number,
    seedOffset: number
  ): THREE.BufferGeometry => {
    const geo = trackGeo(new THREE.CylinderGeometry(topR, botR, height, 24, 5));
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const r = Math.hypot(vx, vz);
      if (r < 0.01) continue;
      const ang = Math.atan2(vz, vx);
      const hFrac = (vy + height * 0.5) / height; // 0 = bottom, 1 = top
      // Keep the top landing plateau flat while sculpting multi-tiered cliff strata below
      const cliffWeight = hFrac > 0.88 ? 0.18 : 1.0 - hFrac * 0.35;
      const strata =
        Math.sin(ang * 5 + seedOffset) * 0.24 +
        Math.cos(ang * 9 - hFrac * 4.5 + seedOffset * 1.7) * 0.16 +
        Math.sin(ang * 13 + hFrac * 7.0) * 0.08;
      const radialScale = 1 + strata * cliffWeight;
      pos.setX(i, vx * radialScale);
      pos.setZ(i, vz * radialScale);
      if (hFrac > 0.15 && hFrac < 0.88) {
        pos.setY(i, vy + Math.sin(ang * 7 + seedOffset) * 0.08);
      }
    }
    geo.computeVertexNormals();
    return geo;
  };

  // Helper: Sculpted angular volcanic spire / crag (multi-segment icosahedron displaced cleanly)
  const buildRockCragGeo = (
    rx: number,
    ry: number,
    rz: number,
    seedOffset: number
  ): THREE.BufferGeometry => {
    const geo = trackGeo(new THREE.IcosahedronGeometry(1.0, 2));
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ridge =
        1 +
        0.24 * Math.sin(x * 3.1 + y * 2.4 + seedOffset) +
        0.16 * Math.cos(z * 4.2 - y * 3.0 + seedOffset * 1.9);
      const taper = y > 0 ? Math.max(0.28, 1 - y * 0.56) : 1.06;
      pos.setXYZ(i, x * rx * ridge * taper, y * ry * (0.92 + 0.14 * Math.sin(x * 2 + seedOffset)), z * rz * ridge * taper);
    }
    geo.computeVertexNormals();
    return geo;
  };

  // Left headland (flat top strictly at y = 1.28 to support starmap dome at (-7.1, 1.28, 1.35))
  const leftCape = new THREE.Group();
  const leftBase = new THREE.Mesh(buildBasaltTerraceGeo(3.35, 4.75, 1.48, 1.2), matBasalt);
  leftBase.position.set(-7.1, 0.54, 1.35); // top at 0.54 + 0.74 = 1.28
  leftBase.receiveShadow = true;
  leftBase.castShadow = true;
  leftCape.add(leftBase);

  const leftShoreShelf = new THREE.Mesh(buildBasaltTerraceGeo(4.45, 5.15, 0.36, 4.1), matWetBasalt);
  leftShoreShelf.position.set(-7.2, 0.04, 1.25);
  leftShoreShelf.receiveShadow = true;
  leftCape.add(leftShoreShelf);

  const leftCragMain = new THREE.Mesh(buildRockCragGeo(2.35, 2.25, 2.05, 2.3), matBasalt);
  leftCragMain.position.set(-10.4, 1.15, -0.75);
  leftCragMain.rotation.y = 0.45;
  leftCragMain.castShadow = true;
  leftCragMain.receiveShadow = true;
  leftCape.add(leftCragMain);

  const leftCragSide = new THREE.Mesh(buildRockCragGeo(1.45, 1.45, 1.35, 5.8), matBasalt);
  leftCragSide.position.set(-9.4, 0.72, -2.35);
  leftCragSide.rotation.y = -0.7;
  leftCragSide.castShadow = true;
  leftCape.add(leftCragSide);
  root.add(leftCape);

  // Right headland (flat top strictly at y = 1.25 to support terminator orrery at (7.45, 1.25, -1.65))
  const rightCape = new THREE.Group();
  const rightBase = new THREE.Mesh(buildBasaltTerraceGeo(2.85, 4.15, 1.45, 7.4), matBasalt);
  rightBase.position.set(7.45, 0.525, -1.65); // top at 0.525 + 0.725 = 1.25
  rightBase.receiveShadow = true;
  rightBase.castShadow = true;
  rightCape.add(rightBase);

  const rightShoreShelf = new THREE.Mesh(buildBasaltTerraceGeo(3.8, 4.45, 0.34, 9.2), matWetBasalt);
  rightShoreShelf.position.set(7.6, 0.04, -1.8);
  rightShoreShelf.receiveShadow = true;
  rightCape.add(rightShoreShelf);

  const rightCragMain = new THREE.Mesh(buildRockCragGeo(2.55, 2.45, 2.2, 11.1), matBasalt);
  rightCragMain.position.set(10.85, 1.22, -3.55);
  rightCragMain.rotation.y = -0.5;
  rightCragMain.castShadow = true;
  rightCragMain.receiveShadow = true;
  rightCape.add(rightCragMain);

  const rightCragSeaStack = new THREE.Mesh(buildRockCragGeo(1.3, 1.55, 1.2, 13.7), matBasalt);
  rightCragSeaStack.position.set(10.2, 0.72, -0.35);
  rightCragSeaStack.castShadow = true;
  rightCape.add(rightCragSeaStack);
  root.add(rightCape);

  // Instanced shoreline coastal boulders & sea rocks
  const boulderGeo = buildRockCragGeo(0.58, 0.42, 0.52, 19.3);
  const boulderSpecs: [number, number, number, number, number][] = [
    [-11.2, 0.05, 1.6, 1.2, 0.4],
    [-9.8, 0.02, 3.6, 0.85, 1.8],
    [-8.4, 0.05, -3.6, 1.15, 2.6],
    [-4.3, 0.02, -3.8, 0.7, 0.9],
    [-11.8, 0.12, -2.5, 1.45, 3.1],
    [10.9, 0.06, -0.9, 1.1, 1.2],
    [11.7, 0.1, -5.2, 1.5, 2.2],
    [6.1, 0.03, -4.6, 0.8, 0.6],
    [9.2, 0.04, 1.8, 0.95, 2.9],
    [-5.8, 0.04, 5.2, 0.9, 1.4],
    [11.4, 0.06, 3.2, 1.25, 0.3],
    [13.6, 0.18, -7.8, 2.1, 1.7],
    [-14.2, 0.16, -7.2, 2.2, 2.4],
  ];
  const boulderInst = new THREE.InstancedMesh(boulderGeo, matWetBasalt, boulderSpecs.length);
  boulderInst.receiveShadow = true;
  boulderInst.castShadow = true;
  for (let i = 0; i < boulderSpecs.length; i++) {
    const [bx, by, bz, sc, rot] = boulderSpecs[i];
    _pos.set(bx, by, bz);
    _euler.set(seeded(i * 3) * 0.25, rot, seeded(i * 3 + 1) * 0.2);
    _quat.setFromEuler(_euler);
    _scale.set(sc, sc * 0.85, sc * 1.1);
    _mat4.compose(_pos, _quat, _scale);
    boulderInst.setMatrixAt(i, _mat4);
  }
  boulderInst.instanceMatrix.needsUpdate = true;
  root.add(boulderInst);

  // Continuous Sculpted Distant Volcanic Horizon Ridge Archipelago
  const buildHorizonRidgeMesh = (
    arcRadius: number,
    bandDepth: number,
    peakGain: number,
    seedShift: number
  ): THREE.Mesh => {
    const segX = 76;
    const segZ = 8;
    const ridgeGeo = trackGeo(new THREE.PlaneGeometry(1, 1, segX, segZ));
    const pos = ridgeGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) + 0.5; // 0..1 across arc
      const v = pos.getY(i) + 0.5; // 0..1 front-to-back depth
      const theta = -1.18 + u * 2.36; // sweeping crescent across northern horizon
      const rad = arcRadius + (v - 0.5) * bandDepth;
      const wx = Math.sin(theta) * rad;
      const wz = 2.0 - Math.cos(theta) * rad;

      const envDepth = Math.sin(v * Math.PI); // 0 at front/back edges, 1 along crest spine
      const macroPeaks =
        Math.max(0, Math.sin(u * Math.PI * 5.2 + seedShift)) * 0.65 +
        Math.max(0, Math.cos(u * Math.PI * 9.5 - seedShift * 1.4)) * 0.35;
      const microSerration =
        Math.abs(Math.sin(u * 38.0 + seedShift)) * 0.18 +
        Math.abs(Math.cos(u * 23.0 - v * 4.0)) * 0.12;
      // Keep a calm central bay opening around u ~ 0.45..0.55 so Earth & Star shine cleanly
      const bayNotch = 1.0 - 0.58 * Math.exp(-Math.pow((u - 0.48) / 0.13, 2));
      const wy = -0.35 + envDepth * (0.8 + (macroPeaks + microSerration) * peakGain * bayNotch);

      pos.setXYZ(i, wx, wy, wz);
    }
    ridgeGeo.computeVertexNormals();
    return new THREE.Mesh(ridgeGeo, matFarMountain);
  };
  root.add(buildHorizonRidgeMesh(48, 12.5, 5.8, 0.7));
  root.add(buildHorizonRidgeMesh(58, 15.0, 7.6, 2.9));

  // Foreground Beveled Observatory Promenade Deck (top strictly y = 0.28 across walkable bounds)
  const deckGroup = new THREE.Group();
  const matDeckTop = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.deckColor,
      normalMap: textures.deckNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: textures.deckRoughness,
      bumpMap: textures.deckBump,
      bumpScale: 0.02,
      color: '#2e3c54',
      roughness: 0.64,
      metalness: 0.68,
      envMapIntensity: 1.15,
    })
  );
  const matDeckCurb = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.38, 0.38),
      roughnessMap: textures.metalRoughness,
      color: '#111927',
      roughness: 0.74,
      metalness: 0.52,
    })
  );
  const matRailSteel = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: textures.metalRoughness,
      color: '#cbd5e1',
      roughness: 0.32,
      metalness: 0.9,
      envMapIntensity: 1.35,
    })
  );
  const matDeckTrimCyan = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.9,
      roughness: 0.25,
    })
  );
  const matDeckTrimGold = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#d97706',
      emissiveIntensity: 0.65,
      roughness: 0.28,
    })
  );
  const matGlassBarrier = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      roughness: 0.06,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      ior: 1.5,
      reflectivity: 0.92,
      envMapIntensity: 1.45,
      transparent: true,
      opacity: 0.22,
    })
  );

  // Chamfered architectural promenade deck plate (covers walkable x in [-7.35, 8.9], z in [1.65, 7.35])
  const buildChamferedDeckShape = (pad: number): THREE.Shape => {
    const s = new THREE.Shape();
    const xL = -7.95 - pad;
    const xR = 9.45 + pad;
    const zFront = 1.15 - pad;
    const zBack = 7.95 + pad;
    const chamfer = 0.95;
    // Shape Y maps to -Z after rotateX(-PI/2)
    s.moveTo(xL + chamfer, -zFront);
    s.lineTo(xR - chamfer, -zFront);
    s.lineTo(xR, -(zFront + chamfer));
    s.lineTo(xR, -zBack);
    s.lineTo(xL, -zBack);
    s.lineTo(xL, -(zFront + chamfer));
    s.closePath();
    return s;
  };

  const deckTopGeo = trackGeo(
    new THREE.ExtrudeGeometry(buildChamferedDeckShape(0), {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.09,
      bevelSegments: 2,
    })
  );
  deckTopGeo.rotateX(-Math.PI / 2);
  // Normalize top UVs to world meters so plate seams & rivets stay crisp
  {
    const pos = deckTopGeo.attributes.position as THREE.BufferAttribute;
    const uv = deckTopGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + 8.5) / 18.0, (pos.getZ(i) + 1.0) / 7.2);
    }
    uv.needsUpdate = true;
    deckTopGeo.computeVertexNormals();
  }
  const deckSlab = new THREE.Mesh(deckTopGeo, matDeckTop);
  deckSlab.position.y = 0.28 - (0.22 + 0.055); // exact top face at y = 0.28
  deckSlab.receiveShadow = true;
  deckSlab.castShadow = true;
  deckGroup.add(deckSlab);

  // Lower structural dark substructure skirt
  const deckCurbGeo = trackGeo(
    new THREE.ExtrudeGeometry(buildChamferedDeckShape(0.22), {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.08,
      bevelSegments: 2,
    })
  );
  deckCurbGeo.rotateX(-Math.PI / 2);
  deckCurbGeo.computeVertexNormals();
  const deckCurb = new THREE.Mesh(deckCurbGeo, matDeckCurb);
  deckCurb.position.y = -0.18;
  deckCurb.receiveShadow = true;
  deckGroup.add(deckCurb);

  // Engraved Observatory Compass Medallion Decal seated flush on deck center
  const compassDecalGeo = trackGeo(new THREE.PlaneGeometry(5.6, 5.6));
  compassDecalGeo.rotateX(-Math.PI / 2);
  const compassDecalMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.compassDecal,
      transparent: true,
      opacity: 0.86,
      roughness: 0.45,
      metalness: 0.35,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  const compassDecalMesh = new THREE.Mesh(compassDecalGeo, compassDecalMat);
  compassDecalMesh.position.set(0.55, 0.284, 4.45);
  compassDecalMesh.receiveShadow = true;
  deckGroup.add(compassDecalMesh);

  // Subtle recessed perimeter edge light bar along front ocean promenade
  const frontTrimStrip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(15.2, 0.045, 0.06)),
    matDeckTrimCyan
  );
  frontTrimStrip.position.set(0.75, 0.14, 1.07);
  deckGroup.add(frontTrimStrip);

  // Under-deck cantilevered support pilings & cross-girders descending into the ocean
  const pilingPositions: [number, number][] = [
    [-5.8, 1.55],
    [0.75, 1.55],
    [7.2, 1.55],
    [-5.8, 6.8],
    [0.75, 6.8],
    [7.2, 6.8],
  ];
  const pilingGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.34, 1.9, 14));
  const pilingCollarGeo = trackGeo(new THREE.CylinderGeometry(0.42, 0.46, 0.22, 14));
  for (const [px, pz] of pilingPositions) {
    const piling = new THREE.Mesh(pilingGeo, matDeckCurb);
    piling.position.set(px, -0.82, pz);
    deckGroup.add(piling);
    const collar = new THREE.Mesh(pilingCollarGeo, matRailSteel);
    collar.position.set(px, 0.02, pz);
    deckGroup.add(collar);
  }

  // Front safety railing along central ocean edge (x in [-5.6, 6.3]), keeping left/right ramp portals clear
  const topRail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 12.1, 14)), matRailSteel);
  topRail.rotation.z = Math.PI / 2;
  topRail.position.set(0.35, 1.04, 1.2);
  topRail.castShadow = true;
  deckGroup.add(topRail);

  const midRail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 12.0, 10)), matRailSteel);
  midRail.rotation.z = Math.PI / 2;
  midRail.position.set(0.35, 0.56, 1.2);
  deckGroup.add(midRail);

  const glassWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.88, 0.66, 0.036)), matGlassBarrier);
  glassWall.position.set(0.35, 0.65, 1.2);
  deckGroup.add(glassWall);

  const stanchionBaseGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.1, 0.06, 8));
  const stanchionPostGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.052, 0.78, 12));
  const stanchionCapGeo = trackGeo(new THREE.SphereGeometry(0.048, 10, 8));
  for (let px = -5.6; px <= 6.35; px += 2.38) {
    const baseFlange = new THREE.Mesh(stanchionBaseGeo, matDeckCurb);
    baseFlange.position.set(px, 0.31, 1.2);
    deckGroup.add(baseFlange);

    const post = new THREE.Mesh(stanchionPostGeo, matRailSteel);
    post.position.set(px, 0.67, 1.2);
    post.castShadow = true;
    deckGroup.add(post);

    const cap = new THREE.Mesh(stanchionCapGeo, matDeckTrimGold);
    cap.position.set(px, 1.06, 1.2);
    deckGroup.add(cap);
  }

  // Mooring bollards at outer chamfered front deck corners
  const bollardGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.15, 0.38, 12));
  const bollardCapGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.11, 0.08, 12));
  for (const bx of [-7.35, 8.75]) {
    const bol = new THREE.Mesh(bollardGeo, matDeckCurb);
    bol.position.set(bx, 0.47, 1.85);
    bol.castShadow = true;
    deckGroup.add(bol);
    const bCap = new THREE.Mesh(bollardCapGeo, matRailSteel);
    bCap.position.set(bx, 0.69, 1.85);
    deckGroup.add(bCap);
  }

  // Right coastal walkway bridge ramp (z = 1.3 y=0.28 -> z = -0.75 y=1.25) with side stringers & tread cleats
  const rightRampSlope = Math.atan2(1.25 - 0.28, 2.05);
  const rightRampGroup = new THREE.Group();
  rightRampGroup.position.set(7.45, 0.72, 0.25);
  rightRampGroup.rotation.x = rightRampSlope;

  const rightRampDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.72, 0.16, 2.38)), matDeckTop);
  rightRampDeck.receiveShadow = true;
  rightRampDeck.castShadow = true;
  rightRampGroup.add(rightRampDeck);

  for (const sx of [-0.88, 0.88]) {
    const stringer = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.24, 2.42)), matDeckCurb);
    stringer.position.set(sx, 0.02, 0);
    rightRampGroup.add(stringer);
    const handrail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 2.32, 10)), matRailSteel);
    handrail.rotation.x = Math.PI / 2;
    handrail.position.set(sx, 0.56, 0);
    rightRampGroup.add(handrail);
  }
  for (let rz = -0.95; rz <= 0.95; rz += 0.32) {
    const cleat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.48, 0.02, 0.06)), matRailSteel);
    cleat.position.set(0, 0.085, rz);
    rightRampGroup.add(cleat);
  }
  deckGroup.add(rightRampGroup);

  // Left headland bridge ramp (z = 3.1 y=0.28 -> z = 1.95 y=1.28) with side stringers & tread cleats
  const leftRampSlope = Math.atan2(1.28 - 0.28, 1.15);
  const leftRampGroup = new THREE.Group();
  leftRampGroup.position.set(-6.5, 0.74, 2.45);
  leftRampGroup.rotation.x = leftRampSlope;

  const leftRampDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.84, 0.16, 1.62)), matDeckTop);
  leftRampDeck.receiveShadow = true;
  leftRampDeck.castShadow = true;
  leftRampGroup.add(leftRampDeck);

  for (const sx of [-0.94, 0.94]) {
    const stringer = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.24, 1.66)), matDeckCurb);
    stringer.position.set(sx, 0.02, 0);
    leftRampGroup.add(stringer);
    const handrail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 1.56, 10)), matRailSteel);
    handrail.rotation.x = Math.PI / 2;
    handrail.position.set(sx, 0.56, 0);
    leftRampGroup.add(handrail);
  }
  for (let rz = -0.62; rz <= 0.62; rz += 0.31) {
    const cleat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.58, 0.02, 0.06)), matRailSteel);
    cleat.position.set(0, 0.085, rz);
    leftRampGroup.add(cleat);
  }
  deckGroup.add(leftRampGroup);

  root.add(deckGroup);

  // -------------------------------------------------------------------------
  // 7. ANIMATED 3D PHYSICS ARROWS & UPPER INFRARED HEAT BLANKET
  // -------------------------------------------------------------------------
  const physicsGroup = new THREE.Group();

  // Ice Mirror Sunlight Beam: Star -> Ice -> Bounce to Space
  const iceHitPos = new THREE.Vector3(-6.2, 0.85, -3.2);
  const iceBouncePos = new THREE.Vector3(-11.8, 9.5, -14.0);
  const seaHitPos = new THREE.Vector3(0.4, 0.2, -7.0);

  const sunBeamMat = trackMat(
    new THREE.LineDashedMaterial({
      color: '#fde047',
      dashSize: 0.6,
      gapSize: 0.45,
      transparent: true,
      opacity: 0.42,
    })
  );
  const icePathGeo = trackGeo(new THREE.BufferGeometry().setFromPoints([starWorldPos, iceHitPos, iceBouncePos]));
  const icePathLine = new THREE.Line(icePathGeo, sunBeamMat);
  icePathLine.computeLineDistances();
  physicsGroup.add(icePathLine);

  const seaPathGeo = trackGeo(new THREE.BufferGeometry().setFromPoints([starWorldPos, seaHitPos]));
  const seaPathLine = new THREE.Line(seaPathGeo, sunBeamMat);
  seaPathLine.computeLineDistances();
  physicsGroup.add(seaPathLine);

  const photonConeGeo = trackGeo(new THREE.ConeGeometry(0.18, 0.56, 10));
  photonConeGeo.rotateX(Math.PI / 2);
  const sunPhotonMat = trackMat(new THREE.MeshBasicMaterial({ color: '#fde047' }));
  const icePhotonMat = trackMat(new THREE.MeshBasicMaterial({ color: '#e0f2fe' }));
  const photonInIce = new THREE.Mesh(photonConeGeo, sunPhotonMat);
  const photonOutIce = new THREE.Mesh(photonConeGeo, icePhotonMat);
  const photonInSea = new THREE.Mesh(photonConeGeo, sunPhotonMat);
  physicsGroup.add(photonInIce, photonOutIce, photonInSea);

  // Infrared Heat Blanket Canopy + Rising/Bouncing Coral-Orange Photons
  const blanketMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#fb923c',
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const blanketCanopy = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(24, 9, 16, 4)),
    blanketMat
  );
  blanketCanopy.position.set(1.5, 9.2, -9.5);
  blanketCanopy.rotation.x = Math.PI * 0.42;
  physicsGroup.add(blanketCanopy);

  const irSeaStart = new THREE.Vector3(2.2, 0.35, -7.2);
  const irBlanketHit = new THREE.Vector3(2.8, 8.9, -9.2);
  const irReturnEnd = new THREE.Vector3(4.1, 0.45, -6.5);

  const irLineMat = trackMat(
    new THREE.LineDashedMaterial({
      color: '#fb923c',
      dashSize: 0.45,
      gapSize: 0.35,
      transparent: true,
      opacity: 0.55,
    })
  );
  const irPathGeo = trackGeo(
    new THREE.BufferGeometry().setFromPoints([irSeaStart, irBlanketHit, irReturnEnd])
  );
  const irPathLine = new THREE.Line(irPathGeo, irLineMat);
  irPathLine.computeLineDistances();
  physicsGroup.add(irPathLine);

  const irPhotonMat = trackMat(new THREE.MeshBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.85 }));
  const irUpArrow = new THREE.Mesh(photonConeGeo, irPhotonMat);
  const irDownArrow = new THREE.Mesh(photonConeGeo, irPhotonMat);
  physicsGroup.add(irUpArrow, irDownArrow);

  root.add(physicsGroup);

  // -------------------------------------------------------------------------
  // 8. 3D CLIMATE WEATHER PARTICLES (Snow Flurries when Cold, Heat Embers when Hot)
  // -------------------------------------------------------------------------
  const SNOW_COUNT = 200;
  const snowPositions = new Float32Array(SNOW_COUNT * 3);
  const snowSpeeds = new Float32Array(SNOW_COUNT);
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPositions[i * 3] = (seeded(i * 5 + 1) - 0.5) * 30;
    snowPositions[i * 3 + 1] = seeded(i * 5 + 2) * 12 + 0.5;
    snowPositions[i * 3 + 2] = (seeded(i * 5 + 3) - 0.45) * 24;
    snowSpeeds[i] = 1.2 + seeded(i * 5 + 4) * 1.4;
  }
  const snowGeo = trackGeo(new THREE.BufferGeometry());
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMat = trackMat(
    new THREE.PointsMaterial({
      color: '#e0f2fe',
      size: 0.16,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.visible = false;
  root.add(snowPoints);

  const HEAT_COUNT = 120;
  const heatPositions = new Float32Array(HEAT_COUNT * 3);
  const heatSpeeds = new Float32Array(HEAT_COUNT);
  for (let i = 0; i < HEAT_COUNT; i++) {
    heatPositions[i * 3] = (seeded(i * 7 + 11) - 0.5) * 26;
    heatPositions[i * 3 + 1] = seeded(i * 7 + 12) * 8 + 0.3;
    heatPositions[i * 3 + 2] = (seeded(i * 7 + 13) - 0.5) * 20;
    heatSpeeds[i] = 1.3 + seeded(i * 7 + 14) * 1.6;
  }
  const heatGeo = trackGeo(new THREE.BufferGeometry());
  heatGeo.setAttribute('position', new THREE.BufferAttribute(heatPositions, 3));
  const heatMat = trackMat(
    new THREE.PointsMaterial({
      color: '#fb923c',
      size: 0.15,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const heatPoints = new THREE.Points(heatGeo, heatMat);
  heatPoints.visible = false;
  root.add(heatPoints);

  scene.add(root);

  return {
    root,
    starWorldPos,
    earthWorldPos,
    update: (state, tSec, dt, prefersReduced) => {
      // 1. Sky Dome & Fog
      skyUniforms.uZenith.value.copy(state.zenithColor);
      skyUniforms.uHorizon.value.copy(state.horizonColor);
      skyUniforms.uTidalShadow.value = state.tidalShadow;
      const blanketStrength = Math.max(0, Math.min(1, state.tau / 1.45));
      skyUniforms.uBlanket.value = blanketStrength;
      skyUniforms.uVapor.value = state.vaporIntensity;
      skyUniforms.uTime.value = prefersReduced ? 0 : tSec;

      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(state.horizonColor);
        scene.fog.density = 0.0112 + state.vaporIntensity * 0.0068;
      }

      // 2. Stars & Aurora
      starsMat.opacity = state.starAlpha * 0.88;
      for (let b = 0; b < auroraMats.length; b++) {
        auroraMats[b].opacity = state.starAlpha * (0.16 + 0.06 * Math.sin(tSec * 0.7 + b));
      }

      // 3. Host Star Size & Corona (boosted cleanly above bloom threshold for selective star glow)
      const visualScale =
        state.angularSizeRatio <= 1
          ? Math.max(0.6, state.angularSizeRatio)
          : 1 + Math.pow(state.angularSizeRatio - 1, 0.78) * 0.92;
      const clampedStarScale = Math.min(3.8, visualScale);
      starGroup.scale.setScalar(clampedStarScale);
      starDiskMat.color.copy(state.sunColor).lerp(_c1.set('#ffffff'), 0.38).multiplyScalar(1.12);
      coronaInnerMat.color.copy(state.sunColor);
      coronaOuterMat.color.copy(state.sunColor).lerp(state.horizonColor, 0.35);
      rayMat.color.copy(state.sunColor);

      // 4. Distant 3D Earth
      const frozenMix = Math.max(0, Math.min(1, (state.albedo - 0.305) / 0.315));
      const hotMix = Math.max(0, Math.min(1, (state.tempK - 335) / 85));
      earthUniforms.uFrozenMix.value = frozenMix;
      earthUniforms.uHotMix.value = hotMix;
      earthUniforms.uCapReach.value = 0.16 + frozenMix * 0.82;
      earthUniforms.uTidalLocked.value = state.tidalShadow;
      earthUniforms.uAtmoColor.value.copy(state.zenithColor);
      earthUniforms.uSpin.value = prefersReduced
        ? 0.15
        : state.tidalShadow > 0.5
          ? 0.25
          : (tSec * 0.025) % 1;
      earthClouds.rotation.y = prefersReduced ? 0 : tSec * 0.04;
      earthCloudMat.opacity =
        state.waterPhase === 'vapor' || state.waterPhase === 'boiling' ? 0.65 : 0.4;
      earthHaloMat.color.copy(state.zenithColor);
      // Sun direction toward Earth
      _dir.subVectors(starWorldPos, earthWorldPos).normalize();
      earthUniforms.uSunDir.value.copy(_dir);

      // 5. Ocean Morphing & Ice Floes & Vapor
      oceanTimeUniform.value = prefersReduced ? 0 : tSec;
      const isFrozen = state.waterPhase === 'frozen';
      const isMostlyFrozen = state.waterPhase === 'mostlyFrozen';
      const isBoiling = state.waterPhase === 'boiling' || state.waterPhase === 'vapor';

      oceanAmpUniform.value = isFrozen ? 0.0 : isMostlyFrozen ? 0.035 : isBoiling ? 0.16 : 0.085;
      textures.oceanNormal.offset.set(tSec * 0.015, tSec * 0.01);

      const iceBlend = Math.max(0, Math.min(1, (state.albedo - 0.31) / 0.31));
      oceanIceUniform.value = iceBlend;
      const hotBlend = Math.max(0, Math.min(1, (state.tempK - 335) / 85));
      _c1.set('#0e3c68').lerp(_c2.set('#a8cde8'), iceBlend * 0.78);
      _c1.lerp(_c3.set('#5a2d1d'), hotBlend * 0.62);
      oceanMat.color.copy(_c1);
      oceanMat.roughness = isFrozen ? 0.55 : isMostlyFrozen ? 0.34 : 0.18;

      floeMesh.visible = isMostlyFrozen || isFrozen;
      if (floeMesh.visible) {
        const countScale = isFrozen ? 1.45 : 1.0;
        for (let i = 0; i < floeCount; i++) {
          const fm = floeMeta[i];
          const bob = prefersReduced ? 0 : Math.sin(tSec * 1.1 + fm.phase) * 0.04;
          _pos.set(fm.x, 0.04 + bob, fm.z);
          _euler.set(0, fm.rot + (prefersReduced ? 0 : tSec * 0.03), 0);
          _quat.setFromEuler(_euler);
          _scale.set(fm.sx * countScale, 1, fm.sz * countScale);
          _mat4.compose(_pos, _quat, _scale);
          floeMesh.setMatrixAt(i, _mat4);
        }
        floeMesh.instanceMatrix.needsUpdate = true;
      }

      for (let i = 0; i < vaporItems.length; i++) {
        const vi = vaporItems[i];
        const vMat = vi.sprite.material as THREE.SpriteMaterial;
        if (state.vaporIntensity <= 0.03) {
          vMat.opacity = 0;
          continue;
        }
        const prog = ((prefersReduced ? 0.4 : tSec * vi.speed) + vi.offset) % 1;
        vi.sprite.position.set(
          vi.x + Math.sin(prog * 4 + i) * 0.45,
          0.35 + prog * 6.5,
          vi.z
        );
        const sc = vi.baseScale * (0.7 + prog * 1.15);
        vi.sprite.scale.set(sc, sc, 1);
        vMat.opacity = Math.sin(prog * Math.PI) * state.vaporIntensity * 0.48;
      }

      // 6. Animated 3D Sunlight & Infrared Photons
      const p1 = prefersReduced ? 0.45 : (tSec * 0.36) % 1;
      const p2 = (p1 + 0.5) % 1;
      const p3 = (p1 + 0.3) % 1;

      photonInIce.position.lerpVectors(starWorldPos, iceHitPos, p1);
      photonInIce.lookAt(iceHitPos);

      photonOutIce.position.lerpVectors(iceHitPos, iceBouncePos, p2);
      photonOutIce.lookAt(iceBouncePos);

      photonInSea.position.lerpVectors(starWorldPos, seaHitPos, p3);
      photonInSea.lookAt(seaHitPos);

      const showBlanket = blanketStrength > 0.02;
      blanketCanopy.visible = showBlanket;
      irPathLine.visible = showBlanket;
      irUpArrow.visible = showBlanket;
      irDownArrow.visible = showBlanket;
      if (showBlanket) {
        blanketMat.opacity = 0.06 + blanketStrength * 0.22;
        irLineMat.opacity = 0.25 + blanketStrength * 0.5;
        irPhotonMat.opacity = 0.45 + blanketStrength * 0.5;
        const upT = (p1 + 0.15) % 1;
        const dnT = (p1 + 0.65) % 1;
        irUpArrow.position.lerpVectors(irSeaStart, irBlanketHit, upT);
        irUpArrow.lookAt(irBlanketHit);
        irDownArrow.position.lerpVectors(irBlanketHit, irReturnEnd, dnT);
        irDownArrow.lookAt(irReturnEnd);
      }

      // 7. 3D Snow Flurry & Heat Ember Particles
      const coldFactor = Math.max(0, Math.min(1, (275 - state.tempK) / 24));
      if (coldFactor > 0.04) {
        snowPoints.visible = true;
        snowMat.opacity = coldFactor * 0.78;
        if (!prefersReduced) {
          const posArr = snowGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < SNOW_COUNT; i++) {
            const idx = i * 3;
            posArr[idx + 1] -= snowSpeeds[i] * dt * (0.7 + coldFactor * 0.6);
            posArr[idx] += Math.sin(tSec * 1.3 + i) * 0.35 * dt;
            if (posArr[idx + 1] < 0.2) {
              posArr[idx + 1] = 12.2;
            }
          }
          snowGeo.attributes.position.needsUpdate = true;
        }
      } else {
        snowPoints.visible = false;
      }

      const heatFactor = Math.max(0, Math.min(1, (state.tempK - 315) / 55));
      if (heatFactor > 0.04) {
        heatPoints.visible = true;
        heatMat.opacity = heatFactor * 0.72;
        if (!prefersReduced) {
          const posArr = heatGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < HEAT_COUNT; i++) {
            const idx = i * 3;
            posArr[idx + 1] += heatSpeeds[i] * dt * (0.7 + heatFactor * 0.7);
            posArr[idx] += Math.cos(tSec * 1.7 + i) * 0.4 * dt;
            if (posArr[idx + 1] > 8.6) {
              posArr[idx + 1] = 0.25;
            }
          }
          heatGeo.attributes.position.needsUpdate = true;
        }
      } else {
        heatPoints.visible = false;
      }
    },
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
