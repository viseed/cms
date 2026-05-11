<script setup lang="ts">
interface Config {
  count?: number
  categorySlug?: string
  title?: string
}

const props = defineProps<{ modelValue: Config }>()
const emit = defineEmits<{ 'update:modelValue': [Config] }>()

function update(patch: Partial<Config>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}
</script>

<template>
  <div class="latest-posts-config">
    <div class="field">
      <label>Section title</label>
      <input
        type="text"
        :value="modelValue.title ?? ''"
        placeholder="e.g. Latest Posts"
        class="input"
        @input="update({ title: ($event.target as HTMLInputElement).value })"
      />
    </div>
    <div class="field">
      <label>Number of posts</label>
      <input
        type="number"
        :value="modelValue.count ?? 5"
        min="1"
        max="20"
        class="input input-sm"
        @input="update({ count: Number(($event.target as HTMLInputElement).value) })"
      />
    </div>
    <div class="field">
      <label>Filter by category slug <span class="hint">(leave blank for all)</span></label>
      <input
        type="text"
        :value="modelValue.categorySlug ?? ''"
        placeholder="e.g. technology"
        class="input"
        @input="update({ categorySlug: ($event.target as HTMLInputElement).value })"
      />
    </div>
  </div>
</template>

<style scoped>
.latest-posts-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.hint {
  font-weight: 400;
  color: #9ca3af;
}

.input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}
.input:focus { outline: none; border-color: #2563eb; }
.input-sm { width: 6rem; }
</style>
