import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Tile } from '../../src/components/Tile';
import { Hand } from '../../src/components/Hand';
import { parseTiles } from '../../src/engine/tiles';
import type { Suit } from '../../src/engine/types';
import { tileFaceSvg } from '../../src/components/tile/tileFaceSvg';

const KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const NUMBER_SUIT_NAME: Record<'m' | 'p' | 's', string> = {
  m: '萬',
  p: '筒',
  s: '索',
};
const HONOR_LABELS: Array<[number, string]> = [
  [1, '東'],
  [2, '南'],
  [3, '西'],
  [4, '北'],
  [5, '白'],
  [6, '發'],
  [7, '中'],
];

function faceOf(container: HTMLElement): SVGElement {
  const svg = container.querySelector('svg');
  expect(svg).not.toBeNull();
  return svg as SVGElement;
}

describe('Tile の 34 種', () => {
  it('数牌 27 種すべてで aria-label と data-tile が正しい', () => {
    const suits: Array<'m' | 'p' | 's'> = ['m', 'p', 's'];
    for (const suit of suits) {
      for (let rank = 1; rank <= 9; rank += 1) {
        const { container, unmount } = render(
          <Tile tile={{ suit, rank }} />,
        );
        const label = `${KANJI[rank - 1]}${NUMBER_SUIT_NAME[suit]}`;
        const tile = within(container).getByRole('img', { name: label });
        expect(tile.getAttribute('data-tile'), label).toBe(`${suit}${rank}`);
        unmount();
      }
    }
  });

  it('字牌 7 種すべてで aria-label と data-tile が正しい', () => {
    for (const [rank, label] of HONOR_LABELS) {
      const { container, unmount } = render(
        <Tile tile={{ suit: 'z', rank }} />,
      );
      const tile = within(container).getByRole('img', { name: label });
      expect(tile.getAttribute('data-tile'), label).toBe(`z${rank}`);
      unmount();
    }
  });
});

describe('牌面の意匠', () => {
  it('萬子は漢数字と朱の「萬」を描く', () => {
    const { container } = render(
      <Tile tile={{ suit: 'm', rank: 5 }} showSuitMark={false} />,
    );
    const svg = faceOf(container);
    const texts = [...svg.querySelectorAll('text')];
    const joined = texts.map((node) => node.textContent).join('');
    expect(joined).toBe('五萬');
    expect(svg.getAttribute('data-face')).toBe('m');
    const man = texts.find((node) => node.textContent === '萬');
    expect(man?.getAttribute('fill')).toBe('#bf4133');

    // 萬子は「萬」が牌面にあるため、スート記号を重ねない。
    const marked = render(
      <Tile tile={{ suit: 'm', rank: 5 }} showSuitMark />,
    );
    expect(faceOf(marked.container).querySelectorAll('text')).toHaveLength(2);
  });

  it('筒子は伝統的なピップ数と配置で描く', () => {
    const { container } = render(<Tile tile={{ suit: 'p', rank: 5 }} />);
    const svg = faceOf(container);
    expect(svg.querySelectorAll('circle')).toHaveLength(15);
    expect(svg.querySelector('g.pips')).not.toBeNull();
    // 通常のピップは半径 8.4・外輪 1.9。
    const first = svg.querySelector('circle');
    expect(first?.getAttribute('r')).toBe('8.4');
    expect(first?.getAttribute('stroke-width')).toBe('1.9');
    // 5 筒は中央の 1 個だけ朱。
    expect(svg.querySelectorAll('[fill="#bf4133"]')).toHaveLength(1);
  });

  it('1 筒は大きな花形のピップ', () => {
    const { container } = render(<Tile tile={{ suit: 'p', rank: 1 }} />);
    const svg = faceOf(container);
    // 外輪・中輪・中心の 3 + 花形の飾り 8。
    expect(svg.querySelectorAll('circle')).toHaveLength(11);
    const big = [...svg.querySelectorAll('circle')].some(
      (node) => node.getAttribute('r') === '16.5',
    );
    expect(big).toBe(true);
  });

  it('9 筒は 3 × 3 のピップ', () => {
    const { container } = render(<Tile tile={{ suit: 'p', rank: 9 }} />);
    expect(faceOf(container).querySelectorAll('circle')).toHaveLength(27);
  });

  it('索子は竹の棒を並べ、5 索は中央を朱にする', () => {
    const five = render(<Tile tile={{ suit: 's', rank: 5 }} />);
    const fiveSvg = faceOf(five.container);
    expect(fiveSvg.querySelectorAll('g.bamboo')).toHaveLength(5);
    expect(fiveSvg.innerHTML).toContain('fill="#bf4133"');
    // 竹は幅 7.2・高さ 22。
    const rod = fiveSvg.querySelector('g.bamboo rect');
    expect(rod?.getAttribute('width')).toBe('7.2');
    expect(rod?.getAttribute('height')).toBe('22');

    const nine = render(<Tile tile={{ suit: 's', rank: 9 }} />);
    expect(faceOf(nine.container).querySelectorAll('g.bamboo')).toHaveLength(9);
  });

  it('1 索は孔雀（扇尾・朱の尾羽先・金の嘴）', () => {
    const { container } = render(<Tile tile={{ suit: 's', rank: 1 }} />);
    const svg = faceOf(container);
    expect(svg.querySelector('g.peacock')).not.toBeNull();
    expect(svg.querySelectorAll('g.bamboo')).toHaveLength(0);
    expect(svg.innerHTML).toContain('#c9a227');
    expect(svg.innerHTML).toContain('#bf4133');
  });

  it('字牌は墨・緑・朱と、白の二重枠を描き分ける', () => {
    const east = render(<Tile tile={{ suit: 'z', rank: 1 }} />);
    const eastText = faceOf(east.container).querySelector('text');
    expect(eastText?.textContent).toBe('東');
    expect(eastText?.getAttribute('fill')).toBe('#201d18');

    const hatsu = render(<Tile tile={{ suit: 'z', rank: 6 }} />);
    expect(
      faceOf(hatsu.container).querySelector('text')?.getAttribute('fill'),
    ).toBe('#2f7a4f');

    const chun = render(<Tile tile={{ suit: 'z', rank: 7 }} />);
    expect(
      faceOf(chun.container).querySelector('text')?.getAttribute('fill'),
    ).toBe('#bf4133');

    const haku = render(<Tile tile={{ suit: 'z', rank: 5 }} />);
    const hakuSvg = faceOf(haku.container);
    expect(hakuSvg.querySelectorAll('text')).toHaveLength(0);
    expect(hakuSvg.querySelectorAll('rect')).toHaveLength(2);
    expect(hakuSvg.querySelector('rect')?.getAttribute('stroke')).toBe(
      '#3c6e8f',
    );
  });
});

describe('赤 5・状態・サイズ', () => {
  it('赤 5 は牌面全体が朱で、ラベルに「赤」を含む', () => {
    const { container } = render(
      <Tile tile={{ suit: 'p', rank: 5, red: true }} />,
    );
    const tile = within(container).getByRole('img', { name: '赤五筒' });
    expect(tile).toHaveAttribute('data-red', 'true');
    const svg = faceOf(container);
    expect(svg.innerHTML).not.toContain('#1f5f8a');
    expect(svg.innerHTML).not.toContain('#2f7a4f');
    expect(svg.innerHTML).toContain('#bf4133');
    // 小さな朱点。
    const dot = [...svg.querySelectorAll('circle')].find(
      (node) => node.getAttribute('r') === '2.2',
    );
    expect(dot).not.toBeUndefined();
  });

  it('伏せ牌はデータ属性とラベルを持つ', () => {
    const { container } = render(<Tile tile={{ suit: 'm', rank: 1 }} faceDown />);
    const tile = within(container).getByRole('img', { name: '伏せ牌' });
    expect(tile).toHaveAttribute('data-tile', 'back');
    expect(container.querySelector('.tile-back')).not.toBeNull();
  });

  it('回転・サイズ・ハイライトをクラスと属性で示す', () => {
    const rotated = render(<Tile tile={{ suit: 'p', rank: 2 }} rotated />);
    const rotatedTile = within(rotated.container).getByRole('img', {
      name: '二筒',
    });
    expect(rotatedTile.className).toContain('rotate-90');

    const sm = render(<Tile tile={{ suit: 'm', rank: 1 }} size="sm" />);
    expect(
      within(sm.container).getByRole('img', { name: '一萬' }).className,
    ).toContain('w-[32px]');

    const lg = render(<Tile tile={{ suit: 'm', rank: 1 }} size="lg" />);
    expect(
      within(lg.container).getByRole('img', { name: '一萬' }).className,
    ).toContain('w-[58px]');
  });

  it('和了牌は金の縁・ラベル・aria-label を持つ', () => {
    const { container } = render(
      <Tile tile={{ suit: 'z', rank: 7 }} highlight />,
    );
    const tile = within(container).getByRole('img', {
      name: '中（和了牌）',
    });
    expect(tile).toHaveAttribute('data-highlight', 'true');
    expect(container.textContent).toContain('和了');
    expect(container.querySelector('.tile--win')).not.toBeNull();
  });

  it('手牌 14 枚でも和了牌のラベルを維持する', () => {
    const tiles = parseTiles('234m567p555z666z77z') ?? [];
    render(<Hand concealed={tiles} winTile={tiles[tiles.length - 1]} />);
    expect(
      screen.getByRole('img', { name: '中（和了牌）' }),
    ).toBeInTheDocument();
  });
});

describe('tileFaceSvg', () => {
  it('同じ牌は常に同じ文字列を返す（純粋関数）', () => {
    const tile = { suit: 's' as Suit, rank: 5 };
    const first = tileFaceSvg(tile);
    const second = tileFaceSvg({ suit: 's', rank: 5 });
    expect(first).toBe(second);
    expect(first).toBe(tileFaceSvg(tile));
    expect(first).toContain('viewBox="0 0 72 100"');
    expect(first).not.toContain('currentColor');
  });

  it('showSuitMark で下端のスート記号を切り替える', () => {
    const marked = tileFaceSvg({ suit: 'p', rank: 3 }, { showSuitMark: true });
    const plain = tileFaceSvg({ suit: 'p', rank: 3 });
    expect(marked).toContain('>筒</text>');
    expect(marked).toContain('font-size="8.5"');
    expect(plain).not.toContain('>筒</text>');
    expect(marked).toContain('data-face="p"');
  });

  it('赤 5 は data-red を持ち、字牌は赤にならない', () => {
    expect(tileFaceSvg({ suit: 'm', rank: 5, red: true })).toContain(
      'data-red="true"',
    );
    expect(tileFaceSvg({ suit: 'z', rank: 5 })).toContain('data-red="false"');
  });

  it('showSuitMark を牌コンポーネントに渡せる', () => {
    const shown = render(<Tile tile={{ suit: 's', rank: 2 }} showSuitMark />);
    expect(shown.container.textContent).toContain('索');
    const hidden = render(
      <Tile tile={{ suit: 's', rank: 2 }} showSuitMark={false} />,
    );
    expect(hidden.container.textContent).not.toContain('索');
  });
});
