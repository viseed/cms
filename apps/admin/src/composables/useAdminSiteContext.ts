import { computed } from 'vue'
import { useAdminAuthContext } from './useAdminAuthContext'

/**
 * Site-focused facade over admin auth bootstrap (active site, switcher, accessible sites).
 */
export function useAdminSiteContext() {
  const auth = useAdminAuthContext()
  const degraded = computed(() => auth.error.value != null && auth.payload.value == null)

  return {
    ...auth,
    ensureLoaded: auth.initialize,
    degraded,
  }
}
