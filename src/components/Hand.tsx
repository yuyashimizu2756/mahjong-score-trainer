import type { Meld, Tile as TileType } from '../engine/types';
import { formatTiles, sameTile } from '../engine/tiles';
import { Tile } from './Tile';
import type { TileSize } from './Tile';

export interface HandProps {
  /** 和了牌を含む手牌。 */
  concealed: readonly TileType[];
  melds?: readonly Meld[];
  winTile?: TileType;
  size?: TileSize;
  showSuitMark?: boolean;
  className?: string;
}

const MELD_LABEL: Record<Meld['type'], string> = {
  chi: 'チー',
  pon: 'ポン',
  kan: 'カン',
};

function winIndex(tiles: readonly TileType[], winTile?: TileType): number {
  if (!winTile) return -1;
  const exact = tiles.findIndex(
    (tile) =>
      sameTile(tile, winTile) && Boolean(tile.red) === Boolean(winTile.red),
  );
  if (exact !== -1) return exact;
  return tiles.findIndex((tile) => sameTile(tile, winTile));
}

/** 手牌 + 副露 + 和了牌ハイライト。エンジンの型だけに依存する。 */
export function Hand({
  concealed,
  melds = [],
  winTile,
  size = 'md',
  showSuitMark = true,
  className = '',
}: HandProps) {
  const highlight = winIndex(concealed, winTile);
  const meldText = melds
    .map((meld) => `${MELD_LABEL[meld.type]} ${formatTiles(meld.tiles)}`)
    .join(' / ');
  const label = `手牌 ${formatTiles(concealed)}${meldText ? ` / 副露 ${meldText}` : ''}`;

  return (
    <div
      role="group"
      aria-label={label}
      className={[
        'flex flex-wrap items-end gap-y-3',
        highlight >= 0 ? 'pt-4' : '',
        className,
      ].join(' ')}
    >
      <div className="flex flex-wrap items-end gap-[2px]">
        {concealed.map((tile, index) => (
          <Tile
            key={`${tile.suit}${tile.rank}-${index}`}
            tile={tile}
            size={size}
            highlight={index === highlight}
            showSuitMark={showSuitMark}
          />
        ))}
      </div>

      {melds.map((meld, meldIndex) => (
        <div
          key={`${meld.type}-${meldIndex}`}
          aria-label={`${MELD_LABEL[meld.type]} ${formatTiles(meld.tiles)}`}
          className="ml-2 flex items-end gap-[2px] rounded-sm border-l-2 border-ink-500/30 pl-2"
        >
          {meld.tiles.map((tile, tileIndex) => (
            <Tile
              key={`${tile.suit}${tile.rank}-${tileIndex}`}
              tile={tile}
              size={size}
              rotated={meld.open && tileIndex === 0}
              showSuitMark={showSuitMark}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
