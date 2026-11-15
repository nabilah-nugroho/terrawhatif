// Generated with AI assistance (Claude). Pure, deterministic, no DOM/UI code.
// Method: Planck spectrum -> Rayleigh (lambda^-4) weighting -> CIE 1931 (Wyman et al. 2013
// multi-lobe fit) -> linear sRGB -> max-channel normalisation -> gamma 2.2 encode.

const H = 6.62607015e-34; // Planck constant, J s
const C = 299792458; // speed of light, m/s
const K_B = 1.380649e-23; // Boltzmann constant, J/K

/** 15 sample wavelengths (nm), evenly spaced from 380 to 720 nm inclusive. */
export const WAVELENGTHS_NM = Array.from({ length: 15 }, (_, i) => 380 + (i * 340) / 14);

/**
 * Planck spectral radiance B(lambda, T).
 * @param {number} lambda_nm wavelength in nm
 * @param {number} T_K temperature in K
 * @returns {number} W sr^-1 m^-3
 */
export function planckRadiance(lambda_nm, T_K) {
  const lam = lambda_nm * 1e-9;
  const x = (H * C) / (lam * K_B * T_K);
  return (2 * H * C * C) / (Math.pow(lam, 5) * Math.expm1(x));
}

function lobe(l, mu, s1, s2) {
  const t = (l - mu) / (l < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
}

/**
 * CIE 1931 2-degree colour matching functions, analytic multi-lobe fit
 * (Wyman, Sloan & Shirley 2013).
 * @param {number} nm wavelength in nm
 * @returns {{x:number,y:number,z:number}}
 */
export function cieMatch(nm) {
  return {
    x:
      1.056 * lobe(nm, 599.8, 37.9, 31.0) +
      0.362 * lobe(nm, 442.0, 16.0, 26.7) -
      0.065 * lobe(nm, 501.1, 20.4, 26.2),
    y: 0.821 * lobe(nm, 568.8, 46.9, 40.5) + 0.286 * lobe(nm, 530.9, 16.3, 31.1),
    z: 1.217 * lobe(nm, 437.0, 11.8, 36.0) + 0.681 * lobe(nm, 459.0, 26.0, 13.8),
  };
}

/**
 * Convert a sampled spectrum (on WAVELENGTHS_NM) to a CSS hex colour.
 * Brightness is normalised so the largest linear channel is 1, then gamma-encoded.
 * @param {number[]} spectrum 15 non-negative values
 * @returns {string} "#rrggbb"
 */
export function spectrumToHex(spectrum) {
  let X = 0, Y = 0, Z = 0;
  WAVELENGTHS_NM.forEach((nm, i) => {
    const m = cieMatch(nm);
    X += spectrum[i] * m.x;
    Y += spectrum[i] * m.y;
    Z += spectrum[i] * m.z;
  });
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let b = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  r = Math.max(r, 0); g = Math.max(g, 0); b = Math.max(b, 0);
  const peak = Math.max(r, g, b) || 1;
  const enc = (v) => Math.round(255 * Math.min(1, Math.pow(v / peak, 1 / 2.2)));
  return '#' + [r, g, b].map((v) => enc(v).toString(16).padStart(2, '0')).join('');
}

/** Rayleigh optical depth at 550 nm along the horizon path (first-order, Earth-like air mass ~12). */
const TAU_HORIZON_550 = 1.2;

/**
 * Sky colours seen from a planet with an Earth-like (Rayleigh) atmosphere.
 * - zenith:  B(lambda) * lambda^-4 (Rayleigh-scattered starlight)
 * - horizon: direct starlight attenuated by Rayleigh extinction along a long path (warm tint)
 * - sun:     unscattered stellar disk, B(lambda)
 * @param {number} T_star effective temperature, K
 * @returns {{zenith:string, horizon:string, sun:string}}
 */
export function computeSkyColors(T_star) {
  const B = WAVELENGTHS_NM.map((nm) => planckRadiance(nm, T_star));
  const zenith = B.map((b, i) => b * Math.pow(WAVELENGTHS_NM[i], -4));
  const horizon = B.map((b, i) => b * Math.exp(-TAU_HORIZON_550 * Math.pow(550 / WAVELENGTHS_NM[i], 4)));
  return { zenith: spectrumToHex(zenith), horizon: spectrumToHex(horizon), sun: spectrumToHex(B) };
}
