import type {
  FuItem,
  Tile,
  WaitType,
  WinContext,
} from './types';
import type { StandardDecomposition, WinPlacement } from './decompose';
import { isHonor, isTerminalOrHonor } from './tiles';

/** 雀頭が役牌（三元牌・自風・場風）か。連風牌でも 1 回だけ数える。 */
export function isYakuhaiPair(
  pairTile: Tile,
  ctx: Pick<WinContext, 'seatWind' | 'roundWind'>,
): boolean {
  if (!isHonor(pairTile)) return false;
  if (pairTile.rank >= 5) return true;
  return pairTile.rank === ctx.seatWind || pairTile.rank === ctx.roundWind;
}

/** 雀頭が連風牌（自風 = 場風）か。 */
export function isDoubleWindPair(
  pairTile: Tile,
  ctx: Pick<WinContext, 'seatWind' | 'roundWind'>,
): boolean {
  return (
    isHonor(pairTile) &&
    pairTile.rank <= 4 &&
    pairTile.rank === ctx.seatWind &&
    pairTile.rank === ctx.roundWind
  );
}

/** 平和の形か（門前・全順子・非役牌雀頭・両面待ち）。 */
export function isPinfuShape(
  hand: Pick<StandardDecomposition, 'sets' | 'pair'>,
  wait: WaitType,
  closed: boolean,
  ctx: Pick<WinContext, 'seatWind' | 'roundWind'>,
): boolean {
  return (
    closed &&
    wait === 'ryanmen' &&
    hand.sets.length === 4 &&
    hand.sets.every((set) => set.kind === 'run') &&
    !isYakuhaiPair(hand.pair[0], ctx)
  );
}

function setConcealedForFu(
  hand: StandardDecomposition,
  placement: WinPlacement,
  setIndex: number,
  tsumo: boolean,
): boolean {
  const set = hand.sets[setIndex];
  if (set.open) return false;
  if (set.kind === 'kan') return true;
  if (!tsumo && placement.winSet === setIndex && set.kind === 'triplet') {
    // ロンで完成した刻子は明刻として扱う。
    return false;
  }
  return true;
}

export interface FuResult {
  fu: number;
  items: FuItem[];
}

function push(items: FuItem[], id: string, label: string, fu: number): void {
  if (fu !== 0) items.push({ id, label, fu });
}

/** 標準形の符を計算する。 */
export function computeFu(
  hand: StandardDecomposition,
  placement: WinPlacement,
  ctx: WinContext,
  closed: boolean,
): FuResult {
  const items: FuItem[] = [];
  let total = 20;
  push(items, 'base', '副底', 20);

  const pinfu = isPinfuShape(hand, placement.wait, closed, ctx);

  if (closed && !ctx.tsumo) {
    total += 10;
    push(items, 'menzenRon', '門前ロン', 10);
  }

  if (ctx.tsumo && !pinfu) {
    total += 2;
    push(items, 'tsumo', 'ツモ', 2);
  }

  if (
    placement.wait === 'tanki' ||
    placement.wait === 'kanchan' ||
    placement.wait === 'penchan'
  ) {
    total += 2;
    const labels: Record<string, string> = {
      tanki: '単騎待ち',
      kanchan: '嵌張待ち',
      penchan: '辺張待ち',
    };
    push(items, `wait_${placement.wait}`, labels[placement.wait], 2);
  }

  const pairTile = hand.pair[0];
  if (isYakuhaiPair(pairTile, ctx)) {
    const label = isDoubleWindPair(pairTile, ctx)
      ? '雀頭（連風牌）'
      : '雀頭（役牌）';
    total += 2;
    push(items, 'pairYakuhai', label, 2);
  }

  hand.sets.forEach((set, index) => {
    if (set.kind === 'run') return;
    const concealed = setConcealedForFu(hand, placement, index, ctx.tsumo);
    const terminal = isTerminalOrHonor(set.tiles[0]);
    if (set.kind === 'kan') {
      const fu = terminal ? (concealed ? 32 : 16) : concealed ? 16 : 8;
      total += fu;
      push(
        items,
        `kan_${concealed ? 'closed' : 'open'}_${terminal ? 'terminal' : 'simple'}`,
        `${terminal ? '幺九' : '中張'}${concealed ? '暗槓' : '明槓'}`,
        fu,
      );
    } else {
      const fu = terminal ? (concealed ? 8 : 4) : concealed ? 4 : 2;
      total += fu;
      push(
        items,
        `triplet_${concealed ? 'closed' : 'open'}_${terminal ? 'terminal' : 'simple'}`,
        `${terminal ? '幺九' : '中張'}${concealed ? '暗刻' : '明刻'}`,
        fu,
      );
    }
  });

  if (total === 20 && !ctx.tsumo) {
    // 喰い平和形のロンは 20 符 → 30 符。
    total = 30;
    push(items, 'kuipinfu', '喰い平和形', 10);
    return { fu: 30, items };
  }

  if (pinfu && ctx.tsumo) {
    // 平和ツモは 20 符（ツモ +2 を足さない）。
    return { fu: 20, items };
  }

  const rounded = Math.ceil(total / 10) * 10;
  if (rounded !== total) {
    push(items, 'roundUp', '切り上げ', rounded - total);
  }
  return { fu: rounded, items };
}

/** 七対子の符（25 符固定）。 */
export function chiitoitsuFu(): FuResult {
  return { fu: 25, items: [{ id: 'chiitoitsu', label: '七対子', fu: 25 }] };
}

/** 国士無双の符（表示用、点数には使わない）。 */
export function kokushiFu(): FuResult {
  return { fu: 25, items: [{ id: 'kokushi', label: '国士無双', fu: 25 }] };
}
