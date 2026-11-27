import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { Badge, Button, PageHeader, SectionTitle } from '../../components/ui';
import { formatDayKey, percent, todayKey } from '../../lib/format';
import { useAppData } from '../../lib/store';
import type { Settings } from '../../lib/storage';
import {
  DRILL_KINDS,
  type DrillKind,
  type DrillState,
} from '../../lib/srs';
import { DrillView } from './DrillView';
import { GuideView } from './GuideView';
import {
  DRILL_KIND_META,
  allDrillQuestions,
  buildDrillSession,
  drillPoolSummary,
  type DrillQuestion,
} from './drills';
import { GUIDE_SECTIONS, guideSectionById } from './guides';

type View = 'hub' | 'guide' | 'drill';

const KIND_ICONS: Record<DrillKind, IconName> = {
  score: 'chart',
  fu: 'target',
  han: 'yaku',
  payment: 'practice',
};

interface HashState {
  view?: View;
  sectionId?: string;
  kind?: DrillKind;
}

function readHashState(): HashState {
  if (typeof window === 'undefined') return {};
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  if (path.toLowerCase() !== 'memorize') return {};
  if (!query) return {};
  const params = new URLSearchParams(query);
  const guide = params.get('guide');
  if (guide && guideSectionById(guide)) {
    return { view: 'guide', sectionId: guide };
  }
  const drill = params.get('drill');
  if (drill) {
    const kind = (DRILL_KINDS as readonly string[]).includes(drill)
      ? (drill as DrillKind)
      : undefined;
    return { view: 'drill', kind };
  }
  return {};
}

function replaceHashSuffix(suffix = ''): void {
  if (typeof window === 'undefined') return;
  try {
    window.history.replaceState(null, '', `#/memorize${suffix}`);
  } catch {
    // 失敗しても画面内の遷移は続行する。
  }
}

function scrollTop(): void {
  if (typeof document === 'undefined') return;
  const scroller = document.querySelector('[data-scroll-root]');
  if (scroller && typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: 0, behavior: 'auto' });
}

function kindStats(state: DrillState, kind: DrillKind): {
  seen: number;
  total: number;
  correct: number;
  due: number;
} {
  let seen = 0;
  let total = 0;
  let correct = 0;
  let due = 0;
  const now = Date.now();
  for (const question of allDrillQuestions(kind)) {
    const card = state.cards[question.id];
    if (!card) continue;
    seen += 1;
    total += card.total;
    correct += card.correct;
    if (card.dueAt <= now) due += 1;
  }
  return { seen, total, correct, due };
}

function weakKind(state: DrillState): DrillKind | null {
  let weakest: { kind: DrillKind; accuracy: number; total: number } | null = null;
  for (const kind of DRILL_KINDS) {
    const stats = kindStats(state, kind);
    if (stats.total < 2) continue;
    const accuracy = stats.correct / stats.total;
    if (
      !weakest ||
      accuracy < weakest.accuracy ||
      (accuracy === weakest.accuracy && stats.total > weakest.total)
    ) {
      weakest = { kind, accuracy, total: stats.total };
    }
  }
  return weakest?.kind ?? null;
}

function CountTile({
  label,
  value,
  unit,
  tone = 'light',
}: {
  label: string;
  value: number | string;
  unit: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <div
      className={[
        'rounded-xl border px-3 py-2.5',
        tone === 'dark'
          ? 'border-line bg-felt-900/35'
          : 'border-ivory-200 bg-ivory-100/60',
      ].join(' ')}
    >
      <p
        className={[
          'text-[9px]',
          tone === 'dark' ? 'text-ivory-50/45' : 'text-ink-500',
        ].join(' ')}
      >
        {label}
      </p>
      <p
        className={[
          'nums text-[24px] font-semibold leading-8',
          tone === 'dark' ? 'text-ivory-50' : 'text-ink-900',
        ].join(' ')}
      >
        {value}
        <span
          className={[
            'ml-0.5 text-[10px] font-normal',
            tone === 'dark' ? 'text-ivory-50/45' : 'text-ink-500',
          ].join(' ')}
        >
          {unit}
        </span>
      </p>
    </div>
  );
}

interface Session {
  questions: DrillQuestion[];
  kind?: DrillKind;
  key: number;
}

export interface MemorizePageProps {
  settings: Settings;
  initialSectionId?: string;
}

export function MemorizePage({
  settings,
  initialSectionId,
}: MemorizePageProps) {
  const { drill } = useAppData();
  const hashState = useRef<HashState>(readHashState());
  const started = useRef(false);
  const sessionSeq = useRef(0);
  const [view, setView] = useState<View>(() => {
    if (initialSectionId) return 'guide';
    return hashState.current.view ?? 'hub';
  });
  const [sectionId, setSectionId] = useState<string>(
    () =>
      initialSectionId ??
      hashState.current.sectionId ??
      GUIDE_SECTIONS[0].id,
  );
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!initialSectionId) return;
    setSectionId(initialSectionId);
    setView('guide');
  }, [initialSectionId]);

  const now = Date.now();
  const pool = drillPoolSummary(drill, now);
  const today = drill.stats.byDay[todayKey()] ?? { total: 0, correct: 0 };
  const accuracy = percent(drill.stats.correct, drill.stats.total);
  const weak = weakKind(drill);

  const startDrill = useCallback(
    (kind?: DrillKind, excludeId?: string) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const questions = buildDrillSession(
        drill,
        kind,
        Date.now(),
        seed,
        undefined,
        excludeId,
      );
      sessionSeq.current += 1;
      setSession({ questions, kind, key: sessionSeq.current });
      setView('drill');
      replaceHashSuffix(kind ? `?drill=${kind}` : '?drill=today');
      scrollTop();
    },
    [drill],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (hashState.current.view === 'drill') {
      startDrill(hashState.current.kind);
    }
  }, [startDrill]);

  const openSection = useCallback((id: string) => {
    setSectionId(id);
    setView('guide');
    replaceHashSuffix(`?guide=${id}`);
    scrollTop();
  }, []);

  const backToHub = useCallback(() => {
    setView('hub');
    replaceHashSuffix();
    scrollTop();
  }, []);

  const section = guideSectionById(sectionId) ?? GUIDE_SECTIONS[0];
  const sectionIndex = GUIDE_SECTIONS.findIndex(
    (item) => item.id === section.id,
  );

  const header =
    view === 'guide'
      ? {
          eyebrow: 'Memorize',
          title: '覚え方ガイド',
          description:
            '1 セクション 3 分。読んだらミニ問題で手を動かし、最後はドリルで定着させます。',
        }
      : view === 'drill'
        ? {
            eyebrow: 'Drill',
            title: '暗記ドリル',
            description:
              '正解すると間隔が 1 → 3 → 7 → 14 → 30 日と伸びます。誤答は翌日に戻ります。',
          }
        : {
            eyebrow: 'Memorize',
            title: '覚え方',
            description:
              '「符だけ」「翻だけ」「点数表だけ」を切り出して反復するための画面です。6 つの読み物と 4 種類のドリルがあります。',
          };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        actions={
          view === 'hub' ? (
            <div className="flex items-center gap-2">
              <Badge tone="dark">ドリル {drill.stats.total} 問</Badge>
              <Badge tone="gold">正答率 {accuracy}%</Badge>
            </div>
          ) : null
        }
      />

      {view === 'guide' ? (
        <GuideView
          section={section}
          settings={settings}
          onBack={backToHub}
          onSelectSection={openSection}
          onPrev={() => {
            const previous = GUIDE_SECTIONS[sectionIndex - 1];
            if (previous) openSection(previous.id);
          }}
          onNext={() => {
            const following = GUIDE_SECTIONS[sectionIndex + 1];
            if (following) openSection(following.id);
          }}
          hasPrev={sectionIndex > 0}
          hasNext={sectionIndex >= 0 && sectionIndex < GUIDE_SECTIONS.length - 1}
        />
      ) : null}

      {view === 'drill' && session ? (
        <DrillView
          key={session.key}
          questions={session.questions}
          kind={session.kind}
          onExit={backToHub}
          onRestart={startDrill}
        />
      ) : null}

      {view === 'hub' ? (
        <div className="space-y-6">
          <section className="card-dark overflow-hidden">
            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
                  Today&apos;s drill
                </p>
                <h2 className="mt-2 text-[22px] leading-8 text-ivory-50">
                  今日のドリルを 10 問
                </h2>
                <p className="mt-2 max-w-xl text-[12px] leading-6 text-ivory-50/60">
                  期限が来たカード → 期限前の既習カード（最大 3 問） → 新規、の順に出題します。
                  1 問 30 秒を目標に、解説まで読んでください。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    tone="primary"
                    size="lg"
                    onClick={() => startDrill()}
                    icon={<Icon name="memorize" className="h-5 w-5" />}
                  >
                    10 問はじめる
                  </Button>
                  <Button
                    tone="ghost"
                    size="md"
                    onClick={() => openSection(GUIDE_SECTIONS[0].id)}
                    icon={<Icon name="book" className="h-4 w-4" />}
                  >
                    先に覚え方を読む
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 self-end">
                <CountTile
                  label="期限"
                  value={pool.due}
                  unit="問"
                  tone="dark"
                />
                <CountTile
                  label="既習"
                  value={pool.total - pool.fresh}
                  unit="問"
                  tone="dark"
                />
                <CountTile
                  label="新規"
                  value={pool.fresh}
                  unit="問"
                  tone="dark"
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="drill-list">
            <SectionTitle
              title="4 種類のドリル"
              hint="苦手な種類だけを選んで反復できます"
            />
            <div className="grid gap-3 sm:grid-cols-2 desk:grid-cols-4">
              {DRILL_KINDS.map((kind) => {
                const meta = DRILL_KIND_META[kind];
                const summary = drillPoolSummary(drill, now, kind);
                const stats = kindStats(drill, kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => startDrill(kind)}
                    className="card group flex flex-col p-4 text-left transition-transform hover:-translate-y-0.5"
                  >
                    <span className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-felt-700 text-ivory-50">
                        <Icon name={KIND_ICONS[kind]} className="h-4 w-4" />
                      </span>
                      <span className="nums text-[9px] text-ink-500">
                        期限 {summary.due}
                      </span>
                    </span>
                    <span className="mt-3 block font-serif text-[16px] font-semibold leading-6 text-ink-900">
                      {meta.name}
                    </span>
                    <span className="mt-1 block flex-1 text-[11px] leading-5 text-ink-500">
                      {meta.description}
                    </span>
                    <span className="mt-3 flex items-center justify-between border-t border-ivory-200 pt-2">
                      <span className="nums text-[9px] text-ink-500">
                        既習 {stats.seen} 問
                        {stats.total > 0
                          ? `・${percent(stats.correct, stats.total)}%`
                          : ''}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-vermilion">
                        はじめる
                        <Icon
                          name="arrow"
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="guide-list">
            <SectionTitle
              title="覚え方ガイド"
              hint="1 セクション 3 分・全 6 セクション"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {GUIDE_SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSection(item.id)}
                  className="card group flex items-start gap-3 p-4 text-left transition-transform hover:-translate-y-0.5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-[12px] font-bold text-ink-900"
                  >
                    {item.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-[16px] font-semibold leading-6 text-ink-900">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-5 text-ink-500">
                      {item.subtitle}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="rounded-full bg-ivory-100 px-2 py-0.5 text-[9px] text-ink-500">
                        約 {item.minutes} 分
                      </span>
                      {item.checks && item.checks.length > 0 ? (
                        <span className="rounded-full bg-jade/15 px-2 py-0.5 text-[9px] font-semibold text-jade">
                          ミニ問題 {item.checks.length} 問
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <Icon
                    name="arrow"
                    className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] text-ink-900">ドリル成績</h2>
                <span className="nums text-[10px] text-ink-500">
                  正答率 {accuracy}%
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2">
                <CountTile label="出題" value={drill.stats.total} unit="問" />
                <CountTile label="正解" value={drill.stats.correct} unit="問" />
                <CountTile label="連続" value={drill.stats.streak} unit="問" />
                <CountTile
                  label="最高"
                  value={drill.stats.bestStreak}
                  unit="問"
                />
              </dl>
              <div className="mt-4 space-y-1.5">
                {DRILL_KINDS.map((kind) => {
                  const stats = kindStats(drill, kind);
                  return (
                    <div
                      key={kind}
                      className="flex items-center gap-2 rounded-lg border border-ivory-200 bg-ivory-100/50 px-2.5 py-1.5"
                    >
                      <span className="min-w-0 flex-1 text-[11px] font-semibold text-ink-900">
                        {DRILL_KIND_META[kind].name}
                      </span>
                      <span className="nums text-[10px] text-ink-500">
                        {stats.correct} / {stats.total}
                      </span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ivory-200">
                        <span
                          className="block h-full rounded-full bg-jade"
                          style={{
                            width: `${percent(stats.correct, stats.total)}%`,
                          }}
                        />
                      </span>
                      <span className="nums w-8 text-right text-[10px] text-ink-700">
                        {stats.total > 0
                          ? `${percent(stats.correct, stats.total)}%`
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] text-ink-900">今日と復習の予定</h2>
                <span className="nums text-[10px] text-ink-500">
                  {formatDayKey(todayKey())}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <CountTile label="今日" value={today.total} unit="問" />
                <CountTile
                  label="今日の正答率"
                  value={percent(today.correct, today.total)}
                  unit="%"
                />
                <CountTile
                  label="期限"
                  value={pool.due}
                  unit="問"
                />
              </div>
              <p className="mt-3 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] leading-6 text-ink-700">
                復習の間隔は 1 → 3 → 7 → 14 → 30 日。正解で 1 段階上がり、
                誤答で 0 に戻ります。期限が来たカードは、どのドリルからでも優先して出ます。
              </p>
              {weak ? (
                <button
                  type="button"
                  onClick={() => startDrill(weak)}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg border border-vermilion/35 bg-vermilion/10 px-3 py-2 text-left"
                >
                  <Icon
                    name="hint"
                    className="h-4 w-4 shrink-0 text-vermilion"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-ink-900">
                      いまの苦手: {DRILL_KIND_META[weak].name}
                    </span>
                    <span className="block text-[10px] text-ink-500">
                      この種類だけを 10 問
                    </span>
                  </span>
                  <Icon name="arrow" className="h-4 w-4 text-vermilion" />
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
