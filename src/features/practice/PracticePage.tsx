import { useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, Problem } from '../../engine/types';
import { generateProblem } from '../../engine/problem';
import type { ReviewItem, Settings } from '../../lib/storage';
import type { ChartFocus } from '../../lib/chart-focus';
import { useAppData } from '../../lib/store';
import {
  generatePointChoices,
  generateStepChoices,
  type PointChoice,
} from '../../lib/choices';
import { difficultyLabel, formatFu, formatHan, percent } from '../../lib/format';
import { HandStage } from './HandStage';
import { Icon } from '../../components/Icon';
import { ResultPanel } from '../../components/ResultPanel';
import { SituationChips } from '../../components/SituationChips';
import { Badge, Button, PageHeader } from '../../components/ui';

type StepKey = 'han' | 'fu' | 'points';
type Phase = 'answering' | 'result';

export interface PracticePageProps {
  settings: Settings;
  initialDifficulty?: Difficulty;
  initialSeed?: number;
  initialReview?: boolean;
  onNavigateChart: (focus: ChartFocus) => void;
}

interface SessionStats {
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

const EMPTY_SESSION: SessionStats = {
  total: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
};

const STEP_LABELS: Record<StepKey, string> = {
  han: '翻数',
  fu: '符',
  points: '点数',
};

function problemFromReview(item: ReviewItem): Problem {
  return {
    id: item.id,
    difficulty: 'standard',
    input: item.input,
    answer: item.answer,
    tags: item.tags,
    hint: {
      yaku: item.answer.yaku.map((hit) => hit.name),
      fu: item.answer.fuItems
        .map((fuItem) => `${fuItem.label} +${fuItem.fu}`)
        .join(' / '),
    },
  };
}

function difficultyDescription(difficulty: Difficulty): string {
  if (difficulty === 'beginner') return '門前・役 1〜2・ドラなし';
  if (difficulty === 'standard') return '副露 0〜1・立直・ドラ 0〜1';
  return '副露 0〜2・槓・本場・供託まで';
}

/** 翻数のチップ。4 択では出題時から、ステップでは翻の回答後に出す。 */
export function HanChip({ problem }: { problem: Problem }) {
  const { answer } = problem;
  if (answer.yakumanCount > 0) {
    return (
      <span
        data-testid="han-chip"
        className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold"
      >
        {answer.yakumanCount > 1
          ? `役満 ×${answer.yakumanCount}`
          : '役満'}
      </span>
    );
  }
  const breakdown =
    answer.doraHan > 0
      ? `役 ${answer.yakuHan} + ドラ ${answer.doraHan}`
      : `役 ${answer.yakuHan}`;
  return (
    <span
      data-testid="han-chip"
      className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] text-gold"
    >
      <span className="text-[9px] uppercase tracking-wide opacity-65">
        翻数
      </span>
      <span className="font-semibold">
        {answer.han}
        <span className="ml-1 font-normal">（{breakdown}）</span>
      </span>
    </span>
  );
}

export function PracticePage({
  settings,
  initialDifficulty,
  initialSeed,
  initialReview = false,
  onNavigateChart,
}: PracticePageProps) {
  const { recordAnswer, addReview, removeReview, review } = useAppData();

  const initialDifficultyValue = initialDifficulty ?? settings.defaultDifficulty;
  const seedRef = useRef<number>(
    initialSeed ?? ((Date.now() ^ 0x5f3759df) >>> 0),
  );
  const finishedRef = useRef(false);
  const resultPanelRef = useRef<HTMLElement>(null);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const problemCardRef = useRef<HTMLElement>(null);
  const shouldScrollToProblemRef = useRef(false);

  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialDifficultyValue,
  );
  const [reviewMode, setReviewMode] = useState(initialReview);
  const [problem, setProblem] = useState<Problem>(() => {
    if (initialReview && review.length > 0) return problemFromReview(review[0]);
    return generateProblem({
      difficulty: initialDifficultyValue,
      seed: seedRef.current,
    });
  });
  const [phase, setPhase] = useState<Phase>('answering');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepFeedback, setStepFeedback] = useState<{
    choice: PointChoice;
    correct: boolean;
  } | null>(null);
  const [stepMistake, setStepMistake] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewAdded, setReviewAdded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [session, setSession] = useState<SessionStats>(EMPTY_SESSION);
  const [justCorrect, setJustCorrect] = useState(false);

  const steps = useMemo<StepKey[]>(
    () =>
      problem.answer.yakumanCount > 0
        ? ['han', 'points']
        : ['han', 'fu', 'points'],
    [problem],
  );

  const stepChoices = useMemo(() => generateStepChoices(problem), [problem]);
  const pointChoices = useMemo(() => {
    if (settings.answerMode === 'step') return stepChoices.points;
    return generatePointChoices(problem);
  }, [problem, settings.answerMode, stepChoices]);

  const currentChoices = useMemo<PointChoice[]>(() => {
    if (settings.answerMode === 'choice') return pointChoices;
    const step = steps[stepIndex];
    if (!step) return [];
    return stepChoices[step];
  }, [settings.answerMode, pointChoices, stepChoices, stepIndex, steps]);

  const targetText = useMemo(() => {
    if (settings.answerMode === 'choice') return 'この手の点数は？';
    const step = steps[stepIndex];
    return `${STEP_LABELS[step] ?? ''}は？`;
  }, [settings.answerMode, stepIndex, steps]);

  const resetForProblem = (next: Problem) => {
    finishedRef.current = false;
    setProblem(next);
    setPhase('answering');
    setSelectedId(null);
    setResultCorrect(false);
    setStepIndex(0);
    setStepFeedback(null);
    setStepMistake(false);
    setShowHint(false);
    setReviewAdded(false);
    setJustCorrect(false);
  };

  const generateNextProblem = () => {
    let nextSeed = (seedRef.current + 1) >>> 0;
    let next = generateProblem({ difficulty, seed: nextSeed });
    let guard = 0;
    while (next.id === problem.id && guard < 50) {
      nextSeed = (nextSeed + 1) >>> 0;
      next = generateProblem({ difficulty, seed: nextSeed });
      guard += 1;
    }
    seedRef.current = nextSeed;
    resetForProblem(next);
  };

  const finish = (correct: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setResultCorrect(correct);
    setPhase('result');
    setSession((previous) => {
      const streak = correct ? previous.streak + 1 : 0;
      return {
        total: previous.total + 1,
        correct: previous.correct + (correct ? 1 : 0),
        streak,
        bestStreak: Math.max(previous.bestStreak, streak),
      };
    });
    setJustCorrect(correct);
    recordAnswer(problem, correct);
    if (!correct) {
      addReview(problem);
      setReviewAdded(true);
    } else if (reviewMode) {
      removeReview(problem.id);
    }
  };

  const choose = (choice: PointChoice) => {
    if (phase !== 'answering') return;
    if (settings.answerMode === 'choice') {
      setSelectedId(choice.id);
      finish(choice.correct);
      return;
    }

    if (stepFeedback) return;
    const correct = choice.correct;
    setSelectedId(choice.id);
    setStepFeedback({ choice, correct });
    if (!correct) setStepMistake(true);

    const isLast = stepIndex === steps.length - 1;
    if (isLast) {
      finish(!stepMistake && correct);
    }
  };

  const advanceStep = () => {
    if (!stepFeedback) return;
    setStepFeedback(null);
    setSelectedId(null);
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const next = () => {
    shouldScrollToProblemRef.current = true;
    if (reviewMode) {
      const remaining = review.filter((item) => item.id !== problem.id);
      if (remaining.length > 0) {
        resetForProblem(problemFromReview(remaining[0]));
        return;
      }
      setReviewMode(false);
      generateNextProblem();
      return;
    }
    generateNextProblem();
  };

  const changeDifficulty = (nextDifficulty: Difficulty) => {
    if (nextDifficulty === difficulty) return;
    shouldScrollToProblemRef.current = true;
    setDifficulty(nextDifficulty);
    setReviewMode(false);
    setSession(EMPTY_SESSION);
    let nextSeed = (seedRef.current + 1) >>> 0;
    let next = generateProblem({ difficulty: nextDifficulty, seed: nextSeed });
    if (next.id === problem.id) {
      nextSeed = (nextSeed + 1) >>> 0;
      next = generateProblem({ difficulty: nextDifficulty, seed: nextSeed });
    }
    seedRef.current = nextSeed;
    resetForProblem(next);
  };

  const manualAddReview = () => {
    addReview(problem);
    setReviewAdded(true);
  };

  const openChart = () => {
    onNavigateChart({
      fu: problem.answer.fu,
      han: problem.answer.han,
      dealer: problem.input.ctx.seatWind === 1,
      tsumo: problem.input.ctx.tsumo,
      yakumanCount: problem.answer.yakumanCount,
    });
  };

  // 採点結果が画面外に出ないよう、先頭へスクロールして見出しにフォーカスする。
  useEffect(() => {
    if (phase !== 'result') return;
    const behavior = settings.reduceMotion ? 'auto' : 'smooth';
    resultPanelRef.current?.scrollIntoView({ block: 'start', behavior });
    resultTitleRef.current?.focus({ preventScroll: true });
  }, [phase, settings.reduceMotion]);

  // 「次へ」のあとは次の問題カードの先頭へ戻す。
  useEffect(() => {
    if (phase !== 'answering' || !shouldScrollToProblemRef.current) return;
    shouldScrollToProblemRef.current = false;
    const behavior = settings.reduceMotion ? 'auto' : 'smooth';
    problemCardRef.current?.scrollIntoView({ block: 'start', behavior });
  }, [problem.id, phase, settings.reduceMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (event.key === 'Escape' && helpOpen) {
        setHelpOpen(false);
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }
      if (helpOpen) return;

      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        setShowHint((value) => !value);
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        if (phase === 'result' && !reviewAdded) {
          event.preventDefault();
          manualAddReview();
        }
        return;
      }
      if (event.key === 'Enter') {
        if (phase === 'result') {
          event.preventDefault();
          next();
          return;
        }
        if (settings.answerMode === 'step' && stepFeedback) {
          event.preventDefault();
          advanceStep();
        }
        return;
      }
      if (/^[1-4]$/.test(event.key) && phase === 'answering') {
        if (settings.answerMode === 'step' && stepFeedback) return;
        const index = Number(event.key) - 1;
        const choice = currentChoices[index];
        if (choice) {
          event.preventDefault();
          choose(choice);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const reviewEmpty = reviewMode && review.length === 0 && phase === 'answering';
  const accuracy = percent(session.correct, session.total);
  const currentStep = steps[stepIndex];
  const stepNumber = stepIndex + 1;
  const showHanChip =
    settings.answerMode === 'choice' ||
    stepIndex > 0 ||
    stepFeedback !== null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Practice"
        title="練習"
        description="実際の牌姿と場況から、翻・符・点数を回答します。まちがえた問題は自動で復習キューに入ります。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">
              {settings.answerMode === 'choice' ? '4 択' : 'ステップ'}
            </Badge>
            {reviewMode ? <Badge tone="gold">復習モード</Badge> : null}
          </div>
        }
      />

      <div className="card-dark flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-ivory-50/45">
            難易度
          </span>
          {(['beginner', 'standard', 'advanced'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeDifficulty(item)}
              aria-pressed={difficulty === item}
              className={[
                'rounded-[8px] border px-3 py-1.5 text-xs font-semibold transition-colors',
                difficulty === item
                  ? 'border-gold/60 bg-gold/15 text-gold'
                  : 'border-line text-ivory-50/60 hover:bg-ivory-50/5 hover:text-ivory-50',
              ].join(' ')}
              title={difficultyDescription(item)}
            >
              {difficultyLabel(item)}
            </button>
          ))}
          <span className="hidden text-[10px] text-ivory-50/40 sm:inline">
            {difficultyDescription(difficulty)}
          </span>
        </div>

        <dl className="flex items-center gap-4 sm:gap-5">
          <div>
            <dt className="text-[9px] uppercase tracking-wide text-ivory-50/45">
              問題
            </dt>
            <dd className="nums text-lg font-semibold text-ivory-50">
              {session.total}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wide text-ivory-50/45">
              正答率
            </dt>
            <dd className="nums text-lg font-semibold text-ivory-50">
              {accuracy}%
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wide text-ivory-50/45">
              連続
            </dt>
            <dd
              className={[
                'nums text-lg font-semibold',
                justCorrect && session.streak > 0
                  ? 'animate-pop text-gold'
                  : 'text-ivory-50',
              ].join(' ')}
            >
              {session.streak}
              <span className="ml-0.5 text-[10px] font-normal text-ivory-50/40">
                問
              </span>
            </dd>
          </div>
          <div className="hidden sm:block">
            <dt className="text-[9px] uppercase tracking-wide text-ivory-50/45">
              最高
            </dt>
            <dd className="nums text-lg font-semibold text-ivory-50/70">
              {session.bestStreak}
            </dd>
          </div>
        </dl>
      </div>

      {reviewEmpty ? (
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-jade/15 text-jade">
            <Icon name="check" className="h-6 w-6" />
          </span>
          <h2 className="mt-3 text-[17px] text-ink-900">復習キューは空です</h2>
          <p className="mt-1 text-[13px] text-ink-500">
            まちがえた問題がここにたまります。まずは通常の練習を続けましょう。
          </p>
          <Button
            tone="primary"
            className="mt-4"
            onClick={() => {
              shouldScrollToProblemRef.current = true;
              setReviewMode(false);
              generateNextProblem();
            }}
          >
            通常の練習へ
          </Button>
        </div>
      ) : (
        <>
          <section
            ref={problemCardRef}
            className="card scroll-mt-24 overflow-hidden desk:scroll-mt-6"
            aria-labelledby="problem-title"
            data-testid="problem-card"
            data-problem-id={problem.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-200 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <h2 id="problem-title" className="text-[15px] font-semibold">
                  第 {phase === 'result' ? session.total : session.total + 1} 問
                </h2>
                <Badge tone="neutral">
                  {difficultyLabel(problem.difficulty)}
                </Badge>
                {reviewMode ? <Badge tone="gold">復習</Badge> : null}
                {problem.answer.limit !== 'none' ? (
                  <Badge tone="gold">
                    {problem.answer.limit === 'yakuman'
                      ? '役満クラス'
                      : '満貫以上'}
                  </Badge>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="rounded-full border border-ivory-200 px-2.5 py-1 text-[10px] font-semibold text-ink-500 hover:bg-ivory-100"
                aria-label="キーボードヘルプを開く"
              >
                ? ヘルプ
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <SituationChips
                ctx={problem.input.ctx}
                concealed={problem.input.concealed}
                melds={problem.input.melds}
              />

              <div className="-mx-2 rounded-xl border border-ivory-200 bg-ivory-100/70 p-2 sm:mx-0 sm:p-4">
                <HandStage
                  concealed={problem.input.concealed}
                  melds={problem.input.melds}
                  winTile={problem.input.winTile}
                  doraIndicator={problem.input.ctx.doraIndicators[0]}
                  settings={settings}
                  separateWin
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-ink-900">
                    {targetText}
                  </p>
                  {showHanChip ? <HanChip problem={problem} /> : null}
                </div>
                <div className="flex items-center gap-2">
                  {settings.answerMode === 'step' ? (
                    <ol
                      className="flex items-center gap-1"
                      aria-label="回答ステップ"
                    >
                      {steps.map((step, index) => (
                        <li
                          key={step}
                          className={[
                            'rounded-full border px-2 py-0.5 text-[10px]',
                            index === stepIndex
                              ? 'border-vermilion bg-vermilion/10 font-semibold text-vermilion'
                              : index < stepIndex
                                ? 'border-jade/40 bg-jade/10 text-jade'
                                : 'border-ivory-200 text-ink-500',
                          ].join(' ')}
                        >
                          {STEP_LABELS[step]}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  <Button
                    tone="outline"
                    size="sm"
                    onClick={() => setShowHint((value) => !value)}
                    aria-expanded={showHint}
                    icon={<Icon name="hint" className="h-4 w-4" />}
                  >
                    ヒント <span className="text-[10px] opacity-60">H</span>
                  </Button>
                </div>
              </div>

              {showHint ? (
                <div className="animate-fade rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-[12px] leading-6 text-ink-700">
                  <p className="font-semibold text-ink-900">成立役のヒント</p>
                  <p>{problem.hint.yaku.join('・') || '—'}</p>
                  <p className="mt-1.5 font-semibold text-ink-900">
                    符のヒント
                  </p>
                  <p className="nums">{problem.hint.fu}</p>
                </div>
              ) : null}

              <div
                className={[
                  'grid gap-2',
                  settings.answerMode === 'choice'
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-2',
                ].join(' ')}
              >
                {currentChoices.map((choice, index) => {
                  const isSelected = selectedId === choice.id;
                  const reveal = phase === 'result' || Boolean(stepFeedback);
                  const showCorrect = reveal && choice.correct;
                  const showWrong = reveal && isSelected && !choice.correct;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      data-testid="choice"
                      data-correct={choice.correct ? 'true' : 'false'}
                      aria-label={`選択肢 ${index + 1}: ${choice.label}`}
                      aria-pressed={isSelected}
                      disabled={phase === 'result' || Boolean(stepFeedback)}
                      onClick={() => choose(choice)}
                      className={[
                        'flex min-h-[62px] items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors',
                        showCorrect
                          ? 'border-jade bg-jade/10 text-ink-900'
                          : showWrong
                            ? 'border-vermilion bg-vermilion/10 text-ink-900'
                            : 'border-ivory-200 bg-ivory-50 text-ink-900 hover:border-gold/60 hover:bg-gold/10',
                        'disabled:cursor-default',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                          showCorrect
                            ? 'border-jade bg-jade text-ivory-50'
                            : showWrong
                              ? 'border-vermilion bg-vermilion text-ivory-50'
                              : 'border-ivory-200 text-ink-500',
                        ].join(' ')}
                      >
                        {showCorrect ? (
                          <Icon name="check" className="h-4 w-4" />
                        ) : showWrong ? (
                          <Icon name="cross" className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="nums block text-[15px] font-semibold leading-tight">
                          {choice.label}
                        </span>
                        {reveal && choice.detail ? (
                          <span className="mt-0.5 block text-[10px] text-ink-500">
                            {choice.detail}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {settings.answerMode === 'step' &&
              stepFeedback &&
              phase !== 'result' ? (
                <div
                  role="status"
                  className={[
                    'flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-[12px]',
                    stepFeedback.correct
                      ? 'border-jade/40 bg-jade/10 text-jade'
                      : 'border-vermilion/40 bg-vermilion/10 text-vermilion',
                  ].join(' ')}
                >
                  <Icon
                    name={stepFeedback.correct ? 'check' : 'cross'}
                    className="h-4 w-4"
                  />
                  <span className="font-semibold">
                    {stepFeedback.correct ? '正解' : '不正解'}
                  </span>
                  <span className="text-ink-700">
                    {stepFeedback.correct
                      ? `${STEP_LABELS[currentStep]}は ${stepFeedback.choice.label}`
                      : `正しくは ${
                          currentStep === 'han'
                            ? formatHan(problem.answer.han)
                            : currentStep === 'fu'
                              ? formatFu(problem.answer.fu)
                              : (pointChoices.find((choice) => choice.correct)
                                  ?.label ?? '—')
                        }`}
                  </span>
                  {stepIndex < steps.length - 1 ? (
                    <Button
                      tone="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={advanceStep}
                    >
                      次のステップへ{' '}
                      <span className="text-[10px] opacity-60">Enter</span>
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {settings.answerMode === 'step' && !stepFeedback ? (
                <p className="text-right text-[10px] text-ink-500">
                  {stepNumber} / {steps.length} ステップ
                </p>
              ) : null}
            </div>
          </section>

          {phase === 'result' ? (
            <ResultPanel
              problem={problem}
              correct={resultCorrect}
              reviewAdded={reviewAdded}
              onNext={next}
              onChart={openChart}
              onAddReview={manualAddReview}
              panelRef={resultPanelRef}
              titleRef={resultTitleRef}
            />
          ) : (
            <p className="text-center text-[10px] text-ivory-50/35">
              1〜4 で選択 / H ヒント / ? ヘルプ
            </p>
          )}
        </>
      )}

      {helpOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-felt-900/75 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="card w-full max-w-md p-6 animate-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="help-title" className="text-[17px] text-ink-900">
                キーボード操作
              </h2>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-full p-1 text-ink-500 hover:bg-ivory-100"
                aria-label="ヘルプを閉じる"
              >
                <Icon name="cross" className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-[13px]">
              {[
                ['1 〜 4', '選択肢を選ぶ'],
                ['Enter', '次のステップへ / 次の問題へ'],
                ['H', 'ヒントの表示・非表示'],
                ['R', '結果画面で復習に追加'],
                ['?', 'このヘルプを開く・閉じる'],
              ].map(([key, description]) => (
                <div key={key} className="flex items-center gap-3">
                  <dt className="min-w-16 rounded-md border border-ivory-200 bg-ivory-100 px-2 py-0.5 text-center text-[11px] font-semibold text-ink-700">
                    {key}
                  </dt>
                  <dd className="text-ink-700">{description}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[11px] leading-5 text-ink-500">
              回答方式は設定画面で「4 択」と「ステップ」を切り替えられます。
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
