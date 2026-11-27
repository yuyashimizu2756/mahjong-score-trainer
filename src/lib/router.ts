export type RouteName =
  | 'home'
  | 'learn'
  | 'memorize'
  | 'practice'
  | 'chart'
  | 'yaku'
  | 'settings';

export const ROUTE_NAMES: readonly RouteName[] = [
  'home',
  'learn',
  'memorize',
  'practice',
  'chart',
  'yaku',
  'settings',
] as const;

export function isRouteName(value: string): value is RouteName {
  return (ROUTE_NAMES as readonly string[]).includes(value);
}

/** `#/practice` と旧形式 `#practice` の両方を受け付ける。 */
export function parseRoute(hash: string): RouteName {
  const cleaned = hash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
  return isRouteName(cleaned) ? cleaned : 'home';
}

export function routeHash(route: RouteName): string {
  return `#/${route}`;
}
