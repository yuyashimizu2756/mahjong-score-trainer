import { useEffect, useMemo, useRef, useState } from 'react';
import type { Meld, Tile } from '../../../engine/types';
import { columnsFor } from './framing';
import { layoutHand } from './layout';
import { createHandScene, type HandScene } from './three-hand';

export interface ThreeHandProps {
  concealed: readonly Tile[];
  melds?: readonly Meld[];
  winTile?: Tile;
  doraIndicator?: Tile;
  /** WebGL の初期化に失敗したとき（CSS 3D へ戻す）。 */
  onFallback: () => void;
}

function initialColumns(): number {
  if (typeof window === 'undefined') return 14;
  return columnsFor(window.innerWidth - 48, 200);
}

/**
 * Three.js の牌卓。`lazy(() => import(...))` 経由で、3D を選んだときだけ読み込む。
 * canvas は aria-hidden。読み上げ用のテキストは親（HandStage）が DOM で出す。
 */
export default function ThreeHand({
  concealed,
  melds = [],
  winTile,
  doraIndicator,
  onFallback,
}: ThreeHandProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HandScene | null>(null);
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;
  const [ready, setReady] = useState(false);
  const [columns, setColumns] = useState(initialColumns);

  // ステージの幅・アスペクトが変わったら段数を切り替える。
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const width = host.clientWidth || (window.innerWidth - 48);
      const height = host.clientHeight || 200;
      const next = columnsFor(width, height);
      setColumns((previous) => (previous === next ? previous : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () =>
      layoutHand({
        concealed,
        melds,
        winTile,
        doraIndicator,
        maxPerRow: columns,
      }),
    [concealed, melds, winTile, doraIndicator, columns],
  );

  const initialLayoutRef = useRef(layout);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let scene: HandScene | null = null;
    try {
      scene = createHandScene(host);
      sceneRef.current = scene;
      scene.update(initialLayoutRef.current);
      setReady(true);
    } catch {
      sceneRef.current = null;
      fallbackRef.current();
      return;
    }
    return () => {
      sceneRef.current = null;
      scene?.dispose();
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.update(layout);
  }, [layout]);

  return (
    <div
      className="three-hand"
      data-testid="three-hand"
      data-three-ready={ready ? 'true' : 'false'}
      data-hand-rows={layout.rows}
    >
      <div ref={hostRef} className="three-hand-host" aria-hidden="true" />
      <div className="three-hand-bar">
        <p className="three-hand-hint">
          ドラッグで視点（左右 ±25°）・ダブルクリックで戻す
        </p>
        <button
          type="button"
          className="three-hand-reset"
          onClick={() => sceneRef.current?.resetView()}
        >
          視点をリセット
        </button>
      </div>
    </div>
  );
}
