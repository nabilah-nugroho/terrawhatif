import { STARS, luminositySun } from '../engine/physics.js';

export type StageId = 'INTRO' | 'CH1' | 'CH2' | 'CH3' | 'EPILOG';
export type StarKey = 'sun' | 'trappist1';

export interface SimParams {
  starKey: StarKey;
  a_AU: number;
  co2_ppm: number;
  ch4_ppb: number;
  noGreenhouse: boolean;
}

export interface TauBreakdown {
  base: number;
  co2: number;
  ch4: number;
  h2o: number;
  total: number;
}

export interface HzBounds {
  inner: number;
  outer: number;
  S_eff_in: number;
  S_eff_out: number;
  teffClamped: boolean;
}

export interface SkyColors {
  zenith: string;
  horizon: string;
  sun: string;
}

export interface SimResult {
  flux: number;
  F_abs: number;
  T_eq: number;
  T_surface: number;
  albedo: number;
  tau: number;
  tauBreakdown: TauBreakdown;
  waterPhase: 'vapor' | 'frozen' | 'mostlyFrozen' | 'liquid' | 'boiling';
  habitable: boolean;
  inHZ: boolean;
  hzBounds: HzBounds;
  tidalLocked: boolean;
  runaway: boolean;
  angularSizeRatio: number;
  skyColors: SkyColors;
  warnings: string[];
}

export interface ConceptState extends SimResult {
  star: 'Sun' | 'TRAPPIST-1';
  distanceAU: number;
  CO2ppm: number;
  referenceCO2ppm: number;
  stellarFlux: number;
  stellarLuminosity: number;
  stellarRadiusSolar: number;
  stellarTemperatureK: number;
  wavelengthNm: number;
}

export const EARTH_BASELINE: SimParams = {
  starKey: 'sun',
  a_AU: 1.0,
  co2_ppm: 280,
  ch4_ppb: 700,
  noGreenhouse: false,
};

export function buildConceptState(params: SimParams, simResult: SimResult): ConceptState {
  const starObj = STARS[params.starKey];
  return {
    ...simResult,
    star: params.starKey === 'trappist1' ? 'TRAPPIST-1' : 'Sun',
    distanceAU: params.a_AU,
    CO2ppm: params.co2_ppm,
    referenceCO2ppm: 280,
    stellarFlux: simResult.flux,
    stellarLuminosity: luminositySun(starObj.radius_sun, starObj.T_eff),
    stellarRadiusSolar: starObj.radius_sun,
    stellarTemperatureK: starObj.T_eff,
    wavelengthNm: 450,
  };
}

export function formatTemp(kelvin: number, digits = 1): string {
  const c = kelvin - 273.15;
  const sign = c >= 0 ? '+' : '';
  return `${kelvin.toFixed(digits)} K (${sign}${c.toFixed(digits)} °C)`;
}
