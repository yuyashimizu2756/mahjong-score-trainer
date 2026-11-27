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
    [22, 22],
    [50, 22],
    [78, 22],
    [34, 50],
    [66, 50],
    [34, 76],
    [66, 76],
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
    [22, 22],
    [50, 22],
    [78, 22],
    [22, 50],
    [50, 50],
    [78, 50],
    [22, 78],
    [50, 78],
    [78, 78],
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
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${TILE_FACE_COLORS.ivory}" stroke="${stroke}" stroke-width="${big ? 2.4 : 1.9}" />`,
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.62)}" fill="none" stroke="${middle}" stroke-width="${big ? 1.5 : 1.25}" />`,
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
  const radius = big ? 16.5 : 8.4;
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
  return `<g class="bamboo" transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})"><rect x="-3.6" y="-11" width="7.2" height="22" rx="3.6" fill="${fill}" stroke="${dark}" stroke-width="0.85" /><rect x="-2.4" y="-9.5" width="1.7" height="19" rx="0.85" fill="${light}" opacity="0.75" /><path d="M-3.5 -3.9 H3.5 M-3.5 2.9 H3.5" stroke="${dark}" stroke-width="1.05" opacity="0.65" fill="none" /><path d="M0 -10.5 C1.9 -14.2, 5.2 -14.8, 7.4 -15.4 C5.2 -11, 3.2 -9.6, 0 -9.2 Z" fill="${light}" stroke="${dark}" stroke-width="0.45" /></g>`;
}

function peacock(): string {
  const green = TILE_FACE_COLORS.souGreen;
  const dark = TILE_FACE_COLORS.souGreenDark;
  const red = TILE_FACE_COLORS.vermilion;
  return [
    '<g class="peacock" transform="translate(36 52)">',
    // 尾羽 5 本。胴の後ろ（左）から扇状に広げ、先端に朱の丸を置く。
    `<path d="M-7 1 C-16 -1, -21 0, -24 2" fill="none" stroke="${green}" stroke-width="2.8" stroke-linecap="round" />`,
    `<path d="M-7 3 C-17 5, -22 7, -24 10" fill="none" stroke="${green}" stroke-width="2.8" stroke-linecap="round" />`,
    `<path d="M-6 6 C-15 10, -18 15, -19 18" fill="none" stroke="${green}" stroke-width="2.8" stroke-linecap="round" />`,
    `<path d="M-5 8 C-11 15, -12 21, -11 25" fill="none" stroke="${green}" stroke-width="2.8" stroke-linecap="round" />`,
    `<path d="M-4 9 C-2 17, 0 23, -1 27" fill="none" stroke="${green}" stroke-width="2.8" stroke-linecap="round" />`,
    `<circle cx="-24" cy="2" r="2.1" fill="${red}" />`,
    `<circle cx="-24" cy="10" r="2.1" fill="${red}" />`,
    `<circle cx="-19" cy="18" r="2.1" fill="${red}" />`,
    `<circle cx="-11" cy="25" r="2.1" fill="${red}" />`,
    `<circle cx="-1" cy="27" r="2.1" fill="${red}" />`,
    // 胴（大きく丸く）
    `<ellipse cx="0" cy="2" rx="10" ry="12" fill="${green}" stroke="${dark}" stroke-width="1" />`,
    `<path d="M-7 -1 C-14 4, -9 13, 2 12 C-4 7, -4 3, 0 -2 Z" fill="#3f9562" />`,
    // 首・頭
    `<path d="M4 -8 C5.5 -10.5, 7 -12, 8.5 -13.5" fill="none" stroke="${green}" stroke-width="5" stroke-linecap="round" />`,
    `<circle cx="9" cy="-15" r="5.5" fill="${green}" stroke="${dark}" stroke-width="0.9" />`,
    // 金の嘴
    `<path d="M14 -15.8 L19.5 -13.9 L14 -12.6 Z" fill="${TILE_FACE_COLORS.gold}" />`,
    `<circle cx="10.8" cy="-16.4" r="1.1" fill="${TILE_FACE_COLORS.ivory}" />`,
    `<circle cx="11" cy="-16.4" r="0.55" fill="${TILE_FACE_COLORS.ink}" />`,
    // 冠羽
    `<path d="M7.5 -20 L6.5 -25 M9 -20.5 L9.5 -26 M10.5 -20 L12 -24.5" stroke="${green}" stroke-width="1.4" stroke-linecap="round" />`,
    // 脚は描かない（40px でも棒人間に見えないようにする）。
    '</g>',
  ].join('');
}

function souFace(rank: number, red: boolean): string {
  if (rank === 1) return peacock();
  const positions = PIP_POSITIONS[rank] ?? PIP_POSITIONS[1];
  const scale = rank === 8 ? 0.78 : rank >= 7 ? 0.84 : 0.92;
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
    options.showSuitMark && (tile.suit === 'p' || tile.suit === 's')
      ? svgText(
          36,
          95,
          SUIT_MARK[tile.suit],
          8.5,
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
