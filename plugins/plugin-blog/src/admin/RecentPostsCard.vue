<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Post {
  id: string
  title: string
  status: string
  publishedAt: string | null
  updatedAt: string
}

const posts = ref<Post[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/api/blog/posts', { credentials: 'include' })
    if (!res.ok) throw new Error(await res.text())
    const { posts: data }: { posts: Post[] } = await res.json()
    posts.value = [...data]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load posts'
  } finally {
    loading.value = false
  }
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}
</script>

<template>
  <div class="recent-posts-card">
    <header class="card-header">
      <h3>Recent Posts</h3>
      <span class="count">{{ posts.length }}</span>
    </header>

    <p v-if="loading" class="state">Loading…</p>
    <p v-else-if="error" class="state error">{{ error }}</p>
    <p v-else-if="posts.length === 0" class="state">No posts yet.</p>

    <ul v-else class="post-list">
      <li v-for="post in posts" :key="post.id" class="post-row">
        <span class="post-title" :title="post.title">{{ post.title }}</span>
        <span class="post-meta">
          <span class="status" :class="post.status">{{ post.status }}</span>
          <span class="date">{{ formatDate(post.publishedAt ?? post.updatedAt) }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.recent-posts-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.card-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 9999px;
  padding: 0.1rem 0.5rem;
}

.state {
  color: #9ca3af;
  font-size: 0.85rem;
}
.state.error {
  color: #dc2626;
}

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow: auto;
}

.post-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.825rem;
}

.post-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #374151;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status {
  font-size: 0.7rem;
  text-transform: capitalize;
  color: #6b7280;
}
.status.published {
  color: #059669;
}

.date {
  font-size: 0.7rem;
  color: #9ca3af;
}
</style>
