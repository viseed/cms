<script setup lang="ts">
import type { MetaSeo } from '@hana/validator'
import { computed } from 'vue'

const props = defineProps<{
  modelValue: MetaSeo | null | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MetaSeo]
}>()

const value = computed<MetaSeo>(() => props.modelValue ?? {})

function updateField<K extends keyof MetaSeo>(key: K, val: string) {
  const next: MetaSeo = { ...value.value }
  if (val === '') {
    delete next[key]
  } else {
    next[key] = val as MetaSeo[K]
  }
  emit('update:modelValue', next)
}

const titleLen = computed(() => (value.value.metaTitle ?? '').length)
const descLen = computed(() => (value.value.metaDescription ?? '').length)
</script>

<template>
  <div class="meta-seo-editor">
    <div class="header">
      <h4>Meta SEO</h4>
      <p>Title, description, social preview, and canonical URL.</p>
    </div>

    <div class="field">
      <label>
        <span>Meta title</span>
        <span class="counter" :class="{ warn: titleLen > 60 }">{{ titleLen }}/60</span>
      </label>
      <input
        type="text"
        class="ctrl"
        maxlength="160"
        placeholder="Page title shown in search results"
        :value="value.metaTitle ?? ''"
        @input="updateField('metaTitle', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="field">
      <label>
        <span>Meta description</span>
        <span class="counter" :class="{ warn: descLen > 160 }">{{ descLen }}/160</span>
      </label>
      <textarea
        class="ctrl"
        rows="3"
        maxlength="320"
        placeholder="Short summary shown in search results"
        :value="value.metaDescription ?? ''"
        @input="updateField('metaDescription', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <div class="field">
      <label><span>Open Graph image URL</span></label>
      <input
        type="url"
        class="ctrl"
        placeholder="https://example.com/og.jpg"
        :value="value.ogImage ?? ''"
        @input="updateField('ogImage', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="field">
      <label><span>Canonical URL</span></label>
      <input
        type="url"
        class="ctrl"
        placeholder="https://example.com/canonical-path"
        :value="value.canonicalUrl ?? ''"
        @input="updateField('canonicalUrl', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>

<style scoped>
.meta-seo-editor { display: flex; flex-direction: column; gap: 0.75rem; }

.header h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
.header p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #6b7280; }

.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field label {
  display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem;
  font-size: 0.8rem; font-weight: 500; color: #374151;
}
.counter { font-size: 0.7rem; color: #9ca3af; font-family: ui-monospace, monospace; }
.counter.warn { color: #d97706; }

.ctrl {
  width: 100%; padding: 0.5rem 0.7rem; border: 1px solid #d1d5db;
  border-radius: 6px; font-size: 0.9rem; outline: none; background: #fff;
  font-family: inherit; resize: vertical;
}
.ctrl:focus { border-color: #1a56db; box-shadow: 0 0 0 3px rgba(26,86,219,0.1); }
</style>
