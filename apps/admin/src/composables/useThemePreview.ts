import { ref } from 'vue'
import { adminFetch } from '../lib/admin-api'

export interface ThemePreviewStatus {
  active: boolean
  previewThemePath: string | null
  token: string | null
}

export function useThemePreview() {
  const status = ref<ThemePreviewStatus | null>(null)
  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      const res = await adminFetch('/api/admin/themes/preview')
      if (res.ok) {
        status.value = await res.json()
      }
    } finally {
      loading.value = false
    }
  }

  return { status, loading, refresh }
}
