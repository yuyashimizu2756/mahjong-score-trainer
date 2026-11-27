import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { YakuPage } from '../../src/features/yaku/YakuPage';
import {
  DEFAULT_STATS,
  type Stats,
} from '../../src/lib/storage';
import { YAKU_CATALOG, matchesFilter } from '../../src/data/yaku';
import { parseTiles } from '../../src/engine/tiles';

function renderYaku(stats: Stats = DEFAULT_STATS) {
  return render(<YakuPage stats={stats} />);
}

describe('役一覧', () => {
  it('全 42 役をカードで表示する', () => {
    renderYaku();
    expect(YAKU_CATALOG).toHaveLength(42);
    expect(screen.getAllByTestId('yaku-card')).toHaveLength(42);
    expect(screen.getByText('42 件を表示')).toBeInTheDocument();
  });

  it('全 42 役の id がそろい、例の牌姿がパースできる', () => {
    const expectedIds = [
      'riichi',
      'doubleRiichi',
      'ippatsu',
      'menzenTsumo',
      'pinfu',
      'tanyao',
      'iipeikou',
      'yakuhaiHaku',
      'yakuhaiHatsu',
      'yakuhaiChun',
      'yakuhaiSeat',
      'yakuhaiRound',
      'rinshan',
      'haitei',
      'houtei',
      'chankan',
      'sanshokuDoujun',
      'ittsu',
      'chanta',
      'chiitoitsu',
      'toitoi',
      'sanankou',
      'sanshokuDoukou',
      'sankantsu',
      'shousangen',
      'honroutou',
      'honitsu',
      'junchan',
      'ryanpeikou',
      'chinitsu',
      'kokushi',
      'suuankou',
      'suuankouTanki',
      'daisangen',
      'tsuuiisou',
      'ryuuiisou',
      'chinroutou',
      'shousuushii',
      'daisuushii',
      'suukantsu',
      'chuuren',
      'chuurenPure',
    ];
    expect(YAKU_CATALOG.map((entry) => entry.id).sort()).toEqual(
      [...expectedIds].sort(),
    );
    for (const entry of YAKU_CATALOG) {
      const tiles = parseTiles(entry.example);
      expect(tiles, entry.id).not.toBeNull();
      expect(tiles?.length ?? 0, entry.id).toBeGreaterThanOrEqual(14);
    }
  });

  it('検索で役名・読みを絞り込める', () => {
    renderYaku();
    const input = screen.getByPlaceholderText(/役名・読み・条件で検索/);
    fireEvent.change(input, { target: { value: '平和' } });
    const cards = screen.getAllByTestId('yaku-card');
    expect(cards).toHaveLength(1);
    expect(
      within(cards[0]).getByRole('heading', { level: 2, name: '平和' }),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'ぴんふ' } });
    expect(screen.getAllByTestId('yaku-card')).toHaveLength(1);
  });

  it('門前 / 副露 / 役満フィルタが働く', () => {
    renderYaku();
    const filters = screen.getByRole('group', { name: '役のフィルタ' });

    fireEvent.click(within(filters).getByRole('button', { name: '役満' }));
    const yakumanCount = YAKU_CATALOG.filter((entry) =>
      matchesFilter(entry, 'yakuman'),
    ).length;
    expect(screen.getAllByTestId('yaku-card')).toHaveLength(yakumanCount);

    fireEvent.click(within(filters).getByRole('button', { name: '副露' }));
    const openCount = YAKU_CATALOG.filter((entry) =>
      matchesFilter(entry, 'open'),
    ).length;
    expect(screen.getAllByTestId('yaku-card')).toHaveLength(openCount);
    expect(
      screen.queryByRole('heading', { level: 2, name: '国士無双' }),
    ).not.toBeInTheDocument();
  });

  it('翻数で並び替えられる', () => {
    renderYaku();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'hanAsc' } });
    const cards = screen.getAllByTestId('yaku-card');
    expect(
      within(cards[0]).getByRole('heading', { level: 2, name: '立直' }),
    ).toBeInTheDocument();
  });

  it('正答率の低い役に苦手バッジを付ける', () => {
    renderYaku({
      ...DEFAULT_STATS,
      total: 3,
      correct: 1,
      byYaku: { pinfu: { total: 3, correct: 1 } },
    });
    const card = screen
      .getAllByTestId('yaku-card')
      .find((element) => element.textContent?.includes('平和'));
    expect(card).toBeDefined();
    if (!card) return;
    expect(within(card).getByText('苦手 33%')).toBeInTheDocument();
  });
});
