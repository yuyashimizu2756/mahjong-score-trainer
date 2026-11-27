import '@testing-library/jest-dom/vitest';

// jsdom は WebGL を実装していない。getContext の「Not implemented」ログを抑え、
// WebGL 非対応環境として振る舞わせる（テストでは createCanvas を注入して判定する）。
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: () => null,
  });
}
