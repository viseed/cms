<script setup lang="ts">
import { computed, ref } from 'vue'

interface QaItem {
  id: string
  question: string
  answer: string
}

interface QaConfig {
  items?: QaItem[]
}

const props = defineProps<{ config: QaConfig }>()

const items = computed(() => props.config.items ?? [])
const openId = ref<string | null>(null)

function toggle(id: string) {
  openId.value = openId.value === id ? null : id
}
</script>

<template>
  <div class="qa-widget">
    <div
      v-for="item in items"
      :key="item.id"
      class="qa-entry"
      :class="{ open: item.id === openId }"
    >
      <button
        type="button"
        class="qa-question"
        :aria-expanded="item.id === openId"
        @click="toggle(item.id)"
      >
        <span class="qa-question-text">{{ item.question }}</span>
        <span class="qa-chevron" aria-hidden="true">{{ item.id === openId ? '▲' : '▼' }}</span>
      </button>
      <div v-show="item.id === openId" class="qa-answer" v-html="item.answer" />
    </div>
  </div>
</template>

<style scoped>
.qa-widget {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: inherit;
  font-size: 1rem;
}

.qa-entry {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s;
}

.qa-entry.open {
  border-color: #93c5fd;
}

.qa-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: inherit;
  font-weight: 600;
  color: #111827;
  transition: background 0.15s;
}

.qa-question:hover {
  background: #f9fafb;
}

.qa-entry.open .qa-question {
  background: #eff6ff;
  color: #1a56db;
}

.qa-question-text {
  flex: 1;
  line-height: 1.5;
}

.qa-chevron {
  font-size: 0.75rem;
  color: #6b7280;
  flex-shrink: 0;
}

.qa-entry.open .qa-chevron {
  color: #1a56db;
}

.qa-answer {
  padding: 0.875rem 1rem 1rem;
  border-top: 1px solid #e5e7eb;
  color: #374151;
  line-height: 1.7;
}

.qa-answer :deep(> * + *) { margin-top: 0.5em; }
.qa-answer :deep(h2) { font-size: 1.15rem; font-weight: 700; }
.qa-answer :deep(h3) { font-size: 1rem; font-weight: 600; }
.qa-answer :deep(ul), .qa-answer :deep(ol) { padding-left: 1.4rem; }
.qa-answer :deep(a) { color: #1a56db; text-decoration: underline; }
.qa-answer :deep(img) { max-width: 100%; height: auto; border-radius: 4px; }
</style>
