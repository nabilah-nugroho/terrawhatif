// Generated with AI assistance (Claude). Run with: node src/physics.test.js
import assert from 'node:assert/strict';
import {
  STARS, S_0, TAU_H2O_0, simulate, stellarFlux, distanceForFlux, albedoOfTemperature, A_WARM,
} from './physics.js';
import { computeSkyColors, WAVELENGTHS_NM } from './sky.js';

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: got ${actual}, expected ${expected} ± ${tol}`);

/** hex -> {r,g,b,h} with hue in degrees */
function parse(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/, 'valid hex colour');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { r, g, b, h: (h * 60 + 360) % 360 };
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const { sun, trappist1 } = STARS;

test('calibration: A(288 K) === 0.30 and 15 sky wavelengths', () => {
  near(albedoOfTemperature(288), 0.3, 1e-12, 'A(288)');
  assert.ok(A_WARM > 0.27 && A_WARM < 0.30);
  assert.equal(WAVELENGTHS_NM.length, 15);
  assert.equal(WAVELENGTHS_NM[0], 380);
  near(WAVELENGTHS_NM[14], 720, 1e-9, 'last wavelength');
});

test('1. Earth reference', () => {
  const r = simulate({ star: sun, a_AU: 1, co2_ppm: 280, ch4_ppb: 700 });
  near(r.T_eq, 255, 1, 'T_eq');
  near(r.T_surface, 288, 1, 'T_surface');
  near(r.albedo, 0.3, 0.01, 'albedo');
  near(r.tau, 0.836, 0.02, 'tau');
  assert.equal(r.waterPhase, 'liquid');
  assert.equal(r.runaway, false);
  assert.equal(r.inHZ, true);
  assert.equal(r.habitable, true);
  assert.equal(r.tidalLocked, false);
  near(r.angularSizeRatio, 1, 1e-12, 'angular size ratio');
  assert.deepEqual(simulate({ star: sun, a_AU: 1 }), r, 'deterministic');
});

test('2. Solar flux at 1 AU = 1361 W/m^2 ± 1%', () => {
  near(stellarFlux(sun.T_eff, sun.radius_sun, 1), S_0, S_0 * 0.01, 'flux');
});

test('3. Doubled CO2 (560 ppm) warms 2-4 K', () => {
  const base = simulate({ star: sun, a_AU: 1 });
  const dbl = simulate({ star: sun, a_AU: 1, co2_ppm: 560 });
  const dT = dbl.T_surface - base.T_surface;
  assert.ok(dT >= 2 && dT <= 4, `dT = ${dT}`);
  assert.ok(dbl.albedo < base.albedo + 1e-9, 'ice-albedo feedback never raises albedo when warming');
});

test('4. 0.85 AU: flux ~1884 W/m^2 and strong water-vapour amplification', () => {
  const r = simulate({ star: sun, a_AU: 0.85 });
  near(r.flux, 1884, 1884 * 0.01, 'flux');
  assert.ok(r.tauBreakdown.h2o > 5 * TAU_H2O_0, `h2o tau ${r.tauBreakdown.h2o}`);
  assert.ok(r.T_surface > 288 + 20, `T_surface ${r.T_surface}`);
  assert.ok(r.F_abs > 280 && r.runaway, 'F_abs exceeds the runaway threshold at 0.85 AU');
  assert.equal(r.waterPhase, 'vapor');
  assert.ok(r.warnings.some((w) => /Venus-like/.test(w)));
});

test('5. TRAPPIST-1 at Earth-equivalent flux', () => {
  const a = distanceForFlux(trappist1.T_eff, trappist1.radius_sun, S_0);
  near(a, 0.024, 0.001, 'a_AU');
  const r = simulate({ star: trappist1, a_AU: a });
  near(r.flux, S_0, 1, 'flux');
  near(r.T_eq, 255, 1.5, 'T_eq');
  assert.equal(r.tidalLocked, true);
  const z = parse(r.skyColors.zenith);
  assert.ok(z.r > z.g && z.g > z.b && z.r - z.b >= 60, 'zenith is warm: R > G > B');
  assert.ok(z.h >= 20 && z.h <= 50, `zenith hue ${z.h} is amber/orange`);
  const h = parse(r.skyColors.horizon);
  assert.ok(h.r > h.g && h.g > h.b && h.h >= 20 && h.h <= 45, 'horizon is deep orange');
  assert.ok(r.angularSizeRatio > 3, 'star looks large in the sky');
});

test('6. Zero greenhouse: T_surface === T_eq and ice expands', () => {
  const r = simulate({ star: sun, a_AU: 1, noGreenhouse: true });
  assert.equal(r.tau, 0);
  assert.equal(r.T_surface, r.T_eq);
  assert.ok(r.albedo > 0.6, `albedo ${r.albedo}`);
  assert.ok(r.T_surface < 250);
  assert.equal(r.waterPhase, 'frozen');
});

test('7. Runaway: F_abs > 280 W/m^2', () => {
  const r = simulate({ star: sun, a_AU: 0.7 });
  assert.ok(r.F_abs > 280);
  assert.equal(r.runaway, true);
  assert.equal(r.waterPhase, 'vapor');
  assert.equal(r.habitable, false);
});

test('sky: Sun zenith is azure blue; colours are valid hex', () => {
  const s = computeSkyColors(5772);
  const z = parse(s.zenith);
  assert.ok(z.b === Math.max(z.r, z.g, z.b) && z.b > z.r + 60, 'blue-dominant');
  assert.ok(z.h >= 200 && z.h <= 240, `zenith hue ${z.h}`);
  const sun_ = parse(s.sun);
  assert.ok(sun_.r > 200 && sun_.g > 200, 'solar disk is near-white');
  parse(s.horizon);
  assert.ok(parse(s.horizon).r > parse(s.horizon).b, 'horizon is warmer than zenith');
});

test('HZ: Sun bounds ~0.95-1.7 AU; tidal-lock heuristic', () => {
  const r = simulate({ star: sun, a_AU: 1 });
  near(r.hzBounds.inner, 0.976, 0.02, 'inner');
  near(r.hzBounds.outer, 1.707, 0.03, 'outer');
  assert.equal(simulate({ star: sun, a_AU: 0.19 }).tidalLocked, true);
  assert.equal(simulate({ star: sun, a_AU: 0.2 }).tidalLocked, false);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e.message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
