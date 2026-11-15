import type { ConceptState } from '../types/observatory';

const SIGMA = 5.670374419e-8;
const S0 = 1361;
const EARTH_ALBEDO = 0.30;
const EARTH_T_EQ = 255;
const CO2_REFERENCE = 280;
const FORCING_COEFFICIENT = 5.35;
const LV = 2.5e6;
const RV = 461.5;
const T0_WATER = 273.15;
const E0_WATER = 611.2;

export interface MathMetric {
  label: string;
  value: string;
  sub?: string;
  accent?: 'sky' | 'amber' | 'emerald' | 'slate';
}

export interface ConceptMathBreakdown {
  equationTitle: string;
  formula: string;
  symbolKey: string;
  metrics: MathMetric[];
  plainMeaning: string;
  modelNote: string;
  nasaDataset: string;
  nasaRole: string;
}

const toC = (k: number) => `${(k - 273.15).toFixed(1)}°C`;

export function getConceptMathBreakdown(
  conceptId: string,
  s: ConceptState
): ConceptMathBreakdown | null {
  const flux = Number.isFinite(s.stellarFlux)
    ? s.stellarFlux
    : S0 / Math.pow(Math.max(0.001, s.distanceAU), 2);
  const alpha = Math.min(1, Math.max(0, s.albedo));

  switch (conceptId) {
    case 'thermometer': {
      const tEqModel = Math.pow((flux * (1 - alpha)) / (4 * SIGMA), 0.25);
      const deltaT = s.T_surface - s.T_eq;
      return {
        equationTitle: 'Energy Balance & Greenhouse Boost',
        formula: 'T_eq = [ S × (1 − α) ÷ 4σ ]^(1/4)',
        symbolKey: 'S = Incoming starlight · α = Reflected fraction · σ = Radiation constant',
        metrics: [
          {
            label: 'Airless Temp (T_eq)',
            value: `${s.T_eq.toFixed(1)} K`,
            sub: `${toC(s.T_eq)} (model: ${tEqModel.toFixed(1)} K)`,
            accent: 'sky',
          },
          {
            label: 'Surface Temp',
            value: `${s.T_surface.toFixed(1)} K`,
            sub: toC(s.T_surface),
            accent: 'amber',
          },
          {
            label: 'Greenhouse Boost (ΔT)',
            value: `${deltaT >= 0 ? '+' : ''}${deltaT.toFixed(1)} K`,
            sub: 'Surface − Airless',
            accent: 'emerald',
          },
          {
            label: 'Incoming Light (S)',
            value: `${flux.toFixed(0)} W/m²`,
            sub: `Reflection α = ${alpha.toFixed(3)}`,
            accent: 'slate',
          },
        ],
        plainMeaning:
          deltaT > 5
            ? `Greenhouse gases lift Earth’s surface by +${deltaT.toFixed(1)}°C above what sunlight alone would give.`
            : 'With almost no greenhouse gases, surface temperature drops right down to the airless balance.',
        modelNote:
          'Uses a single-layer atmosphere benchmark (Earth baseline: 255 K airless, 288 K surface) rather than a full 3D weather grid.',
        nasaDataset: 'NASA CERES EBAF',
        nasaRole:
          'Measures sunlight entering and heat leaving the top of Earth’s atmosphere to calibrate our energy budget.',
      };
    }

    case 'ice': {
      const fAbs = (flux * (1 - alpha)) / 4;
      const fBaseline = (flux * (1 - EARTH_ALBEDO)) / 4;
      const diff = fAbs - fBaseline;
      return {
        equationTitle: 'Absorbed Sunlight (Ice-Albedo)',
        formula: 'F_abs = S × (1 − α) ÷ 4',
        symbolKey: 'S = Starlight at orbit · α = Bond albedo (0 = black, 1 = pure mirror)',
        metrics: [
          {
            label: 'Reflected Share (α)',
            value: `${(alpha * 100).toFixed(1)}%`,
            sub: `α = ${alpha.toFixed(3)} (Earth avg: 30.0%)`,
            accent: 'sky',
          },
          {
            label: 'Absorbed Heat (F_abs)',
            value: `${fAbs.toFixed(1)} W/m²`,
            sub: `At α=0.30: ${fBaseline.toFixed(1)} W/m²`,
            accent: 'amber',
          },
          {
            label: 'Ice vs. Baseline',
            value: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} W/m²`,
            sub: diff > 0 ? 'Darker → absorbs more' : 'Icy → reflects more',
            accent: diff > 0 ? 'amber' : 'emerald',
          },
          {
            label: 'Orbital Light (S)',
            value: `${flux.toFixed(0)} W/m²`,
            sub: 'Divided by 4 across sphere',
            accent: 'slate',
          },
        ],
        plainMeaning:
          alpha > 0.34
            ? 'Expanded bright ice bounces extra sunlight back to space, lowering absorbed heat.'
            : 'Less ice exposes darker ocean, increasing the watts of sunlight soaked up per square meter.',
        modelNote:
          'Represents planet-wide reflectivity as one global average α instead of separate cloud, snow, and ocean maps.',
        nasaDataset: 'NASA CERES EBAF',
        nasaRole:
          'Tracks reflected sunlight vs. absorbed solar energy across Earth’s polar ice caps and oceans.',
      };
    }

    case 'valve': {
      const c = Math.max(1, s.CO2ppm);
      const c0 = Math.max(1, s.referenceCO2ppm || CO2_REFERENCE);
      const deltaF = FORCING_COEFFICIENT * Math.log(c / c0);
      return {
        equationTitle: 'CO₂ Heat-Trapping Forcing',
        formula: 'ΔF = 5.35 × ln( C ÷ C₀ )',
        symbolKey: 'C = Current CO₂ · C₀ = Pre-industrial baseline (280 ppm)',
        metrics: [
          {
            label: 'Current CO₂ (C)',
            value: `${c.toFixed(0)} ppm`,
            sub: `${(c / c0).toFixed(2)}× baseline (${c0} ppm)`,
            accent: 'amber',
          },
          {
            label: 'Extra Trapped Heat (ΔF)',
            value: `${deltaF >= 0 ? '+' : ''}${deltaF.toFixed(2)} W/m²`,
            sub: 'Logarithmic forcing',
            accent: deltaF >= 0 ? 'amber' : 'sky',
          },
          {
            label: 'Surface Temp',
            value: `${toC(s.T_surface)}`,
            sub: `${s.T_surface.toFixed(1)} K`,
            accent: 'emerald',
          },
          {
            label: 'Runaway Status',
            value: s.runaway ? 'Active' : 'Stable',
            sub: s.runaway ? 'Strong steam feedback' : 'Energy balanced',
            accent: s.runaway ? 'amber' : 'slate',
          },
        ],
        plainMeaning:
          'Because the formula uses a logarithm (ln), each doubling of CO₂ adds roughly +3.7 W/m² of heat-trapping push.',
        modelNote:
          'ΔF measures the initial radiative nudge; final temperature depends on water vapor and ice feedbacks.',
        nasaDataset: 'NASA CERES EBAF',
        nasaRole:
          'Monitors outgoing infrared heat from Earth to verify how greenhouse gases alter the planet’s energy balance.',
      };
    }

    case 'lever': {
      const d = Math.max(0.001, s.distanceAU);
      const relSun = s.stellarLuminosity / (d * d);
      const tEqScaled = EARTH_T_EQ / Math.sqrt(d);
      return {
        equationTitle: 'Inverse-Square Sunlight Rule',
        formula: 'S / S₀ = (L / L☉) ÷ d²',
        symbolKey: 'd = Orbit distance in AU · L/L☉ = Star brightness relative to Sun',
        metrics: [
          {
            label: 'Orbit Distance (d)',
            value: `${d.toFixed(s.star === 'TRAPPIST-1' ? 4 : 2)} AU`,
            sub: `1 AU = Earth–Sun distance`,
            accent: 'sky',
          },
          {
            label: 'Relative Sunlight',
            value: `${(relSun * 100).toFixed(0)}%`,
            sub: `${relSun.toFixed(3)}× Earth baseline`,
            accent: 'amber',
          },
          {
            label: 'Flux at Orbit (S)',
            value: `${flux.toFixed(0)} W/m²`,
            sub: 'Earth baseline: 1,361 W/m²',
            accent: 'emerald',
          },
          {
            label: 'Sun-Scale T_eq',
            value: `${s.T_eq.toFixed(1)} K`,
            sub: `Simple 1/√d scale: ${tEqScaled.toFixed(0)} K`,
            accent: 'slate',
          },
        ],
        plainMeaning:
          'Squaring the distance (d²) means stepping just 15% closer (0.85 AU) boosts incoming sunlight by 38%!',
        modelNote:
          'Pure 1/d² scaling assumes fixed reflectivity; actual surface temperature shifts further with ice and water vapor.',
        nasaDataset: 'NASA Exoplanet Archive',
        nasaRole:
          'Supplies measured orbital distances (AU) and stellar luminosities for Earth-sized worlds around other stars.',
      };
    }

    case 'vapor': {
      const t = Math.max(150, s.T_surface);
      const exponent = (LV / RV) * (1 / T0_WATER - 1 / t);
      const eSat = E0_WATER * Math.exp(exponent);
      const pctPerK = (LV / (RV * t * t)) * 100;
      return {
        equationTitle: 'Water-Vapor Capacity (Clausius–Clapeyron)',
        formula: 'eₛ(T) = e₀ × exp[ (Lᵥ / Rᵥ)(1/T₀ − 1/T) ]',
        symbolKey: 'eₛ = Max vapor pressure · T = Air temperature in Kelvin',
        metrics: [
          {
            label: 'Max Vapor Pressure',
            value: eSat >= 10000 ? `${(eSat / 1000).toFixed(1)} kPa` : `${eSat.toFixed(0)} Pa`,
            sub: `At ${toC(t)} (${t.toFixed(1)} K)`,
            accent: 'sky',
          },
          {
            label: 'Moisture Jump / °C',
            value: `+${pctPerK.toFixed(1)}% / K`,
            sub: 'About +6–7% near 15°C',
            accent: 'amber',
          },
          {
            label: 'Ocean State',
            value: s.waterPhase,
            sub: s.runaway ? 'Steam runaway risk' : 'Controlled cycle',
            accent: s.runaway ? 'amber' : 'emerald',
          },
          {
            label: 'Baseline e₀ (0°C)',
            value: '611.2 Pa',
            sub: 'Reference at 273.15 K',
            accent: 'slate',
          },
        ],
        plainMeaning:
          `At this temperature, air can hold ~${pctPerK.toFixed(1)}% more heat-trapping water vapor for every +1°C of warming.`,
        modelNote:
          'Calculates maximum saturation vapor capacity; real humidity also depends on winds, clouds, and rainfall.',
        nasaDataset: 'NASA Giovanni (AIRS) & CERES',
        nasaRole:
          'NASA AIRS satellites track atmospheric water vapor globally, confirming the ~6–7%/K moisture rise.',
      };
    }

    case 'starmap': {
      const lum = s.stellarLuminosity;
      const d = Math.max(0.001, s.distanceAU);
      const fluxRatio = lum / (d * d);
      const earthFluxDist = Math.sqrt(lum);
      return {
        equationTitle: 'Star Brightness & Habitable Distance',
        formula: 'L / L☉ = (R / R☉)² × (T_eff / 5772)⁴',
        symbolKey: 'R = Star radius · T_eff = Star surface temp · d_⊕ = √(L/L☉)',
        metrics: [
          {
            label: 'Star Luminosity',
            value: lum < 0.01 ? `${lum.toFixed(6)} L☉` : `${lum.toFixed(2)} L☉`,
            sub: `${s.star} (${s.stellarTemperatureK.toFixed(0)} K)`,
            accent: 'amber',
          },
          {
            label: 'Earth-Flux Orbit',
            value: `${earthFluxDist.toFixed(4)} AU`,
            sub: 'Where sunlight = 100% Earth',
            accent: 'emerald',
          },
          {
            label: 'Current Flux Ratio',
            value: `${(fluxRatio * 100).toFixed(0)}%`,
            sub: `At d = ${d.toFixed(4)} AU`,
            accent: 'sky',
          },
          {
            label: 'Star Radius',
            value: `${s.stellarRadiusSolar.toFixed(3)} R☉`,
            sub: `${s.angularSizeRatio.toFixed(1)}× Sun sky width`,
            accent: 'slate',
          },
        ],
        plainMeaning:
          s.star === 'TRAPPIST-1'
            ? `TRAPPIST-1 emits only 0.055% as much light as our Sun, pulling its cozy orbit all the way in to ~${earthFluxDist.toFixed(3)} AU.`
            : 'Our Sun sets the 1.00 AU benchmark where Earth receives 100% baseline sunlight.',
        modelNote:
          'Habitable-zone boundaries depend on atmosphere thickness and clouds too—not orbit distance alone.',
        nasaDataset: 'NASA Exoplanet Archive',
        nasaRole:
          'Provides verified stellar radius, temperature (2,566 K), and planet orbits for the TRAPPIST-1 system.',
      };
    }

    case 'sky': {
      const wavelength = Math.max(100, s.wavelengthNm || 450);
      const scatterRatio = Math.pow(450 / wavelength, 4);
      const x = 1.438776877e-2 / (wavelength * 1e-9 * s.stellarTemperatureK);
      return {
        equationTitle: 'Rayleigh Sky Color Scattering',
        formula: 'Scattering Intensity ∝ λ⁻⁴',
        symbolKey: 'λ = Light wavelength in nm (blue ≈ 450 nm, red ≈ 650 nm)',
        metrics: [
          {
            label: 'Star Peak / Sample λ',
            value: `${wavelength.toFixed(0)} nm`,
            sub: s.star === 'TRAPPIST-1' ? 'Red/IR-heavy starlight' : 'Blue-rich sunlight',
            accent: 'amber',
          },
          {
            label: 'Scatter vs. 450 nm',
            value: `${scatterRatio.toFixed(2)}×`,
            sub: '(450 / λ)⁴ strength',
            accent: 'sky',
          },
          {
            label: 'Star Surface Temp',
            value: `${s.stellarTemperatureK.toFixed(0)} K`,
            sub: s.star,
            accent: 'emerald',
          },
          {
            label: 'Planck Exponent',
            value: x.toFixed(2),
            sub: 'hc / (λ · k_B · T_eff)',
            accent: 'slate',
          },
        ],
        plainMeaning:
          'Short blue light (450 nm) scatters ~4.3× more strongly than red light (650 nm)—but a red star emits very little blue to scatter.',
        modelNote:
          'Real sky color also shifts with dust, haze, clouds, and viewing angle near the horizon.',
        nasaDataset: 'NASA Exoplanet Archive',
        nasaRole:
          'Supplies host-star temperatures used to model each star’s Planck spectrum and sky tint.',
      };
    }

    case 'terminator': {
      const d = Math.max(0.001, s.distanceAU);
      const fluxRatio = s.stellarLuminosity / (d * d);
      return {
        equationTitle: 'Orbital Period & Tidal Locking',
        formula: 'P_orbit² = 4π²a³ ÷ (G × M★)',
        symbolKey: 'a = Orbit radius · M★ = Host star mass · Locked when P_rot = P_orbit',
        metrics: [
          {
            label: 'Rotation State',
            value: s.tidalLocked ? 'Tidally Locked' : 'Free Spin',
            sub: s.tidalLocked ? 'One-side eternal day' : 'Normal day & night',
            accent: s.tidalLocked ? 'amber' : 'emerald',
          },
          {
            label: 'Orbit Distance (a)',
            value: `${d.toFixed(s.star === 'TRAPPIST-1' ? 4 : 2)} AU`,
            sub: s.star,
            accent: 'sky',
          },
          {
            label: 'Incident Flux',
            value: `${(fluxRatio * 100).toFixed(0)}%`,
            sub: 'Relative to Earth (1 AU)',
            accent: 'slate',
          },
          {
            label: 'Surface Temp',
            value: `${toC(s.T_surface)}`,
            sub: `${s.T_surface.toFixed(1)} K global avg`,
            accent: 'emerald',
          },
        ],
        plainMeaning:
          s.tidalLocked
            ? 'Close-in gravitational tides slow a planet’s spin until one hemisphere permanently faces its star.'
            : 'Farther from the star, gravity is gentler so the planet keeps spinning through regular sunrises and sunsets.',
        modelNote:
          'Tidal-lock synchronization is a distance heuristic here; real locking timescales depend on star mass, planet age, and interior friction.',
        nasaDataset: 'NASA Exoplanet Archive',
        nasaRole:
          'Documents ultra-short orbits (just days long) around M-dwarf stars like TRAPPIST-1 where tidal locking dominates.',
      };
    }

    default:
      return null;
  }
}
