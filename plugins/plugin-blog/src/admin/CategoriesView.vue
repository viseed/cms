<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}

const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const editingCategory = ref<Category | null>(null)

const form = ref({
  name: '',
  slug: '',
  description: '',
})

const isEditing = computed(() => editingCategory.value !== null)
const modalTitle = computed(() => (isEditing.value ? 'Edit Category' : 'New Category'))

function slugify(text: string): string {
  var from = 'àáãảạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđùúủũụưừứửữựòóỏõọôồốổỗộơờớởỡợìíỉĩịäëïîöüûñçýỳỹỵỷ',
    to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeduuuuuuuuuuuoooooooooooooooooiiiiiaeiiouuncyyyyy'
  for (let i = 0, l = from.length; i < l; i++) {
    text = text.replace(RegExp(from[i] ?? '', 'gi'), to[i] ?? '')
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

watch(
  () => form.value.name,
  (name) => {
    if (!isEditing.value) {
      form.value.slug = slugify(name)
    }
  },
)

function openCreate() {
  editingCategory.value = null
  form.value = { name: '', slug: '', description: '' }
  error.value = ''
  showModal.value = true
}

function openEdit(cat: Category) {
  editingCategory.value = cat
  form.value = {
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? '',
  }
  error.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingCategory.value = null
}

async function fetchCategories() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/blog/categories', { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    categories.value = data.categories ?? []
  } catch {
    error.value = 'Failed to load categories'
    categories.value = []
  } finally {
    loading.value = false
  }
}

async function saveCategory() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      name: form.value.name,
      slug: form.value.slug,
      description: form.value.description || undefined,
    }

    const url = isEditing.value
      ? `/api/blog/categories/${editingCategory.value?.id}`
      : '/api/blog/categories'

    const res = await fetch(url, {
      method: isEditing.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? `HTTP ${res.status}`)
    }

    closeModal()
    await fetchCategories()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save category'
  } finally {
    saving.value = false
  }
}

async function deleteCategory(cat: Category) {
  if (!confirm(`Delete "${cat.name}"? Posts in this category will be uncategorized.`)) return
  try {
    const res = await fetch(`/api/blog/categories/${cat.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchCategories()
  } catch {
    error.value = 'Failed to delete category'
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
      <button class="btn-primary" @click="openCreate">+ New Category</button>
    </div>

    <div v-if="error && !showModal" class="error-state">{{ error }}</div>

    <div v-if="loading" class="loading-state">Loading categories...</div>
    <div v-else-if="categories.length === 0 && !error" class="empty-state">
      <p>No categories yet. Create your first category to organize posts.</p>
    </div>
    <table v-else-if="categories.length > 0" class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cat in categories" :key="cat.id">
          <td class="cell-name">
            <a href="#" @click.prevent="openEdit(cat)">{{ cat.name }}</a>
          </td>
          <td class="cell-slug">{{ cat.slug }}</td>
          <td class="cell-desc">{{ cat.description ?? '—' }}</td>
          <td class="cell-actions">
            <button class="btn-sm" @click="openEdit(cat)">Edit</button>
            <button class="btn-sm btn-danger" @click="deleteCategory(cat)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @mousedown.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ modalTitle }}</h2>
          <button class="btn-close" @click="closeModal">✕</button>
        </div>

        <div v-if="error" class="error-state modal-error">{{ error }}</div>

        <div class="form-group">
          <label for="cat-name">Name</label>
          <input
            id="cat-name"
            v-model="form.name"
            type="text"
            placeholder="Category name"
            :disabled="saving"
          />
        </div>

        <div class="form-group">
          <label for="cat-slug">Slug</label>
          <input
            id="cat-slug"
            v-model="form.slug"
            type="text"
            placeholder="category-slug"
            :disabled="saving"
          />
        </div>

        <div class="form-group">
          <label for="cat-desc">Description <span class="optional">(optional)</span></label>
          <textarea
            id="cat-desc"
            v-model="form.description"
            rows="3"
            placeholder="Short description"
            :disabled="saving"
          />
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" :disabled="saving" @click="closeModal">Cancel</button>
          <button
            class="btn-primary"
            :disabled="saving || !form.name || !form.slug"
            @click="saveCategory"
          >
            {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>
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
.btn-primary:hover:not(:disabled) { background: #1648c0; }

.btn-secondary {
  padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #d1d5db;
  background: #fff; color: #374151; font-weight: 500; cursor: pointer;
}
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary:hover:not(:disabled) { background: #f9fafb; }

.btn-sm {
  padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;
  background: #fff; font-size: 0.8rem; cursor: pointer;
}
.btn-sm:hover { background: #f3f4f6; }
.btn-danger { color: #dc2626; border-color: #fca5a5; }
.btn-danger:hover { background: #fef2f2; }

.btn-close {
  background: none; border: none; font-size: 1rem; cursor: pointer; color: #6b7280;
  padding: 0.25rem;
}
.btn-close:hover { color: #1a1a2e; }

.loading-state, .error-state, .empty-state {
  background: #fff; padding: 3rem; border-radius: 12px; text-align: center;
  color: #999; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.error-state { color: #c53030; }
.modal-error { padding: 0.75rem 1rem; margin-bottom: 1rem; border-radius: 8px; font-size: 0.9rem; }

.data-table {
  width: 100%; border-collapse: collapse; background: #fff;
  border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.data-table th { text-align: left; padding: 0.75rem 1rem; background: #f9fafb; font-size: 0.8rem; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
.data-table td { padding: 0.75rem 1rem; border-top: 1px solid #f0f0f0; }
.cell-name { font-weight: 500; }
.cell-name a { color: #1a56db; text-decoration: none; }
.cell-name a:hover { text-decoration: underline; }
.cell-slug { color: #888; font-size: 0.9rem; }
.cell-desc { color: #888; font-size: 0.9rem; }
.cell-actions { display: flex; gap: 0.5rem; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  width: 100%; max-width: 480px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.25rem;
}
.modal-header h2 { font-size: 1.25rem; margin: 0; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.5rem;
  margin-top: 1.25rem;
}

.form-group {
  display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem;
}
.form-group label { font-size: 0.85rem; font-weight: 500; color: #374151; }
.form-group .optional { font-weight: 400; color: #9ca3af; }
.form-group input,
.form-group textarea {
  padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 0.9rem; background: #fff; color: #1e293b;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none; border-color: #1a56db; box-shadow: 0 0 0 3px rgba(26,86,219,0.1);
}
.form-group input:disabled,
.form-group textarea:disabled { background: #f9fafb; cursor: not-allowed; }
.form-group textarea { resize: vertical; }
</style>
