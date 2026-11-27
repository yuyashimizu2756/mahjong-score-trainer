import {
  compareTiles,
  doraFromIndicator,
  formatTiles,
  makeTile,
  parseTile,
  parseTiles,
  sortTiles,
  tileToLabel,
  tileToString,
  validateTile,
} from '../../src/engine/tiles';

describe('牌のパースと整形', () => {
  it('連結表記をパースできる', () => {
    const tiles = parseTiles('123m456p789s11z');
    expect(tiles).not.toBeNull();
    expect(tiles).toHaveLength(11);
    expect(tiles?.[0]).toEqual({ suit: 'm', rank: 1 });
    expect(tiles?.[3]).toEqual({ suit: 'p', rank: 4 });
    expect(tiles?.[10]).toEqual({ suit: 'z', rank: 1 });
  });

  it('空白区切りをパースできる', () => {
    expect(parseTiles('123m 456p 11z')).toHaveLength(8);
  });

  it('赤 5（0m / 0p / 0s）をパースできる', () => {
    const tile = parseTile('0m');
    expect(tile).toEqual({ suit: 'm', rank: 5, red: true });
    expect(tileToString(tile!)).toBe('0m');
  });

  it('不正な牌文字列は null', () => {
    expect(parseTiles('123x')).toBeNull();
    expect(parseTiles('8z')).toBeNull();
    expect(parseTiles('1m2')).toBeNull();
    expect(parseTiles('0z')).toBeNull();
  });

  it('整形はスートごとにまとめる', () => {
    const tiles = sortTiles([
      makeTile('z', 1),
      makeTile('m', 3),
      makeTile('m', 1),
      makeTile('p', 2),
    ]);
    expect(formatTiles(tiles)).toBe('13m 2p 1z');
  });

  it('赤 5 は 0 として整形する', () => {
    expect(formatTiles([makeTile('m', 5, true), makeTile('m', 4)])).toBe('40m');
  });

  it('牌の表示名', () => {
    expect(tileToLabel(makeTile('z', 7))).toBe('中');
    expect(tileToLabel(makeTile('m', 5, true))).toBe('赤5m');
  });

  it('牌の妥当性', () => {
    expect(validateTile(makeTile('m', 1))).toBeNull();
    expect(validateTile(makeTile('z', 7))).toBeNull();
    expect(validateTile(makeTile('z', 8))).not.toBeNull();
    expect(validateTile({ suit: 'z', rank: 5, red: true })).not.toBeNull();
    expect(validateTile(makeTile('m', 0))).not.toBeNull();
  });

  it('並び順は m → p → s → z、赤 5 は 5 の直前', () => {
    const red = makeTile('m', 5, true);
    const five = makeTile('m', 5);
    expect(compareTiles(red, five)).toBeLessThan(0);
    expect(compareTiles(makeTile('m', 9), makeTile('p', 1))).toBeLessThan(0);
    expect(compareTiles(makeTile('s', 1), makeTile('z', 1))).toBeLessThan(0);
  });
});

describe('ドラ変換', () => {
  it.each([
    ['1m', '2m'],
    ['9m', '1m'],
    ['9p', '1p'],
    ['9s', '1s'],
    ['1z', '2z'],
    ['4z', '1z'],
    ['5z', '6z'],
    ['6z', '7z'],
    ['7z', '5z'],
  ])('%s → %s', (indicator, expected) => {
    const result = doraFromIndicator(parseTile(indicator)!);
    expect(tileToString(result)).toBe(expected);
  });
});
