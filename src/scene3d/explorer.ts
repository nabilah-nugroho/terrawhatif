import * as THREE from 'three';
import type { ObservatoryTextures } from './materials';

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
export function resolveWalkableGround(nx: number, nz: number): { x: number; z: number; y: number } {
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

export function createExplorerSystem(textures: ObservatoryTextures): ExplorerSystem {
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
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughnessMap: textures.metalRoughness,
      color: '#cbd5e1',
      roughness: 0.56,
      metalness: 0.14,
    })
  );
  const matSuitNavy = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughnessMap: textures.metalRoughness,
      color: '#1e3a5f',
      roughness: 0.68,
      metalness: 0.14,
    })
  );
  const matBoot = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.rockNormal,
      normalScale: new THREE.Vector2(0.2, 0.2),
      color: '#0f172a',
      roughness: 0.78,
      metalness: 0.22,
    })
  );
  const matAccentOrange = trackMat(
    new THREE.MeshStandardMaterial({
      roughnessMap: textures.metalRoughness,
      color: '#f97316',
      roughness: 0.44,
      metalness: 0.26,
    })
  );
  const matVisorGold = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#fbbf24',
      emissive: '#b45309',
      emissiveIntensity: 0.2,
      roughness: 0.12,
      metalness: 0.9,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.0,
    })
  );
  const matGlowCyan = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: '#38bdf8',
      emissiveIntensity: 1.08,
      roughness: 0.2,
    })
  );

  const bodyRig = new THREE.Group();
  group.add(bodyRig);

  // Legs (pivoted at hip y = 0.62) — articulated thigh, knee armor pad, shin greave & beveled EVA boot
  const bootShape = new THREE.Shape();
  bootShape.moveTo(-0.08, 0.0);
  bootShape.lineTo(0.14, 0.0);
  bootShape.lineTo(0.15, 0.06);
  bootShape.lineTo(0.08, 0.13);
  bootShape.lineTo(-0.08, 0.14);
  bootShape.closePath();
  const bootGeo = trackGeo(
    new THREE.ExtrudeGeometry(bootShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    })
  );
  bootGeo.translate(0, 0, -0.06);
  bootGeo.rotateY(-Math.PI / 2); // toe points +Z
  bootGeo.computeVertexNormals();

  const makeLeg = (xOff: number) => {
    const hip = new THREE.Group();
    hip.position.set(xOff, 0.62, 0);

    const thigh = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.092, 0.18, 6, 12)), matSuitNavy);
    thigh.position.y = -0.15;
    thigh.castShadow = true;
    hip.add(thigh);

    const kneePad = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.088, 0.082, 0.075, 12)), matSuitWhite);
    kneePad.position.set(0, -0.29, 0.015);
    hip.add(kneePad);

    const shin = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.082, 0.16, 6, 12)), matSuitWhite);
    shin.position.y = -0.41;
    shin.castShadow = true;
    hip.add(shin);

    const boot = new THREE.Mesh(bootGeo, matBoot);
    boot.position.set(0, -0.61, 0.02);
    boot.castShadow = true;
    hip.add(boot);

    return hip;
  };
  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);
  bodyRig.add(leftLeg, rightLeg);

  // Contoured LatheGeometry EVA Torso + Armored Chest Telemetry Plate + Utility Belt
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.185, 0.0),
    new THREE.Vector2(0.205, 0.12),
    new THREE.Vector2(0.255, 0.36),
    new THREE.Vector2(0.245, 0.52),
    new THREE.Vector2(0.175, 0.58),
    new THREE.Vector2(0.0, 0.58),
  ];
  const torso = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(torsoProfile, 18)), matSuitWhite);
  torso.position.y = 0.64;
  torso.scale.set(1.06, 1.0, 0.88);
  torso.castShadow = true;
  bodyRig.add(torso);

  const belt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.085, 16)), matAccentOrange);
  belt.position.y = 0.68;
  belt.scale.set(1.04, 1, 0.9);
  bodyRig.add(belt);

  const beltBuckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.065, 0.04)), matBoot);
  beltBuckle.position.set(0, 0.68, 0.19);
  bodyRig.add(beltBuckle);

  // Front PLSS Chest Control Unit
  const chestHousing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.18, 0.08)), matSuitNavy);
  chestHousing.position.set(0, 0.98, 0.195);
  chestHousing.castShadow = true;
  bodyRig.add(chestHousing);

  const chestBadge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.15, 0.09, 0.025)), matGlowCyan);
  chestBadge.position.set(0, 0.99, 0.235);
  bodyRig.add(chestBadge);

  // Beveled PLSS Life-Support Backpack + Twin Oxygen Tanks
  const packShape = new THREE.Shape();
  packShape.moveTo(-0.14, -0.2);
  packShape.lineTo(0.14, -0.2);
  packShape.lineTo(0.16, 0.16);
  packShape.lineTo(0.1, 0.22);
  packShape.lineTo(-0.1, 0.22);
  packShape.lineTo(-0.16, 0.16);
  packShape.closePath();
  const packGeo = trackGeo(
    new THREE.ExtrudeGeometry(packShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
    })
  );
  packGeo.translate(0, 0, -0.08);
  packGeo.computeVertexNormals();
  const pack = new THREE.Mesh(packGeo, matSuitNavy);
  pack.position.set(0, 0.96, -0.24);
  pack.castShadow = true;
  bodyRig.add(pack);

  const oxyTankGeo = trackGeo(new THREE.CapsuleGeometry(0.052, 0.24, 6, 10));
  for (const tx of [-0.085, 0.085]) {
    const tank = new THREE.Mesh(oxyTankGeo, matSuitWhite);
    tank.position.set(tx, 0.95, -0.34);
    tank.castShadow = true;
    bodyRig.add(tank);
  }

  const packStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.045, 0.24, 0.025)), matGlowCyan);
  packStrip.position.set(0, 0.97, -0.355);
  bodyRig.add(packStrip);

  // Arms (pivoted at shoulder y = 1.12) with contoured pauldrons, elbow cuffs & right wrist scanner
  const makeArm = (xOff: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(xOff, 1.12, 0);

    const pauldron = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.098, 12, 10)), matSuitWhite);
    pauldron.scale.set(1.08, 0.88, 1.04);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    const sleeve = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.068, 0.24, 6, 10)), matSuitWhite);
    sleeve.position.y = -0.18;
    sleeve.castShadow = true;
    shoulder.add(sleeve);

    const cuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.075, 0.055, 12)), matSuitNavy);
    cuff.position.y = -0.3;
    shoulder.add(cuff);

    if (xOff > 0) {
      const wristScreen = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.075, 0.065)), matGlowCyan);
      wristScreen.position.set(0.055, -0.29, 0.02);
      shoulder.add(wristScreen);
    }

    const glove = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.076, 10, 8)), matAccentOrange);
    glove.scale.set(0.95, 1.1, 1.05);
    glove.position.y = -0.39;
    shoulder.add(glove);

    return shoulder;
  };
  const leftArm = makeArm(-0.31);
  const rightArm = makeArm(0.31);
  bodyRig.add(leftArm, rightArm);

  // Contoured Neck Seal + Sculpted EVA Helmet + Raised Sun-Visor Brow Cowl
  const neckSeal = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.165, 0.028, 10, 22)), matAccentOrange);
  neckSeal.rotation.x = Math.PI / 2;
  neckSeal.position.y = 1.24;
  bodyRig.add(neckSeal);

  const helmet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.245, 22, 16)), matSuitWhite);
  helmet.scale.set(1.0, 0.98, 1.04);
  helmet.position.y = 1.44;
  helmet.castShadow = true;
  bodyRig.add(helmet);

  const browCowl = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.21, 0.032, 8, 18, Math.PI * 0.9)),
    matSuitNavy
  );
  browCowl.position.set(0, 1.49, 0.05);
  browCowl.rotation.set(0.28, 0, Math.PI * 0.05);
  bodyRig.add(browCowl);

  const visor = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.215, 18, 14, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.22, Math.PI * 0.5)),
    matVisorGold
  );
  visor.position.set(0, 1.43, 0.068);
  visor.rotation.y = Math.PI / 2;
  bodyRig.add(visor);

  const earPodGeo = trackGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.045, 12));
  earPodGeo.rotateZ(Math.PI / 2);
  for (const ex of [-0.24, 0.24]) {
    const pod = new THREE.Mesh(earPodGeo, matSuitNavy);
    pod.position.set(ex, 1.43, 0);
    bodyRig.add(pod);
  }

  const antenna = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.011, 0.015, 0.22, 8)), matBoot);
  antenna.position.set(0.21, 1.63, -0.04);
  bodyRig.add(antenna);

  const beaconTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.034, 10, 8)), matGlowCyan);
  beaconTip.position.set(0.21, 1.75, -0.04);
  bodyRig.add(beaconTip);

  // Soft Ground Contact Shadow + Subtle Explorer Foot Locator Ring
  const contactShadowMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.95, 0.95)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: textures.contactShadow,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      })
    )
  );
  contactShadowMesh.rotation.x = -Math.PI / 2;
  contactShadowMesh.position.y = 0.01;
  group.add(contactShadowMesh);

  const footRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.28, 0.35, 28)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      })
    )
  );
  footRing.rotation.x = -Math.PI / 2;
  footRing.position.y = 0.022;
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
    celebrateTime = 2.85;
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

      // Celebratory multi-hop & joyful two-arm wave on mission completion
      if (celebrateTime > 0 && !prefersReduced) {
        const prog = 1 - celebrateTime / 2.85;
        const hop = Math.abs(Math.sin(prog * Math.PI * 4)) * 0.48;
        bodyRig.position.y += hop;
        rightArm.rotation.x = -2.42;
        rightArm.rotation.z = -0.35 + Math.sin(prog * Math.PI * 10) * 0.36;
        leftArm.rotation.x = -2.32;
        leftArm.rotation.z = 0.35 - Math.sin(prog * Math.PI * 10) * 0.34;
        if (!isMoving) {
          leftLeg.rotation.x = Math.sin(prog * Math.PI * 8) * 0.24;
          rightLeg.rotation.x = -Math.sin(prog * Math.PI * 8) * 0.24;
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
