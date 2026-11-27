import { describe, expect, it } from 'vitest';
import type { Meld, Tile } from '../../src/engine/types';
import { BASE_ELEVATION } from '../../src/features/practice/scene/camera';
import {
  DORA_DEPTH,
  MELD_GAP,
  ROW_DEPTH,
  TILE_DEPTH,
  TILE_GAP,
  TILE_HEIGHT,
  TILE_WIDTH,
  WIN_GAP,
  WIN_LIFT,
  centerY,
  findWinIndex,
  footprintWidth,
  layoutHand,
  type HandSceneItem,
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

function extents(item: HandSceneItem) {
  const rotated = item.rotation !== 0;
  const halfX = (footprintWidth(rotated) / 2) * item.scale;
  const halfY = ((rotated ? TILE_WIDTH : TILE_HEIGHT) / 2) * item.scale;
  const halfZ = (TILE_DEPTH / 2) * item.scale;
  return { halfX, halfY, halfZ };
}

/** スクリーン上下方向（上が正）の位置。 */
function vertical(item: HandSceneItem, edge: 'top' | 'bottom'): number {
  const { halfY, halfZ } = extents(item);
  const y = edge === 'top' ? item.y + halfY : item.y - halfY;
  const z = edge === 'top' ? item.z - halfZ : item.z + halfZ;
  return y * Math.cos(BASE_ELEVATION) - z * Math.sin(BASE_ELEVATION);
}

describe('3D 手牌レイアウト', () => {
  it('14 枚を左から右へ、中央寄せで並べる（1 段）', () => {
    const layout = layoutHand({ concealed: fourteen, winTile: fourteen[13] });
    expect(layout.rows).toBe(1);
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
      expect(layout.items[index].z).toBeCloseTo(
        layout.items[index].highlight ? 0.08 : 0,
        6,
      );
    }
  });

  it('maxPerRow=7 で 7 + 7 の 2 段に折り返す', () => {
    const layout = layoutHand({
      concealed: fourteen,
      winTile: fourteen[13],
      maxPerRow: 7,
    });
    expect(layout.rows).toBe(2);
    expect(layout.items).toHaveLength(14);
    const first = layout.items.filter((item) => item.row === 0);
    const second = layout.items.filter((item) => item.row === 1);
    expect(first).toHaveLength(7);
    expect(second).toHaveLength(7);
    // 読む順の先頭が奥（上）、後半が手前（下）。
    expect(first[0].z).toBeCloseTo(-ROW_DEPTH, 6);
    expect(second[0].z).toBeCloseTo(0, 6);
    // それぞれの段は独立に中央寄せ。
    for (const row of [first, second]) {
      expect(row[0].x).toBeCloseTo(-row[row.length - 1].x, 6);
      for (let index = 1; index < row.length; index += 1) {
        expect(row[index].x).toBeGreaterThan(row[index - 1].x);
      }
    }
    // 2 段はスクリーン上で上下に重ならない。
    const backBottom = Math.min(...first.map((item) => vertical(item, 'bottom')));
    const frontTop = Math.max(...second.map((item) => vertical(item, 'top')));
    expect(backBottom).toBeGreaterThan(frontTop);
    expect(layout.width).toBeCloseTo(7 * TILE_WIDTH + 6 * TILE_GAP, 6);
  });

  it('副露は分割せず、2 段でも右端に置く', () => {
    const layout = layoutHand({
      concealed: fourteen.slice(0, 11),
      melds: [chi],
      maxPerRow: 7,
    });
    expect(layout.rows).toBe(2);
    expect(layout.items).toHaveLength(14);
    const meldItems = layout.items.filter((item) => item.group === 'meld');
    const concealed = layout.items.filter((item) => item.group === 'concealed');
    expect(meldItems).toHaveLength(3);
    expect(meldItems.every((item) => item.row === meldItems[0].row)).toBe(true);
    expect(concealed).toHaveLength(11);
    expect(layout.items.filter((item) => item.row === 0)).toHaveLength(7);
    expect(layout.items.filter((item) => item.row === 1)).toHaveLength(7);
    // 副露は同じ段の手牌より右（段ごとに中央寄せ）。
    const meldRow = meldItems[0].row;
    const sameRowConcealed = concealed.filter((item) => item.row === meldRow);
    expect(Math.min(...meldItems.map((item) => item.x))).toBeGreaterThan(
      Math.max(...sameRowConcealed.map((item) => item.x)),
    );
  });

  it('段数は maxPerRow に収まるなら 1 段のまま', () => {
    const layout = layoutHand({
      concealed: fourteen.slice(0, 6),
      maxPerRow: 7,
    });
    expect(layout.rows).toBe(1);
    expect(layout.items).toHaveLength(6);
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
    // 2 段では奥の段と同じ高さ（卓の右上）。
    const twoRows = layoutHand({
      concealed: fourteen,
      doraIndicator: dora,
      maxPerRow: 7,
    });
    expect(twoRows.dora?.z).toBe(-ROW_DEPTH);
  });

  it('bounds は手牌・副露・ドラをすべて含む', () => {
    const layout = layoutHand({
      concealed: fourteen.slice(0, 11),
      melds: [chi],
      winTile: fourteen[10],
      doraIndicator: { suit: 'm', rank: 9 },
      maxPerRow: 7,
    });
    const all = layout.dora ? [...layout.items, layout.dora] : layout.items;
    for (const item of all) {
      const { halfX, halfY, halfZ } = extents(item);
      expect(layout.bounds.minX).toBeLessThanOrEqual(item.x - halfX + 1e-9);
      expect(layout.bounds.maxX).toBeGreaterThanOrEqual(item.x + halfX - 1e-9);
      expect(layout.bounds.minY).toBeLessThanOrEqual(item.y - halfY + 1e-9);
      expect(layout.bounds.maxY).toBeGreaterThanOrEqual(item.y + halfY - 1e-9);
      expect(layout.bounds.minZ).toBeLessThanOrEqual(item.z - halfZ + 1e-9);
      expect(layout.bounds.maxZ).toBeGreaterThanOrEqual(item.z + halfZ - 1e-9);
    }
    expect(layout.bounds.maxZ - layout.bounds.minZ).toBeGreaterThan(
      ROW_DEPTH,
    );
  });

  it('separateWin で和了牌を gap 付きの右端に置く', () => {
    const layout = layoutHand({
      concealed: fourteen,
      winTile: fourteen[13],
      separateWin: true,
    });
    expect(layout.items).toHaveLength(14);
    const win = layout.items.find((item) => item.highlight);
    expect(win).toBeDefined();
    if (!win) return;
    const others = layout.items.filter((item) => !item.highlight);
    expect(win.x).toBeCloseTo(Math.max(...others.map((item) => item.x)) + TILE_WIDTH + WIN_GAP, 6);
    expect(layout.width).toBeCloseTo(
      14 * TILE_WIDTH + 12 * TILE_GAP + WIN_GAP,
      6,
    );
    // 通常の牌間隔より広い。
    expect(WIN_GAP).toBeGreaterThan(TILE_GAP);
    expect(layout.items.filter((item) => item.highlight)).toHaveLength(1);
  });

  it('separateWin でも副露のさらに右に和了牌を置く', () => {
    const layout = layoutHand({
      concealed: fourteen.slice(0, 11),
      melds: [chi],
      winTile: fourteen[10],
      separateWin: true,
    });
    const win = layout.items.find((item) => item.highlight);
    const melds = layout.items.filter((item) => item.group === 'meld');
    expect(win).toBeDefined();
    if (!win) return;
    expect(win.x).toBeGreaterThan(Math.max(...melds.map((item) => item.x)));
    expect(win.x).toBeCloseTo(
      Math.max(...melds.map((item) => item.x)) + TILE_WIDTH + WIN_GAP,
      6,
    );
  });

  it('separateWin の 2 段でも和了牌が他の牌と重ならない', () => {
    const layout = layoutHand({
      concealed: fourteen,
      winTile: fourteen[13],
      separateWin: true,
      maxPerRow: 7,
    });
    expect(layout.rows).toBe(2);
    const win = layout.items.find((item) => item.highlight);
    expect(win?.row).toBe(1);
    const others = layout.items.filter((item) => item !== win);
    for (const item of others) {
      if (!win) break;
      if (item.row === win.row) {
        const minDistance =
          (footprintWidth(item.rotation !== 0) +
            footprintWidth(win.rotation !== 0)) /
          2;
        expect(Math.abs(item.x - win.x)).toBeGreaterThanOrEqual(
          minDistance - 1e-9,
        );
      }
    }
    const back = layout.items.filter((item) => item.row === 0);
    const front = layout.items.filter((item) => item.row === 1);
    const backBottom = Math.min(...back.map((item) => vertical(item, 'bottom')));
    const frontTop = Math.max(...front.map((item) => vertical(item, 'top')));
    expect(backBottom).toBeGreaterThan(frontTop);
  });

  it('同じ入力なら同じ出力（決定的）', () => {
    const first = layoutHand({
      concealed: fourteen,
      melds: [chi],
      winTile: fourteen[5],
      doraIndicator: { suit: 'm', rank: 9 },
      maxPerRow: 7,
    });
    const second = layoutHand({
      concealed: fourteen,
      melds: [chi],
      winTile: fourteen[5],
      doraIndicator: { suit: 'm', rank: 9 },
      maxPerRow: 7,
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
