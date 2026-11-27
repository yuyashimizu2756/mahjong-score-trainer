import { describe, expect, it } from 'vitest';
import type { Meld } from '../../src/engine/types';
import {
  describeHand,
  tileJaLabel,
} from '../../src/features/practice/scene/handText';

describe('3D 手牌の DOM テキスト', () => {
  it('牌を日本語の読みにする', () => {
    expect(tileJaLabel({ suit: 'm', rank: 2 })).toBe('二萬');
    expect(tileJaLabel({ suit: 'p', rank: 5 })).toBe('五筒');
    expect(tileJaLabel({ suit: 'p', rank: 5, red: true })).toBe('赤五筒');
    expect(tileJaLabel({ suit: 's', rank: 1 })).toBe('一索');
    expect(tileJaLabel({ suit: 'z', rank: 1 })).toBe('東');
    expect(tileJaLabel({ suit: 'z', rank: 7 })).toBe('中');
  });

  it('和了牌にラベルを添える', () => {
    const text = describeHand(
      [
        { suit: 'm', rank: 2 },
        { suit: 'm', rank: 3 },
        { suit: 'm', rank: 4 },
      ],
      [],
      { suit: 'm', rank: 4 },
    );
    expect(text).toContain('手牌 二萬 三萬 四萬（和了牌）');
  });

  it('副露も含めて読み上げる', () => {
    const meld: Meld = {
      type: 'pon',
      tiles: [
        { suit: 'z', rank: 1 },
        { suit: 'z', rank: 1 },
        { suit: 'z', rank: 1 },
      ],
      open: true,
    };
    const text = describeHand(
      [
        { suit: 'p', rank: 1 },
        { suit: 'p', rank: 2 },
      ],
      [meld],
      { suit: 'p', rank: 1 },
    );
    expect(text).toContain('手牌 一筒（和了牌） 二筒');
    expect(text).toContain('副露 ポン 東 東 東');
  });

  it('空の手牌でも文字列を返す', () => {
    expect(describeHand([], [], undefined)).toBe('手牌なし');
  });
});
