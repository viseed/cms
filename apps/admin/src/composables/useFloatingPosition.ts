import { onBeforeUnmount, type Ref, ref, watch } from 'vue'

export interface FloatingPosition {
  top: number
  left: number
  width: number
}

/**
 * Tracks the position/size of `triggerRef` so that a teleported dropdown can
 * render in `position: fixed` coordinates anchored below the trigger.
 *
 * Recomputes on window scroll/resize while `isOpen` is true. Removes listeners
 * automatically when closed or unmounted.
 */
export function useFloatingPosition(
  triggerRef: Ref<HTMLElement | null>,
  isOpen: Ref<boolean>,
  options: { gap?: number } = {},
) {
  const gap = options.gap ?? 4
  const position = ref<FloatingPosition>({ top: 0, left: 0, width: 0 })

  function recompute() {
    const el = triggerRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    position.value = {
      top: rect.bottom + gap,
      left: rect.left,
      width: rect.width,
    }
  }

  function attach() {
    recompute()
    window.addEventListener('scroll', recompute, true)
    window.addEventListener('resize', recompute)
  }

  function detach() {
    window.removeEventListener('scroll', recompute, true)
    window.removeEventListener('resize', recompute)
  }

  watch(isOpen, (open) => {
    if (open) attach()
    else detach()
  })

  onBeforeUnmount(detach)

  return { position, recompute }
}
