<script setup lang="ts">
import type { MetaSeo, SchemaOrgItem } from '@hana/validator'
import { computed, onMounted, ref } from 'vue'

interface Post {
  id: string
  title: string
  slug: string
  body: string | null
  excerpt: string | null
  status: string
  categoryId: string | null
  metaSeo: MetaSeo | null
  schemaOrg: SchemaOrgItem[] | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

type SettingsTab = 'general' | 'seo'

interface Category {
  id: string
  name: string
  slug: string
}

const posts = ref<Post[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref('')
const showEditor = ref(false)
const saving = ref(false)
const editingPost = ref<Post | null>(null)

const form = ref({
  title: '',
  slug: '',
  body: null as string | null,
  excerpt: '',
  status: 'draft' as 'draft' | 'published' | 'archived',
  categoryId: '',
  metaSeo: {} as MetaSeo,
  schemaOrg: [] as SchemaOrgItem[],
})

const activeTab = ref<SettingsTab>('general')

const isEditing = computed(() => editingPost.value !== null)
const formTitle = computed(() => (isEditing.value ? 'Edit Post' : 'New Post'))

function slugify(text: string): string {
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
  editingPost.value = null
  form.value = {
    title: '',
    slug: '',
    body: null,
    excerpt: '',
    status: 'draft',
    categoryId: '',
    metaSeo: {},
    schemaOrg: [],
  }
  activeTab.value = 'general'
  showEditor.value = true
}

function openEdit(post: Post) {
  editingPost.value = post
  form.value = {
    title: post.title,
    slug: post.slug,
    body: post.body,
    excerpt: post.excerpt ?? '',
    status: post.status as 'draft' | 'published' | 'archived',
    categoryId: post.categoryId ?? '',
    metaSeo: post.metaSeo ?? {},
    schemaOrg: post.schemaOrg ?? [],
  }
  activeTab.value = 'general'
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingPost.value = null
}

async function fetchPosts() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/blog/posts', { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    posts.value = data.posts ?? []
  } catch {
    error.value = 'Failed to load posts'
    posts.value = []
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    const res = await fetch('/api/blog/categories', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    categories.value = data.categories ?? []
  } catch {
    // non-critical
  }
}

async function savePost() {
  saving.value = true
  error.value = ''
  try {
    const payload: Record<string, unknown> = {
      title: form.value.title,
      slug: form.value.slug,
      body: form.value.body,
      excerpt: form.value.excerpt || null,
      status: form.value.status,
      categoryId: form.value.categoryId || null,
      metaSeo: form.value.metaSeo,
      schemaOrg: form.value.schemaOrg,
    }

    const url = isEditing.value ? `/api/blog/posts/${editingPost.value!.id}` : '/api/blog/posts'

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
    await fetchPosts()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save post'
  } finally {
    saving.value = false
  }
}

async function deletePost(post: Post) {
  if (!confirm(`Delete "${post.title}"?`)) return
  try {
    const res = await fetch(`/api/blog/posts/${post.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchPosts()
  } catch {
    error.value = 'Failed to delete post'
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

onMounted(() => {
  fetchPosts()
  fetchCategories()
})
</script>

<template>
  <div class="posts-view">
    <!-- List view -->
    <template v-if="!showEditor">
      <div class="page-header">
        <div>
          <h1>Posts</h1>
          <p class="subtitle">Manage blog posts</p>
        </div>
        <button class="btn-primary" @click="openCreate">+ New Post</button>
      </div>

      <div v-if="loading" class="loading-state">Loading posts...</div>
      <div v-else-if="error" class="error-state">{{ error }}</div>
      <div v-else-if="posts.length === 0" class="empty-state">
        <p>No posts yet. Create your first blog post to get started.</p>
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Published</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in posts" :key="post.id">
            <td class="cell-title">
              <a href="#" @click.prevent="openEdit(post)">{{ post.title }}</a>
            </td>
            <td class="cell-slug">{{ post.slug }}</td>
            <td><span class="badge" :class="post.status">{{ post.status }}</span></td>
            <td class="cell-date">{{ formatDate(post.publishedAt) }}</td>
            <td class="cell-actions">
              <button class="btn-sm" @click="openEdit(post)">Edit</button>
              <button class="btn-sm btn-danger" @click="deletePost(post)">Delete</button>
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
          <p class="subtitle">{{ isEditing ? `Editing: ${editingPost?.title}` : 'Create a new blog post' }}</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" :disabled="saving" @click="closeEditor">Cancel</button>
          <button class="btn-primary" :disabled="saving || !form.title || !form.slug" @click="savePost">
            {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>

      <div v-if="error" class="error-state" style="margin-bottom: 1rem">{{ error }}</div>

      <div class="editor-layout">
        <div class="editor-main">
          <div class="form-group">
            <label for="post-title">Title</label>
            <input
              id="post-title"
              v-model="form.title"
              type="text"
              placeholder="Post title"
              @input="onTitleInput"
            />
          </div>

          <div class="form-group">
            <label for="post-slug">Slug</label>
            <input
              id="post-slug"
              v-model="form.slug"
              type="text"
              placeholder="post-slug"
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
                <label for="post-status">Status</label>
                <select id="post-status" v-model="form.status">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div class="form-group">
                <label for="post-category">Category</label>
                <select id="post-category" v-model="form.categoryId">
                  <option value="">No category</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="post-excerpt">Excerpt</label>
                <textarea
                  id="post-excerpt"
                  v-model="form.excerpt"
                  rows="3"
                  placeholder="Short summary of the post"
                />
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
.posts-view h1 { font-size: 1.75rem; margin: 0; }
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

@media (max-width: 900px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}
</style>
