import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hand } from '../../src/components/Hand';
import type { Meld, Tile } from '../../src/engine/types';

function tiles(spec: string): Tile[] {
  const result: Tile[] = [];
  for (const group of spec.trim().split(/\s+/)) {
    const suit = group.slice(-1) as Tile['suit'];
    for (const char of group.slice(0, -1)) {
      const rank = char === '0' ? 5 : Number(char);
      result.push(char === '0' ? { suit, rank, red: true } : { suit, rank });
    }
  }
  return result;
}

const chi: Meld = {
  type: 'chi',
  tiles: [
    { suit: 's', rank: 2 },
    { suit: 's', rank: 3 },
    { suit: 's', rank: 4 },
  ],
  open: true,
};

describe('手牌の和了牌分離', () => {
  it('既定では 14 枚をそのまま並べる', () => {
    const concealed = tiles('123456789m 234p 55z');
    render(<Hand concealed={concealed} winTile={concealed[13]} />);
    expect(screen.queryByTestId('hand-win')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('hand-main').querySelectorAll('[data-tile]'),
    ).toHaveLength(14);
  });

  it('separateWin で 13 枚 + 和了牌に分ける', () => {
    const concealed = tiles('123456789m 234p 55z');
    render(
      <Hand concealed={concealed} winTile={concealed[13]} separateWin />,
    );
    const main = screen.getByTestId('hand-main');
    const win = screen.getByTestId('hand-win');
    expect(main.querySelectorAll('[data-tile]')).toHaveLength(13);
    expect(win.querySelectorAll('[data-tile]')).toHaveLength(1);
    expect(win.querySelector('[data-tile]')).toHaveAttribute(
      'data-highlight',
      'true',
    );
    expect(main.querySelector('[data-highlight]')).toBeNull();
    expect(win).toHaveTextContent('和了牌');
    expect(win).toHaveAccessibleName('和了牌 白');
  });

  it('同じ牌が複数あるときは赤 5 の一致を優先して 1 枚だけ分ける', () => {
    const concealed = tiles('5m 0m 123456p 456s 111z');
    render(
      <Hand
        concealed={concealed}
        winTile={{ suit: 'm', rank: 5, red: true }}
        separateWin
      />,
    );
    const main = screen.getByTestId('hand-main');
    const win = screen.getByTestId('hand-win');
    expect(main.querySelectorAll('[data-tile]')).toHaveLength(13);
    expect(main.querySelectorAll('[data-red="true"]')).toHaveLength(0);
    expect(win.querySelector('[data-tile]')).toHaveAttribute(
      'data-red',
      'true',
    );
  });

  it('副露ありは 10 枚 + 和了牌 + 副露 3 枚になる', () => {
    const concealed = tiles('123456789m 23p');
    render(
      <Hand
        concealed={concealed}
        melds={[chi]}
        winTile={concealed[10]}
        separateWin
      />,
    );
    expect(
      screen.getByTestId('hand-main').querySelectorAll('[data-tile]'),
    ).toHaveLength(10);
    expect(screen.getByTestId('hand-win')).toBeInTheDocument();
    expect(screen.getByLabelText('チー 234s')).toBeInTheDocument();
  });

  it('和了牌が手牌にないときは分離しない', () => {
    const concealed = tiles('123456789m 2345p');
    render(
      <Hand
        concealed={concealed}
        winTile={{ suit: 'z', rank: 1 }}
        separateWin
      />,
    );
    expect(screen.queryByTestId('hand-win')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('hand-main').querySelectorAll('[data-tile]'),
    ).toHaveLength(13);
  });
});
