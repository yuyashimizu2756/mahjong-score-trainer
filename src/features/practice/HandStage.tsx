import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Meld, Tile } from '../../engine/types';
import type { Settings } from '../../lib/storage';
import { Hand } from '../../components/Hand';
import { shouldFallbackToCss3d } from './scene/framing';
import { describeHand, tileJaLabel } from './scene/handText';
import { isWebGLAvailable } from './scene/webgl';

/**
 * 練習の出題カードの手牌だけを 2D / CSS 3D / Three.js で描き分ける。
 * 回答ボタン・解説・結果パネルは常に 2D の DOM のまま。
 *
 * `lazy` の import は Three.js を選んだときだけ評価される。jsdom や WebGL 非対応
 * 環境では `isWebGLAvailable()` が false になり、Three.js は読み込まれない。
 */
const LazyThreeHand = lazy(() => import('./scene/ThreeHand'));

export interface HandStageProps {
  concealed: readonly Tile[];
  melds?: readonly Meld[];
  winTile?: Tile;
  doraIndicator?: Tile;
  settings: Settings;
}

const MODE_LABEL: Record<Settings['displayMode'], string> = {
  '2d': '2D',
  css3d: 'CSS 3D',
  three: 'リアル 3D',
};

interface BoundaryProps {
  children: ReactNode;
  onError: () => void;
}

/** Three.js の読み込み・描画で例外が出たら CSS 3D に戻すための境界。 */
class SceneBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function HandStage({
  concealed,
  melds = [],
  winTile,
  doraIndicator,
  settings,
}: HandStageProps) {
  const requested = settings.displayMode;
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : Math.max(0, window.innerWidth - 48),
  );
  const [stageHeight, setStageHeight] = useState(200);
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const [failed, setFailed] = useState(false);

  // 3D はステージの幅で段数・読みやすさが変わる。幅を測ってフォールバックを判定する。
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => {
      const width =
        element.clientWidth ||
        (typeof window !== 'undefined' ? window.innerWidth - 48 : 0);
      const height = element.clientHeight || 200;
      setStageWidth((previous) => (previous === width ? previous : width));
      setStageHeight((previous) => (previous === height ? previous : height));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 表示モードを切り替えたら、もう一度 Three.js を試せるようにする。
  useEffect(() => {
    setFailed(false);
  }, [requested]);

  const smallStage =
    requested === 'three' &&
    shouldFallbackToCss3d(stageWidth, stageHeight || 200);

  const fallbackReason: 'unsupported' | 'error' | 'small' | null =
    requested !== 'three'
      ? null
      : smallStage
        ? 'small'
        : !webgl
          ? 'unsupported'
          : failed
            ? 'error'
            : null;
  const effective: Settings['displayMode'] =
    requested === 'three' && fallbackReason ? 'css3d' : requested;

  const hand = (
    <Hand
      concealed={concealed}
      melds={melds}
      winTile={winTile}
      size={settings.tileSize}
      showSuitMark={settings.colorBlindSuits}
    />
  );

  const css3d = (
    <div
      className="hand-3d-stage"
      data-testid="hand-3d-stage"
      data-reduce-motion={settings.reduceMotion ? 'true' : 'false'}
    >
      <div className="hand-3d-plane">{hand}</div>
    </div>
  );

  return (
    <div
      ref={stageRef}
      className="hand-stage"
      data-testid="hand-stage"
      data-hand-mode={effective}
      data-hand-requested={requested}
    >
      <div className="hand-stage-head">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          手牌
        </span>
        <span
          className="rounded-full border border-ivory-200 bg-ivory-100 px-2 py-0.5 text-[9px] font-semibold text-ink-500"
          data-testid="hand-mode-label"
        >
          {MODE_LABEL[effective]}
        </span>
      </div>

      {effective === '2d' ? <div data-testid="hand-2d">{hand}</div> : null}

      {effective === 'css3d' ? css3d : null}

      {effective === 'three' ? (
        <div className="three-stage" data-testid="three-stage">
          <p className="sr-only" data-testid="hand-description">
            {describeHand(concealed, melds, winTile)}
          </p>
          <Suspense fallback={css3d}>
            <SceneBoundary onError={() => setFailed(true)}>
              <LazyThreeHand
                concealed={concealed}
                melds={melds}
                winTile={winTile}
                doraIndicator={doraIndicator}
                onFallback={() => setFailed(true)}
              />
            </SceneBoundary>
          </Suspense>
          {winTile ? (
            <p className="three-win-note" data-testid="three-win-note">
              <span aria-hidden="true" className="three-win-dot" />
              和了牌: {tileJaLabel(winTile)}
            </p>
          ) : null}
        </div>
      ) : null}

      {fallbackReason ? (
        <p
          className="hand-fallback"
          data-testid="hand-fallback"
          role="status"
        >
          {fallbackReason === 'unsupported'
            ? 'この環境では WebGL が使えないため、CSS 3D で表示しています。'
            : fallbackReason === 'small'
              ? 'リアル 3D はデスクトップ推奨です。画面が狭いため CSS 3D で表示しています。'
              : '3D の表示に失敗したため、CSS 3D に切り替えました。'}
        </p>
      ) : null}
    </div>
  );
}
