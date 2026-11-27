import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Problem } from '../engine/types';
import {
  DEFAULT_LEARN,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  clearAllStorage,
  initStorage,
  loadLearn,
  loadReview,
  loadSettings,
  loadStats,
  resetStatsStorage,
  saveLearn,
  saveReview,
  saveSettings,
  saveStats,
  MAX_REVIEW_ITEMS,
  type LearnProgress,
  type ReviewItem,
  type Settings,
  type Stats,
} from './storage';
import { todayKey } from './format';

export interface AppData {
  settings: Settings;
  stats: Stats;
  review: ReviewItem[];
  learn: LearnProgress;
  updateSettings: (patch: Partial<Settings>) => void;
  recordAnswer: (problem: Problem, correct: boolean) => void;
  addReview: (problem: Problem) => void;
  removeReview: (id: string) => void;
  completeLesson: (
    lessonId: string,
    quizCorrect: number,
    quizTotal: number,
  ) => void;
  resetStats: () => void;
  clearAll: () => void;
}

const AppDataContext = createContext<AppData | null>(null);

function bootstrap(): {
  settings: Settings;
  stats: Stats;
  review: ReviewItem[];
  learn: LearnProgress;
} {
  initStorage();
  return {
    settings: loadSettings(),
    stats: loadStats(),
    review: loadReview(),
    learn: loadLearn(),
  };
}

function reviewTags(problem: Problem): string[] {
  const tags: string[] = [];
  for (const hit of problem.answer.yaku) {
    if (!tags.includes(hit.id)) tags.push(hit.id);
  }
  return tags;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(bootstrap);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [stats, setStats] = useState<Stats>(initial.stats);
  const [review, setReview] = useState<ReviewItem[]>(initial.review);
  const [learn, setLearn] = useState<LearnProgress>(initial.learn);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const recordAnswer = useCallback((problem: Problem, correct: boolean) => {
    setStats((previous) => {
      const day = todayKey();
      const dayRecord = previous.byDay[day] ?? { total: 0, correct: 0 };
      const byYaku = { ...previous.byYaku };
      for (const tag of reviewTags(problem)) {
        const record = byYaku[tag] ?? { total: 0, correct: 0 };
        byYaku[tag] = {
          total: record.total + 1,
          correct: record.correct + (correct ? 1 : 0),
        };
      }
      const streak = correct ? previous.streak + 1 : 0;
      const next: Stats = {
        total: previous.total + 1,
        correct: previous.correct + (correct ? 1 : 0),
        streak,
        bestStreak: Math.max(previous.bestStreak, streak),
        byYaku,
        byDay: {
          ...previous.byDay,
          [day]: {
            total: dayRecord.total + 1,
            correct: dayRecord.correct + (correct ? 1 : 0),
          },
        },
      };
      saveStats(next);
      return next;
    });
  }, []);

  const addReview = useCallback((problem: Problem) => {
    setReview((previous) => {
      const existing = previous.find((item) => item.id === problem.id);
      let next: ReviewItem[];
      if (existing) {
        next = [
          {
            ...existing,
            misses: existing.misses + 1,
            input: problem.input,
            answer: problem.answer,
            tags: reviewTags(problem),
          },
          ...previous.filter((item) => item.id !== problem.id),
        ];
      } else {
        next = [
          {
            id: problem.id,
            input: problem.input,
            answer: problem.answer,
            tags: reviewTags(problem),
            misses: 1,
            addedAt: Date.now(),
          },
          ...previous,
        ];
      }
      next = next.slice(0, MAX_REVIEW_ITEMS);
      saveReview(next);
      return next;
    });
  }, []);

  const removeReview = useCallback((id: string) => {
    setReview((previous) => {
      const next = previous.filter((item) => item.id !== id);
      saveReview(next);
      return next;
    });
  }, []);

  const completeLesson = useCallback(
    (lessonId: string, quizCorrect: number, quizTotal: number) => {
      setLearn((previous) => {
        const previousLesson = previous.lessons[lessonId];
        const completed =
          quizTotal > 0 && quizCorrect === quizTotal
            ? true
            : (previousLesson?.completed ?? false);
        const next: LearnProgress = {
          lessons: {
            ...previous.lessons,
            [lessonId]: {
              completed,
              quizCorrect,
              quizTotal,
            },
          },
        };
        saveLearn(next);
        return next;
      });
    },
    [],
  );

  const resetStats = useCallback(() => {
    resetStatsStorage();
    setStats({ ...DEFAULT_STATS, byYaku: {}, byDay: {} });
    setReview([]);
  }, []);

  const clearAll = useCallback(() => {
    clearAllStorage();
    setSettings({ ...DEFAULT_SETTINGS });
    setStats({ ...DEFAULT_STATS, byYaku: {}, byDay: {} });
    setReview([]);
    setLearn({ ...DEFAULT_LEARN });
    initStorage();
  }, []);

  const value = useMemo<AppData>(
    () => ({
      settings,
      stats,
      review,
      learn,
      updateSettings,
      recordAnswer,
      addReview,
      removeReview,
      completeLesson,
      resetStats,
      clearAll,
    }),
    [
      settings,
      stats,
      review,
      learn,
      updateSettings,
      recordAnswer,
      addReview,
      removeReview,
      completeLesson,
      resetStats,
      clearAll,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData は AppProvider の内側で使ってください');
  }
  return context;
}
