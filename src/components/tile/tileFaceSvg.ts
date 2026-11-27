import type { Tile } from '../../engine/types';

/** 牌面 SVG の基準サイズ。3D の CanvasTexture でもこの比率で使う。 */
export const TILE_FACE_WIDTH = 72;
export const TILE_FACE_HEIGHT = 100;

/**
 * 牌面の色。`currentColor` に依存せず、SVG 単体で完結させる。
 * 3D テクスチャに書き出しても同じ色になる。
 */
export const TILE_FACE_COLORS = {
  ink: '#201d18',
  inkSoft: '#5d5546',
  vermilion: '#bf4133',
  vermilionLight: '#d46a56',
  pinBlue: '#1f5f8a',
  pinBlueDark: '#17496b',
  pinGreen: '#2f7a4f',
  pinGreenLight: '#4a9a68',
  souGreen: '#2f7a4f',
  souGreenDark: '#1c5236',
  souGreenLight: '#4a9a68',
  gold: '#c9a227',
  ivory: '#f8f1de',
  whiteFrame: '#3c6e8f',
  whiteFrameSoft: 'rgba(60, 110, 143, 0.45)',
} as const;

const FONT_SERIF =
  '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif';

const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

const HONOR_KANJI: Record<number, string> = {
  1: '東',
  2: '南',
  3: '西',
  4: '北',
  5: '',
  6: '發',
  7: '中',
};

const SUIT_MARK: Record<'m' | 'p' | 's', string> = {
  m: '萬',
  p: '筒',
  s: '索',
};

export interface TileFaceOptions {
  /** 牌面の下端に「萬 / 筒 / 索」を小さく添える（色覚配慮）。 */
  showSuitMark?: boolean;
}

/** 0〜100 の伝統的なピップ配置。筒子と索子で共通。 */
const PIP_POSITIONS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[50, 50]],
  2: [
    [50, 30],
    [50, 70],
  ],
  3: [
    [28, 26],
    [50, 50],
    [72, 74],
  ],
  4: [
    [32, 30],
    [68, 30],
    [32, 70],
    [68, 70],
  ],
  5: [
    [32, 28],
    [68, 28],
    [50, 50],
    [32, 72],
    [68, 72],
  ],
  6: [
    [32, 24],
    [68, 24],
    [32, 50],
    [68, 50],
    [32, 76],
    [68, 76],
  ],
  7: [
    [32, 22],
    [50, 22],
    [68, 22],
    [40, 50],
    [60, 50],
    [40, 76],
    [60, 76],
  ],
  8: [
    [32, 18],
    [68, 18],
    [32, 39],
    [68, 39],
    [32, 61],
    [68, 61],
    [32, 82],
    [68, 82],
  ],
  9: [
    [28, 22],
    [50, 22],
    [72, 22],
    [28, 50],
    [50, 50],
    [72, 50],
    [28, 78],
    [50, 78],
    [72, 78],
  ],
};

function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** 0〜100 の配置を viewBox 座標へ。上下に余白を残してスート記号と共存させる。 */
function point(x: number, y: number): [number, number] {
  return [x * 0.72, 7 + y * 0.86];
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function svgText(
  x: number,
  y: number,
  value: string,
  size: number,
  fill: string,
  weight = 600,
): string {
  return `<text x="${n(x)}" y="${n(y)}" text-anchor="middle" dominant-baseline="middle" font-family='${FONT_SERIF}' font-size="${n(size)}" font-weight="${weight}" fill="${fill}">${escapeText(value)}</text>`;
}

function pip(
  cx: number,
  cy: number,
  r: number,
  red: boolean,
  big = false,
): string {
  const stroke = red ? TILE_FACE_COLORS.vermilion : TILE_FACE_COLORS.pinBlue;
  const middle = red
    ? TILE_FACE_COLORS.vermilionLight
    : TILE_FACE_COLORS.pinGreen;
  const center = red ? TILE_FACE_COLORS.vermilion : TILE_FACE_COLORS.pinBlue;
  const parts = [
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${TILE_FACE_COLORS.ivory}" stroke="${stroke}" stroke-width="${big ? 2.2 : 1.7}" />`,
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.62)}" fill="none" stroke="${middle}" stroke-width="${big ? 1.4 : 1.1}" />`,
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.3)}" fill="${center}" />`,
  ];
  if (big) {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      parts.push(
        `<circle cx="${n(cx + Math.cos(angle) * r * 0.82)}" cy="${n(
          cy + Math.sin(angle) * r * 0.82,
        )}" r="1.4" fill="${TILE_FACE_COLORS.pinGreen}" />`,
      );
    }
  }
  return parts.join('');
}

function pinFace(rank: number, red: boolean): string {
  const positions = PIP_POSITIONS[rank] ?? PIP_POSITIONS[1];
  const big = rank === 1;
  const radius = big ? 15 : 7.2;
  const parts: string[] = [];
  positions.forEach(([x, y], index) => {
    const [cx, cy] = point(x, y);
    // 5 筒は中央の 1 個だけ朱にする。
    const pipRed = red || (rank === 5 && index === 2);
    parts.push(pip(cx, cy, radius, pipRed, big));
  });
  return `<g class="pips">${parts.join('')}</g>`;
}

function bamboo(x: number, y: number, scale: number, red: boolean): string {
  const fill = red ? TILE_FACE_COLORS.vermilion : TILE_FACE_COLORS.souGreen;
  const dark = red ? '#8f2a22' : TILE_FACE_COLORS.souGreenDark;
  const light = red ? TILE_FACE_COLORS.vermilionLight : TILE_FACE_COLORS.souGreenLight;
  return `<g class="bamboo" transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})"><rect x="-3.2" y="-10.5" width="6.4" height="21" rx="3.2" fill="${fill}" stroke="${dark}" stroke-width="0.8" /><rect x="-2.1" y="-9" width="1.5" height="18" rx="0.75" fill="${light}" opacity="0.75" /><path d="M-3.1 -3.6 H3.1 M-3.1 2.6 H3.1" stroke="${dark}" stroke-width="0.9" opacity="0.6" fill="none" /><path d="M0 -10 C1.8 -13.5, 4.8 -14, 6.8 -14.6 C4.8 -10.5, 3 -9.2, 0 -8.8 Z" fill="${light}" stroke="${dark}" stroke-width="0.4" /></g>`;
}

function peacock(): string {
  const green = TILE_FACE_COLORS.souGreen;
  const dark = TILE_FACE_COLORS.souGreenDark;
  const red = TILE_FACE_COLORS.vermilion;
  return [
    '<g class="peacock" transform="translate(36 54)">',
    // 尾羽（扇状）。先端だけ朱。
    '<path d="M-4 6 C-20 16, -17 22, -15 28" fill="none" stroke="' + green + '" stroke-width="2.4" stroke-linecap="round" />',
    '<path d="M0 8 C-7 22, -2 25, 0 31" fill="none" stroke="' + green + '" stroke-width="2.4" stroke-linecap="round" />',
    '<path d="M4 6 C20 16, 17 22, 15 28" fill="none" stroke="' + green + '" stroke-width="2.4" stroke-linecap="round" />',
    `<circle cx="-15" cy="28" r="2" fill="${red}" />`,
    `<circle cx="0" cy="31" r="2" fill="${red}" />`,
    `<circle cx="15" cy="28" r="2" fill="${red}" />`,
    // 胴
    `<ellipse cx="0" cy="0" rx="8" ry="10.5" fill="${green}" stroke="${dark}" stroke-width="1" />`,
    `<path d="M-6 -2 C-13 4, -8 13, 1 12 C-4 7, -4 3, -1 -1 Z" fill="#3f9562" />`,
    // 首・頭
    `<path d="M2 -7 C4 -11, 6 -12, 7 -14" fill="none" stroke="${green}" stroke-width="4" stroke-linecap="round" />`,
    `<circle cx="7" cy="-16" r="4.4" fill="${green}" stroke="${dark}" stroke-width="0.8" />`,
    // 金の嘴
    `<path d="M11 -16 L16 -14.5 L11 -13 Z" fill="${TILE_FACE_COLORS.gold}" />`,
    `<circle cx="8.2" cy="-17.3" r="1" fill="${TILE_FACE_COLORS.ivory}" />`,
    `<circle cx="8.4" cy="-17.3" r="0.5" fill="${TILE_FACE_COLORS.ink}" />`,
    // 冠羽
    `<path d="M6 -20 L4.5 -24 M7.5 -20 L7.5 -25 M9 -20 L10.5 -24" stroke="${green}" stroke-width="1.2" stroke-linecap="round" />`,
    // 脚
    `<path d="M-2 10 L-2 15 M3 10 L3 15 M-5 15 H1 M0 15 H6" stroke="${dark}" stroke-width="1.1" stroke-linecap="round" />`,
    '</g>',
  ].join('');
}

function souFace(rank: number, red: boolean): string {
  if (rank === 1) return peacock();
  const positions = PIP_POSITIONS[rank] ?? PIP_POSITIONS[1];
  const scale = rank >= 8 ? 0.78 : rank === 7 ? 0.84 : 0.92;
  const rods: string[] = [];
  positions.forEach(([x, y], index) => {
    const [cx, cy] = point(x, y);
    // 5 索は中央の 1 本だけ朱にする。
    const rodRed = red || (rank === 5 && index === 2);
    rods.push(bamboo(cx, cy, scale, rodRed));
  });
  return `<g class="bamboos">${rods.join('')}</g>`;
}

function manFace(rank: number, red: boolean): string {
  const ink = red ? TILE_FACE_COLORS.vermilion : TILE_FACE_COLORS.ink;
  const kanji = RANK_KANJI[rank - 1] ?? String(rank);
  return [
    svgText(36, 35, kanji, 30, ink, 600),
    svgText(36, 73, '萬', 28, TILE_FACE_COLORS.vermilion, 500),
  ].join('');
}

function honorFace(rank: number): string {
  if (rank === 5) {
    // 白は無地に青灰の二重枠。
    return [
      `<rect x="18" y="23" width="36" height="54" rx="1.5" fill="none" stroke="${TILE_FACE_COLORS.whiteFrame}" stroke-width="1.4" />`,
      `<rect x="21.5" y="26.5" width="29" height="47" rx="1" fill="none" stroke="${TILE_FACE_COLORS.whiteFrameSoft}" stroke-width="0.8" />`,
    ].join('');
  }
  const fill =
    rank === 6
      ? TILE_FACE_COLORS.souGreen
      : rank === 7
        ? TILE_FACE_COLORS.vermilion
        : TILE_FACE_COLORS.ink;
  return svgText(36, 52, HONOR_KANJI[rank] ?? `${rank}z`, 44, fill, 600);
}

/**
 * 牌 1 枚の牌面を SVG 文字列にする。純粋関数。
 * 同じ牌・同じオプションなら常に同じ文字列を返す（3D の CanvasTexture 用）。
 */
export function tileFaceSvg(tile: Tile, options: TileFaceOptions = {}): string {
  const red = Boolean(tile.red) && tile.suit !== 'z';
  const face =
    tile.suit === 'm'
      ? manFace(tile.rank, red)
      : tile.suit === 'p'
        ? pinFace(tile.rank, red)
        : tile.suit === 's'
          ? souFace(tile.rank, red)
          : honorFace(tile.rank);

  const mark =
    options.showSuitMark && tile.suit !== 'z'
      ? svgText(
          36,
          95,
          SUIT_MARK[tile.suit],
          7.5,
          red ? '#8f2a22' : TILE_FACE_COLORS.inkSoft,
          600,
        )
      : '';

  // 赤 5 の目印。牌面の右上に小さな朱点を添える。
  const redDot = red
    ? `<circle cx="62" cy="10" r="2.2" fill="${TILE_FACE_COLORS.vermilion}" />`
    : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE_FACE_WIDTH} ${TILE_FACE_HEIGHT}" preserveAspectRatio="xMidYMid meet" role="presentation" aria-hidden="true" data-face="${tile.suit}" data-rank="${tile.rank}" data-red="${red ? 'true' : 'false'}">`,
    face,
    mark,
    redDot,
    '</svg>',
  ].join('');
}

export { RANK_KANJI as TILE_RANK_KANJI, SUIT_MARK as TILE_SUIT_MARK };
