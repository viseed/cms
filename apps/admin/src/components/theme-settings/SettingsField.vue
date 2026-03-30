<script setup lang="ts">
import type {
  ThemeSettingsField,
  ThemeSettingsLinkItem,
  ThemeSettingsSelectField,
} from '@hana/types'
import { computed } from 'vue'

const props = defineProps<{
  field: ThemeSettingsField
  modelValue: unknown
}>()

const emit = defineEmits<(e: 'update:modelValue', value: unknown) => void>()

const fieldId = computed(() => `field-${props.field.key}`)

function update(value: unknown) {
  emit('update:modelValue', value)
}

const selectField = computed(() =>
  props.field.type === 'select' ? (props.field as ThemeSettingsSelectField) : null,
)

// Link list helpers
const linkItems = computed(() => (props.modelValue as ThemeSettingsLinkItem[]) ?? [])

function addLink() {
  update([...linkItems.value, { label: '', url: '', target: '_self' }])
}

function updateLink(index: number, patch: Partial<ThemeSettingsLinkItem>) {
  const links = linkItems.value.map((item, i) => (i === index ? { ...item, ...patch } : item))
  update(links)
}

function removeLink(index: number) {
  update(linkItems.value.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="settings-field">
    <label :for="fieldId" class="field-label">
      {{ field.label }}
      <span v-if="field.required" class="required-mark" aria-label="required">*</span>
    </label>

    <p v-if="field.description" class="field-description">{{ field.description }}</p>

    <!-- text -->
    <input
      v-if="field.type === 'text'"
      :id="fieldId"
      type="text"
      class="field-input"
      :value="(modelValue as string) ?? ''"
      :placeholder="field.placeholder"
      :maxlength="field.maxLength"
      @input="update(($event.target as HTMLInputElement).value)"
    />

    <!-- textarea -->
    <textarea
      v-else-if="field.type === 'textarea'"
      :id="fieldId"
      class="field-input field-textarea"
      :value="(modelValue as string) ?? ''"
      :placeholder="field.placeholder"
      :rows="field.rows ?? 4"
      @input="update(($event.target as HTMLTextAreaElement).value)"
    />

    <!-- boolean -->
    <label v-else-if="field.type === 'boolean'" :for="fieldId" class="field-toggle">
      <input
        :id="fieldId"
        type="checkbox"
        :checked="(modelValue as boolean) ?? false"
        @change="update(($event.target as HTMLInputElement).checked)"
      />
      <span class="toggle-track" />
    </label>

    <!-- select -->
    <select
      v-else-if="field.type === 'select'"
      :id="fieldId"
      class="field-input"
      :value="(modelValue as string) ?? ''"
      @change="update(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="opt in selectField?.options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <!-- color -->
    <div v-else-if="field.type === 'color'" class="field-color-row">
      <input
        :id="fieldId"
        type="color"
        class="field-color-swatch"
        :value="(modelValue as string) ?? '#000000'"
        @input="update(($event.target as HTMLInputElement).value)"
      />
      <input
        type="text"
        class="field-input field-color-text"
        :value="(modelValue as string) ?? ''"
        placeholder="#000000"
        @input="update(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- image (URL input) -->
    <input
      v-else-if="field.type === 'image'"
      :id="fieldId"
      type="url"
      class="field-input"
      :value="(modelValue as string) ?? ''"
      placeholder="https://..."
      @input="update(($event.target as HTMLInputElement).value)"
    />

    <!-- link_list -->
    <div v-else-if="field.type === 'link_list'" class="field-linklist">
      <div
        v-for="(link, index) in linkItems"
        :key="index"
        class="link-item"
      >
        <input
          type="text"
          class="field-input link-label"
          :value="link.label"
          placeholder="Label"
          @input="updateLink(index, { label: ($event.target as HTMLInputElement).value })"
        />
        <input
          type="url"
          class="field-input link-url"
          :value="link.url"
          placeholder="https://..."
          @input="updateLink(index, { url: ($event.target as HTMLInputElement).value })"
        />
        <select
          class="field-input link-target"
          :value="link.target ?? '_self'"
          @change="updateLink(index, { target: ($event.target as HTMLSelectElement).value as '_self' | '_blank' })"
        >
          <option value="_self">Same tab</option>
          <option value="_blank">New tab</option>
        </select>
        <button type="button" class="link-remove" title="Remove link" @click="removeLink(index)">
          ✕
        </button>
      </div>
      <button type="button" class="link-add" @click="addLink">+ Add link</button>
    </div>
  </div>
</template>

<style scoped>
.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #222;
}

.required-mark {
  color: #e53935;
  margin-left: 2px;
}

.field-description {
  font-size: 0.8rem;
  color: #777;
  margin: 0;
}

.field-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #222;
  background: #fff;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: #6c63ff;
}

.field-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Toggle */
.field-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.field-toggle input[type='checkbox'] {
  display: none;
}

.toggle-track {
  display: inline-block;
  width: 36px;
  height: 20px;
  background: #ddd;
  border-radius: 999px;
  position: relative;
  transition: background 0.2s;
}

.toggle-track::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.field-toggle input:checked + .toggle-track {
  background: #6c63ff;
}

.field-toggle input:checked + .toggle-track::after {
  transform: translateX(16px);
}

/* Color */
.field-color-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.field-color-swatch {
  width: 40px;
  height: 38px;
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
}

.field-color-text {
  flex: 1;
}

/* Link list */
.field-linklist {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.link-item {
  display: grid;
  grid-template-columns: 1fr 2fr 120px auto;
  gap: 0.5rem;
  align-items: center;
}

.link-remove {
  background: none;
  border: 1px solid #e53935;
  color: #e53935;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s;
  flex-shrink: 0;
}

.link-remove:hover {
  background: #ffebee;
}

.link-add {
  align-self: flex-start;
  background: none;
  border: 1px dashed #6c63ff;
  color: #6c63ff;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.15s;
}

.link-add:hover {
  background: #f3f1ff;
}
</style>
