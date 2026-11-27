import { useEffect, useRef, useState } from 'react';
import { parseTiles } from '../../engine/tiles';
import { Hand } from '../../components/Hand';
import { Icon } from '../../components/Icon';
import { Badge, Button } from '../../components/ui';
import type { Settings } from '../../lib/storage';
import type { DrillQuestion } from './drills';
import { fuQuestionByKey } from './drills';
import { GUIDE_SECTIONS, type GuideBlock, type GuideSection } from './guides';

const GUIDE_SECTION_LIST = GUIDE_SECTIONS;

function TileFigure({
  tiles,
  win,
  caption,
  settings,
}: {
  tiles: string;
  win?: string;
  caption: string;
  settings: Settings;
}) {
  const parsed = parseTiles(tiles) ?? [];
  const parsedWin = win ? parseTiles(win) : null;
  return (
    <figure className="rounded-xl border border-ivory-200 bg-ivory-100/60 p-3">
      <div className="overflow-x-auto pb-1 scroll-thin">
        <Hand
          concealed={parsed}
          winTile={parsedWin && parsedWin.length === 1 ? parsedWin[0] : undefined}
          size={settings.tileSize === 'lg' ? 'md' : settings.tileSize}
          showSuitMark={settings.colorBlindSuits}
        />
      </div>
      <figcaption className="mt-2 text-[11px] leading-6 text-ink-500">
        {caption}
      </figcaption>
    </figure>
  );
}

function AnswerFeedback({
  question,
  selected,
}: {
  question: DrillQuestion;
  selected: number;
}) {
  const correct = selected === question.correctIndex;
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedbackRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);
  return (
    <div
      ref={feedbackRef}
      role="status"
      className={[
        'mt-2 rounded-lg border px-3 py-2 text-[11px] leading-6',
        correct
          ? 'border-jade/40 bg-jade/10 text-ink-700'
          : 'border-vermilion/40 bg-vermilion/10 text-ink-700',
      ].join(' ')}
    >
      <p className="flex items-center gap-1.5 font-semibold text-ink-900">
        <Icon
          name={correct ? 'check' : 'cross'}
          className={correct ? 'h-4 w-4 text-jade' : 'h-4 w-4 text-vermilion'}
        />
        {correct ? '正解' : `不正解（正解は ${question.choices[question.correctIndex].label}）`}
      </p>
      <p className="mt-1 whitespace-pre-line">{question.explanation}</p>
    </div>
  );
}

function MiniCheck({ question }: { question: DrillQuestion }) {
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const parsed = question.tiles ? parseTiles(question.tiles) : null;
  const parsedWin = question.win ? parseTiles(question.win) : null;
  return (
    <div className="rounded-xl border border-ivory-200 bg-ivory-50 p-3.5">
      <p className="text-[12px] font-semibold text-ink-900">
        ミニ問題: {question.prompt}
      </p>
      {parsed && parsed.length > 0 ? (
        <div className="mt-2 overflow-x-auto pb-1 scroll-thin">
          <Hand
            concealed={parsed}
            winTile={
              parsedWin && parsedWin.length === 1 ? parsedWin[0] : undefined
            }
            size="sm"
          />
        </div>
      ) : null}
      <div
        className={[
          'mt-2 grid gap-2 sm:grid-cols-2',
          `minicheck-${question.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
        ].join(' ')}
      >
        {question.choices.map((choice, index) => {
          const answered = selected !== undefined;
          const isCorrect = answered && index === question.correctIndex;
          const isWrong = answered && index === selected && !isCorrect;
          return (
            <button
              key={choice.id}
              type="button"
              data-testid="guide-check-choice"
              onClick={() => setSelected(index)}
              disabled={answered}
              aria-pressed={selected === index}
              aria-label={`${index + 1}. ${choice.label}`}
              className={[
                'flex min-h-9 items-center gap-2 rounded-[8px] border px-3 py-1.5 text-left text-[12px] transition-colors',
                isCorrect
                  ? 'border-jade bg-jade/10 font-semibold text-jade'
                  : isWrong
                    ? 'border-vermilion bg-vermilion/10 font-semibold text-vermilion'
                    : 'border-ivory-200 bg-ivory-100/60 text-ink-700 hover:border-gold/60 hover:bg-gold/10',
              ].join(' ')}
            >
              {answered && (isCorrect || isWrong) ? (
                <Icon
                  name={isCorrect ? 'check' : 'cross'}
                  className="h-4 w-4 shrink-0"
                />
              ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ivory-200 text-[9px] text-ink-500">
                  {index + 1}
                </span>
              )}
              {choice.label}
            </button>
          );
        })}
      </div>
      {selected !== undefined ? (
        <AnswerFeedback question={question} selected={selected} />
      ) : null}
    </div>
  );
}

function Block({ block, settings }: { block: GuideBlock; settings: Settings }) {
  if (block.type === 'paragraph') {
    return <p className="text-[13px] leading-7 text-ink-700">{block.text}</p>;
  }
  if (block.type === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul';
    return (
      <ListTag className="space-y-1.5">
        {block.items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-[13px] leading-7 text-ink-700"
          >
            <span
              aria-hidden="true"
              className={[
                'shrink-0 rounded-full bg-gold',
                block.ordered
                  ? 'mt-1 flex h-4 w-4 items-center justify-center text-[9px] font-bold text-ink-900'
                  : 'mt-3 h-1.5 w-1.5',
              ].join(' ')}
            >
              {block.ordered ? index + 1 : null}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ListTag>
    );
  }
  if (block.type === 'formula') {
    return (
      <div className="rounded-lg border border-gold/35 bg-gold/10 px-3 py-2.5">
        <p className="nums text-[13px] font-semibold leading-6 text-ink-900">
          {block.text}
        </p>
        {block.note ? (
          <p className="mt-1 text-[11px] leading-5 text-ink-500">{block.note}</p>
        ) : null}
      </div>
    );
  }
  if (block.type === 'table') {
    return (
      <div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[380px] border-collapse text-[12px]">
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th
                    key={cell}
                    scope="col"
                    className="border-b border-ivory-200 bg-ivory-100 px-2.5 py-2 text-left font-semibold text-ink-900"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-ivory-200/70">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={[
                        'px-2.5 py-2 align-top leading-5 text-ink-700',
                        cellIndex === 0 ? 'font-semibold text-ink-900' : 'nums',
                      ].join(' ')}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {block.caption ? (
          <p className="mt-1.5 text-[10px] leading-5 text-ink-500">
            {block.caption}
          </p>
        ) : null}
      </div>
    );
  }
  if (block.type === 'figure') {
    return (
      <TileFigure
        tiles={block.tiles}
        win={block.win}
        caption={block.caption}
        settings={settings}
      />
    );
  }
  if (block.type === 'steps') {
    return (
      <ol className="grid gap-2 sm:grid-cols-2">
        {block.items.map((item, index) => (
          <li
            key={item.title}
            className="rounded-xl border border-ivory-200 bg-ivory-100/50 p-3"
          >
            <p className="flex items-center gap-2 text-[12px] font-semibold text-ink-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-felt-700 text-[10px] font-bold text-ivory-50">
                {index + 1}
              </span>
              {item.title}
            </p>
            <p className="mt-1.5 text-[11px] leading-6 text-ink-700">
              {item.body}
            </p>
          </li>
        ))}
      </ol>
    );
  }
  const toneClass =
    block.tone === 'jade'
      ? 'border-jade/40 bg-jade/10'
      : block.tone === 'vermilion'
        ? 'border-vermilion/35 bg-vermilion/10'
        : 'border-gold/40 bg-gold/10';
  const iconClass =
    block.tone === 'jade'
      ? 'text-jade'
      : block.tone === 'vermilion'
        ? 'text-vermilion'
        : 'text-gold';
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${toneClass}`}>
      <p className={`flex items-center gap-2 text-[12px] font-semibold ${iconClass}`}>
        <Icon
          name={block.tone === 'vermilion' ? 'alert' : 'hint'}
          className="h-4 w-4"
        />
        {block.title}
      </p>
      <p className="mt-1 text-[12px] leading-6 text-ink-700">{block.body}</p>
    </div>
  );
}

export interface GuideViewProps {
  section: GuideSection;
  settings: Settings;
  onBack: () => void;
  onSelectSection: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function GuideView({
  section,
  settings,
  onBack,
  onSelectSection,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: GuideViewProps) {
  const checks = (section.checks ?? [])
    .map((key) => fuQuestionByKey(key))
    .filter((question): question is DrillQuestion => question !== null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const scroller = document.querySelector('[data-scroll-root]');
    if (scroller && scroller.scrollTop > 0 && typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [section.id]);

  return (
    <div className="grid gap-4 desk:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="card-dark hidden h-fit min-w-0 p-2 desk:sticky desk:top-6 desk:block">
        <h2 className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ivory-50/45">
          覚え方ガイド
        </h2>
        <div className="flex gap-1 overflow-x-auto pb-1 scroll-thin desk:block desk:space-y-1 desk:overflow-visible desk:pb-0">
          {GUIDE_SECTION_LIST.map((item) => {
            const active = item.id === section.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={active ? 'true' : undefined}
                className={[
                  'flex shrink-0 items-start gap-2 rounded-[10px] px-2.5 py-2 text-left transition-colors desk:w-full desk:shrink',
                  active
                    ? 'bg-ivory-50/10 text-ivory-50'
                    : 'text-ivory-50/65 hover:bg-ivory-50/5 hover:text-ivory-50',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                    active ? 'border-gold text-gold' : 'border-line text-ivory-50/50',
                  ].join(' ')}
                >
                  {item.number}
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-[12px] font-semibold leading-5 desk:whitespace-normal">
                    {item.title}
                  </span>
                  <span className="hidden text-[10px] leading-4 text-ivory-50/45 desk:block">
                    {item.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 border-t border-line px-2 py-3">
          <Button
            tone="ghost"
            size="sm"
            className="w-full"
            onClick={onBack}
            icon={<Icon name="arrow" className="h-4 w-4 rotate-180" />}
          >
            一覧へ戻る
          </Button>
        </div>
      </aside>

      <article className="card min-w-0 p-5 sm:p-7">
        <div className="mb-3 flex items-center justify-between gap-2 desk:hidden">
          <Button
            tone="outline"
            size="sm"
            onClick={onBack}
            icon={<Icon name="arrow" className="h-4 w-4 rotate-180" />}
          >
            一覧へ戻る
          </Button>
          <span className="nums text-[10px] text-ink-500">
            {section.number} / {GUIDE_SECTIONS.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="vermilion">Section {section.number}</Badge>
          <Badge tone="neutral">{section.subtitle}</Badge>
          <Badge tone="dark">約 {section.minutes} 分</Badge>
        </div>
        <h2 className="mt-3 text-[24px] leading-9 text-ink-900">
          {section.title}
        </h2>
        <p className="mt-2 text-[13px] leading-7 text-ink-700">{section.lead}</p>

        <div className="mt-5 space-y-4">
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} settings={settings} />
          ))}
        </div>

        {checks.length > 0 ? (
          <section className="mt-6 border-t border-ivory-200 pt-4">
            <h3 className="text-[15px] text-ink-900">このセクションの即答チェック</h3>
            <p className="mt-0.5 text-[11px] text-ink-500">
              答えを選ぶと、その場で式と解説が開きます。
            </p>
            <div className="mt-3 space-y-3">
              {checks.map((question) => (
                <MiniCheck key={question.id} question={question} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-ivory-200 pt-4">
          <Button
            tone="outline"
            size="sm"
            onClick={onPrev}
            disabled={!hasPrev}
            icon={<Icon name="arrow" className="h-4 w-4 rotate-180" />}
          >
            前のセクション
          </Button>
          <Button
            tone="outline"
            size="sm"
            onClick={onBack}
            className="order-last w-full sm:order-none sm:w-auto"
          >
            一覧へ戻る
          </Button>
          <Button
            tone="primary"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
            icon={<Icon name="arrow" className="h-4 w-4" />}
          >
            次のセクション
          </Button>
        </div>
      </article>
    </div>
  );
}
