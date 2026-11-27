export interface YakuEntry {
  id: string;
  name: string;
  reading: string;
  /** 門前の翻数（役満は未設定）。 */
  closedHan?: number;
  /** 副露の翻数（門前限定なら未設定）。 */
  openHan?: number;
  /** 役満の倍数。 */
  yakuman?: number;
  /** 役満を副露で成立させられるか。 */
  openAllowed?: boolean;
  condition: string;
  note?: string;
  example: string;
  exampleLabel: string;
}

export const YAKU_CATALOG: YakuEntry[] = [
  {
    id: 'riichi',
    name: '立直',
    reading: 'りーち',
    closedHan: 1,
    condition: '門前で聴牌したとき、1000 点を供託して宣言する。',
    note: 'ダブル立直とは重複しない。副露すると成立しない。',
    example: '123m456m789m22p345s',
    exampleLabel: '門前の聴牌から宣言する',
  },
  {
    id: 'doubleRiichi',
    name: 'ダブル立直',
    reading: 'だぶるりーち',
    closedHan: 2,
    condition: '自分の第一ツモの前に立直を宣言する。',
    note: '立直とは重複せず、ダブル立直のみを数える。',
    example: '123m456m789m22p345s',
    exampleLabel: '第一巡の立直',
  },
  {
    id: 'ippatsu',
    name: '一発',
    reading: 'いっぱつ',
    closedHan: 1,
    condition: '立直後、1 巡以内に和了する。',
    note: '間に槓・ポン・チーが入ると消滅する。門前のみ。',
    example: '123m456m789m22p345s',
    exampleLabel: '立直直後の和了',
  },
  {
    id: 'menzenTsumo',
    name: '門前清自摸和',
    reading: 'めんぜんつもほう',
    closedHan: 1,
    condition: '門前の手をツモ和了する。',
    note: '副露があると成立しない。',
    example: '123m456m789m22p345s',
    exampleLabel: '門前のツモ和了',
  },
  {
    id: 'pinfu',
    name: '平和',
    reading: 'ぴんふ',
    closedHan: 1,
    condition: '門前・全順子・非役牌の雀頭・両面待ち。',
    note: '七対子とは複合しない。ツモなら 20 符。',
    example: '123m456m789m22p345s',
    exampleLabel: '全順子・両面待ち',
  },
  {
    id: 'tanyao',
    name: '断幺九',
    reading: 'たんやおー',
    closedHan: 1,
    openHan: 1,
    condition: '幺九牌（1・9・字牌）を 1 枚も含まない。',
    note: '副露しても翻数は下がらない。',
    example: '234m345p456s678s55p',
    exampleLabel: '中張牌だけで構成',
  },
  {
    id: 'iipeikou',
    name: '一盃口',
    reading: 'いーぺーこー',
    closedHan: 1,
    condition: '門前で、同種同順子を 2 組そろえる。',
    note: '二盃口とは複合せず、二盃口のみを数える。',
    example: '123m123m456p789s55z',
    exampleLabel: '同じ順子 2 組',
  },
  {
    id: 'yakuhaiHaku',
    name: '役牌 白',
    reading: 'やくはい はく',
    closedHan: 1,
    openHan: 1,
    condition: '白の刻子または槓子を作る。',
    note: '三元牌は 1 種ごとに 1 翻。',
    example: '555z123m456p789s11p',
    exampleLabel: '白の刻子',
  },
  {
    id: 'yakuhaiHatsu',
    name: '役牌 發',
    reading: 'やくはい はつ',
    closedHan: 1,
    openHan: 1,
    condition: '發の刻子または槓子を作る。',
    note: '三元牌は 1 種ごとに 1 翻。',
    example: '666z123m456p789s11p',
    exampleLabel: '發の刻子',
  },
  {
    id: 'yakuhaiChun',
    name: '役牌 中',
    reading: 'やくはい ちゅん',
    closedHan: 1,
    openHan: 1,
    condition: '中の刻子または槓子を作る。',
    note: '小三元・大三元とも複合する。',
    example: '777z123m456p789s11p',
    exampleLabel: '中の刻子',
  },
  {
    id: 'yakuhaiSeat',
    name: '役牌 自風',
    reading: 'やくはい じかぜ',
    closedHan: 1,
    openHan: 1,
    condition: '自風（東南西北のうち自分の風）の刻子または槓子。',
    note: '場風と自風が同じ連風牌なら、役牌として 2 翻分になる。',
    example: '111z234m456p789s55s',
    exampleLabel: '東場で東家の東刻子',
  },
  {
    id: 'yakuhaiRound',
    name: '役牌 場風',
    reading: 'やくはい ばかぜ',
    closedHan: 1,
    openHan: 1,
    condition: '場風（東南西北のうち場の風）の刻子または槓子。',
    note: '自風と重なる連風牌は、それぞれ 1 翻ずつ数える。',
    example: '222z234m456p789s55s',
    exampleLabel: '南場の南刻子',
  },
  {
    id: 'rinshan',
    name: '嶺上開花',
    reading: 'りんしゃんかいほう',
    closedHan: 1,
    openHan: 1,
    condition: '槓の直後に、嶺上牌でツモ和了する。',
    note: '槓子が必須。海底摸月とは複合しない。',
    example: '1111m234p567s789s22z',
    exampleLabel: '槓の後のツモ',
  },
  {
    id: 'haitei',
    name: '海底摸月',
    reading: 'はいていつもづき',
    closedHan: 1,
    openHan: 1,
    condition: '最後の牌をツモ和了する。',
    note: 'ツモ和了のみ。嶺上開花とは複合しない。',
    example: '123m456m789m22p345s',
    exampleLabel: '最後の牌をツモ',
  },
  {
    id: 'houtei',
    name: '河底撈魚',
    reading: 'ほうていらおゆい',
    closedHan: 1,
    openHan: 1,
    condition: '最後の牌でロン和了する。',
    note: 'ロン和了のみ。搶槓とは複合しない。',
    example: '123m456m789m22p345s',
    exampleLabel: '最後の牌をロン',
  },
  {
    id: 'chankan',
    name: '搶槓',
    reading: 'ちゃんかん',
    closedHan: 1,
    openHan: 1,
    condition: '他家の加槓の牌をロンする。',
    note: 'ロン和了のみ。河底撈魚とは複合しない。',
    example: '123m456m789m22p345s',
    exampleLabel: '加槓をロン',
  },
  {
    id: 'sanshokuDoujun',
    name: '三色同順',
    reading: 'さんしょくどうじゅん',
    closedHan: 2,
    openHan: 1,
    condition: '萬子・筒子・索子で同じ数字の順子を 3 組そろえる。',
    note: '喰い下がりで副露は 1 翻。',
    example: '123m123p123s456m77z',
    exampleLabel: '123 を 3 色で',
  },
  {
    id: 'ittsu',
    name: '一気通貫',
    reading: 'いっきつうかん',
    closedHan: 2,
    openHan: 1,
    condition: '同じスートで 123・456・789 の順子をそろえる。',
    note: '喰い下がりで副露は 1 翻。',
    example: '123m456m789m123p55z',
    exampleLabel: '萬子で 123・456・789',
  },
  {
    id: 'chanta',
    name: '混全帯幺九',
    reading: 'ちゃんた',
    closedHan: 2,
    openHan: 1,
    condition: '全面子と雀頭に幺九牌を含み、順子を 1 つ以上含む。',
    note: '混一色・清一色と複合する。副露は 1 翻。',
    example: '123m789p111z999s22z',
    exampleLabel: '全ての組に幺九牌',
  },
  {
    id: 'chiitoitsu',
    name: '七対子',
    reading: 'ちーといつ',
    closedHan: 2,
    condition: '異なる 7 種の対子をそろえる。',
    note: '25 符固定。門前のみ。四暗刻・対々和とは複合しない。',
    example: '11m22p33s44z55z66z77z',
    exampleLabel: '7 種の対子',
  },
  {
    id: 'toitoi',
    name: '対々和',
    reading: 'といとい',
    closedHan: 2,
    openHan: 2,
    condition: '4 面子すべてを刻子・槓子にする。',
    note: '三暗刻と複合する。七対子とは複合しない。',
    example: '111m333p555s777z22z',
    exampleLabel: '刻子 4 組',
  },
  {
    id: 'sanankou',
    name: '三暗刻',
    reading: 'さんあんこー',
    closedHan: 2,
    openHan: 2,
    condition: '暗刻・暗槓を 3 組そろえる。',
    note: 'ロンで完成した刻子は明刻扱い。対々和と複合する。',
    example: '111m333p555s234s22z',
    exampleLabel: '暗刻 3 組',
  },
  {
    id: 'sanshokuDoukou',
    name: '三色同刻',
    reading: 'さんしょくどうこく',
    closedHan: 2,
    openHan: 2,
    condition: '萬子・筒子・索子で同じ数字の刻子を 3 組そろえる。',
    note: '喰い下がりなし。門前・副露とも 2 翻。',
    example: '111m111p111s234m22z',
    exampleLabel: '111 を 3 色で',
  },
  {
    id: 'sankantsu',
    name: '三槓子',
    reading: 'さんかんつ',
    closedHan: 2,
    openHan: 2,
    condition: '槓子を 3 組そろえる。',
    note: '喰い下がりなし。四槓子は役満。',
    example: '1111m3333p5555s789s22z',
    exampleLabel: '槓子 3 組',
  },
  {
    id: 'shousangen',
    name: '小三元',
    reading: 'しょうさんげん',
    closedHan: 2,
    openHan: 2,
    condition: '三元牌の刻子 2 組と、残り 1 種の雀頭。',
    note: '役牌 2 組分（+2 翻）も複合する。',
    example: '555z666z77z123m456p',
    exampleLabel: '白・發の刻子と中の雀頭',
  },
  {
    id: 'honroutou',
    name: '混老頭',
    reading: 'ほんろーとう',
    closedHan: 2,
    openHan: 2,
    condition: '幺九牌と字牌だけで構成する。',
    note: '対々和・七対子・混一色と複合する。',
    example: '111m999p111z999s11z',
    exampleLabel: '幺九牌と字牌のみ',
  },
  {
    id: 'honitsu',
    name: '混一色',
    reading: 'ほんいつしょく',
    closedHan: 3,
    openHan: 2,
    condition: '1 種の数牌と字牌だけで構成する。',
    note: '喰い下がりで副露は 2 翻。清一色とは複合しない。',
    example: '123m456m789m111z22z',
    exampleLabel: '萬子と字牌のみ',
  },
  {
    id: 'junchan',
    name: '純全帯幺九',
    reading: 'じゅんちゃん',
    closedHan: 3,
    openHan: 2,
    condition: '全面子と雀頭に幺九牌を含み、字牌を含まない。',
    note: '混全帯幺九とは複合しない。副露は 2 翻。',
    example: '123m789m123p789p99s',
    exampleLabel: '字牌なし・全ての組に 1 か 9',
  },
  {
    id: 'ryanpeikou',
    name: '二盃口',
    reading: 'りゃんぺーこー',
    closedHan: 3,
    condition: '門前で、一盃口の形を 2 組そろえる。',
    note: '一盃口とは複合せず、二盃口のみ。門前のみ。',
    example: '112233m445566p77s',
    exampleLabel: '同じ順子 2 組を 2 セット',
  },
  {
    id: 'chinitsu',
    name: '清一色',
    reading: 'ちんいつしょく',
    closedHan: 6,
    openHan: 5,
    condition: '1 種の数牌だけで構成する。',
    note: '喰い下がりで副露は 5 翻。混一色とは複合しない。',
    example: '123m234m456m678m99m',
    exampleLabel: '萬子だけで構成',
  },
  {
    id: 'kokushi',
    name: '国士無双',
    reading: 'こくしむそう',
    yakuman: 1,
    condition: '13 種の幺九牌を 1 枚ずつと、そのうちどれか 1 枚を重ねる。',
    note: '門前のみ。役満。',
    example: '19m19p19s1234567z1m',
    exampleLabel: '幺九 13 種 + 1 枚',
  },
  {
    id: 'suuankou',
    name: '四暗刻',
    reading: 'すーあんこー',
    yakuman: 1,
    condition: '暗刻・暗槓を 4 組そろえる。',
    note: '単騎待ちは四暗刻単騎（ダブル役満）。',
    example: '111m333p555s777z22z',
    exampleLabel: '暗刻 4 組',
  },
  {
    id: 'suuankouTanki',
    name: '四暗刻単騎',
    reading: 'すーあんこーたんき',
    yakuman: 2,
    condition: '四暗刻を単騎待ちで和了する。',
    note: 'ダブル役満。四暗刻とは重複しない。',
    example: '111m333p555s777z22z',
    exampleLabel: '雀頭の単騎待ち',
  },
  {
    id: 'daisangen',
    name: '大三元',
    reading: 'だいさんげん',
    yakuman: 1,
    openAllowed: true,
    condition: '三元牌 3 種すべてを刻子または槓子にする。',
    note: '小三元とは複合しない。副露でも役満。',
    example: '555z666z777z123m11p',
    exampleLabel: '白・發・中の刻子',
  },
  {
    id: 'tsuuiisou',
    name: '字一色',
    reading: 'つーいーそー',
    yakuman: 1,
    openAllowed: true,
    condition: '字牌だけで構成する。',
    note: '大四喜・小四喜・四暗刻などと複合する。',
    example: '111z222z333z444z55z',
    exampleLabel: '字牌のみ',
  },
  {
    id: 'ryuuiisou',
    name: '緑一色',
    reading: 'りゅーいーそー',
    yakuman: 1,
    openAllowed: true,
    condition: '2・3・4・6・8 索と發だけで構成する。',
    note: '發を含まなくても成立する。',
    example: '222s333s444s666s88s',
    exampleLabel: '緑の牌のみ',
  },
  {
    id: 'chinroutou',
    name: '清老頭',
    reading: 'ちんろーとう',
    yakuman: 1,
    openAllowed: true,
    condition: '幺九牌（1・9）だけで構成する。',
    note: '字牌を含まない。対々和の形になる。',
    example: '111m999m111p999p11s',
    exampleLabel: '1 と 9 のみ',
  },
  {
    id: 'shousuushii',
    name: '小四喜',
    reading: 'しょうすーしー',
    yakuman: 1,
    openAllowed: true,
    condition: '風牌 3 種の刻子と、残り 1 種の雀頭。',
    note: '大四喜とは複合しない。',
    example: '111z222z333z44z123m',
    exampleLabel: '風牌 3 刻子 + 風牌の雀頭',
  },
  {
    id: 'daisuushii',
    name: '大四喜',
    reading: 'だいすーしー',
    yakuman: 2,
    openAllowed: true,
    condition: '風牌 4 種すべてを刻子または槓子にする。',
    note: 'ダブル役満。小四喜とは複合しない。',
    example: '111z222z333z444z11m',
    exampleLabel: '風牌 4 種の刻子',
  },
  {
    id: 'suukantsu',
    name: '四槓子',
    reading: 'すーかんつ',
    yakuman: 1,
    openAllowed: true,
    condition: '槓子を 4 組そろえる。',
    note: '三槓子とは複合しない。',
    example: '1111m3333p5555s7777z11z',
    exampleLabel: '槓子 4 組',
  },
  {
    id: 'chuuren',
    name: '九蓮宝燈',
    reading: 'ちゅーれんぽーとう',
    yakuman: 1,
    condition: '門前で、同種の 1112345678999 + 任意の 1 枚。',
    note: '門前のみ。純正九蓮はダブル役満。',
    example: '11123456789999m',
    exampleLabel: '萬子の 1112345678999 + 9',
  },
  {
    id: 'chuurenPure',
    name: '純正九蓮宝燈',
    reading: 'じゅんせいちゅーれんぽーとう',
    yakuman: 2,
    condition: '九蓮宝燈を、9 面待ちの純粋な形で和了する。',
    note: 'ダブル役満。九蓮宝燈とは重複しない。',
    example: '11123456789995m',
    exampleLabel: '1112345678999 + 5 の形',
  },
];

export type YakuFilter = 'all' | 'closed' | 'open' | 'yakuman';

export function matchesFilter(entry: YakuEntry, filter: YakuFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'yakuman') return entry.yakuman !== undefined;
  if (filter === 'closed') {
    return entry.yakuman !== undefined || entry.closedHan !== undefined;
  }
  return entry.yakuman !== undefined
    ? Boolean(entry.openAllowed)
    : entry.openHan !== undefined;
}

export function yakuHanValue(entry: YakuEntry): number {
  if (entry.yakuman) return 13 * entry.yakuman;
  return Math.max(entry.closedHan ?? 0, entry.openHan ?? 0);
}

export function searchYaku(
  entries: readonly YakuEntry[],
  query: string,
): YakuEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...entries];
  return entries.filter((entry) => {
    const haystack = [
      entry.name,
      entry.reading,
      entry.condition,
      entry.note ?? '',
      entry.id,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function sortYaku(
  entries: readonly YakuEntry[],
  order: 'catalog' | 'hanDesc' | 'hanAsc',
): YakuEntry[] {
  const result = [...entries];
  if (order === 'catalog') return result;
  result.sort((a, b) => {
    const diff = yakuHanValue(b) - yakuHanValue(a);
    return order === 'hanDesc' ? diff : -diff;
  });
  return result;
}

export function yakuById(id: string): YakuEntry | undefined {
  return YAKU_CATALOG.find((entry) => entry.id === id);
}
