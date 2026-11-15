// TerraWhatIf — narrative script
// TERRA is the onboard navigation AI. All temperatures are in kelvin unless stated otherwise.

export const INTRO = {
  id: "intro",
  title: "Navigator's Call",
  subtitle: "Coastal Observatory // Earth baseline",
  narrator: "TERRA",
  paragraphs: [
    "Welcome aboard, Planetary Navigator. I am TERRA, your onboard navigation system. Earth's climate is a radiative balance: sunlight arrives, the planet reflects some of it, and the surface-atmosphere system sends heat back to space. Change one part of that balance and the rest of the system responds.",
    "This observatory is built for inspection, not spreadsheet endurance. Touch the balcony thermometer, follow the ice shelf, and operate the atmospheric gas valve. Each object reports what the physics is doing. Your first assignment is to find out why Earth's surface averages about 288 K while an airless Earth would settle near 255 K."
  ],
  objective: "Inspect the observatory objects and identify where the extra surface warmth comes from.",
  next: "CH1"
};

export const CH1 = {
  id: "ch1",
  number: 1,
  title: "Our Home",
  concept: "The Greenhouse Effect",
  narrator: "TERRA",
  briefing: [
    "Baseline orbit confirmed: 1.00 AU. Incoming sunlight is partly reflected by clouds, ice, land, and ocean. The rest is absorbed and eventually leaves as infrared radiation.",
    "At an effective radiating temperature near 255 K, Earth would be far colder than the observed global-mean surface temperature of about 288 K. Greenhouse gases absorb and emit infrared radiation, shifting the effective level from which heat escapes to space."
  ],
  objects: [
    {
      id: "thermometer",
      title: "Balcony Thermometer",
      prompt: "Compare the airless equilibrium temperature with the measured global-mean surface temperature.",
      discovery: "The roughly 33 K difference is not extra sunlight. It is the result of the atmosphere changing how efficiently Earth loses infrared energy."
    },
    {
      id: "ice",
      title: "Polar Ice Shelf",
      prompt: "Inspect the bright ice and compare it with the darker ocean beside it.",
      discovery: "Bright ice reflects more sunlight. When ice melts, darker surfaces absorb more energy, which can cause further warming."
    },
    {
      id: "valve",
      title: "Atmospheric Gas Valve",
      prompt: "Adjust the greenhouse-gas control and watch the infrared balance respond.",
      discovery: "More CO₂ increases radiative forcing approximately logarithmically. It does not add heat like a burner; it changes the planet's path for releasing heat."
    }
  ],
  challenge: {
    title: "Find the missing 33 kelvin",
    instruction: "Inspect the balcony thermometer, polar ice shelf, and atmospheric gas valve. Explain why the surface is near 288 K while the airless equilibrium temperature is near 255 K.",
    successWhen: "The navigator has inspected all three Chapter 1 objects and identified infrared absorption and emission by greenhouse gases.",
    successMessage: "Baseline calibration complete. The atmosphere is not a lid that stops heat forever; it is an infrared-active layer that changes the temperature required to balance incoming and outgoing energy."
  },
  next: "CH2"
};

export const CH2 = {
  id: "ch2",
  number: 2,
  title: "Too Close",
  concept: "Inverse-Square Law + Water-Vapor and Ice-Albedo Feedback",
  narrator: "TERRA",
  briefing: [
    "The orbital thrust lever changes Earth's distance from its star. At a fixed stellar luminosity, the received flux follows an inverse-square rule: halve the distance and the flux becomes four times larger.",
    "The climate response is not a simple thermometer conversion. Warmer air can hold more water vapor, a greenhouse gas. Melting ice also exposes darker surfaces that absorb more sunlight. Both feedbacks can amplify the initial warming."
  ],
  miniPrediction: {
    title: "Mini-Prediction",
    prompt: "If we move Earth 15% closer to the Sun (0.85 AU), how much will surface temperature rise?",
    options: [
      {
        id: "linear",
        label: "About 15%, because the orbit is 15% closer.",
        correct: false,
        feedback: "Distance does not translate linearly into temperature. Received stellar flux follows the inverse square of distance."
      },
      {
        id: "flux",
        label: "About 38% more sunlight, but not 38% more surface temperature.",
        correct: true,
        feedback: "Correct. At 0.85 AU, sunlight rises by 1 / 0.85², or about 38%. The equilibrium temperature scales with the fourth root of absorbed flux, so the direct radiative temperature increase is much smaller. Water vapor and ice-albedo feedback can amplify the climate response further."
      },
      {
        id: "same",
        label: "Almost no change; the atmosphere regulates the temperature.",
        correct: false,
        feedback: "The atmosphere cannot cancel a large change in incoming energy. It changes the response, but the orbital energy input still matters."
      }
    ],
    reveal: "At fixed albedo and greenhouse effect, the effective radiating temperature scales approximately as d⁻¹ᐟ². Moving from 1.00 AU to 0.85 AU raises stellar flux by about 38% and the no-feedback equilibrium temperature by about 8.4% (roughly 21 K from a 255 K baseline). The actual surface response depends on atmospheric composition, clouds, circulation, and feedbacks. Water vapor and shrinking ice cover can amplify warming; they do not provide a universal fixed number of extra kelvin."
  },
  controls: [
    {
      id: "orbital-distance",
      label: "Orbital distance",
      type: "lever",
      min: 0.85,
      max: 1.15,
      step: 0.01,
      unit: "AU",
      default: 1.00,
      instruction: "Move the orbit inward or outward. Watch stellar flux change with the square of distance."
    },
    {
      id: "greenhouse-gas",
      label: "Atmospheric gas valve",
      type: "slider",
      instruction: "Reduce the greenhouse forcing after moving the orbit inward. This is a simplified control, not a proposed climate intervention."
    }
  ],
  objects: [
    {
      id: "lever",
      title: "Orbital Thrust Lever",
      prompt: "Move the orbit and compare the received stellar flux.",
      discovery: "The same flashlight beam spreads over a larger area as you move away. Planetary sunlight behaves the same way."
    },
    {
      id: "vapor",
      title: "Horizon Mist",
      prompt: "Inspect how warmer air changes the amount of water vapor it can hold.",
      discovery: "More water vapor strengthens the greenhouse effect. That warming can add still more vapor, forming a positive feedback loop."
    }
  ],
  challenge: {
    title: "Hold the inner orbit",
    instruction: "Push the orbital lever to 0.85 AU. Then use the atmospheric gas valve to stabilize the simulated surface below 320 K.",
    target: {
      distanceAU: 0.85,
      maxSurfaceTemperatureK: 320
    },
    successWhen: "distanceAU is 0.85 AU (within the simulator's control tolerance) and T_surface is below 320 K.",
    successMessage: "Inner-orbit test complete. You reduced the model's greenhouse forcing enough to keep the simulated surface below the mission threshold. This is a controlled experiment, not a forecast for a real planet."
  },
  next: "CH3"
};

export const CH3 = {
  id: "ch3",
  number: 3,
  title: "Red Sun",
  concept: "Rayleigh Sky Color + Tidal Locking",
  narrator: "TERRA",
  briefing: [
    "Select a star. The Sun is a G-type star. TRAPPIST-1 is a much cooler, smaller M-dwarf. Its lower luminosity places its habitable zone much closer to the star.",
    "A planet in the habitable zone receives a potentially suitable amount of energy for liquid surface water. That does not guarantee oceans or life. Atmosphere, clouds, pressure, composition, and climate stability still matter.",
    "The color of a clear sky depends on how atmospheric molecules scatter light. Rayleigh scattering favors shorter wavelengths. Around a redder star, the available spectrum changes, so the sky need not look Earth's familiar blue.",
    "Close-in planets around cool stars may become tidally locked. One hemisphere can face the star continuously while the other faces space, with a moving or stable twilight region between them depending on the system."
  ],
  controls: [
    {
      id: "star-selector",
      label: "Host star",
      type: "select",
      options: [
        { value: "Sun", label: "Sun" },
        { value: "TRAPPIST-1", label: "TRAPPIST-1" }
      ],
      default: "Sun",
      instruction: "Switch the host star. The habitable-zone distance changes with stellar luminosity."
    },
    {
      id: "orbital-distance",
      label: "Orbital distance",
      type: "lever",
      unit: "AU",
      instruction: "Place the planet within the selected star's estimated habitable zone. The simulator's zone is an approximate energy-balance guide."
    }
  ],
  objects: [
    {
      id: "starmap",
      title: "Observatory Star Window",
      prompt: "Compare stellar size, temperature, luminosity, and the estimated habitable zone.",
      discovery: "A dimmer campfire warms you only at a shorter distance. A star's habitable zone shifts inward or outward with its luminosity."
    },
    {
      id: "sky",
      title: "Upper Atmosphere / Sky Dome",
      prompt: "Inspect the incoming spectrum and the wavelengths scattered by the atmosphere.",
      discovery: "Air molecules scatter short visible wavelengths more strongly than long ones. The star's spectrum changes which colors are available to scatter."
    },
    {
      id: "terminator",
      title: "Day-Night Terminator Line",
      prompt: "Inspect the boundary between the illuminated hemisphere and the night side.",
      discovery: "A tidally locked planet can keep one face toward its star, much as the Moon keeps nearly the same face toward Earth."
    }
  ],
  challenge: {
    title: "Find the red-star water zone",
    instruction: "Select TRAPPIST-1 and move Earth into its estimated habitable zone. Confirm that the simulated surface remains within 273 K–373 K, then inspect the sky dome and day-night terminator.",
    target: {
      star: "TRAPPIST-1",
      waterTemperatureRangeK: [273, 373]
    },
    successWhen: "star is TRAPPIST-1, the orbital distance is within the configured habitable-zone interval, T_surface is between 273 K and 373 K, and both sky and terminator have been inspected.",
    successMessage: "Red-star survey complete. Liquid-water temperatures are possible in this model. The sky color and rotation state depend on atmospheric and orbital details that a first-order simulation cannot fully resolve."
  },
  next: "EPILOG"
};

export const EPILOG = {
  id: "epilog",
  title: "The Calibration Lab",
  narrator: "TERRA",
  paragraphs: [
    "Mission scenarios complete. The observatory is now in free-play mode. All sliders are unlocked: stellar type, orbital distance, atmospheric greenhouse control, and surface reflectivity. Change one variable at a time, or combine them and observe how the system responds.",
    "Calibration note: this is a first-order teaching model. It uses a one-layer atmosphere, has no three-dimensional ocean circulation, does not resolve cloud microphysics, and treats tidal locking with a heuristic rather than a full orbital and rotational evolution model. Its outputs illustrate mechanisms; they are not precise climate predictions for real exoplanets.",
    "Further missions are available. Add binary-star illumination and compare it with circumbinary worlds such as Kepler-16b. Model atmospheric Jeans escape, where fast particles at the top of an atmosphere can escape a planet's gravity. Then investigate how high-energy XUV flares from M-dwarf stars can heat and erode planetary atmospheres over time."
  ],
  freePlay: {
    unlocked: true,
    controls: [
      "star",
      "orbitalDistanceAU",
      "co2",
      "albedo"
    ],
    instruction: "Change one control at a time to isolate cause and effect. Reset to the Earth baseline whenever the comparison becomes unclear."
  },
  modelLimitations: [
    "One-layer atmosphere: greenhouse behavior is represented by a simplified radiative layer, not a vertically resolved atmosphere.",
    "No 3D ocean circulation: heat transport by currents and regional ocean dynamics are omitted.",
    "No cloud microphysics: cloud formation, particle size, phase, altitude, and optical properties are not explicitly simulated.",
    "Heuristic tidal locking: rotational synchronization is estimated from simplified rules, not integrated from a complete tidal-dissipation model."
  ],
  futureRoadmap: [
    {
      title: "Binary-star illumination",
      detail: "Add two moving stellar sources and examine changing insolation on circumbinary planets such as Kepler-16b."
    },
    {
      title: "Atmospheric Jeans escape",
      detail: "Estimate thermal escape from the upper atmosphere by comparing particle speeds with the planet's escape speed."
    },
    {
      title: "M-dwarf XUV erosion",
      detail: "Explore how prolonged extreme-ultraviolet and X-ray activity can heat upper atmospheres and drive atmospheric loss."
    }
  ],
  closing: "TERRA standing by. A simulation is a controlled question. Choose the next one carefully."
};

export const CHAPTERS = [INTRO, CH1, CH2, CH3, EPILOG];

export default CHAPTERS;
