<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { usePluginComponent } from '../../composables/usePluginComponent'
import { adminFetch } from '../../lib/admin-api'

const props = defineProps<NodeViewProps>()

interface WidgetSummary {
  id: string
  name: string
  type: string
  typeLabel: string
  typeAvailable: boolean
}

const widgetInfo = ref<WidgetSummary | null>(null)
const loadError = ref(false)
const { resolveComponent } = usePluginComponent()

const previewComponent = shallowRef<ReturnType<typeof resolveComponent>>(null)

const widgetId = computed(() => props.node.attrs.widgetId as string | null)

onMounted(async () => {
  if (!widgetId.value) return
  try {
    const res = await adminFetch(`/api/admin/widgets/${widgetId.value}`)
    if (!res.ok) {
      loadError.value = true
      return
    }
    widgetInfo.value = await res.json()

    // Attempt to load preview component if defined for this widget type
    if (widgetInfo.value?.typeAvailable) {
      const res2 = await adminFetch('/api/admin/widget-types')
      if (res2.ok) {
        const data = await res2.json()
        const wType = (data.types ?? []).find(
          (t: { id: string; pluginName: string; previewComponent?: string }) =>
            t.id === widgetInfo.value?.type,
        )
        if (wType?.previewComponent) {
          previewComponent.value = resolveComponent(wType.pluginName, wType.previewComponent)
        }
      }
    }
  } catch {
    loadError.value = true
  }
})

function removeWidget() {
  props.deleteNode()
}
</script>

<template>
  <node-view-wrapper class="widget-embed-node" :class="{ selected: props.selected }">
    <div class="widget-embed-header" contenteditable="false">
      <span class="widget-icon">❖</span>
      <span v-if="widgetInfo" class="widget-name">{{ widgetInfo.name }}</span>
      <span v-else-if="loadError" class="widget-name widget-name--error">Widget not found</span>
      <span v-else class="widget-name widget-name--loading">Loading…</span>
      <span v-if="widgetInfo" class="widget-type-badge">{{ widgetInfo.typeLabel }}</span>
      <span v-if="widgetInfo && !widgetInfo.typeAvailable" class="widget-unavailable">
        (type unavailable)
      </span>
      <button class="widget-remove-btn" @click="removeWidget" title="Remove widget">✕</button>
    </div>
    <div v-if="previewComponent" class="widget-preview" contenteditable="false">
      <component :is="previewComponent" :config="{}" />
    </div>
  </node-view-wrapper>
</template>

<style scoped>
.widget-embed-node {
  border: 1.5px dashed #d1d5db;
  border-radius: 6px;
  margin: 0.5rem 0;
  user-select: none;
  cursor: default;
  transition: border-color 0.15s;
}

.widget-embed-node.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.widget-embed-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
}

.widget-icon {
  font-size: 1rem;
  color: #6366f1;
}

.widget-name {
  font-weight: 500;
  font-size: 0.875rem;
  color: #111827;
  flex: 1;
}

.widget-name--loading {
  color: #9ca3af;
}

.widget-name--error {
  color: #dc2626;
}

.widget-type-badge {
  font-size: 0.7rem;
  background: #eff6ff;
  color: #2563eb;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.widget-unavailable {
  font-size: 0.75rem;
  color: #b45309;
}

.widget-remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  line-height: 1;
  margin-left: auto;
}
.widget-remove-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.widget-preview {
  border-top: 1px solid #e5e7eb;
  padding: 0.75rem;
  background: #f9fafb;
  pointer-events: none;
}
</style>
