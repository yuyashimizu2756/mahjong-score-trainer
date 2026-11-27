import { useEffect, useMemo, useState } from 'react';
import type { ScoreResult } from '../../engine/types';
import { computeScore } from '../../engine/score';
import { parseTiles } from '../../engine/tiles';
import { LESSONS, type Lesson, type LessonFigure } from '../../data/lessons';
import { useAppData } from '../../lib/store';
import type { Settings } from '../../lib/storage';
import {
  formatFu,
  formatHan,
  formatLimit,
  paymentView,
} from '../../lib/format';
import { Hand } from '../../components/Hand';
import { Icon } from '../../components/Icon';
import { Badge, Button, PageHeader, ProgressBar } from '../../components/ui';

interface FigureResult {
  result: ScoreResult;
  label: string;
}

function evaluateFigure(figure: LessonFigure): FigureResult | null {
  const tiles = parseTiles(figure.tiles);
  const win = figure.win ? parseTiles(figure.win) : null;
  if (!tiles || !win || win.length !== 1) return null;
  const outcome = computeScore({
    concealed: tiles,
    melds: [],
    winTile: win[0],
    ctx: {
      tsumo: false,
      seatWind: 2,
      roundWind: 1,
      riichi: false,
      doraIndicators: [],
      honba: 0,
      riichiSticks: 0,
      ...figure.ctx,
    },
  });
  if (!outcome.ok) return null;
  const dealer = (figure.ctx?.seatWind ?? 2) === 1;
  const view = paymentView({
    ron: outcome.payments.ron,
    tsumo: outcome.payments.tsumo,
    total: outcome.payments.total,
    dealer,
  });
  const limit =
    outcome.limit !== 'none' ? `・${formatLimit(outcome.limit)}` : '';
  return {
    result: outcome,
    label:
      outcome.yakumanCount > 0
        ? `${
            outcome.yakumanCount >= 2
              ? `${outcome.yakumanCount} 倍役満`
              : '役満'
          } / ${view.label}`
        : `${formatHan(outcome.han)} ${formatFu(outcome.fu)}${limit} / ${view.label}`,
  };
}

function LessonFigureView({
  figure,
  settings,
}: {
  figure: LessonFigure;
  settings: Settings;
}) {
  const tiles = parseTiles(figure.tiles) ?? [];
  const win = figure.win ? parseTiles(figure.win) : null;
  const evaluated = evaluateFigure(figure);
  return (
    <figure className="rounded-xl border border-ivory-200 bg-ivory-100/60 p-3">
      <div className="overflow-x-auto pb-1 scroll-thin">
        <Hand
          concealed={tiles}
          winTile={win && win.length === 1 ? win[0] : undefined}
          size={settings.tileSize === 'lg' ? 'md' : settings.tileSize}
          showSuitMark={settings.colorBlindSuits}
        />
      </div>
      <figcaption className="mt-2.5 text-[11px] leading-5 text-ink-500">
        {figure.caption}
        {evaluated ? (
          <span className="nums mt-1 block font-semibold text-ink-700">
            エンジン計算: {evaluated.label}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

function QuizBlock({
  quiz,
  selected,
  onSelect,
  onRetry,
}: {
  quiz: Lesson['quizzes'][number];
  selected: number | undefined;
  onSelect: (index: number) => void;
  onRetry: () => void;
}) {
  const answered = selected !== undefined;
  const correct = selected === quiz.correctIndex;
  return (
    <div
      data-testid={`quiz-${quiz.id}`}
      className="rounded-xl border border-ivory-200 bg-ivory-50 p-3.5"
    >
      <p className="text-[13px] font-semibold text-ink-900">{quiz.prompt}</p>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        {quiz.choices.map((choice, index) => {
          const isCorrect = answered && index === quiz.correctIndex;
          const isWrong =
            answered && index === selected && index !== quiz.correctIndex;
          return (
            <button
              key={choice}
              type="button"
              data-testid="quiz-choice"
              data-quiz-id={quiz.id}
              onClick={() => onSelect(index)}
              disabled={answered}
              aria-pressed={selected === index}
              className={[
                'flex items-center gap-2 rounded-[8px] border px-3 py-2 text-left text-[12px] transition-colors',
                isCorrect
                  ? 'border-jade bg-jade/10 font-semibold text-jade'
                  : isWrong
                    ? 'border-vermilion bg-vermilion/10 font-semibold text-vermilion'
                    : 'border-ivory-200 bg-ivory-100/60 text-ink-700 hover:border-gold/60 hover:bg-gold/10',
                'disabled:cursor-default',
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
              {choice}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className="mt-2.5 rounded-lg border border-ivory-200 bg-ivory-100/70 px-3 py-2 text-[11px] leading-5 text-ink-700">
          <p className="font-semibold text-ink-900">
            {correct ? '正解' : '不正解'}
          </p>
          <p>{quiz.explanation}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 text-[10px] font-semibold text-vermilion underline-offset-2 hover:underline"
          >
            もう一度考える
          </button>
        </div>
      ) : null}
    </div>
  );
}

export interface LearnPageProps {
  settings: Settings;
  initialLessonId?: string;
  onNavigatePractice: () => void;
}

export function LearnPage({
  settings,
  initialLessonId,
  onNavigatePractice,
}: LearnPageProps) {
  const { learn, completeLesson } = useAppData();
  const [lessonId, setLessonId] = useState<string>(
    initialLessonId ?? LESSONS[0].id,
  );
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>(
    {},
  );

  useEffect(() => {
    if (initialLessonId) setLessonId(initialLessonId);
  }, [initialLessonId]);

  const lesson = useMemo(
    () => LESSONS.find((item) => item.id === lessonId) ?? LESSONS[0],
    [lessonId],
  );
  const lessonAnswers = answers[lesson.id] ?? {};
  const answeredCount = lesson.quizzes.filter(
    (quiz) => lessonAnswers[quiz.id] !== undefined,
  ).length;
  const correctCount = lesson.quizzes.filter(
    (quiz) => lessonAnswers[quiz.id] === quiz.correctIndex,
  ).length;
  const allAnswered = answeredCount === lesson.quizzes.length;
  const completedCount = LESSONS.filter(
    (item) => learn.lessons[item.id]?.completed,
  ).length;
  const progress = learn.lessons[lesson.id];

  useEffect(() => {
    if (!allAnswered) return;
    completeLesson(lesson.id, correctCount, lesson.quizzes.length);
  }, [allAnswered, completeLesson, correctCount, lesson.id, lesson.quizzes.length]);

  const selectLesson = (id: string) => {
    setLessonId(id);
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  const nextLesson = LESSONS.find((item) => item.number === lesson.number + 1);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Learn"
        title="学習"
        description="点数計算の流れを 6 つのレッスンで解説します。本文を読んだら、その場の確認問題で手を動かしましょう。"
        actions={
          <div className="w-44">
            <ProgressBar
              value={completedCount}
              max={LESSONS.length}
              label="完了したレッスン"
            />
          </div>
        }
      />

      <div className="grid gap-4 desk:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="card-dark h-fit p-2 desk:sticky desk:top-6">
          <h2 className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ivory-50/45">
            レッスン
          </h2>
          <ol className="space-y-1">
            {LESSONS.map((item) => {
              const active = item.id === lesson.id;
              const done = learn.lessons[item.id]?.completed;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectLesson(item.id)}
                    aria-current={active ? 'true' : undefined}
                    className={[
                      'flex w-full items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors',
                      active
                        ? 'bg-ivory-50/10 text-ivory-50'
                        : 'text-ivory-50/65 hover:bg-ivory-50/5 hover:text-ivory-50',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                        done
                          ? 'border-jade bg-jade text-ivory-50'
                          : active
                            ? 'border-gold text-gold'
                            : 'border-line text-ivory-50/50',
                      ].join(' ')}
                    >
                      {done ? (
                        <Icon name="check" className="h-3 w-3" />
                      ) : (
                        item.number
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold leading-5">
                        {item.title}
                      </span>
                      <span className="block text-[10px] leading-4 text-ivory-50/45">
                        {item.subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-2 border-t border-line px-2 py-3">
            <Button
              tone="ghost"
              size="sm"
              className="w-full"
              onClick={onNavigatePractice}
              icon={<Icon name="practice" className="h-4 w-4" />}
            >
              練習で確かめる
            </Button>
          </div>
        </aside>

        <article className="card min-w-0 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="vermilion">Lesson {lesson.number}</Badge>
            <Badge tone="neutral">{lesson.subtitle}</Badge>
            {progress?.completed ? <Badge tone="jade">完了済み</Badge> : null}
          </div>
          <h2 className="mt-3 text-[24px] leading-9 text-ink-900">
            {lesson.title}
          </h2>
          <p className="mt-2 text-[13px] leading-7 text-ink-700">{lesson.lead}</p>

          <div className="mt-6 space-y-6">
            {lesson.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="text-[16px] text-ink-900">{section.heading}</h3>
                <div className="mt-2 space-y-2">
                  {section.body.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-[13px] leading-7 text-ink-700"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.formula ? (
                  <p className="nums mt-3 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[13px] font-semibold text-ink-900">
                    {section.formula}
                  </p>
                ) : null}
                {section.figure ? (
                  <div className="mt-3">
                    <LessonFigureView
                      figure={section.figure}
                      settings={settings}
                    />
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-jade/30 bg-jade/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-jade">
              このレッスンのポイント
            </p>
            <ul className="mt-2 space-y-1.5">
              {lesson.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-[12px] leading-6 text-ink-700"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-jade"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <section className="mt-7 border-t border-ivory-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[16px] text-ink-900">確認問題</h3>
              <span className="nums text-[11px] text-ink-500">
                {answeredCount} / {lesson.quizzes.length} 問回答
                {allAnswered ? `・${correctCount} 問正解` : ''}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {lesson.quizzes.map((quiz) => (
                <QuizBlock
                  key={quiz.id}
                  quiz={quiz}
                  selected={lessonAnswers[quiz.id]}
                  onSelect={(index) =>
                    setAnswers((previous) => ({
                      ...previous,
                      [lesson.id]: {
                        ...(previous[lesson.id] ?? {}),
                        [quiz.id]: index,
                      },
                    }))
                  }
                  onRetry={() =>
                    setAnswers((previous) => {
                      const current = { ...(previous[lesson.id] ?? {}) };
                      delete current[quiz.id];
                      return { ...previous, [lesson.id]: current };
                    })
                  }
                />
              ))}
            </div>

            {allAnswered ? (
              <div
                className={[
                  'mt-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3',
                  correctCount === lesson.quizzes.length
                    ? 'border-jade/40 bg-jade/10'
                    : 'border-gold/40 bg-gold/10',
                ].join(' ')}
              >
                <Icon
                  name={
                    correctCount === lesson.quizzes.length ? 'check' : 'hint'
                  }
                  className={[
                    'h-5 w-5',
                    correctCount === lesson.quizzes.length
                      ? 'text-jade'
                      : 'text-gold',
                  ].join(' ')}
                />
                <p className="text-[12px] font-semibold text-ink-900">
                  {correctCount === lesson.quizzes.length
                    ? `全 ${lesson.quizzes.length} 問正解。このレッスンは完了です。`
                    : `${lesson.quizzes.length} 問中 ${correctCount} 問正解。解説を読んで、もう一度挑戦しましょう。`}
                </p>
                {nextLesson && correctCount === lesson.quizzes.length ? (
                  <Button
                    tone="primary"
                    size="sm"
                    className="ml-auto"
                    onClick={() => selectLesson(nextLesson.id)}
                    icon={<Icon name="arrow" className="h-4 w-4" />}
                  >
                    次のレッスン
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>
        </article>
      </div>
    </div>
  );
}
