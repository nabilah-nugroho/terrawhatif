import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Eye,
  EyeOff,
  FlaskConical,
  Footprints,
  Globe,
  HelpCircle,
  Info,
  Lightbulb,
  Snowflake,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AudioManager } from './audio/AudioManager';
import { VoiceNarrator, type VoiceContext } from './audio/VoiceNarrator';
import { STARS, simulate } from './engine/physics.js';
import starsData from './engine/stars.json';
import trendsData from './engine/trends.json';
import {
  EARTH_BASELINE,
  buildConceptState,
  type SimParams,
  type SimResult,
  type StageId,
  type StarKey,
} from './types/observatory';
import { evaluateChapterQuest, type QuestProgress, type QuestStep } from './data/quests';
import type { WhatIfPreset } from './data/presets';
import { evaluateDetectiveStatus } from './data/badges';
import {
  Observatory3D,
  type CameraCommand,
  type CameraPresetId,
  type FocusLandmarkCommand,
} from './components/Observatory3D';
import { TerraAvatar, type TerraMood } from './components/TerraAvatar';
import { ConceptCard } from './components/ConceptCard';
import { ControlDeck } from './components/ControlDeck';
import { NotebookDrawer } from './components/NotebookDrawer';
import { MiniPredictionModal } from './components/MiniPredictionModal';
import { ScienceLabView } from './components/ScienceLabView';
import { NavigatorMissionCard } from './components/NavigatorMissionCard';
import { StarSwitcherCard } from './components/StarSwitcherCard';
import { RewardBanner, type RewardEvent } from './components/RewardBanner';
import { ChapterStoryModal } from './components/ChapterStoryModal';
import { DetectiveBadgesModal } from './components/DetectiveBadgesModal';
import { IntroBriefingCard } from './components/IntroBriefingCard';
import { ControlsHelpModal } from './components/ControlsHelpModal';
import { MissionDebriefModal } from './components/MissionDebriefModal';
import { FeatureTourOverlay } from './components/FeatureTourOverlay';
import { BrandMark } from './components/BrandMark';
import { HudCorners, SectionCodeTag, SegmentedGauge } from './components/HudReticleFrame';

const STAGES: { id: StageId; label: string }[] = [
  { id: 'INTRO', label: 'Start' },
  { id: 'CH1', label: 'Ch 1' },
  { id: 'CH2', label: 'Ch 2' },
  { id: 'CH3', label: 'Ch 3' },
];

export default function App() {
  const [stage, setStage] = useState<StageId>('INTRO');
  const [params, setParams] = useState<SimParams>(EARTH_BASELINE);
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [inspectedIds, setInspectedIds] = useState<Set<string>>(() => new Set());
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [scienceLabOpen, setScienceLabOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [terraCollapsedMobile, setTerraCollapsedMobile] = useState(false);
  const [miniPredOpen, setMiniPredOpen] = useState(false);
  const [miniPredShownOnce, setMiniPredShownOnce] = useState(false);
  const [storyStage, setStoryStage] = useState<'CH1' | 'CH2' | 'CH3' | null>(null);
  const seenStoriesRef = useRef<Set<string>>(new Set());
  const hasAutoTourRunRef = useRef(false);
  const openCh1StoryAfterTourRef = useRef(false);

  const [completedChapters, setCompletedChapters] = useState<Set<StageId>>(() => new Set());
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<'CH1' | 'CH2' | 'CH3'>>(
    () => new Set()
  );
  const [hasPlayedTrend, setHasPlayedTrend] = useState(false);
  const [trendReplayIdx, setTrendReplayIdx] = useState<number | null>(null);
  const trendTimerRef = useRef<number | undefined>(undefined);
  const trendEndTimerRef = useRef<number | undefined>(undefined);
  const suppressWrongRef = useRef<boolean>(false);

  const [questProgress, setQuestProgress] = useState<QuestProgress>({
    ch1Co2Warmed: false,
    ch2PredAnswered: false,
    ch2OrbitReached: false,
  });

  const audioRef = useRef<AudioManager | null>(null);
  const voiceRef = useRef<VoiceNarrator | null>(null);
  const [terraSpokenLine, setTerraSpokenLine] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [thirdPersonMode, setThirdPersonMode] = useState(true);
  const [celebrateNonce, setCelebrateNonce] = useState(0);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
  const [focusLandmark, setFocusLandmark] = useState<FocusLandmarkCommand | null>(null);
  const [activeCamPreset, setActiveCamPreset] = useState<CameraPresetId>('observatory');
  const [reward, setReward] = useState<RewardEvent | null>(null);
  const rewardTimerRef = useRef<number | undefined>(undefined);
  const lastWrongHintRef = useRef<string>('');
  const prevQuestRef = useRef<{
    stage: StageId;
    count: number;
    allDone: boolean;
    doneIds: string[];
  }>({
    stage: 'INTRO',
    count: 0,
    allDone: false,
    doneIds: [],
  });

  const showFeedbackBanner = (
    event: Omit<RewardEvent, 'id'>,
    durationMs: number
  ) => {
    if (rewardTimerRef.current !== undefined) {
      window.clearTimeout(rewardTimerRef.current);
    }
    setReward({ ...event, id: Date.now() });
    rewardTimerRef.current = window.setTimeout(() => {
      setReward(null);
      rewardTimerRef.current = undefined;
    }, durationMs);
  };

  const simResult = useMemo<SimResult>(() => {
    const star = STARS[params.starKey];
    return simulate({
      star,
      a_AU: params.a_AU,
      co2_ppm: params.co2_ppm,
      ch4_ppb: params.ch4_ppb,
      noGreenhouse: params.noGreenhouse,
    }) as SimResult;
  }, [params]);

  const conceptState = useMemo(
    () => buildConceptState(params, simResult),
    [params, simResult]
  );

  const quest = useMemo(
    () => evaluateChapterQuest(stage, params, simResult, inspectedIds, questProgress),
    [stage, params, simResult, inspectedIds, questProgress]
  );

  const detectiveStatus = useMemo(
    () =>
      evaluateDetectiveStatus({
        completedChapters,
        completedQuizzes,
        inspectedCount: inspectedIds.size,
        hasPlayedTrend,
      }),
    [completedChapters, completedQuizzes, inspectedIds.size, hasPlayedTrend]
  );

  const applyParamsPatch = (patch: Partial<SimParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      if (stage === 'CH1' && !next.noGreenhouse && next.co2_ppm >= 560) {
        setQuestProgress((qp) => (qp.ch1Co2Warmed ? qp : { ...qp, ch1Co2Warmed: true }));
      }
      if (stage === 'CH2' && next.a_AU <= 0.855) {
        setQuestProgress((qp) => (qp.ch2OrbitReached ? qp : { ...qp, ch2OrbitReached: true }));
      }
      return next;
    });
  };

  const handleChangeParams = (patch: Partial<SimParams>) => {
    suppressWrongRef.current = false;
    applyParamsPatch(patch);
  };

  const handleSelectPreset = (preset: WhatIfPreset) => {
    stopRealTrendReplay();
    suppressWrongRef.current = true;
    applyParamsPatch(preset.patch);
    audioRef.current?.playStepSuccess();
    showFeedbackBanner(
      {
        kind: 'step',
        title: preset.insightTitle,
        subtitle: preset.insightText,
      },
      5400
    );
  };

  const handleSwitchStar = (starKey: StarKey) => {
    suppressWrongRef.current = false;
    setParams((prev) => {
      if (prev.starKey === starKey) return prev;
      const defaultOrbit =
        starKey === 'trappist1'
          ? starsData['TRAPPIST-1'].planets['TRAPPIST-1 e'].pl_orbsmax
          : 1.0;
      return {
        ...prev,
        starKey,
        a_AU: defaultOrbit,
      };
    });
  };

  const handleResetBaseline = () => {
    stopRealTrendReplay();
    suppressWrongRef.current = true;
    setParams(EARTH_BASELINE);
  };

  const stopRealTrendReplay = () => {
    if (trendTimerRef.current !== undefined) {
      window.clearInterval(trendTimerRef.current);
      trendTimerRef.current = undefined;
    }
    if (trendEndTimerRef.current !== undefined) {
      window.clearTimeout(trendEndTimerRef.current);
      trendEndTimerRef.current = undefined;
    }
    setTrendReplayIdx(null);
  };

  const startOrToggleRealTrend = () => {
    if (trendReplayIdx !== null) {
      stopRealTrendReplay();
      return;
    }
    stopRealTrendReplay();
    if (stage === 'INTRO') setStage('CH1');
    setScienceLabOpen(false);
    setBadgesOpen(false);
    setActiveConceptId(null);
    setHasPlayedTrend(true);
    suppressWrongRef.current = true;

    const totalPoints = trendsData.variables.arctic_surface_temp.data.length;
    let idx = 0;

    const pushFrame = (frameIdx: number) => {
      const frac = frameIdx / Math.max(1, totalPoints - 1);
      setTrendReplayIdx(frameIdx);
      setParams({
        starKey: 'sun',
        a_AU: 1.0,
        noGreenhouse: false,
        co2_ppm: Math.round(375 + frac * 51),
        ch4_ppb: Math.round(1770 + frac * 165),
      });
    };

    pushFrame(0);
    audioRef.current?.playStoryBeat();

    trendTimerRef.current = window.setInterval(() => {
      idx += 1;
      if (idx >= totalPoints) {
        if (trendTimerRef.current !== undefined) {
          window.clearInterval(trendTimerRef.current);
          trendTimerRef.current = undefined;
        }
        audioRef.current?.playStepSuccess();
        showFeedbackBanner(
          {
            kind: 'mission',
            title: 'NASA Giovanni Replay Complete (2003 → 2025)!',
            subtitle:
              'Over 22 real satellite years, rising CO₂ (+51 ppm) and falling Arctic sea-ice albedo amplified Arctic warming faster than the tropics.',
          },
          6200
        );
        trendEndTimerRef.current = window.setTimeout(() => {
          setTrendReplayIdx(null);
          trendEndTimerRef.current = undefined;
        }, 1400);
        return;
      }
      pushFrame(idx);
    }, 240);
  };

  const handleSelectHotspot = (id: string) => {
    setActiveConceptId(id);
    setInspectedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const openChapterStory = (chStage: 'CH1' | 'CH2' | 'CH3') => {
    setStoryStage(chStage);
    const num = chStage === 'CH1' ? 1 : chStage === 'CH2' ? 2 : 3;
    audioRef.current?.playChapterIntro(num);
  };

  const startFeatureTour = () => {
    if (stage === 'INTRO') setStage('CH1');
    setHudHidden(false);
    setTerraCollapsedMobile(false);
    setActiveConceptId(null);
    setScienceLabOpen(false);
    setBadgesOpen(false);
    setNotebookOpen(false);
    setTourOpen(true);
  };

  const handleCloseTour = (completed: boolean) => {
    setTourOpen(false);
    if (completed) {
      audioRef.current?.playStepSuccess();
    }
    if (openCh1StoryAfterTourRef.current) {
      openCh1StoryAfterTourRef.current = false;
      if (!seenStoriesRef.current.has('CH1')) {
        seenStoriesRef.current.add('CH1');
        window.setTimeout(() => {
          openChapterStory('CH1');
        }, 160);
      }
    }
  };

  const handleCompleteStory = () => {
    const closingStage = storyStage;
    setStoryStage(null);
    audioRef.current?.playStoryBeat();
    if (closingStage === 'CH2' && !miniPredShownOnce) {
      setMiniPredOpen(true);
      setMiniPredShownOnce(true);
    }
  };

  const goToStage = (nextStage: StageId) => {
    if (nextStage === 'EPILOG') {
      setScienceLabOpen(true);
      setActiveConceptId(null);
      return;
    }
    setStage(nextStage);
    setActiveConceptId(null);
    if (nextStage === 'CH1' && !hasAutoTourRunRef.current) {
      hasAutoTourRunRef.current = true;
      openCh1StoryAfterTourRef.current = !seenStoriesRef.current.has('CH1');
      window.setTimeout(() => {
        setHudHidden(false);
        setTerraCollapsedMobile(false);
        setTourOpen(true);
      }, 120);
      return;
    }
    if (nextStage === 'CH1' || nextStage === 'CH2' || nextStage === 'CH3') {
      if (!seenStoriesRef.current.has(nextStage)) {
        seenStoriesRef.current.add(nextStage);
        openChapterStory(nextStage);
        return;
      }
    }
    if (nextStage === 'CH2' && !miniPredShownOnce) {
      setMiniPredOpen(true);
      setMiniPredShownOnce(true);
    }
  };

  // Climate mood for TERRA, Top Temperature Gauge & Ambient AudioManager
  const mood: TerraMood =
    simResult.T_surface < 273.15 ||
    simResult.waterPhase === 'frozen' ||
    simResult.waterPhase === 'mostlyFrozen'
      ? 'frozen'
      : simResult.T_surface >= 315 || simResult.runaway
        ? 'hot'
        : 'temperate';

  const voiceCtxRef = useRef<VoiceContext>({
    mood,
    starKey: params.starKey,
    stage,
    tempC: simResult.T_surface - 273.15,
    runaway: simResult.runaway,
  });
  useEffect(() => {
    voiceCtxRef.current = {
      mood,
      starKey: params.starKey,
      stage,
      tempC: simResult.T_surface - 273.15,
      runaway: simResult.runaway,
    };
  }, [mood, params.starKey, stage, simResult.T_surface, simResult.runaway]);

  const gameplayVoiceEligibleRef = useRef(false);
  useEffect(() => {
    gameplayVoiceEligibleRef.current =
      stage !== 'INTRO' &&
      !soundMuted &&
      !storyStage &&
      !tourOpen &&
      !scienceLabOpen &&
      !miniPredOpen &&
      !badgesOpen &&
      !debriefOpen &&
      !helpOpen;
  }, [
    stage,
    soundMuted,
    storyStage,
    tourOpen,
    scienceLabOpen,
    miniPredOpen,
    badgesOpen,
    debriefOpen,
    helpOpen,
  ]);

  useEffect(() => {
    const manager = new AudioManager();
    audioRef.current = manager;
    manager.setMuted(soundMuted);
    manager.setMood(mood);
    manager.setIntroMusicActive(stage === 'INTRO');

    const narrator = new VoiceNarrator((speaking, text) => {
      manager.setVoiceDucking(speaking);
      setTerraSpokenLine(speaking ? text : null);
    });
    narrator.setMuted(soundMuted);
    voiceRef.current = narrator;

    const unlockOnce = () => {
      if (!manager.isMuted()) {
        manager.unlock();
      }
    };
    window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true });
    window.addEventListener('keydown', unlockOnce, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
      if (trendTimerRef.current !== undefined) window.clearInterval(trendTimerRef.current);
      if (trendEndTimerRef.current !== undefined) window.clearTimeout(trendEndTimerRef.current);
      narrator.dispose();
      voiceRef.current = null;
      manager.dispose();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    audioRef.current?.setMood(mood);
  }, [mood]);

  useEffect(() => {
    audioRef.current?.setIntroMusicActive(stage === 'INTRO');
    if (stage === 'INTRO') {
      voiceRef.current?.stop();
    }
  }, [stage]);

  useEffect(() => {
    const ch =
      storyStage === 'CH1'
        ? 1
        : storyStage === 'CH2'
          ? 2
          : storyStage === 'CH3'
            ? 3
            : null;
    audioRef.current?.setStoryChapter(ch);
  }, [storyStage]);

  // Occasional calm ambient voice lines throughout active gameplay
  const hasSpokenWelcomeRef = useRef(false);
  const prevVoiceMoodRef = useRef<TerraMood>(mood);
  const prevVoiceStarRef = useRef<StarKey>(params.starKey);

  useEffect(() => {
    if (
      stage === 'INTRO' ||
      soundMuted ||
      storyStage ||
      tourOpen ||
      scienceLabOpen ||
      miniPredOpen ||
      badgesOpen ||
      debriefOpen ||
      helpOpen
    ) {
      return;
    }

    let timeoutId: number | undefined;
    let cancelled = false;

    const scheduleNext = (delayMs: number, forceGeneral = false) => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        const narrator = voiceRef.current;
        if (
          narrator &&
          gameplayVoiceEligibleRef.current &&
          !narrator.isSpeaking() &&
          Date.now() - narrator.getLastSpokenAt() > 16000
        ) {
          audioRef.current?.playCommsChirp();
          narrator.speakContextual(voiceCtxRef.current, forceGeneral);
        }
        if (!cancelled) {
          scheduleNext(28000 + Math.random() * 11000, false);
        }
      }, delayMs);
    };

    if (!hasSpokenWelcomeRef.current) {
      hasSpokenWelcomeRef.current = true;
      scheduleNext(6500, true);
    } else {
      scheduleNext(26000 + Math.random() * 9000, false);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [
    stage,
    soundMuted,
    storyStage,
    tourOpen,
    scienceLabOpen,
    miniPredOpen,
    badgesOpen,
    debriefOpen,
    helpOpen,
  ]);

  // Trigger a contextual voice observation on major climate mood or host-star shifts (throttled)
  useEffect(() => {
    const moodChanged = prevVoiceMoodRef.current !== mood;
    const starChanged = prevVoiceStarRef.current !== params.starKey;
    prevVoiceMoodRef.current = mood;
    prevVoiceStarRef.current = params.starKey;

    if ((!moodChanged && !starChanged) || !gameplayVoiceEligibleRef.current) return;

    const timer = window.setTimeout(() => {
      const narrator = voiceRef.current;
      if (
        narrator &&
        gameplayVoiceEligibleRef.current &&
        !narrator.isSpeaking() &&
        Date.now() - narrator.getLastSpokenAt() > 18000
      ) {
        audioRef.current?.playCommsChirp();
        narrator.speakContextual(voiceCtxRef.current, false);
      }
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [mood, params.starKey]);

  // Rewarding audio & intuitive explanation when a step or full chapter mission completes
  useEffect(() => {
    if (!quest) {
      prevQuestRef.current = { stage, count: 0, allDone: false, doneIds: [] };
      lastWrongHintRef.current = '';
      return;
    }

    const doneIds = quest.steps.filter((s) => s.done).map((s) => s.id);
    const prev = prevQuestRef.current;

    if (prev.stage !== stage) {
      prevQuestRef.current = {
        stage,
        count: quest.completedCount,
        allDone: quest.allDone,
        doneIds,
      };
      lastWrongHintRef.current = '';
      return;
    }

    if (quest.allDone && !prev.allDone) {
      audioRef.current?.playMissionComplete();
      setCelebrateNonce((n) => n + 1);
      window.setTimeout(() => {
        voiceRef.current?.speakCheer();
      }, 260);
      setCompletedChapters((prevSet) => {
        if (prevSet.has(stage)) return prevSet;
        const next = new Set(prevSet);
        next.add(stage);
        return next;
      });
      lastWrongHintRef.current = '';
      showFeedbackBanner(
        {
          kind: 'mission',
          title: `${quest.title} Complete!`,
          subtitle: quest.missionAnalogy,
          hint:
            stage === 'CH3'
              ? 'View your Mission Summary or explore Science Lab!'
              : 'Ready for the next planetary experiment!',
          actionLabel: stage === 'CH3' ? 'View Mission Summary' : 'Next Chapter',
          onAction: () => {
            if (stage === 'CH3') {
              setDebriefOpen(true);
            } else {
              goToStage(stage === 'CH1' ? 'CH2' : 'CH3');
            }
          },
        },
        8200
      );
    } else if (quest.completedCount > prev.count) {
      audioRef.current?.playStepSuccess();
      lastWrongHintRef.current = '';
      const newlyCompleted =
        quest.steps.find((s) => s.done && !prev.doneIds.includes(s.id)) ??
        quest.steps[quest.completedCount - 1];
      showFeedbackBanner(
        {
          kind: 'step',
          title: newlyCompleted?.successTitle ?? `Step ${quest.completedCount} of 3 Verified!`,
          subtitle:
            newlyCompleted?.successInsight ?? 'Nice discovery — keep exploring!',
        },
        5200
      );
    }

    prevQuestRef.current = {
      stage,
      count: quest.completedCount,
      allDone: quest.allDone,
      doneIds,
    };
  }, [stage, quest]);

  // Intuitive off-track / "what went wrong" explanations during active experiments
  useEffect(() => {
    if (
      !quest ||
      quest.allDone ||
      storyStage ||
      scienceLabOpen ||
      miniPredOpen ||
      badgesOpen ||
      trendReplayIdx !== null ||
      suppressWrongRef.current
    )
      return;
    const activeStep = quest.steps[quest.activeStepIndex];
    if (!activeStep) return;

    let hintKey = '';
    let title = '';
    let subtitle = '';
    let hint = '';

    if (activeStep.id === 'ch1-3') {
      if (params.noGreenhouse) {
        hintKey = 'ch1-noair';
        title = 'Oops — You Removed Earth’s Blanket!';
        subtitle =
          'With zero greenhouse gas, warmth escapes straight into space and oceans freeze solid at -18°C!';
        hint = 'Turn "Earth Without Air" OFF, then slide CO₂ UP past 560 ppm.';
      } else if (params.co2_ppm <= 150) {
        hintKey = 'ch1-cold';
        title = 'Going Colder, Not Warmer!';
        subtitle =
          'Lowering CO₂ thins the Heat Blanket so Earth loses heat faster into space.';
        hint = 'Drag the CO₂ slider RIGHT past 560 ppm to warm Earth up!';
      }
    } else if (activeStep.id === 'ch2-2' && params.a_AU >= 1.08) {
      hintKey = 'ch2-far';
      title = 'Wrong Way — Moving Farther Out!';
      subtitle =
        'Pulling Earth away from the Sun spreads starlight thinner, cooling oceans toward ice.';
      hint = 'Drag Orbit Distance LEFT toward 0.85 AU!';
    } else if (activeStep.id === 'ch2-3' && params.co2_ppm >= 750) {
      hintKey = 'ch2-hot';
      title = 'Careful — Steam Runaway Heating!';
      subtitle =
        'Raising CO₂ at 0.85 AU traps the extra 38% sunlight PLUS rising ocean steam—pushing heat way up!';
      hint = 'Slide CO₂ Blanket DOWN (left) until Earth cools below 47°C.';
    } else if (activeStep.id === 'ch3-2' && params.starKey === 'trappist1') {
      if (params.a_AU < simResult.hzBounds.inner - 0.002) {
        hintKey = 'ch3-hot';
        title = 'Too Close to the Red Star!';
        subtitle = `Even a dim red dwarf boils oceans (${(simResult.T_surface - 273.15).toFixed(0)}°C) when a planet hugs it this tightly.`;
        hint = 'Slide Orbit RIGHT into the green Habitable Zone (~0.029 AU).';
      } else if (params.a_AU > simResult.hzBounds.outer + 0.004) {
        hintKey = 'ch3-cold';
        title = 'Too Far — Frozen in the Dark!';
        subtitle =
          'TRAPPIST-1 shines much dimmer than our Sun, so warmth fades quickly out here.';
        hint = 'Slide Orbit LEFT into the green Habitable Zone (~0.029 AU).';
      }
    }

    if (hintKey && lastWrongHintRef.current !== hintKey) {
      lastWrongHintRef.current = hintKey;
      audioRef.current?.playWrong();
      showFeedbackBanner({ kind: 'wrong', title, subtitle, hint }, 5600);
    } else if (!hintKey) {
      lastWrongHintRef.current = '';
    }
  }, [stage, quest, params, simResult, storyStage, scienceLabOpen, miniPredOpen, badgesOpen, trendReplayIdx]);

  const handleToggleSound = () => {
    if (!audioRef.current) return;
    const nextMuted = audioRef.current.toggleMute();
    voiceRef.current?.setMuted(nextMuted);
    setSoundMuted(nextMuted);
  };

  const handleSelectCameraPreset = (preset: CameraPresetId) => {
    setThirdPersonMode(false);
    setActiveCamPreset(preset);
    setCameraCommand({ preset, nonce: Date.now() });
  };

  const handleSelectQuestStep = (step: QuestStep) => {
    if (step.spotlightControl === 'prediction' && !step.done) {
      setMiniPredOpen(true);
      return;
    }
    const targetId = step.spotlightLandmarks?.[0] ?? step.understandConceptId;
    if (targetId) {
      setFocusLandmark({ id: targetId, nonce: Date.now() });
      audioRef.current?.playStoryBeat();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setHudHidden((prev) => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        setThirdPersonMode((prev) => !prev);
      } else if (e.key === '?') {
        setHelpOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const tempC = simResult.T_surface - 273.15;
  const gaugeFillPct = Math.max(8, Math.min(100, ((tempC + 40) / 140) * 100));
  const gaugeTheme =
    mood === 'frozen'
      ? {
          bar: 'bg-cyan-400',
          segTone: 'cyan' as const,
          text: 'text-cyan-300',
          glyph: '❄',
          shortStatus: 'Frozen',
          status: 'Frozen',
        }
      : mood === 'hot'
        ? {
            bar: 'bg-amber-400',
            segTone: 'amber' as const,
            text: 'text-amber-300',
            glyph: '▲',
            shortStatus: 'Too Hot',
            status: 'Too Hot',
          }
        : {
            bar: 'bg-emerald-400',
            segTone: 'emerald' as const,
            text: 'text-emerald-300',
            glyph: '●',
            shortStatus: 'Liquid',
            status: 'Liquid Water',
          };

  const nextStageTarget: StageId =
    stage === 'CH1' ? 'CH2' : stage === 'CH2' ? 'CH3' : 'EPILOG';

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      {/* Full-Bleed Interactive 3D Three.js WebGL Observatory */}
      <Observatory3D
        stage={stage}
        starKey={params.starKey}
        params={params}
        simResult={simResult}
        activeConceptId={activeConceptId}
        inspectedIds={inspectedIds}
        spotlightLandmarks={quest?.spotlightLandmarks ?? []}
        cameraCommand={cameraCommand}
        focusLandmark={focusLandmark}
        thirdPersonMode={
          thirdPersonMode &&
          !storyStage &&
          !scienceLabOpen &&
          !miniPredOpen &&
          !badgesOpen &&
          !helpOpen &&
          !debriefOpen &&
          !tourOpen
        }
        hideLabels={hudHidden}
        celebrateNonce={celebrateNonce}
        onSelectLandmark={handleSelectHotspot}
        onFootstep={() => audioRef.current?.playFootstep()}
      />

      {/* Sleek Cinema Letterbox Bars (retract smoothly once Accept Mission is clicked) */}
      <div
        aria-hidden="true"
        className={`fixed top-0 left-0 right-0 h-12 sm:h-14 bg-black z-30 pointer-events-none transition-transform duration-700 ease-out ${
          stage === 'INTRO' ? 'translate-y-0' : '-translate-y-full'
        }`}
      />
      <div
        aria-hidden="true"
        className={`fixed bottom-0 left-0 right-0 h-12 sm:h-14 bg-black z-30 pointer-events-none transition-transform duration-700 ease-out ${
          stage === 'INTRO' ? 'translate-y-0' : 'translate-y-full'
        }`}
      />

      {/* Rewarding Step / Mission / Intuitive Off-Track Explanation Banner */}
      <RewardBanner
        reward={reward}
        onDismiss={() => {
          if (rewardTimerRef.current !== undefined) {
            window.clearTimeout(rewardTimerRef.current);
            rewardTimerRef.current = undefined;
          }
          setReward(null);
        }}
      />

      {/* LIVE NASA GIOVANNI 2003 → 2025 3D REPLAY HUD */}
      {trendReplayIdx !== null && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 obs-panel-strong rounded-[4px] px-4 py-2.5 border border-amber-400/50 w-[92vw] max-w-md space-y-2">
          <HudCorners tone="amber" />
          <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
            <div className="flex items-center gap-2 font-mono font-bold text-amber-200 uppercase tracking-wider text-[10.5px]">
              <span className="w-1.5 h-1.5 rounded-[1px] bg-amber-400" />
              <span>NASA Giovanni 3D Replay</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-300 tabular-nums">
                {2003 + trendReplayIdx}
              </span>
              <button
                type="button"
                onClick={stopRealTrendReplay}
                className="px-2 py-0.5 rounded-[3px] bg-rose-500/20 border border-rose-400/50 text-[10px] font-mono uppercase tracking-wider font-semibold text-rose-100 hover:bg-rose-500/35 flex items-center gap-1"
              >
                <Square className="w-2.5 h-2.5" />
                <span>Stop</span>
              </button>
            </div>
          </div>

          <div className="h-1.5 w-full rounded-[2px] bg-amber-500/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 transition-all duration-200"
              style={{
                width: `${Math.round(
                  ((trendReplayIdx + 1) / trendsData.variables.arctic_surface_temp.data.length) *
                    100
                )}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
            <div className="px-2 py-1 rounded-[3px] bg-black/40 border border-amber-400/20">
              <div className="text-[9.5px] text-slate-400 uppercase tracking-wider">Arctic Temp</div>
              <div className="text-emerald-300 font-semibold">
                {trendsData.variables.arctic_surface_temp.data[trendReplayIdx].toFixed(2)}°C
              </div>
            </div>
            <div className="px-2 py-1 rounded-[3px] bg-black/40 border border-amber-400/20">
              <div className="text-[9.5px] text-slate-400 uppercase tracking-wider">Ice Albedo</div>
              <div className="text-cyan-200 font-semibold">
                {trendsData.variables.arctic_sea_ice_albedo.data[trendReplayIdx].toFixed(3)}
              </div>
            </div>
            <div className="px-2 py-1 rounded-[3px] bg-black/40 border border-amber-400/20">
              <div className="text-[9.5px] text-slate-400 uppercase tracking-wider">Vapor</div>
              <div className="text-amber-200 font-semibold">
                {trendsData.variables.tropical_water_vapor.data[trendReplayIdx].toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROLOGUE (INTRO): Priority Space-Agency Transmission Briefing */}
      {stage === 'INTRO' && (
        <>
          <div className="fixed top-16 sm:top-18 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              aria-label={soundMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
              title={soundMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
              className="obs-panel p-2 rounded-[3px] text-slate-200 hover:text-amber-200 hover:border-amber-400/50 transition-colors"
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage('CH1');
                setScienceLabOpen(true);
              }}
              className="obs-panel px-3.5 py-2 rounded-[3px] text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-200 hover:text-emerald-200 hover:border-amber-400/50 transition-colors flex items-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5 text-emerald-300" />
              <span>Science Lab</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <IntroBriefingCard
            mood={mood}
            onAcceptMission={() => {
              if (!soundMuted) audioRef.current?.unlock();
              goToStage('CH1');
            }}
            onTypingTick={(accent) => audioRef.current?.playTypingTick(accent)}
            onReplayBriefing={() => {
              if (!soundMuted) audioRef.current?.unlock();
            }}
          />
        </>
      )}

      {/* OPEN-EDGE OBSERVATORY TELEMETRY RIBBON (Chapters 1–3) */}
      {stage !== 'INTRO' && !hudHidden && (
        <header className="fixed top-0 left-0 right-0 z-20 obs-ribbon px-3 sm:px-5 py-2 flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Brand Emblem + Phosphor Serif Wordmark + Observatory Context */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0 xl:shrink">
            <button
              type="button"
              onClick={() => setStage('INTRO')}
              className="flex items-center gap-2 shrink-0 group"
            >
              <BrandMark size={20} className="transition-transform duration-200 group-hover:scale-105" />
              <span className="font-title-phosphor text-lg sm:text-[21px] font-bold uppercase leading-none whitespace-nowrap">
                TerraWhatIf
              </span>
            </button>
            <span className="text-amber-400/35 hidden xl:inline shrink-0 font-mono text-xs" aria-hidden="true">
              /
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-200/80 truncate hidden xl:inline min-w-0">
              {quest ? `${quest.subtitle} · ${quest.title}` : 'Science Lab'}
            </span>
          </div>

          {/* Zone 2: Precision Segmented Horizon Climate Readout */}
          <div
            data-tour="temp-gauge"
            aria-label="Live planet temperature gauge"
            className="flex items-center gap-2.5 sm:gap-3 shrink-0"
          >
            <div className="flex items-baseline gap-1.5 tabular-nums font-mono">
              <span className={`text-sm sm:text-base font-bold whitespace-nowrap ${gaugeTheme.text}`}>
                {tempC >= 0 ? '+' : ''}
                {tempC.toFixed(0)}°C
              </span>
              <span className="hidden md:inline text-[10.5px] text-slate-400 whitespace-nowrap">
                {simResult.T_surface.toFixed(0)} K
              </span>
            </div>

            <SegmentedGauge
              valuePct={gaugeFillPct}
              segments={14}
              tone={gaugeTheme.segTone}
              className="hidden lg:flex"
            />

            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-wider whitespace-nowrap ${gaugeTheme.text}`}
            >
              <span aria-hidden="true" className="text-[9px]">
                {gaugeTheme.glyph}
              </span>
              <span className="xl:hidden">{gaugeTheme.shortStatus}</span>
              <span className="hidden xl:inline">{gaugeTheme.status}</span>
            </span>
          </div>

          {/* Zone 3: Camera Modes + Chapters + Compact Tools + Lab CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              data-tour="camera-modes"
              aria-label="Explorer & Camera Mode"
              className="flex items-center gap-0.5 p-0.5 rounded-[3px] bg-black/35 border border-amber-400/25"
            >
              <button
                type="button"
                onClick={() => setThirdPersonMode(true)}
                aria-pressed={thirdPersonMode}
                title="3rd-Person Astronaut Mode (V)"
                className={`px-1.5 sm:px-2 py-1 rounded-[2px] text-[10.5px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                  thirdPersonMode
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Footprints className="w-3 h-3 text-amber-300" />
                <span className="hidden lg:inline">Walk</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectCameraPreset('observatory')}
                aria-pressed={!thirdPersonMode && activeCamPreset === 'observatory'}
                title="Wide Observatory Overview Camera (V)"
                className={`px-1.5 sm:px-2 py-1 rounded-[2px] text-[10.5px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                  !thirdPersonMode && activeCamPreset === 'observatory'
                    ? 'bg-emerald-400/18 text-emerald-200'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3 h-3 text-emerald-300" />
                <span className="hidden md:inline">Overview</span>
              </button>
            </div>

            <div
              aria-label="3D Quick Zooms"
              className="hidden 2xl:flex items-center gap-2 pl-2 border-l border-amber-400/20 text-[10.5px] font-mono uppercase tracking-wider"
            >
              <button
                type="button"
                onClick={() => handleSelectCameraPreset('earth')}
                title="Zoom to 3D Spherical Earth"
                className={`flex items-center gap-1 transition-colors whitespace-nowrap ${
                  !thirdPersonMode && activeCamPreset === 'earth'
                    ? 'text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Earth</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectCameraPreset('ice')}
                title="Zoom to Polar Ice Shelf"
                className={`flex items-center gap-1 transition-colors whitespace-nowrap ${
                  !thirdPersonMode && activeCamPreset === 'ice'
                    ? 'text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Snowflake className="w-3 h-3" />
                <span>Ice</span>
              </button>
            </div>

            <nav
              aria-label="Chapters"
              className="hidden xl:flex items-center gap-2 pl-2 border-l border-amber-400/20"
            >
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStage(s.id)}
                  className={`py-0.5 text-[10.5px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap border-b ${
                    stage === s.id
                      ? 'text-emerald-300 border-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-amber-200 border-transparent'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-0.5 sm:pl-2 sm:border-l sm:border-amber-400/20">
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={soundMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
                title={soundMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
                className="p-1.5 rounded-[3px] text-slate-300 hover:text-emerald-300 hover:bg-white/8 transition-colors"
              >
                {soundMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="Controls and shortcuts guide"
                title="Controls & Shortcuts (?)"
                className="hidden sm:inline-flex p-1.5 rounded-[3px] text-slate-300 hover:text-amber-300 hover:bg-white/8 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-300/90" />
              </button>

              <button
                type="button"
                onClick={() => setHudHidden(true)}
                aria-label="Hide HUD to explore 3D scene"
                title="Hide HUD (H)"
                className="hidden sm:inline-flex p-1.5 rounded-[3px] text-slate-300 hover:text-white hover:bg-white/8 transition-colors"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-300" />
              </button>
            </div>

            <div data-tour="lab-tools" className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setBadgesOpen(true)}
                title={`Detective Rank: ${detectiveStatus.rank}`}
                className="px-1.5 sm:px-2 py-1 rounded-[3px] hover:bg-amber-400/10 text-[10px] sm:text-[11px] font-mono text-amber-300 flex items-center gap-1 transition-colors whitespace-nowrap tabular-nums"
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden 2xl:inline font-sans font-semibold text-amber-100">
                  {detectiveStatus.rank}
                </span>
                <span>
                  {detectiveStatus.unlockedCount}/{detectiveStatus.totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNotebookOpen(true)}
                title="Discovery Notebook"
                className="px-1.5 sm:px-2 py-1 rounded-[3px] hover:bg-emerald-400/10 text-[10px] sm:text-[11px] font-mono text-emerald-300 flex items-center gap-1 transition-colors whitespace-nowrap tabular-nums"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                <span>{inspectedIds.size}/8</span>
              </button>

              <button
                type="button"
                onClick={() => setScienceLabOpen(true)}
                className="px-2.5 sm:px-3 py-1 rounded-[3px] bg-emerald-400/14 border border-emerald-400/50 hover:bg-emerald-400/24 text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-emerald-200 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <FlaskConical className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Science Lab</span>
                <span className="sm:hidden">Lab</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* MINIMAL FLOATING 3D CAMERA BAR WHEN HUD IS HIDDEN */}
      {stage !== 'INTRO' && hudHidden && (
        <div className="fixed top-3 right-3 z-20 flex items-center gap-1.5 obs-panel-strong rounded-[4px] p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => setThirdPersonMode(true)}
            className={`px-2.5 py-1 rounded-[3px] text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors ${
              thirdPersonMode
                ? 'bg-amber-400/20 border border-amber-400/55 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Walk</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectCameraPreset('observatory')}
            className={`px-2.5 py-1 rounded-[3px] text-[11px] font-mono uppercase tracking-wider font-medium flex items-center gap-1 transition-colors ${
              !thirdPersonMode && activeCamPreset === 'observatory'
                ? 'bg-emerald-400/20 text-emerald-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectCameraPreset('earth')}
            className={`px-2.5 py-1 rounded-[3px] text-[11px] font-mono uppercase tracking-wider font-medium flex items-center gap-1 transition-colors ${
              !thirdPersonMode && activeCamPreset === 'earth'
                ? 'bg-emerald-400/20 text-emerald-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Earth</span>
          </button>
          <button
            type="button"
            onClick={() => setHudHidden(false)}
            className="px-3 py-1 rounded-[3px] bg-amber-400/20 border border-amber-400/50 text-[11px] font-mono uppercase tracking-wider font-semibold text-amber-200 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Show UI (H)</span>
          </button>
        </div>
      )}

      {/* TOP-LEFT LIVE NAVIGATOR MISSION CHECKLIST */}
      {quest && !hudHidden && (
        <NavigatorMissionCard
          quest={quest}
          onStartTour={startFeatureTour}
          onOpenStory={
            stage === 'CH1' || stage === 'CH2' || stage === 'CH3'
              ? () => openChapterStory(stage)
              : undefined
          }
          onSelectStep={handleSelectQuestStep}
        />
      )}

      {/* TOP-RIGHT HOST STAR SWITCHER IN CHAPTER 3 */}
      {stage === 'CH3' && !hudHidden && (
        <StarSwitcherCard
          starKey={params.starKey}
          spotlight={quest?.spotlightControl === 'star'}
          onSwitchStar={handleSwitchStar}
        />
      )}

      {/* BOTTOM DOCK: ACTION-ORIENTED TERRA DIALOGUE + SMART BUTTONS + CONTROLS */}
      {stage !== 'INTRO' && quest && !hudHidden && (
        <div className="fixed z-20 bottom-3 left-3 right-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3 pointer-events-none">
          {/* Bottom-Left Action-Oriented TERRA Dialogue Card (collapsible on mobile) */}
          <section
            data-tour="terra-guide"
            aria-label="TERRA step guidance"
            className="relative pointer-events-auto w-full md:w-[340px] shrink-0 obs-panel-strong rounded-[4px] px-3.5 py-3 text-slate-100 flex flex-col gap-2.5"
          >
            <HudCorners tone="amber" />

            <div className="flex items-start gap-3 pt-0.5">
              <TerraAvatar size={42} mood={mood} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <SectionCodeTag label="03 / TERRA" tone="mint" />
                    <span className="text-[10.5px] font-mono uppercase tracking-wider text-slate-300 truncate">
                      {quest.allDone ? 'DONE' : `STEP ${quest.activeStepIndex + 1}/3`}
                    </span>
                    {terraSpokenLine && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 shrink-0">
                        <svg viewBox="0 0 12 10" className="w-3 h-2.5" aria-hidden="true">
                          <rect x="0.5" y="3" width="2" height="4" fill="currentColor" />
                          <rect x="4.5" y="1" width="2" height="8" fill="currentColor" />
                          <rect x="8.5" y="2.5" width="2" height="5" fill="currentColor" />
                        </svg>
                        <span>VOICE</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTerraCollapsedMobile((v) => !v)}
                    aria-label={terraCollapsedMobile ? 'Expand TERRA guidance' : 'Collapse TERRA guidance'}
                    className="md:hidden p-1 rounded-[3px] text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    {terraCollapsedMobile ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {!terraCollapsedMobile && (
                  <>
                    <p className="mt-1.5 text-xs text-slate-100 leading-relaxed">
                      {quest.allDone ? (
                        <span className="text-emerald-200 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-300" />
                          <span>{quest.currentTerraText}</span>
                        </span>
                      ) : (
                        quest.currentTerraText
                      )}
                    </p>

                    {terraSpokenLine && (
                      <p className="mt-1.5 pt-1.5 border-t border-amber-400/18 text-[11px] italic text-emerald-200/90 leading-snug">
                        “{terraSpokenLine}”
                      </p>
                    )}

                    {quest.allDone && (
                      <div className="mt-2 pt-2 border-t border-amber-400/18 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-300">
                          <Lightbulb className="w-3 h-3 shrink-0" />
                          <span>Key Takeaway</span>
                        </div>
                        <p className="text-[11px] text-slate-200 leading-snug">
                          {quest.missionAnalogy}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {!terraCollapsedMobile && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-400/20">
                <button
                  type="button"
                  onClick={() => handleSelectHotspot(quest.currentUnderstandId)}
                  className="px-2.5 py-1.5 rounded-[3px] bg-white/[0.03] border border-amber-400/25 hover:bg-emerald-400/12 hover:border-emerald-300/50 text-[11px] font-mono uppercase tracking-wider font-medium text-emerald-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Info className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Understand</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (quest.allDone && stage === 'CH3') {
                      setDebriefOpen(true);
                    } else {
                      goToStage(nextStageTarget);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-[3px] text-[11px] font-mono uppercase tracking-wider font-bold flex items-center gap-1 transition-colors whitespace-nowrap ${
                    quest.allDone
                      ? 'bg-amber-400 text-[#05080f] hover:bg-amber-300'
                      : 'bg-white/[0.03] border border-amber-400/20 text-slate-300 hover:text-white hover:border-amber-400/45'
                  }`}
                >
                  <span>
                    {quest.allDone
                      ? stage === 'CH3'
                        ? 'Summary'
                        : 'Next Chapter'
                      : `Steps ${quest.completedCount}/3`}
                  </span>
                  {quest.allDone && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </section>

          {/* Simple Center Control Dock */}
          <ControlDeck
            stage={stage}
            params={params}
            simResult={simResult}
            spotlightControl={quest.spotlightControl}
            onChangeParams={handleChangeParams}
            onSelectPreset={handleSelectPreset}
            onOpenMiniPrediction={() => setMiniPredOpen(true)}
            onResetBaseline={handleResetBaseline}
          />

          {/* Right symmetry spacer on wide screens so ControlDeck stays centered */}
          <div className="hidden xl:block xl:w-[340px] shrink-0" aria-hidden="true" />
        </div>
      )}

      {/* 3-TAB "TOUCH TO UNDERSTAND" CONCEPT CARD */}
      {activeConceptId && (
        <ConceptCard
          conceptId={activeConceptId}
          conceptState={conceptState}
          onClose={() => setActiveConceptId(null)}
        />
      )}

      {/* CHAPTER STORY BRIEFING MODAL WITH ANIMATED VISUALS & SOUND */}
      <ChapterStoryModal
        stage={storyStage}
        soundMuted={soundMuted}
        onBeatChange={() => audioRef.current?.playStoryBeat()}
        onReplayTheme={(num) => audioRef.current?.playChapterIntro(num)}
        onTypingTick={(accent) => audioRef.current?.playTypingTick(accent)}
        onComplete={handleCompleteStory}
      />

      {/* CHAPTER 1–3 MINI-PREDICTION QUIZ MODAL */}
      <MiniPredictionModal
        open={miniPredOpen}
        stage={stage === 'CH1' || stage === 'CH2' || stage === 'CH3' ? stage : 'CH2'}
        onClose={() => setMiniPredOpen(false)}
        onAnswered={(quizStage) => {
          setCompletedQuizzes((prev) => {
            if (prev.has(quizStage)) return prev;
            const next = new Set(prev);
            next.add(quizStage);
            return next;
          });
          if (quizStage === 'CH2') {
            setQuestProgress((qp) => (qp.ch2PredAnswered ? qp : { ...qp, ch2PredAnswered: true }));
          }
        }}
        onCorrect={() => audioRef.current?.playStepSuccess()}
        onWrong={() => audioRef.current?.playWrong()}
      />

      {/* EARTH DETECTIVE RANKS & BADGES MODAL */}
      <DetectiveBadgesModal
        open={badgesOpen}
        status={detectiveStatus}
        inspectedCount={inspectedIds.size}
        isPlayingTrend={trendReplayIdx !== null}
        onClose={() => setBadgesOpen(false)}
        onPlayRealTrend={startOrToggleRealTrend}
        onOpenScienceLab={() => setScienceLabOpen(true)}
      />

      {/* 0/8 DISCOVERY NOTEBOOK DRAWER */}
      <NotebookDrawer
        open={notebookOpen}
        onClose={() => setNotebookOpen(false)}
        inspectedIds={inspectedIds}
        onSelectConcept={handleSelectHotspot}
      />

      {/* CONTROLS & SHORTCUTS HELP MODAL */}
      <ControlsHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onStartTour={startFeatureTour}
      />

      {/* INTERACTIVE POINT-OUT FEATURE TOUR */}
      <FeatureTourOverlay
        open={tourOpen}
        onClose={handleCloseTour}
        onStepChange={() => audioRef.current?.playStoryBeat()}
      />

      {/* MISSION DEBRIEF CELEBRATION MODAL AFTER CHAPTER 3 */}
      <MissionDebriefModal
        open={debriefOpen}
        status={detectiveStatus}
        inspectedCount={inspectedIds.size}
        quizCount={completedQuizzes.size}
        completedChaptersCount={completedChapters.size}
        onClose={() => setDebriefOpen(false)}
        onPlayRealTrend={startOrToggleRealTrend}
        onOpenScienceLab={() => setScienceLabOpen(true)}
        onOpenBadges={() => setBadgesOpen(true)}
      />

      {/* DEDICATED SCIENCE LAB VIEW */}
      <ScienceLabView
        open={scienceLabOpen}
        onClose={() => setScienceLabOpen(false)}
        params={params}
        simResult={simResult}
        onChangeParams={handleChangeParams}
        onSwitchStar={handleSwitchStar}
        onResetBaseline={handleResetBaseline}
        onPlayRealTrend={startOrToggleRealTrend}
        isPlayingTrend={trendReplayIdx !== null}
        onApplyPreset={handleSelectPreset}
      />
    </div>
  );
}
