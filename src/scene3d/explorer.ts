import * as THREE from 'three';

export interface ExplorerMoveInput {
  moveX: number; // -1..1 in camera horizontal right
  moveZ: number; // -1..1 in camera forward (positive = forward away from camera)
  sprint: boolean;
  cameraYaw: number; // radians, angle of camera forward vector on XZ plane
}

export interface ExplorerSystem {
  group: THREE.Group;
  position: THREE.Vector3;
  update: (
    input: ExplorerMoveInput,
    dt: number,
    tSec: number,
    prefersReduced: boolean,
    onFootstep?: () => void
  ) => void;
  triggerCelebration: () => void;
  triggerScan: (targetWorldPos: THREE.Vector3) => void;
  reset: () => void;
  dispose: () => void;
}

interface ObstacleCircle {
  x: number;
  z: number;
  r: number;
}

const OBSTACLES: ObstacleCircle[] = [
  { x: 4.55, z: 3.85, r: 0.95 }, // thermometer
  { x: 1.55, z: 4.95, r: 1.0 }, // valve
  { x: 6.35, z: 5.35, r: 0.95 }, // lever
  { x: -2.65, z: 2.2, r: 0.85 }, // sky mast
  { x: -7.1, z: 1.35, r: 1.55 }, // starmap dome
  { x: 7.45, z: -1.65, r: 1.15 }, // terminator pier
];

/**
 * Resolves walkable (x, z) containment + ground surface elevation across:
 * 1) Main Observatory Deck (y = 0.28)
 * 2) Right Headland Walkway & Overlook Terrace (smooth ramp up to y = 1.25)
 * 3) Left Headland Ramp & Telescope Terrace (smooth ramp up to y = 1.28)
 */
function resolveWalkableGround(nx: number, nz: number): { x: number; z: number; y: number } {
  let x = nx;
  let z = nz;

  // Check if inside Right Pier corridor (x in [6.65, 8.25], z in [-3.4, 1.8])
  const inRightPier = x >= 6.55 && x <= 8.35 && z >= -3.45 && z <= 1.85;
  // Check if inside Left Headland terrace/ramp (x in [-9.2, -5.6], z in [-0.2, 3.6])
  const inLeftTerrace = x >= -9.2 && x <= -5.5 && z >= -0.3 && z <= 3.6;

  if (inRightPier) {
    x = Math.max(6.65, Math.min(8.25, x));
    z = Math.max(-3.35, Math.min(7.35, z));
  } else if (inLeftTerrace) {
    x = Math.max(-9.1, Math.min(8.9, x));
    z = Math.max(-0.2, Math.min(7.35, z));
  } else {
    // Clamp to Main Deck
    x = Math.max(-7.35, Math.min(8.9, x));
    z = Math.max(1.65, Math.min(7.35, z));
  }

  // Push cleanly around instrument plinth obstacles
  for (const ob of OBSTACLES) {
    const dx = x - ob.x;
    const dz = z - ob.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < ob.r * ob.r && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      x = ob.x + (dx / d) * ob.r;
      z = ob.z + (dz / d) * ob.r;
    }
  }

  // Compute elevation y
  let y = 0.28;
  if (x >= 6.45 && z < 1.3) {
    // Ramp from z=1.3 (y=0.28) to z=-0.75 (y=1.25)
    const t = Math.max(0, Math.min(1, (1.3 - z) / 2.05));
    y = 0.28 + t * (1.25 - 0.28);
  } else if (x <= -5.5 && z < 3.1) {
    // Left ramp from z=3.1 (y=0.28) to z=1.95 (y=1.28)
    const t = Math.max(0, Math.min(1, (3.1 - z) / 1.15));
    y = 0.28 + t * (1.28 - 0.28);
  }

  return { x, z, y };
}

export function createExplorerSystem(): ExplorerSystem {
  const group = new THREE.Group();
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

  const matSuitWhite = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.42,
      metalness: 0.14,
    })
  );
  const matSuitNavy = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#1e3a5f',
      roughness: 0.62,
      metalness: 0.12,
    })
  );
  const matBoot = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.78,
      metalness: 0.2,
    })
  );
  const matAccentOrange = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f97316',
      roughness: 0.38,
      metalness: 0.25,
    })
  );
  const matVisorGold = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#b45309',
      emissiveIntensity: 0.22,
      roughness: 0.14,
      metalness: 0.88,
    })
  );
  const matGlowCyan = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: '#38bdf8',
      emissiveIntensity: 0.9,
      roughness: 0.2,
    })
  );

  const bodyRig = new THREE.Group();
  group.add(bodyRig);

  // Legs (pivoted at hip y = 0.62)
  const makeLeg = (xOff: number) => {
    const hip = new THREE.Group();
    hip.position.set(xOff, 0.62, 0);

    const thigh = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.095, 0.28, 6, 10)), matSuitNavy);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    hip.add(thigh);

    const boot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.14, 0.24)), matBoot);
    boot.position.set(0, -0.54, 0.04);
    boot.castShadow = true;
    hip.add(boot);

    return hip;
  };
  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);
  bodyRig.add(leftLeg, rightLeg);

  // Torso & Backpack
  const torso = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.2, 0.56, 14)), matSuitWhite);
  torso.position.y = 0.92;
  torso.castShadow = true;
  bodyRig.add(torso);

  const belt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.215, 0.215, 0.08, 14)), matAccentOrange);
  belt.position.y = 0.66;
  bodyRig.add(belt);

  const chestBadge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.12, 0.04)), matGlowCyan);
  chestBadge.position.set(0, 0.98, 0.22);
  bodyRig.add(chestBadge);

  const pack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.42, 0.18)), matSuitNavy);
  pack.position.set(0, 0.95, -0.24);
  pack.castShadow = true;
  bodyRig.add(pack);

  const packStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.28, 0.03)), matGlowCyan);
  packStrip.position.set(0, 0.95, -0.34);
  bodyRig.add(packStrip);

  // Arms (pivoted at shoulder y = 1.12)
  const makeArm = (xOff: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(xOff, 1.12, 0);

    const sleeve = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.072, 0.26, 6, 10)), matSuitWhite);
    sleeve.position.y = -0.18;
    sleeve.castShadow = true;
    shoulder.add(sleeve);

    const glove = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.078, 10, 8)), matAccentOrange);
    glove.position.y = -0.38;
    shoulder.add(glove);

    return shoulder;
  };
  const leftArm = makeArm(-0.31);
  const rightArm = makeArm(0.31);
  bodyRig.add(leftArm, rightArm);

  // Helmet & Visor
  const helmet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 18, 14)), matSuitWhite);
  helmet.position.y = 1.42;
  helmet.castShadow = true;
  bodyRig.add(helmet);

  const visor = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.215, 16, 12, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.22, Math.PI * 0.5)),
    matVisorGold
  );
  visor.position.set(0, 1.42, 0.06);
  visor.rotation.y = Math.PI / 2;
  bodyRig.add(visor);

  const antenna = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.012, 0.015, 0.18, 8)), matBoot);
  antenna.position.set(0.18, 1.62, -0.05);
  bodyRig.add(antenna);

  const beaconTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.035, 10, 8)), matGlowCyan);
  beaconTip.position.set(0.18, 1.72, -0.05);
  bodyRig.add(beaconTip);

  // Ground shadow ring beneath explorer
  const footRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.26, 0.34, 24)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    )
  );
  footRing.rotation.x = -Math.PI / 2;
  footRing.position.y = 0.02;
  group.add(footRing);

  // Holographic Wrist Scanner Beam (hidden until inspecting an object)
  const scanBeamGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.14, 1, 12, 1, true));
  scanBeamGeo.rotateX(Math.PI / 2);
  scanBeamGeo.translate(0, 0, 0.5);
  const scanBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const scanBeam = new THREE.Mesh(scanBeamGeo, scanBeamMat);
  scanBeam.visible = false;
  scanBeam.position.set(0.31, 1.15, 0.35);
  group.add(scanBeam);

  const scanPulseGeo = trackGeo(new THREE.RingGeometry(0.18, 0.32, 24));
  const scanPulseMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const scanPulse = new THREE.Mesh(scanPulseGeo, scanPulseMat);
  scanPulse.visible = false;
  group.add(scanPulse);

  const position = new THREE.Vector3(-0.3, 0.28, 4.4);
  let facingYaw = Math.PI; // Facing ocean/instruments (-Z)
  let walkPhase = 0;
  let lastStepIndex = 0;
  let celebrateTime = 0;
  let scanTime = 0;
  const scanTargetWorld = new THREE.Vector3();
  const _scanLocal = new THREE.Vector3();

  group.position.copy(position);
  group.rotation.y = facingYaw;

  const triggerCelebration = () => {
    celebrateTime = 1.85;
  };

  const triggerScan = (targetWorldPos: THREE.Vector3) => {
    scanTargetWorld.copy(targetWorldPos);
    scanTime = 1.05;
  };

  const reset = () => {
    position.set(-0.3, 0.28, 4.4);
    facingYaw = Math.PI;
    walkPhase = 0;
    lastStepIndex = 0;
    celebrateTime = 0;
    scanTime = 0;
    scanBeam.visible = false;
    scanPulse.visible = false;
    group.position.copy(position);
    group.rotation.y = facingYaw;
  };

  return {
    group,
    position,
    triggerCelebration,
    triggerScan,
    reset,
    update: (input, dt, tSec, prefersReduced, onFootstep) => {
      const magSq = input.moveX * input.moveX + input.moveZ * input.moveZ;
      const isMoving = magSq > 0.01;

      if (celebrateTime > 0) {
        celebrateTime = Math.max(0, celebrateTime - dt);
      }
      if (scanTime > 0) {
        scanTime = Math.max(0, scanTime - dt);
      }

      if (isMoving) {
        scanTime = 0; // Walking cancels stationary scan pose
        const len = Math.sqrt(magSq);
        const ix = input.moveX / len;
        const iz = input.moveZ / len;

        const fwdX = Math.sin(input.cameraYaw);
        const fwdZ = Math.cos(input.cameraYaw);
        const rightX = -fwdZ;
        const rightZ = fwdX;

        const worldDx = fwdX * iz + rightX * ix;
        const worldDz = fwdZ * iz + rightZ * ix;

        const speed = input.sprint ? 5.6 : 3.6;
        const resolved = resolveWalkableGround(
          position.x + worldDx * speed * dt,
          position.z + worldDz * speed * dt
        );
        position.set(resolved.x, resolved.y, resolved.z);

        const targetYaw = Math.atan2(worldDx, worldDz);
        let diff = targetYaw - facingYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facingYaw += diff * Math.min(1, dt * 12);

        const cadence = input.sprint ? 11.5 : 8.2;
        walkPhase += dt * cadence;

        const stepIdx = Math.floor(walkPhase / Math.PI);
        if (stepIdx !== lastStepIndex) {
          lastStepIndex = stepIdx;
          onFootstep?.();
        }

        const swing = prefersReduced ? 0 : Math.sin(walkPhase) * 0.68;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing * 0.75;
        rightArm.rotation.x = swing * 0.75;
        rightArm.rotation.z = 0;
        bodyRig.position.y = prefersReduced ? 0 : Math.abs(Math.sin(walkPhase)) * 0.055;
      } else {
        const settle = Math.min(1, dt * 10);
        leftLeg.rotation.x *= 1 - settle;
        rightLeg.rotation.x *= 1 - settle;
        leftArm.rotation.x *= 1 - settle;
        rightArm.rotation.x *= 1 - settle;
        rightArm.rotation.z *= 1 - settle;
        bodyRig.position.y = prefersReduced ? 0 : Math.sin(tSec * 2.2) * 0.015;
      }

      // Celebratory hop & right-arm wave on mission completion
      if (celebrateTime > 0 && !prefersReduced) {
        const prog = 1 - celebrateTime / 1.85;
        const hop = Math.abs(Math.sin(prog * Math.PI * 2)) * 0.42;
        bodyRig.position.y += hop;
        rightArm.rotation.x = -2.35;
        rightArm.rotation.z = -0.35 + Math.sin(prog * Math.PI * 8) * 0.35;
        leftArm.rotation.z = 0.25;
        if (!isMoving) {
          leftLeg.rotation.x = Math.sin(prog * Math.PI * 4) * 0.2;
          rightLeg.rotation.x = -Math.sin(prog * Math.PI * 4) * 0.2;
        }
      } else if (scanTime > 0 && !isMoving) {
        // Turn cleanly toward scanned landmark & extend scanner arm + holographic cone
        const dx = scanTargetWorld.x - position.x;
        const dz = scanTargetWorld.z - position.z;
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - facingYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facingYaw += diff * Math.min(1, dt * 14);

        rightArm.rotation.x = -1.48;
        rightArm.rotation.z = -0.1;

        group.position.copy(position);
        group.rotation.y = facingYaw;
        group.updateMatrixWorld();

        _scanLocal.copy(scanTargetWorld);
        group.worldToLocal(_scanLocal);
        const beamDist = Math.max(0.6, Math.min(11, scanBeam.position.distanceTo(_scanLocal)));
        scanBeam.visible = true;
        scanBeam.scale.set(1, 1, beamDist);
        scanBeam.lookAt(scanTargetWorld);
        const fade = Math.min(1, scanTime * 2.2);
        scanBeamMat.opacity = 0.45 * fade;

        scanPulse.visible = true;
        scanPulse.position.copy(_scanLocal);
        scanPulse.lookAt(scanBeam.position);
        const pulseScale = 0.8 + (1 - scanTime / 1.05) * 1.6;
        scanPulse.scale.setScalar(pulseScale);
        scanPulseMat.opacity = 0.78 * fade;
      } else if (!isMoving) {
        leftArm.rotation.z *= 1 - Math.min(1, dt * 10);
      }

      if (scanTime <= 0 || isMoving) {
        scanBeam.visible = false;
        scanPulse.visible = false;
      }

      group.position.copy(position);
      group.rotation.y = facingYaw;
    },
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
