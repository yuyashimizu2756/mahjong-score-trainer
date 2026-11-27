import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SituationChips } from '../../src/components/SituationChips';
import type { Meld, Tile, WinContext } from '../../src/engine/types';

function context(overrides: Partial<WinContext> = {}): WinContext {
  return {
    tsumo: false,
    seatWind: 2,
    roundWind: 1,
    riichi: false,
    doraIndicators: [],
    honba: 0,
    riichiSticks: 0,
    ...overrides,
  };
}

function tiles(counts: Record<string, number>): Tile[] {
  const result: Tile[] = [];
  for (const [key, count] of Object.entries(counts)) {
    const suit = key.slice(-1) as Tile['suit'];
    const rank = Number(key.slice(0, -1));
    for (let index = 0; index < count; index += 1) {
      result.push({ suit, rank });
    }
  }
  return result;
}

describe('場況パネル', () => {
  it('リーチなし・ドラなしでも常に「なし」を表示する', () => {
    render(<SituationChips ctx={context()} />);
    const panel = screen.getByRole('group', { name: '場況' });
    expect(panel).toHaveTextContent('リーチ');
    expect(panel).toHaveTextContent('なし');
    expect(panel).toHaveTextContent('ドラ');
    expect(panel).not.toHaveTextContent('一発');
    expect(panel.querySelector('[data-tile]')).toBeNull();
  });

  it('立直では一発の有無も表示する', () => {
    const { rerender } = render(
      <SituationChips ctx={context({ riichi: true, ippatsu: false })} />,
    );
    expect(screen.getByText('立直')).toBeInTheDocument();
    expect(screen.getByText('一発')).toBeInTheDocument();
    expect(screen.getAllByText('なし').length).toBeGreaterThanOrEqual(2);

    rerender(
      <SituationChips ctx={context({ riichi: true, ippatsu: true })} />,
    );
    expect(screen.getByText('あり')).toBeInTheDocument();
  });

  it('ダブル立直を表示する', () => {
    render(
      <SituationChips ctx={context({ doubleRiichi: true, ippatsu: true })} />,
    );
    expect(screen.getByText('ダブル立直')).toBeInTheDocument();
    expect(screen.getByText('あり')).toBeInTheDocument();
  });

  it('ドラ表示牌 → ドラ牌 → 手牌中の枚数を表示する', () => {
    render(
      <SituationChips
        ctx={context({ doraIndicators: [{ suit: 'm', rank: 3 }] })}
        concealed={tiles({ '4m': 2, '1p': 1 })}
      />,
    );
    expect(
      screen.getByLabelText('ドラ表示牌 三萬 → ドラ 四萬、手牌に 2 枚'),
    ).toBeInTheDocument();
    expect(screen.getByText('四萬 ×2')).toBeInTheDocument();
    // 表示牌とドラ牌の 2 枚。
    expect(document.querySelectorAll('[data-tile]')).toHaveLength(2);
  });

  it('手牌にドラがなければ ×0 を表示する', () => {
    render(
      <SituationChips
        ctx={context({ doraIndicators: [{ suit: 'm', rank: 3 }] })}
        concealed={tiles({ '1p': 1 })}
      />,
    );
    expect(screen.getByText('四萬 ×0')).toBeInTheDocument();
  });

  it('副露中のドラも数える', () => {
    const meld: Meld = {
      type: 'pon',
      tiles: [
        { suit: 'm', rank: 4 },
        { suit: 'm', rank: 4 },
        { suit: 'm', rank: 4 },
      ],
      open: true,
    };
    render(
      <SituationChips
        ctx={context({ doraIndicators: [{ suit: 'm', rank: 3 }] })}
        concealed={tiles({ '4m': 1 })}
        melds={[meld]}
      />,
    );
    expect(screen.getByText('四萬 ×4')).toBeInTheDocument();
  });

  it('複数のドラ表示牌をそれぞれ表示する', () => {
    render(
      <SituationChips
        ctx={context({
          doraIndicators: [
            { suit: 'm', rank: 3 },
            { suit: 'z', rank: 7 },
          ],
        })}
        concealed={tiles({ '4m': 1, '5z': 2 })}
      />,
    );
    expect(
      screen.getByLabelText('ドラ表示牌 三萬 → ドラ 四萬、手牌に 1 枚'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('ドラ表示牌 中 → ドラ 白、手牌に 2 枚'),
    ).toBeInTheDocument();
  });

  it('リーチ時だけ裏ドラを表示する', () => {
    const ura: Tile[] = [{ suit: 'p', rank: 2 }];
    const { rerender } = render(
      <SituationChips
        ctx={context({ riichi: true, uraIndicators: ura })}
        concealed={tiles({ '3p': 1 })}
      />,
    );
    expect(
      screen.getByLabelText('裏ドラ表示牌 二筒 → ドラ 三筒、手牌に 1 枚'),
    ).toBeInTheDocument();
    expect(screen.getByText('三筒 ×1')).toBeInTheDocument();

    rerender(
      <SituationChips
        ctx={context({ uraIndicators: ura })}
        concealed={tiles({ '3p': 1 })}
      />,
    );
    expect(
      screen.queryByLabelText(/裏ドラ表示牌/),
    ).not.toBeInTheDocument();
  });

  it('赤ドラの枚数を表示する', () => {
    render(
      <SituationChips
        ctx={context()}
        concealed={[
          { suit: 'p', rank: 5, red: true },
          { suit: 's', rank: 5, red: true },
          { suit: 'm', rank: 5 },
        ]}
      />,
    );
    expect(screen.getByText('赤ドラ')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('本場と供託は 0 のとき省略する', () => {
    const { rerender } = render(<SituationChips ctx={context()} />);
    expect(screen.queryByText('本場')).not.toBeInTheDocument();
    expect(screen.queryByText('供託')).not.toBeInTheDocument();

    rerender(<SituationChips ctx={context({ honba: 2, riichiSticks: 1 })} />);
    expect(screen.getByText('2 本場')).toBeInTheDocument();
    expect(screen.getByText('1 本')).toBeInTheDocument();
  });
});
