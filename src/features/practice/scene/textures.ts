import type { Tile } from '../../../engine/types';
import { tileFaceSvg } from '../../../components/tile/tileFaceSvg';

/**
 * 3D 牌面テクスチャのキーと生成。キー計算は純粋関数なのでテストできる。
 * キーは 34 種（萬 1〜9・筒 1〜9・索 1〜9・字 1〜7）+ 赤 5（萬・筒・索）+ 裏。
 */

export const RED_FIVE_KEYS = ['m5r', 'p5r', 's5r'] as const;

export const TILE_TEXTURE_KEYS: readonly string[] = [
  ...['m', 'p', 's'].flatMap((suit) =>
    Array.from({ length: 9 }, (_, index) => `${suit}${index + 1}`),
  ),
  ...Array.from({ length: 7 }, (_, index) => `z${index + 1}`),
  ...RED_FIVE_KEYS,
  'back',
] as const;

/** キーの総数（34 + 3 + 1 = 38）。 */
export const TILE_TEXTURE_COUNT = TILE_TEXTURE_KEYS.length;

/** テクスチャの実寸。SVG の viewBox 72 × 100 と同じ比率。 */
export const FACE_CANVAS_WIDTH = 144;
export const FACE_CANVAS_HEIGHT = 200;

/** 牌 → テクスチャキー。同じ牌は常に同じキーになる。 */
export function textureKey(tile: Tile, faceDown = false): string {
  if (faceDown) return 'back';
  const red = Boolean(tile.red) && tile.suit !== 'z';
  return `${tile.suit}${tile.rank}${red ? 'r' : ''}`;
}

/** キー → 牌。キャッシュの再生成やテスト用。 */
export function tileFromTextureKey(key: string): Tile | null {
  if (key === 'back') return null;
  const match = /^([mpsz])([1-9])(r?)$/.exec(key);
  if (!match) return null;
  const suit = match[1] as Tile['suit'];
  const rank = Number(match[2]);
  if (suit === 'z' && (rank > 7 || match[3] === 'r')) return null;
  return match[3] === 'r'
    ? { suit, rank, red: true }
    : { suit, rank };
}

/** 牌面 SVG を data URL にする（外部リクエストなし）。 */
export function tileFaceDataUrl(tile: Tile): string {
  const svg = tileFaceSvg(tile, { showSuitMark: false });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 牌面の Canvas を用意する。SVG は非同期に描画され、完了時に onReady を呼ぶ。
 * Canvas が使えない環境（SSR・テスト）では null を返す。
 */
export function createFaceCanvas(
  tile: Tile,
  onReady?: () => void,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = FACE_CANVAS_WIDTH;
  canvas.height = FACE_CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;

  // 牌面の下地（象牙色）。SVG の透過部分も牌の色になる。
  const gradient = context.createLinearGradient(0, 0, 0, FACE_CANVAS_HEIGHT);
  gradient.addColorStop(0, '#fffdf5');
  gradient.addColorStop(0.42, '#f7f0dd');
  gradient.addColorStop(1, '#eadcbe');
  context.fillStyle = gradient;
  context.fillRect(0, 0, FACE_CANVAS_WIDTH, FACE_CANVAS_HEIGHT);

  try {
    const image = new Image();
    image.onload = () => {
      try {
        context.drawImage(image, 0, 0, FACE_CANVAS_WIDTH, FACE_CANVAS_HEIGHT);
        onReady?.();
      } catch {
        // 描画できなくても下地だけは残る。
      }
    };
    image.src = tileFaceDataUrl(tile);
  } catch {
    // Image が使えなくても下地だけは残る。
  }
  return canvas;
}
