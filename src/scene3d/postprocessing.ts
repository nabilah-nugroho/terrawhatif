import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export interface PostProcessingPipeline {
  render: (tSec: number, prefersReduced: boolean) => void;
  setSize: (width: number, height: number, pixelRatio: number) => void;
  dispose: () => void;
}

const CinematicGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uGrainIntensity: { value: 0.024 },
    uVignetteStrength: { value: 0.34 },
    uTiltShiftAmount: { value: 0.0024 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uGrainIntensity;
    uniform float uVignetteStrength;
    uniform float uTiltShiftAmount;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      // 1. Subtle Vertical Tilt-Shift / Depth-of-Field Edge Blur (top & bottom bands)
      float edgeDist = abs(vUv.y - 0.5);
      float blurMask = smoothstep(0.24, 0.50, edgeDist);
      vec3 base = texture2D(tDiffuse, vUv).rgb;

      if (blurMask > 0.001 && uTiltShiftAmount > 0.0) {
        float aspect = max(0.5, uResolution.x / max(1.0, uResolution.y));
        vec2 off = vec2(uTiltShiftAmount / aspect, uTiltShiftAmount) * blurMask;
        vec3 blurred = base * 0.28;
        blurred += texture2D(tDiffuse, clamp(vUv + vec2( off.x,  off.y), 0.001, 0.999)).rgb * 0.18;
        blurred += texture2D(tDiffuse, clamp(vUv + vec2(-off.x,  off.y), 0.001, 0.999)).rgb * 0.18;
        blurred += texture2D(tDiffuse, clamp(vUv + vec2( off.x, -off.y), 0.001, 0.999)).rgb * 0.18;
        blurred += texture2D(tDiffuse, clamp(vUv + vec2(-off.x, -off.y), 0.001, 0.999)).rgb * 0.18;
        base = mix(base, blurred, blurMask * 0.85);
      }

      // 2. Cinematic Color Grading: deep teal/slate shadows & gentle warm highlights
      float luma = dot(base, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.89, 0.95, 1.03);
      vec3 highlightTint = vec3(0.99, 0.96, 0.91);
      vec3 tint = mix(shadowTint, highlightTint, smoothstep(0.18, 0.82, luma));
      vec3 graded = base * tint;

      // Subtle S-curve contrast without pushing highlights toward white
      vec3 scurve = graded * graded * (3.0 - 2.0 * graded);
      graded = mix(graded, scurve, 0.10);

      // 3. Soft Edge Vignette
      vec2 centered = (vUv - 0.5) * vec2(1.12, 1.0);
      float rad = length(centered);
      float vig = smoothstep(0.98, 0.34, rad);
      graded *= mix(1.0 - uVignetteStrength, 1.0, vig);

      // 4. Analog 35mm Film Grain (midtone-weighted)
      float grainEnv = 1.0 - abs(luma - 0.48) * 1.25;
      float n = hash12(vUv * uResolution + fract(uTime * 17.37) * 512.0) - 0.5;
      graded += n * uGrainIntensity * clamp(grainEnv, 0.25, 1.0);

      gl_FragColor = vec4(clamp(graded, 0.0, 1.0), 1.0);
    }
  `,
};

export function createPostProcessingPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
  pixelRatio: number
): PostProcessingPipeline {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const samples = renderer.capabilities.isWebGL2
    ? Math.min(4, renderer.capabilities.maxSamples || 0)
    : 0;

  const hdrTarget = new THREE.WebGLRenderTarget(
    Math.max(1, Math.floor(safeW * pixelRatio)),
    Math.max(1, Math.floor(safeH * pixelRatio)),
    {
      type: THREE.HalfFloatType,
      samples,
    }
  );

  const composer = new EffectComposer(renderer, hdrTarget);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(safeW, safeH);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Soft half-res HDR bloom targeting only true HDR emitters (star disk & bright beacons)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, Math.floor(safeW / 2)), Math.max(1, Math.floor(safeH / 2))),
    0.22,
    0.45,
    1.05
  );
  composer.addPass(bloomPass);

  // Tone-mapping (ACESFilmicToneMapping) + linear-to-sRGB output conversion
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // Lightweight filmic grain, vignette, split-tone grading & vertical tilt-shift edge softness
  const gradePass = new ShaderPass(CinematicGradeShader);
  gradePass.uniforms.uResolution.value.set(safeW * pixelRatio, safeH * pixelRatio);
  composer.addPass(gradePass);

  return {
    render: (tSec: number, prefersReduced: boolean) => {
      gradePass.uniforms.uTime.value = prefersReduced ? 0 : tSec;
      gradePass.uniforms.uTiltShiftAmount.value = prefersReduced ? 0.001 : 0.0024;
      gradePass.uniforms.uGrainIntensity.value = prefersReduced ? 0.012 : 0.024;
      composer.render();
    },
    setSize: (w: number, h: number, pr: number) => {
      const rw = Math.max(1, w);
      const rh = Math.max(1, h);
      composer.setPixelRatio(pr);
      composer.setSize(rw, rh);
      bloomPass.resolution.set(Math.max(1, Math.floor(rw / 2)), Math.max(1, Math.floor(rh / 2)));
      gradePass.uniforms.uResolution.value.set(rw * pr, rh * pr);
    },
    dispose: () => {
      bloomPass.dispose();
      outputPass.dispose();
      gradePass.dispose();
      composer.dispose();
      hdrTarget.dispose();
    },
  };
}
