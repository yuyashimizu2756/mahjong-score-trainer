import type { Meld, Tile } from '../../../engine/types';

/**
 * 3D 牌卓のレイアウト計算。Three.js に触れない純粋関数だけを置く。
 * 単位は牌の幅 = 1。実物の比率（幅 : 高さ : 厚み = 1 : 1.35 : 0.55）に合わせる。
 */

export const TILE_WIDTH = 1;
export const TILE_HEIGHT = 1.35;
export const TILE_DEPTH = 0.55;

/** 手牌どうしの隙間。 */
export const TILE_GAP = 0.06;
/** 手牌と副露のあいだの隙間。 */
export const MELD_GAP = 0.4;
/** 同じ副露のなかの隙間。 */
export const MELD_TILE_GAP = 0.04;
/** 和了牌を持ち上げる量。 */
export const WIN_LIFT = 0.12;
/** ドラ表示牌の縮尺。 */
export const DORA_SCALE = 0.62;
/** 手牌の右端からドラ表示牌までの距離。 */
export const DORA_GAP = 1.1;
/** 1 段のとき、ドラ表示牌を奥（カメラから遠い側）へ置く量。 */
export const DORA_DEPTH = -1.2;
/** 2 段のときの奥行き（前の段との距離）。和了牌が上の段に食い込まない余裕を取る。 */
export const ROW_DEPTH = 2.9;
/** 狭いステージで 1 段に並べる最大牌数。 */
export const TWO_ROW_MAX = 7;

export type SceneGroup = 'concealed' | 'meld' | 'dora';

export interface HandSceneItem {
  /** Three のオブジェクト名・React のキーに使う一意な ID。 */
  id: string;
  tile: Tile;
  group: SceneGroup;
  /** 牌の中心座標（牌の幅 = 1）。 */
  x: number;
  y: number;
  z: number;
  /** 牌面の回転（Z 軸、ラジアン）。副露の鳴き牌は 90 度。 */
  rotation: number;
  /** ドラ表示牌だけ縮小する。 */
  scale: number;
  highlight: boolean;
  faceDown: boolean;
  /** 段。0 が奥（読む順の先頭）、1 が手前。1 段なら常に 0。 */
  row: number;
}

/** 手牌全体のワールド座標の bounding box。 */
export interface HandSceneBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface HandSceneLayout {
  /** 手牌 + 副露。読む順（奥の段 → 手前の段、左 → 右）。 */
  items: HandSceneItem[];
  /** 一番広い段の横幅（牌の幅 = 1）。 */
  width: number;
  /** 一番高い牌の高さ（和了牌の持ち上げを含む）。 */
  height: number;
  /** ドラ表示牌。場況にドラがなければ null。 */
  dora: HandSceneItem | null;
  /** 段数（1 または 2）。 */
  rows: number;
  /** カメラのフィットに使う bounding box（ドラ表示牌を含む）。 */
  bounds: HandSceneBounds;
}

export interface HandLayoutInput {
  concealed: readonly Tile[];
  melds?: readonly Meld[];
  winTile?: Tile;
  /** ドラ表示牌。手牌には含めず、卓の右上に小さく置く。 */
  doraIndicator?: Tile;
  /** すべて伏せ牌にする（テスト・演出用）。 */
  faceDown?: boolean;
  /**
   * 1 段に並べる最大牌数。省略時は 1 段。
   * 指定して手牌が収まらない場合は 2 段に折り返す（副露は分割しない）。
   */
  maxPerRow?: number;
}

function isSameTileWithRed(a: Tile, b: Tile): boolean {
  return (
    a.suit === b.suit &&
    a.rank === b.rank &&
    Boolean(a.red) === Boolean(b.red)
  );
}

function isSameKind(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/** 和了牌の位置。赤 5 を優先し、なければ同種の牌へフォールバックする。 */
export function findWinIndex(tiles: readonly Tile[], winTile?: Tile): number {
  if (!winTile) return -1;
  const exact = tiles.findIndex((tile) => isSameTileWithRed(tile, winTile));
  if (exact !== -1) return exact;
  return tiles.findIndex((tile) => isSameKind(tile, winTile));
}

/** 横向きに置いた牌の、X 方向の占有幅。 */
export function footprintWidth(rotated: boolean): number {
  return rotated ? TILE_HEIGHT : TILE_WIDTH;
}

/** 牌の中心 Y。下端が卓（y = 0）に接する。 */
export function centerY(rotated: boolean, highlight: boolean): number {
  const base = rotated ? TILE_WIDTH / 2 : TILE_HEIGHT / 2;
  return base + (highlight ? WIN_LIFT : 0);
}

interface UnitTile {
  tile: Tile;
  rotated: boolean;
  highlight: boolean;
  id: string;
}

/** 折り返しの最小単位。副露（3〜4 枚）は分割しない。 */
interface Unit {
  group: SceneGroup;
  tiles: UnitTile[];
  /** 段の先頭以外で前に必要な隙間。 */
  gapBefore: number;
  /** 単位内の幅（先頭の隙間を含まない）。 */
  width: number;
}

function unitWidth(tiles: UnitTile[]): number {
  let width = 0;
  tiles.forEach((tile, index) => {
    if (index > 0) width += MELD_TILE_GAP;
    width += footprintWidth(tile.rotated);
  });
  return width;
}

function rowWidth(units: Unit[]): number {
  let width = 0;
  units.forEach((unit, index) => {
    if (index > 0) width += unit.gapBefore;
    width += unit.width;
  });
  return width;
}

/** 2 段に分ける位置（unit の境界）を、幅のバランスが良い順に選ぶ。 */
function splitRows(units: Unit[]): [Unit[], Unit[]] | null {
  if (units.length < 2) return null;
  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 1; index < units.length; index += 1) {
    const first = units.slice(0, index);
    const second = units.slice(index);
    const score = Math.max(rowWidth(first), rowWidth(second));
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return [units.slice(0, bestIndex), units.slice(bestIndex)];
}

function buildUnits(
  concealed: readonly Tile[],
  melds: readonly Meld[],
  winIndex: number,
): Unit[] {
  const units: Unit[] = [];
  concealed.forEach((tile, index) => {
    const tiles: UnitTile[] = [
      {
        tile,
        rotated: false,
        highlight: index === winIndex,
        id: `concealed-${index}-${tile.suit}${tile.rank}`,
      },
    ];
    units.push({
      group: 'concealed',
      tiles,
      gapBefore: TILE_GAP,
      width: unitWidth(tiles),
    });
  });

  melds.forEach((meld, meldIndex) => {
    const tiles: UnitTile[] = meld.tiles.map((tile, tileIndex) => ({
      tile,
      // 既存の 2D 表示と同じく、鳴いた副露は左端の牌を横向きにする。
      rotated: meld.open && tileIndex === 0,
      highlight: false,
      id: `meld-${meldIndex}-${tileIndex}-${tile.suit}${tile.rank}`,
    }));
    units.push({
      group: 'meld',
      tiles,
      gapBefore: MELD_GAP,
      width: unitWidth(tiles),
    });
  });
  return units;
}

/** すべての牌（ドラ含む）のワールド座標 bounds。 */
function computeBounds(
  items: readonly HandSceneItem[],
  dora: HandSceneItem | null,
): HandSceneBounds {
  const bounds: HandSceneBounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };
  const add = (item: HandSceneItem) => {
    const rotated = item.rotation !== 0;
    const halfX = (footprintWidth(rotated) / 2) * item.scale;
    const halfY = ((rotated ? TILE_WIDTH : TILE_HEIGHT) / 2) * item.scale;
    const halfZ = (TILE_DEPTH / 2) * item.scale;
    bounds.minX = Math.min(bounds.minX, item.x - halfX);
    bounds.maxX = Math.max(bounds.maxX, item.x + halfX);
    bounds.minY = Math.min(bounds.minY, item.y - halfY);
    bounds.maxY = Math.max(bounds.maxY, item.y + halfY);
    bounds.minZ = Math.min(bounds.minZ, item.z - halfZ);
    bounds.maxZ = Math.max(bounds.maxZ, item.z + halfZ);
  };
  for (const item of items) add(item);
  if (dora) add(dora);

  if (!Number.isFinite(bounds.minX)) {
    return { minX: -1, maxX: 1, minY: 0, maxY: TILE_HEIGHT, minZ: -1, maxZ: 1 };
  }
  return bounds;
}

/**
 * 手牌・副露・ドラ表示牌の 3D 配置を組み立てる。
 * 同じ入力なら常に同じ出力になる（乱数・時刻に依存しない）。
 */
export function layoutHand(input: HandLayoutInput): HandSceneLayout {
  const melds = input.melds ?? [];
  const winIndex = findWinIndex(input.concealed, input.winTile);
  const units = buildUnits(input.concealed, melds, winIndex);
  const totalTiles = units.reduce((sum, unit) => sum + unit.tiles.length, 0);

  const maxPerRow =
    input.maxPerRow && input.maxPerRow > 0
      ? Math.floor(input.maxPerRow)
      : Number.POSITIVE_INFINITY;
  const shouldWrap = totalTiles > maxPerRow;
  const split = shouldWrap ? splitRows(units) : null;
  const rows: Unit[][] = split ? split : [units];

  // 1 段目（読む順の先頭）を奥、2 段目を手前に置く。
  const placements: Array<{
    tile: UnitTile;
    group: SceneGroup;
    row: number;
    x: number;
    z: number;
  }> = [];
  const rowWidths: number[] = [];

  rows.forEach((rowUnits, rowIndex) => {
    const width = rowWidth(rowUnits);
    rowWidths.push(width);
    const offset = -width / 2;
    const z = rows.length > 1 ? (rowIndex === 0 ? -ROW_DEPTH : 0) : 0;
    let cursor = 0;
    rowUnits.forEach((unit, unitIndex) => {
      if (unitIndex > 0) cursor += unit.gapBefore;
      unit.tiles.forEach((tile, tileIndex) => {
        if (tileIndex > 0) cursor += MELD_TILE_GAP;
        const tileWidth = footprintWidth(tile.rotated);
        placements.push({
          tile,
          group: unit.group,
          row: rowIndex,
          x: offset + cursor + tileWidth / 2,
          z,
        });
        cursor += tileWidth;
      });
    });
  });

  const width = Math.max(...rowWidths);

  const items: HandSceneItem[] = placements.map((placement) => ({
    id: placement.tile.id,
    tile: placement.tile.tile,
    group: placement.group,
    x: placement.x,
    y: centerY(placement.tile.rotated, placement.tile.highlight),
    z: placement.z + (placement.tile.highlight ? 0.08 : 0),
    rotation: placement.tile.rotated ? Math.PI / 2 : 0,
    scale: 1,
    highlight: placement.tile.highlight,
    faceDown: input.faceDown ?? false,
    row: placement.row,
  }));

  const rightEdge = width / 2;
  const dora: HandSceneItem | null = input.doraIndicator
    ? {
        id: 'dora-0',
        tile: input.doraIndicator,
        group: 'dora',
        x: rightEdge + DORA_GAP + (TILE_WIDTH * DORA_SCALE) / 2,
        y: (TILE_HEIGHT * DORA_SCALE) / 2,
        // 1 段なら少し奥、2 段なら奥の段と同じ高さ（卓の右上）。
        z: rows.length > 1 ? -ROW_DEPTH : DORA_DEPTH,
        rotation: 0,
        scale: DORA_SCALE,
        highlight: false,
        faceDown: false,
        row: 0,
      }
    : null;

  return {
    items,
    width,
    height: TILE_HEIGHT + WIN_LIFT,
    dora,
    rows: rows.length,
    bounds: computeBounds(items, dora),
  };
}
