import { ref } from 'vue'

type ResolveCallback = (url: string | null) => void

const isOpen = ref(false)
const resolveCallback = ref<ResolveCallback | null>(null)

/**
 * Global singleton composable for the media picker modal.
 * Any component can call openMediaPicker() to show the picker and await the result.
 * MediaPickerModal.vue must be mounted once in the app root to handle events.
 */
export function useMediaPicker() {
  function openMediaPicker(): Promise<string | null> {
    return new Promise((resolve) => {
      resolveCallback.value = resolve
      isOpen.value = true
    })
  }

  function confirmSelection(url: string) {
    isOpen.value = false
    const cb = resolveCallback.value
    resolveCallback.value = null
    cb?.(url)
  }

  function cancelPicker() {
    isOpen.value = false
    const cb = resolveCallback.value
    resolveCallback.value = null
    cb?.(null)
  }

  return {
    isOpen,
    openMediaPicker,
    confirmSelection,
    cancelPicker,
  }
}
