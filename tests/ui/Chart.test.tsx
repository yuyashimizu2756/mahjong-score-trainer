import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChartPage } from '../../src/features/chart/ChartPage';

describe('点数表', () => {
  it('4 つの向きのタブを表示し、切り替えられる', () => {
    render(<ChartPage focus={null} />);
    const tablist = screen.getByRole('tablist', { name: '点数表の向き' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tablist).toBeInTheDocument();
  });

  it('横スクロールのヒントとキーボード操作可能な領域を持つ', () => {
    render(<ChartPage focus={null} />);
    expect(
      screen.getByText(/横にスクロールできます/),
    ).toBeInTheDocument();
    const region = screen.getByRole('region', {
      name: /点数表。横にスクロールできます/,
    });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveAttribute(
      'aria-describedby',
      'chart-scroll-hint',
    );
  });

  it('子ロン 30 符 3 翻のセルが 3,900', () => {
    render(<ChartPage focus={null} />);
    expect(
      screen.getByRole('cell', { name: '30 符 3 翻 3,900' }),
    ).toBeInTheDocument();
  });

  it('20 符ロンなど成立しないセルは「—」', () => {
    render(<ChartPage focus={null} />);
    expect(
      screen.getByRole('cell', { name: '20 符 1 翻 —' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: '25 符 1 翻 —' }),
    ).toBeInTheDocument();
  });

  it('練習結果のセルをハイライトする', () => {
    render(
      <ChartPage
        focus={{ fu: 40, han: 4, dealer: false, tsumo: false }}
      />,
    );
    const cell = screen.getByRole('cell', { name: '40 符 4 翻 8,000' });
    expect(cell).toHaveAttribute('aria-current', 'true');
  });

  it('親ツモのタブでは全員同額を表示する', () => {
    render(
      <ChartPage
        focus={{ fu: 20, han: 2, dealer: true, tsumo: true }}
      />,
    );
    expect(
      screen.getByRole('cell', { name: '20 符 2 翻 700オール' }),
    ).toBeInTheDocument();
  });

  it('役満列は 32,000（子ロン）', () => {
    render(<ChartPage focus={null} />);
    expect(
      screen.getByRole('cell', { name: '30 符 役満 32,000' }),
    ).toBeInTheDocument();
  });
});
