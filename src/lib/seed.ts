/** 文字列から安定した 32bit ハッシュを作る（FNV-1a）。 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** シードから 0〜1 の乱数を返す関数（mulberry32）。 */
export function seededRandom(seed: string | number): () => number {
  let state =
    (typeof seed === 'string' ? hashString(seed) : seed >>> 0) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** シードで決まる Fisher–Yates シャッフル。 */
export function seededShuffle<T>(
  items: readonly T[],
  seed: string | number,
): T[] {
  const result = [...items];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
