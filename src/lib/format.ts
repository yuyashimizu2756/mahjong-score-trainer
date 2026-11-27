import type { LimitName } from '../engine/types';

export function formatNumber(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatPoints(value: number): string {
  return `${formatNumber(value)} 点`;
}

export function formatHan(han: number): string {
  return `${han} 翻`;
}

export function formatFu(fu: number): string {
  return `${fu} 符`;
}

export function formatYakuman(count: number): string {
  return count >= 2 ? `${count} 倍役満` : '役満';
}

const LIMIT_NAMES: Record<LimitName, string> = {
  none: '',
  mangan: '満貫',
  haneman: '跳満',
  baiman: '倍満',
  sanbaiman: '三倍満',
  yakuman: '役満',
};

export function formatLimit(limit: LimitName): string {
  return LIMIT_NAMES[limit];
}

export function isLimit(limit: LimitName): boolean {
  return limit !== 'none';
}

export interface PaymentView {
  kind: 'ron' | 'tsumo';
  lines: string[];
  total: number;
  label: string;
}

/** 支払いを表示用に整形する。 */
export function paymentView(params: {
  ron?: number;
  tsumo?: { dealer: number; nonDealer: number };
  total: number;
  dealer: boolean;
}): PaymentView {
  if (params.tsumo) {
    const { dealer, nonDealer } = params.tsumo;
    const lines = params.dealer
      ? [`${formatNumber(dealer)} オール`]
      : [
          `子 ${formatNumber(nonDealer)}`,
          `親 ${formatNumber(dealer)}`,
        ];
    return {
      kind: 'tsumo',
      lines,
      total: params.total,
      label: lines.join(' / '),
    };
  }
  const ron = params.ron ?? params.total;
  return {
    kind: 'ron',
    lines: [`${formatNumber(ron)} 点`],
    total: ron,
    label: `${formatNumber(ron)} 点`,
  };
}

export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDayKey(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return key;
  return `${Number(match[2])}/${Number(match[3])}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export function percent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function formatPercent(correct: number, total: number): string {
  return `${percent(correct, total)}%`;
}

export function waitLabel(wait: string): string {
  const labels: Record<string, string> = {
    ryanmen: '両面待ち',
    kanchan: '嵌張待ち',
    penchan: '辺張待ち',
    tanki: '単騎待ち',
    shanpon: '双碰待ち',
    none: '—',
  };
  return labels[wait] ?? wait;
}

export function difficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    beginner: '入門',
    standard: '標準',
    advanced: '上級',
  };
  return labels[difficulty] ?? difficulty;
}

export function windLabel(wind: number): string {
  const labels: Record<number, string> = {
    1: '東',
    2: '南',
    3: '西',
    4: '北',
  };
  return labels[wind] ?? `${wind}`;
}
