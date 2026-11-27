import type {
  FuItem,
  LimitName,
  Meld,
  Payments,
  ScoreInput,
  ScoreOutcome,
  ScoreResult,
  Tile,
  WaitType,
  WinContext,
  YakuHit,
} from './types';
import type { StandardDecomposition, WinPlacement } from './decompose';
import {
  meldToSet,
  placementsForStandard,
  decomposeStandard,
  decomposeChiitoitsu,
  decomposeKokushi,
} from './decompose';
import { chiitoitsuFu, computeFu, kokushiFu } from './fu';
import {
  evaluateChiitoitsuYaku,
  evaluateKokushiYaku,
  evaluateStandardYaku,
} from './yaku';
import {
  compareTiles,
  doraFromIndicator,
  formatTiles,
  isRed,
  sameTile,
  sortTiles,
  validateTile,
} from './tiles';

function ceil100(value: number): number {
  return Math.ceil(value / 100) * 100;
}

function validateContext(ctx: WinContext): string | null {
  if (!ctx || typeof ctx !== 'object') return '場況が不正です';
  if (typeof ctx.tsumo !== 'boolean') return 'ツモ/ロンの指定が不正です';
  if (![1, 2, 3, 4].includes(ctx.seatWind)) return '自風が不正です';
  if (![1, 2, 3, 4].includes(ctx.roundWind)) return '場風が不正です';
  if (ctx.riichi && ctx.doubleRiichi) {
    return '立直とダブル立直は同時に成立しません';
  }
  if (ctx.ippatsu && !ctx.riichi && !ctx.doubleRiichi) {
    return '一発は立直（ダブル立直）が必要です';
  }
  if (ctx.haitei && ctx.houtei) {
    return '海底摸月と河底撈魚は同時に成立しません';
  }
  if (ctx.haitei && ctx.rinshan) {
    return '海底摸月と嶺上開花は同時に成立しません';
  }
  if (ctx.houtei && ctx.chankan) {
    return '河底撈魚と搶槓は同時に成立しません';
  }
  if (ctx.haitei && !ctx.tsumo) return '海底摸月はツモ和了のみです';
  if (ctx.houtei && ctx.tsumo) return '河底撈魚はロン和了のみです';
  if (ctx.rinshan && !ctx.tsumo) return '嶺上開花はツモ和了のみです';
  if (ctx.chankan && ctx.tsumo) return '搶槓はロン和了のみです';
  if (!Number.isInteger(ctx.honba) || ctx.honba < 0) return '本場が不正です';
  if (!Number.isInteger(ctx.riichiSticks) || ctx.riichiSticks < 0) {
    return '供託リーチ棒が不正です';
  }
  if (ctx.doraIndicators && !Array.isArray(ctx.doraIndicators)) {
    return 'ドラ表示牌が不正です';
  }
  if (ctx.uraIndicators !== undefined && !Array.isArray(ctx.uraIndicators)) {
    return '裏ドラ表示牌が不正です';
  }
  return null;
}

function validateMeld(meld: Meld): string | null {
  if (!meld || typeof meld !== 'object') return '副露が不正です';
  if (!['chi', 'pon', 'kan'].includes(meld.type)) return '副露の種類が不正です';
  if (!Array.isArray(meld.tiles)) return '副露の牌が不正です';
  for (const tile of meld.tiles) {
    const tileError = validateTile(tile);
    if (tileError) return tileError;
  }
  if (meld.type === 'chi') {
    if (meld.tiles.length !== 3) return '順子は 3 枚です';
    const sorted = sortTiles(meld.tiles);
    if (sorted[0].suit === 'z') return '字牌で順子は作れません';
    if (
      sorted[0].suit !== sorted[1].suit ||
      sorted[1].suit !== sorted[2].suit ||
      sorted[1].rank !== sorted[0].rank + 1 ||
      sorted[2].rank !== sorted[1].rank + 1
    ) {
      return '順子が同種の連番ではありません';
    }
    return null;
  }
  if (meld.type === 'pon') {
    if (meld.tiles.length !== 3) return '刻子は 3 枚です';
    if (!meld.tiles.every((tile) => sameTile(tile, meld.tiles[0]))) {
      return '刻子が同じ牌ではありません';
    }
    return null;
  }
  if (meld.tiles.length !== 4) return '槓子は 4 枚です';
  if (!meld.tiles.every((tile) => sameTile(tile, meld.tiles[0]))) {
    return '槓子が同じ牌ではありません';
  }
  return null;
}

function validateInput(input: ScoreInput): string | null {
  if (!input || typeof input !== 'object') return '入力が不正です';
  if (!Array.isArray(input.concealed)) return '手牌が不正です';
  if (!Array.isArray(input.melds)) return '副露が不正です';
  if (!input.winTile) return '和了牌がありません';

  const ctxError = validateContext(input.ctx);
  if (ctxError) return ctxError;

  for (const tile of input.concealed) {
    const error = validateTile(tile);
    if (error) return error;
  }
  for (const tile of input.ctx.doraIndicators ?? []) {
    const error = validateTile(tile);
    if (error) return error;
  }
  for (const tile of input.ctx.uraIndicators ?? []) {
    const error = validateTile(tile);
    if (error) return error;
  }
  const winTileError = validateTile(input.winTile);
  if (winTileError) return winTileError;

  const meldErrors = input.melds.map(validateMeld).filter(Boolean);
  if (meldErrors.length > 0) return meldErrors[0] as string;

  const physical = [
    ...input.concealed,
    ...input.melds.flatMap((meld) => meld.tiles),
  ];

  const counts = new Map<string, number>();
  for (const tile of physical) {
    const key = `${tile.suit}${tile.rank}`;
    const next = (counts.get(key) ?? 0) + 1;
    if (next > 4) return `同じ牌が 5 枚以上あります: ${tile.rank}${tile.suit}`;
    counts.set(key, next);
  }

  const redCounts = new Map<string, number>();
  for (const tile of physical) {
    if (!isRed(tile)) continue;
    const next = (redCounts.get(tile.suit) ?? 0) + 1;
    if (next > 1) return `赤 5 が 2 枚以上あります: ${tile.suit}`;
    redCounts.set(tile.suit, next);
  }

  const logicalCount = input.concealed.length + input.melds.length * 3;
  if (logicalCount !== 14) {
    return `牌枚数が合いません（${logicalCount} 枚）`;
  }

  if (!input.concealed.some((tile) => sameTile(tile, input.winTile))) {
    return '和了牌が手牌にありません';
  }

  const closed = input.melds.every((meld) => !meld.open);
  if (!closed && (input.ctx.riichi || input.ctx.doubleRiichi)) {
    return '立直は門前の手でのみ成立します';
  }

  if (input.ctx.rinshan) {
    const kanCount = input.melds.filter((meld) => meld.type === 'kan').length;
    if (kanCount === 0) return '嶺上開花には槓子が必要です';
  }

  return null;
}

function countDora(
  physical: readonly Tile[],
  indicators: readonly Tile[],
): number {
  let count = 0;
  for (const physicalTile of physical) {
    if (isRed(physicalTile)) count += 1;
  }
  for (const indicator of indicators) {
    const dora = doraFromIndicator(indicator);
    for (const tile of physical) {
      if (sameTile(tile, dora)) count += 1;
    }
  }
  return count;
}

interface LimitResult {
  basePoints: number;
  limit: LimitName;
}

function computeLimit(
  han: number,
  fu: number,
  yakumanCount: number,
): LimitResult {
  if (yakumanCount > 0) {
    return { basePoints: 8000 * yakumanCount, limit: 'yakuman' };
  }
  if (han >= 13) return { basePoints: 8000, limit: 'yakuman' };
  if (han >= 11) return { basePoints: 6000, limit: 'sanbaiman' };
  if (han >= 8) return { basePoints: 4000, limit: 'baiman' };
  if (han >= 6) return { basePoints: 3000, limit: 'haneman' };
  const raw = fu * 2 ** (han + 2);
  if (han >= 5 || raw >= 2000) return { basePoints: 2000, limit: 'mangan' };
  return { basePoints: raw, limit: 'none' };
}

function computePayments(
  basePoints: number,
  ctx: WinContext,
): Payments {
  const isDealer = ctx.seatWind === 1;
  const honba = {
    ron: 300 * ctx.honba,
    tsumoEach: 100 * ctx.honba,
  };
  const riichiSticks = 1000 * ctx.riichiSticks;

  if (ctx.tsumo) {
    if (isDealer) {
      const each = ceil100(basePoints * 2);
      return {
        tsumo: { dealer: each, nonDealer: each },
        total: each * 3,
        honba,
        riichiSticks,
      };
    }
    const dealerPay = ceil100(basePoints * 2);
    const nonDealerPay = ceil100(basePoints);
    return {
      tsumo: { dealer: dealerPay, nonDealer: nonDealerPay },
      total: dealerPay + nonDealerPay * 2,
      honba,
      riichiSticks,
    };
  }

  const ron = ceil100(basePoints * (isDealer ? 6 : 4));
  return { ron, total: ron, honba, riichiSticks };
}

function buildDecompositionString(
  sets: Array<{ tiles: Tile[] }>,
  pair: Tile[],
): string {
  const sortedSets = [...sets].sort((a, b) =>
    compareTiles(a.tiles[0], b.tiles[0]),
  );
  return [...sortedSets.map((set) => formatTiles(set.tiles)), formatTiles(pair)].join(
    ' ',
  );
}

function candidateValue(result: ScoreResult): number {
  return result.payments.total;
}

function isBetter(a: ScoreResult, b: ScoreResult): boolean {
  if (candidateValue(a) !== candidateValue(b)) {
    return candidateValue(a) > candidateValue(b);
  }
  const aHan = a.yakumanCount * 13 + a.han;
  const bHan = b.yakumanCount * 13 + b.han;
  if (aHan !== bHan) return aHan > bHan;
  return a.fu > b.fu;
}

function makeResult(params: {
  han: number;
  yakuHan: number;
  doraHan: number;
  fu: number;
  fuItems: FuItem[];
  yaku: YakuHit[];
  yakumanCount: number;
  wait: WaitType;
  decomposition: string;
  ctx: WinContext;
}): ScoreResult {
  const { basePoints, limit } = computeLimit(
    params.han,
    params.fu,
    params.yakumanCount,
  );
  return {
    ok: true,
    han: params.han,
    yakuHan: params.yakuHan,
    doraHan: params.doraHan,
    fu: params.fu,
    yaku: params.yaku,
    fuItems: params.fuItems,
    basePoints,
    limit,
    yakumanCount: params.yakumanCount,
    wait: params.wait,
    decomposition: params.decomposition,
    payments: computePayments(basePoints, params.ctx),
  };
}

function scoreStandardCandidate(
  hand: StandardDecomposition,
  placement: WinPlacement,
  winTile: Tile,
  ctx: WinContext,
  doraHan: number,
): ScoreResult | null {
  const evaluation = evaluateStandardYaku(hand, placement, ctx, { winTile });
  const isYakuman = evaluation.yakumanCount > 0;
  if (!isYakuman && evaluation.yakuHan === 0) return null;
  const fu = computeFu(hand, placement, ctx, hand.sets.every((set) => !set.open));
  const yakuHan = isYakuman ? 0 : evaluation.yakuHan;
  return makeResult({
    han: isYakuman ? 0 : yakuHan + doraHan,
    yakuHan,
    doraHan: isYakuman ? 0 : doraHan,
    fu: fu.fu,
    fuItems: fu.items,
    yaku: evaluation.hits,
    yakumanCount: evaluation.yakumanCount,
    wait: placement.wait,
    decomposition: buildDecompositionString(hand.sets, hand.pair),
    ctx,
  });
}

/** 点数計算の公開 API。不正入力でも例外を投げない。 */
export function computeScore(input: ScoreInput): ScoreOutcome {
  try {
    const error = validateInput(input);
    if (error) return { ok: false, error };

    const ctx = input.ctx;
    const winTile = input.winTile;
    const physical = [
      ...input.concealed,
      ...input.melds.flatMap((meld) => meld.tiles),
    ];
    const indicators = [
      ...(ctx.doraIndicators ?? []),
      ...((ctx.riichi || ctx.doubleRiichi) && ctx.uraIndicators
        ? ctx.uraIndicators
        : []),
    ];
    const doraHan = countDora(physical, indicators);

    const candidates: ScoreResult[] = [];
    const meldSets = input.melds.map(meldToSet);
    let hadShape = false;

    for (const concealed of decomposeStandard(input.concealed)) {
      const full: StandardDecomposition = {
        type: 'standard',
        sets: [...meldSets, ...concealed.sets],
        pair: concealed.pair,
      };
      for (const placement of placementsForStandard(concealed, winTile)) {
        hadShape = true;
        const adjusted: WinPlacement =
          typeof placement.winSet === 'number'
            ? { ...placement, winSet: placement.winSet + meldSets.length }
            : placement;
        const result = scoreStandardCandidate(full, adjusted, winTile, ctx, doraHan);
        if (result) candidates.push(result);
      }
    }

    if (input.melds.length === 0) {
      const chiitoitsu = decomposeChiitoitsu(input.concealed);
      if (chiitoitsu) {
        hadShape = true;
        const evaluation = evaluateChiitoitsuYaku(chiitoitsu.pairs, ctx);
        const isYakuman = evaluation.yakumanCount > 0;
        const fu = chiitoitsuFu();
        const sortedPairs = [...chiitoitsu.pairs].sort((a, b) =>
          compareTiles(a[0], b[0]),
        );
        const yakuHan = isYakuman ? 0 : evaluation.yakuHan;
        candidates.push(
          makeResult({
            han: isYakuman ? 0 : yakuHan + doraHan,
            yakuHan,
            doraHan: isYakuman ? 0 : doraHan,
            fu: fu.fu,
            fuItems: fu.items,
            yaku: evaluation.hits,
            yakumanCount: evaluation.yakumanCount,
            wait: 'tanki',
            decomposition: sortedPairs.map((pair) => formatTiles(pair)).join(' '),
            ctx,
          }),
        );
      }

      const kokushi = decomposeKokushi(input.concealed);
      if (kokushi) {
        hadShape = true;
        const evaluation = evaluateKokushiYaku();
        const fu = kokushiFu();
        candidates.push(
          makeResult({
            han: 0,
            yakuHan: 0,
            doraHan: 0,
            fu: fu.fu,
            fuItems: fu.items,
            yaku: evaluation.hits,
            yakumanCount: evaluation.yakumanCount,
            wait: 'tanki',
            decomposition: formatTiles(kokushi.tiles),
            ctx,
          }),
        );
      }
    }

    if (candidates.length === 0) {
      return {
        ok: false,
        error: hadShape
          ? '役がありません（ドラのみの手は和了できません）'
          : '和了形ではありません',
      };
    }

    let best = candidates[0];
    for (const candidate of candidates.slice(1)) {
      if (isBetter(candidate, best)) best = candidate;
    }

    if (best.yakumanCount === 0 && best.yakuHan === 0) {
      return {
        ok: false,
        error: '役がありません（ドラのみの手は和了できません）',
      };
    }

    return best;
  } catch (unknownError) {
    const message =
      unknownError instanceof Error ? unknownError.message : String(unknownError);
    return { ok: false, error: `計算に失敗しました: ${message}` };
  }
}
