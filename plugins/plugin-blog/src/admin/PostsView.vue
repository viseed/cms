<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Post {
  id: string
  title: string
  slug: string
  status: string
  publishedAt: string | null
  createdAt: string
}

const posts = ref<Post[]>([])
const loading = ref(true)
const error = ref('')

async function fetchPosts() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/blog/posts', { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    posts.value = data.posts ?? []
  } catch (err) {
    error.value = 'Failed to load posts'
    posts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchPosts)
</script>

<template>
  <div class="posts-view">
    <div class="page-header">
      <div>
        <h1>Posts</h1>
        <p class="subtitle">Manage blog posts</p>
      </div>
      <button class="btn-primary" disabled>+ New Post</button>
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
        </tr>
      </thead>
      <tbody>
        <tr v-for="post in posts" :key="post.id">
          <td class="cell-title">{{ post.title }}</td>
          <td class="cell-slug">{{ post.slug }}</td>
          <td><span class="badge" :class="post.status">{{ post.status }}</span></td>
          <td class="cell-date">{{ post.publishedAt ?? '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.posts-view h1 { font-size: 1.75rem; margin: 0; }
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
