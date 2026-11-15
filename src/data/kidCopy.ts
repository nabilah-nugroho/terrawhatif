import type { ConceptState } from '../types/observatory';

export interface KidConceptCopy {
  id: string;
  title: string;
  chapter: number;
  badge: (s: ConceptState) => {
    label: string;
    tone: 'cold' | 'temperate' | 'hot';
  };
  look: (s: ConceptState) => string;
  why: (s: ConceptState) => string;
  discoveryNote: string;
}

const toC = (k: number) => `${(k - 273.15).toFixed(1)}°C`;

function tempTone(s: ConceptState): 'cold' | 'temperate' | 'hot' {
  if (s.T_surface < 273.15 || s.waterPhase === 'frozen' || s.waterPhase === 'mostlyFrozen') {
    return 'cold';
  }
  if (s.T_surface < 315 && !s.runaway) return 'temperate';
  return 'hot';
}

export const KID_CONCEPTS: Record<string, KidConceptCopy> = {
  thermometer: {
    id: 'thermometer',
    title: 'Balcony Thermometer',
    chapter: 1,
    badge: (s) => {
      const tone = tempTone(s);
      return {
        label:
          tone === 'cold'
            ? `Frozen World · ${toC(s.T_surface)}`
            : tone === 'temperate'
              ? `Just Right · ${toC(s.T_surface)}`
              : `Overheating · ${toC(s.T_surface)}`,
        tone,
      };
    },
    look: (s) =>
      `The ocean air is ${toC(s.T_surface)} (${s.T_surface.toFixed(0)} K), while an Earth without air would freeze at ${toC(s.T_eq)} (${s.T_eq.toFixed(0)} K).`,
    why: (s) => {
      const tone = tempTone(s);
      if (tone === 'cold') {
        return 'Without a thick heat blanket, Earth loses warmth straight into space like a house with open windows. Almost all surface water locks into ice.';
      }
      if (tone === 'temperate') {
        return 'Earth’s air acts like a cozy winter blanket that slows heat escaping into space. That extra 33°C of warmth keeps our oceans liquid and full of life.';
      }
      return 'Too much heat-trapping gas makes the winter blanket way too heavy. Heat builds up faster than the sky can release it back to space.';
    },
    discoveryNote: 'The extra 33°C of warmth comes from Earth’s Heat Blanket—not extra sunlight.',
  },
  ice: {
    id: 'ice',
    title: 'Polar Ice Shelf',
    chapter: 1,
    badge: (s) => ({
      label: `Ice Mirror · ${Math.round(s.albedo * 100)}% Sunlight Reflected`,
      tone: s.albedo > 0.42 ? 'cold' : s.albedo > 0.29 ? 'temperate' : 'hot',
    }),
    look: (s) =>
      `Bright ice and clouds bounce ${Math.round(s.albedo * 100)}% of incoming starlight right back into space.`,
    why: (s) => {
      if (tempTone(s) === 'cold') {
        return 'Snow and ice work like wearing a bright white t-shirt on a sunny day—they bounce sunlight away and keep the planet cool. More ice means an even stronger Ice Mirror!';
      }
      return 'White ice acts like a mirror, while dark blue ocean acts like a black t-shirt that soaks up sunlight. When ice melts, dark water absorbs more heat and melts even more ice.';
    },
    discoveryNote: 'Ice Mirror Effect: white ice reflects sunlight, while dark ocean soaks it up.',
  },
  valve: {
    id: 'valve',
    title: 'Atmosphere Gas Valve',
    chapter: 1,
    badge: (s) => ({
      label: `Heat Blanket · ${s.CO2ppm.toFixed(0)} ppm CO₂`,
      tone: s.CO2ppm < 220 ? 'cold' : s.CO2ppm < 600 ? 'temperate' : 'hot',
    }),
    look: (s) =>
      `CO₂ is set to ${s.CO2ppm.toFixed(0)} ppm, thickening the glowing Heat Blanket high above the ocean.`,
    why: () =>
      'Turning up CO₂ is like adding another layer to your winter blanket—it doesn’t make sunlight brighter, it just slows your body heat from escaping. Even small changes in gas shift the planet’s balance.',
    discoveryNote: 'Greenhouse gases thicken the Heat Blanket that traps outgoing warmth.',
  },
  lever: {
    id: 'lever',
    title: 'Orbit Thrust Lever',
    chapter: 2,
    badge: (s) => ({
      label: `Orbit ${s.distanceAU.toFixed(s.star === 'TRAPPIST-1' ? 3 : 2)} AU · ${Math.round((s.stellarFlux / 1361) * 100)}% Sunlight`,
      tone: tempTone(s),
    }),
    look: (s) =>
      `At ${s.distanceAU.toFixed(s.star === 'TRAPPIST-1' ? 3 : 2)} AU, the planet receives ${Math.round((s.stellarFlux / 1361) * 100)}% of Earth’s usual sunlight.`,
    why: () =>
      'Starlight spreads out like a flashlight beam shining across a dark room. Step just 15% closer to the bulb and the bright spot packs 38% more energy per square meter!',
    discoveryNote: 'Moving closer packs way more starlight onto every meter of ocean.',
  },
  vapor: {
    id: 'vapor',
    title: 'Ocean Mist',
    chapter: 2,
    badge: (s) => ({
      label:
        s.waterPhase === 'vapor' || s.waterPhase === 'boiling'
          ? 'Steam Spiral Active'
          : s.waterPhase === 'frozen'
            ? 'Locked in Ice'
            : 'Gentle Water Cycle',
      tone: tempTone(s),
    }),
    look: (s) =>
      s.waterPhase === 'vapor' || s.waterPhase === 'boiling'
        ? `At ${toC(s.T_surface)}, thick ocean mist floods the sky and traps runaway heat.`
        : `Warm air holds invisible water vapor rising off the sea at ${toC(s.T_surface)}.`,
    why: () =>
      'Warmer air acts like a bigger sponge that holds more invisible water vapor, and water vapor is itself a strong heat-trapping gas! More heat makes more mist, which makes even more heat.',
    discoveryNote: 'Water vapor multiplies warming like a snowball rolling downhill.',
  },
  starmap: {
    id: 'starmap',
    title: 'Star Telescope',
    chapter: 3,
    badge: (s) => ({
      label: `${s.star} · ${s.inHZ ? 'In Cozy Zone' : 'Outside Cozy Zone'}`,
      tone: s.inHZ ? 'temperate' : tempTone(s),
    }),
    look: (s) =>
      `${s.star} shines at ${s.stellarTemperatureK.toFixed(0)} K and appears ${s.angularSizeRatio.toFixed(1)}× as wide as our Sun from Earth.`,
    why: () =>
      'A tiny red dwarf star is like a small campfire compared to our Sun’s giant bonfire. To stay warm enough for liquid oceans, a planet has to scoot much closer to the campfire!',
    discoveryNote: 'Dimmer red stars pull their liquid-water "Cozy Zone" much closer in.',
  },
  sky: {
    id: 'sky',
    title: 'Sky Dome',
    chapter: 3,
    badge: (s) => ({
      label: s.star === 'TRAPPIST-1' ? 'Amber-Peach Sky' : 'Azure Blue Sky',
      tone: s.star === 'TRAPPIST-1' ? 'hot' : 'temperate',
    }),
    look: (s) =>
      s.star === 'TRAPPIST-1'
        ? 'With very little blue light coming from the red star, air scatters warm amber and orange overhead.'
        : 'Air molecules bounce short blue waves from sunlight across the whole sky.',
    why: () =>
      'Air acts like a tiny pinball machine that scatters short blue light waves much better than red ones. Because a red dwarf barely emits blue light, the sky glows sunset-amber even at noon!',
    discoveryNote: 'Sky color depends on both air molecules and the star’s rainbow of light.',
  },
  terminator: {
    id: 'terminator',
    title: 'Day-Night Line',
    chapter: 3,
    badge: (s) => ({
      label: s.tidalLocked ? 'One-Side Day, One-Side Night' : 'Spinning Day & Night',
      tone: s.tidalLocked ? 'hot' : 'temperate',
    }),
    look: (s) =>
      s.tidalLocked
        ? 'Gravity locks one face toward the star forever while the other half stays in starry night.'
        : 'The planet spins freely, giving every ocean and shore regular sunrise and sunset.',
    why: () =>
      'Just like our Moon always shows Earth the same face, a planet orbiting very close to a red star gets grabbed by gravity. One side bakes in endless noon while the far side sits in permanent twilight or night.',
    discoveryNote: 'One-Side Day, One-Side Night happens when planets orbit close to dim stars.',
  },
};
