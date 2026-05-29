const RETURN_TO_KEY = 'auth_return_to';

export function saveReturnUrl(): void {
  const url = window.location.pathname + window.location.search;
  if (url && url !== '/login' && url !== '/portal' && url !== '/onboarding') {
    sessionStorage.setItem(RETURN_TO_KEY, url);
  }
}

export function consumeReturnUrl(): string | null {
  const url = sessionStorage.getItem(RETURN_TO_KEY);
  if (url) sessionStorage.removeItem(RETURN_TO_KEY);
  return url;
}
