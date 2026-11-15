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
      opacity: 0.92,
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
      opacity: 0.45,
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
      opacity: 0.055,
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
  // 5. OCEAN SURFACE (Animated Vertex Ripples + Phase Morphing + Ice Floes + Vapor)
  // -------------------------------------------------------------------------
  const oceanTimeUniform = { value: 0 };
  const oceanAmpUniform = { value: 0.09 };
  const oceanMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#114170',
      normalMap: textures.oceanNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.2,
      metalness: 0.35,
    })
  );
  oceanMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanTimeUniform;
    shader.uniforms.uAmp = oceanAmpUniform;
    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uAmp;
      ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float w1 = sin(position.x * 0.36 + uTime * 1.4) * cos(position.y * 0.28 + uTime * 1.1);
      float w2 = sin(position.x * 0.85 - uTime * 2.1 + position.y * 0.65) * 0.45;
      transformed.z += (w1 + w2) * uAmp;
      `
    );
  };
  const oceanMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(240, 240, 88, 88)), oceanMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.receiveShadow = true;
  root.add(oceanMesh);

  // Floating 3D ice floes (mostlyFrozen)
  const floeCount = 34;
  const floeGeo = trackGeo(new THREE.CylinderGeometry(0.85, 1.0, 0.18, 6));
  const floeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.iceColor,
      color: '#dceeff',
      roughness: 0.35,
      metalness: 0.05,
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
  // 6. COASTAL BASALT HEADLANDS, ARCHIPELAGO & FOREGROUND OBSERVATORY DECK
  // -------------------------------------------------------------------------
  const matBasalt = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.rockColor,
      bumpMap: textures.rockBump,
      bumpScale: 0.08,
      color: '#252f42',
      roughness: 0.88,
      metalness: 0.08,
      flatShading: true,
    })
  );
  const matFarMountain = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#141d2e',
      roughness: 0.94,
      metalness: 0.05,
      flatShading: true,
    })
  );

  // Left headland (supports starmap telescope dome at (-7.1, 1.28, 1.35))
  const leftCape = new THREE.Group();
  const leftBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.4, 4.8, 1.4, 8)), matBasalt);
  leftBase.position.set(-7.1, 0.58, 1.35);
  leftBase.receiveShadow = true;
  leftBase.castShadow = true;
  leftCape.add(leftBase);

  const leftCrag = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(2.4, 3.1, 7)), matBasalt);
  leftCrag.position.set(-10.2, 1.3, -0.8);
  leftCrag.castShadow = true;
  leftCape.add(leftCrag);
  root.add(leftCape);

  // Right headland (supports terminator orrery at (7.45, 1.25, -1.65))
  const rightCape = new THREE.Group();
  const rightBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.8, 4.1, 1.35, 8)), matBasalt);
  rightBase.position.set(7.45, 0.57, -1.65);
  rightBase.receiveShadow = true;
  rightBase.castShadow = true;
  rightCape.add(rightBase);

  const rightCrag = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(2.6, 3.6, 7)), matBasalt);
  rightCrag.position.set(10.8, 1.55, -3.5);
  rightCrag.castShadow = true;
  rightCape.add(rightCrag);
  root.add(rightCape);

  // Distant horizon mountain islands framing the bay
  const mountainArc: [number, number, number, number][] = [
    [-28, -42, 9.5, 5.2],
    [-16, -46, 8.0, 4.4],
    [-4, -49, 7.2, 3.0],
    [10, -47, 8.6, 4.2],
    [24, -43, 10.2, 5.8],
    [36, -36, 9.0, 4.6],
    [-36, -34, 8.8, 4.8],
  ];
  for (const [mx, mz, mr, mh] of mountainArc) {
    const mtn = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(mr, mh, 7)), matFarMountain);
    mtn.position.set(mx, mh * 0.42 - 0.15, mz);
    mtn.rotation.y = mx * 0.2;
    root.add(mtn);
  }

  // Foreground Observatory Deck Balcony (supports thermometer, valve, lever, sky mast)
  const deckGroup = new THREE.Group();
  const matDeckTop = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.deckColor,
      bumpMap: textures.deckBump,
      bumpScale: 0.03,
      color: '#2c3950',
      roughness: 0.56,
      metalness: 0.62,
    })
  );
  const matDeckCurb = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#111827',
      roughness: 0.72,
      metalness: 0.35,
    })
  );
  const matRailSteel = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.3,
      metalness: 0.85,
    })
  );
  const matGlassBarrier = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      roughness: 0.1,
      metalness: 0.05,
      transparent: true,
      opacity: 0.18,
    })
  );

  // Main deck slab & lower skirt
  const deckSlab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(17.6, 0.36, 6.8)), matDeckTop);
  deckSlab.position.set(0.8, 0.1, 4.5);
  deckSlab.receiveShadow = true;
  deckGroup.add(deckSlab);

  const deckCurb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18.0, 0.24, 7.1)), matDeckCurb);
  deckCurb.position.set(0.8, -0.02, 4.5);
  deckGroup.add(deckCurb);

  // Front safety railing along central ocean edge (x in [-5.6, 6.3]), leaving portals open to left/right ramps
  const topRail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.038, 0.038, 12.0, 12)), matRailSteel);
  topRail.rotation.z = Math.PI / 2;
  topRail.position.set(0.35, 1.02, 1.2);
  deckGroup.add(topRail);

  const glassWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.9, 0.68, 0.04)), matGlassBarrier);
  glassWall.position.set(0.35, 0.64, 1.2);
  deckGroup.add(glassWall);

  for (let px = -5.6; px <= 6.35; px += 2.38) {
    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.045, 0.78, 10)), matRailSteel);
    post.position.set(px, 0.65, 1.2);
    deckGroup.add(post);
  }

  // Right coastal walkway ramp (z = 1.3 y=0.28 -> z = -0.75 y=1.25)
  const rightRamp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.75, 0.16, 2.35)), matDeckTop);
  rightRamp.position.set(7.45, 0.72, 0.25);
  rightRamp.rotation.x = Math.atan2(1.25 - 0.28, 2.05);
  rightRamp.receiveShadow = true;
  rightRamp.castShadow = true;
  deckGroup.add(rightRamp);

  // Left headland ramp (z = 3.1 y=0.28 -> z = 1.95 y=1.28)
  const leftRamp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.85, 0.16, 1.6)), matDeckTop);
  leftRamp.position.set(-6.5, 0.74, 2.45);
  leftRamp.rotation.x = Math.atan2(1.28 - 0.28, 1.15);
  leftRamp.receiveShadow = true;
  leftRamp.castShadow = true;
  deckGroup.add(leftRamp);

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
        scene.fog.density = 0.0082 + state.vaporIntensity * 0.0055;
      }

      // 2. Stars & Aurora
      starsMat.opacity = state.starAlpha * 0.88;
      for (let b = 0; b < auroraMats.length; b++) {
        auroraMats[b].opacity = state.starAlpha * (0.16 + 0.06 * Math.sin(tSec * 0.7 + b));
      }

      // 3. Host Star Size & Corona
      const visualScale =
        state.angularSizeRatio <= 1
          ? Math.max(0.6, state.angularSizeRatio)
          : 1 + Math.pow(state.angularSizeRatio - 1, 0.78) * 0.92;
      const clampedStarScale = Math.min(3.8, visualScale);
      starGroup.scale.setScalar(clampedStarScale);
      starDiskMat.color.copy(state.sunColor).lerp(_c1.set('#ffffff'), 0.45);
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
