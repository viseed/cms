<script setup lang="ts">
import type { ThemeSettingsSection } from '@hana/types'
import SettingsField from './SettingsField.vue'

const props = defineProps<{
  section: ThemeSettingsSection
  /** Flat values map scoped to this section: key → value (without sectionKey prefix). */
  values: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'update:values', values: Record<string, unknown>): void
}>()

function updateField(fieldKey: string, value: unknown) {
  emit('update:values', { ...props.values, [fieldKey]: value })
}
</script>

<template>
  <section class="settings-section">
    <div class="section-header">
      <h3 class="section-title">{{ section.title }}</h3>
      <p v-if="section.description" class="section-description">{{ section.description }}</p>
    </div>

    <div class="section-fields">
      <SettingsField
        v-for="field in section.fields"
        :key="field.key"
        :field="field"
        :model-value="values[field.key]"
        @update:model-value="updateField(field.key, $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.settings-section {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.section-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.section-description {
  font-size: 0.8rem;
  color: #777;
  margin: 0.25rem 0 0;
}

.section-fields {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
</style>
