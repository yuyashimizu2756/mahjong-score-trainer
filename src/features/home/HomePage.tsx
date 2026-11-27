import type { Difficulty } from '../../engine/types';
import { useAppData } from '../../lib/store';
import {
  todayKey,
  formatDayKey,
  formatNumber,
  percent,
} from '../../lib/format';
import { nextIncompleteLesson, LESSONS } from '../../data/lessons';
import { yakuById } from '../../data/yaku';
import { Icon } from '../../components/Icon';
import { Badge, Button, ProgressBar, SectionTitle } from '../../components/ui';

export interface HomePageProps {
  onStartPractice: (options?: {
    difficulty?: Difficulty;
    review?: boolean;
  }) => void;
  onNavigateLearn: (lessonId?: string) => void;
  onNavigateYaku: () => void;
  onNavigateChart: () => void;
}

export function HomePage({
  onStartPractice,
  onNavigateLearn,
  onNavigateYaku,
  onNavigateChart,
}: HomePageProps) {
  const { settings, stats, review, learn } = useAppData();
  const day = stats.byDay[todayKey()] ?? { total: 0, correct: 0 };
  const dayAccuracy = percent(day.correct, day.total);
  const totalAccuracy = percent(stats.correct, stats.total);
  const completed = LESSONS.filter(
    (lesson) => learn.lessons[lesson.id]?.completed,
  );
  const nextLesson = nextIncompleteLesson(learn.lessons);
  const isFirstRun = stats.total === 0 && completed.length === 0;

  const weak = Object.entries(stats.byYaku)
    .filter(([, record]) => record.total >= 2)
    .map(([id, record]) => ({
      id,
      record,
      accuracy: Math.round((record.correct / record.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((item) => ({ ...item, entry: yakuById(item.id) }))
    .filter((item) => item.entry);

  return (
    <div className="space-y-6">
      <section className="card-dark overflow-hidden">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
              Riichi Mahjong Score Trainer
            </p>
            <h1 className="mt-2 text-[30px] leading-[42px] text-ivory-50 sm:text-[34px] sm:leading-[48px]">
              点数計算を、
              <br />
              理解して反復して身につける。
            </h1>
            <p className="mt-3 max-w-xl text-[13px] leading-7 text-ivory-50/65">
              役 → 翻 → 符 → 点数の流れを、実際の牌姿と場況で練習できます。
              1 問 30 秒の反復と、その場で分解して見せる解説で、迷わない計算を目指します。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                tone="primary"
                size="lg"
                onClick={() =>
                  onStartPractice({ difficulty: settings.defaultDifficulty })
                }
                icon={<Icon name="practice" className="h-5 w-5" />}
              >
                練習をはじめる
              </Button>
              <Button
                tone="ghost"
                size="lg"
                onClick={() => onNavigateLearn(nextLesson.id)}
                icon={<Icon name="learn" className="h-5 w-5" />}
              >
                学習の流れを見る
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 self-end lg:grid-cols-1 lg:gap-2.5">
            {[
              ['今日', `${day.total}`, '問'],
              ['通算', `${stats.total}`, '問'],
              ['連続', `${stats.streak}`, '問'],
            ].map(([label, value, unit]) => (
              <div
                key={label}
                className="rounded-xl border border-line bg-felt-900/35 px-3 py-2.5"
              >
                <p className="text-[9px] uppercase tracking-wide text-ivory-50/45">
                  {label}
                </p>
                <p className="nums text-2xl font-semibold text-ivory-50">
                  {formatNumber(Number(value))}
                  <span className="ml-0.5 text-[10px] font-normal text-ivory-50/45">
                    {unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isFirstRun ? (
        <section className="card flex flex-col gap-4 border-gold/40 p-5 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Icon name="book" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] text-ink-900">まずは学習から</h2>
            <p className="mt-0.5 text-[12px] leading-6 text-ink-500">
              点数計算は「役 → 翻 → 符 → 点数」の 4
              手順。最初のレッスンで全体像をつかんでから、練習に進むのがおすすめです。
            </p>
          </div>
          <Button
            tone="gold"
            size="md"
            className="shrink-0 sm:ml-auto"
            onClick={() => onNavigateLearn('basics')}
            icon={<Icon name="arrow" className="h-4 w-4" />}
          >
            レッスン 1 へ
          </Button>
        </section>
      ) : null}

      <section aria-labelledby="main-actions">
        <h2 id="main-actions" className="sr-only">
          主要メニュー
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              onStartPractice({ difficulty: settings.defaultDifficulty })
            }
            className="group flex flex-col rounded-2xl border border-vermilion/40 bg-vermilion p-5 text-left text-ivory-50 shadow-[0_16px_40px_-24px_rgba(201,79,61,0.9)] transition-transform hover:-translate-y-0.5"
          >
            <span className="flex items-center justify-between">
              <Icon name="practice" className="h-6 w-6 text-ivory-50/85" />
              <Icon
                name="arrow"
                className="h-5 w-5 text-ivory-50/60 transition-transform group-hover:translate-x-0.5"
              />
            </span>
            <span className="mt-4 block font-serif text-[19px] font-semibold">
              練習をはじめる
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-ivory-50/75">
              {settings.answerMode === 'choice' ? '4 択' : 'ステップ'}・
              {settings.defaultDifficulty === 'beginner'
                ? '入門'
                : settings.defaultDifficulty === 'standard'
                  ? '標準'
                  : '上級'}
              の問題から
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateLearn(nextLesson.id)}
            className="group flex flex-col rounded-2xl border border-ivory-200 bg-ivory-50 p-5 text-left text-ink-900 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5"
          >
            <span className="flex items-center justify-between">
              <Icon name="learn" className="h-6 w-6 text-ink-500" />
              <span className="text-[10px] font-semibold text-ink-500">
                {completed.length} / {LESSONS.length} 完了
              </span>
            </span>
            <span className="mt-4 block font-serif text-[19px] font-semibold">
              {completed.length === LESSONS.length
                ? '学習を見直す'
                : '続きから学習'}
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-ink-500">
              {completed.length === LESSONS.length
                ? '全レッスン完了。総合チェックへ'
                : `Lesson ${nextLesson.number} ${nextLesson.title}`}
            </span>
          </button>

          <button
            type="button"
            disabled={review.length === 0}
            onClick={() => onStartPractice({ review: true })}
            className={[
              'group flex flex-col rounded-2xl border p-5 text-left transition-transform',
              review.length > 0
                ? 'border-gold/50 bg-gold/10 text-ivory-50 hover:-translate-y-0.5'
                : 'cursor-not-allowed border-line bg-ivory-50/5 text-ivory-50/40',
            ].join(' ')}
          >
            <span className="flex items-center justify-between">
              <Icon
                name="book"
                className={review.length > 0 ? 'h-6 w-6 text-gold' : 'h-6 w-6'}
              />
              <span className="nums text-[11px] font-semibold">
                {review.length} 問
              </span>
            </span>
            <span className="mt-4 block font-serif text-[19px] font-semibold">
              復習 {review.length} 問
            </span>
            <span className="mt-1 block text-[11px] leading-5 opacity-70">
              {review.length > 0
                ? 'まちがえた問題をやり直す'
                : 'まちがえるとここにたまります'}
            </span>
          </button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] text-ink-900">今日の成績</h2>
            <span className="nums text-[10px] text-ink-500">
              {formatDayKey(todayKey())}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {[
              ['出題', `${day.total}`, '問'],
              ['正答率', `${dayAccuracy}`, '%'],
              ['連続', `${stats.streak}`, '問'],
            ].map(([label, value, unit]) => (
              <div key={label}>
                <dt className="text-[9px] text-ink-500">{label}</dt>
                <dd className="nums text-[26px] font-semibold leading-8 text-ink-900">
                  {value}
                  <span className="ml-0.5 text-[9px] font-normal text-ink-500">
                    {unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 border-t border-ivory-200 pt-2 text-[10px] text-ink-500">
            最高連続 {stats.bestStreak} 問 / 通算正答率 {totalAccuracy}%（
            {stats.correct} / {stats.total}）
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] text-ink-900">学習進捗</h2>
            <span className="nums text-[10px] text-ink-500">
              {completed.length} / {LESSONS.length}
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar
              value={completed.length}
              max={LESSONS.length}
              label="完了したレッスン"
            />
          </div>
          <ul className="mt-3 space-y-1">
            {LESSONS.map((lesson) => {
              const done = learn.lessons[lesson.id]?.completed;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => onNavigateLearn(lesson.id)}
                    className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[11px] text-ink-700 hover:bg-ivory-100"
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px]',
                        done
                          ? 'border-jade bg-jade text-ivory-50'
                          : 'border-ivory-200 text-ink-500',
                      ].join(' ')}
                    >
                      {done ? (
                        <Icon name="check" className="h-2.5 w-2.5" />
                      ) : (
                        lesson.number
                      )}
                    </span>
                    <span className="truncate">{lesson.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] text-ink-900">苦手役 Top3</h2>
            <button
              type="button"
              onClick={onNavigateYaku}
              className="text-[10px] font-semibold text-vermilion hover:underline"
            >
              役一覧へ
            </button>
          </div>
          {weak.length === 0 ? (
            <p className="mt-4 text-[11px] leading-6 text-ink-500">
              まだ十分な練習データがありません。2
              問以上解くと、正答率の低い役がここに表示されます。
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {weak.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-ivory-200 bg-ivory-100/50 px-2.5 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink-900">
                      {item.entry?.name}
                    </span>
                    <span className="nums block text-[9px] text-ink-500">
                      {item.record.correct} / {item.record.total} 正解
                    </span>
                  </span>
                  <Badge tone={item.accuracy < 40 ? 'vermilion' : 'neutral'}>
                    {item.accuracy}%
                  </Badge>
                  <button
                    type="button"
                    onClick={() =>
                      onStartPractice({ difficulty: 'standard' })
                    }
                    className="shrink-0 rounded-md border border-ivory-200 px-1.5 py-1 text-[9px] font-semibold text-ink-700 hover:bg-ivory-50"
                  >
                    練習
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="card-dark flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionTitle title="点数表と役一覧" hint="迷ったときの確認用" />
          <p className="text-[11px] leading-6 text-ivory-50/55">
            子/親 × ツモ/ロン × 符 × 翻の早見表と、全 42
            役の条件・例をいつでも確認できます。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            tone="ghost"
            size="sm"
            onClick={onNavigateChart}
            icon={<Icon name="chart" className="h-4 w-4" />}
          >
            点数表
          </Button>
          <Button
            tone="ghost"
            size="sm"
            onClick={onNavigateYaku}
            icon={<Icon name="yaku" className="h-4 w-4" />}
          >
            役一覧
          </Button>
        </div>
      </section>
    </div>
  );
}
