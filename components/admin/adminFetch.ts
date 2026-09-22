/** fetch verso le API /api/admin/*: il token viaggia nell'header Authorization, non in query string. */
export function adminFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
