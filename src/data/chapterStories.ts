export interface StoryBeat {
  badge: string;
  headline: string;
  body: string;
  callout: string;
}

export interface ChapterStory {
  chapterNum: 1 | 2 | 3;
  stageId: 'CH1' | 'CH2' | 'CH3';
  eyebrow: string;
  title: string;
  subtitle: string;
  accentColor: string;
  beats: [StoryBeat, StoryBeat];
  ctaLabel: string;
}

export const CHAPTER_STORIES: Record<'CH1' | 'CH2' | 'CH3', ChapterStory> = {
  CH1: {
    chapterNum: 1,
    stageId: 'CH1',
    eyebrow: 'Mission Briefing · Chapter 1',
    title: 'The Missing 33 Degrees',
    subtitle: 'Why isn’t Earth a giant snowball?',
    accentColor: 'emerald',
    beats: [
      {
        badge: 'Clue #1 · Sunlight Balance',
        headline: 'An airless Earth would freeze solid at -18°C.',
        body: 'At 1.00 AU from the Sun, sunlight warms Earth while white ice and clouds bounce ~30% of that light back to space. Without an atmosphere to trap outgoing heat, Earth would sit frozen at 255 K (-18°C).',
        callout: 'Airless equilibrium: 255 K (-18°C) -> Frozen oceans!',
      },
      {
        badge: 'Clue #2 · Your Investigation',
        headline: 'Our air acts like an invisible thermal blanket.',
        body: 'In reality, Earth averages a comfortable +15°C (288 K). Greenhouse gases like CO₂ and water vapor absorb escaping infrared heat and send part of it back down. Inspect the instruments on deck to uncover the +33°C difference!',
        callout: 'Goal: Inspect Thermometer, Polar Ice, Gas Valve & test CO₂.',
      },
    ],
    ctaLabel: 'Start Chapter 1',
  },
  CH2: {
    chapterNum: 2,
    stageId: 'CH2',
    eyebrow: 'Mission Briefing · Chapter 2',
    title: 'Too Close to the Sun',
    subtitle: 'What happens when sunlight surges by 38%?',
    accentColor: 'amber',
    beats: [
      {
        badge: 'Clue #1 · The Inverse-Square Law',
        headline: 'Moving 15% closer packs +38% more solar energy.',
        body: 'Like stepping closer to a campfire, starlight spreads over a sphere: shrinking Earth’s orbit from 1.00 AU to 0.85 AU concentrates sunlight by 1 / 0.85² — about 38% stronger!',
        callout: 'Solar flux jumps from 1,361 W/m² to ~1,884 W/m².',
      },
      {
        badge: 'Clue #2 · Climate Feedback Loops',
        headline: 'Warming triggers water-vapor & ice-melt chains.',
        body: 'As oceans warm, extra water vapor enters the sky—trapping even more heat—while melting ice exposes dark sea water that absorbs extra light. First make your prediction, then pilot Earth’s orbit inward!',
        callout: 'Goal: Predict the outcome, slide to 0.85 AU, then cool CO₂.',
      },
    ],
    ctaLabel: 'Make Prediction & Begin',
  },
  CH3: {
    chapterNum: 3,
    stageId: 'CH3',
    eyebrow: 'Mission Briefing · Chapter 3',
    title: 'Under a Red Sun',
    subtitle: 'Can liquid water survive around TRAPPIST-1?',
    accentColor: 'orange',
    beats: [
      {
        badge: 'Clue #1 · A Tiny Red Dwarf Star',
        headline: 'TRAPPIST-1 glows at 2,566 K — far dimmer than our Sun.',
        body: 'This ultra-cool M-dwarf emits mostly red and infrared light with less than 0.1% of the Sun’s brightness. At Earth’s normal distance, any planet around it would freeze instantly.',
        callout: 'Habitable Zone shrinks inward to ~0.025–0.051 AU!',
      },
      {
        badge: 'Clue #2 · Eternal Day & Eternal Night',
        headline: 'Snuggling close brings amber skies & tidal locking.',
        body: 'Inside the green Habitable Zone, gravity can lock one side of the planet forever toward the red star while the far side sleeps in starry night. Switch stars and explore how alien skies glow!',
        callout: 'Goal: Switch to TRAPPIST-1, find the green zone & inspect the sky.',
      },
    ],
    ctaLabel: 'Explore Red Sun',
  },
};
