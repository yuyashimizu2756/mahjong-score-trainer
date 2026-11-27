import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppProvider } from '../../src/lib/store';
import { MemorizePage } from '../../src/features/memorize/MemorizePage';
import { GUIDE_SECTIONS } from '../../src/features/memorize/guides';
import { DRILL_KIND_META } from '../../src/features/memorize/drills';
import { DEFAULT_SETTINGS, initStorage } from '../../src/lib/storage';
import { DRILL_KINDS, loadDrill } from '../../src/lib/srs';

function renderMemorize() {
  return render(
    <AppProvider>
      <div data-scroll-root>
        <MemorizePage settings={DEFAULT_SETTINGS} />
      </div>
    </AppProvider>,
  );
}

describe('覚え方', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '#/memorize');
    initStorage();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('ハブに 6 セクションと 4 種類のドリル、成績を表示する', () => {
    renderMemorize();
    expect(
      screen.getByRole('heading', { level: 1, name: '覚え方' }),
    ).toBeInTheDocument();
    expect(GUIDE_SECTIONS).toHaveLength(6);
    for (const section of GUIDE_SECTIONS) {
      expect(
        screen.getByRole('button', {
          name: new RegExp(section.title),
        }),
      ).toBeInTheDocument();
    }
    for (const kind of DRILL_KINDS) {
      expect(
        screen.getByRole('button', {
          name: new RegExp(DRILL_KIND_META[kind].name),
        }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText('ドリル成績')).toBeInTheDocument();
    expect(screen.getByText('今日のドリルを 10 問')).toBeInTheDocument();
  });

  it('ガイドを開いて前後移動し、ミニ問題に回答できる', () => {
    renderMemorize();
    fireEvent.click(
      screen.getByRole('button', { name: /4 ステップの全体像/ }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '覚え方ガイド' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '4 ステップの全体像' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /次のセクション/ }));
    expect(
      screen.getByRole('heading', { level: 2, name: '符の覚え方' }),
    ).toBeInTheDocument();

    const checks = screen.getAllByTestId('guide-check-choice');
    expect(checks.length).toBeGreaterThanOrEqual(12);
    fireEvent.click(checks[0]);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /前のセクション/ }));
    expect(
      screen.getByRole('heading', { level: 2, name: '4 ステップの全体像' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /一覧へ戻る/ })[0]);
    expect(
      screen.getByRole('heading', { level: 1, name: '覚え方' }),
    ).toBeInTheDocument();
  });

  it('ドリルを開始し、回答 → 解説 → 次へ → 結果まで進む', () => {
    renderMemorize();
    fireEvent.click(
      screen.getByRole('button', { name: /点数表穴埋め/ }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '暗記ドリル' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();

    for (let index = 0; index < 10; index += 1) {
      const choices = screen.getAllByTestId('drill-choice');
      expect(choices).toHaveLength(4);
      fireEvent.click(choices[0]);
      const status = screen.getByRole('status');
      expect(status.textContent?.length).toBeGreaterThan(10);
      fireEvent.click(
        screen.getByRole('button', { name: /次へ|結果を見る/ }),
      );
    }

    expect(
      screen.getByRole('heading', { level: 2, name: '結果' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/10 問中 \d+ 問正解/)).toBeInTheDocument();
    const saved = loadDrill();
    expect(saved.stats.total).toBe(10);
    expect(Object.keys(saved.cards)).toHaveLength(10);
  });

  it('キーボード 1〜4 で回答し、Enter で次へ進む', () => {
    renderMemorize();
    fireEvent.click(
      screen.getByRole('button', { name: /支払いクイズ/ }),
    );
    fireEvent.keyDown(window, { key: '2' });
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('2 / 10')).toBeInTheDocument();
  });

  it('ドリルの種類を絞ると同じ種類だけが出題される', () => {
    renderMemorize();
    fireEvent.click(screen.getByRole('button', { name: /符カウント/ }));
    for (let index = 0; index < 3; index += 1) {
      fireEvent.keyDown(window, { key: '1' });
      expect(screen.getByRole('status')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Enter' });
    }
    const saved = loadDrill();
    const kinds = Object.values(saved.cards).map((card) => card.kind);
    expect(kinds.length).toBeGreaterThan(0);
    expect(new Set(kinds)).toEqual(new Set(['fu']));
  });
});
