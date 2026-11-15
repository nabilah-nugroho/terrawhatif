import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Sparkles } from 'lucide-react';
import type { SimParams, SimResult, StageId, StarKey } from '../types/observatory';
import { createObservatoryTextures } from '../scene3d/materials';
import { createEnvironmentSystem } from '../scene3d/environment';
import { createLandmarksSystem } from '../scene3d/landmarks';
import { createExplorerSystem } from '../scene3d/explorer';
import { createCompanionSystem } from '../scene3d/companion';
import {
  createPostProcessingPipeline,
  type PostProcessingPipeline,
} from '../scene3d/postprocessing';

export type CameraPresetId = 'observatory' | 'earth' | 'ice';

export interface CameraCommand {
  preset: CameraPresetId;
  nonce: number;
}

export interface FocusLandmarkCommand {
  id: string;
  nonce: number;
}

interface Observatory3DProps {
  stage: StageId;
  starKey: StarKey;
  params: SimParams;
  simResult: SimResult;
  activeConceptId: string | null;
  inspectedIds: Set<string>;
  spotlightLandmarks: string[];
  cameraCommand: CameraCommand | null;
  focusLandmark?: FocusLandmarkCommand | null;
  thirdPersonMode: boolean;
  hideLabels?: boolean;
  celebrateNonce?: number;
  onSelectLandmark: (id: string) => void;
  onFootstep?: () => void;
}

interface LandmarkMeta {
  id: string;
  label: string;
  trappistLabel?: string;
  chapter: number;
}

const LANDMARK_METAS: LandmarkMeta[] = [
  { id: 'thermometer', label: 'Thermometer', chapter: 1 },
  { id: 'ice', label: 'Polar Ice', chapter: 1 },
  { id: 'valve', label: 'Gas Valve', chapter: 1 },
  { id: 'lever', label: 'Orbit Lever', chapter: 2 },
  { id: 'vapor', label: 'Ocean Mist', chapter: 2 },
  { id: 'starmap', label: 'Star Telescope', chapter: 3 },
  { id: 'sky', label: 'Sky Dome', trappistLabel: 'Red Sky', chapter: 3 },
  { id: 'terminator', label: 'Day-Night Line', chapter: 3 },
];

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  observatory: { pos: [0.3, 4.2, 15.2], target: [0.0, 2.2, -4.0] },
  earth: { pos: [6.4, 5.8, -12.8], target: [11.5, 6.2, -22.5] },
  ice: { pos: [-1.4, 3.2, 4.2], target: [-6.6, 1.1, -3.5] },
};

const WAYPOINT_COORDS: Record<string, [number, number, number]> = {
  thermometer: [4.55, 0.31, 3.85],
  valve: [1.55, 0.31, 4.95],
  lever: [6.35, 0.31, 5.35],
  sky: [-2.65, 0.31, 2.2],
  starmap: [-7.1, 1.31, 1.35],
  terminator: [7.45, 1.28, -1.65],
  ice: [-4.6, 0.31, 2.0],
  vapor: [-0.6, 0.31, 1.85],
};

function getFloorSurfaceY(x: number, z: number): number {
  if (x >= 6.45 && z < 1.3) {
    const t = Math.max(0, Math.min(1, (1.3 - z) / 2.05));
    return 0.28 + t * (1.25 - 0.28);
  }
  if (x <= -5.5 && z < 3.1) {
    const t = Math.max(0, Math.min(1, (3.1 - z) / 1.15));
    return 0.28 + t * (1.28 - 0.28);
  }
  return 0.28;
}

const _proj = new THREE.Vector3();
const _targetColZenith = new THREE.Color();
const _targetColHorizon = new THREE.Color();
const _targetColSun = new THREE.Color();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _prevExplorerPos = new THREE.Vector3();
const _deltaExplorer = new THREE.Vector3();
const _introStartPos = new THREE.Vector3(-7.8, 7.4, 15.8);
const _introStartTarget = new THREE.Vector3(1.5, 3.0, -5.0);
const _introGoalPos = new THREE.Vector3();
const _introGoalTarget = new THREE.Vector3();
const _wpTarget = new THREE.Vector3();
const _wpStep = new THREE.Vector3();
const _wpLook = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _breathOffset = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(renderer);
  } catch {
    return false;
  }
}

export const Observatory3D: React.FC<Observatory3DProps> = ({
  stage,
  starKey,
  params,
  simResult,
  activeConceptId,
  inspectedIds,
  spotlightLandmarks,
  cameraCommand,
  focusLandmark = null,
  thirdPersonMode,
  hideLabels = false,
  celebrateNonce = 0,
  onSelectLandmark,
  onFootstep,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelElsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const explorerRef = useRef<ReturnType<typeof createExplorerSystem> | null>(null);
  const companionRef = useRef<ReturnType<typeof createCompanionSystem> | null>(null);
  const landmarksRef = useRef<ReturnType<typeof createLandmarksSystem> | null>(null);
  const [nearbyLandmarkId, setNearbyLandmarkId] = useState<string | null>(null);
  const [showDesktopDpad, setShowDesktopDpad] = useState(false);

  // Live reactive refs for the Three.js render loop (prevents context teardown)
  const simRef = useRef(simResult);
  const paramsRef = useRef(params);
  const stageRef = useRef(stage);
  const starKeyRef = useRef(starKey);
  const activeRef = useRef(activeConceptId);
  const inspectedRef = useRef(inspectedIds);
  const spotlightRef = useRef(spotlightLandmarks);
  const onSelectRef = useRef(onSelectLandmark);
  const onFootstepRef = useRef(onFootstep);
  const hideLabelsRef = useRef(hideLabels);
  const thirdPersonRef = useRef(thirdPersonMode);
  const justEnteredThirdPersonRef = useRef(false);
  const justExitedThirdPersonRef = useRef(false);
  const nearbyIdRef = useRef<string | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const dpadRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const camTransitionRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS.observatory.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.observatory.target),
  });

  useEffect(() => {
    simRef.current = simResult;
  }, [simResult]);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    starKeyRef.current = starKey;
  }, [starKey]);

  useEffect(() => {
    activeRef.current = activeConceptId;
    if (activeConceptId && thirdPersonRef.current && explorerRef.current && landmarksRef.current) {
      const rig = landmarksRef.current.rigs.find((r) => r.id === activeConceptId);
      if (rig) {
        _wpTarget.copy(rig.group.position);
        _wpTarget.y += 1.05;
        explorerRef.current.triggerScan(_wpTarget);
        companionRef.current?.triggerScan(_wpTarget);
      }
    }
  }, [activeConceptId]);

  useEffect(() => {
    inspectedRef.current = inspectedIds;
  }, [inspectedIds]);

  useEffect(() => {
    spotlightRef.current = spotlightLandmarks;
  }, [spotlightLandmarks]);

  useEffect(() => {
    onSelectRef.current = onSelectLandmark;
  }, [onSelectLandmark]);

  useEffect(() => {
    onFootstepRef.current = onFootstep;
  }, [onFootstep]);

  useEffect(() => {
    hideLabelsRef.current = hideLabels;
  }, [hideLabels]);

  useEffect(() => {
    const prev = thirdPersonRef.current;
    thirdPersonRef.current = thirdPersonMode;
    if (thirdPersonMode && !prev) {
      justEnteredThirdPersonRef.current = true;
      camTransitionRef.current.active = false;
    } else if (!thirdPersonMode && prev) {
      justExitedThirdPersonRef.current = true;
      setNearbyLandmarkId(null);
      nearbyIdRef.current = null;
    }
  }, [thirdPersonMode]);

  useEffect(() => {
    if (!cameraCommand) return;
    const cfg = CAMERA_PRESETS[cameraCommand.preset];
    camTransitionRef.current = {
      active: true,
      pos: new THREE.Vector3(...cfg.pos),
      target: new THREE.Vector3(...cfg.target),
    };
  }, [cameraCommand]);

  useEffect(() => {
    if (!focusLandmark) return;
    const coords = WAYPOINT_COORDS[focusLandmark.id];
    if (!coords) return;

    const targetPos = new THREE.Vector3(coords[0], coords[1] + 0.85, coords[2]);
    if (thirdPersonRef.current && explorerRef.current) {
      explorerRef.current.triggerScan(targetPos);
      companionRef.current?.triggerScan(targetPos);
      const fromTarget = new THREE.Vector3(
        explorerRef.current.position.x - targetPos.x,
        0,
        explorerRef.current.position.z - targetPos.z
      );
      if (fromTarget.lengthSq() < 0.5) {
        fromTarget.set(0, 0, 1);
      }
      fromTarget.normalize();
      const camPos = explorerRef.current.position
        .clone()
        .addScaledVector(fromTarget, 4.6)
        .add(new THREE.Vector3(0, 2.7, 0));
      camTransitionRef.current = {
        active: true,
        pos: camPos,
        target: targetPos.clone().lerp(explorerRef.current.position, 0.35),
      };
    } else {
      const fromOrigin = new THREE.Vector3(-coords[0] * 0.45, 2.9, 6.2);
      camTransitionRef.current = {
        active: true,
        pos: targetPos.clone().add(fromOrigin),
        target: targetPos,
      };
    }
  }, [focusLandmark]);

  useEffect(() => {
    if (celebrateNonce > 0) {
      explorerRef.current?.triggerCelebration();
      companionRef.current?.triggerCelebration();
    }
  }, [celebrateNonce]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(simRef.current.skyColors.horizon, 0.0112);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.25, 220);

    // Procedural Textures created up front so PBR maps wire into explorer, environment & landmarks
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const textures = createObservatoryTextures(maxAniso);

    const explorer = createExplorerSystem(textures);
    explorerRef.current = explorer;
    const companion = createCompanionSystem(textures);
    companionRef.current = companion;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI * 0.482;

    let introSweepActive = thirdPersonRef.current;
    let introSweepElapsed = 0;
    const INTRO_SWEEP_DURATION = 2.0;

    if (thirdPersonRef.current) {
      controls.minDistance = 2.8;
      controls.maxDistance = 12;
      controls.enablePan = false;
      camera.position.copy(_introStartPos);
      controls.target.copy(_introStartTarget);
    } else {
      controls.minDistance = 5.5;
      controls.maxDistance = 28;
      controls.enablePan = true;
      camera.position.set(...CAMERA_PRESETS.observatory.pos);
      controls.target.set(...CAMERA_PRESETS.observatory.target);
    }
    controls.update();

    let isUserDragging = false;
    const cancelPresetOnDrag = () => {
      camTransitionRef.current.active = false;
      introSweepActive = false;
      isUserDragging = true;
    };
    const onControlEnd = () => {
      isUserDragging = false;
    };
    controls.addEventListener('start', cancelPresetOnDrag);
    controls.addEventListener('end', onControlEnd);

    // Environment reflection map via PMREM + RoomEnvironment (kept low so shadows stay rich)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.36;

    // Balanced Moody Three-Point + Soft Rim Lighting:
    // 1. Cool deep-navy atmospheric hemisphere fill
    const hemiLight = new THREE.HemisphereLight('#385e96', '#060c17', 0.28);
    scene.add(hemiLight);

    // 2. Warm low-angle golden/amber directional key light with crisp 2048px soft shadows
    const sunLight = new THREE.DirectionalLight('#ffbe73', 1.38);
    sunLight.position.set(-16.5, 7.6, -25.0);
    sunLight.castShadow = !isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 68;
      sunLight.shadow.camera.left = -14;
      sunLight.shadow.camera.right = 14;
      sunLight.shadow.camera.top = 12;
      sunLight.shadow.camera.bottom = -10;
      sunLight.shadow.bias = -0.0004;
      sunLight.shadow.normalBias = 0.025;
      sunLight.shadow.radius = 2.6;
    }
    scene.add(sunLight);

    // 3. Subtle cool-cyan specular rim light for silhouette edge separation
    const rimLight = new THREE.DirectionalLight('#5aa8e6', 0.72);
    rimLight.position.set(14.5, 6.2, -16.0);
    rimLight.target.position.set(0, 1.0, 2.5);
    scene.add(rimLight);
    scene.add(rimLight.target);

    // Subtle dual-tone observatory deck instrument fills
    const deckFillLight = new THREE.PointLight('#38bdf8', 0.42, 16, 1.8);
    deckFillLight.position.set(-2.2, 3.8, 5.8);
    scene.add(deckFillLight);

    const deckWarmFill = new THREE.PointLight('#fb923c', 0.32, 13, 1.9);
    deckWarmFill.position.set(4.2, 2.2, 4.4);
    scene.add(deckWarmFill);

    // Environment + Composite Landmarks + 3rd-Person Explorer
    const envSystem = createEnvironmentSystem(scene, textures);
    const landmarks = createLandmarksSystem(textures);
    landmarksRef.current = landmarks;
    scene.add(landmarks.root);
    scene.add(explorer.group);
    scene.add(companion.group);

    // Cinematic Post-Processing Pipeline (GPU only; software WebGL renders direct for smooth pacing)
    const postPipeline: PostProcessingPipeline | null = isSoftwareGl
      ? null
      : createPostProcessingPipeline(renderer, scene, camera, width, height, pixelRatio);

    // 3D Holographic Ground Waypoint & Directional Guide Chevrons
    const waypointGroup = new THREE.Group();
    waypointGroup.visible = false;
    scene.add(waypointGroup);

    const wpRingGeo = new THREE.TorusGeometry(1.15, 0.042, 12, 48);
    wpRingGeo.rotateX(-Math.PI / 2);
    const wpRingMat = new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wpRingMesh = new THREE.Mesh(wpRingGeo, wpRingMat);

    const wpInnerGeo = new THREE.RingGeometry(0.56, 0.8, 36);
    wpInnerGeo.rotateX(-Math.PI / 2);
    const wpInnerMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wpInnerMesh = new THREE.Mesh(wpInnerGeo, wpInnerMat);
    wpInnerMesh.position.y = 0.015;

    const wpBeaconGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.45, 32, 1, true);
    const wpBeaconMat = new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wpBeaconMesh = new THREE.Mesh(wpBeaconGeo, wpBeaconMat);
    wpBeaconMesh.position.y = 0.225;

    const wpTargetMarker = new THREE.Group();
    wpTargetMarker.add(wpRingMesh, wpInnerMesh, wpBeaconMesh);
    waypointGroup.add(wpTargetMarker);

    const CHEVRON_COUNT = 9;
    const wpChevronGeo = new THREE.ConeGeometry(0.13, 0.28, 4);
    wpChevronGeo.rotateX(Math.PI / 2);
    wpChevronGeo.scale(1.0, 0.26, 1.0);
    const wpChevronMats: THREE.MeshBasicMaterial[] = [];
    const wpChevrons: THREE.Mesh[] = [];
    for (let i = 0; i < CHEVRON_COUNT; i++) {
      const cMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const cMesh = new THREE.Mesh(wpChevronGeo, cMat);
      wpChevronMats.push(cMat);
      wpChevrons.push(cMesh);
      waypointGroup.add(cMesh);
    }

    // Lerped simulation visual state
    const init = simRef.current;
    const smooth = {
      zenith: new THREE.Color(init.skyColors.zenith),
      horizon: new THREE.Color(init.skyColors.horizon),
      sun: new THREE.Color(init.skyColors.sun),
      angularSizeRatio: init.angularSizeRatio,
      albedo: init.albedo,
      tau: init.tau,
      tidalShadow: init.tidalLocked ? 1 : 0,
      starAlpha: init.T_surface < 270 || init.tidalLocked ? 1 : 0,
      vaporIntensity:
        init.waterPhase === 'vapor' || init.waterPhase === 'boiling' || init.runaway ? 1 : 0,
      tempK: init.T_surface,
    };

    // Raycaster for direct 3D clicking + hover pointer feedback
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let lastHoverCheck = 0;

    const getHitConceptId = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(landmarks.hitMeshes, false);
      for (const h of hits) {
        const cid = h.object.userData?.conceptId as string | undefined;
        if (!cid) continue;
        // Verify landmark is visible in current stage
        const rig = landmarks.rigs.find((r) => r.id === cid);
        if (rig && rig.group.visible) return cid;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (stageRef.current === 'INTRO') return;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (dx * dx + dy * dy > 36) return; // Dragged camera -> do not click landmark
      const cid = getHitConceptId(e.clientX, e.clientY);
      if (cid) {
        onSelectRef.current(cid);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (stageRef.current === 'INTRO') {
        renderer.domElement.style.cursor = 'grab';
        return;
      }
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;
      const cid = getHitConceptId(e.clientX, e.clientY);
      renderer.domElement.style.cursor = cid ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysRef.current.add(e.code);
      if (e.code === 'KeyE' && thirdPersonRef.current && nearbyIdRef.current) {
        onSelectRef.current(nearbyIdRef.current);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    const onBlur = () => {
      keysRef.current.clear();
      dpadRef.current = { x: 0, z: 0 };
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      postPipeline?.setSize(w, h, renderer.getPixelRatio());
    };
    window.addEventListener('resize', onResize);

    // Software WebGL frame pacing helper (threejs/SKILL.md)
    const glCtx = isSoftwareGl ? (renderer.getContext() as WebGL2RenderingContext) : null;
    const afterDraw = (cb: () => void) => {
      if (glCtx && 'fenceSync' in glCtx) {
        const sync = glCtx.fenceSync(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          glCtx.flush();
          const poll = () => {
            if (disposed) {
              glCtx.deleteSync(sync);
              return;
            }
            const status = glCtx.clientWaitSync(sync, 0, 0);
            if (status === glCtx.TIMEOUT_EXPIRED) {
              setTimeout(poll, 4);
            } else {
              glCtx.deleteSync(sync);
              setTimeout(cb, 80);
            }
          };
          poll();
          return;
        }
      }
      setTimeout(cb, 80);
    };

    let disposed = false;
    let rafId = 0;
    let lastNow = performance.now();
    let breathGain = 0;

    const animate = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.06, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;
      const tSec = now / 1000;

      const target = simRef.current;
      const k = prefersReduced ? 1 : 1 - Math.exp(-dt * 5.0);

      _targetColZenith.set(target.skyColors.zenith);
      _targetColHorizon.set(target.skyColors.horizon);
      _targetColSun.set(target.skyColors.sun);

      smooth.zenith.lerp(_targetColZenith, k);
      smooth.horizon.lerp(_targetColHorizon, k);
      smooth.sun.lerp(_targetColSun, k);
      smooth.angularSizeRatio += (target.angularSizeRatio - smooth.angularSizeRatio) * k;
      smooth.albedo += (target.albedo - smooth.albedo) * k;
      smooth.tau += (target.tau - smooth.tau) * k;
      smooth.tidalShadow += ((target.tidalLocked ? 1 : 0) - smooth.tidalShadow) * k;
      const wantStars = target.T_surface < 270 || target.tidalLocked ? 1 : 0;
      smooth.starAlpha += (wantStars - smooth.starAlpha) * k;
      const wantVapor =
        target.waterPhase === 'vapor' || target.waterPhase === 'boiling' || target.runaway
          ? 1
          : Math.max(0, (target.T_surface - 310) / 70) * 0.45;
      smooth.vaporIntensity += (wantVapor - smooth.vaporIntensity) * k;
      smooth.tempK += (target.T_surface - smooth.tempK) * k;

      // Update directional sun color (calm golden/amber key) + atmospheric fill & rim
      sunLight.color.copy(smooth.sun).lerp(_targetColZenith.set('#ffbe73'), 0.45);
      sunLight.intensity = 1.28 + Math.min(0.42, smooth.angularSizeRatio * 0.14);
      hemiLight.color.copy(smooth.zenith).lerp(_targetColHorizon.set('#2e5082'), 0.4);
      rimLight.color.copy(smooth.zenith).lerp(_targetColHorizon.set('#5eaee8'), 0.65);

      // 2-Second Cinematic Intro Camera Sweep on Initial 3P Launch
      if (introSweepActive) {
        _introGoalPos.set(
          explorer.position.x - 0.9,
          explorer.position.y + 1.9,
          explorer.position.z + 5.6
        );
        _introGoalTarget.set(
          explorer.position.x + 0.65,
          explorer.position.y + 1.65,
          explorer.position.z - 2.0
        );
        if (prefersReduced) {
          camera.position.copy(_introGoalPos);
          controls.target.copy(_introGoalTarget);
          introSweepActive = false;
        } else {
          introSweepElapsed = Math.min(INTRO_SWEEP_DURATION, introSweepElapsed + dt);
          const u = introSweepElapsed / INTRO_SWEEP_DURATION;
          const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
          camera.position.lerpVectors(_introStartPos, _introGoalPos, ease);
          controls.target.lerpVectors(_introStartTarget, _introGoalTarget, ease);
          if (introSweepElapsed >= INTRO_SWEEP_DURATION) {
            introSweepActive = false;
          }
        }
      }

      // Handle 3rd-Person Explorer Mode & Camera Follow
      if (justEnteredThirdPersonRef.current) {
        justEnteredThirdPersonRef.current = false;
        introSweepActive = false;
        controls.minDistance = 2.8;
        controls.maxDistance = 12;
        controls.enablePan = false;
        camTransitionRef.current = {
          active: true,
          pos: new THREE.Vector3(
            explorer.position.x - 0.9,
            explorer.position.y + 1.9,
            explorer.position.z + 5.6
          ),
          target: new THREE.Vector3(
            explorer.position.x + 0.65,
            explorer.position.y + 1.65,
            explorer.position.z - 2.0
          ),
        };
      }
      if (justExitedThirdPersonRef.current) {
        justExitedThirdPersonRef.current = false;
        introSweepActive = false;
        controls.minDistance = 5.5;
        controls.maxDistance = 28;
        controls.enablePan = true;
        camTransitionRef.current = {
          active: true,
          pos: new THREE.Vector3(...CAMERA_PRESETS.observatory.pos),
          target: new THREE.Vector3(...CAMERA_PRESETS.observatory.target),
        };
      }

      let explorerMoving = false;
      if (thirdPersonRef.current && stageRef.current !== 'INTRO') {
        const keys = keysRef.current;
        let mx = dpadRef.current.x;
        let mz = dpadRef.current.z;
        if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
        const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');

        camera.getWorldDirection(_camDir);
        const cameraYaw = Math.atan2(_camDir.x, _camDir.z);
        _prevExplorerPos.copy(explorer.position);

        explorer.update(
          { moveX: mx, moveZ: mz, sprint, cameraYaw },
          dt,
          tSec,
          prefersReduced,
          onFootstepRef.current
        );

        _deltaExplorer.subVectors(explorer.position, _prevExplorerPos);
        if (_deltaExplorer.lengthSq() > 1e-8) {
          explorerMoving = true;
          camTransitionRef.current.active = false;
          introSweepActive = false;
          camera.position.add(_deltaExplorer);
          controls.target.add(_deltaExplorer);
        }
      } else {
        // Idle / celebrate character on deck
        explorer.update(
          { moveX: 0, moveZ: 0, sprint: false, cameraYaw: 0 },
          dt,
          tSec,
          prefersReduced
        );
      }

      // Update companion partner to walk alongside, look around, scan, and celebrate together
      companion.update(
        explorer.position,
        explorer.group.rotation.y,
        explorerMoving,
        dt,
        tSec,
        prefersReduced
      );

      // Update camera preset / instrument focus glide with smooth exponential damping
      if (camTransitionRef.current.active && !introSweepActive) {
        const ck = prefersReduced ? 1 : 1 - Math.exp(-dt * 5.2);
        _camGoalPos.copy(camTransitionRef.current.pos);
        _camGoalTarget.copy(camTransitionRef.current.target);
        camera.position.lerp(_camGoalPos, ck);
        controls.target.lerp(_camGoalTarget, ck);
        if (
          camera.position.distanceTo(_camGoalPos) < 0.04 &&
          controls.target.distanceTo(_camGoalTarget) < 0.04
        ) {
          camTransitionRef.current.active = false;
        }
      }
      controls.update();

      // Update 3D Environment
      envSystem.update(
        {
          zenithColor: smooth.zenith,
          horizonColor: smooth.horizon,
          sunColor: smooth.sun,
          angularSizeRatio: smooth.angularSizeRatio,
          albedo: smooth.albedo,
          tau: smooth.tau,
          tidalShadow: smooth.tidalShadow,
          starAlpha: smooth.starAlpha,
          vaporIntensity: smooth.vaporIntensity,
          tempK: smooth.tempK,
          waterPhase: target.waterPhase,
        },
        tSec,
        dt,
        prefersReduced
      );

      // Update 3D Landmarks
      const curStage = stageRef.current;
      const chapterNum =
        curStage === 'INTRO' ? 0 : curStage === 'CH1' ? 1 : curStage === 'CH2' ? 2 : 3;
      const visibleIds = new Set<string>();
      for (const m of LANDMARK_METAS) {
        if (m.chapter <= chapterNum) visibleIds.add(m.id);
      }

      landmarks.update(
        {
          tempK: smooth.tempK,
          albedo: smooth.albedo,
          a_AU: paramsRef.current.a_AU,
          co2_ppm: paramsRef.current.co2_ppm,
          noGreenhouse: paramsRef.current.noGreenhouse,
          tidalLocked: target.tidalLocked,
          vaporIntensity: smooth.vaporIntensity,
          starKey: starKeyRef.current,
          hzBounds: target.hzBounds,
          starWorldPos: envSystem.starWorldPos,
          visibleIds,
          spotlightIds: new Set(spotlightRef.current),
          inspectedIds: inspectedRef.current,
          activeId: activeRef.current,
        },
        tSec,
        dt
      );

      // Update 3D Holographic Ground Waypoint & Directional Guide Line
      const activeSpotlightId = spotlightRef.current[0];
      const wpCoords = activeSpotlightId ? WAYPOINT_COORDS[activeSpotlightId] : undefined;
      if (curStage !== 'INTRO' && wpCoords && visibleIds.has(activeSpotlightId)) {
        waypointGroup.visible = true;
        _wpTarget.set(wpCoords[0], wpCoords[1], wpCoords[2]);
        wpTargetMarker.position.copy(_wpTarget);
        const pulse = 1 + Math.sin(tSec * 4.2) * 0.08;
        wpRingMesh.scale.set(pulse, 1, pulse);
        wpInnerMesh.scale.set(1.12 - Math.sin(tSec * 4.2) * 0.08, 1, 1.12 - Math.sin(tSec * 4.2) * 0.08);
        wpBeaconMat.opacity = 0.14 + 0.08 * Math.sin(tSec * 3.5);

        const distSq =
          (_wpTarget.x - explorer.position.x) ** 2 + (_wpTarget.z - explorer.position.z) ** 2;
        for (let i = 0; i < CHEVRON_COUNT; i++) {
          const cMesh = wpChevrons[i];
          const cMat = wpChevronMats[i];
          if (distSq < 1.8) {
            cMesh.visible = false;
            continue;
          }
          const frac = (i / CHEVRON_COUNT + (prefersReduced ? 0 : tSec * 0.55)) % 1;
          const clampedFrac = 0.09 + frac * 0.78;
          _wpStep.lerpVectors(explorer.position, _wpTarget, clampedFrac);
          _wpStep.y = getFloorSurfaceY(_wpStep.x, _wpStep.z) + 0.06;
          cMesh.position.copy(_wpStep);
          _wpLook.set(_wpTarget.x, _wpStep.y, _wpTarget.z);
          cMesh.lookAt(_wpLook);
          const edgeFade = Math.sin(frac * Math.PI);
          cMat.opacity = 0.25 + 0.7 * edgeFade;
          cMesh.visible = true;
        }
      } else {
        waypointGroup.visible = false;
      }

      // Proximity check in 3rd-Person mode
      if (thirdPersonRef.current && curStage !== 'INTRO') {
        let bestId: string | null = null;
        let bestDist = 2.8;
        for (const rig of landmarks.rigs) {
          if (!rig.group.visible) continue;
          const dx = rig.group.position.x - explorer.position.x;
          const dz = rig.group.position.z - explorer.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < bestDist) {
            bestDist = dist;
            bestId = rig.id;
          }
        }
        if (bestId !== nearbyIdRef.current) {
          nearbyIdRef.current = bestId;
          setNearbyLandmarkId(bestId);
        }
      }

      // Apply subtle damped camera breathing / handheld sway symmetrically for this frame
      const wantBreath = !prefersReduced && !isUserDragging && !introSweepActive ? 1 : 0;
      breathGain += (wantBreath - breathGain) * (1 - Math.exp(-dt * 3.5));
      _breathOffset.set(0, 0, 0);
      if (breathGain > 0.002) {
        camera.updateMatrixWorld();
        _camRight.setFromMatrixColumn(camera.matrixWorld, 0);
        _camUp.setFromMatrixColumn(camera.matrixWorld, 1);
        const swayX =
          (Math.sin(tSec * 0.57) * 0.024 + Math.sin(tSec * 1.13) * 0.008) * breathGain;
        const swayY =
          (Math.sin(tSec * 0.83 + 1.1) * 0.02 + Math.cos(tSec * 0.41) * 0.007) * breathGain;
        _breathOffset.addScaledVector(_camRight, swayX).addScaledVector(_camUp, swayY);
        camera.position.add(_breathOffset);
        camera.updateMatrixWorld();
      }

      if (postPipeline) {
        postPipeline.render(tSec, prefersReduced);
      } else {
        renderer.render(scene, camera);
      }

      // Project 3D Landmark anchors to 2D floating badges clamped inside the open center area
      const viewW = renderer.domElement.clientWidth || window.innerWidth;
      const viewH = renderer.domElement.clientHeight || window.innerHeight;
      const minX = viewW >= 768 ? 294 : 72;
      const maxX = viewW >= 768 ? viewW - 85 : viewW - 72;
      const minY = 90;
      const maxY = Math.max(minY + 40, viewH - 180);

      for (const rig of landmarks.rigs) {
        const el = labelElsRef.current[rig.id];
        if (!el) continue;
        if (!rig.group.visible || curStage === 'INTRO' || hideLabelsRef.current) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          continue;
        }
        _proj.copy(rig.anchorLocal);
        rig.group.localToWorld(_proj);
        _proj.project(camera);

        if (_proj.z > 1 || _proj.z < -1) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          continue;
        }
        const rawSx = (_proj.x * 0.5 + 0.5) * viewW;
        const rawSy = (-_proj.y * 0.5 + 0.5) * viewH;
        const sx = Math.max(minX, Math.min(maxX, rawSx));
        const sy = Math.max(minY, Math.min(maxY, rawSy));

        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      }

      // Remove temporary breathing offset cleanly so OrbitControls & pointer picking stay drift-free
      if (_breathOffset.lengthSq() > 0) {
        camera.position.sub(_breathOffset);
        camera.updateMatrixWorld();
      }

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };

    if (isSoftwareGl) {
      afterDraw(animate);
    } else {
      rafId = requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      controls.removeEventListener('start', cancelPresetOnDrag);
      controls.removeEventListener('end', onControlEnd);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      controls.dispose();
      postPipeline?.dispose();
      wpRingGeo.dispose();
      wpRingMat.dispose();
      wpInnerGeo.dispose();
      wpInnerMat.dispose();
      wpBeaconGeo.dispose();
      wpBeaconMat.dispose();
      wpChevronGeo.dispose();
      wpChevronMats.forEach((m) => m.dispose());
      explorerRef.current = null;
      companionRef.current = null;
      landmarksRef.current = null;
      explorer.dispose();
      companion.dispose();
      landmarks.dispose();
      envSystem.dispose();
      textures.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const visibleMetas = useMemo(() => {
    if (stage === 'INTRO') return [];
    const chNum = stage === 'CH1' ? 1 : stage === 'CH2' ? 2 : 3;
    return LANDMARK_METAS.filter((m) => m.chapter <= chNum);
  }, [stage]);

  return (
    <>
      {/* Isolated WebGL Mount */}
      <div
        ref={mountRef}
        aria-label="Interactive 3D coastal observatory and orbital Earth climate simulation"
        className="fixed inset-0 w-full h-full z-0"
      />

      {/* Screen-Projected Floating 3D Landmark Badges */}
      {stage !== 'INTRO' && !hideLabels && (
        <div className="fixed inset-0 z-10 pointer-events-none" aria-label="3D Observatory landmarks">
          {visibleMetas.map((meta) => {
            const isActive = activeConceptId === meta.id;
            const isInspected = inspectedIds.has(meta.id);
            const isSpotlight = spotlightLandmarks.includes(meta.id);
            const label =
              (starKey === 'trappist1' || stage === 'CH3') && meta.trappistLabel
                ? meta.trappistLabel
                : meta.label;

            return (
              <button
                key={meta.id}
                ref={(el) => {
                  labelElsRef.current[meta.id] = el;
                }}
                type="button"
                onClick={() => onSelectLandmark(meta.id)}
                aria-label={`Inspect ${label}${isInspected ? ' (discovered)' : ''}`}
                style={{ opacity: 0, left: 0, top: 0 }}
                className="group absolute flex flex-col items-center focus:outline-none transition-opacity duration-150"
              >
                {isSpotlight && !isActive && (
                  <span className="mb-1 px-2.5 py-0.5 rounded-full bg-amber-300 text-[#06090f] text-[10px] font-bold whitespace-nowrap shadow-[0_0_14px_rgba(252,211,77,0.75)] animate-bounce pointer-events-none">
                    Tap me! ↓
                  </span>
                )}

                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-tight whitespace-nowrap transition-transform duration-150 group-hover:scale-105 ${
                    isActive
                      ? 'bg-sky-500/85 border-sky-200 text-white shadow-[0_0_18px_rgba(56,189,248,0.6)]'
                      : isSpotlight
                        ? 'obsidian-hud-strong border-amber-300 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.55)]'
                        : isInspected
                          ? 'obsidian-hud border-emerald-400/55 text-emerald-100 opacity-85 group-hover:opacity-100'
                          : 'obsidian-hud border-white/25 text-slate-100 opacity-80 group-hover:opacity-100'
                  }`}
                >
                  <span>{label}</span>
                  {isInspected ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-400 text-[#06090f] flex items-center justify-center">
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <polyline points="2.5,6.5 5,9 9.5,3.5" />
                      </svg>
                    </span>
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                        isSpotlight
                          ? 'bg-amber-300 text-[#06090f]'
                          : 'bg-slate-200/85 text-[#06090f]'
                      }`}
                    >
                      i
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* CENTERED PROXIMITY INSPECT PROMPT IN 3RD-PERSON MODE */}
      {stage !== 'INTRO' && thirdPersonMode && nearbyLandmarkId && !hideLabels && (
        <div className="fixed z-20 left-1/2 -translate-x-1/2 bottom-44 md:bottom-42 pointer-events-none">
          <button
            type="button"
            onClick={() => onSelectLandmark(nearbyLandmarkId)}
            className="pointer-events-auto px-4 py-2 rounded-full bg-amber-300 text-[#06090f] text-xs font-bold shadow-[0_0_24px_rgba(252,211,77,0.7)] hover:brightness-105 transition-all flex items-center gap-1.5 animate-[bannerIn_0.2s_ease-out_forwards]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              [E] Inspect{' '}
              {LANDMARK_METAS.find((m) => m.id === nearbyLandmarkId)?.label ?? nearbyLandmarkId}
            </span>
          </button>
        </div>
      )}

      {/* 3RD-PERSON EXPLORER WALKING CONTROLS (FULL TOUCH PAD ON MOBILE, COMPACT HINT ON DESKTOP) */}
      {stage !== 'INTRO' && thirdPersonMode && !hideLabels && (
        <div className="fixed z-20 right-3 bottom-44 md:bottom-3 flex flex-col items-end gap-1.5 pointer-events-none">
          {/* Desktop compact keyboard badge + optional toggle for mouse-only walking */}
          <button
            type="button"
            onClick={() => setShowDesktopDpad((v) => !v)}
            className="hidden md:flex pointer-events-auto obsidian-hud px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-200 hover:text-white hover:border-white/35 items-center gap-2 transition-colors shadow-lg"
            title="Toggle on-screen touch directional pad"
          >
            <span className="text-amber-300 font-semibold">WASD</span>
            <span className="text-slate-400">Walk</span>
            <span className="text-white/25">·</span>
            <span className="text-sky-300 font-semibold">[E]</span>
            <span className="text-slate-400">Scan</span>
            <span className="text-[10px] text-slate-400 ml-0.5">
              {showDesktopDpad ? '▼' : '▲ Pad'}
            </span>
          </button>

          <div
            className={`pointer-events-auto obsidian-hud-strong rounded-2xl p-2 flex-col items-center gap-1 shadow-2xl ${
              showDesktopDpad ? 'flex' : 'flex md:hidden'
            }`}
          >
            <div className="text-[9.5px] font-mono text-sky-200 px-1">Hold to Walk</div>
            <button
              type="button"
              aria-label="Walk forward"
              onPointerDown={() => {
                dpadRef.current.z = 1;
              }}
              onPointerUp={() => {
                dpadRef.current.z = 0;
              }}
              onPointerLeave={() => {
                dpadRef.current.z = 0;
              }}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-sky-400/25 active:bg-sky-400/40 border border-white/15 flex items-center justify-center text-white"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Walk left"
                onPointerDown={() => {
                  dpadRef.current.x = -1;
                }}
                onPointerUp={() => {
                  dpadRef.current.x = 0;
                }}
                onPointerLeave={() => {
                  dpadRef.current.x = 0;
                }}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-sky-400/25 active:bg-sky-400/40 border border-white/15 flex items-center justify-center text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Walk backward"
                onPointerDown={() => {
                  dpadRef.current.z = -1;
                }}
                onPointerUp={() => {
                  dpadRef.current.z = 0;
                }}
                onPointerLeave={() => {
                  dpadRef.current.z = 0;
                }}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-sky-400/25 active:bg-sky-400/40 border border-white/15 flex items-center justify-center text-white"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Walk right"
                onPointerDown={() => {
                  dpadRef.current.x = 1;
                }}
                onPointerUp={() => {
                  dpadRef.current.x = 0;
                }}
                onPointerLeave={() => {
                  dpadRef.current.x = 0;
                }}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-sky-400/25 active:bg-sky-400/40 border border-white/15 flex items-center justify-center text-white"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
