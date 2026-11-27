import { describe, expect, it } from 'vitest';
import type { Meld, Tile } from '../../src/engine/types';
import {
  DORA_DEPTH,
  MELD_GAP,
  TILE_GAP,
  TILE_HEIGHT,
  TILE_WIDTH,
  WIN_LIFT,
  centerY,
  findWinIndex,
  footprintWidth,
  layoutHand,
  sceneWidth,
} from '../../src/features/practice/scene/layout';

const fourteen: Tile[] = [
  { suit: 'm', rank: 1 },
  { suit: 'm', rank: 2 },
  { suit: 'm', rank: 3 },
  { suit: 'm', rank: 4 },
  { suit: 'm', rank: 5 },
  { suit: 'm', rank: 6 },
  { suit: 'm', rank: 7 },
  { suit: 'm', rank: 8 },
  { suit: 'm', rank: 9 },
  { suit: 'p', rank: 2 },
  { suit: 'p', rank: 3 },
  { suit: 'p', rank: 4 },
  { suit: 'z', rank: 5 },
  { suit: 'z', rank: 7 },
];

const chi: Meld = {
  type: 'chi',
  tiles: [
    { suit: 's', rank: 2 },
    { suit: 's', rank: 3 },
    { suit: 's', rank: 4 },
  ],
  open: true,
};

describe('3D 手牌レイアウト', () => {
  it('14 枚を左から右へ、中央寄せで並べる', () => {
    const layout = layoutHand({ concealed: fourteen, winTile: fourteen[13] });
    expect(layout.items).toHaveLength(14);
    expect(layout.width).toBeCloseTo(14 * TILE_WIDTH + 13 * TILE_GAP, 6);
    expect(layout.items[0].x).toBeCloseTo(-layout.width / 2 + TILE_WIDTH / 2, 6);
    expect(layout.items[13].x).toBeCloseTo(
      layout.width / 2 - TILE_WIDTH / 2,
      6,
    );
    expect(layout.items[0].x).toBeCloseTo(-layout.items[13].x, 6);
    for (let index = 1; index < layout.items.length; index += 1) {
      expect(layout.items[index].x).toBeGreaterThan(layout.items[index - 1].x);
      expect(layout.items[index].x - layout.items[index - 1].x).toBeCloseTo(
        TILE_WIDTH + TILE_GAP,
        6,
      );
    }
  });

  it('牌は下端が卓に接し、和了牌だけが浮く', () => {
    const layout = layoutHand({ concealed: fourteen, winTile: fourteen[13] });
    expect(layout.items[0].y).toBeCloseTo(TILE_HEIGHT / 2, 6);
    expect(layout.items[13].highlight).toBe(true);
    expect(layout.items[13].y).toBeCloseTo(TILE_HEIGHT / 2 + WIN_LIFT, 6);
    expect(layout.items[13].z).toBeGreaterThan(0);
    expect(layout.items.filter((item) => item.highlight)).toHaveLength(1);
  });

  it('和了牌は赤 5 を優先し、同種がなければ先頭の同種へ落とす', () => {
    const concealed: Tile[] = [
      { suit: 'p', rank: 5 },
      { suit: 'p', rank: 5, red: true },
      { suit: 'm', rank: 1 },
    ];
    expect(findWinIndex(concealed, { suit: 'p', rank: 5, red: true })).toBe(1);
    expect(findWinIndex(concealed, { suit: 'p', rank: 5 })).toBe(0);
    expect(findWinIndex(concealed, { suit: 's', rank: 9 })).toBe(-1);
    expect(findWinIndex(concealed)).toBe(-1);
  });

  it('副露は右側に置き、鳴いた牌だけ 90 度回す', () => {
    const layout = layoutHand({
      concealed: fourteen,
      melds: [chi],
      winTile: fourteen[0],
    });
    expect(layout.items).toHaveLength(17);
    const meldItems = layout.items.filter((item) => item.group === 'meld');
    expect(meldItems).toHaveLength(3);
    expect(meldItems[0].rotation).toBeCloseTo(Math.PI / 2, 6);
    expect(meldItems[1].rotation).toBe(0);
    expect(meldItems[2].rotation).toBe(0);
    const lastConcealed = layout.items.filter(
      (item) => item.group === 'concealed',
    )[13];
    expect(meldItems[0].x - lastConcealed.x).toBeCloseTo(
      TILE_WIDTH / 2 + MELD_GAP + TILE_HEIGHT / 2,
      6,
    );
    // 横向き牌は幅が高さに入れ替わる。
    expect(footprintWidth(true)).toBe(TILE_HEIGHT);
    expect(footprintWidth(false)).toBe(TILE_WIDTH);
  });

  it('暗槓は回転させない（既存の 2D 表示と同じ）', () => {
    const closedKan: Meld = {
      type: 'kan',
      tiles: [
        { suit: 'z', rank: 1 },
        { suit: 'z', rank: 1 },
        { suit: 'z', rank: 1 },
        { suit: 'z', rank: 1 },
      ],
      open: false,
    };
    const layout = layoutHand({ concealed: fourteen, melds: [closedKan] });
    expect(
      layout.items
        .filter((item) => item.group === 'meld')
        .every((item) => item.rotation === 0),
    ).toBe(true);
  });

  it('ドラ表示牌は手牌に含めず、卓の右上に小さく置く', () => {
    const dora = { suit: 's' as const, rank: 7 };
    const layout = layoutHand({ concealed: fourteen, doraIndicator: dora });
    expect(layout.items).toHaveLength(14);
    expect(layout.dora).not.toBeNull();
    expect(layout.dora?.tile).toEqual(dora);
    expect(layout.dora?.scale).toBeLessThan(1);
    expect(layout.dora?.x).toBeGreaterThan(layout.width / 2);
    expect(layout.dora?.z).toBe(DORA_DEPTH);
    // ドラ表示牌の右端までカメラの画角に収まる。
    expect(layout.dora?.x ?? 0).toBeLessThan(sceneWidth(layout) / 2 - 0.4);
    expect(sceneWidth(layout)).toBeGreaterThan(layout.width);
    expect(sceneWidth({ ...layout, dora: null })).toBeGreaterThanOrEqual(
      layout.width,
    );
  });

  it('同じ入力なら同じ出力（決定的）', () => {
    const first = layoutHand({
      concealed: fourteen,
      melds: [chi],
      winTile: fourteen[5],
      doraIndicator: { suit: 'm', rank: 9 },
    });
    const second = layoutHand({
      concealed: fourteen,
      melds: [chi],
      winTile: fourteen[5],
      doraIndicator: { suit: 'm', rank: 9 },
    });
    expect(second).toEqual(first);
  });

  it('入力を破壊しない', () => {
    const concealed = fourteen.map((tile) => ({ ...tile }));
    const snapshot = JSON.parse(JSON.stringify(concealed));
    layoutHand({ concealed, melds: [chi], winTile: concealed[0] });
    expect(concealed).toEqual(snapshot);
    expect(chi.tiles).toHaveLength(3);
  });

  it('センター座標は回転と和了で変わる', () => {
    expect(centerY(false, false)).toBeCloseTo(TILE_HEIGHT / 2, 6);
    expect(centerY(true, false)).toBeCloseTo(TILE_WIDTH / 2, 6);
    expect(centerY(false, true)).toBeCloseTo(TILE_HEIGHT / 2 + WIN_LIFT, 6);
  });
});
