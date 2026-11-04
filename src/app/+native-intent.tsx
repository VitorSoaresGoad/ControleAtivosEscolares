type NativeIntentOptions = { path: string; initial: boolean };

export function redirectSystemPath({ path }: NativeIntentOptions) {
  try {
    const url = new URL(path, 'sgee:///');
    if (url.protocol !== 'sgee:') return path;

    const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();
    const isAuthCallback = (url.hostname.toLowerCase() === 'auth' || pathname === '/auth')
      && (url.searchParams.has('code') || url.searchParams.has('error'));

    // Let the AuthSession handler consume the OAuth response while keeping the
    // router from interpreting /auth as a screen. A bare scheme opens the login.
    if (isAuthCallback || (!url.hostname && (!pathname || pathname === '/'))) return '/';
    return path;
  } catch {
    return path;
  }
}
