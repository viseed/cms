import type { AuthContextPayload, RBACRole, SiteContext } from '@hana/types'
import { SINGLE_SITE_CONTEXT } from '@hana/types'
import { computed, readonly, ref, shallowRef } from 'vue'
import { ADMIN_ACTIVE_SITE_STORAGE_KEY, ADMIN_SITE_CONTEXT_HEADER } from '../lib/admin-api'

const payload = shallowRef<AuthContextPayload | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const initAttempted = ref(false)
const clientSiteOverrideId = ref<string | null>(null)
const switching = ref(false)
const switchError = ref<string | null>(null)

function readStoredSiteId(): string | null {
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) return null
  try {
    return globalThis.sessionStorage.getItem(ADMIN_ACTIVE_SITE_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredSiteId(id: string | null) {
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) return
  try {
    if (id) globalThis.sessionStorage.setItem(ADMIN_ACTIVE_SITE_STORAGE_KEY, id)
    else globalThis.sessionStorage.removeItem(ADMIN_ACTIVE_SITE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

async function loadContext(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const headers: Record<string, string> = {}
    const preferred = clientSiteOverrideId.value ?? readStoredSiteId()
    if (preferred) headers[ADMIN_SITE_CONTEXT_HEADER] = preferred

    const response = await fetch('/api/admin/auth/context', {
      credentials: 'include',
      headers,
    })
    const text = await response.text()
    if (!response.ok) {
      error.value = text || `${response.status} ${response.statusText}`
      payload.value = null
      return
    }
    try {
      const parsed = JSON.parse(text) as AuthContextPayload
      payload.value = parsed
      error.value = null
      if (
        clientSiteOverrideId.value &&
        !parsed.accessibleSites.some((s) => s.id === clientSiteOverrideId.value)
      ) {
        clientSiteOverrideId.value = null
        writeStoredSiteId(null)
      }
    } catch {
      error.value = 'Invalid auth context response'
      payload.value = null
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Network error'
    payload.value = null
  } finally {
    loading.value = false
  }
}

let initializeInFlight: Promise<void> | null = null

export async function initialize(): Promise<void> {
  if (initAttempted.value) return
  if (clientSiteOverrideId.value === null) {
    clientSiteOverrideId.value = readStoredSiteId()
  }
  if (!initializeInFlight) {
    initializeInFlight = loadContext().finally(() => {
      initAttempted.value = true
      initializeInFlight = null
    })
  }
  await initializeInFlight
}

export async function refresh(): Promise<void> {
  await loadContext()
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/admin/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } finally {
    payload.value = null
    error.value = null
    clientSiteOverrideId.value = null
    writeStoredSiteId(null)
    initAttempted.value = true
  }
}

/** Snapshot for guards / non-setup code (not reactive). */
export function getAuthContextPayload(): AuthContextPayload | null {
  return payload.value
}

export function useAdminAuthContext() {
  const isAuthenticated = computed(() => payload.value?.currentUser != null)

  const accessibleSites = computed((): SiteContext[] => {
    const p = payload.value
    if (!p) return [{ ...SINGLE_SITE_CONTEXT }]
    if (p.accessibleSites.length > 0) return p.accessibleSites.map((s) => ({ ...s }))
    return [{ ...p.currentSite }]
  })

  const displayActiveSite = computed((): SiteContext => {
    const p = payload.value
    if (!p) return { ...SINGLE_SITE_CONTEXT }
    const id = clientSiteOverrideId.value
    if (id) {
      const match = p.accessibleSites.find((s) => s.id === id)
      if (match) return { ...match }
    }
    return { ...p.currentSite }
  })

  const activeSiteId = computed(() => displayActiveSite.value.id)

  const permissions = computed(() => payload.value?.permissions ?? [])

  const roleAssignments = computed(() => payload.value?.roleAssignments ?? [])

  const userLabel = computed(() => {
    const u = payload.value?.currentUser
    if (!u) return 'Guest'
    return u.name?.trim() || u.email?.trim() || u.id
  })

  async function switchSite(siteId: string): Promise<void> {
    if (siteId === displayActiveSite.value.id) return
    const allowed = accessibleSites.value.some((s) => s.id === siteId)
    if (!allowed) {
      switchError.value = 'You do not have access to that site.'
      return
    }
    switching.value = true
    switchError.value = null
    clientSiteOverrideId.value = siteId
    writeStoredSiteId(siteId)
    await loadContext()
    if (error.value) switchError.value = error.value
    switching.value = false
  }

  function isRole(role: RBACRole): boolean {
    return roleAssignments.value.some((r) => r.role === role)
  }

  return {
    payload: readonly(payload),
    loading: readonly(loading),
    error: readonly(error),
    initialized: readonly(initAttempted),
    switching: readonly(switching),
    switchError: readonly(switchError),
    isAuthenticated,
    initialize,
    refresh,
    logout,
    switchSite,
    displayActiveSite,
    activeSiteId,
    accessibleSites,
    permissions,
    roleAssignments,
    userLabel,
    isRole,
  }
}
