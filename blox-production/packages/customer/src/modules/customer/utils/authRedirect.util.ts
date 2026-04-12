/**
 * Builds a safe in-app path after login from AuthGuard's `state.from` (a Location).
 * Rejects external URLs and auth routes to avoid open redirects and login loops.
 */
export function getSafePostLoginRedirect(from: unknown): string | undefined {
  if (!from || typeof from !== 'object') return undefined;
  const loc = from as { pathname?: string; search?: string | null };
  if (!loc.pathname || typeof loc.pathname !== 'string') return undefined;
  const path = `${loc.pathname}${loc.search ?? ''}`;
  if (!path.startsWith('/customer')) return undefined;
  if (path.startsWith('/customer/auth')) return undefined;
  return path;
}
