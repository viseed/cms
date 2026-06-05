<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Tab {
  id: string
  title: string
  content: string
}

interface TabsConfig {
  orientation?: 'vertical' | 'horizontal'
  tabs?: Tab[]
}

const props = defineProps<{ config: TabsConfig }>()

const tabs = computed(() => props.config.tabs ?? [])
const orientation = computed(() => props.config.orientation ?? 'horizontal')
const activeId = ref(tabs.value[0]?.id ?? '')

// ── Mobile detection ──────────────────────────────────────────────────────────
// Widget is mounted by createApp() in the browser, so matchMedia is safe.
const mql = window.matchMedia('(max-width: 640px)')
const isMobile = ref(mql.matches)

function onBreakpointChange(e: MediaQueryListEvent) {
  isMobile.value = e.matches
}

onMounted(() => mql.addEventListener('change', onBreakpointChange))
onUnmounted(() => mql.removeEventListener('change', onBreakpointChange))

// ── Desktop tab strip ─────────────────────────────────────────────────────────
function setActive(id: string) {
  activeId.value = id
}

const activeTab = computed(() => tabs.value.find((t) => t.id === activeId.value) ?? tabs.value[0])

// ── Mobile accordion ──────────────────────────────────────────────────────────
// Toggle open/close; pin the tapped header in the viewport across the full
// transition so that closing a panel above never causes the page to jump.
function toggle(id: string, evt: MouseEvent) {
  const headerEl = evt.currentTarget as HTMLElement
  const beforeY = headerEl.getBoundingClientRect().top

  activeId.value = activeId.value === id ? '' : id

  // Keep the header visually pinned while grid-template-rows animates (~250 ms).
  const start = performance.now()
  const pin = () => {
    const delta = headerEl.getBoundingClientRect().top - beforeY
    if (delta !== 0) window.scrollBy(0, delta)
    if (performance.now() - start < 300) requestAnimationFrame(pin)
  }
  requestAnimationFrame(pin)
}
</script>

<template>
  <!-- ── Mobile accordion ────────────────────────────────────────────────── -->
  <div v-if="isMobile" class="acc-widget">
    <div
      v-for="tab in tabs"
      :key="tab.id"
      class="acc-item"
      :class="{ 'acc-item--open': tab.id === activeId }"
    >
      <button
        type="button"
        class="acc-header"
        :aria-expanded="tab.id === activeId"
        :aria-controls="`acc-panel-${tab.id}`"
        @click="toggle(tab.id, $event)"
      >
        <span class="acc-title">{{ tab.title }}</span>
        <span class="acc-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </button>

      <div
        :id="`acc-panel-${tab.id}`"
        class="acc-panel"
        :class="{ open: tab.id === activeId }"
        role="region"
        :aria-labelledby="`acc-header-${tab.id}`"
      >
        <div class="acc-inner" v-html="tab.content" />
      </div>
    </div>
  </div>

  <!-- ── Desktop tab strip (unchanged) ──────────────────────────────────── -->
  <div
    v-else
    class="tabs-widget"
    :class="orientation === 'vertical' ? 'tabs-widget--vertical' : 'tabs-widget--horizontal'"
  >
    <!-- Horizontal: tab strip on top -->
    <div v-if="orientation === 'horizontal'" class="tabs-strip tabs-strip--horizontal">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab-btn"
        :class="{ active: tab.id === activeId }"
        @click="setActive(tab.id)"
      >
        {{ tab.title }}
      </button>
    </div>

    <div class="tabs-body">
      <!-- Vertical: sidebar on left -->
      <div v-if="orientation === 'vertical'" class="tabs-strip tabs-strip--vertical">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab-btn"
          :class="{ active: tab.id === activeId }"
          @click="setActive(tab.id)"
        >
          <span class="tab-label">{{ tab.title }}</span>
          <span class="tab-arrow" aria-hidden="true">▶</span>
        </button>
      </div>

      <div class="tab-content" v-html="activeTab?.content ?? ''" />
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE ACCORDION
   ═══════════════════════════════════════════════════════════════════════════ */

.acc-widget {
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.acc-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  /* Prevent the item from jumping when the panel inside it collapses */
  scroll-margin-top: 8px;
}

.acc-item--open {
  border-color: #bfdbfe;
}

.acc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #374151;
  gap: 0.5rem;
  transition: background 0.15s, color 0.15s;
  /* Keeps touch targets generous */
  min-height: 48px;
}

.acc-header:hover {
  background: #f9fafb;
}

.acc-item--open .acc-header {
  background: #eff6ff;
  color: #1d4ed8;
}

.acc-title {
  flex: 1;
}

.acc-chevron {
  flex-shrink: 0;
  color: #9ca3af;
  transition: transform 0.25s ease, color 0.15s;
  display: flex;
  align-items: center;
}

.acc-item--open .acc-chevron {
  transform: rotate(180deg);
  color: #3b82f6;
}

/* ── Collapse/expand using grid-template-rows trick ── */
/* Avoids the need to measure element height; transitions cleanly. */
.acc-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
}

.acc-panel.open {
  grid-template-rows: 1fr;
}

.acc-inner {
  overflow: hidden;
  min-height: 0;
  padding: 0 1rem;
  transition: padding 0.25s ease;
}

.acc-panel.open .acc-inner {
  padding: 0.875rem 1rem 1rem;
}

/* ── Content HTML reset (accordion) ── */
.acc-inner :deep(> * + *) { margin-top: 0.6em; }
.acc-inner :deep(h2) { font-size: 1.3rem; font-weight: 700; }
.acc-inner :deep(h3) { font-size: 1.1rem; font-weight: 600; }
.acc-inner :deep(ul),
.acc-inner :deep(ol) { padding-left: 1.4rem; }
.acc-inner :deep(a) { color: #1a56db; text-decoration: underline; }
.acc-inner :deep(img) { max-width: 100%; height: auto; border-radius: 4px; }

/* ═══════════════════════════════════════════════════════════════════════════
   DESKTOP TAB STRIP
   ═══════════════════════════════════════════════════════════════════════════ */

.tabs-widget {
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.6;
}

/* ── Horizontal layout ── */
.tabs-widget--horizontal .tabs-strip--horizontal {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
  overflow-x: auto;
}

.tabs-widget--horizontal .tabs-body {
  padding: 1rem 0.25rem;
}

/* ── Vertical layout ── */
.tabs-widget--vertical .tabs-body {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.tabs-widget--vertical .tabs-strip--vertical {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  border-right: 2px solid #e5e7eb;
  flex-shrink: 0;
}

.tabs-widget--vertical .tab-content {
  flex: 1;
  min-width: 0;
}

/* ── Tab buttons ── */
.tab-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.tabs-widget--horizontal .tab-btn {
  padding: 0.6rem 1rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
}

.tabs-widget--horizontal .tab-btn.active {
  color: #1a56db;
  border-bottom-color: #1a56db;
}

.tabs-widget--horizontal .tab-btn:hover:not(.active) {
  color: #374151;
  border-bottom-color: #d1d5db;
}

.tabs-widget--vertical .tab-btn {
  padding: 0.6rem 0.875rem;
  text-align: left;
  border-right: 2px solid transparent;
  margin-right: -2px;
  display: flex;
  align-items: center;
  width: 100%;
}

.tab-label {
  flex: 1;
}

.tab-arrow {
  font-size: 0.55rem;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.tabs-widget--vertical .tab-btn.active .tab-arrow {
  opacity: 1;
}

.tabs-widget--vertical .tab-btn.active {
  color: #1a56db;
  border-right-color: #1a56db;
  background: #eff6ff;
}

.tabs-widget--vertical .tab-btn:hover:not(.active) {
  color: #374151;
  background: #f3f4f6;
}

/* ── Content HTML reset (desktop) ── */
.tab-content :deep(> * + *) { margin-top: 0.6em; }
.tab-content :deep(h2) { font-size: 1.3rem; font-weight: 700; }
.tab-content :deep(h3) { font-size: 1.1rem; font-weight: 600; }
.tab-content :deep(ul),
.tab-content :deep(ol) { padding-left: 1.4rem; }
.tab-content :deep(a) { color: #1a56db; text-decoration: underline; }
.tab-content :deep(img) { max-width: 100%; height: auto; border-radius: 4px; }
</style>
