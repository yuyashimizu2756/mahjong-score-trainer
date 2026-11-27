import { useCallback, useEffect, useState } from 'react';
import type { Difficulty } from './engine/types';
import { AppProvider, useAppData } from './lib/store';
import {
  parseRoute,
  routeHash,
  type RouteName,
} from './lib/router';
import type { ChartFocus } from './lib/chart-focus';
import { Layout } from './components/Layout';
import { HomePage } from './features/home/HomePage';
import { LearnPage } from './features/learn/LearnPage';
import { PracticePage } from './features/practice/PracticePage';
import { ChartPage } from './features/chart/ChartPage';
import { YakuPage } from './features/yaku/YakuPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { nextIncompleteLesson } from './data/lessons';

interface PracticeConfig {
  difficulty?: Difficulty;
  review: boolean;
  nonce: number;
}

function readRoute(): RouteName {
  if (typeof window === 'undefined') return 'home';
  return parseRoute(window.location.hash);
}

function AppShell() {
  const { settings, stats, review, learn } = useAppData();
  const [route, setRoute] = useState<RouteName>(readRoute);
  const [chartFocus, setChartFocus] = useState<ChartFocus | null>(null);
  const [learnLessonId, setLearnLessonId] = useState<string | undefined>(
    undefined,
  );
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfig>({
    difficulty: settings.defaultDifficulty,
    review: false,
    nonce: 0,
  });

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: RouteName) => {
    setRoute(next);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', routeHash(next));
      } catch {
        window.location.hash = routeHash(next);
      }
    }
  }, []);

  useEffect(() => {
    const titles: Record<RouteName, string> = {
      home: 'ホーム',
      learn: '学習',
      practice: '練習',
      chart: '点数表',
      yaku: '役一覧',
      settings: '設定',
    };
    document.title = `${titles[route]} | 麻雀点数トレーナー`;
  }, [route]);

  const startPractice = useCallback(
    (options?: { difficulty?: Difficulty; review?: boolean }) => {
      setPracticeConfig((previous) => ({
        difficulty: options?.difficulty ?? settings.defaultDifficulty,
        review: Boolean(options?.review),
        nonce: previous.nonce + 1,
      }));
      navigate('practice');
    },
    [navigate, settings.defaultDifficulty],
  );

  const openLearn = useCallback(
    (lessonId?: string) => {
      const fallback = nextIncompleteLesson(learn.lessons).id;
      setLearnLessonId(lessonId ?? fallback);
      navigate('learn');
    },
    [learn.lessons, navigate],
  );

  const openChart = useCallback(
    (focus: ChartFocus) => {
      setChartFocus(focus);
      navigate('chart');
    },
    [navigate],
  );

  return (
    <Layout
      route={route}
      onNavigate={navigate}
      reviewCount={review.length}
      reduceMotion={settings.reduceMotion}
    >
      {route === 'home' ? (
        <HomePage
          onStartPractice={startPractice}
          onNavigateLearn={openLearn}
          onNavigateYaku={() => navigate('yaku')}
          onNavigateChart={() => navigate('chart')}
        />
      ) : null}

      {route === 'learn' ? (
        <LearnPage
          settings={settings}
          initialLessonId={learnLessonId}
          onNavigatePractice={() => startPractice()}
        />
      ) : null}

      {route === 'practice' ? (
        <PracticePage
          key={practiceConfig.nonce}
          settings={settings}
          initialDifficulty={practiceConfig.difficulty}
          initialReview={practiceConfig.review}
          onNavigateChart={openChart}
        />
      ) : null}

      {route === 'chart' ? <ChartPage focus={chartFocus} /> : null}

      {route === 'yaku' ? <YakuPage stats={stats} /> : null}

      {route === 'settings' ? <SettingsPage /> : null}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
