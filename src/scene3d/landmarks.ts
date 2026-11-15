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
const _colorC = new THREE.Color();
const _dir = new THREE.Vector3();
const _targetWorld = new THREE.Vector3();

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
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: textures.metalRoughness,
      color: '#1f293b',
      roughness: 0.56,
      metalness: 0.82,
      envMapIntensity: 1.15,
    })
  );
  const matBrushedAlum = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      roughnessMap: textures.metalRoughness,
      color: '#cbd5e1',
      roughness: 0.38,
      metalness: 0.88,
      envMapIntensity: 1.3,
    })
  );
  const matBrass = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughnessMap: textures.metalRoughness,
      color: '#d9a441',
      roughness: 0.36,
      metalness: 0.9,
      envMapIntensity: 1.35,
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
      opacity: 0.34,
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
      roughness: 0.9,
      metalness: 0.08,
    })
  );
  const matHitProxy = trackMat(
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );

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
    const ringGeo = trackGeo(new THREE.TorusGeometry(ringRadius, 0.045, 10, 40));
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
  // 1. THERMOMETER (Right Observatory Deck)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(4.55, 0.28, 3.85);
    g.rotation.y = -0.35;

    const plinth = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.55, 0.68, 0.34, 16)), matStonePlinth);
    plinth.position.y = 0.17;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    g.add(plinth);

    const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 20)), matBrass);
    collar.position.y = 0.38;
    g.add(collar);

    const backing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 2.3, 0.14)), matDarkSteel);
    backing.position.set(0, 1.56, -0.06);
    backing.castShadow = true;
    g.add(backing);

    const topArch = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 20)), matBrass);
    topArch.rotation.x = Math.PI / 2;
    topArch.position.set(0, 2.71, -0.06);
    g.add(topArch);

    // Tick marks along scale
    for (let i = 0; i < 6; i++) {
      const tick = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.03, 0.03)), matBrushedAlum);
      tick.position.set(0.16, 0.92 + i * 0.3, 0.02);
      g.add(tick);
    }

    const glassTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 2.1, 16)), matGlass);
    glassTube.position.set(0, 1.62, 0.04);
    g.add(glassTube);

    const bulbGlass = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.22, 20, 16)), matGlass);
    bulbGlass.position.set(0, 0.58, 0.04);
    g.add(bulbGlass);

    const mercuryMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#34d399',
        emissive: '#10b981',
        emissiveIntensity: 1.05,
        roughness: 0.2,
        metalness: 0.32,
      })
    );
    const mercuryBulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 18, 14)), mercuryMat);
    mercuryBulb.position.set(0, 0.58, 0.04);
    g.add(mercuryBulb);

    const mercuryColGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.065, 1.0, 14));
    mercuryColGeo.translate(0, 0.5, 0);
    const mercuryCol = new THREE.Mesh(mercuryColGeo, mercuryMat);
    mercuryCol.position.set(0, 0.62, 0.04);
    g.add(mercuryCol);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'thermometer',
      g,
      0.04,
      0.85,
      new THREE.Vector3(0, 1.45, 0),
      new THREE.Vector3(1.1, 2.9, 1.1)
    );
    root.add(g);

    rigs.push({
      id: 'thermometer',
      group: g,
      anchorLocal: new THREE.Vector3(0, 3.05, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        const frac = Math.max(0.15, Math.min(1.92, ((state.tempK - 210) / 190) * 1.92));
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
  // 2. POLAR ICE SHELF (Left Coastal Bay)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(-6.6, 0.0, -3.5);

    const matIcePrimary = trackMat(
      new THREE.MeshPhysicalMaterial({
        map: textures.iceColor,
        normalMap: textures.iceNormal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughnessMap: textures.iceRoughness,
        bumpMap: textures.iceBump,
        bumpScale: 0.05,
        color: '#d4ecfc',
        roughness: 0.48,
        metalness: 0.05,
        clearcoat: 0.32,
        clearcoatRoughness: 0.24,
        envMapIntensity: 0.8,
        flatShading: true,
      })
    );
    const matIceDeep = trackMat(
      new THREE.MeshPhysicalMaterial({
        normalMap: textures.iceNormal,
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughnessMap: textures.iceRoughness,
        color: '#8bc8f0',
        roughness: 0.48,
        metalness: 0.04,
        clearcoat: 0.35,
        clearcoatRoughness: 0.28,
        flatShading: true,
      })
    );

    const iceCluster = new THREE.Group();
    const shelfSlab = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.6, 3.1, 0.45, 7)), matIceDeep);
    shelfSlab.position.set(0.4, 0.16, 0.2);
    shelfSlab.scale.set(1.25, 1, 0.85);
    shelfSlab.receiveShadow = true;
    iceCluster.add(shelfSlab);

    const peaks: [number, number, number, number, number][] = [
      [-0.8, 0.2, 1.3, 2.2, 0.2],
      [0.3, -0.3, 1.05, 1.65, -0.4],
      [-0.1, 0.75, 0.9, 1.25, 0.6],
      [1.35, 0.25, 0.85, 0.95, 1.1],
      [-1.55, -0.45, 1.0, 1.4, -0.8],
    ];
    for (const [px, pz, rad, ht, ry] of peaks) {
      const cone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(rad, ht, 6)), matIcePrimary);
      cone.position.set(px, 0.2 + ht * 0.44, pz);
      cone.rotation.y = ry;
      cone.castShadow = true;
      cone.receiveShadow = true;
      iceCluster.add(cone);
    }
    g.add(iceCluster);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'ice',
      g,
      0.26,
      2.6,
      new THREE.Vector3(0.2, 1.1, 0.1),
      new THREE.Vector3(4.5, 2.5, 3.8)
    );
    root.add(g);

    rigs.push({
      id: 'ice',
      group: g,
      anchorLocal: new THREE.Vector3(0.2, 2.65, 0.1),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        const iceNorm = Math.max(0.28, Math.min(1.45, (state.albedo - 0.18) / (0.58 - 0.18)));
        iceCluster.scale.set(0.65 + iceNorm * 0.52, 0.55 + iceNorm * 0.55, 0.65 + iceNorm * 0.52);
      },
    });
  }

  // -------------------------------------------------------------------------
  // 3. GAS VALVE (Center-Right Observatory Deck)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(1.55, 0.28, 4.95);
    g.rotation.y = 0.18;

    const pipeHoriz = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 1.65, 16)), matDarkSteel);
    pipeHoriz.rotation.z = Math.PI / 2;
    pipeHoriz.position.y = 0.28;
    pipeHoriz.castShadow = true;
    g.add(pipeHoriz);

    for (const fx of [-0.72, 0.72]) {
      const flange = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 16)), matBrushedAlum);
      flange.rotation.z = Math.PI / 2;
      flange.position.set(fx, 0.28, 0);
      g.add(flange);

      const foot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.28, 0.34)), matDarkSteel);
      foot.position.set(fx, 0.14, 0);
      g.add(foot);
    }

    const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 0.65, 14)), matBrushedAlum);
    stem.position.y = 0.62;
    stem.castShadow = true;
    g.add(stem);

    // Pressure gauge on side
    const gaugeBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 18)), matBrass);
    gaugeBody.rotation.x = Math.PI / 2;
    gaugeBody.position.set(0.38, 0.68, 0.12);
    g.add(gaugeBody);

    const gaugeFace = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.14, 18)),
      trackMat(new THREE.MeshBasicMaterial({ color: '#fef3c7' }))
    );
    gaugeFace.position.set(0.38, 0.68, 0.165);
    g.add(gaugeFace);

    // Spoked coral-orange handwheel
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 0.98, 0);
    const matWheel = trackMat(
      new THREE.MeshStandardMaterial({
        normalMap: textures.metalNormal,
        normalScale: new THREE.Vector2(0.25, 0.25),
        roughnessMap: textures.metalRoughness,
        color: '#f97316',
        roughness: 0.42,
        metalness: 0.48,
      })
    );
    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.42, 0.055, 12, 28)), matWheel);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    wheelGroup.add(rim);

    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 14)), matBrass);
    wheelGroup.add(hub);

    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.82, 8)), matWheel);
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.y = (s * Math.PI) / 3;
      wheelGroup.add(spoke);
    }
    g.add(wheelGroup);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'valve',
      g,
      0.04,
      0.85,
      new THREE.Vector3(0, 0.68, 0),
      new THREE.Vector3(1.8, 1.35, 1.1)
    );
    root.add(g);

    rigs.push({
      id: 'valve',
      group: g,
      anchorLocal: new THREE.Vector3(0, 1.55, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        const co2Ratio = state.noGreenhouse ? 0 : Math.min(1, state.co2_ppm / 2000);
        wheelGroup.rotation.y = co2Ratio * Math.PI * 3 + Math.sin(tSec * 0.8) * 0.06;
      },
    });
  }

  // -------------------------------------------------------------------------
  // 4. ORBIT LEVER CONSOLE (Right Foredeck)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(6.35, 0.28, 5.35);
    g.rotation.y = -0.52;

    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.92, 0.86, 0.72)), matDarkSteel);
    base.position.y = 0.43;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const topPlate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.86, 0.08, 0.64)), matBrushedAlum);
    topPlate.position.y = 0.88;
    g.add(topPlate);

    const arcTrack = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.28, 0.03, 10, 20, Math.PI)),
      matBrass
    );
    arcTrack.position.set(0, 0.92, 0);
    arcTrack.rotation.y = Math.PI / 2;
    g.add(arcTrack);

    const leverPivot = new THREE.Group();
    leverPivot.position.set(0, 0.92, 0);
    const arm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.055, 0.82, 12)), matBrushedAlum);
    arm.position.y = 0.41;
    arm.castShadow = true;
    leverPivot.add(arm);

    const matGrip = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.85,
        roughness: 0.22,
        metalness: 0.4,
      })
    );
    const rocketNose = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.13, 0.3, 14)), matGrip);
    rocketNose.position.y = 0.9;
    leverPivot.add(rocketNose);

    const rocketRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.11, 0.025, 8, 16)), matBrass);
    rocketRing.rotation.x = Math.PI / 2;
    rocketRing.position.y = 0.76;
    leverPivot.add(rocketRing);
    g.add(leverPivot);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'lever',
      g,
      0.04,
      0.8,
      new THREE.Vector3(0, 1.0, 0),
      new THREE.Vector3(1.2, 2.0, 1.1)
    );
    root.add(g);

    rigs.push({
      id: 'lever',
      group: g,
      anchorLocal: new THREE.Vector3(0, 2.05, 0),
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
  // 5. OCEAN MIST / VAPOR BUOY (Mid-Ocean)
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
        roughness: 0.48,
        metalness: 0.32,
      })
    );
    const hull = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.68, 0.56, 0.32, 20)), matBuoyYellow);
    hull.position.y = 0.14;
    g.add(hull);

    const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.65, 0.07, 10, 24)), matDarkSteel);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.26;
    g.add(collar);

    const mast = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.09, 1.2, 12)), matBrushedAlum);
    mast.position.y = 0.85;
    g.add(mast);

    const beaconMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#7dd3fc',
        emissive: '#38bdf8',
        emissiveIntensity: 1.18,
        roughness: 0.18,
      })
    );
    const beacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 14, 12)), beaconMat);
    beacon.position.y = 1.5;
    g.add(beacon);

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
      0.08,
      1.0,
      new THREE.Vector3(0, 1.0, 0),
      new THREE.Vector3(1.6, 2.0, 1.6)
    );
    root.add(g);

    rigs.push({
      id: 'vapor',
      group: g,
      anchorLocal: new THREE.Vector3(0, 2.15, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        g.position.y = Math.sin(tSec * 1.6) * 0.06;
        g.rotation.z = Math.sin(tSec * 1.2) * 0.04;
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
  // 6. STAR TELESCOPE DOME (Left Rocky Headland)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(-7.1, 1.28, 1.35);

    const tower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.15, 1.32, 1.15, 24)), matStonePlinth);
    tower.position.y = 0.57;
    tower.castShadow = true;
    tower.receiveShadow = true;
    g.add(tower);

    const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.22, 1.22, 0.14, 24)), matBrushedAlum);
    collar.position.y = 1.2;
    g.add(collar);

    const domeMat = trackMat(
      new THREE.MeshStandardMaterial({
        normalMap: textures.metalNormal,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughnessMap: textures.metalRoughness,
        color: '#dbe6f5',
        roughness: 0.42,
        metalness: 0.68,
        envMapIntensity: 1.25,
      })
    );
    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.14, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      domeMat
    );
    dome.position.y = 1.26;
    dome.castShadow = true;
    g.add(dome);

    const scopePivot = new THREE.Group();
    scopePivot.position.set(0, 1.65, 0);
    const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.21, 1.95, 16)), matBrass);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.55;
    barrel.castShadow = true;
    scopePivot.add(barrel);

    const lensRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.17, 0.035, 10, 20)), matDarkSteel);
    lensRim.position.z = 1.52;
    scopePivot.add(lensRim);

    const lensGlass = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.15, 18)), matGlass);
    lensGlass.position.z = 1.51;
    scopePivot.add(lensGlass);

    g.add(scopePivot);

    // Mini 3D Habitable Zone Orbit Hologram floating above the Telescope
    const holoOrbitGroup = new THREE.Group();
    holoOrbitGroup.position.set(0, 2.85, 0);

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
      1.65,
      new THREE.Vector3(0, 1.8, 0),
      new THREE.Vector3(2.8, 3.4, 2.8)
    );
    root.add(g);

    rigs.push({
      id: 'starmap',
      group: g,
      anchorLocal: new THREE.Vector3(0, 3.45, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        scopePivot.lookAt(state.starWorldPos);

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
        holoOrbitGroup.position.y = 2.85 + Math.sin(tSec * 1.8) * 0.05;
      },
    });
  }

  // -------------------------------------------------------------------------
  // 7. SKY DOME SPECTROMETER MAST (Central-Left Upper Observation Mast)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(-2.65, 0.28, 2.2);

    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.58, 0.3, 16)), matDarkSteel);
    base.position.y = 0.15;
    g.add(base);

    const mast = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.12, 3.65, 14)), matBrushedAlum);
    mast.position.y = 2.05;
    mast.castShadow = true;
    g.add(mast);

    const outerRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.62, 0.045, 10, 32)), matBrass);
    outerRing.position.y = 4.25;
    g.add(outerRing);

    const innerRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.45, 0.035, 10, 28)), matBrushedAlum);
    innerRing.position.y = 4.25;
    g.add(innerRing);

    const prismMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#7dd3fc',
        emissive: '#0ea5e9',
        emissiveIntensity: 0.78,
        roughness: 0.08,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        ior: 1.54,
        transparent: true,
        opacity: 0.86,
      })
    );
    const prism = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.28, 0)), prismMat);
    prism.position.y = 4.25;
    g.add(prism);

    const { localHits, updateRing } = attachStatusRingAndCollider(
      'sky',
      g,
      0.04,
      0.8,
      new THREE.Vector3(0, 3.9, 0),
      new THREE.Vector3(1.5, 2.4, 1.5)
    );
    root.add(g);

    rigs.push({
      id: 'sky',
      group: g,
      anchorLocal: new THREE.Vector3(0, 5.15, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        prism.rotation.y = tSec * 0.7;
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
  // 8. DAY-NIGHT LINE ORRERY (Right Coastal Overlook)
  // -------------------------------------------------------------------------
  {
    const g = new THREE.Group();
    g.position.set(7.45, 1.25, -1.65);

    const pier = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 0.85, 1.1, 16)), matStonePlinth);
    pier.position.y = 0.55;
    pier.castShadow = true;
    g.add(pier);

    const cradle = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.76, 0.05, 12, 32)), matBrass);
    cradle.position.y = 1.88;
    cradle.rotation.y = 0.45;
    g.add(cradle);

    const orbGroup = new THREE.Group();
    orbGroup.position.y = 1.88;

    const dayMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#f59e0b',
        emissiveIntensity: 0.58,
        roughness: 0.34,
      })
    );
    const nightMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        emissive: '#1e293b',
        emissiveIntensity: 0.35,
        roughness: 0.68,
      })
    );
    const dayHalf = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.56, 20, 16, 0, Math.PI)),
      dayMat
    );
    dayHalf.rotation.y = -Math.PI / 2;
    orbGroup.add(dayHalf);

    const nightHalf = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.56, 20, 16, Math.PI, Math.PI)),
      nightMat
    );
    nightHalf.rotation.y = -Math.PI / 2;
    orbGroup.add(nightHalf);

    const termRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.58, 0.03, 10, 32)),
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
      1.05,
      new THREE.Vector3(0, 1.6, 0),
      new THREE.Vector3(1.8, 2.8, 1.8)
    );
    root.add(g);

    rigs.push({
      id: 'terminator',
      group: g,
      anchorLocal: new THREE.Vector3(0, 2.95, 0),
      hitMeshes: localHits,
      update: (state, tSec) => {
        updateRing(state, tSec);
        if (state.tidalLocked) {
          // Locked face toward star
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
