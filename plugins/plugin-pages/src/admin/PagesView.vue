<script setup lang="ts">
import type { MetaSeo, SchemaOrgItem } from '@hanano/validator'
import { computed, onMounted, ref } from 'vue'

interface Page {
  id: string
  title: string
  slug: string
  body: string | null
  excerpt: string | null
  status: string
  metaSeo: MetaSeo | null
  schemaOrg: SchemaOrgItem[] | null
  tocEnabled: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

type SettingsTab = 'general' | 'seo'

const pages = ref<Page[]>([])
const loading = ref(true)
const error = ref('')
const showEditor = ref(false)
const saving = ref(false)
const editingPage = ref<Page | null>(null)

const form = ref({
  title: '',
  slug: '',
  body: null as string | null,
  excerpt: '',
  status: 'draft' as 'draft' | 'published' | 'archived',
  metaSeo: {} as MetaSeo,
  schemaOrg: [] as SchemaOrgItem[],
  tocEnabled: false,
})

const activeTab = ref<SettingsTab>('general')

const isEditing = computed(() => editingPage.value !== null)
const formTitle = computed(() => (isEditing.value ? 'Edit Page' : 'New Page'))

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

function onTitleInput() {
  if (!isEditing.value) {
    form.value.slug = slugify(form.value.title)
  }
}

function openCreate() {
  editingPage.value = null
  form.value = {
    title: '',
    slug: '',
    body: null,
    excerpt: '',
    status: 'draft',
    metaSeo: {},
    schemaOrg: [],
    tocEnabled: false,
  }
  activeTab.value = 'general'
  showEditor.value = true
}

function openEdit(page: Page) {
  editingPage.value = page
  form.value = {
    title: page.title,
    slug: page.slug,
    body: page.body,
    excerpt: page.excerpt ?? '',
    status: page.status as 'draft' | 'published' | 'archived',
    metaSeo: page.metaSeo ?? {},
    schemaOrg: page.schemaOrg ?? [],
    tocEnabled: page.tocEnabled ?? false,
  }
  activeTab.value = 'general'
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingPage.value = null
}

async function fetchPages() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/pages', { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    pages.value = data.pages ?? []
  } catch {
    error.value = 'Failed to load pages'
    pages.value = []
  } finally {
    loading.value = false
  }
}

async function savePage() {
  saving.value = true
  error.value = ''
  try {
    const payload: Record<string, unknown> = {
      title: form.value.title,
      slug: form.value.slug,
      body: form.value.body,
      excerpt: form.value.excerpt || null,
      status: form.value.status,
      metaSeo: form.value.metaSeo,
      schemaOrg: form.value.schemaOrg,
      tocEnabled: form.value.tocEnabled,
    }

    const url = isEditing.value ? `/api/pages/${editingPage.value!.id}` : '/api/pages'

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

    closeEditor()
    await fetchPages()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save page'
  } finally {
    saving.value = false
  }
}

async function deletePage(page: Page) {
  if (!confirm(`Delete "${page.title}"?`)) return
  try {
    const res = await fetch(`/api/pages/${page.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchPages()
  } catch {
    error.value = 'Failed to delete page'
  }
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(fetchPages)
</script>

<template>
  <div class="pages-view">
    <!-- List view -->
    <template v-if="!showEditor">
      <div class="page-header">
        <div>
          <h1>Pages</h1>
          <p class="subtitle">Manage standalone pages</p>
        </div>
        <button class="btn-primary" @click="openCreate">+ New Page</button>
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="page in pages" :key="page.id">
            <td class="cell-title">
              <a href="#" @click.prevent="openEdit(page)">{{ page.title }}</a>
            </td>
            <td class="cell-slug">{{ page.slug }}</td>
            <td><span class="badge" :class="page.status">{{ page.status }}</span></td>
            <td class="cell-date">{{ formatDate(page.createdAt) }}</td>
            <td class="cell-actions">
              <button class="btn-sm" @click="openEdit(page)">Edit</button>
              <button class="btn-sm btn-danger" @click="deletePage(page)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Editor view -->
    <template v-if="showEditor">
      <div class="page-header">
        <div>
          <h1>{{ formTitle }}</h1>
          <p class="subtitle">{{ isEditing ? `Editing: ${editingPage?.title}` : 'Create a new page' }}</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" :disabled="saving" @click="closeEditor">Cancel</button>
          <button class="btn-primary" :disabled="saving || !form.title || !form.slug" @click="savePage">
            {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>

      <div v-if="error" class="error-state" style="margin-bottom: 1rem">{{ error }}</div>

      <div class="editor-layout">
        <div class="editor-main">
          <div class="form-group">
            <label for="page-title">Title</label>
            <input
              id="page-title"
              v-model="form.title"
              type="text"
              placeholder="Page title"
              @input="onTitleInput"
            />
          </div>

          <div class="form-group">
            <label for="page-slug">Slug</label>
            <input
              id="page-slug"
              v-model="form.slug"
              type="text"
              placeholder="page-slug"
            />
          </div>

          <div class="form-group">
            <label>Content</label>
            <ContentEditor v-model="form.body" />
          </div>
        </div>

        <div class="editor-sidebar">
          <div class="sidebar-card">
            <div class="tabs">
              <button
                type="button"
                class="tab"
                :class="{ active: activeTab === 'general' }"
                @click="activeTab = 'general'"
              >General</button>
              <button
                type="button"
                class="tab"
                :class="{ active: activeTab === 'seo' }"
                @click="activeTab = 'seo'"
              >SEO</button>
            </div>

            <div v-if="activeTab === 'general'" class="tab-panel">
              <div class="form-group">
                <label for="page-status">Status</label>
                <select id="page-status" v-model="form.status">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div class="form-group">
                <label for="page-excerpt">Excerpt</label>
                <textarea
                  id="page-excerpt"
                  v-model="form.excerpt"
                  rows="3"
                  placeholder="Short summary of the page"
                />
              </div>

              <div class="form-group form-check">
                <label>
                  <input
                    type="checkbox"
                    v-model="form.tocEnabled"
                  />
                  Show table of contents
                </label>
                <small class="form-help">Auto-generate a TOC from H1–H6 headings above the page.</small>
              </div>
            </div>

            <div v-else-if="activeTab === 'seo'" class="tab-panel seo-panel">
              <MetaSeoEditor v-model="form.metaSeo" />
              <div class="seo-divider" />
              <SchemaOrgBuilder v-model="form.schemaOrg" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pages-view h1 { font-size: 1.75rem; margin: 0; }
.subtitle { color: #666; margin: 0.25rem 0 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.header-actions { display: flex; gap: 0.5rem; }

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
.btn-secondary:hover { background: #f9fafb; }

.btn-sm {
  padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;
  background: #fff; font-size: 0.8rem; cursor: pointer;
}
.btn-sm:hover { background: #f3f4f6; }
.btn-danger { color: #dc2626; border-color: #fca5a5; }
.btn-danger:hover { background: #fef2f2; }

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
.cell-title a { color: #1a56db; text-decoration: none; }
.cell-title a:hover { text-decoration: underline; }
.cell-slug { color: #888; font-size: 0.9rem; }
.cell-date { color: #888; font-size: 0.9rem; }
.cell-actions { display: flex; gap: 0.5rem; }
.badge { padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
.badge.published { background: #d1fae5; color: #065f46; }
.badge.draft { background: #fef3c7; color: #92400e; }
.badge.archived { background: #e5e7eb; color: #4b5563; }

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 480px;
  gap: 1.5rem;
  align-items: start;
  margin-bottom: 10rem;
}

.editor-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-card {
  background: #fff;
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}
.sidebar-card h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}
.tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}
.tab:hover { color: #1e293b; background: #f3f4f6; }
.tab.active {
  color: #1a56db;
  border-bottom-color: #1a56db;
  background: #fff;
}

.tab-panel { padding: 1.25rem; }
.tab-panel.seo-panel { display: flex; flex-direction: column; gap: 1rem; }
.seo-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0.25rem 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}
.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}
.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #fff;
  color: #1e293b;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a56db;
  box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1);
}
.form-group textarea {
  resize: vertical;
}
.form-check label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  cursor: pointer;
}
.form-check input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  margin: 0;
}
.form-help {
  font-size: 0.78rem;
  color: #6b7280;
  margin-top: 0.15rem;
}

@media (max-width: 900px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}
</style>
