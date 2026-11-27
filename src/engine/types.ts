/** 牌のスート。z は字牌（1東 2南 3西 4北 5白 6發 7中）。 */
export type Suit = 'm' | 'p' | 's' | 'z';

/** 牌 1 枚。赤 5 は rank=5 かつ red=true。 */
export interface Tile {
  suit: Suit;
  rank: number;
  red?: boolean;
}

export type MeldType = 'chi' | 'pon' | 'kan';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  /** 副露なら true（暗槓は false）。 */
  open: boolean;
  kanKind?: 'open' | 'closed' | 'added';
  calledFrom?: 'left' | 'across' | 'right';
}

/** 自風・場風。1東 2南 3西 4北。 */
export type Wind = 1 | 2 | 3 | 4;

export interface WinContext {
  tsumo: boolean;
  seatWind: Wind;
  roundWind: Wind;
  riichi: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  haitei?: boolean;
  houtei?: boolean;
  rinshan?: boolean;
  chankan?: boolean;
  doraIndicators: Tile[];
  uraIndicators?: Tile[];
  honba: number;
  riichiSticks: number;
}

export interface ScoreInput {
  /** 和了時の手牌（和了牌を含む）。門前なら 14 枚。 */
  concealed: Tile[];
  melds: Meld[];
  winTile: Tile;
  ctx: WinContext;
}

export interface YakuHit {
  id: string;
  name: string;
  han: number;
  yakuman?: number;
}

export interface FuItem {
  id: string;
  label: string;
  fu: number;
}

export type WaitType =
  | 'ryanmen'
  | 'kanchan'
  | 'penchan'
  | 'tanki'
  | 'shanpon'
  | 'none';

export type LimitName =
  | 'none'
  | 'mangan'
  | 'haneman'
  | 'baiman'
  | 'sanbaiman'
  | 'yakuman';

export interface Payments {
  ron?: number;
  tsumo?: { dealer: number; nonDealer: number };
  total: number;
  honba: { ron: number; tsumoEach: number };
  riichiSticks: number;
}

export interface ScoreResult {
  ok: true;
  /** 役 + ドラの合計。 */
  han: number;
  /** 役のみ。 */
  yakuHan: number;
  /** ドラ・赤・裏。 */
  doraHan: number;
  fu: number;
  yaku: YakuHit[];
  fuItems: FuItem[];
  /** 上限適用後の基本点。 */
  basePoints: number;
  limit: LimitName;
  yakumanCount: number;
  wait: WaitType;
  decomposition: string;
  payments: Payments;
}

export type ScoreOutcome = ScoreResult | { ok: false; error: string };

export type Difficulty = 'beginner' | 'standard' | 'advanced';

export interface Problem {
  id: string;
  difficulty: Difficulty;
  input: ScoreInput;
  answer: ScoreResult;
  tags: string[];
  hint: { yaku: string[]; fu: string };
}
