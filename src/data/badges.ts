import type { StageId } from '../types/observatory';

export interface DetectiveBadge {
  id: string;
  title: string;
  subtitle: string;
  howToUnlock: string;
  unlocked: boolean;
}

export interface DetectiveStatus {
  rank: string;
  nextRank: string | null;
  unlockedCount: number;
  totalCount: number;
  badges: DetectiveBadge[];
}

export function evaluateDetectiveStatus(args: {
  completedChapters: Set<StageId>;
  completedQuizzes: Set<string>;
  inspectedCount: number;
  hasPlayedTrend: boolean;
}): DetectiveStatus {
  const { completedChapters, completedQuizzes, inspectedCount, hasPlayedTrend } = args;

  const badges: DetectiveBadge[] = [
    {
      id: 'blanket',
      title: 'Blanket Decoder',
      subtitle: 'Discovered why Earth stays +33°C warmer than an airless rock',
      howToUnlock: 'Complete Chapter 1: The Heat Blanket',
      unlocked: completedChapters.has('CH1'),
    },
    {
      id: 'flashlight',
      title: 'Flashlight Physicist',
      subtitle: 'Mastered the inverse-square sunlight rule and steam feedback',
      howToUnlock: 'Complete Chapter 2: Too Close to the Sun',
      unlocked: completedChapters.has('CH2'),
    },
    {
      id: 'exoplanet',
      title: 'Exoplanet Scout',
      subtitle: 'Found liquid water around dim red star TRAPPIST-1',
      howToUnlock: 'Complete Chapter 3: Red Sun TRAPPIST-1',
      unlocked: completedChapters.has('CH3'),
    },
    {
      id: 'quizAce',
      title: 'Prediction Ace',
      subtitle: 'Nailed a planetary physics prediction before running the test',
      howToUnlock: 'Answer any Chapter Prediction Quiz correctly',
      unlocked: completedQuizzes.size >= 1,
    },
    {
      id: 'trendMaster',
      title: 'Master Trend Detective',
      subtitle: 'Inspected all 8 observatory instruments and replayed real NASA data',
      howToUnlock: 'Inspect 8/8 instruments & play NASA 2003→2025 Trend in 3D',
      unlocked: inspectedCount >= 8 && hasPlayedTrend,
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;

  let rank = 'Rookie Observer';
  let nextRank: string | null = 'Field Scout (unlock 1 badge)';
  if (unlockedCount >= 5) {
    rank = 'Master Trend Detective';
    nextRank = null;
  } else if (unlockedCount >= 3) {
    rank = 'Climate Specialist';
    nextRank = 'Master Trend Detective (5 badges)';
  } else if (unlockedCount >= 1) {
    rank = 'Field Scout';
    nextRank = 'Climate Specialist (3 badges)';
  }

  return {
    rank,
    nextRank,
    unlockedCount,
    totalCount,
    badges,
  };
}
