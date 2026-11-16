import * as THREE from 'three';
import type { ObservatoryTextures } from './materials';

export type LandmarkId =
  | 'thermometer'
  | 'ice'
  | 'valve'
  | 'lever'
  | 'vapor'
  | 'starmap'
  | 'sky'
  | 'terminator';

export interface LandmarkUpdateState {
  tempK: number;
  albedo: number;
  a_AU: number;
  co2_ppm: number;
  noGreenhouse: boolean;
  tidalLocked: boolean;
  vaporIntensity: number;
  starKey: string;
  hzBounds: { inner: number; outer: number };
  starWorldPos: THREE.Vector3;
  visibleIds: Set<string>;
  spotlightIds: Set<string>;
  inspectedIds: Set<string>;
  activeId: string | null;
}

export interface LandmarkRig {
  id: LandmarkId;
  group: THREE.Group;
  anchorLocal: THREE.Vector3;
  hitMeshes: THREE.Object3D[];
  update: (state: LandmarkUpdateState, tSec: number, dt: number) => void;
}

export interface LandmarksSystem {
  root: THREE.Group;
  rigs: LandmarkRig[];
  hitMeshes: THREE.Object3D[];
  update: (state: LandmarkUpdateState, tSec: number, dt: number) => void;
  dispose: () => void;
}

const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _dir = new THREE.Vector3();
const _targetWorld = new THREE.Vector3();

function seeded(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function createLandmarksSystem(textures: ObservatoryTextures): LandmarksSystem {
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

  // Shared high-contrast PBR materials with procedural micro-detail maps
  const matDarkSteel = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.42, 0.42),
      roughnessMap: textures.metalRoughness,
      color: '#1e293b',
      roughness: 0.52,
      metalness: 0.84,
      envMapIntensity: 1.2,
    })
  );
  const matBrushedAlum = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      roughnessMap: textures.metalRoughness,
      color: '#cbd5e1',
      roughness: 0.34,
      metalness: 0.9,
      envMapIntensity: 1.35,
    })
  );
  const matBrass = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughnessMap: textures.metalRoughness,
      color: '#d9a441',
      roughness: 0.34,
      metalness: 0.92,
      envMapIntensity: 1.4,
    })
  );
  const matCopper = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.26, 0.26),
      roughnessMap: textures.metalRoughness,
      color: '#c26b3b',
      roughness: 0.38,
      metalness: 0.88,
      envMapIntensity: 1.3,
    })
  );
  const matSolarCell = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#0f294d',
      roughness: 0.18,
      metalness: 0.72,
      envMapIntensity: 1.45,
    })
  );
  const matGlass = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#dff4ff',
      roughness: 0.05,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      ior: 1.5,
      reflectivity: 0.95,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: 0.36,
    })
  );
  const matStonePlinth = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.rockColor,
      normalMap: textures.rockNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: textures.rockRoughness,
      bumpMap: textures.rockBump,
      bumpScale: 0.04,
      color: '#4b5568',
      roughness: 0.88,
      metalness: 0.08,
    })
  );
  const matContactShadow = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  const matHitProxy = trackMat(
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );

  const contactPlaneGeo = trackGeo(new THREE.PlaneGeometry(1, 1));
  contactPlaneGeo.rotateX(-Math.PI / 2);

  const addContactShadow = (group: THREE.Group, diameter: number, yOffset = 0.008) => {
    const cs = new THREE.Mesh(contactPlaneGeo, matContactShadow);
    cs.scale.set(diameter, 1, diameter);
    cs.position.y = yOffset;
    group.add(cs);
  };

  const rigs: LandmarkRig[] = [];
  const allHitMeshes: THREE.Object3D[] = [];

  function attachStatusRingAndCollider(
    id: LandmarkId,
    group: THREE.Group,
    ringY: number,
    ringRadius: number,
    hitCenter: THREE.Vector3,
    hitSize: THREE.Vector3
  ) {
    const ringGeo = trackGeo(new THREE.TorusGeometry(ringRadius, 0.042, 10, 44));
    const ringMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0,
      })
    );
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = ringY;
    group.add(ringMesh);

    const hitGeo = trackGeo(new THREE.BoxGeometry(hitSize.x, hitSize.y, hitSize.z));
    const hitMesh = new THREE.Mesh(hitGeo, matHitProxy);
    hitMesh.position.copy(hitCenter);
    hitMesh.userData.conceptId = id;
    group.add(hitMesh);

    const localHits: THREE.Object3D[] = [hitMesh];
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj !== ringMesh) {
        obj.userData.conceptId = id;
        localHits.push(obj);
      }
    });
    allHitMeshes.push(...localHits);

    const updateRing = (state: LandmarkUpdateState, tSec: number) => {
      const visible = state.visibleIds.has(id);
      group.visible = visible;
      if (!visible) return;

      const isSpot = state.spotlightIds.has(id);
      const isAct = state.activeId === id;
      const isInsp = state.inspectedIds.has(id);

      if (isAct) {
        ringMat.color.set('#38bdf8');
        ringMat.opacity = 0.85;
        ringMesh.scale.setScalar(1.06 + Math.sin(tSec * 4) * 0.04);
      } else if (isSpot) {
        ringMat.color.set('#fcd34d');
        ringMat.opacity = 0.65 + 0.35 * Math.sin(tSec * 4.5);
        ringMesh.scale.setScalar(1.0 + Math.sin(tSec * 4.5) * 0.08);
      } else if (isInsp) {
        ringMat.color.set('#34d399');
        ringMat.opacity = 0.38;
        ringMesh.scale.setScalar(1);
      } else {
        ringMat.color.set('#94a3b8');
        ringMat.opacity = 0.16;
        ringMesh.scale.setScalar(1);
      }
    };

    return { localHits, updateRing };
  }

  // -------------------------------------------------------------------------
  // 1. THERMOMETER (Right Observatory Deck — Lathed Plinth + Beveled Instrument Housing)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(4.55, 0.28, 3.85);
    g.rotation.y = -0.35;
    addContactShadow(g, 1.85);

    const plinthProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.72, 0.0),
      new THREE.Vector2(0.7, 0.09),
      new THREE.Vector2(0.6, 0.14),
      new THREE.Vector2(0.56, 0.28),
      new THREE.Vector2(0.46, 0.36),
      new THREE.Vector2(0.0, 0.36),
    ];
    const plinth = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(plinthProfile, 24)), matStonePlinth);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    g.add(plinth);

    const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 24)), matBrass);
    collar.position.y = 0.4;
    collar.castShadow = true;
    g.add(collar);

    const boltGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6));
    for (let b = 0; b < 6; b++) {
      const a = (b / 6) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, matBrushedAlum);
      bolt.position.set(Math.cos(a) * 0.52, 0.34, Math.sin(a) * 0.52);
      g.add(bolt);
    }

    // Beveled arched instrument frame
    const frameShape = new THREE.Shape();
    frameShape.moveTo(-0.3, 0);
    frameShape.lineTo(0.3, 0);
    frameShape.lineTo(0.28, 2.22);
    frameShape.absarc(0, 2.22, 0.28, 0, Math.PI, false);
    frameShape.lineTo(-0.3, 0);
    const backingGeo = trackGeo(
      new THREE.ExtrudeGeometry(frameShape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2,
      })
    );
    backingGeo.computeVertexNormals();
    const backing = new THREE.Mesh(backingGeo, matDarkSteel);
    backing.position.set(0, 0.44, -0.14);
    backing.castShadow = true;
    g.add(backing);

    // Side brushed-aluminum rails & protective brass guard hoops
    for (const rx of [-0.26, 0.26]) {
      const rail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 2.25, 10)), matBrushedAlum);
      rail.position.set(rx, 1.58, 0.04);
      rail.castShadow = true;
      g.add(rail);
    }
    for (let h = 0; h < 4; h++) {
      const hoop = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.2, 0.022, 8, 20, Math.PI)),
        matBrass
      );
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(0, 0.96 + h * 0.46, 0.01);
      g.add(hoop);
    }

    // Top crown finial
    const crownCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.17, 0.14, 16)), matBrass);
    crownCap.position.set(0, 2.98, -0.04);
    g.add(crownCap);

    // Graduated scale tick marks
    for (let i = 0; i < 7; i++) {
      const tick = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(i % 2 === 0 ? 0.14 : 0.09, 0.026, 0.03)),
        i % 2 === 0 ? matBrass : matBrushedAlum
      );
      tick.position.set(0.16, 0.88 + i * 0.27, 0.02);
      g.add(tick);
    }

    const glassTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.105, 0.105, 2.05, 18)), matGlass);
    glassTube.position.set(0, 1.65, 0.05);
    g.add(glassTube);

    const glassTopCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.105, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      matGlass
    );
    glassTopCap.position.set(0, 2.67, 0.05);
    g.add(glassTopCap);

    const bulbGlass = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.22, 20, 16)), matGlass);
    bulbGlass.position.set(0, 0.59, 0.05);
    g.add(bulbGlass);

    const mercuryMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#34d399',
        emissive: '#10b981',
        emissiveIntensity: 1.05,
        roughness: 0.18,
        metalness: 0.34,
      })
    );
    const mercuryBulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 18, 14)), mercuryMat);
    mercuryBulb.position.set(0, 0.59, 0.05);
    g.add(mercuryBulb);

    const mercuryColGeo = trackGeo(new THREE.CylinderGeometry(0.062, 0.062, 1.0, 14));
    mercuryColGeo.translate(0, 0.5, 0);
    const mercuryCol = new THREE.Mesh(mercuryColGeo, mercuryMat);
    mercuryCol.position.set(0, 0.63, 0.05);
    g.add(mercuryCol);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'thermometer',
      g,
      0.04,
      0.88,
      new THREE.Vector3(0, 1.5, 0),
      new THREE.Vector3(1.15, 3.05, 1.15)
    );
    root.add(g);

    rigs.push({
      id: 'thermometer',
      group: g,
      anchorLocal: new THREE.Vector3(0, 3.18, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        const frac = Math.max(0.15, Math.min(1.9, ((state.tempK - 210) / 190) * 1.9));
        mercuryCol.scale.y = frac;
        if (state.tempK < 273.15) {
          _colorA.set('#38bdf8');
          _colorB.set('#0284c7');
        } else if (state.tempK < 315) {
          _colorA.set('#34d399');
          _colorB.set('#059669');
        } else {
          _colorA.set('#fb923c');
          _colorB.set('#ea580c');
        }
        mercuryMat.color.copy(_colorA);
        mercuryMat.emissive.copy(_colorB);
      },
    });
  }

  // -------------------------------------------------------------------------
  // 2. POLAR ICE SHELF (Left Coastal Bay — Sculpted Crystalline Glacial Peaks)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(-6.6, 0.0, -3.5);

    const matIcePrimary = trackMat(
      new THREE.MeshPhysicalMaterial({
        map: textures.iceColor,
        normalMap: textures.iceNormal,
        normalScale: new THREE.Vector2(0.88, 0.88),
        roughnessMap: textures.iceRoughness,
        bumpMap: textures.iceBump,
        bumpScale: 0.05,
        color: '#daf0ff',
        roughness: 0.42,
        metalness: 0.05,
        clearcoat: 0.42,
        clearcoatRoughness: 0.2,
        envMapIntensity: 0.9,
        flatShading: true,
      })
    );
    const matIceDeep = trackMat(
      new THREE.MeshPhysicalMaterial({
        normalMap: textures.iceNormal,
        normalScale: new THREE.Vector2(0.65, 0.65),
        roughnessMap: textures.iceRoughness,
        color: '#6bb8eb',
        roughness: 0.36,
        metalness: 0.06,
        clearcoat: 0.48,
        clearcoatRoughness: 0.22,
        flatShading: true,
      })
    );

    const iceCluster = new THREE.Group();

    // Sculpted irregular tabular glacier shelf slab
    const shelfShape = new THREE.Shape();
    for (let s = 0; s < 10; s++) {
      const a = (s / 10) * Math.PI * 2;
      const r = (s % 2 === 0 ? 2.85 : 2.35) + seeded(s * 7 + 2) * 0.45;
      const sx = Math.cos(a) * r * 1.18;
      const sy = Math.sin(a) * r * 0.85;
      if (s === 0) shelfShape.moveTo(sx, sy);
      else shelfShape.lineTo(sx, sy);
    }
    shelfShape.closePath();
    const shelfGeo = trackGeo(
      new THREE.ExtrudeGeometry(shelfShape, {
        depth: 0.34,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.14,
        bevelSegments: 2,
      })
    );
    shelfGeo.rotateX(-Math.PI / 2);
    shelfGeo.computeVertexNormals();
    const shelfSlab = new THREE.Mesh(shelfGeo, matIceDeep);
    shelfSlab.position.set(0.35, -0.02, 0.15);
    shelfSlab.receiveShadow = true;
    shelfSlab.castShadow = true;
    iceCluster.add(shelfSlab);

    // Helper: sculpted angular faceted glacier spire
    const buildGlacierSpireGeo = (rad: number, ht: number, seedVal: number): THREE.BufferGeometry => {
      const geo = trackGeo(new THREE.CylinderGeometry(rad * 0.22, rad, ht, 7, 3));
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const r = Math.hypot(vx, vz);
        if (r < 0.01) continue;
        const ang = Math.atan2(vz, vx);
        const hFrac = (vy + ht * 0.5) / ht;
        const facetShift =
          1 +
          0.26 * Math.sin(ang * 3 + seedVal) +
          0.14 * Math.cos(ang * 5 - hFrac * 3.0 + seedVal * 2);
        // Slight glacial shear lean toward +X/+Z
        const shear = hFrac * rad * 0.22 * Math.sin(seedVal);
        pos.setXYZ(i, vx * facetShift + shear, vy, vz * facetShift);
      }
      geo.computeVertexNormals();
      return geo;
    };

    const spireSpecs: [number, number, number, number, number, boolean][] = [
      [-0.85, 0.15, 1.15, 2.35, 0.25, true],
      [0.32, -0.35, 0.98, 1.85, -0.5, false],
      [-0.08, 0.78, 0.85, 1.35, 0.8, true],
      [1.38, 0.22, 0.82, 1.15, 1.3, false],
      [-1.58, -0.45, 0.94, 1.55, -0.9, true],
      [0.75, -0.92, 0.65, 1.05, 2.1, true],
    ];
    for (let i = 0; i < spireSpecs.length; i++) {
      const [px, pz, rad, ht, ry, primary] = spireSpecs[i];
      const spire = new THREE.Mesh(
        buildGlacierSpireGeo(rad, ht, i * 2.7 + 1.1),
        primary ? matIcePrimary : matIceDeep
      );
      spire.position.set(px, 0.24 + ht * 0.44, pz);
      spire.rotation.y = ry;
      spire.castShadow = true;
      spire.receiveShadow = true;
      iceCluster.add(spire);
    }

    // Perimeter low ice shards sitting in water
    const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.42, 0));
    const shardCoords: [number, number, number, number][] = [
      [2.45, 0.75, 0.8, 0.4],
      [-2.35, 1.15, 0.7, 1.2],
      [1.85, -1.55, 0.9, 2.0],
      [-2.1, -1.65, 0.75, 0.7],
    ];
    for (const [sx, sz, sc, rot] of shardCoords) {
      const sh = new THREE.Mesh(shardGeo, matIcePrimary);
      sh.position.set(sx, 0.08, sz);
      sh.scale.set(sc * 1.4, sc * 0.45, sc * 1.1);
      sh.rotation.set(0.15, rot, -0.1);
      sh.receiveShadow = true;
      iceCluster.add(sh);
    }
    g.add(iceCluster);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'ice',
      g,
      0.26,
      2.65,
      new THREE.Vector3(0.2, 1.1, 0.1),
      new THREE.Vector3(4.6, 2.6, 3.9)
    );
    root.add(g);

    rigs.push({
      id: 'ice',
      group: g,
      anchorLocal: new THREE.Vector3(0.2, 2.75, 0.1),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        const iceNorm = Math.max(0.28, Math.min(1.45, (state.albedo - 0.18) / (0.58 - 0.18)));
        iceCluster.scale.set(0.65 + iceNorm * 0.52, 0.55 + iceNorm * 0.55, 0.65 + iceNorm * 0.52);
      },
    });
  }

  // -------------------------------------------------------------------------
  // 3. GAS VALVE (Center-Right Observatory Deck — Curved Cryo Conduits & 5-Spoke Wheel)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(1.55, 0.28, 4.95);
    g.rotation.y = 0.18;
    addContactShadow(g, 2.15);

    // Curved intake & exhaust cryo-pipes curving gracefully into deck manifolds
    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.78, 0.02, 0),
      new THREE.Vector3(-0.74, 0.34, 0),
      new THREE.Vector3(0.0, 0.36, 0),
      new THREE.Vector3(0.74, 0.34, 0),
      new THREE.Vector3(0.78, 0.02, 0),
    ]);
    const pipeMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(pipeCurve, 28, 0.135, 14, false)),
      matDarkSteel
    );
    pipeMesh.castShadow = true;
    pipeMesh.receiveShadow = true;
    g.add(pipeMesh);

    // Bolted hexagonal deck manifold pads & pipe collar flanges
    for (const fx of [-0.78, 0.78]) {
      const deckPad = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 6)), matDarkSteel);
      deckPad.position.set(fx, 0.04, 0);
      deckPad.receiveShadow = true;
      g.add(deckPad);

      const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 16)), matBrushedAlum);
      collar.position.set(fx, 0.2, 0);
      g.add(collar);
    }

    // Central lathed copper/brass pressure regulator valve body
    const valveBodyProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.24, 0.0),
      new THREE.Vector2(0.24, 0.08),
      new THREE.Vector2(0.28, 0.18),
      new THREE.Vector2(0.22, 0.36),
      new THREE.Vector2(0.14, 0.48),
      new THREE.Vector2(0.11, 0.68),
      new THREE.Vector2(0.0, 0.68),
    ];
    const valveBody = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(valveBodyProfile, 20)),
      matCopper
    );
    valveBody.position.y = 0.26;
    valveBody.castShadow = true;
    g.add(valveBody);

    // Analog pressure gauge with brass bezel, glass lens & live rotating needle
    const gaugeGroup = new THREE.Group();
    gaugeGroup.position.set(0.36, 0.66, 0.14);
    gaugeGroup.rotation.y = -0.18;

    const gaugeStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 10)), matBrass);
    gaugeStem.rotation.z = Math.PI / 2;
    gaugeStem.position.set(-0.14, -0.06, -0.06);
    gaugeGroup.add(gaugeStem);

    const gaugeBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 20)), matBrass);
    gaugeBody.rotation.x = Math.PI / 2;
    gaugeGroup.add(gaugeBody);

    const gaugeFace = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.15, 20)),
      trackMat(new THREE.MeshBasicMaterial({ color: '#fef3c7' }))
    );
    gaugeFace.position.z = 0.043;
    gaugeGroup.add(gaugeFace);

    const gaugeNeedlePivot = new THREE.Group();
    gaugeNeedlePivot.position.z = 0.048;
    const needleGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.11, 0.01));
    needleGeo.translate(0, 0.04, 0);
    const needleMesh = new THREE.Mesh(
      needleGeo,
      trackMat(new THREE.MeshBasicMaterial({ color: '#dc2626' }))
    );
    gaugeNeedlePivot.add(needleMesh);
    gaugeGroup.add(gaugeNeedlePivot);

    const gaugeGlass = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.16, 20)), matGlass);
    gaugeGlass.position.z = 0.052;
    gaugeGroup.add(gaugeGlass);
    g.add(gaugeGroup);

    // Ergonomic 5-spoke coral-orange handwheel with center locknut
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 1.0, 0);
    const matWheel = trackMat(
      new THREE.MeshStandardMaterial({
        normalMap: textures.metalNormal,
        normalScale: new THREE.Vector2(0.25, 0.25),
        roughnessMap: textures.metalRoughness,
        color: '#f97316',
        roughness: 0.38,
        metalness: 0.52,
      })
    );
    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.44, 0.055, 14, 32)), matWheel);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    wheelGroup.add(rim);

    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 0.11, 16)), matBrass);
    wheelGroup.add(hub);
    const lockNut = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 6)), matBrushedAlum);
    wheelGroup.add(lockNut);

    const spokeGeo = trackGeo(new THREE.CylinderGeometry(0.026, 0.036, 0.4, 8));
    spokeGeo.rotateZ(Math.PI / 2);
    spokeGeo.translate(0.22, 0, 0);
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(spokeGeo, matWheel);
      spoke.rotation.y = (s * Math.PI * 2) / 5;
      wheelGroup.add(spoke);
    }
    g.add(wheelGroup);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'valve',
      g,
      0.04,
      0.92,
      new THREE.Vector3(0, 0.68, 0),
      new THREE.Vector3(1.85, 1.4, 1.15)
    );
    root.add(g);

    rigs.push({
      id: 'valve',
      group: g,
      anchorLocal: new THREE.Vector3(0, 1.58, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        const co2Ratio = state.noGreenhouse ? 0 : Math.min(1, state.co2_ppm / 2000);
        wheelGroup.rotation.y = co2Ratio * Math.PI * 3 + Math.sin(tSec * 0.8) * 0.06;
        gaugeNeedlePivot.rotation.z = 1.9 - co2Ratio * 3.8;
      },
    });
  }

  // -------------------------------------------------------------------------
  // 4. ORBIT LEVER CONSOLE (Right Foredeck — Beveled Sloped Aerospace Pedestal)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(6.35, 0.28, 5.35);
    g.rotation.y = -0.52;
    addContactShadow(g, 1.65);

    // Sloped trapezoidal console housing (side profile in XY extruded along Z -> rotated Y)
    const consoleProfile = new THREE.Shape();
    consoleProfile.moveTo(-0.42, 0);
    consoleProfile.lineTo(0.42, 0);
    consoleProfile.lineTo(0.32, 0.72);
    consoleProfile.lineTo(-0.24, 0.92);
    consoleProfile.lineTo(-0.38, 0.86);
    consoleProfile.closePath();

    const baseGeo = trackGeo(
      new THREE.ExtrudeGeometry(consoleProfile, {
        depth: 0.84,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.045,
        bevelSegments: 2,
      })
    );
    baseGeo.translate(0, 0, -0.42);
    baseGeo.rotateY(-Math.PI / 2); // now sloped front faces +Z
    baseGeo.computeVertexNormals();

    const base = new THREE.Mesh(baseGeo, matDarkSteel);
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    // Brushed metallic upper bezel plate
    const topDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 0.06, 0.56)), matBrushedAlum);
    topDeck.position.set(0, 0.84, -0.02);
    topDeck.rotation.x = 0.34;
    g.add(topDeck);

    // Front glowing orbital telemetry screen panel
    const screenPanel = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.62, 0.3)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: '#082f49',
          emissive: '#0284c7',
          emissiveIntensity: 0.65,
          roughness: 0.14,
          metalness: 0.2,
        })
      )
    );
    screenPanel.position.set(0, 0.45, 0.39);
    screenPanel.rotation.x = -0.14;
    g.add(screenPanel);

    // Dual brass guide rails & hydraulic damper struts along lever arc
    for (const ax of [-0.14, 0.14]) {
      const arcTrack = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.28, 0.024, 10, 22, Math.PI)),
        matBrass
      );
      arcTrack.position.set(ax, 0.86, 0);
      arcTrack.rotation.y = Math.PI / 2;
      g.add(arcTrack);
    }

    const leverPivot = new THREE.Group();
    leverPivot.position.set(0, 0.88, 0);
    const arm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.042, 0.056, 0.8, 14)), matBrushedAlum);
    arm.position.y = 0.4;
    arm.castShadow = true;
    leverPivot.add(arm);

    // Sculpted lathed rocket thruster grip + 3 swept fins
    const matGrip = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.88,
        roughness: 0.2,
        metalness: 0.42,
      })
    );
    const rocketProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.08, 0.0),
      new THREE.Vector2(0.13, 0.08),
      new THREE.Vector2(0.11, 0.22),
      new THREE.Vector2(0.05, 0.34),
      new THREE.Vector2(0.0, 0.38),
    ];
    const rocketNose = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(rocketProfile, 16)),
      matGrip
    );
    rocketNose.position.y = 0.74;
    rocketNose.castShadow = true;
    leverPivot.add(rocketNose);

    const finGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.16, 0.1));
    for (let f = 0; f < 3; f++) {
      const a = (f * Math.PI * 2) / 3;
      const fin = new THREE.Mesh(finGeo, matBrass);
      fin.position.set(Math.sin(a) * 0.11, 0.82, Math.cos(a) * 0.11);
      fin.rotation.y = a;
      leverPivot.add(fin);
    }
    g.add(leverPivot);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'lever',
      g,
      0.04,
      0.84,
      new THREE.Vector3(0, 1.02, 0),
      new THREE.Vector3(1.25, 2.05, 1.15)
    );
    root.add(g);

    rigs.push({
      id: 'lever',
      group: g,
      anchorLocal: new THREE.Vector3(0, 2.1, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        const normOrbit = state.a_AU < 0.2 ? (state.a_AU - 0.015) / 0.045 : (state.a_AU - 0.85) / 0.3;
        const clamped = Math.max(0, Math.min(1, normOrbit));
        leverPivot.rotation.x = (0.5 - clamped) * 0.95;
      },
    });
  }

  // -------------------------------------------------------------------------
  // 5. OCEAN MIST / VAPOR BUOY (Mid-Ocean — Lathed Hull + Tripod Mast + Spinning Anemometer)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(-0.6, 0.0, -4.6);

    const matBuoyYellow = trackMat(
      new THREE.MeshStandardMaterial({
        normalMap: textures.metalNormal,
        normalScale: new THREE.Vector2(0.3, 0.3),
        roughnessMap: textures.metalRoughness,
        color: '#f59e0b',
        roughness: 0.42,
        metalness: 0.38,
      })
    );
    // Flared oceanographic research buoy hull
    const hullProfile = [
      new THREE.Vector2(0.0, -0.14),
      new THREE.Vector2(0.45, -0.12),
      new THREE.Vector2(0.68, 0.06),
      new THREE.Vector2(0.76, 0.22),
      new THREE.Vector2(0.66, 0.3),
      new THREE.Vector2(0.34, 0.34),
      new THREE.Vector2(0.0, 0.34),
    ];
    const hull = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(hullProfile, 24)), matBuoyYellow);
    hull.castShadow = true;
    hull.receiveShadow = true;
    g.add(hull);

    const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.75, 0.065, 10, 28)), matDarkSteel);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.22;
    g.add(collar);

    // 4 angled photovoltaic solar sensor wings
    const panelGeo = trackGeo(new THREE.BoxGeometry(0.34, 0.025, 0.24));
    for (let p = 0; p < 4; p++) {
      const a = (p * Math.PI) / 2 + Math.PI / 4;
      const panelGroup = new THREE.Group();
      panelGroup.rotation.y = a;
      const panel = new THREE.Mesh(panelGeo, matSolarCell);
      panel.position.set(0.56, 0.38, 0);
      panel.rotation.z = -0.32;
      panelGroup.add(panel);
      g.add(panelGroup);
    }

    // 3-strut lattice tripod meteorological tower
    const strutGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.036, 1.18, 8));
    for (let s = 0; s < 3; s++) {
      const a = (s * Math.PI * 2) / 3;
      const strut = new THREE.Mesh(strutGeo, matBrushedAlum);
      strut.position.set(Math.cos(a) * 0.16, 0.9, Math.sin(a) * 0.16);
      strut.rotation.z = Math.cos(a) * 0.16;
      strut.rotation.x = -Math.sin(a) * 0.16;
      strut.castShadow = true;
      g.add(strut);
    }
    const midPlatform = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 12)), matDarkSteel);
    midPlatform.position.y = 1.12;
    g.add(midPlatform);

    // Fresnel brass guard cage around marine beacon
    const beaconMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#7dd3fc',
        emissive: '#38bdf8',
        emissiveIntensity: 1.25,
        roughness: 0.15,
      })
    );
    const beacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.135, 14, 12)), beaconMat);
    beacon.position.y = 1.54;
    g.add(beacon);

    const cageRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.19, 0.02, 8, 20)), matBrass);
    cageRing.rotation.x = Math.PI / 2;
    cageRing.position.y = 1.54;
    g.add(cageRing);

    // Spinning 3-cup anemometer wind sensor
    const anemoPivot = new THREE.Group();
    anemoPivot.position.set(0.24, 1.38, 0);
    const anemoArm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 8)), matBrushedAlum);
    anemoArm.rotation.z = Math.PI / 2;
    anemoArm.position.x = -0.12;
    anemoPivot.add(anemoArm);
    const cupGeo = trackGeo(new THREE.SphereGeometry(0.04, 10, 8, 0, Math.PI));
    const spokeA = trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6));
    spokeA.rotateZ(Math.PI / 2);
    spokeA.translate(0.08, 0, 0);
    for (let c = 0; c < 3; c++) {
      const armWrap = new THREE.Group();
      armWrap.rotation.y = (c * Math.PI * 2) / 3;
      const sp = new THREE.Mesh(spokeA, matBrushedAlum);
      const cup = new THREE.Mesh(cupGeo, matBrass);
      cup.position.set(0.16, 0, 0);
      armWrap.add(sp, cup);
      anemoPivot.add(armWrap);
    }
    g.add(anemoPivot);

    // Rising vapor sprites on the buoy
    const mistPuffs: THREE.Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      const sMat = trackMat(
        new THREE.SpriteMaterial({
          map: textures.vaporPuff,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        })
      );
      const sp = new THREE.Sprite(sMat);
      sp.position.set(Math.sin(i * 1.4) * 0.45, 0.7 + i * 0.35, Math.cos(i * 1.7) * 0.45);
      sp.scale.setScalar(0.9 + (i % 3) * 0.35);
      g.add(sp);
      mistPuffs.push(sp);
    }

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'vapor',
      g,
      0.1,
      1.08,
      new THREE.Vector3(0, 1.0, 0),
      new THREE.Vector3(1.65, 2.1, 1.65)
    );
    root.add(g);

    rigs.push({
      id: 'vapor',
      group: g,
      anchorLocal: new THREE.Vector3(0, 2.2, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        g.position.y = Math.sin(tSec * 1.6) * 0.06;
        g.rotation.z = Math.sin(tSec * 1.2) * 0.04;
        anemoPivot.rotation.y = tSec * (2.6 + state.vaporIntensity * 5.0);
        for (let i = 0; i < mistPuffs.length; i++) {
          const sp = mistPuffs[i];
          const phase = (tSec * 0.35 + i * 0.17) % 1;
          sp.position.y = 0.45 + phase * 1.9;
          const fade = Math.sin(phase * Math.PI);
          (sp.material as THREE.SpriteMaterial).opacity =
            fade * (0.22 + state.vaporIntensity * 0.55);
          const sc = (0.75 + phase * 1.1) * (0.85 + state.vaporIntensity * 0.65);
          sp.scale.set(sc, sc, 1);
        }
      },
    });
  }

  // -------------------------------------------------------------------------
  // 6. STAR TELESCOPE DOME (Left Rocky Headland — Buttressed Tower + Slotted Dome + Stepped Refractor)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(-7.1, 1.28, 1.35);
    addContactShadow(g, 3.15);

    const tower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.16, 1.36, 1.18, 8)), matStonePlinth);
    tower.position.y = 0.59;
    tower.castShadow = true;
    tower.receiveShadow = true;
    g.add(tower);

    // 8 architectural stone buttress pilasters around tower
    const pilasterGeo = trackGeo(new THREE.BoxGeometry(0.18, 1.05, 0.22));
    for (let p = 0; p < 8; p++) {
      const a = (p * Math.PI * 2) / 8 + Math.PI / 8;
      const pil = new THREE.Mesh(pilasterGeo, matDarkSteel);
      pil.position.set(Math.cos(a) * 1.2, 0.54, Math.sin(a) * 1.2);
      pil.rotation.y = -a;
      pil.castShadow = true;
      g.add(pil);
    }

    // Recessed observatory access hatch door facing promenade
    const hatchDoor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.72, 0.1)), matBrushedAlum);
    hatchDoor.position.set(0.55, 0.42, 1.06);
    hatchDoor.rotation.y = 0.46;
    g.add(hatchDoor);

    const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.24, 1.26, 0.14, 24)), matBrushedAlum);
    collar.position.y = 1.24;
    g.add(collar);

    const azimuthRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.23, 0.035, 8, 32)), matBrass);
    azimuthRing.rotation.x = Math.PI / 2;
    azimuthRing.position.y = 1.31;
    g.add(azimuthRing);

    const domeMat = trackMat(
      new THREE.MeshStandardMaterial({
        normalMap: textures.metalNormal,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughnessMap: textures.metalRoughness,
        color: '#dbe6f5',
        roughness: 0.38,
        metalness: 0.72,
        envMapIntensity: 1.3,
        side: THREE.DoubleSide,
      })
    );
    // Split observatory dome leaving an optical observation aperture slit
    const domePivot = new THREE.Group();
    domePivot.position.y = 1.3;
    const domeShell = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.14, 26, 16, 0.22, Math.PI * 2 - 0.44, 0, Math.PI * 0.52)),
      domeMat
    );
    domeShell.rotation.y = -Math.PI / 2;
    domeShell.castShadow = true;
    domePivot.add(domeShell);

    // Twin arched slit shutter track ribs flanking the opening
    for (const sx of [-0.22, 0.22]) {
      const rib = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.14, 0.042, 8, 22, Math.PI * 0.54)),
        matDarkSteel
      );
      rib.rotation.y = Math.PI / 2;
      rib.position.x = sx;
      domePivot.add(rib);
    }
    g.add(domePivot);

    // Counterweighted equatorial optical refractor telescope
    const scopePivot = new THREE.Group();
    scopePivot.position.set(0, 1.72, 0);

    // Multi-stage stepped LatheGeometry optical barrel
    const barrelProfile = [
      new THREE.Vector2(0.0, -0.45),
      new THREE.Vector2(0.11, -0.45),
      new THREE.Vector2(0.13, -0.25),
      new THREE.Vector2(0.19, -0.2),
      new THREE.Vector2(0.19, 0.95),
      new THREE.Vector2(0.22, 1.0),
      new THREE.Vector2(0.22, 1.48),
      new THREE.Vector2(0.17, 1.48),
      new THREE.Vector2(0.16, 1.34),
      new THREE.Vector2(0.0, 1.34),
    ];
    const barrelGeo = trackGeo(new THREE.LatheGeometry(barrelProfile, 20));
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, matBrass);
    barrel.castShadow = true;
    scopePivot.add(barrel);

    // Dark steel optical cradle band & piggyback finder scope
    const cradleBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.215, 0.215, 0.26, 18)), matDarkSteel);
    cradleBand.rotation.x = Math.PI / 2;
    cradleBand.position.z = 0.28;
    scopePivot.add(cradleBand);

    const finderScope = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.042, 0.052, 0.72, 12)), matBrushedAlum);
    finderScope.rotation.x = Math.PI / 2;
    finderScope.position.set(0.18, 0.22, 0.45);
    scopePivot.add(finderScope);

    const lensRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.205, 0.032, 10, 22)), matDarkSteel);
    lensRim.position.z = 1.48;
    scopePivot.add(lensRim);

    const lensGlass = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.175, 20)), matGlass);
    lensGlass.position.z = 1.44;
    scopePivot.add(lensGlass);

    g.add(scopePivot);

    // Mini 3D Habitable Zone Orbit Hologram floating above the Telescope
    const holoOrbitGroup = new THREE.Group();
    holoOrbitGroup.position.set(0, 2.95, 0);

    const miniStarMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
      })
    );
    const miniStar = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 14, 12)), miniStarMat);
    holoOrbitGroup.add(miniStar);

    const hzBandMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#10b981',
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const hzBand = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.45, 0.72, 36)), hzBandMat);
    hzBand.rotation.x = -Math.PI / 2;
    holoOrbitGroup.add(hzBand);

    const planetOrbitMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.55,
      })
    );
    const planetOrbitRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1, 0.016, 8, 36)),
      planetOrbitMat
    );
    planetOrbitRing.rotation.x = Math.PI / 2;
    holoOrbitGroup.add(planetOrbitRing);

    const miniPlanetMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
      })
    );
    const miniPlanet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.068, 12, 10)), miniPlanetMat);
    holoOrbitGroup.add(miniPlanet);

    g.add(holoOrbitGroup);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'starmap',
      g,
      0.06,
      1.7,
      new THREE.Vector3(0, 1.85, 0),
      new THREE.Vector3(2.9, 3.5, 2.9)
    );
    root.add(g);

    rigs.push({
      id: 'starmap',
      group: g,
      anchorLocal: new THREE.Vector3(0, 3.55, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        scopePivot.lookAt(state.starWorldPos);
        _dir.subVectors(state.starWorldPos, g.position);
        domePivot.rotation.y = Math.atan2(_dir.x, _dir.z);

        const isTrappist = state.starKey === 'trappist1';
        miniStarMat.color.set(isTrappist ? '#ff6a3d' : '#fde047');
        miniStar.scale.setScalar(isTrappist ? 0.78 : 1.05);

        const hzSpan = Math.max(1e-4, state.hzBounds.outer - state.hzBounds.inner);
        const rel = (state.a_AU - state.hzBounds.inner) / hzSpan;
        const r = Math.max(0.24, Math.min(0.95, 0.45 + rel * (0.72 - 0.45)));
        planetOrbitRing.scale.setScalar(r);

        const inHz = state.a_AU >= state.hzBounds.inner && state.a_AU <= state.hzBounds.outer;
        if (inHz) {
          _colorA.set('#34d399');
        } else if (state.a_AU < state.hzBounds.inner) {
          _colorA.set('#fb923c');
        } else {
          _colorA.set('#7dd3fc');
        }
        miniPlanetMat.color.copy(_colorA);
        planetOrbitMat.color.copy(_colorA);

        const ang = tSec * 1.4;
        miniPlanet.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
        holoOrbitGroup.position.y = 2.95 + Math.sin(tSec * 1.8) * 0.05;
      },
    });
  }

  // -------------------------------------------------------------------------
  // 7. SKY DOME SPECTROMETER MAST (Finned Pylon + Tri-Axis Gyroscope + Nested Crystal)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(-2.65, 0.28, 2.2);
    addContactShadow(g, 1.55);

    const basePad = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.48, 0.62, 0.26, 8)), matDarkSteel);
    basePad.position.y = 0.13;
    basePad.castShadow = true;
    basePad.receiveShadow = true;
    g.add(basePad);

    // Tapered ribbed LatheGeometry aerospace pylon
    const pylonProfile = [
      new THREE.Vector2(0.0, 0.24),
      new THREE.Vector2(0.24, 0.24),
      new THREE.Vector2(0.18, 0.9),
      new THREE.Vector2(0.14, 1.8),
      new THREE.Vector2(0.1, 2.8),
      new THREE.Vector2(0.13, 3.35),
      new THREE.Vector2(0.07, 3.55),
      new THREE.Vector2(0.0, 3.55),
    ];
    const mast = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(pylonProfile, 16)), matBrushedAlum);
    mast.castShadow = true;
    g.add(mast);

    // 3 swept aerodynamic buttress stabilizer fins at mast base
    const finShape = new THREE.Shape();
    finShape.moveTo(0.12, 0.24);
    finShape.lineTo(0.54, 0.24);
    finShape.lineTo(0.16, 1.35);
    finShape.closePath();
    const finGeo = trackGeo(
      new THREE.ExtrudeGeometry(finShape, {
        depth: 0.05,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 1,
      })
    );
    finGeo.translate(0, 0, -0.025);
    finGeo.computeVertexNormals();
    for (let f = 0; f < 3; f++) {
      const fin = new THREE.Mesh(finGeo, matDarkSteel);
      fin.rotation.y = (f * Math.PI * 2) / 3;
      fin.castShadow = true;
      g.add(fin);
    }

    // Brass trunnion yoke holding gyro rings
    const yokeArm = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.7, 0.04, 10, 24, Math.PI)), matBrass);
    yokeArm.rotation.z = Math.PI;
    yokeArm.position.y = 4.25;
    g.add(yokeArm);

    const outerRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.62, 0.044, 12, 34)), matBrass);
    outerRing.position.y = 4.25;
    g.add(outerRing);

    const innerRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.45, 0.035, 10, 30)), matBrushedAlum);
    innerRing.position.y = 4.25;
    g.add(innerRing);

    const prismMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#7dd3fc',
        emissive: '#0ea5e9',
        emissiveIntensity: 0.85,
        roughness: 0.08,
        metalness: 0.1,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1,
        ior: 1.54,
        transparent: true,
        opacity: 0.86,
      })
    );
    const prism = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.28, 0)), prismMat);
    prism.position.y = 4.25;
    g.add(prism);

    const innerCore = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(0.13, 0)),
      trackMat(new THREE.MeshBasicMaterial({ color: '#ffffff' }))
    );
    innerCore.position.y = 4.25;
    g.add(innerCore);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'sky',
      g,
      0.04,
      0.86,
      new THREE.Vector3(0, 3.9, 0),
      new THREE.Vector3(1.55, 2.45, 1.55)
    );
    root.add(g);

    rigs.push({
      id: 'sky',
      group: g,
      anchorLocal: new THREE.Vector3(0, 5.18, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        prism.rotation.y = tSec * 0.7;
        innerCore.rotation.x = -tSec * 1.1;
        outerRing.rotation.y = tSec * 0.35;
        innerRing.rotation.x = Math.sin(tSec * 0.5) * 0.45 + 0.6;
        if (state.tidalLocked) {
          _colorA.set('#fb923c');
          _colorB.set('#c2410c');
        } else {
          _colorA.set('#7dd3fc');
          _colorB.set('#0ea5e9');
        }
        prismMat.color.copy(_colorA);
        prismMat.emissive.copy(_colorB);
      },
    });
  }

  // -------------------------------------------------------------------------
  // 8. DAY-NIGHT LINE ORRERY (Right Coastal Overlook — Astrolabe Plinth + Graduated Rings)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(7.45, 1.25, -1.65);
    addContactShadow(g, 2.05);

    const pierProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.88, 0.0),
      new THREE.Vector2(0.84, 0.14),
      new THREE.Vector2(0.68, 0.24),
      new THREE.Vector2(0.58, 0.92),
      new THREE.Vector2(0.7, 1.06),
      new THREE.Vector2(0.62, 1.14),
      new THREE.Vector2(0.0, 1.14),
    ];
    const pier = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(pierProfile, 20)), matStonePlinth);
    pier.castShadow = true;
    pier.receiveShadow = true;
    g.add(pier);

    const cradleBaseRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.64, 0.68, 0.08, 24)), matBrass);
    cradleBaseRing.position.y = 1.16;
    g.add(cradleBaseRing);

    // Outer meridian & tilted equatorial brass astrolabe rings
    const cradle = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.78, 0.048, 12, 36)), matBrass);
    cradle.position.y = 1.94;
    cradle.rotation.y = 0.45;
    cradle.castShadow = true;
    g.add(cradle);

    const equatorRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.7, 0.026, 10, 32)), matBrushedAlum);
    equatorRing.position.y = 1.94;
    equatorRing.rotation.set(Math.PI * 0.42, 0.3, 0.2);
    g.add(equatorRing);

    // Axial tilt spindle rod
    const axisRod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 1.56, 10)), matBrass);
    axisRod.position.y = 1.94;
    axisRod.rotation.z = 0.22;
    g.add(axisRod);

    const orbGroup = new THREE.Group();
    orbGroup.position.y = 1.94;

    const dayMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#f59e0b',
        emissiveIntensity: 0.62,
        roughness: 0.32,
      })
    );
    const nightMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        emissive: '#1e293b',
        emissiveIntensity: 0.38,
        roughness: 0.66,
      })
    );
    const dayHalf = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.56, 22, 18, 0, Math.PI)),
      dayMat
    );
    dayHalf.rotation.y = -Math.PI / 2;
    orbGroup.add(dayHalf);

    const nightHalf = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.56, 22, 18, Math.PI, Math.PI)),
      nightMat
    );
    nightHalf.rotation.y = -Math.PI / 2;
    orbGroup.add(nightHalf);

    const termRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.585, 0.032, 10, 34)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: '#fb923c',
        })
      )
    );
    orbGroup.add(termRing);
    g.add(orbGroup);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'terminator',
      g,
      0.06,
      1.08,
      new THREE.Vector3(0, 1.65, 0),
      new THREE.Vector3(1.85, 2.85, 1.85)
    );
    root.add(g);

    rigs.push({
      id: 'terminator',
      group: g,
      anchorLocal: new THREE.Vector3(0, 3.02, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        if (state.tidalLocked) {
          _targetWorld.copy(state.starWorldPos);
          _dir.subVectors(_targetWorld, g.position).normalize();
          orbGroup.rotation.y = Math.atan2(_dir.x, _dir.z);
        } else {
          orbGroup.rotation.y = tSec * 0.65;
        }
      },
    });
  }

  return {
    root,
    rigs,
    hitMeshes: allHitMeshes,
    update: (state, tSec, dt) => {
      for (const rig of rigs) {
        rig.update(state, tSec, dt);
      }
    },
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
