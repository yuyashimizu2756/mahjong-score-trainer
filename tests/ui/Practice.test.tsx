import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AppProvider } from '../../src/lib/store';
import { PracticePage } from '../../src/features/practice/PracticePage';
import { generateProblem } from '../../src/engine/problem';
import {
  DEFAULT_SETTINGS,
  initStorage,
  loadReview,
  loadStats,
  saveReview,
  type Settings,
} from '../../src/lib/storage';
import { formatNumber } from '../../src/lib/format';
import type { ChartFocus } from '../../src/lib/chart-focus';

const SEED = 12345;

function renderPractice(options?: {
  settings?: Settings;
  seed?: number;
  initialReview?: boolean;
  onNavigateChart?: (focus: ChartFocus) => void;
}) {
  const settings = options?.settings ?? DEFAULT_SETTINGS;
  const onNavigateChart = options?.onNavigateChart ?? vi.fn();
  const utils = render(
    <AppProvider>
      <PracticePage
        settings={settings}
        initialSeed={options?.seed ?? SEED}
        initialReview={options?.initialReview}
        onNavigateChart={onNavigateChart}
      />
    </AppProvider>,
  );
  return { ...utils, onNavigateChart };
}

function correctChoice(): HTMLElement {
  const choice = screen
    .getAllByTestId('choice')
    .find((element) => element.getAttribute('data-correct') === 'true');
  if (!choice) throw new Error('correct choice not found');
  return choice;
}

function wrongChoice(): HTMLElement {
  const choice = screen
    .getAllByTestId('choice')
    .find((element) => element.getAttribute('data-correct') === 'false');
  if (!choice) throw new Error('wrong choice not found');
  return choice;
}

describe('練習フロー', () => {
  beforeEach(() => {
    window.localStorage.clear();
    initStorage();
  });

  it('出題 → 正解選択 → 結果表示 → 次へ', async () => {
    const problem = generateProblem({ difficulty: 'beginner', seed: SEED });
    renderPractice();

    expect(screen.getByText('第 1 問')).toBeInTheDocument();
    expect(screen.getAllByTestId('choice')).toHaveLength(4);

    fireEvent.click(correctChoice());
    const panel = await screen.findByTestId('result-panel');
    expect(within(panel).getByText('正解')).toBeInTheDocument();
    expect(
      within(panel).getByText(formatNumber(problem.answer.payments.total)),
    ).toBeInTheDocument();
    expect(
      within(panel).getAllByText(problem.answer.yaku[0].name).length,
    ).toBeGreaterThan(0);

    const stats = loadStats();
    expect(stats.total).toBe(1);
    expect(stats.correct).toBe(1);
    expect(stats.streak).toBe(1);
    expect(loadReview()).toHaveLength(0);

    fireEvent.click(within(panel).getByRole('button', { name: /次へ/ }));
    expect(screen.queryByTestId('result-panel')).not.toBeInTheDocument();
    expect(screen.getByText('第 2 問')).toBeInTheDocument();
    expect(screen.getAllByTestId('choice')).toHaveLength(4);
  });

  it('誤答は復習キューに入り、成績に反映される', async () => {
    const problem = generateProblem({ difficulty: 'beginner', seed: SEED });
    renderPractice();
    fireEvent.click(wrongChoice());

    const panel = await screen.findByTestId('result-panel');
    expect(within(panel).getByText('不正解')).toBeInTheDocument();

    const review = loadReview();
    expect(review).toHaveLength(1);
    expect(review[0].id).toBe(problem.id);
    expect(review[0].misses).toBe(1);

    const stats = loadStats();
    expect(stats.total).toBe(1);
    expect(stats.correct).toBe(0);
    expect(stats.streak).toBe(0);

    fireEvent.click(within(panel).getByRole('button', { name: /次へ/ }));
    expect(screen.getByText('第 2 問')).toBeInTheDocument();
  });

  it('同じ問題が連続しない', () => {
    renderPractice();
    const first = screen.getByTestId('problem-card');
    const firstId = first.getAttribute('data-problem-id');
    expect(firstId).toBeTruthy();
    fireEvent.click(correctChoice());
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
    const secondId = screen
      .getByTestId('problem-card')
      .getAttribute('data-problem-id');
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
    expect(screen.getByText('第 2 問')).toBeInTheDocument();
  });

  it('ステップ回答: 翻 → 符 → 点数 → 結果', async () => {
    renderPractice({
      settings: { ...DEFAULT_SETTINGS, answerMode: 'step' },
    });

    expect(screen.getByText('翻数は？')).toBeInTheDocument();
    fireEvent.click(correctChoice());
    expect(
      screen.getByRole('button', { name: /次のステップへ/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /次のステップへ/ }));

    expect(screen.getByText('符は？')).toBeInTheDocument();
    fireEvent.click(correctChoice());
    fireEvent.click(screen.getByRole('button', { name: /次のステップへ/ }));

    expect(screen.getByText('点数は？')).toBeInTheDocument();
    fireEvent.click(correctChoice());

    const panel = await screen.findByTestId('result-panel');
    expect(within(panel).getByText('正解')).toBeInTheDocument();
  });

  it('ヒントとヘルプをキーボードで開ける', () => {
    renderPractice();
    expect(screen.queryByText('成立役のヒント')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.getByText('成立役のヒント')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'キーボード操作' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'キーボード操作' }),
    ).not.toBeInTheDocument();
  });

  it('点数表への導線が符・翻・向きを渡す', async () => {
    const problem = generateProblem({ difficulty: 'beginner', seed: SEED });
    const { onNavigateChart } = renderPractice();
    fireEvent.click(correctChoice());
    const panel = await screen.findByTestId('result-panel');
    fireEvent.click(
      within(panel).getByRole('button', { name: '点数表で見る' }),
    );
    expect(onNavigateChart).toHaveBeenCalledWith({
      fu: problem.answer.fu,
      han: problem.answer.han,
      dealer: problem.input.ctx.seatWind === 1,
      tsumo: problem.input.ctx.tsumo,
      yakumanCount: problem.answer.yakumanCount,
    });
  });

  it('復習モード: 正解するとキューから消える', async () => {
    const problem = generateProblem({ difficulty: 'beginner', seed: 77 });
    saveReview([
      {
        id: problem.id,
        input: problem.input,
        answer: problem.answer,
        tags: problem.tags,
        misses: 1,
        addedAt: Date.now(),
      },
    ]);
    renderPractice({ initialReview: true });

    expect(loadReview()).toHaveLength(1);
    expect(screen.getByText('復習')).toBeInTheDocument();
    fireEvent.click(correctChoice());
    await screen.findByTestId('result-panel');
    await waitFor(() => expect(loadReview()).toHaveLength(0));
  });

  it('4 択の選択肢は重複せず、正解を 1 つ含む', () => {
    renderPractice();
    const choices = screen.getAllByTestId('choice');
    expect(choices).toHaveLength(4);
    expect(
      choices.filter(
        (choice) => choice.getAttribute('data-correct') === 'true',
      ),
    ).toHaveLength(1);
    const labels = choices.map((choice) => choice.getAttribute('aria-label'));
    expect(new Set(labels).size).toBe(4);
  });
});
