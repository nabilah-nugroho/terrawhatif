// TerraWhatIf — interactive coastal-observatory object database
// State contract (recommended):
// {
//   T_surface: number,             // K
//   T_eq: number,                  // K; effective temperature without greenhouse warming
//   waterPhase: "ice"|"liquid"|"vapor"|"mixed",
//   albedo: number,                // 0..1
//   runaway: boolean,
//   tidalLocked: boolean,
//   star: "Sun"|"TRAPPIST-1",
//   distanceAU: number,
//   CO2ppm: number,
//   referenceCO2ppm: number,
//   stellarLuminosity: number,     // L_sun
//   stellarRadiusSolar: number,    // R_sun
//   stellarTemperatureK: number,  // K
//   wavelengthNm: number
// }
// Functions use sensible fallbacks so an incomplete state remains inspectable.

const SIGMA = 5.670374419e-8; // W m^-2 K^-4
const S0 = 1361;              // W m^-2, approximate modern solar constant at 1 AU
const EARTH_ALBEDO = 0.30;
const EARTH_T_EQ = 255;       // K, rounded effective radiating temperature
const EARTH_SURFACE = 288;    // K, approximate global-mean surface temperature
const CO2_REFERENCE = 280;    // ppm, preindustrial reference used for forcing comparison
const FORCING_COEFFICIENT = 5.35; // W m^-2
const LV = 2.5e6;             // J kg^-1, approximate latent heat of vaporization
const RV = 461.5;             // J kg^-1 K^-1, water-vapor gas constant
const T0_WATER = 273.15;      // K
const E0_WATER = 611.2;       // Pa, saturation vapor pressure near 0 C

const n = (value, fallback) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const fmt = (value, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "n/a";

const tempRegime = (s) => {
  const t = n(s?.T_surface, EARTH_SURFACE);
  if (t < 273.15 || s?.waterPhase === "ice") return "cold";
  if (t < 310 && !s?.runaway) return "temperate";
  return "hot";
};

const regimeLine = (s, cold, temperate, hot) => {
  const regime = tempRegime(s);
  return regime === "cold" ? cold : regime === "temperate" ? temperate : hot;
};

const starDefaults = (star) => star === "TRAPPIST-1"
  ? { luminosity: 0.000553, radius: 0.119, temperature: 2566 }
  : { luminosity: 1, radius: 1, temperature: 5772 };

const currentStar = (s) => {
  const d = starDefaults(s?.star);
  return {
    luminosity: n(s?.stellarLuminosity, d.luminosity),
    radius: n(s?.stellarRadiusSolar, d.radius),
    temperature: n(s?.stellarTemperatureK, d.temperature)
  };
};

const distance = (s) => n(s?.distanceAU, 1);
const co2 = (s) => Math.max(1, n(s?.CO2ppm, 420));
const referenceCo2 = (s) => Math.max(1, n(s?.referenceCO2ppm, CO2_REFERENCE));
const surfaceTemp = (s) => n(s?.T_surface, EARTH_SURFACE);
const albedo = (s) => Math.min(1, Math.max(0, n(s?.albedo, EARTH_ALBEDO)));

const waterPhaseLabel = (s) => s?.waterPhase || (
  surfaceTemp(s) < 273.15 ? "ice" :
  surfaceTemp(s) > 373.15 ? "vapor" : "liquid"
);

const objectDatabase = [
  {
    id: "thermometer",
    chapter: 1,
    label: "Balcony Thermometer",
    analogy: "The atmosphere works more like a thermal blanket than a heat source: it slows infrared heat loss without creating sunlight.",
    layers: {
      see: (s) => `Surface: ${fmt(surfaceTemp(s), 1)} K; airless equilibrium: ${fmt(n(s?.T_eq, EARTH_T_EQ), 1)} K; water is ${waterPhaseLabel(s)}.`,
      why: (s) => regimeLine(
        s,
        "The surface is cold enough for ice to persist, much like a house losing heat faster than its heater can replace it. With weak greenhouse absorption, more infrared energy escapes to space.",
        "The surface is in a temperate range, near Earth's familiar 288 K baseline. Greenhouse gases absorb and re-emit infrared radiation, like a blanket that slows heat loss while still allowing energy to leave.",
        "The surface is hot, and the greenhouse blanket is trapping enough outgoing infrared energy to push the climate toward severe warming. If water vapor rises rapidly, the feedback can make cooling back down harder."
      ),
      math: (s) => {
        const tEq = n(s?.T_eq, EARTH_T_EQ);
        const tSurf = surfaceTemp(s);
        const delta = tSurf - tEq;
        const a = albedo(s);
        const flux = n(s?.stellarFlux, S0 / Math.pow(distance(s), 2));
        return `Effective equilibrium: T_eq = [S(1 − α)/(4σ)]^(1/4). Using S = ${fmt(flux, 1)} W m⁻², α = ${fmt(a, 3)}, and σ = 5.670374419×10⁻⁸ W m⁻² K⁻⁴ gives a model T_eq of ${fmt(Math.pow((flux * (1 - a)) / (4 * SIGMA), 0.25), 1)} K; supplied state T_eq = ${fmt(tEq, 1)} K. Greenhouse offset: ΔT = T_surface − T_eq = ${fmt(tSurf, 1)} − ${fmt(tEq, 1)} = ${fmt(delta, 1)} K. Earth reference values (about 255 K and 288 K) are rounded global-energy-balance benchmarks. Caveat: this one-layer diagnostic is not a vertically resolved climate model. Dataset context: NASA CERES EBAF provides observed top-of-atmosphere radiative fluxes used to assess Earth's energy budget.`
      }
    }
  },
  {
    id: "ice",
    chapter: 1,
    label: "Polar Ice Shelf",
    analogy: "Fresh snow is like a white shirt in sunlight; dark ocean is like a black shirt that absorbs more of the Sun's energy.",
    layers: {
      see: (s) => `Surface: ${fmt(surfaceTemp(s), 1)} K; planetary albedo: ${fmt(albedo(s), 3)}; water phase: ${waterPhaseLabel(s)}.`,
      why: (s) => regimeLine(
        s,
        "In a frozen regime, bright ice reflects a large share of incoming sunlight. It acts like a white shirt that stays cooler in direct sun, helping preserve the ice that maintains high reflectivity.",
        "In a temperate regime, ice and open water can coexist. If ice retreats, darker ocean is exposed and absorbs more sunlight, like swapping a white shirt for a black one.",
        "In a hot regime, ice loss can reduce reflectivity and add absorbed solar energy. The darker surface reinforces the initial warming, although clouds, geography, and ocean transport can alter the strength of the feedback."
      ),
      math: (s) => {
        const a = albedo(s);
        const flux = n(s?.stellarFlux, S0 / Math.pow(distance(s), 2));
        const absorbed = flux * (1 - a) / 4;
        const comparison = flux * (1 - EARTH_ALBEDO) / 4;
        return `Global-mean absorbed stellar flux: F_abs = S(1 − α)/4. With S = ${fmt(flux, 1)} W m⁻² and α = ${fmt(a, 3)}, F_abs = ${fmt(absorbed, 1)} W m⁻²; at α = 0.300 it would be ${fmt(comparison, 1)} W m⁻². A decrease in α raises absorbed energy. Caveat: real surface albedo varies by wavelength, season, clouds, snow grain size, and viewing geometry; the scalar α is a model simplification. NASA CERES EBAF supplies Earth radiation-budget observations for evaluating reflected and absorbed energy.`
      }
    }
  },
  {
    id: "valve",
    chapter: 1,
    label: "Atmospheric Gas Valve",
    analogy: "Adding greenhouse gas is like making a thermal blanket thicker: it changes how easily infrared heat escapes, not how much sunlight the star emits.",
    layers: {
      see: (s) => `CO₂ setting: ${fmt(co2(s), 0)} ppm; surface: ${fmt(surfaceTemp(s), 1)} K; runaway flag: ${Boolean(s?.runaway)}.`,
      why: (s) => regimeLine(
        s,
        "In a cold regime, added CO₂ can still strengthen infrared absorption, but the surface may remain frozen. The blanket is thicker; the room does not instantly become warm.",
        "In a temperate regime, extra CO₂ reduces the rate at which the planet loses infrared energy to space. The surface warms until outgoing energy again balances absorbed sunlight.",
        "In a hot or runaway regime, added greenhouse gas can compound an already large heat imbalance. Water vapor may amplify the warming, so the valve's effect is part of a larger feedback system."
      ),
      math: (s) => {
        const c = co2(s);
        const c0 = referenceCo2(s);
        const forcing = FORCING_COEFFICIENT * Math.log(c / c0);
        return `CO₂ radiative forcing approximation: ΔF = 5.35 ln(C/C₀) W m⁻². With C = ${fmt(c, 1)} ppm and C₀ = ${fmt(c0, 1)} ppm, ΔF = 5.35 ln(${fmt(c, 1)}/${fmt(c0, 1)}) = ${fmt(forcing, 2)} W m⁻². This is a forcing estimate, not a direct temperature conversion; temperature response depends on climate feedbacks and timescale. Caveat: the logarithmic expression is an approximation for CO₂ forcing over common concentration ranges and does not represent all greenhouse gases. NASA CERES EBAF measures radiative fluxes that help constrain Earth's energy response; it is not the source of the 5.35 coefficient.`
      }
    }
  },
  {
    id: "lever",
    chapter: 2,
    label: "Orbital Thrust Lever",
    analogy: "A flashlight beam spreads across a larger patch as it travels; the same stellar power is diluted over a larger spherical area at greater distance.",
    layers: {
      see: (s) => `Orbit: ${fmt(distance(s), 2)} AU; relative sunlight: ${fmt(1 / Math.pow(distance(s), 2), 3)} × the 1 AU value.`,
      why: (s) => regimeLine(
        s,
        "At a distant orbit, less stellar energy reaches each square metre. The planet can freeze, much as a flashlight looks dimmer when its beam has spread across a larger area.",
        "Near a temperate orbit, incoming energy can support liquid water if the atmosphere and reflectivity are suitable. A small change in distance still changes the energy input by the square law.",
        "At a close orbit, the incoming energy rises sharply. The atmosphere and surface feedbacks then determine whether the planet warms moderately or crosses into a severe greenhouse state."
      ),
      math: (s) => {
        const d = Math.max(0.01, distance(s));
        const relative = 1 / (d * d);
        const flux = S0 * relative;
        const teq = EARTH_T_EQ / Math.sqrt(d);
        return `Inverse-square law: S(d) = L/(4πd²); relative to Earth at 1 AU, S/S₀ = 1/d². With d = ${fmt(d, 3)} AU, S/S₀ = 1/${fmt(d, 3)}² = ${fmt(relative, 3)}, so S ≈ ${fmt(flux, 1)} W m⁻² for a Sun-like star. At fixed albedo, T_eq ∝ S^(1/4), so T_eq ≈ 255/${fmt(Math.sqrt(d), 3)} = ${fmt(teq, 1)} K. Caveat: this scaling holds only when stellar luminosity and albedo are fixed and does not include greenhouse or climate feedback changes. NASA Exoplanet Archive provides measured and compiled exoplanet orbital parameters; NASA CERES EBAF provides Earth energy-budget context.`
      }
    }
  },
  {
    id: "vapor",
    chapter: 2,
    label: "Horizon Mist / Water Vapor",
    analogy: "A compounding spiral: warming adds water vapor, water vapor adds greenhouse warming, and the added warming allows still more vapor.",
    layers: {
      see: (s) => `Surface: ${fmt(surfaceTemp(s), 1)} K; water phase: ${waterPhaseLabel(s)}; runaway flag: ${Boolean(s?.runaway)}.`,
      why: (s) => regimeLine(
        s,
        "In cold conditions, much atmospheric water is removed by condensation or frozen onto the surface. The water-vapor feedback is weaker because cold air holds little vapor.",
        "In temperate conditions, warmer air can hold more water vapor before saturation. More vapor strengthens infrared absorption, which adds warming and allows the air to hold still more vapor.",
        "In hot conditions, the feedback can become strong and help drive a moist or runaway greenhouse. It is a compounding loop, not an unlimited source of energy; the planet's outgoing radiation still sets the physical limit."
      ),
      math: (s) => {
        const t = Math.max(150, surfaceTemp(s));
        const exponent = (LV / RV) * (1 / T0_WATER - 1 / t);
        const vaporPressure = E0_WATER * Math.exp(exponent);
        const percentPerK = (LV / (RV * t * t)) * 100;
        return `Clausius–Clapeyron (constant Lᵥ approximation): eₛ(T) = e₀ exp[(Lᵥ/Rᵥ)(1/T₀ − 1/T)]. With T = ${fmt(t, 2)} K, e₀ = 611.2 Pa at T₀ = 273.15 K, Lᵥ = 2.5×10⁶ J kg⁻¹, and Rᵥ = 461.5 J kg⁻¹ K⁻¹, eₛ ≈ ${fmt(vaporPressure, 1)} Pa. The local fractional sensitivity is d ln(eₛ)/dT = Lᵥ/(RᵥT²) ≈ ${fmt(percentPerK, 2)}% per K. Near 288 K this is about 6–7% per K. Caveat: this estimates saturation vapor pressure over liquid water; actual atmospheric humidity depends on circulation, condensation, and water availability. NASA CERES EBAF can constrain radiative response, but the Clausius–Clapeyron relation is a thermodynamic law, not a CERES product.`
      }
    }
  },
  {
    id: "starmap",
    chapter: 3,
    label: "Observatory Star Window",
    analogy: "A habitable zone is like the comfortable distance from a campfire: a dimmer fire requires you to stand closer, but distance alone does not guarantee comfort.",
    layers: {
      see: (s) => {
        const star = currentStar(s);
        const hz = Math.sqrt(star.luminosity);
        return `${s?.star || "Sun"} selected; luminosity ${fmt(star.luminosity, 6)} L☉; approximate Earth-flux distance ${fmt(hz, 4)} AU.`;
      },
      why: (s) => regimeLine(
        s,
        "A planet too far from its star receives too little energy to prevent widespread freezing. Like standing far from a small campfire, it receives less warmth.",
        "Within a suitable energy range, surface liquid water may be possible if atmospheric pressure and composition cooperate. The habitable zone is a starting map, not a climate guarantee.",
        "A planet too close to its star can receive excessive energy and lose stable surface liquid water. A thicker atmosphere may shift the outcome, but it cannot be judged from distance alone."
      ),
      math: (s) => {
        const star = currentStar(s);
        const lum = star.luminosity;
        const r = star.radius;
        const temp = star.temperature;
        const d = Math.max(0.001, distance(s));
        const fluxRatio = lum / (d * d);
        const hzEarthFlux = Math.sqrt(lum);
        return `Stefan–Boltzmann luminosity: L = 4πR²σT_eff⁴, so L/L☉ = (R/R☉)²(T_eff/5772 K)⁴. Current values: R = ${fmt(r, 4)} R☉ and T_eff = ${fmt(temp, 0)} K, giving the configured luminosity ${fmt(lum, 6)} L☉. Relative incident flux at d = ${fmt(d, 4)} AU is F/F⊕ = (L/L☉)/d² = ${fmt(fluxRatio, 6)}. The orbit receiving roughly Earth's present flux is d ≈ √(L/L☉) = ${fmt(hzEarthFlux, 4)} AU. Caveat: a true habitable-zone estimate uses climate-model inner and outer limits, stellar spectrum, and atmospheric assumptions; the Earth-flux distance is only a quick reference. NASA Exoplanet Archive provides stellar and planetary parameters for catalogued systems.`
      }
    }
  },
  {
    id: "sky",
    chapter: 3,
    label: "Upper Atmosphere / Sky Dome",
    analogy: "Air molecules act like a selective scatterer: short visible wavelengths are redirected more strongly, much as a prism separates colors but by a different physical process.",
    layers: {
      see: (s) => {
        const star = s?.star || "Sun";
        const wavelength = n(s?.wavelengthNm, 450);
        return `${star} illumination; sampled wavelength ${fmt(wavelength, 0)} nm; Rayleigh weighting ∝ λ⁻⁴ = ${fmt(Math.pow(450 / wavelength, 4), 3)} relative to 450 nm.`;
      },
      why: (s) => regimeLine(
        s,
        "A cold atmosphere may still scatter starlight, but a thin or altered atmosphere can make the sky dark or change its color. Scattering needs molecules along the light path.",
        "Under a clear, Earth-like atmosphere, shorter blue wavelengths scatter more strongly than red wavelengths, so light arrives from many parts of the sky. This is Rayleigh scattering, not the same process as a glass prism.",
        "A hot atmosphere may contain more water vapor or aerosols, and clouds can dominate the view. The simple blue-sky rule then becomes incomplete; composition and particles matter as much as the star's color."
      ),
      math: (s) => {
        const wavelength = Math.max(100, n(s?.wavelengthNm, 450));
        const relative = Math.pow(450 / wavelength, 4);
        const star = currentStar(s);
        const x = 1.438776877e-2 / (wavelength * 1e-9 * star.temperature);
        const planckFactor = 1 / (Math.pow(wavelength * 1e-9, 5) * (Math.exp(Math.min(x, 700)) - 1));
        return `Rayleigh wavelength dependence: σ_R ∝ λ⁻⁴. Relative to 450 nm, the scattering weight at λ = ${fmt(wavelength, 0)} nm is (450/${fmt(wavelength, 0)})⁴ = ${fmt(relative, 4)}. The illuminating star's blackbody spectral shape is approximated by Planck's law: B_λ(T) = (2hc²/λ⁵)/[exp(hc/(λk_BT)) − 1]; at T_eff = ${fmt(star.temperature, 0)} K and λ = ${fmt(wavelength, 0)} nm, the dimensionless exponent hc/(λk_BT) = ${fmt(x, 3)}. Caveat: the displayed Planck factor is a spectral-shape diagnostic, not a full atmospheric radiative-transfer calculation; real sky color also depends on gas composition, aerosols, clouds, optical depth, and viewing angle. NASA Exoplanet Archive supplies stellar parameters for known systems; NASA CERES EBAF provides Earth radiation-budget context, not a direct sky-color measurement.`
      }
    }
  },
  {
    id: "terminator",
    chapter: 3,
    label: "Day-Night Terminator Line",
    analogy: "The Moon keeps nearly the same face toward Earth because its rotation and orbit are synchronized; a close-in planet can reach a similar spin-orbit state with its star.",
    layers: {
      see: (s) => `Tidal-lock heuristic: ${s?.tidalLocked ? "synchronous rotation indicated" : "not flagged as tidally locked"}; host star: ${s?.star || "Sun"}; orbit: ${fmt(distance(s), 3)} AU.`,
      why: (s) => regimeLine(
        s,
        "On a cold locked world, one side can remain in darkness and become extremely cold while the star-facing side receives continuous light. The twilight boundary is a narrow climate zone unless the atmosphere or ocean moves heat.",
        "On a temperate locked world, winds and oceans may transport heat from the day side to the night side. The terminator can be a region of moderate conditions, but its stability depends on atmospheric pressure and circulation.",
        "On a hot locked world, the day side may receive intense continuous heating. If heat transport is weak, the night side can remain much cooler; clouds and circulation can substantially change this contrast."
      ),
      math: (s) => {
        const d = Math.max(0.001, distance(s));
        const star = currentStar(s);
        const flux = star.luminosity / (d * d);
        const flagged = Boolean(s?.tidalLocked);
        return `Synchronous-rotation condition: P_rot = P_orbit. Kepler's third law for a planet of negligible mass around a star of mass M★ is P_orbit² = 4π²a³/(GM★). Current orbit a = ${fmt(d, 4)} AU and configured stellar luminosity = ${fmt(star.luminosity, 6)} L☉; incident-flux ratio is ${fmt(flux, 6)} relative to Earth. Simulator tidal-lock flag: ${flagged}. Caveat: luminosity does not determine stellar mass or tidal-lock timescale. A reliable synchronization prediction also needs stellar mass, planetary radius, moment of inertia, initial spin, tidal dissipation, age, and eccentricity; this object uses a heuristic only. NASA Exoplanet Archive provides measured and compiled orbital parameters for exoplanet systems.`
      }
    }
  }
];

export const CONCEPTS = objectDatabase;

export const getConceptById = (id) => objectDatabase.find((item) => item.id === id);

export default objectDatabase;
