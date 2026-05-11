<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Config {
  count?: number
  categorySlug?: string
  title?: string
}

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string | null
  publishedAt: string | null
}

const props = defineProps<{ config: Config }>()

const posts = ref<Post[]>([])
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    const params = new URLSearchParams()
    params.set('limit', String(props.config.count ?? 5))
    if (props.config.categorySlug) params.set('category', props.config.categorySlug)

    const res = await fetch(`/api/blog/posts?${params}`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    posts.value = data.posts ?? data ?? []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="latest-posts-widget">
    <h2 v-if="config.title" class="widget-title">{{ config.title }}</h2>
    <p v-if="loading" class="widget-loading">Loading…</p>
    <p v-else-if="error" class="widget-error">Could not load posts.</p>
    <ul v-else class="posts-list">
      <li v-for="post in posts" :key="post.id" class="post-item">
        <a :href="`/post/${post.slug}`" class="post-link">{{ post.title }}</a>
        <p v-if="post.excerpt" class="post-excerpt">{{ post.excerpt }}</p>
      </li>
    </ul>
    <p v-if="!loading && !error && posts.length === 0" class="widget-empty">No posts found.</p>
  </section>
</template>

<style scoped>
.latest-posts-widget {
  padding: 1rem 0;
}

.widget-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.widget-loading,
.widget-error,
.widget-empty {
  color: #9ca3af;
  font-size: 0.875rem;
}

.posts-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-item {
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 1rem;
}
.post-item:last-child {
  border-bottom: none;
}

.post-link {
  font-weight: 500;
  color: #111827;
  text-decoration: none;
}
.post-link:hover {
  text-decoration: underline;
}

.post-excerpt {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}
</style>
