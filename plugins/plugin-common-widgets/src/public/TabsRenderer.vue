<script setup lang="ts">
import { computed, ref } from 'vue'

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

function setActive(id: string) {
  activeId.value = id
}

const activeTab = computed(() => tabs.value.find((t) => t.id === activeId.value) ?? tabs.value[0])
</script>

<template>
  <div
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

/* ── Content HTML reset ── */
.tab-content :deep(> * + *) { margin-top: 0.6em; }
.tab-content :deep(h2) { font-size: 1.3rem; font-weight: 700; }
.tab-content :deep(h3) { font-size: 1.1rem; font-weight: 600; }
.tab-content :deep(ul), .tab-content :deep(ol) { padding-left: 1.4rem; }
.tab-content :deep(a) { color: #1a56db; text-decoration: underline; }
.tab-content :deep(img) { max-width: 100%; height: auto; border-radius: 4px; }
</style>
