import type { Tile as TileType } from '../engine/types';
import { HONOR_NAMES, isRed } from '../engine/tiles';

export type TileSize = 'sm' | 'md' | 'lg';

export interface TileProps {
  tile: TileType;
  faceDown?: boolean;
  size?: TileSize;
  /** 副露の鳴き牌などを横向きに表示する。 */
  rotated?: boolean;
  /** 和了牌などのハイライト。 */
  highlight?: boolean;
  /** スート記号（萬/筒/索）を表示する。色覚配慮の設定に対応。 */
  showSuitMark?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<TileSize, string> = {
  sm: 'h-[42px] w-[30px]',
  md: 'h-[56px] w-[40px]',
  lg: 'h-[72px] w-[52px]',
};

const MAIN_SIZE: Record<TileSize, string> = {
  sm: 'text-[15px]',
  md: 'text-[19px]',
  lg: 'text-[25px]',
};

const MARK_SIZE: Record<TileSize, string> = {
  sm: 'text-[8px]',
  md: 'text-[10px]',
  lg: 'text-[12px]',
};

const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

const SUIT_MARK: Record<TileType['suit'], string> = {
  m: '萬',
  p: '筒',
  s: '索',
  z: '',
};

const SUIT_NAME: Record<TileType['suit'], string> = {
  m: '萬',
  p: '筒',
  s: '索',
  z: '',
};

const SUIT_CLASS: Record<TileType['suit'], string> = {
  m: 'text-tile-man',
  p: 'text-tile-pin',
  s: 'text-tile-sou',
  z: 'text-tile-honor',
};

function faceContent(tile: TileType): { main: string; mark: string } {
  if (tile.suit === 'z') {
    return { main: HONOR_NAMES[tile.rank] ?? '?', mark: '' };
  }
  return {
    main: RANK_KANJI[tile.rank - 1] ?? String(tile.rank),
    mark: SUIT_MARK[tile.suit],
  };
}

/** 牌 1 枚。CSS だけで描画する（画像・外部フォントなし）。 */
export function Tile({
  tile,
  faceDown = false,
  size = 'md',
  rotated = false,
  highlight = false,
  showSuitMark = true,
  className = '',
}: TileProps) {
  const sizeClass = SIZE_CLASSES[size];
  const red = !faceDown && isRed(tile);

  if (faceDown) {
    return (
      <span
        aria-label="伏せ牌"
        role="img"
        data-tile="back"
        className={[
          'tile-back relative inline-flex shrink-0 items-center justify-center rounded-[6px]',
          sizeClass,
          rotated ? 'rotate-90' : '',
          className,
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className="h-2/5 w-2/5 rounded-[2px] border border-gold/40 bg-felt-800/60"
        />
      </span>
    );
  }

  const { main, mark } = faceContent(tile);
  const label =
    tile.suit === 'z'
      ? `${HONOR_NAMES[tile.rank] ?? '?'}`
      : `${red ? '赤' : ''}${RANK_KANJI[tile.rank - 1] ?? tile.rank}${
          SUIT_NAME[tile.suit]
        }`;

  return (
    <span
      role="img"
      aria-label={highlight ? `${label}（和了牌）` : label}
      data-tile={`${tile.suit}${tile.rank}`}
      data-red={red ? 'true' : undefined}
      data-highlight={highlight ? 'true' : undefined}
      className={[
        'tile-face relative inline-flex shrink-0 select-none flex-col items-center justify-center rounded-[6px] leading-none',
        highlight ? 'border-t-4 border-t-gold ring-2 ring-gold/60' : '',
        sizeClass,
        rotated ? 'rotate-90' : '',
        className,
      ].join(' ')}
    >
      {highlight ? (
        <span
          aria-hidden="true"
          className="absolute -top-[15px] left-1/2 -translate-x-1/2 rounded-sm bg-gold px-1 py-[1px] text-[8px] font-bold leading-none text-ink-900"
        >
          和了
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={[
          'font-semibold tracking-tight',
          red ? 'text-tile-red' : SUIT_CLASS[tile.suit],
          MAIN_SIZE[size],
        ].join(' ')}
      >
        {main}
      </span>
      {mark && showSuitMark ? (
        <span
          aria-hidden="true"
          className={[
            'mt-[2px] leading-none opacity-85',
            MARK_SIZE[size],
            red ? 'text-tile-red' : SUIT_CLASS[tile.suit],
          ].join(' ')}
        >
          {mark}
        </span>
      ) : null}
      {red ? (
        <span
          aria-hidden="true"
          className="absolute right-[3px] top-[2px] h-1.5 w-1.5 rounded-full bg-tile-red"
        />
      ) : null}
    </span>
  );
}
