import type {
  Meld,
  MeldType,
  ScoreInput,
  Tile,
  WinContext,
} from '../src/engine/types';
import { parseTiles } from '../src/engine/tiles';

export function tiles(input: string): Tile[] {
  const parsed = parseTiles(input);
  if (!parsed) throw new Error(`parse failed: ${input}`);
  return parsed;
}

export function meld(type: MeldType, input: string, open = true): Meld {
  return { type, tiles: tiles(input), open };
}

export function ctx(overrides: Partial<WinContext> = {}): WinContext {
  return {
    tsumo: false,
    seatWind: 2,
    roundWind: 1,
    riichi: false,
    doraIndicators: [],
    honba: 0,
    riichiSticks: 0,
    ...overrides,
  };
}

export function input(
  concealed: string,
  winTile: string,
  options: {
    melds?: Meld[];
    ctx?: Partial<WinContext>;
  } = {},
): ScoreInput {
  return {
    concealed: tiles(concealed),
    melds: options.melds ?? [],
    winTile: tiles(winTile)[0],
    ctx: ctx(options.ctx),
  };
}
