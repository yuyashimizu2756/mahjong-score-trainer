import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseTiles } from '../../engine/tiles';
import { Hand } from '../../components/Hand';
import { Icon } from '../../components/Icon';
import { Badge, Button, ProgressBar } from '../../components/ui';
import { percent } from '../../lib/format';
import { useAppData } from '../../lib/store';
import type { DrillKind } from '../../lib/srs';
import {
  DRILL_KIND_META,
  type DrillQuestion,
} from './drills';

export interface DrillViewProps {
  questions: DrillQuestion[];
  /** 特定の種類だけのセッションなら、その種類。混在なら undefined。 */
  kind?: DrillKind;
  onExit: () => void;
  onRestart: (kind?: DrillKind, excludeId?: string) => void;
}

interface AnswerRecord {
  kind: DrillKind;
  correct: boolean;
}

function scrollQuestionTop(): void {
  if (typeof document === 'undefined') return;
  const scroller = document.querySelector('[data-scroll-root]');
  if (scroller && typeof scroller.scrollTo === 'function') {
    scroller.scrollTo({ top: 0, behavior: 'auto' });
  }
}

export function DrillView({
  questions,
  kind,
  onExit,
  onRestart,
}: DrillViewProps) {
  const { recordDrill } = useAppData();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const question = questions[index];
  const answered = selected !== undefined;
  const correctCount = answers.filter((answer) => answer.correct).length;
  const accuracy = percent(correctCount, answers.length);
  const title = kind ? DRILL_KIND_META[kind].name : '今日のドリル';

  const answer = useCallback(
    (choiceIndex: number) => {
      if (!question || selected !== undefined) return;
      const correct = choiceIndex === question.correctIndex;
      const nextStreak = correct ? streak + 1 : 0;
      setSelected(choiceIndex);
      setAnswers((previous) => [...previous, { kind: question.kind, correct }]);
      setStreak(nextStreak);
      setBestStreak((previous) => Math.max(previous, nextStreak));
      recordDrill(question.id, question.kind, correct);
      window.setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ block: 'nearest' });
      }, 0);
    },
    [question, recordDrill, selected, streak],
  );

  const next = useCallback(() => {
    if (selected === undefined) return;
    if (index + 1 >= questions.length) {
      setFinished(true);
      scrollQuestionTop();
      return;
    }
    setIndex((previous) => previous + 1);
    setSelected(undefined);
    scrollQuestionTop();
  }, [index, questions.length, selected]);

  useEffect(() => {
    if (finished) return;
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (/^[1-4]$/.test(event.key)) {
        if (selected === undefined) {
          event.preventDefault();
          answer(Number(event.key) - 1);
        }
        return;
      }
      if (event.key === 'Enter') {
        if (tag === 'BUTTON') {
          const button = target as HTMLButtonElement;
          const isChoice =
            button.getAttribute('data-testid') === 'drill-choice';
          // 有効なボタンはブラウザのクリックに任せる。回答済みで
          // 無効になった選択肢の上でも Enter で次へ進めるようにする。
          if (!isChoice || !button.disabled) return;
        }
        if (selected !== undefined) {
          event.preventDefault();
          next();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [answer, finished, next, selected]);

  const byKind = useMemo(() => {
    const map = new Map<DrillKind, { total: number; correct: number }>();
    for (const record of answers) {
      const current = map.get(record.kind) ?? { total: 0, correct: 0 };
      current.total += 1;
      if (record.correct) current.correct += 1;
      map.set(record.kind, current);
    }
    return map;
  }, [answers]);

  if (finished) {
    const weakest = [...byKind.entries()]
      .filter(([, record]) => record.total >= 1)
      .sort((a, b) => {
        const accuracyA = a[1].correct / a[1].total;
        const accuracyB = b[1].correct / b[1].total;
        return accuracyA - accuracyB || b[1].total - a[1].total;
      })[0];

    return (
      <div className="space-y-4">
        <section className="card p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold">Drill 完了</Badge>
            <Badge tone="neutral">{title}</Badge>
          </div>
          <h2 className="mt-3 text-[24px] leading-9 text-ink-900">結果</h2>
          <p className="mt-1 text-[13px] leading-6 text-ink-500">
            {questions.length} 問中 {correctCount} 問正解。間違えた問題は翌日にまた出ます。
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-2">
            {[
              ['正答数', `${correctCount}`, ` / ${answers.length}`],
              ['正答率', `${accuracy}`, '%'],
              ['最高連続', `${bestStreak}`, '問'],
            ].map(([label, value, unit]) => (
              <div
                key={label}
                className="rounded-xl border border-ivory-200 bg-ivory-100/60 px-3 py-2.5"
              >
                <dt className="text-[9px] text-ink-500">{label}</dt>
                <dd className="nums text-[24px] font-semibold leading-8 text-ink-900">
                  {value}
                  <span className="ml-0.5 text-[10px] font-normal text-ink-500">
                    {unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 space-y-1.5">
            {[...byKind.entries()].map(([currentKind, record]) => (
              <div
                key={currentKind}
                className="flex items-center gap-2 rounded-lg border border-ivory-200 bg-ivory-50 px-3 py-2"
              >
                <span className="min-w-0 flex-1 text-[12px] font-semibold text-ink-900">
                  {DRILL_KIND_META[currentKind].name}
                </span>
                <span className="nums text-[11px] text-ink-500">
                  {record.correct} / {record.total}
                </span>
                <span
                  className={[
                    'nums rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    record.correct === record.total
                      ? 'bg-jade/15 text-jade'
                      : 'bg-vermilion/10 text-vermilion',
                  ].join(' ')}
                >
                  {percent(record.correct, record.total)}%
                </span>
              </div>
            ))}
          </div>

          {weakest ? (
            <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-3">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-ink-900">
                <Icon name="hint" className="h-4 w-4 text-gold" />
                次に伸ばすなら「{DRILL_KIND_META[weakest[0]].name}」
              </p>
              <p className="mt-1 text-[11px] leading-6 text-ink-700">
                {DRILL_KIND_META[weakest[0]].description}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              tone="primary"
              size="md"
              onClick={() =>
                onRestart(kind, questions[questions.length - 1]?.id)
              }
              icon={<Icon name="refresh" className="h-4 w-4" />}
            >
              もう一度
            </Button>
            <Button tone="outline" size="md" onClick={onExit}>
              覚え方ハブへ
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!question) {
    return (
      <section className="card p-6">
        <h2 className="text-[18px] text-ink-900">問題を用意できませんでした</h2>
        <p className="mt-1 text-[12px] text-ink-500">
          一覧へ戻って、もう一度ドリルを開始してください。
        </p>
        <Button tone="outline" size="sm" className="mt-4" onClick={onExit}>
          一覧へ戻る
        </Button>
      </section>
    );
  }

  const parsed = question.tiles ? parseTiles(question.tiles) : null;
  const parsedWin = question.win ? parseTiles(question.win) : null;

  return (
    <div className="space-y-4">
      <section className="card-dark p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="nums text-[12px] font-semibold text-ivory-50">
            {index + 1} / {questions.length}
          </p>
          <p className="nums text-[11px] text-ivory-50/60">
            正答率 {accuracy}%（{correctCount} / {answers.length}）
          </p>
          <p className="nums flex items-center gap-1 text-[11px] text-ivory-50/60">
            <Icon name="flame" className="h-3.5 w-3.5 text-gold" />
            連続 {streak}
          </p>
          <span className="ml-auto text-[10px] text-ivory-50/45">
            {DRILL_KIND_META[question.kind].name}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar
            value={index + (answered ? 1 : 0)}
            max={questions.length}
            label="回答済み"
          />
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="vermilion">{title}</Badge>
          <Badge tone="neutral">{DRILL_KIND_META[question.kind].short}</Badge>
        </div>
        <h2 className="mt-3 text-[19px] leading-8 text-ink-900 sm:text-[22px]">
          {question.prompt}
        </h2>

        {question.context.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {question.context.map((line) => (
              <span
                key={line}
                className="rounded-full border border-ivory-200 bg-ivory-100/70 px-2 py-0.5 text-[10px] leading-4 text-ink-500"
              >
                {line}
              </span>
            ))}
          </div>
        ) : null}

        {parsed && parsed.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-ivory-200 bg-ivory-100/60 p-3 pb-4 scroll-thin">
            <Hand
              concealed={parsed}
              winTile={
                parsedWin && parsedWin.length === 1 ? parsedWin[0] : undefined
              }
              size="sm"
            />
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {question.choices.map((choice, choiceIndex) => {
            const isCorrect = answered && choiceIndex === question.correctIndex;
            const isWrong =
              answered && choiceIndex === selected && !isCorrect;
            return (
              <button
                key={choice.id}
                type="button"
                data-testid="drill-choice"
                onClick={() => answer(choiceIndex)}
                disabled={answered}
                aria-pressed={selected === choiceIndex}
                aria-label={`${choiceIndex + 1}. ${choice.label}`}
                className={[
                  'flex min-h-[52px] items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-left text-[13px] transition-colors',
                  isCorrect
                    ? 'border-jade bg-jade/10 font-semibold text-jade'
                    : isWrong
                      ? 'border-vermilion bg-vermilion/10 font-semibold text-vermilion'
                      : 'border-ivory-200 bg-ivory-100/60 text-ink-700 hover:border-gold/60 hover:bg-gold/10 disabled:cursor-default',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                    isCorrect
                      ? 'border-jade bg-jade text-ivory-50'
                      : isWrong
                        ? 'border-vermilion bg-vermilion text-ivory-50'
                        : 'border-ivory-200 text-ink-500',
                  ].join(' ')}
                >
                  {answered && (isCorrect || isWrong) ? (
                    <Icon
                      name={isCorrect ? 'check' : 'cross'}
                      className="h-3.5 w-3.5"
                    />
                  ) : (
                    choiceIndex + 1
                  )}
                </span>
                <span className="min-w-0">{choice.label}</span>
              </button>
            );
          })}
        </div>

        {answered ? (
          <div
            ref={feedbackRef}
            role="status"
            className={[
              'mt-4 scroll-mt-20 rounded-xl border px-4 py-3',
              selected === question.correctIndex
                ? 'border-jade/40 bg-jade/10'
                : 'border-vermilion/40 bg-vermilion/10',
            ].join(' ')}
          >
            <p className="flex items-center gap-2 text-[12px] font-semibold text-ink-900">
              <Icon
                name={selected === question.correctIndex ? 'check' : 'cross'}
                className={[
                  'h-4 w-4',
                  selected === question.correctIndex
                    ? 'text-jade'
                    : 'text-vermilion',
                ].join(' ')}
              />
              {selected === question.correctIndex
                ? '正解'
                : `不正解（正解は ${question.choices[question.correctIndex].label}）`}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[12px] leading-6 text-ink-700">
              {question.explanation}
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] leading-5 text-ink-500">
            キーボード: 1〜4 で回答、Enter で次へ
          </p>
          <div className="flex gap-2">
            <Button tone="quiet" size="sm" onClick={onExit}>
              やめる
            </Button>
            <Button
              tone="primary"
              size="md"
              onClick={next}
              disabled={!answered}
              icon={<Icon name="arrow" className="h-4 w-4" />}
            >
              {index + 1 >= questions.length ? '結果を見る' : '次へ'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
