<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}

const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref('')

async function fetchCategories() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/blog/categories', { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    categories.value = data.categories ?? []
  } catch (err) {
    error.value = 'Failed to load categories'
    categories.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="categories-view">
    <div class="page-header">
      <div>
        <h1>Categories</h1>
        <p class="subtitle">Manage blog categories</p>
      </div>
      <button class="btn-primary" disabled>+ New Category</button>
    </div>

    <div v-if="loading" class="loading-state">Loading categories...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="categories.length === 0" class="empty-state">
      <p>No categories yet. Create your first category to organize posts.</p>
    </div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cat in categories" :key="cat.id">
          <td class="cell-name">{{ cat.name }}</td>
          <td class="cell-slug">{{ cat.slug }}</td>
          <td class="cell-desc">{{ cat.description ?? '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.categories-view h1 { font-size: 1.75rem; margin: 0; }
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
.cell-name { font-weight: 500; }
.cell-slug { color: #888; font-size: 0.9rem; }
.cell-desc { color: #888; font-size: 0.9rem; }
</style>
