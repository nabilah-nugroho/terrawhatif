// Generated with AI assistance (Claude). Calibrated to Earth reference values (NASA CERES: A = 0.30,
// T_s = 288 K, S0 = 1361 W/m^2). Stellar parameters in STARS should be checked against the NASA Exoplanet Archive.
// Pure, deterministic first-order model. No DOM/UI code.

import { computeSkyColors } from './sky.js';

// ---------------------------------------------------------------- constants
export const SIGMA = 5.670374e-8; // W m^-2 K^-4
export const AU_M = 1.495978707e11; // m
export const R_SUN = 6.957e8; // m
export const T_SUN = 5772; // K
export const L_SUN = 3.828e26; // W
export const S_0 = 1361; // W m^-2

/** Runaway-greenhouse absorbed-flux threshold (Simpson-Nakajima limit), W/m^2. */
export const RUNAWAY_THRESHOLD = 280;

/**
 * Built-in stars. `radius_sun` in solar radii, `T_eff` in K.
 * NOTE: replace/extend with your verified NASA Exoplanet Archive values.
 */
export const STARS = {
  sun: { name: 'Sun', radius_sun: 1.0, T_eff: 5772 },
  trappist1: { name: 'TRAPPIST-1', radius_sun: 0.1192, T_eff: 2566 },
};

// ------------------------------------------------- stellar flux / geometry
/** Bolometric flux at the planet, W/m^2. */
export function stellarFlux(T_star, R_star_sun, a_AU) {
  return SIGMA * Math.pow(T_star, 4) * Math.pow((R_star_sun * R_SUN) / (a_AU * AU_M), 2);
}

/** Full angular diameter of the star, radians. */
export function angularDiameterRad(R_star_sun, a_AU) {
  return (2 * (R_star_sun * R_SUN)) / (a_AU * AU_M);
}

/** Angular diameter relative to the Sun seen from 1 AU. */
export function angularSizeRatio(R_star_sun, a_AU) {
  return angularDiameterRad(R_star_sun, a_AU) / angularDiameterRad(1, 1);
}

/** Orbital distance (AU) at which a star delivers a given flux. */
export function distanceForFlux(T_star, R_star_sun, flux) {
  return (R_star_sun * R_SUN * Math.sqrt((SIGMA * Math.pow(T_star, 4)) / flux)) / AU_M;
}

/** Planetary equilibrium temperature, K. */
export function equilibriumTemperature(T_star, R_star_sun, a_AU, albedo) {
  return (
    T_star * Math.sqrt((R_star_sun * R_SUN) / (2 * a_AU * AU_M)) * Math.pow(1 - albedo, 0.25)
  );
}

// ------------------------------------------------------------ ice-albedo
export const A_ICE = 0.62;
const ICE_T0 = 273; // K
const ICE_WIDTH = 10; // K
const iceFraction = (T) => 0.5 * (1 - Math.tanh((T - ICE_T0) / ICE_WIDTH));

/** Warm-surface albedo, calibrated so that A(288 K) === 0.30 (NASA CERES). */
export const A_WARM = (0.3 - A_ICE * iceFraction(288)) / (1 - iceFraction(288));

/** Temperature-dependent planetary albedo. */
export function albedoOfTemperature(T_s) {
  return A_WARM + (A_ICE - A_WARM) * iceFraction(T_s);
}

// ------------------------------------------------------ greenhouse optics
// Earth reference calibration: T_s = 288 K at A = 0.30, 280 ppm CO2, 700 ppb CH4.
const T_EQ_REF = equilibriumTemperature(T_SUN, 1, 1, 0.3);
/** Total reference optical depth (~0.84-0.85; 0.836 if T_eq is rounded to 255 K). */
export const TAU_REF = (Math.pow(288 / T_EQ_REF, 4) - 1) / 0.75;
/**
 * Reference water-vapour optical depth at T_s = 288 K.
 * Kept small on purpose: with the specified ice-albedo law, ice-albedo feedback alone already gives
 * +3.8 K for doubled CO2, so a larger value would push the response above the 2-4 K target.
 */
export const TAU_H2O_0 = 0.01;
/** Remaining baseline (clouds, other absorbers, background CO2/CH4). */
export const TAU_BASE = TAU_REF - TAU_H2O_0;

/**
 * Optical-depth components for given composition and surface temperature.
 * @returns {{base:number,co2:number,ch4:number,h2o:number,total:number}}
 */
export function opticalDepth(co2_ppm, ch4_ppb, T_s) {
  const co2 = 0.13 * Math.log(Math.max(co2_ppm, 1) / 280);
  const ch4 = 0.015 * (Math.sqrt(Math.max(ch4_ppb, 0)) - Math.sqrt(700));
  const h2o = TAU_H2O_0 * Math.exp(0.07 * Math.min(Math.max(T_s - 288, -40), 45));
  const total = Math.max(TAU_BASE + co2 + ch4 + h2o, 0);
  return { base: TAU_BASE, co2, ch4, h2o, total };
}

/**
 * Solve the coupled (T_s, albedo, tau) system by damped fixed-point iteration
 * (50 iterations, damping 0.5, start T_s = T_eq at A = 0.30).
 */
export function solveClimate({ T_star, R_star_sun, a_AU, co2_ppm, ch4_ppb, noGreenhouse = false }) {
  // Start at A = 0.30 with the greenhouse applied once (T_s0 = T_eq * (1 + 0.75 tau)^0.25).
  // With noGreenhouse, tau = 0 so this is exactly T_s = T_eq at A = 0.30.
  // NOTE: the tanh ice-albedo law is bistable (warm branch vs. snowball). Starting from the
  // bare T_eq (254.6 K for Earth) falls into the snowball basin, so the warm start selects the
  // warm branch for ordinary greenhouse runs. The model has hysteresis; this is physical.
  const Teq0 = equilibriumTemperature(T_star, R_star_sun, a_AU, 0.3);
  const tau0 = noGreenhouse ? 0 : opticalDepth(co2_ppm, ch4_ppb, Teq0).total;
  let Ts = Teq0 * Math.pow(1 + 0.75 * tau0, 0.25);
  let last = Ts;
  for (let i = 0; i < 50; i++) {
    const A = albedoOfTemperature(Ts);
    const Teq = equilibriumTemperature(T_star, R_star_sun, a_AU, A);
    const tau = noGreenhouse ? 0 : opticalDepth(co2_ppm, ch4_ppb, Ts).total;
    const next = Teq * Math.pow(1 + 0.75 * tau, 0.25);
    last = Ts;
    Ts = Ts + 0.5 * (next - Ts);
  }
  const albedo = albedoOfTemperature(Ts);
  const T_eq = equilibriumTemperature(T_star, R_star_sun, a_AU, albedo);
  const tauBreakdown = noGreenhouse
    ? { base: 0, co2: 0, ch4: 0, h2o: 0, total: 0 }
    : opticalDepth(co2_ppm, ch4_ppb, Ts);
  return {
    T_surface: noGreenhouse ? T_eq : Ts,
    T_eq,
    albedo,
    tau: tauBreakdown.total,
    tauBreakdown,
    converged: Math.abs(Ts - last) < 1e-3,
  };
}

// --------------------------------------------------------- phase / runaway
/** Absorbed stellar flux per unit planetary surface area, W/m^2. */
export const absorbedFlux = (flux, albedo) => (flux * (1 - albedo)) / 4;

/** Water phase at 1 atm reference. */
export function waterPhase(T_s, runaway = false) {
  if (runaway || T_s > 400) return 'vapor';
  if (T_s < 250) return 'frozen';
  if (T_s < 273) return 'mostlyFrozen';
  if (T_s < 373) return 'liquid';
  return 'boiling';
}

// ------------------------------------------------ habitable zone (Kopparapu)
// Kopparapu et al. (2013): S_eff = S0 + aT + bT^2 + cT^3 + dT^4, T = T_eff - 5780 K.
const KOP_RUNAWAY = [1.0512, 1.3242e-4, 1.5418e-8, -7.9895e-12, -1.8328e-15]; // conservative inner
const KOP_MAX_GH = [0.3438, 5.8942e-5, 1.6558e-9, -3.0045e-12, -5.2983e-16]; // conservative outer
const kopS = (c, t) => c[0] + c[1] * t + c[2] * t * t + c[3] * t ** 3 + c[4] * t ** 4;

/** Stellar luminosity in solar units. */
export const luminositySun = (R_star_sun, T_star) =>
  Math.pow(R_star_sun, 2) * Math.pow(T_star / 5772, 4);

/**
 * Conservative habitable-zone bounds (AU). Fit is valid for 2600-7200 K;
 * T_eff is clamped to that range (`teffClamped` reports this).
 */
export function habitableZone(R_star_sun, T_star) {
  const Tc = Math.min(Math.max(T_star, 2600), 7200);
  const t = Tc - 5780;
  const L = luminositySun(R_star_sun, T_star);
  const S_in = kopS(KOP_RUNAWAY, t);
  const S_out = kopS(KOP_MAX_GH, t);
  return {
    inner: Math.sqrt(L / S_in),
    outer: Math.sqrt(L / S_out),
    S_eff_in: S_in,
    S_eff_out: S_out,
    teffClamped: Tc !== T_star,
  };
}

/** First-order heuristic: tidally locked inside 0.2 AU. */
export const isTidallyLocked = (a_AU) => a_AU < 0.2;

// ------------------------------------------------------------- top level
/**
 * Run the full simulation.
 * @param {{star:{radius_sun:number,T_eff:number}, a_AU:number, co2_ppm?:number,
 *          ch4_ppb?:number, noGreenhouse?:boolean}} p
 */
export function simulate({ star, a_AU, co2_ppm = 280, ch4_ppb = 700, noGreenhouse = false }) {
  const R = star.radius_sun;
  const T = star.T_eff;
  const flux = stellarFlux(T, R, a_AU);
  const s = solveClimate({ T_star: T, R_star_sun: R, a_AU, co2_ppm, ch4_ppb, noGreenhouse });
  const F_abs = absorbedFlux(flux, s.albedo);
  const runaway = F_abs > RUNAWAY_THRESHOLD;
  const phase = waterPhase(s.T_surface, runaway);
  const hz = habitableZone(R, T);
  const warnings = [];
  if (runaway) {
    warnings.push(
      'Runaway greenhouse (F_abs > 280 W/m^2): Venus-like; the first-order radiative model breaks down.'
    );
  }
  if (!s.converged) warnings.push('Fixed-point iteration did not fully converge.');
  if (hz.teffClamped) warnings.push('Kopparapu fit evaluated at clamped T_eff (valid 2600-7200 K).');
  if (isTidallyLocked(a_AU)) warnings.push('Tidal locking is a first-order heuristic (a < 0.2 AU).');
  return {
    flux,
    F_abs,
    T_eq: s.T_eq,
    T_surface: s.T_surface,
    albedo: s.albedo,
    tau: s.tau,
    tauBreakdown: s.tauBreakdown,
    waterPhase: phase,
    habitable: phase === 'liquid' && !runaway,
    inHZ: a_AU >= hz.inner && a_AU <= hz.outer,
    hzBounds: hz,
    tidalLocked: isTidallyLocked(a_AU),
    runaway,
    angularSizeRatio: angularSizeRatio(R, a_AU),
    skyColors: computeSkyColors(T),
    warnings,
  };
}
