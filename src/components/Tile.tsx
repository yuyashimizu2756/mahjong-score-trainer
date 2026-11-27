import type { Tile as TileType } from '../engine/types';
import { HONOR_NAMES, SUIT_NAMES, isRed, tileToLabel } from '../engine/tiles';

export type TileSize = 'sm' | 'md' | 'lg';

export interface TileProps {
  tile: TileType;
  faceDown?: boolean;
  size?: TileSize;
  /** 副露の鳴き牌などを横向きに表示する。 */
  rotated?: boolean;
  /** 和了牌などのハイライト。 */
  highlight?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<TileSize, string> = {
  sm: 'h-8 w-6 text-[0.6rem]',
  md: 'h-11 w-8 text-xs',
  lg: 'h-14 w-10 text-sm',
};

const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

const SUIT_MARK: Record<TileType['suit'], string> = {
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
  className = '',
}: TileProps) {
  const sizeClass = SIZE_CLASSES[size];
  const label = faceDown ? '伏せ牌' : `${SUIT_NAMES[tile.suit]} ${tileToLabel(tile)}`;
  const red = !faceDown && isRed(tile);

  if (faceDown) {
    return (
      <span
        aria-label={label}
        role="img"
        data-tile="back"
        className={[
          'relative inline-flex shrink-0 items-center justify-center rounded-[4px]',
          'border border-forest-soft bg-forest shadow-[inset_0_0_0_2px_rgba(243,238,226,0.12)]',
          sizeClass,
          rotated ? 'rotate-90' : '',
          className,
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className="h-2/5 w-2/5 rounded-[2px] border border-paper/25 bg-forest-soft/70"
        />
      </span>
    );
  }

  const { main, mark } = faceContent(tile);

  return (
    <span
      role="img"
      aria-label={label}
      data-tile={`${tile.suit}${tile.rank}`}
      data-red={red ? 'true' : undefined}
      className={[
        'relative inline-flex shrink-0 select-none flex-col items-center justify-center',
        'rounded-[4px] border bg-paper-soft leading-none shadow-sm',
        highlight
          ? 'border-vermillion ring-2 ring-vermillion/50'
          : 'border-kinari',
        sizeClass,
        rotated ? 'rotate-90' : '',
        className,
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'font-semibold tracking-tight',
          red ? 'text-vermillion' : SUIT_CLASS[tile.suit],
          tile.suit === 'z' ? 'text-[1.15em]' : 'text-[1.25em]',
        ].join(' ')}
      >
        {main}
      </span>
      {mark ? (
        <span
          aria-hidden="true"
          className={[
            'mt-[0.1em] text-[0.55em] opacity-80',
            red ? 'text-vermillion' : SUIT_CLASS[tile.suit],
          ].join(' ')}
        >
          {mark}
        </span>
      ) : null}
      {red ? (
        <span
          aria-hidden="true"
          className="absolute right-[2px] top-[1px] h-1 w-1 rounded-full bg-vermillion"
        />
      ) : null}
    </span>
  );
}
