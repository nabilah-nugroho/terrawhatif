import type { SimParams, SimResult, StageId } from '../types/observatory';

export interface QuestStep {
  id: string;
  text: string;
  done: boolean;
  terraLine: string;
  successTitle: string;
  successInsight: string;
  understandConceptId: string;
  spotlightLandmarks?: string[];
  spotlightControl?: 'co2' | 'orbit' | 'star' | 'prediction';
}

export interface ChapterQuest {
  title: string;
  subtitle: string;
  steps: QuestStep[];
  activeStepIndex: number; // 0..2, or 3 when all done
  completedCount: number;
  allDone: boolean;
  currentTerraText: string;
  missionAnalogy: string;
  missionTakeaways: string[];
  currentUnderstandId: string;
  spotlightLandmarks: string[];
  spotlightControl: 'co2' | 'orbit' | 'star' | 'prediction' | null;
}

export interface QuestProgress {
  ch1Co2Warmed: boolean;
  ch2PredAnswered: boolean;
  ch2OrbitReached: boolean;
}

export function evaluateChapterQuest(
  stage: StageId,
  params: SimParams,
  simResult: SimResult,
  inspectedIds: Set<string>,
  progress: QuestProgress
): ChapterQuest | null {
  if (stage === 'INTRO' || stage === 'EPILOG') return null;

  let title = '';
  let subtitle = '';
  let steps: QuestStep[] = [];
  let doneTerra = '';
  let missionAnalogy = '';
  let missionTakeaways: string[] = [];

  if (stage === 'CH1') {
    title = 'The Heat Blanket';
    subtitle = 'Chapter 1 of 3';
    doneTerra =
      'Awesome work! You solved why Earth averages a cozy +15°C instead of freezing solid at -18°C.';
    missionAnalogy =
      'Think of Earth’s air like a winter blanket: sunlight warms the ocean, and greenhouse gases slow how fast that warmth escapes back into space.';
    missionTakeaways = [
      'Without greenhouse gases, Earth loses heat fast and freezes at -18°C.',
      'Doubling CO₂ thickens the blanket, trapping extra warmth until outgoing energy catches up.',
    ];
    steps = [
      {
        id: 'ch1-1',
        text: 'Tap the glowing Thermometer (i) on the right cliff.',
        done: inspectedIds.has('thermometer'),
        terraLine:
          'Step 1 of 3: Walk over or tap the glowing Thermometer (i) on the right cliff to check Earth’s temperature!',
        successTitle: 'Cozy Blanket Found! (+33°C)',
        successInsight:
          'Earth’s air keeps us at +15°C instead of freezing at -18°C—our atmosphere acts like a winter blanket slowing heat escape!',
        understandConceptId: 'thermometer',
        spotlightLandmarks: ['thermometer'],
      },
      {
        id: 'ch1-2',
        text: 'Tap Polar Ice (i) and Gas Valve (i) to inspect them.',
        done: inspectedIds.has('ice') && inspectedIds.has('valve'),
        terraLine:
          'Step 2 of 3: Tap Polar Ice (i) and Gas Valve (i) to discover the Ice Mirror and Heat Blanket!',
        successTitle: 'Ice Mirror & Gas Valve Paired!',
        successInsight:
          'White ice reflects sunlight like a mirror while CO₂ traps outgoing heat—together they steer Earth’s thermostat.',
        understandConceptId: inspectedIds.has('ice') ? 'valve' : 'ice',
        spotlightLandmarks: [
          ...(!inspectedIds.has('ice') ? ['ice'] : []),
          ...(!inspectedIds.has('valve') ? ['valve'] : []),
        ],
      },
      {
        id: 'ch1-3',
        text: 'Drag the CO₂ slider up past 560 ppm to see Earth warm up.',
        done: progress.ch1Co2Warmed || (!params.noGreenhouse && params.co2_ppm >= 560),
        terraLine:
          'Step 3 of 3: Drag the CO₂ Heat Blanket slider past 560 ppm and watch Earth warm up!',
        successTitle: 'Heat Blanket Thickened!',
        successInsight:
          'Extra CO₂ doesn’t add sunlight—it slows warmth escaping into space, causing ocean and air temperatures to climb.',
        understandConceptId: 'valve',
        spotlightControl: 'co2',
      },
    ];
  } else if (stage === 'CH2') {
    title = 'Too Close to the Sun';
    subtitle = 'Chapter 2 of 3';
    doneTerra =
      'Mission complete! You saw how moving closer multiplies sunlight and how thinning the Heat Blanket cools Earth back down.';
    missionAnalogy =
      'Starlight works like a flashlight beam: step closer and light packs much tighter onto every meter—then warm oceans add steam that amplifies heat!';
    missionTakeaways = [
      'Moving 15% closer (0.85 AU) packs 38% more sunlight onto every square meter of Earth.',
      'Warm air holds extra invisible water vapor, creating a multiplier loop that boosts warming.',
    ];
    steps = [
      {
        id: 'ch2-1',
        text: "Answer TERRA's quick prediction question.",
        done: progress.ch2PredAnswered,
        terraLine:
          'Step 1 of 3: Answer TERRA’s quick prediction question before we move Earth’s orbit!',
        successTitle: 'Flashlight Rule Unlocked!',
        successInsight:
          'Moving 15% closer to the Sun packs 38% more sunlight per meter—just like holding a flashlight closer to a wall!',
        understandConceptId: 'lever',
        spotlightControl: 'prediction',
      },
      {
        id: 'ch2-2',
        text: 'Drag the Orbit slider inward to 0.85 AU.',
        done: progress.ch2OrbitReached || params.a_AU <= 0.855,
        terraLine:
          'Step 2 of 3: Slide the Orbit rocket inward to 0.85 AU and watch sunlight and steam surge!',
        successTitle: '38% Sunlight Surge Observed!',
        successInsight:
          'Closer to the Sun, rising ocean steam traps even more warmth—showing how water vapor amplifies heating!',
        understandConceptId: 'lever',
        spotlightControl: 'orbit',
      },
      {
        id: 'ch2-3',
        text: 'Lower CO₂ until temperature drops below 47°C (320 K).',
        done:
          (progress.ch2OrbitReached || params.a_AU <= 0.855) &&
          simResult.T_surface < 320,
        terraLine:
          'Step 3 of 3: Lower the CO₂ Heat Blanket slider until Earth cools below 47°C (320 K)!',
        successTitle: 'Inner-Orbit Heat Balanced!',
        successInsight:
          'Thinning the CO₂ Heat Blanket lets extra heat escape faster, cooling the planet back into the safe liquid-water zone.',
        understandConceptId: 'vapor',
        spotlightControl: 'co2',
      },
    ];
  } else {
    title = 'Red Sun TRAPPIST-1';
    subtitle = 'Chapter 3 of 3';
    doneTerra =
      'Amazing discovery! You found liquid oceans around a tiny red dwarf star and decoded its amber sky.';
    missionAnalogy =
      'Trading our Sun for a dim red dwarf is like swapping a giant bonfire for a small campfire—you have to scoot close to stay warm!';
    missionTakeaways = [
      'Cool red stars pull the Habitable Zone 34× closer (~0.029 AU vs 1.00 AU).',
      'Little blue starlight turns the sky sunset-amber, and close-in gravity causes one-side day & night.',
    ];
    steps = [
      {
        id: 'ch3-1',
        text: 'Switch Host Star to TRAPPIST-1 in the top-right card.',
        done: params.starKey === 'trappist1',
        terraLine:
          'Step 1 of 3: Tap TRAPPIST-1 in the Host Star card on the top-right to visit a red dwarf star!',
        successTitle: 'Arrived at a Red Dwarf Star!',
        successInsight:
          'TRAPPIST-1 is far smaller and dimmer than our Sun—like trading a bright bonfire for a cozy glowing campfire.',
        understandConceptId: 'starmap',
        spotlightControl: 'star',
      },
      {
        id: 'ch3-2',
        text: 'Slide Orbit into the green Habitable Zone (~0.029 AU).',
        done: params.starKey === 'trappist1' && simResult.inHZ,
        terraLine:
          'Step 2 of 3: Slide the Orbit lever into TRAPPIST-1’s green Habitable Zone (~0.029 AU)!',
        successTitle: 'Liquid-Water Zone Found!',
        successInsight:
          'Because the red campfire is so dim, a world must orbit 34× closer than Earth to keep oceans warm and liquid!',
        understandConceptId: 'starmap',
        spotlightControl: 'orbit',
      },
      {
        id: 'ch3-3',
        text: 'Tap Red Sky (i) and Day-Night Line (i) to inspect the sky.',
        done: inspectedIds.has('sky') && inspectedIds.has('terminator'),
        terraLine:
          'Step 3 of 3: Tap Red Sky (i) and Day-Night Line (i) to see why the sky turns amber and one side stays night!',
        successTitle: 'Alien Sky & Tidal Lock Decoded!',
        successInsight:
          'Red stars give off scarce blue light (making skies amber), while strong close-in gravity locks one face in endless noon.',
        understandConceptId: inspectedIds.has('sky') ? 'terminator' : 'sky',
        spotlightLandmarks: [
          ...(!inspectedIds.has('sky') ? ['sky'] : []),
          ...(!inspectedIds.has('terminator') ? ['terminator'] : []),
        ],
      },
    ];
  }

  const completedCount = steps.filter((s) => s.done).length;
  const firstIncomplete = steps.findIndex((s) => !s.done);
  const activeStepIndex = firstIncomplete === -1 ? steps.length : firstIncomplete;
  const allDone = completedCount === steps.length;
  const activeStep = allDone ? null : steps[activeStepIndex];

  return {
    title,
    subtitle,
    steps,
    activeStepIndex,
    completedCount,
    allDone,
    currentTerraText: activeStep ? activeStep.terraLine : doneTerra,
    missionAnalogy,
    missionTakeaways,
    currentUnderstandId: activeStep
      ? activeStep.understandConceptId
      : steps[steps.length - 1].understandConceptId,
    spotlightLandmarks: activeStep?.spotlightLandmarks ?? [],
    spotlightControl: activeStep?.spotlightControl ?? null,
  };
}

