import type { SimParams } from '../types/observatory';

export interface WhatIfPreset {
  id: string;
  label: string;
  tag: string;
  patch: Partial<SimParams>;
  insightTitle: string;
  insightText: string;
}

export const WHAT_IF_PRESETS: WhatIfPreset[] = [
  {
    id: 'earth',
    label: 'Earth Today',
    tag: '+15°C',
    patch: {
      starKey: 'sun',
      a_AU: 1.0,
      co2_ppm: 280,
      ch4_ppb: 800,
      noGreenhouse: false,
    },
    insightTitle: 'Earth Baseline Restored (+15°C)',
    insightText:
      'Back at 1.00 AU with 280 ppm CO₂: oceans stay liquid, polar ice reflects 30% of sunlight, and our Heat Blanket gives a cozy +33°C boost.',
  },
  {
    id: 'snowball',
    label: 'Snowball Earth',
    tag: 'Frozen',
    patch: {
      starKey: 'sun',
      a_AU: 1.08,
      co2_ppm: 120,
      ch4_ppb: 300,
      noGreenhouse: false,
    },
    insightTitle: 'Snowball Earth Activated!',
    insightText:
      'Wider orbit + thin CO₂ lets ice spread across the oceans. Bright white ice then bounces away over 50% of sunlight—locking the planet in deep freeze!',
  },
  {
    id: 'doubled',
    label: '2× CO₂ Future',
    tag: 'Warmer',
    patch: {
      starKey: 'sun',
      a_AU: 1.0,
      co2_ppm: 560,
      ch4_ppb: 1800,
      noGreenhouse: false,
    },
    insightTitle: 'Doubled CO₂ (560 ppm) Tested!',
    insightText:
      'Thickening the Heat Blanket traps extra outgoing infrared heat, warming Earth several degrees and shrinking polar sea ice.',
  },
  {
    id: 'venus',
    label: 'Runaway Heat',
    tag: 'Steam!',
    patch: {
      starKey: 'sun',
      a_AU: 0.85,
      co2_ppm: 1500,
      ch4_ppb: 2500,
      noGreenhouse: false,
    },
    insightTitle: 'Runaway Steam Greenhouse!',
    insightText:
      '38% stronger sunlight at 0.85 AU plus thick CO₂ boils surface moisture into heat-trapping steam—showing how Venus overheated!',
  },
  {
    id: 'trappist',
    label: 'TRAPPIST-1 e',
    tag: 'Red Sun',
    patch: {
      starKey: 'trappist1',
      a_AU: 0.02925,
      co2_ppm: 280,
      ch4_ppb: 800,
      noGreenhouse: false,
    },
    insightTitle: 'Arrived at Exoplanet TRAPPIST-1 e!',
    insightText:
      'Orbiting 34× closer to a dim red dwarf gives Earth-like warmth, sunset-amber skies, and one-side eternal day!',
  },
];
