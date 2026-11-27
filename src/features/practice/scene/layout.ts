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
/** ドラ表示牌を奥（カメラから遠い側）へ置く量。 */
export const DORA_DEPTH = -1.2;

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
}

export interface HandSceneLayout {
  /** 手牌 + 副露。左から右の順。 */
  items: HandSceneItem[];
  /** 手牌 + 副露の横幅（牌の幅 = 1）。 */
  width: number;
  /** 一番高い牌の高さ（和了牌の持ち上げを含む）。 */
  height: number;
  /** ドラ表示牌。場況にドラがなければ null。 */
  dora: HandSceneItem | null;
}

export interface HandLayoutInput {
  concealed: readonly Tile[];
  melds?: readonly Meld[];
  winTile?: Tile;
  /** ドラ表示牌。手牌には含めず、卓の右上に小さく置く。 */
  doraIndicator?: Tile;
  /** すべて伏せ牌にする（テスト・演出用）。 */
  faceDown?: boolean;
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

interface Placement {
  tile: Tile;
  group: SceneGroup;
  rotated: boolean;
  highlight: boolean;
  id: string;
  x: number;
}

/**
 * 手牌・副露・ドラ表示牌の 3D 配置を組み立てる。
 * 同じ入力なら常に同じ出力になる（乱数・時刻に依存しない）。
 */
export function layoutHand(input: HandLayoutInput): HandSceneLayout {
  const melds = input.melds ?? [];
  const winIndex = findWinIndex(input.concealed, input.winTile);
  const placements: Placement[] = [];
  let cursor = 0;

  const add = (
    tile: Tile,
    group: SceneGroup,
    rotated: boolean,
    highlight: boolean,
    id: string,
    gapBefore: number,
  ) => {
    if (placements.length > 0) cursor += gapBefore;
    const width = footprintWidth(rotated);
    const x = cursor + width / 2;
    cursor += width;
    placements.push({ tile, group, rotated, highlight, id, x });
  };

  input.concealed.forEach((tile, index) => {
    add(
      tile,
      'concealed',
      false,
      index === winIndex,
      `concealed-${index}-${tile.suit}${tile.rank}`,
      index === 0 ? 0 : TILE_GAP,
    );
  });

  melds.forEach((meld, meldIndex) => {
    meld.tiles.forEach((tile, tileIndex) => {
      // 既存の 2D 表示と同じく、鳴いた副露は左端の牌を横向きにする。
      const rotated = meld.open && tileIndex === 0;
      add(
        tile,
        'meld',
        rotated,
        false,
        `meld-${meldIndex}-${tileIndex}-${tile.suit}${tile.rank}`,
        tileIndex === 0 ? MELD_GAP : MELD_TILE_GAP,
      );
    });
  });

  const totalWidth = cursor;
  const offset = -totalWidth / 2;

  const items: HandSceneItem[] = placements.map((placement) => ({
    id: placement.id,
    tile: placement.tile,
    group: placement.group,
    x: offset + placement.x,
    y: centerY(placement.rotated, placement.highlight),
    z: placement.highlight ? 0.08 : 0,
    rotation: placement.rotated ? Math.PI / 2 : 0,
    scale: 1,
    highlight: placement.highlight,
    faceDown: input.faceDown ?? false,
  }));

  const dora: HandSceneItem | null = input.doraIndicator
    ? {
        id: 'dora-0',
        tile: input.doraIndicator,
        group: 'dora',
        x: totalWidth / 2 + DORA_GAP + (TILE_WIDTH * DORA_SCALE) / 2,
        y: (TILE_HEIGHT * DORA_SCALE) / 2,
        z: DORA_DEPTH,
        rotation: 0,
        scale: DORA_SCALE,
        highlight: false,
        faceDown: false,
      }
    : null;

  return {
    items,
    width: totalWidth,
    height: TILE_HEIGHT + WIN_LIFT,
    dora,
  };
}

/** カメラの水平方向に収めるべき幅（手牌 + ドラ + 左右の余白）。 */
export function sceneWidth(layout: HandSceneLayout): number {
  const rightEdge = layout.dora
    ? layout.dora.x + (TILE_WIDTH * layout.dora.scale) / 2
    : layout.width / 2;
  // 手牌は中央寄せ、ドラは右に寄るので、右側の余白まで含めて対称に広げる。
  const halfWidth = Math.max(layout.width / 2, rightEdge) + 1.1;
  return halfWidth * 2;
}
