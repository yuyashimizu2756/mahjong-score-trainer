import { describe, expect, it, vi } from 'vitest';
import { isWebGLAvailable } from '../../src/features/practice/scene/webgl';

type FakeContext = Record<string, unknown> | null;

function fakeCanvas(contexts: Record<string, FakeContext>) {
  return {
    getContext: vi.fn((id: string) => contexts[id] ?? null),
  } as unknown as HTMLCanvasElement;
}

describe('WebGL の判定', () => {
  it('WebGL2 が使えれば true', () => {
    const canvas = fakeCanvas({ webgl2: {} });
    expect(
      isWebGLAvailable({ createCanvas: () => canvas }),
    ).toBe(true);
    expect(canvas.getContext).toHaveBeenCalledWith(
      'webgl2',
      expect.any(Object),
    );
  });

  it('WebGL1 だけでも true', () => {
    expect(
      isWebGLAvailable({
        createCanvas: () => fakeCanvas({ webgl: {} }),
      }),
    ).toBe(true);
    expect(
      isWebGLAvailable({
        createCanvas: () => fakeCanvas({ 'experimental-webgl': {} }),
      }),
    ).toBe(true);
  });

  it('コンテキストが取れなければ false', () => {
    expect(
      isWebGLAvailable({ createCanvas: () => fakeCanvas({}) }),
    ).toBe(false);
  });

  it('getContext が例外を投げても落ちない', () => {
    const canvas = {
      getContext: () => {
        throw new Error('GL disabled');
      },
    } as unknown as HTMLCanvasElement;
    expect(
      isWebGLAvailable({ createCanvas: () => canvas }),
    ).toBe(false);
  });

  it('canvas を作れなければ false', () => {
    expect(isWebGLAvailable({ createCanvas: () => null })).toBe(false);
    expect(
      isWebGLAvailable({
        createCanvas: () => {
          throw new Error('no canvas');
        },
      }),
    ).toBe(false);
  });

  it('document がない環境（SSR）では false', () => {
    vi.stubGlobal('document', undefined);
    try {
      expect(isWebGLAvailable()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('jsdom の canvas では false（WebGL 未実装）', () => {
    expect(isWebGLAvailable()).toBe(false);
  });
});
