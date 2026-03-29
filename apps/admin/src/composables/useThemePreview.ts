import { ref } from 'vue'

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
      const res = await fetch('/api/admin/themes/preview', { credentials: 'same-origin' })
      if (res.ok) {
        status.value = await res.json()
      }
    } finally {
      loading.value = false
    }
  }

  return { status, loading, refresh }
}
