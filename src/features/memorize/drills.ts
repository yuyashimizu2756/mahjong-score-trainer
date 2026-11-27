import { YAKU_CATALOG, type YakuEntry } from '../../data/yaku';
import {
  formatFu,
  formatHan,
  formatLimit,
  formatNumber,
  paymentView,
} from '../../lib/format';
import {
  FU_ROWS,
  limitOf,
  scoreCell,
  type TableCell,
} from '../../lib/score-table';
import { hashString, seededRandom, seededShuffle } from '../../lib/seed';
import {
  DRILL_KINDS,
  DRILL_SESSION_SIZE,
  pickDrillSession,
  type DrillKind,
  type DrillState,
} from '../../lib/srs';

/** 問題の内容を表す安定キー。id は kind + このキーのハッシュ。 */
export interface DrillMeta {
  fu?: number;
  han?: number;
  dealer?: boolean;
  tsumo?: boolean;
  yakuId?: string;
  open?: boolean;
  rawFu?: number;
  expectedFu?: number;
  meld?: string;
  wait?: string;
}

export interface DrillChoice {
  id: string;
  label: string;
}

export interface DrillQuestion {
  id: string;
  kind: DrillKind;
  /** 内容キー（id の元）。 */
  key: string;
  prompt: string;
  /** 問題の前提（場況・構成）を 1 行ずつ。 */
  context: string[];
  /** 牌姿を出す場合の牌（Hand に渡す）。 */
  tiles?: string;
  win?: string;
  choices: DrillChoice[];
  correctIndex: number;
  explanation: string;
  meta: DrillMeta;
}

export interface DrillKindMeta {
  name: string;
  short: string;
  description: string;
}

export const DRILL_KIND_META: Record<DrillKind, DrillKindMeta> = {
  score: {
    name: '点数表穴埋め',
    short: '点数',
    description: '符・翻・子/親・ツモ/ロンから支払いを選ぶ。近い誤答つき。',
  },
  fu: {
    name: '符カウント',
    short: '符',
    description: '面子・待ち・雀頭・和了方から符を数え、合計を切り上げる。',
  },
  han: {
    name: '翻数カード',
    short: '翻',
    description: '役名を見て、門前と副露の翻数を即答する。',
  },
  payment: {
    name: '支払いクイズ',
    short: '支払い',
    description: '「子ツモ 3 翻 40 符は？」を 4 択で。ツモとロンの形に慣れる。',
  },
};

const SCORE_FU = [30, 40, 50, 60, 70] as const;
const SCORE_HAN = [1, 2, 3, 4, 5, 6, 8, 11, 13] as const;
const PAYMENT_HAN = [1, 2, 3, 4, 5, 6, 8, 13] as const;

function questionId(kind: DrillKind, key: string): string {
  return `${kind}:${hashString(key).toString(36)}`;
}

function round10(value: number): number {
  return Math.ceil(value / 10) * 10;
}

function makeChoices(
  correct: string,
  wrong: readonly string[],
  seed: string,
): { choices: DrillChoice[]; correctIndex: number } {
  const unique: string[] = [correct];
  for (const label of wrong) {
    if (unique.length >= 4) break;
    if (label && !unique.includes(label)) unique.push(label);
  }
  const shuffled = seededShuffle(unique, seed);
  return {
    choices: shuffled.map((label, index) => ({ id: `c${index}`, label })),
    correctIndex: shuffled.indexOf(correct),
  };
}

function paymentLabel(cell: TableCell, dealer: boolean): string {
  return paymentView({
    ron: cell.ron,
    tsumo: cell.tsumo,
    total: cell.total,
    dealer,
  }).label;
}

function ceil100(value: number): number {
  return Math.ceil(value / 100) * 100;
}

interface ScoreCandidate {
  label: string;
  total: number;
}

function scoreCandidates(
  fu: number,
  han: number,
  dealer: boolean,
  tsumo: boolean,
  correctLabel: string,
): ScoreCandidate[] {
  const seen = new Set<string>([correctLabel]);
  const candidates: ScoreCandidate[] = [];
  const push = (nextFu: number, nextHan: number): void => {
    if (nextHan < 1 || nextHan > 13) return;
    if (!(FU_ROWS as readonly number[]).includes(nextFu)) return;
    const cell = scoreCell(nextFu, nextHan, { dealer, tsumo });
    if (!cell.valid) return;
    const label = paymentLabel(cell, dealer);
    if (seen.has(label)) return;
    seen.add(label);
    candidates.push({ label, total: cell.total });
  };

  // 1 翻違い・10 符違いを優先し、満貫の境界も混ぜる。
  for (const hanDelta of [1, -1, 2, -2, 3, -3]) push(fu, han + hanDelta);
  for (const fuDelta of [10, -10, 20, -20]) push(fu + fuDelta, han);
  for (const boundary of [5, 6, 8, 11, 13]) push(fu, boundary);

  return candidates;
}

function sortedWrongLabels(
  correct: TableCell,
  candidates: readonly ScoreCandidate[],
): string[] {
  return [...candidates]
    .sort((a, b) => {
      const diff =
        Math.abs(a.total - correct.total) - Math.abs(b.total - correct.total);
      return diff !== 0 ? diff : a.label.localeCompare(b.label, 'ja');
    })
    .map((candidate) => candidate.label);
}

function scoreExplanation(
  fu: number,
  han: number,
  dealer: boolean,
  tsumo: boolean,
): string {
  const { basePoints, limit } = limitOf(han, fu);
  const raw = fu * 2 ** (han + 2);
  const lines: string[] = [];
  if (limit !== 'none' && han >= 5) {
    lines.push(
      `${han} 翻は${formatLimit(limit)}。基本点は ${formatNumber(
        basePoints,
      )} になります。`,
    );
  } else {
    lines.push(
      `基本点 = ${fu} × 2^(${han} + 2) = ${formatNumber(raw)}。`,
    );
    if (limit !== 'none') {
      lines.push(
        `基本点が 2,000 以上なので${formatLimit(
          limit,
        )}。基本点は ${formatNumber(basePoints)} になります。`,
      );
    }
  }

  if (tsumo) {
    if (dealer) {
      const each = ceil100(basePoints * 2);
      lines.push(
        `親ツモは全員が ×2。${formatNumber(basePoints)} × 2 = ${formatNumber(
          basePoints * 2,
        )} → 100 点未満を切り上げて ${formatNumber(each)} オール。`,
      );
    } else {
      const child = ceil100(basePoints);
      const parent = ceil100(basePoints * 2);
      lines.push(
        `子ツモは子が ×1、親が ×2。${formatNumber(basePoints)} → ${formatNumber(
          child,
        )}、${formatNumber(basePoints * 2)} → ${formatNumber(
          parent,
        )}。答えは「子 ${formatNumber(child)} / 親 ${formatNumber(parent)}」。`,
      );
    }
  } else {
    const multiplier = dealer ? 6 : 4;
    const total = ceil100(basePoints * multiplier);
    lines.push(
      `${dealer ? '親ロン' : '子ロン'}は ×${multiplier}。${formatNumber(
        basePoints,
      )} × ${multiplier} = ${formatNumber(
        basePoints * multiplier,
      )} → 切り上げて ${formatNumber(total)} 点。`,
    );
  }
  return lines.join('\n');
}

function makeScoreQuestion(
  kind: 'score' | 'payment',
  fu: number,
  han: number,
  dealer: boolean,
  tsumo: boolean,
): DrillQuestion {
  const key = `${fu}:${han}:${dealer ? 'dealer' : 'child'}:${
    tsumo ? 'tsumo' : 'ron'
  }`;
  const id = questionId(kind, key);
  const cell = scoreCell(fu, han, { dealer, tsumo });
  const correctLabel = paymentLabel(cell, dealer);
  const wrong = sortedWrongLabels(
    cell,
    scoreCandidates(fu, han, dealer, tsumo, correctLabel),
  );
  const { choices, correctIndex } = makeChoices(correctLabel, wrong, id);
  const seat = dealer ? '親' : '子';
  const win = tsumo ? 'ツモ' : 'ロン';
  return {
    id,
    kind,
    key,
    prompt:
      kind === 'score'
        ? `${formatFu(fu)} ${formatHan(han)}の${seat}${win}は？`
        : `${seat}${win} ${formatHan(han)} ${formatFu(fu)}は？`,
    context: [
      `${formatFu(fu)} × ${formatHan(han)}`,
      dealer ? '親（東家）・' + win : '子（非親）・' + win,
    ],
    choices,
    correctIndex,
    explanation: scoreExplanation(fu, han, dealer, tsumo),
    meta: { fu, han, dealer, tsumo },
  };
}

export interface FuMeldCase {
  key: string;
  label: string;
  tiles: string;
  fu: number;
  rule: string;
}

/** 「この面子は何符？」の固定ケース。 */
export const FU_MELD_CASES: readonly FuMeldCase[] = [
  {
    key: 'meld:minko:chuchan',
    label: '中張牌の明刻',
    tiles: '555m',
    fu: 2,
    rule: '中張牌の明刻は 2 符。ロンで完成した刻子も明刻として数える。',
  },
  {
    key: 'meld:anko:chuchan',
    label: '中張牌の暗刻',
    tiles: '555m',
    fu: 4,
    rule: '中張牌の暗刻は 4 符。明刻の 2 倍。',
  },
  {
    key: 'meld:minko:yaochuu',
    label: '幺九牌の明刻',
    tiles: '111m',
    fu: 4,
    rule: '幺九牌（1・9・字牌）の明刻は 4 符。中張の明刻の 2 倍。',
  },
  {
    key: 'meld:anko:yaochuu',
    label: '幺九牌の暗刻',
    tiles: '111m',
    fu: 8,
    rule: '幺九牌の暗刻は 8 符。中張の暗刻の 2 倍。',
  },
  {
    key: 'meld:minkan:chuchan',
    label: '中張牌の明槓',
    tiles: '5555m',
    fu: 8,
    rule: '中張牌の明槓は 8 符。明刻 2 符の 4 倍。',
  },
  {
    key: 'meld:ankan:chuchan',
    label: '中張牌の暗槓',
    tiles: '5555m',
    fu: 16,
    rule: '中張牌の暗槓は 16 符。暗刻 4 符の 4 倍。',
  },
  {
    key: 'meld:minkan:yaochuu',
    label: '幺九牌の明槓',
    tiles: '1111m',
    fu: 16,
    rule: '幺九牌の明槓は 16 符。幺九の明刻 4 符の 4 倍。',
  },
  {
    key: 'meld:ankan:yaochuu',
    label: '幺九牌の暗槓',
    tiles: '1111m',
    fu: 32,
    rule: '幺九牌の暗槓は 32 符。幺九の暗刻 8 符の 4 倍。',
  },
];

interface FuTotalCase {
  key: string;
  label: string;
  tiles: string;
  win: string;
  tsumo: boolean;
  menzen: boolean;
  wait: string;
  waitFu: number;
  head: string;
  headFu: number;
  melds: readonly { name: string; fu: number }[];
  /** 平和ツモ 20 符・喰い平和形ロン 30 符のような例外。 */
  fixedFu?: number;
  note?: string;
}

const FU_TOTAL_CASES: readonly FuTotalCase[] = [
  {
    key: 'total:pinfu-tsumo',
    label: '平和ツモ',
    tiles: '123m234p456p789s55s',
    win: '2p',
    tsumo: true,
    menzen: true,
    wait: '両面待ち',
    waitFu: 0,
    head: '非役牌の雀頭',
    headFu: 0,
    melds: [
      { name: '順子 4 組', fu: 0 },
    ],
    fixedFu: 20,
    note: '平和ツモはツモの +2 を加算せず 20 符。',
  },
  {
    key: 'total:kuipinfu-ron',
    label: '喰い平和形のロン',
    tiles: '234m345p456s678s55p',
    win: '5p',
    tsumo: false,
    menzen: false,
    wait: '両面待ち',
    waitFu: 0,
    head: '非役牌の雀頭',
    headFu: 0,
    melds: [
      { name: '順子 4 組', fu: 0 },
    ],
    fixedFu: 30,
    note: '喰い平和形のロンは 20 符 → 切り上げで 30 符。',
  },
  {
    key: 'total:menzen-tanki-anko',
    label: '門前ロン・単騎・中張の暗刻',
    tiles: '234m555p678s234s22s',
    win: '2s',
    tsumo: false,
    menzen: true,
    wait: '単騎待ち',
    waitFu: 2,
    head: '雀頭を単騎で完成',
    headFu: 0,
    melds: [
      { name: '中張の暗刻', fu: 4 },
      { name: '順子 3 組', fu: 0 },
    ],
    note: '単騎待ち +2、中張の暗刻 +4。',
  },
  {
    key: 'total:tsumo-kanchan-yakuhai',
    label: 'ツモ・嵌張・役牌雀頭・幺九の暗刻',
    tiles: '111m13p567p789s55z',
    win: '2p',
    tsumo: true,
    menzen: true,
    wait: '嵌張待ち',
    waitFu: 2,
    head: '役牌（白）の雀頭',
    headFu: 2,
    melds: [
      { name: '幺九の暗刻', fu: 8 },
      { name: '順子 3 組', fu: 0 },
    ],
    note: '嵌張 +2、役牌雀頭 +2、幺九の暗刻 +8。',
  },
  {
    key: 'total:tsumo-ankan',
    label: 'ツモ・双碰・幺九の暗槓',
    tiles: '1111m555p234s678s99s',
    win: '9s',
    tsumo: true,
    menzen: true,
    wait: '双碰待ち',
    waitFu: 0,
    head: '双碰で完成',
    headFu: 0,
    melds: [
      { name: '幺九の暗槓', fu: 32 },
      { name: '中張の暗刻', fu: 4 },
      { name: '順子 2 組', fu: 0 },
    ],
    note: '槓子は 4 枚で表示している。幺九の暗槓 +32、中張の暗刻 +4。',
  },
];

function fuTotalRaw(item: FuTotalCase): number {
  const meldFu = item.melds.reduce((sum, meld) => sum + meld.fu, 0);
  return (
    20 +
    (item.menzen && !item.tsumo ? 10 : 0) +
    (item.tsumo && item.fixedFu !== 20 ? 2 : 0) +
    item.waitFu +
    item.headFu +
    meldFu
  );
}

function fuTotalExpected(item: FuTotalCase): number {
  if (item.fixedFu !== undefined) return item.fixedFu;
  return round10(fuTotalRaw(item));
}

function fuTotalExplanation(item: FuTotalCase): string {
  const raw = fuTotalRaw(item);
  const expected = fuTotalExpected(item);
  if (item.fixedFu !== undefined) {
    return `${item.note ?? ''} 答えは ${expected} 符。`;
  }
  const parts: string[] = ['副底 20'];
  if (item.menzen && !item.tsumo) parts.push('門前ロン +10');
  if (item.tsumo) parts.push('ツモ +2');
  if (item.waitFu > 0) parts.push(`${item.wait} +${item.waitFu}`);
  if (item.headFu > 0) parts.push(`${item.head} +${item.headFu}`);
  for (const meld of item.melds) {
    if (meld.fu > 0) parts.push(`${meld.name} +${meld.fu}`);
  }
  return `${parts.join(' + ')} = ${raw}。10 符切り上げで ${expected} 符。${
    item.note ? ` ${item.note}` : ''
  }`;
}

function makeFuMeldQuestion(item: FuMeldCase): DrillQuestion {
  const id = questionId('fu', item.key);
  const all = [2, 4, 8, 16, 32];
  const wrong = all
    .filter((fu) => fu !== item.fu)
    .sort(
      (a, b) => Math.abs(a - item.fu) - Math.abs(b - item.fu) || a - b,
    )
    .map((fu) => formatFu(fu));
  const { choices, correctIndex } = makeChoices(
    formatFu(item.fu),
    wrong,
    id,
  );
  return {
    id,
    kind: 'fu',
    key: item.key,
    prompt: `この面子は何符？（${item.label}）`,
    context: [item.label, item.tiles.includes('z') ? '字牌' : '数牌'],
    tiles: item.tiles,
    choices,
    correctIndex,
    explanation: `${item.rule} 答えは ${formatFu(item.fu)}。`,
    meta: { meld: item.key, expectedFu: item.fu },
  };
}

function makeFuTotalQuestion(item: FuTotalCase): DrillQuestion {
  const id = questionId('fu', item.key);
  const expected = fuTotalExpected(item);
  const raw = fuTotalRaw(item);
  const all = [20, 25, 30, 40, 50, 60, 70];
  const wrong = all
    .filter((fu) => fu !== expected)
    .sort((a, b) => Math.abs(a - expected) - Math.abs(b - expected) || a - b)
    .map((fu) => formatFu(fu));
  const { choices, correctIndex } = makeChoices(
    formatFu(expected),
    wrong,
    id,
  );
  return {
    id,
    kind: 'fu',
    key: item.key,
    prompt: '合計の符は？（10 符切り上げ）',
    context: [
      item.tsumo ? 'ツモ和了' : 'ロン和了',
      item.menzen ? '門前' : '副露あり',
      `${item.wait}・${item.head}`,
      item.melds.map((meld) => meld.name).join(' / '),
    ],
    tiles: item.tiles,
    win: item.win,
    choices,
    correctIndex,
    explanation: fuTotalExplanation(item),
    meta: { rawFu: raw, expectedFu: expected, wait: item.wait },
  };
}

function hanNumberChoices(
  correct: number,
  preferred: readonly number[],
  seed: string,
): { choices: DrillChoice[]; correctIndex: number } {
  const values = [correct];
  for (const value of preferred) {
    if (values.length >= 4) break;
    if (value >= 1 && value <= 6 && !values.includes(value)) values.push(value);
  }
  for (let value = 1; values.length < 4 && value <= 6; value += 1) {
    if (!values.includes(value)) values.push(value);
  }
  const shuffled = seededShuffle(values.slice(0, 4), seed);
  return {
    choices: shuffled.map((value) => ({
      id: `han-${value}`,
      label: formatHan(value),
    })),
    correctIndex: shuffled.indexOf(correct),
  };
}

function makeHanQuestion(entry: YakuEntry, open: boolean): DrillQuestion {
  const key = `han:${entry.id}:${open ? 'open' : 'closed'}`;
  const id = questionId('han', key);
  const correct = open ? entry.openHan : entry.closedHan;
  if (correct === undefined) {
    throw new Error(`翻数が未定義の役です: ${entry.id}`);
  }
  const counterparts = [entry.closedHan, entry.openHan].filter(
    (value): value is number => value !== undefined,
  );
  const preferred = [
    open ? entry.closedHan : entry.openHan,
    correct + 1,
    correct - 1,
    correct + 2,
    ...counterparts,
    1,
    2,
  ].filter((value): value is number => typeof value === 'number');
  const { choices, correctIndex } = hanNumberChoices(correct, preferred, id);
  const openLabel =
    entry.openHan !== undefined ? formatHan(entry.openHan) : '–（門前のみ）';
  const detail = entry.note ?? entry.condition;
  return {
    id,
    kind: 'han',
    key,
    prompt: `「${entry.name}」を${open ? '副露して' : '門前で'}和了したときの翻数は？`,
    context: [
      entry.reading,
      open ? '副露（喰い下がりを確認）' : '門前',
      entry.condition,
    ],
    choices,
    correctIndex,
    explanation: `「${entry.name}」は門前 ${
      entry.closedHan !== undefined ? formatHan(entry.closedHan) : '–'
    } / 副露 ${openLabel}。${detail} 答えは ${formatHan(correct)}。`,
    meta: { yakuId: entry.id, open },
  };
}

function buildScoreQuestions(kind: 'score' | 'payment'): DrillQuestion[] {
  const hans = kind === 'score' ? SCORE_HAN : PAYMENT_HAN;
  const questions: DrillQuestion[] = [];
  for (const fu of SCORE_FU) {
    for (const han of hans) {
      for (const dealer of [false, true]) {
        for (const tsumo of [false, true]) {
          const cell = scoreCell(fu, han, { dealer, tsumo });
          if (!cell.valid) continue;
          questions.push(makeScoreQuestion(kind, fu, han, dealer, tsumo));
        }
      }
    }
  }
  return questions;
}

function buildFuQuestions(): DrillQuestion[] {
  return [
    ...FU_MELD_CASES.map(makeFuMeldQuestion),
    ...FU_TOTAL_CASES.map(makeFuTotalQuestion),
  ];
}

function buildHanQuestions(): DrillQuestion[] {
  const questions: DrillQuestion[] = [];
  for (const entry of YAKU_CATALOG) {
    if (entry.yakuman !== undefined) continue;
    if (entry.closedHan !== undefined) {
      questions.push(makeHanQuestion(entry, false));
    }
    if (entry.openHan !== undefined) {
      questions.push(makeHanQuestion(entry, true));
    }
  }
  return questions;
}

const cache = new Map<DrillKind, DrillQuestion[]>();

/** 種類ごとの全問題。初回だけ生成してキャッシュする。 */
export function allDrillQuestions(kind: DrillKind): DrillQuestion[] {
  const cached = cache.get(kind);
  if (cached) return cached;
  let questions: DrillQuestion[];
  if (kind === 'score' || kind === 'payment') {
    questions = buildScoreQuestions(kind);
  } else if (kind === 'fu') {
    questions = buildFuQuestions();
  } else {
    questions = buildHanQuestions();
  }
  cache.set(kind, questions);
  return questions;
}

const byId = new Map<string, DrillQuestion>();

/** 全種類を通した問題一覧（テスト・セッション構築用）。 */
export function allQuestions(): DrillQuestion[] {
  const questions: DrillQuestion[] = [];
  for (const kind of DRILL_KINDS) {
    for (const question of allDrillQuestions(kind)) {
      questions.push(question);
      byId.set(question.id, question);
    }
  }
  return questions;
}

export function drillQuestionById(id: string): DrillQuestion | null {
  if (byId.size === 0) allQuestions();
  return byId.get(id) ?? null;
}

export function fuQuestionByKey(key: string): DrillQuestion | null {
  return allDrillQuestions('fu').find((question) => question.key === key) ?? null;
}

export interface DrillPoolSummary {
  due: number;
  review: number;
  fresh: number;
  total: number;
}

/** 期限・既習・新規の件数（ハブ表示用）。 */
export function drillPoolSummary(
  state: DrillState,
  now: number,
  kind?: DrillKind,
): DrillPoolSummary {
  const kinds = kind ? [kind] : DRILL_KINDS;
  let due = 0;
  let review = 0;
  let fresh = 0;
  for (const current of kinds) {
    for (const question of allDrillQuestions(current)) {
      const card = state.cards[question.id];
      if (!card) {
        fresh += 1;
      } else if (card.dueAt <= now) {
        due += 1;
      } else {
        review += 1;
      }
    }
  }
  return { due, review, fresh, total: due + review + fresh };
}

/** 1 セッション分の問題を SRS の優先順で組み立てる。 */
export function buildDrillSession(
  state: DrillState,
  kind: DrillKind | undefined,
  now: number,
  seed: number,
  size = DRILL_SESSION_SIZE,
  excludeId?: string,
): DrillQuestion[] {
  const kinds = kind ? [kind] : DRILL_KINDS;
  const pool = kinds.flatMap((current) =>
    allDrillQuestions(current).map((question) => ({
      id: question.id,
      kind: question.kind,
    })),
  );
  const picks = pickDrillSession({
    cards: state.cards,
    pool,
    now,
    size,
    excludeId,
    random: seededRandom(seed),
  });
  const questions: DrillQuestion[] = [];
  for (const pick of picks) {
    const question = drillQuestionById(pick.id);
    if (question) questions.push(question);
  }
  return questions;
}

/** テスト用: シードから安定して 1 問を選ぶ。 */
export function drillQuestionForSeed(
  kind: DrillKind,
  seed: number,
): DrillQuestion {
  const questions = allDrillQuestions(kind);
  return questions[Math.abs(Math.trunc(seed)) % questions.length];
}
