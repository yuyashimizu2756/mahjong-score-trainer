import { memo } from 'react';
import type { Tile as TileType } from '../../engine/types';
import { HONOR_NAMES, isRed } from '../../engine/tiles';
import { TileFace } from './TileFace';

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

/** viewBox 72×100 に対する実寸。比率は約 1 : 1.4 で固定。 */
const SIZE_CLASSES: Record<TileSize, string> = {
  sm: 'h-[45px] w-[32px]',
  md: 'h-[62px] w-[44px]',
  lg: 'h-[80px] w-[58px]',
};

/** 90 度回転すると横幅が高さに変わるため、はみ出す分の余白を確保する。
    下端は他の牌と揃え、横向き牌だけが浮かないようにする。 */
const ROTATED_LAYOUT: Record<TileSize, string> = {
  sm: 'mx-[6.5px] mb-[-6.5px]',
  md: 'mx-[9px] mb-[-9px]',
  lg: 'mx-[11px] mb-[-11px]',
};

const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

const SUIT_NAME: Record<TileType['suit'], string> = {
  m: '萬',
  p: '筒',
  s: '索',
  z: '',
};

function numberLabel(tile: TileType, red: boolean): string {
  return `${red ? '赤' : ''}${RANK_KANJI[tile.rank - 1] ?? tile.rank}${
    SUIT_NAME[tile.suit]
  }`;
}

function TileComponent({
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
          'tile-shell select-none',
          sizeClass,
          rotated ? `rotate-90 ${ROTATED_LAYOUT[size]}` : '',
          className,
        ].join(' ')}
      >
        <span aria-hidden="true" className="tile tile-back">
          <span className="tile-face tile-face--back">
            <span className="tile-back-diamond" />
          </span>
        </span>
      </span>
    );
  }

  const label =
    tile.suit === 'z'
      ? `${HONOR_NAMES[tile.rank] ?? '?'}`
      : numberLabel(tile, red);

  return (
    <span
      role="img"
      aria-label={highlight ? `${label}（和了牌）` : label}
      data-tile={`${tile.suit}${tile.rank}`}
      data-red={red ? 'true' : undefined}
      data-highlight={highlight ? 'true' : undefined}
      className={[
        'tile-shell relative select-none',
        sizeClass,
        rotated ? `rotate-90 ${ROTATED_LAYOUT[size]}` : '',
        className,
      ].join(' ')}
    >
      {highlight ? (
        <span aria-hidden="true" className="tile-win-label">
          和了
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={['tile', highlight ? 'tile--win' : ''].join(' ')}
      >
        <span className="tile-face">
          <TileFace tile={tile} showSuitMark={showSuitMark} />
        </span>
      </span>
    </span>
  );
}

/** 牌 1 枚。SVG + CSS だけで描画する（画像・外部フォントなし）。 */
export const Tile = memo(TileComponent);
