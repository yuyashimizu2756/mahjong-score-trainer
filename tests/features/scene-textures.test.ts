import { describe, expect, it } from 'vitest';
import type { Tile } from '../../src/engine/types';
import { makeTile } from '../../src/engine/tiles';
import {
  RED_FIVE_KEYS,
  TILE_TEXTURE_COUNT,
  TILE_TEXTURE_KEYS,
  textureKey,
  tileFromTextureKey,
} from '../../src/features/practice/scene/textures';

describe('3D 牌面テクスチャのキー', () => {
  it('34 種 + 赤 5（3 種）+ 裏 = 38 種', () => {
    expect(TILE_TEXTURE_KEYS).toHaveLength(38);
    expect(TILE_TEXTURE_COUNT).toBe(38);
    expect(RED_FIVE_KEYS).toEqual(['m5r', 'p5r', 's5r']);
    expect(new Set(TILE_TEXTURE_KEYS).size).toBe(38);
    expect(TILE_TEXTURE_KEYS).toContain('back');
  });

  it('萬・筒・索の 1〜9 と字牌 1〜7 をすべて含む', () => {
    for (const suit of ['m', 'p', 's'] as const) {
      for (let rank = 1; rank <= 9; rank += 1) {
        expect(TILE_TEXTURE_KEYS).toContain(`${suit}${rank}`);
      }
    }
    for (let rank = 1; rank <= 7; rank += 1) {
      expect(TILE_TEXTURE_KEYS).toContain(`z${rank}`);
    }
  });

  it('同じ牌は常に同じキーになる', () => {
    const tile: Tile = { suit: 's', rank: 8 };
    expect(textureKey(tile)).toBe('s8');
    expect(textureKey({ ...tile })).toBe(textureKey(tile));
    expect(textureKey(makeTile('p', 5))).toBe('p5');
  });

  it('赤 5 はスートごとに別キー、字牌の red は無視する', () => {
    expect(textureKey({ suit: 'm', rank: 5, red: true })).toBe('m5r');
    expect(textureKey({ suit: 'p', rank: 5, red: true })).toBe('p5r');
    expect(textureKey({ suit: 's', rank: 5, red: true })).toBe('s5r');
    expect(textureKey({ suit: 'z', rank: 5, red: true })).toBe('z5');
    expect(textureKey({ suit: 'm', rank: 5 })).toBe('m5');
  });

  it('裏面は back キー 1 つに集約する', () => {
    expect(textureKey({ suit: 'm', rank: 1 }, true)).toBe('back');
    expect(textureKey({ suit: 'z', rank: 7 }, true)).toBe('back');
  });

  it('キーから牌へ戻せる（赤 5・字牌を含む）', () => {
    for (const key of TILE_TEXTURE_KEYS) {
      const tile = tileFromTextureKey(key);
      if (key === 'back') {
        expect(tile).toBeNull();
        continue;
      }
      expect(tile).not.toBeNull();
      expect(textureKey(tile as Tile)).toBe(key);
    }
  });

  it('不正なキーは null を返す', () => {
    for (const key of ['', 'm0', 'm10', 'z8', 'z1r', 'x1', 'm1rr', 'back ']) {
      expect(tileFromTextureKey(key)).toBeNull();
    }
  });

  it('すべての牌種がキーを持つ', () => {
    const tiles: Tile[] = [];
    for (const suit of ['m', 'p', 's'] as const) {
      for (let rank = 1; rank <= 9; rank += 1) {
        tiles.push({ suit, rank });
      }
    }
    for (let rank = 1; rank <= 7; rank += 1) {
      tiles.push({ suit: 'z', rank });
    }
    for (const tile of tiles) {
      expect(TILE_TEXTURE_KEYS).toContain(textureKey(tile));
    }
    expect(tiles).toHaveLength(34);
  });
});
