import * as THREE from 'three';
import type { ObservatoryTextures } from './materials';
import { resolveWalkableGround } from './explorer';

export interface CompanionSystem {
  group: THREE.Group;
  position: THREE.Vector3;
  update: (
    explorerPos: THREE.Vector3,
    explorerYaw: number,
    explorerIsMoving: boolean,
    dt: number,
    tSec: number,
    prefersReduced: boolean
  ) => void;
  triggerCelebration: () => void;
  triggerScan: (targetWorldPos: THREE.Vector3) => void;
  reset: () => void;
  dispose: () => void;
}

const _desiredPos = new THREE.Vector3();
const _toGoal = new THREE.Vector3();
const _awayFromPlayer = new THREE.Vector3();

function normalizeAngleDiff(diff: number): number {
  let d = diff;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createCompanionSystem(textures: ObservatoryTextures): CompanionSystem {
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

  // Warm space-corgi / astro-pup palette (contrasting clearly with metallic slate deck)
  const matFurGolden = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#d97a41',
      roughness: 0.86,
      metalness: 0.02,
    })
  );
  const matFurCream = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f3ede3',
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const matEarInner = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f2a799',
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const matNoseDark = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#111827',
      roughness: 0.24,
      metalness: 0.12,
    })
  );
  const matEyeWhite = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
    })
  );
  const matHarnessTeal = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.16, 0.16),
      roughnessMap: textures.metalRoughness,
      color: '#0f766e',
      roughness: 0.48,
      metalness: 0.25,
    })
  );
  const matGearSlate = trackMat(
    new THREE.MeshStandardMaterial({
      normalMap: textures.metalNormal,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughnessMap: textures.metalRoughness,
      color: '#334155',
      roughness: 0.45,
      metalness: 0.55,
    })
  );
  const matGlowTag = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: '#38bdf8',
      emissiveIntensity: 1.05,
      roughness: 0.2,
    })
  );
  const matBubbleGlass = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#e0f2fe',
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      depthWrite: false,
      envMapIntensity: 0.8,
    })
  );

  // Root rig pivoted at ground contact y = 0
  const bodyRig = new THREE.Group();
  group.add(bodyRig);

  // Torso (warm golden coat) + cream chest fluff
  const torso = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.145, 0.28, 8, 14)),
    matFurGolden
  );
  torso.rotation.x = Math.PI / 2;
  torso.position.set(0, 0.27, 0);
  torso.castShadow = true;
  bodyRig.add(torso);

  const chestFluff = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.135, 12, 10)),
    matFurCream
  );
  chestFluff.scale.set(0.95, 1.05, 0.9);
  chestFluff.position.set(0, 0.26, 0.14);
  chestFluff.castShadow = true;
  bodyRig.add(chestFluff);

  // Mini Astro-Harness & Dorsal Sensor Pack
  const harness = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.148, 0.024, 8, 18)),
    matHarnessTeal
  );
  harness.position.set(0, 0.27, 0.05);
  bodyRig.add(harness);

  const miniPack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.15, 0.075, 0.16)),
    matGearSlate
  );
  miniPack.position.set(0, 0.415, -0.02);
  miniPack.castShadow = true;
  bodyRig.add(miniPack);

  const packBeacon = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 12)),
    matGlowTag
  );
  packBeacon.position.set(0, 0.46, -0.02);
  bodyRig.add(packBeacon);

  const collarTag = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.028, 10, 8)),
    matGlowTag
  );
  collarTag.position.set(0, 0.2, 0.25);
  bodyRig.add(collarTag);

  // Four Articulated Legs with cream paws seated at y = 0
  const makeLeg = (xOff: number, zOff: number) => {
    const hip = new THREE.Group();
    hip.position.set(xOff, 0.22, zOff);

    const upper = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.044, 0.1, 6, 10)),
      matFurGolden
    );
    upper.position.y = -0.085;
    upper.castShadow = true;
    hip.add(upper);

    const paw = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.048, 10, 8)),
      matFurCream
    );
    paw.scale.set(1, 0.72, 1.28);
    paw.position.set(0, -0.185, 0.018);
    paw.castShadow = true;
    hip.add(paw);

    return hip;
  };
  const legFL = makeLeg(-0.085, 0.135);
  const legFR = makeLeg(0.085, 0.135);
  const legBL = makeLeg(-0.085, -0.145);
  const legBR = makeLeg(0.085, -0.145);
  bodyRig.add(legFL, legFR, legBL, legBR);

  // Wagging Tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.34, -0.22);
  bodyRig.add(tailPivot);

  const tailBase = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.04, 0.14, 6, 10)),
    matFurGolden
  );
  tailBase.position.set(0, 0.08, -0.06);
  tailBase.rotation.x = -0.62;
  tailBase.castShadow = true;
  tailPivot.add(tailBase);

  const tailTip = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.046, 10, 8)),
    matFurCream
  );
  tailTip.position.set(0, 0.15, -0.115);
  tailPivot.add(tailTip);

  // Articulated Puppy Head + Space Bubble Helmet
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.42, 0.21);
  bodyRig.add(headGroup);

  const cranium = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.145, 16, 14)),
    matFurGolden
  );
  cranium.scale.set(1.04, 0.96, 1.0);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const muzzle = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.078, 12, 10)),
    matFurCream
  );
  muzzle.scale.set(1.05, 0.82, 1.15);
  muzzle.position.set(0, -0.032, 0.115);
  headGroup.add(muzzle);

  const nose = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.025, 10, 8)),
    matNoseDark
  );
  nose.scale.set(1.2, 0.85, 0.9);
  nose.position.set(0, -0.008, 0.195);
  headGroup.add(nose);

  // Glossy Eyes + Catchlight Sparkles
  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.026, 10, 8));
  const glintGeo = trackGeo(new THREE.SphereGeometry(0.009, 8, 6));

  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(-0.064, 0.032, 0.125);
  const leftEyeMesh = new THREE.Mesh(eyeGeo, matNoseDark);
  const leftGlint = new THREE.Mesh(glintGeo, matEyeWhite);
  leftGlint.position.set(0.008, 0.01, 0.022);
  leftEyeGroup.add(leftEyeMesh, leftGlint);

  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(0.064, 0.032, 0.125);
  const rightEyeMesh = new THREE.Mesh(eyeGeo, matNoseDark);
  const rightGlint = new THREE.Mesh(glintGeo, matEyeWhite);
  rightGlint.position.set(0.008, 0.01, 0.022);
  rightEyeGroup.add(rightEyeMesh, rightGlint);

  headGroup.add(leftEyeGroup, rightEyeGroup);

  // Perky Articulated Puppy Ears
  const makeEar = (xOff: number, tiltZ: number) => {
    const earPivot = new THREE.Group();
    earPivot.position.set(xOff, 0.105, -0.01);
    earPivot.rotation.z = tiltZ;

    const outer = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.052, 0.115, 8)),
      matFurGolden
    );
    outer.position.y = 0.048;
    outer.castShadow = true;
    earPivot.add(outer);

    const inner = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.028, 0.075, 6)),
      matEarInner
    );
    inner.position.set(0, 0.04, 0.02);
    earPivot.add(inner);

    return earPivot;
  };
  const leftEar = makeEar(-0.088, 0.24);
  const rightEar = makeEar(0.088, -0.24);
  headGroup.add(leftEar, rightEar);

  // Clear Space Bubble Helmet + Neck Seal Ring
  const neckRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.155, 0.02, 8, 22)),
    matGearSlate
  );
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.set(0, -0.095, 0.01);
  headGroup.add(neckRing);

  const bubbleHelmet = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.238, 22, 16)),
    matBubbleGlass
  );
  bubbleHelmet.position.set(0, 0.035, 0.025);
  bubbleHelmet.renderOrder = 2;
  headGroup.add(bubbleHelmet);

  // Soft Ground Shadow / Collar Ping Ring
  const footRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.18, 0.24, 24)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
      })
    )
  );
  footRing.rotation.x = -Math.PI / 2;
  footRing.position.y = 0.018;
  group.add(footRing);

  // Gentle collar beacon ping pulse when curious about a scanned landmark
  const pingRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.22, 0.3, 24)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );
  pingRing.rotation.x = -Math.PI / 2;
  pingRing.position.y = 0.025;
  pingRing.visible = false;
  group.add(pingRing);

  // Start right beside the explorer on the observatory deck
  const position = new THREE.Vector3(0.82, 0.28, 4.65);
  let facingYaw = Math.PI - 0.12;
  let trotPhase = 0;
  let celebrateTime = 0;
  let scanTime = 0;
  let idleTime = 0;
  let nextBlinkAt = 2.4;
  let blinkElapsed = -1;
  let happyHopTime = 0;
  let nextHappyHopAt = 8.5;
  const scanTargetWorld = new THREE.Vector3();

  group.position.copy(position);
  group.rotation.y = facingYaw;

  const triggerCelebration = () => {
    celebrateTime = 2.95;
  };

  const triggerScan = (targetWorldPos: THREE.Vector3) => {
    scanTargetWorld.copy(targetWorldPos);
    scanTime = 1.25;
  };

  const reset = () => {
    position.set(0.82, 0.28, 4.65);
    facingYaw = Math.PI - 0.12;
    trotPhase = 0;
    celebrateTime = 0;
    scanTime = 0;
    idleTime = 0;
    happyHopTime = 0;
    pingRing.visible = false;
    group.position.copy(position);
    group.rotation.y = facingYaw;
  };

  return {
    group,
    position,
    triggerCelebration,
    triggerScan,
    reset,
    update: (explorerPos, explorerYaw, explorerIsMoving, dt, tSec, prefersReduced) => {
      if (celebrateTime > 0) celebrateTime = Math.max(0, celebrateTime - dt);
      if (scanTime > 0) scanTime = Math.max(0, scanTime - dt);
      if (happyHopTime > 0) happyHopTime = Math.max(0, happyHopTime - dt);

      // Trots beside the explorer's right side, slightly staggered
      const fwdX = Math.sin(explorerYaw);
      const fwdZ = Math.cos(explorerYaw);
      const rightX = -fwdZ;
      const rightZ = fwdX;

      _desiredPos.set(
        explorerPos.x + rightX * 1.15 - fwdX * 0.28,
        explorerPos.y,
        explorerPos.z + rightZ * 1.15 - fwdZ * 0.28
      );
      const safeTarget = resolveWalkableGround(_desiredPos.x, _desiredPos.z);
      _desiredPos.set(safeTarget.x, safeTarget.y, safeTarget.z);

      // Keep comfortable space around player boots (>= 0.85m)
      _awayFromPlayer.set(position.x - explorerPos.x, 0, position.z - explorerPos.z);
      const playerDistSq = _awayFromPlayer.lengthSq();
      if (playerDistSq < 0.72 && playerDistSq > 1e-5) {
        const pd = Math.sqrt(playerDistSq);
        _desiredPos.x += (_awayFromPlayer.x / pd) * (0.85 - pd);
        _desiredPos.z += (_awayFromPlayer.z / pd) * (0.85 - pd);
      }

      _toGoal.set(_desiredPos.x - position.x, 0, _desiredPos.z - position.z);
      const dist = _toGoal.length();
      const isTrotting = dist > (explorerIsMoving ? 0.28 : 0.42);

      if (isTrotting) {
        idleTime = 0;
        scanTime = 0;
        const speed = dist > 2.2 ? 5.8 : dist > 0.9 ? 3.8 : 2.5;
        const step = Math.min(dist, speed * dt);
        const dirX = _toGoal.x / dist;
        const dirZ = _toGoal.z / dist;

        const resolved = resolveWalkableGround(position.x + dirX * step, position.z + dirZ * step);
        position.set(resolved.x, resolved.y, resolved.z);

        const targetYaw = Math.atan2(dirX, dirZ);
        facingYaw += normalizeAngleDiff(targetYaw - facingYaw) * Math.min(1, dt * 12);

        const cadence = speed > 4.2 ? 15.0 : 11.5;
        trotPhase += dt * cadence;

        // Diagonal quadruped trot gait
        const swing = prefersReduced ? 0 : Math.sin(trotPhase) * 0.62;
        legFL.rotation.x = swing;
        legBR.rotation.x = swing;
        legFR.rotation.x = -swing;
        legBL.rotation.x = -swing;

        bodyRig.position.y = prefersReduced ? 0 : Math.abs(Math.sin(trotPhase)) * 0.045;
        bodyRig.rotation.x = prefersReduced ? 0 : Math.cos(trotPhase) * 0.04;
        headGroup.rotation.y *= 1 - Math.min(1, dt * 8);
        headGroup.rotation.z *= 1 - Math.min(1, dt * 8);
      } else {
        idleTime += dt;
        const settle = Math.min(1, dt * 12);
        legFL.rotation.x *= 1 - settle;
        legFR.rotation.x *= 1 - settle;
        legBL.rotation.x *= 1 - settle;
        legBR.rotation.x *= 1 - settle;
        bodyRig.rotation.x *= 1 - settle;
        bodyRig.position.y = prefersReduced ? 0 : Math.sin(tSec * 2.6 + 0.7) * 0.009;

        // Playful little excited bounce every once in a while when waiting by the player
        if (
          idleTime > nextHappyHopAt &&
          happyHopTime <= 0 &&
          celebrateTime <= 0 &&
          scanTime <= 0 &&
          !prefersReduced
        ) {
          happyHopTime = 0.75;
          nextHappyHopAt = idleTime + 11 + Math.random() * 6;
        }

        if (scanTime <= 0 && celebrateTime <= 0) {
          // Turn warmly to glance up toward the explorer after settling
          const lookToPlayerYaw = Math.atan2(explorerPos.x - position.x, explorerPos.z - position.z);
          const idleTargetYaw =
            idleTime > 1.8
              ? explorerYaw + normalizeAngleDiff(lookToPlayerYaw - explorerYaw) * 0.42
              : explorerYaw;
          facingYaw += normalizeAngleDiff(idleTargetYaw - facingYaw) * Math.min(1, dt * 4.5);

          // Curious puppy head tilt toward explorer
          const headTargetY = prefersReduced
            ? 0
            : idleTime > 2.0
              ? normalizeAngleDiff(lookToPlayerYaw - facingYaw) * 0.55
              : Math.sin(tSec * 0.8) * 0.14;
          const headTiltZ = prefersReduced ? 0 : Math.sin(tSec * 0.95) * 0.14;
          headGroup.rotation.y += (headTargetY - headGroup.rotation.y) * Math.min(1, dt * 4.5);
          headGroup.rotation.z += (headTiltZ - headGroup.rotation.z) * Math.min(1, dt * 3.8);
          headGroup.rotation.x += (0.08 - headGroup.rotation.x) * Math.min(1, dt * 4);
        }
      }

      // Playful idle hop
      if (happyHopTime > 0 && !isTrotting && celebrateTime <= 0 && !prefersReduced) {
        const p = 1 - happyHopTime / 0.75;
        const hop = Math.abs(Math.sin(p * Math.PI * 2)) * 0.16;
        bodyRig.position.y += hop;
      }

      // Tail wagging: fast when trotting, scanning, or celebrating; steady gentle wag at idle
      const wagSpeed = celebrateTime > 0 ? 22 : isTrotting || happyHopTime > 0 ? 15 : scanTime > 0 ? 13 : 6.5;
      const wagAmp = celebrateTime > 0 ? 0.58 : isTrotting ? 0.42 : 0.3;
      tailPivot.rotation.y = prefersReduced ? 0 : Math.sin(tSec * wagSpeed) * wagAmp;
      tailPivot.rotation.x = prefersReduced ? 0 : Math.sin(tSec * wagSpeed * 0.5) * 0.08;

      // Ear perk animations
      const earPerk = scanTime > 0 || celebrateTime > 0 || happyHopTime > 0 ? 0.14 : 0;
      leftEar.rotation.z = 0.24 - earPerk + (prefersReduced ? 0 : Math.sin(tSec * 2.1) * 0.03);
      rightEar.rotation.z = -0.24 + earPerk - (prefersReduced ? 0 : Math.sin(tSec * 2.1 + 0.6) * 0.03);

      // Celebration happy zoom-hops
      if (celebrateTime > 0 && !prefersReduced) {
        const prog = 1 - celebrateTime / 2.95;
        const hop = Math.abs(Math.sin(prog * Math.PI * 5 + 0.35)) * 0.36;
        bodyRig.position.y += hop;
        bodyRig.rotation.x = -Math.sin(prog * Math.PI * 5 + 0.35) * 0.16;
        bodyRig.rotation.y = Math.sin(prog * Math.PI * 4) * 0.34;
        headGroup.rotation.x = -0.18;
      } else if (scanTime > 0 && !isTrotting) {
        // Curious look toward scanned instrument + gentle ground beacon pulse
        const dx = scanTargetWorld.x - position.x;
        const dz = scanTargetWorld.z - position.z;
        const targetYaw = Math.atan2(dx, dz);
        facingYaw += normalizeAngleDiff(targetYaw - facingYaw) * Math.min(1, dt * 12);
        headGroup.rotation.y *= 1 - Math.min(1, dt * 8);
        headGroup.rotation.z += (0.16 - headGroup.rotation.z) * Math.min(1, dt * 6);
        headGroup.rotation.x += (-0.12 - headGroup.rotation.x) * Math.min(1, dt * 6);

        pingRing.visible = true;
        const pProg = 1 - scanTime / 1.25;
        pingRing.scale.setScalar(0.85 + pProg * 1.45);
        (pingRing.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - pProg);
      } else {
        pingRing.visible = false;
        bodyRig.rotation.y *= 1 - Math.min(1, dt * 8);
        if (!isTrotting) {
          headGroup.rotation.x *= 1 - Math.min(1, dt * 5);
        }
      }

      // Natural eye blink
      if (tSec >= nextBlinkAt && blinkElapsed < 0) {
        blinkElapsed = 0;
        nextBlinkAt = tSec + 2.8 + Math.random() * 2.6;
      }
      if (blinkElapsed >= 0) {
        blinkElapsed += dt;
        const blinkDur = 0.15;
        if (blinkElapsed >= blinkDur) {
          blinkElapsed = -1;
          leftEyeGroup.scale.y = 1;
          rightEyeGroup.scale.y = 1;
        } else {
          const squeeze = Math.max(0.1, Math.abs(Math.cos((blinkElapsed / blinkDur) * Math.PI)));
          leftEyeGroup.scale.y = squeeze;
          rightEyeGroup.scale.y = squeeze;
        }
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
