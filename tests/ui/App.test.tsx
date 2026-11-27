import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../src/App';
import { Hand } from '../../src/components/Hand';
import { Tile } from '../../src/components/Tile';
import { parseTiles } from '../../src/engine/tiles';

describe('UI シェル', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '#/home');
  });

  it('6 つのタブがデスクトップレールに表示される', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'メインナビゲーション' });
    expect(within(nav).getAllByRole('button')).toHaveLength(6);
    for (const label of ['ホーム', '学習', '練習', '点数表', '役一覧', '設定']) {
      expect(within(nav).getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('タブを切り替えると画面とハッシュが変わる', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'メインナビゲーション' });

    fireEvent.click(within(nav).getByRole('button', { name: '練習' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '練習' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/practice');

    fireEvent.click(within(nav).getByRole('button', { name: '点数表' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '点数表' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/chart');
  });

  it('URL ハッシュから画面を復元する', () => {
    window.history.replaceState(null, '', '#/yaku');
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: '役一覧' }),
    ).toBeInTheDocument();
  });

  it('モバイル下部ナビは通常フローで高さを占有する', () => {
    render(<App />);
    const quick = screen.getByRole('navigation', {
      name: 'クイックナビゲーション',
    });
    expect(quick.className).not.toContain('fixed');
    expect(quick.className).toContain('shrink-0');
  });

  it('ホームに導入と主要 3 導線が表示される', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /点数計算を、/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('まずは学習から')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /練習をはじめる/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: /続きから学習/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('苦手役 Top3')).toBeInTheDocument();
  });

  it('設定画面で回答方式を切り替えて保存できる', () => {
    window.history.replaceState(null, '', '#/settings');
    render(<App />);
    const step = screen.getByRole('button', { name: /ステップ/ });
    fireEvent.click(step);
    expect(step).toHaveAttribute('aria-pressed', 'true');
    expect(
      JSON.parse(window.localStorage.getItem('mst:v1:settings') ?? '{}')
        .answerMode,
    ).toBe('step');
    expect(screen.getAllByText(/v0\.1\.0/)).toHaveLength(1);
    expect(screen.getByText('schema 1')).toBeInTheDocument();
  });
});

describe('Tile / Hand', () => {
  it('字牌は読みやすいラベルを持つ', () => {
    render(<Tile tile={{ suit: 'z', rank: 7 }} />);
    expect(screen.getByRole('img', { name: '中' })).toBeInTheDocument();
  });

  it('数牌は漢字の読みラベルを持つ', () => {
    render(<Tile tile={{ suit: 'm', rank: 5 }} />);
    expect(screen.getByRole('img', { name: '五萬' })).toBeInTheDocument();
  });

  it('赤 5 は data-red を持つ', () => {
    render(<Tile tile={{ suit: 's', rank: 5, red: true }} />);
    const tile = screen.getByRole('img', { name: '赤五索' });
    expect(tile).toHaveAttribute('data-red', 'true');
  });

  it('伏せ牌は読み上げラベルを持つ', () => {
    render(<Tile tile={{ suit: 'm', rank: 1 }} faceDown />);
    expect(screen.getByRole('img', { name: '伏せ牌' })).toBeInTheDocument();
  });

  it('手牌 14 枚と和了牌ハイライトを描画する', () => {
    const tiles = parseTiles('234m567p555z666z77z') ?? [];
    const winTile = tiles.find((tile) => tile.suit === 'z' && tile.rank === 7);
    render(<Hand concealed={tiles} winTile={winTile} />);
    const group = screen.getByRole('group', { name: /手牌/ });
    expect(within(group).getAllByRole('img')).toHaveLength(14);
    expect(screen.getByRole('img', { name: '中（和了牌）' })).toBeInTheDocument();
  });

  it('副露を表示する', () => {
    const concealed = parseTiles('234m456p789s55s') ?? [];
    const meldTiles = parseTiles('777z') ?? [];
    render(
      <Hand
        concealed={concealed}
        melds={[{ type: 'pon', tiles: meldTiles, open: true }]}
      />,
    );
    expect(screen.getByRole('group', { name: /手牌/ })).toBeInTheDocument();
    expect(screen.getByLabelText('ポン 777z')).toBeInTheDocument();
  });
});
