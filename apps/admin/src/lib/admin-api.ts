/**
 * Admin API fetch: always sends cookies (`credentials: 'include'`) and, when an
 * active site id is set (see {@link setActiveAdminSiteId}), adds the site context header.
 */
export const ADMIN_SITE_CONTEXT_HEADER = 'X-Viseed-Site-Id'

/** Session key used with {@link getActiveAdminSiteId} / {@link setActiveAdminSiteId}. */
export const ADMIN_ACTIVE_SITE_STORAGE_KEY = 'viseed.admin.activeSiteId'

export function getActiveAdminSiteId(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  try {
    const raw = sessionStorage.getItem(ADMIN_ACTIVE_SITE_STORAGE_KEY)
    const trimmed = raw?.trim()
    return trimmed ? trimmed : null
  } catch {
    return null
  }
}

/** Persist active site for admin API calls (e.g. site switcher). Pass null to clear. */
export function setActiveAdminSiteId(siteId: string | null): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    if (siteId?.trim()) {
      sessionStorage.setItem(ADMIN_ACTIVE_SITE_STORAGE_KEY, siteId.trim())
    } else {
      sessionStorage.removeItem(ADMIN_ACTIVE_SITE_STORAGE_KEY)
    }
  } catch {
    // ignore quota / private mode
  }
}

function buildAdminHeaders(init?: RequestInit): Headers {
  const headers = init?.headers != null ? new Headers(init.headers) : new Headers()
  const siteId = getActiveAdminSiteId()
  if (siteId) {
    headers.set(ADMIN_SITE_CONTEXT_HEADER, siteId)
  }
  return headers
}

/**
 * `fetch` for `/api/admin/*` routes: includes credentials and optional site header.
 */
export function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: buildAdminHeaders(init),
  })
}
