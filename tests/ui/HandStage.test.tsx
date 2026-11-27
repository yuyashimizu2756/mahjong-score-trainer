import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AppProvider } from '../../src/lib/store';
import { PracticePage } from '../../src/features/practice/PracticePage';
import { SettingsPage } from '../../src/features/settings/SettingsPage';
import {
  DEFAULT_SETTINGS,
  initStorage,
  loadSettings,
  type DisplayMode,
} from '../../src/lib/storage';

const SEED = 4242;

function renderPractice(displayMode: DisplayMode) {
  return render(
    <AppProvider>
      <PracticePage
        settings={{ ...DEFAULT_SETTINGS, displayMode }}
        initialSeed={SEED}
        onNavigateChart={vi.fn()}
      />
    </AppProvider>,
  );
}

function correctChoice(): HTMLElement {
  const choice = screen
    .getAllByTestId('choice')
    .find((element) => element.getAttribute('data-correct') === 'true');
  if (!choice) throw new Error('correct choice not found');
  return choice;
}

describe('練習の手牌表示モード', () => {
  beforeEach(() => {
    window.localStorage.clear();
    initStorage();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('既定は CSS 3D で、14 枚の牌が読める', () => {
    renderPractice('css3d');
    const stage = screen.getByTestId('hand-stage');
    expect(stage).toHaveAttribute('data-hand-mode', 'css3d');
    expect(stage).toHaveAttribute('data-hand-requested', 'css3d');
    expect(screen.getByTestId('hand-3d-stage')).toBeInTheDocument();
    expect(screen.getByTestId('hand-mode-label')).toHaveTextContent('CSS 3D');
    const tiles = stage.querySelectorAll('[data-tile]');
    expect(tiles.length).toBeGreaterThanOrEqual(14);
    expect(stage.querySelector('canvas')).toBeNull();
  });

  it('2D に切り替えると傾きなしで表示する', () => {
    const { rerender } = renderPractice('css3d');
    expect(screen.getByTestId('hand-3d-stage')).toBeInTheDocument();

    rerender(
      <AppProvider>
        <PracticePage
          settings={{ ...DEFAULT_SETTINGS, displayMode: '2d' }}
          initialSeed={SEED}
          onNavigateChart={vi.fn()}
        />
      </AppProvider>,
    );
    const stage = screen.getByTestId('hand-stage');
    expect(stage).toHaveAttribute('data-hand-mode', '2d');
    expect(screen.queryByTestId('hand-3d-stage')).not.toBeInTheDocument();
    expect(screen.getByTestId('hand-2d')).toBeInTheDocument();
    expect(screen.getByTestId('hand-mode-label')).toHaveTextContent('2D');
  });

  it('CSS 3D でも回答ボタンは 2D のまま操作できる', async () => {
    renderPractice('css3d');
    expect(screen.getAllByTestId('choice')).toHaveLength(4);
    fireEvent.click(correctChoice());
    expect(await screen.findByTestId('result-panel')).toBeInTheDocument();
    // 結果パネルは 3D にしない。
    expect(
      within(screen.getByTestId('result-panel')).queryByTestId(
        'hand-3d-stage',
      ),
    ).toBeNull();
  });

  it('Three.js は jsdom（WebGL なし）では読み込まず CSS 3D に戻す', () => {
    renderPractice('three');
    const stage = screen.getByTestId('hand-stage');
    expect(stage).toHaveAttribute('data-hand-requested', 'three');
    expect(stage).toHaveAttribute('data-hand-mode', 'css3d');
    expect(screen.getByTestId('hand-fallback')).toHaveTextContent('CSS 3D');
    expect(screen.queryByTestId('three-hand')).not.toBeInTheDocument();
    expect(screen.queryByTestId('three-stage')).not.toBeInTheDocument();
    expect(stage.querySelector('canvas')).toBeNull();
    // フォールバックしても牌と回答 UI はそのまま。
    expect(stage.querySelectorAll('[data-tile]').length).toBeGreaterThanOrEqual(
      14,
    );
    expect(screen.getAllByTestId('choice')).toHaveLength(4);
  });
});

describe('設定の表示モード', () => {
  beforeEach(() => {
    window.localStorage.clear();
    initStorage();
  });

  it('3 つのカードとプレビューを出し、既定は CSS 3D', () => {
    render(
      <AppProvider>
        <SettingsPage />
      </AppProvider>,
    );
    const cards = screen.getAllByTestId('display-mode-card');
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.getAttribute('data-mode'))).toEqual([
      '2d',
      'css3d',
      'three',
    ]);
    expect(
      cards.find((card) => card.getAttribute('data-mode') === 'css3d'),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('display-mode-preview')).toHaveLength(3);
  });

  it('カードを選ぶと即時保存し、再読込しても残る', () => {
    render(
      <AppProvider>
        <SettingsPage />
      </AppProvider>,
    );
    const cards = screen.getAllByTestId('display-mode-card');
    const three = cards.find(
      (card) => card.getAttribute('data-mode') === 'three',
    );
    if (!three) throw new Error('three card not found');
    fireEvent.click(three);
    expect(three).toHaveAttribute('aria-pressed', 'true');
    expect(loadSettings().displayMode).toBe('three');

    const two = cards.find((card) => card.getAttribute('data-mode') === '2d');
    if (!two) throw new Error('2d card not found');
    fireEvent.click(two);
    expect(loadSettings().displayMode).toBe('2d');
    expect(two).toHaveAttribute('aria-pressed', 'true');
  });
});
