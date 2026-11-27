import type { Problem, ScoreResult } from '../engine/types';
import {
  formatFu,
  formatHan,
  formatLimit,
  formatNumber,
  paymentView,
} from './format';

function yakuSentence(answer: ScoreResult): string {
  const names = answer.yaku
    .map((hit) => {
      if (hit.yakuman) {
        return hit.yakuman >= 2
          ? `${hit.name}（${hit.yakuman} 倍役満）`
          : `${hit.name}（役満）`;
      }
      return `${hit.name}（${hit.han} 翻）`;
    })
    .join('、');
  if (answer.yakumanCount > 0) {
    const count = answer.yakumanCount;
    return `成立役は ${names} で、${count >= 2 ? `${count} 倍役満` : '役満'}です。`;
  }
  const dora =
    answer.doraHan > 0 ? `。ドラ・赤・裏ドラで ${answer.doraHan} 翻を加えます` : '';
  return `成立役は ${names} で、合計 ${formatHan(answer.han)}${dora}。`;
}

function baseSentence(answer: ScoreResult): string {
  if (answer.yakumanCount > 0) {
    return `基本点は 8000 × ${answer.yakumanCount} = ${formatNumber(
      8000 * answer.yakumanCount,
    )} です。`;
  }
  if (answer.limit === 'yakuman') {
    return '13 翻以上なので数え役満、基本点は 8000 です。';
  }
  if (answer.limit === 'mangan' && answer.han < 5) {
    return `${formatFu(answer.fu)} × 2^(${formatHan(answer.han)}+2) は 2000 を超えるため、満貫として基本点 2000 に抑えます。`;
  }
  if (answer.limit !== 'none') {
    return `${formatHan(answer.han)} なので${formatLimit(answer.limit)}、基本点は ${formatNumber(answer.basePoints)} です。`;
  }
  const multiplier = 2 ** (answer.han + 2);
  return `基本点 = ${formatFu(answer.fu)} × 2^(${formatHan(answer.han)}+2) = ${formatFu(
    answer.fu,
  )} × ${formatNumber(multiplier)} = ${formatNumber(answer.basePoints)} です。`;
}

function paymentSentence(problem: Problem): string {
  const { answer, input } = problem;
  const { ctx } = input;
  const dealer = ctx.seatWind === 1;
  const view = paymentView({
    ron: answer.payments.ron,
    tsumo: answer.payments.tsumo,
    total: answer.payments.total,
    dealer,
  });

  let sentence: string;
  if (view.kind === 'tsumo') {
    sentence = dealer
      ? `親ツモなので全員から ${formatNumber(
          answer.payments.tsumo?.dealer ?? 0,
        )} 点ずつ、合計 ${formatNumber(answer.payments.total)} 点です。`
      : `子ツモなので子から ${formatNumber(
          answer.payments.tsumo?.nonDealer ?? 0,
        )} 点、親から ${formatNumber(
          answer.payments.tsumo?.dealer ?? 0,
        )} 点、合計 ${formatNumber(answer.payments.total)} 点です。`;
  } else {
    sentence = `${dealer ? '親' : '子'}ロンなので ${formatNumber(
      answer.payments.ron ?? 0,
    )} 点です。`;
  }

  const extras: string[] = [];
  if (ctx.honba > 0) {
    extras.push(
      ctx.tsumo
        ? `本場 ${ctx.honba} で各 +${formatNumber(100 * ctx.honba)} 点`
        : `本場 ${ctx.honba} で +${formatNumber(300 * ctx.honba)} 点`,
    );
  }
  if (ctx.riichiSticks > 0) {
    extras.push(
      `供託リーチ棒 ${ctx.riichiSticks} 本（+${formatNumber(
        1000 * ctx.riichiSticks,
      )} 点）`,
    );
  }
  if (extras.length > 0) {
    sentence = `${sentence.replace(/。$/, '')}。${extras.join('、')}。`;
  }
  return sentence;
}

/** 採点結果の 2〜3 文解説。 */
export function explainResult(problem: Problem): string {
  return [yakuSentence(problem.answer), baseSentence(problem.answer), paymentSentence(problem)]
    .join('')
    .replace(/。。/g, '。');
}
