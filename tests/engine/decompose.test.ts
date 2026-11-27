import { computeScore } from '../../src/engine/score';
import type { ScoreOutcome } from '../../src/engine/types';
import { input, meld } from '../helpers';

function ok(outcome: ScoreOutcome) {
  if (!outcome.ok) throw new Error(`expected ok, got: ${outcome.error}`);
  return outcome;
}

describe('分解と待ち', () => {
  it('両面待ち', () => {
    const result = ok(computeScore(input('123m456p789p234s55s', '2s')));
    expect(result.wait).toBe('ryanmen');
  });

  it('嵌張待ち', () => {
    const result = ok(
      computeScore(
        input('234m456p234s55s', '3s', { melds: [meld('pon', '777z')] }),
      ),
    );
    expect(result.wait).toBe('kanchan');
  });

  it('辺張待ち', () => {
    const result = ok(computeScore(input('123m123p123s456m99p', '3s')));
    expect(result.wait).toBe('penchan');
  });

  it('単騎待ち', () => {
    const result = ok(computeScore(input('234m345m456p678s22s', '2s')));
    expect(result.wait).toBe('tanki');
  });

  it('双碰待ち', () => {
    const result = ok(computeScore(input('111m333p555s777s99p', '7s')));
    expect(result.wait).toBe('shanpon');
  });

  it('七対子は単騎扱い', () => {
    const result = ok(computeScore(input('11m33m55m77m22p44p66s', '6s')));
    expect(result.wait).toBe('tanki');
  });

  it('国士無双は単騎扱い', () => {
    const result = ok(computeScore(input('19m19p19s1234567z1m', '1m')));
    expect(result.wait).toBe('tanki');
  });

  it('複数の分解がある場合は合計点が最大の分解を選ぶ', () => {
    const result = ok(
      computeScore(input('123m123m456m456m77m', '7m', { ctx: { riichi: true } })),
    );
    expect(result.decomposition).toBe('234m 234m 567m 567m 11m');
    expect(result.yaku.map((y) => y.id)).toContain('pinfu');
  });

  it('七対子と標準形の両方が成立する場合は点数の高い方を選ぶ', () => {
    const result = ok(computeScore(input('11223344556677m', '7m')));
    expect(result.yaku.map((y) => y.id)).toContain('ryanpeikou');
    expect(result.yaku.map((y) => y.id)).not.toContain('chiitoitsu');
  });

  it('同じ牌 4 枚を 2 対子に使う形は七対子ではない', () => {
    const result = ok(computeScore(input('11112233445566m', '6m')));
    expect(result.yaku.map((y) => y.id)).not.toContain('chiitoitsu');
  });

  it('分解文字列は面子と雀頭を並べる', () => {
    const result = ok(computeScore(input('234m345m456p678s22s', '2s')));
    expect(result.decomposition).toBe('234m 345m 456p 678s 22s');
  });

  it('構成要素の合計が 14 枚（槓は論理 3 枚）になる', () => {
    const withKan = ok(
      computeScore(
        input('22z', '2z', {
          ctx: { seatWind: 3 },
          melds: [
            { type: 'kan', tiles: input('1111m', '1m').concealed, open: true },
            { type: 'kan', tiles: input('5555z', '5z').concealed, open: true },
            { type: 'pon', tiles: input('333p', '3p').concealed, open: true },
            { type: 'pon', tiles: input('999s', '9s').concealed, open: true },
          ],
        }),
      ),
    );
    expect(withKan.decomposition.split(' ')).toHaveLength(5);
  });
});
