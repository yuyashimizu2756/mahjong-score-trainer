import { useState } from 'react';
import { useAppData } from '../../lib/store';
import {
  SCHEMA_VERSION,
  type DisplayMode,
} from '../../lib/storage';
import { Tile } from '../../components/Tile';
import { Icon } from '../../components/Icon';
import {
  Badge,
  Button,
  ConfirmDialog,
  PageHeader,
  Switch,
} from '../../components/ui';

const DIFFICULTIES = [
  { id: 'beginner' as const, label: '入門', note: '門前・役 1〜2・ドラなし' },
  {
    id: 'standard' as const,
    label: '標準',
    note: '副露 0〜1・立直・ドラ 0〜1',
  },
  {
    id: 'advanced' as const,
    label: '上級',
    note: '副露 0〜2・槓・本場・供託',
  },
];

const TILE_SIZES = [
  { id: 'sm' as const, label: '小', note: '32 × 45' },
  { id: 'md' as const, label: '中', note: '44 × 62' },
  { id: 'lg' as const, label: '大', note: '58 × 80' },
];

const DISPLAY_MODE_CARDS: Array<{
  id: DisplayMode;
  title: string;
  body: string;
}> = [
  {
    id: '2d',
    title: '2D',
    body: '軽量で読みやすい。手牌を傾けずに正面から表示します。',
  },
  {
    id: 'css3d',
    title: 'CSS 3D',
    body: '既定。perspective で卓に置いたように傾けます。WebGL 不要。',
  },
  {
    id: 'three',
    title: 'リアル 3D',
    body: 'Three.js の牌卓。ドラッグで視点を動かせます。WebGL が必要です。',
  },
];

/** 設定画面のモード選択カードに置く小さなプレビュー。 */
function DisplayModePreview({ mode }: { mode: DisplayMode }) {
  const tiles = (
    <>
      <Tile
        tile={{ suit: 'm', rank: 2 }}
        size="sm"
        showSuitMark={false}
        className="mode-preview-tile"
      />
      <Tile
        tile={{ suit: 'p', rank: 5 }}
        size="sm"
        showSuitMark={false}
        className="mode-preview-tile"
      />
      <Tile
        tile={{ suit: 'z', rank: 7 }}
        size="sm"
        showSuitMark={false}
        className="mode-preview-tile"
      />
    </>
  );

  if (mode === 'three') {
    return (
      <span
        aria-hidden="true"
        data-testid="display-mode-preview"
        data-preview="three"
        className="mode-preview mode-preview--three"
      >
        <span className="mode-preview-3d">{tiles}</span>
      </span>
    );
  }

  if (mode === 'css3d') {
    return (
      <span
        aria-hidden="true"
        data-testid="display-mode-preview"
        data-preview="css3d"
        className="mode-preview mode-preview--css3d"
      >
        <span className="mode-preview-plane">{tiles}</span>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      data-testid="display-mode-preview"
      data-preview="2d"
      className="mode-preview mode-preview--2d"
    >
      {tiles}
    </span>
  );
}

const RULE_POINTS = [
  '和了は「4 面子 + 1 雀頭」「七対子」「国士無双」のいずれか。',
  '役が 1 つもない手（ドラのみ）は和了できない。',
  '喰い下がり: 三色・一気・混全は 2→1、純全は 3→2、混一は 3→2、清一は 6→5。',
  '平和ツモは 20 符、平和ロンは 30 符、喰い平和形ロンは 20→30 符。',
  'ロンで完成した刻子は明刻として扱う（符・三暗刻）。',
  '連風牌の雀頭は +2 符（+4 にはしない）。',
  '5 翻以上、または基本点 2,000 以上は満貫。13 翻以上は数え役満。',
  '本場はロン +300 / ツモ各 +100、供託リーチ棒は 1 本 1,000 点。',
];

export function SettingsPage() {
  const {
    settings,
    updateSettings,
    stats,
    review,
    learn,
    drill,
    resetStats,
    clearAll,
  } = useAppData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const completedLessons = Object.values(learn.lessons).filter(
    (lesson) => lesson.completed,
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="設定"
        description="回答方式・出題の既定値・表示を変更できます。設定と学習データはこのブラウザの localStorage にのみ保存されます。"
        actions={<Badge tone="dark">schema {SCHEMA_VERSION}</Badge>}
      />

      <section className="card p-5">
        <h2 className="text-[17px] text-ink-900">回答方式</h2>
        <p className="mt-1 text-[12px] leading-6 text-ink-500">
          練習の回答 UI を切り替えます。あとから練習画面で難易度だけ変更することもできます。
        </p>
        <div
          role="group"
          aria-label="回答方式"
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          {[
            {
              id: 'choice' as const,
              title: '4 択',
              body: '「この手の点数は？」に 1 回で回答。近い誤答が並びます。',
            },
            {
              id: 'step' as const,
              title: 'ステップ',
              body: '翻 → 符 → 点数の順に回答。各段で即時フィードバック。',
            },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => updateSettings({ answerMode: mode.id })}
              aria-pressed={settings.answerMode === mode.id}
              className={[
                'rounded-xl border p-3 text-left transition-colors',
                settings.answerMode === mode.id
                  ? 'border-vermilion bg-vermilion/10'
                  : 'border-ivory-200 bg-ivory-100/40 hover:border-gold/50',
              ].join(' ')}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-900">
                  {mode.title}
                </span>
                {settings.answerMode === mode.id ? (
                  <Icon name="check" className="h-4 w-4 text-vermilion" />
                ) : null}
              </span>
              <span className="mt-1 block text-[11px] leading-5 text-ink-500">
                {mode.body}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-[17px] text-ink-900">出題</h2>
        <p className="mt-1 text-[12px] leading-6 text-ink-500">
          練習を開いたときの既定の難易度です。
        </p>
        <div
          role="group"
          aria-label="既定の難易度"
          className="mt-3 grid gap-2 sm:grid-cols-3"
        >
          {DIFFICULTIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateSettings({ defaultDifficulty: item.id })}
              aria-pressed={settings.defaultDifficulty === item.id}
              className={[
                'rounded-xl border p-3 text-left transition-colors',
                settings.defaultDifficulty === item.id
                  ? 'border-gold bg-gold/10'
                  : 'border-ivory-200 bg-ivory-100/40 hover:border-gold/50',
              ].join(' ')}
            >
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
                {settings.defaultDifficulty === item.id ? (
                  <Icon name="check" className="h-4 w-4 text-gold" />
                ) : null}
                {item.label}
              </span>
              <span className="mt-1 block text-[10px] leading-5 text-ink-500">
                {item.note}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-[17px] text-ink-900">表示モード</h2>
        <p className="mt-1 text-[12px] leading-6 text-ink-500">
          練習の出題カードの手牌だけを 3D で表示します。回答ボタン・解説・結果は 2D のままです。切り替えは即時反映・保存されます。
        </p>
        <div
          role="group"
          aria-label="手牌の表示モード"
          className="mt-3 grid gap-2 sm:grid-cols-3"
        >
          {DISPLAY_MODE_CARDS.map((mode) => (
            <button
              key={mode.id}
              type="button"
              data-testid="display-mode-card"
              data-mode={mode.id}
              onClick={() => updateSettings({ displayMode: mode.id })}
              aria-pressed={settings.displayMode === mode.id}
              className={[
                'rounded-xl border p-2.5 text-left transition-colors',
                settings.displayMode === mode.id
                  ? 'border-vermilion bg-vermilion/10'
                  : 'border-ivory-200 bg-ivory-100/40 hover:border-gold/50',
              ].join(' ')}
            >
              <DisplayModePreview mode={mode.id} />
              <span className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-900">
                  {mode.title}
                </span>
                {settings.displayMode === mode.id ? (
                  <Icon name="check" className="h-4 w-4 text-vermilion" />
                ) : null}
              </span>
              <span className="mt-0.5 block text-[10px] leading-5 text-ink-500">
                {mode.body}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-5 text-ink-500">
          WebGL が使えない環境、または 3D の読み込みに失敗した場合は、自動で CSS 3D に切り替わります。
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-[17px] text-ink-900">表示</h2>
        <p className="mt-1 text-[12px] leading-6 text-ink-500">
          牌の大きさと、色に頼らない表示を設定します。
        </p>
        <div
          role="group"
          aria-label="牌のサイズ"
          className="mt-3 grid grid-cols-3 gap-2"
        >
          {TILE_SIZES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateSettings({ tileSize: item.id })}
              aria-pressed={settings.tileSize === item.id}
              className={[
                'flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors',
                settings.tileSize === item.id
                  ? 'border-gold bg-gold/10'
                  : 'border-ivory-200 bg-ivory-100/40 hover:border-gold/50',
              ].join(' ')}
            >
              <Tile
                tile={{ suit: 'm', rank: 5 }}
                size={item.id}
                showSuitMark={settings.colorBlindSuits}
              />
              <span className="text-[11px] font-semibold text-ink-900">
                {item.label}
                <span className="ml-1 text-[9px] font-normal text-ink-500">
                  {item.note}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 divide-y divide-ivory-200">
          <Switch
            checked={settings.colorBlindSuits}
            onChange={(checked) => updateSettings({ colorBlindSuits: checked })}
            label="スート記号を常時表示"
            description="萬・筒・索の記号を牌に添え、色だけに頼らず判別できるようにします。"
          />
          <Switch
            checked={settings.reduceMotion}
            onChange={(checked) => updateSettings({ reduceMotion: checked })}
            label="アニメーションを低減"
            description="結果パネルのフェードや連続正解の動きを止めます。"
          />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-[17px] text-ink-900">データ</h2>
        <p className="mt-1 text-[12px] leading-6 text-ink-500">
          保存先はこのブラウザの localStorage（キー: <code>mst:v1:*</code>
          ）のみです。サーバーには送信しません。
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['出題数', `${stats.total}`],
            [
              '正答率',
              stats.total > 0
                ? `${Math.round((stats.correct / stats.total) * 100)}%`
                : '—',
            ],
            ['復習キュー', `${review.length}`],
            ['完了レッスン', `${completedLessons} / 6`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-ivory-200 bg-ivory-100/50 px-3 py-2"
            >
              <dt className="text-[10px] text-ink-500">{label}</dt>
              <dd className="nums text-[15px] font-semibold text-ink-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[10px] leading-5 text-ink-500">
          暗記ドリル: {drill.stats.total} 問 / 正答率{' '}
          {drill.stats.total > 0
            ? `${Math.round((drill.stats.correct / drill.stats.total) * 100)}%`
            : '—'}
          （{Object.keys(drill.cards).length} 枚のカード）
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            tone="danger"
            size="sm"
            onClick={() => setConfirmReset(true)}
            icon={<Icon name="refresh" className="h-4 w-4" />}
          >
            成績と復習をリセット
          </Button>
          <Button
            tone="danger"
            size="sm"
            onClick={() => setConfirmClear(true)}
            icon={<Icon name="trash" className="h-4 w-4" />}
          >
            全データを削除
          </Button>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-ink-500">
          「成績と復習をリセット」は設定と学習の完了状態を残します。「全データを削除」は設定・成績・復習・学習・暗記ドリルをすべて初期化します。
        </p>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px] text-ink-900">ルールの前提</h2>
          <Badge tone="neutral">関東標準</Badge>
        </div>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {RULE_POINTS.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-[11px] leading-6 text-ink-700"
            >
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion"
              />
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-ivory-200 pt-3 text-[10px] leading-5 text-ink-500">
          正式な採点ルールは docs/RULES.md に従います。天和・地和・人和・流し満貫はこのアプリでは判定・出題しません。効果音は実装していません。
        </p>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="成績と復習をリセットしますか？"
        description="通算成績・日別成績・役別成績・復習キュー・暗記ドリルの習熟度と成績を削除します。設定と学習の完了状態は残ります。この操作は取り消せません。"
        confirmLabel="リセットする"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetStats();
          setConfirmReset(false);
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        title="すべてのデータを削除しますか？"
        description="設定・成績・復習キュー・学習の完了状態・暗記ドリルの習熟度をすべて削除し、初期状態に戻します。この操作は取り消せません。"
        confirmLabel="すべて削除する"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAll();
          setConfirmClear(false);
        }}
      />
    </div>
  );
}
