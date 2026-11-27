/**
 * WebGL の利用可否。Three.js を読み込む前に判定する。
 * jsdom・SSR・GPU なしの環境では false になり、CSS 3D へフォールバックする。
 */

export interface WebGLCheckOptions {
  /** テスト用の canvas 生成。省略時は document.createElement('canvas')。 */
  createCanvas?: () => HTMLCanvasElement | null;
}

type ContextFactory = (
  contextId: string,
  options?: WebGLContextAttributes,
) => unknown;

export function isWebGLAvailable(options: WebGLCheckOptions = {}): boolean {
  if (typeof document === 'undefined') return false;

  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = options.createCanvas
      ? options.createCanvas()
      : document.createElement('canvas');
  } catch {
    return false;
  }
  if (!canvas) return false;

  const getContext = (canvas as HTMLCanvasElement).getContext as
    | ContextFactory
    | undefined;
  if (typeof getContext !== 'function') return false;

  try {
    const attributes: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      failIfMajorPerformanceCaveat: false,
    };
    const context =
      getContext.call(canvas, 'webgl2', attributes) ??
      getContext.call(canvas, 'webgl', attributes) ??
      getContext.call(canvas, 'experimental-webgl', attributes);
    return Boolean(context);
  } catch {
    return false;
  }
}
