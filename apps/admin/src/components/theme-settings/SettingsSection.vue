<script setup lang="ts">
import type { ThemeSettingsSection } from '@hanano/types'
import SettingsField from './SettingsField.vue'

const props = defineProps<{
  section: ThemeSettingsSection
  /** Flat values map scoped to this section: key → value (without sectionKey prefix). */
  values: Record<string, unknown>
  /** Whether this section is currently expanded. */
  expanded: boolean
}>()

const emit = defineEmits<{
  (e: 'update:values', values: Record<string, unknown>): void
  (e: 'toggle'): void
}>()

function updateField(fieldKey: string, value: unknown) {
  emit('update:values', { ...props.values, [fieldKey]: value })
}
</script>

<template>
  <section class="settings-section" :class="{ collapsed: !expanded }">
    <button type="button" class="section-header" @click="emit('toggle')">
      <div class="section-header-left">
        <span class="section-title">{{ section.title }}</span>
        <span v-if="!expanded && section.description" class="section-description-inline">
          {{ section.description }}
        </span>
      </div>
      <div class="section-header-right">
        <span v-if="!expanded" class="section-field-count">
          {{ section.fields.length }} field{{ section.fields.length !== 1 ? 's' : '' }}
        </span>
        <span class="section-chevron" aria-hidden="true">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </button>

    <template v-if="expanded">
      <p v-if="section.description" class="section-description">{{ section.description }}</p>

      <div class="section-fields">
        <SettingsField
          v-for="field in section.fields"
          :key="field.key"
          :field="field"
          :model-value="values[field.key]"
          @update:model-value="updateField(field.key, $event)"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.settings-section {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.85rem 1.25rem;
  border: none;
  background: #fafafa;
  cursor: pointer;
  text-align: left;
  gap: 1rem;
  transition: background 0.12s;
}

.section-header:hover {
  background: #f3f3f3;
}

.settings-section:not(.collapsed) .section-header {
  border-bottom: 1px solid #f0f0f0;
}

.section-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.section-header-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a2e;
}

.section-description-inline {
  font-size: 0.75rem;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 32rem;
}

.section-field-count {
  font-size: 0.72rem;
  color: #aaa;
  font-weight: 500;
}

.section-chevron {
  font-size: 0.65rem;
  color: #aaa;
}

.section-description {
  font-size: 0.8rem;
  color: #777;
  margin: 0;
  padding: 0.6rem 1.25rem 0;
}

.section-fields {
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
</style>
