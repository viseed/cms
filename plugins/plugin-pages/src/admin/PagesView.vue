<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Page {
  id: string
  title: string
  slug: string
  status: string
  createdAt: string
}

const pages = ref<Page[]>([])
const loading = ref(true)
const error = ref('')

async function fetchPages() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/pages', { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    pages.value = data.pages ?? []
  } catch (err) {
    error.value = 'Failed to load pages'
    pages.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchPages)
</script>

<template>
  <div class="pages-view">
    <div class="page-header">
      <div>
        <h1>Pages</h1>
        <p class="subtitle">Manage standalone pages</p>
      </div>
      <button class="btn-primary" disabled>+ New Page</button>
    </div>

    <div v-if="loading" class="loading-state">Loading pages...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="pages.length === 0" class="empty-state">
      <p>No pages yet. Create your first page to get started.</p>
    </div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Slug</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="page in pages" :key="page.id">
          <td class="cell-title">{{ page.title }}</td>
          <td class="cell-slug">{{ page.slug }}</td>
          <td><span class="badge" :class="page.status">{{ page.status }}</span></td>
          <td class="cell-date">{{ page.createdAt ?? '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.pages-view h1 { font-size: 1.75rem; margin: 0; }
.subtitle { color: #666; margin: 0.25rem 0 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.btn-primary {
  padding: 0.5rem 1rem; border-radius: 8px; border: none;
  background: #1a56db; color: #fff; font-weight: 500; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.loading-state, .error-state, .empty-state {
  background: #fff; padding: 3rem; border-radius: 12px; text-align: center;
  color: #999; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.error-state { color: #c53030; }
.data-table {
  width: 100%; border-collapse: collapse; background: #fff;
  border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.data-table th { text-align: left; padding: 0.75rem 1rem; background: #f9fafb; font-size: 0.8rem; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
.data-table td { padding: 0.75rem 1rem; border-top: 1px solid #f0f0f0; }
.cell-title { font-weight: 500; }
.cell-slug { color: #888; font-size: 0.9rem; }
.cell-date { color: #888; font-size: 0.9rem; }
.badge { padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
.badge.published { background: #d1fae5; color: #065f46; }
.badge.draft { background: #fef3c7; color: #92400e; }
.badge.archived { background: #e5e7eb; color: #4b5563; }
</style>
