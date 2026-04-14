<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string | null
}

interface CarouselItem {
  id?: string
  postId: string
  imageUrl: string
  sortOrder: number
  active: string
  _postTitle?: string
}

const carouselItems = ref<CarouselItem[]>([])
const availablePosts = ref<Post[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

function getPostTitle(postId: string): string {
  return availablePosts.value.find((p) => p.id === postId)?.title ?? postId
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [carouselRes, postsRes] = await Promise.all([
      fetch('/api/theme/insurance/carousel', { credentials: 'include' }),
      fetch('/api/theme/insurance/carousel/posts', { credentials: 'include' }),
    ])

    if (!carouselRes.ok) throw new Error('Failed to load carousel')
    if (!postsRes.ok) throw new Error('Failed to load posts')

    const carouselData = await carouselRes.json()
    const postsData = await postsRes.json()

    availablePosts.value = postsData.posts ?? []
    carouselItems.value = (carouselData.items ?? []).map((item: CarouselItem) => ({
      ...item,
      imageUrl: item.imageUrl ?? '',
    }))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data'
  } finally {
    loading.value = false
  }
}

function addItem() {
  carouselItems.value.push({
    postId: availablePosts.value[0]?.id ?? '',
    imageUrl: '',
    sortOrder: carouselItems.value.length,
    active: '1',
  })
}

function removeItem(index: number) {
  carouselItems.value.splice(index, 1)
  carouselItems.value.forEach((item, i) => {
    item.sortOrder = i
  })
}

function moveUp(index: number) {
  if (index === 0) return
  const items = carouselItems.value
  ;[items[index - 1], items[index]] = [items[index], items[index - 1]]
  items.forEach((item, i) => {
    item.sortOrder = i
  })
}

function moveDown(index: number) {
  const items = carouselItems.value
  if (index >= items.length - 1) return
  ;[items[index], items[index + 1]] = [items[index + 1], items[index]]
  items.forEach((item, i) => {
    item.sortOrder = i
  })
}

async function saveCarousel() {
  saving.value = true
  error.value = ''
  try {
    const payload = carouselItems.value.map((item, i) => ({
      ...item,
      sortOrder: i,
      imageUrl: item.imageUrl || null,
    }))

    const res = await fetch('/api/theme/insurance/carousel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ items: payload }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? `HTTP ${res.status}`)
    }

    const data = await res.json()
    carouselItems.value = (data.items ?? []).map((item: CarouselItem) => ({
      ...item,
      imageUrl: item.imageUrl ?? '',
    }))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="carousel-view">
    <div class="page-header">
      <div>
        <h1>Home Carousel</h1>
        <p class="subtitle">
          Manage featured insurance products displayed in the home page carousel
        </p>
      </div>
      <div class="header-actions">
        <button
          class="btn-secondary"
          :disabled="availablePosts.length === 0"
          @click="addItem"
        >
          + Add Product
        </button>
        <button class="btn-primary" :disabled="saving" @click="saveCarousel">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-state">{{ error }}</div>
    <div v-if="loading" class="loading-state">Loading...</div>

    <template v-else>
      <div v-if="availablePosts.length === 0" class="info-banner">
        <p>
          No published posts found. Please create and publish posts via
          <strong>Posts</strong> to use them in the carousel.
        </p>
      </div>

      <div v-if="carouselItems.length === 0" class="empty-state">
        <p>No carousel items yet. Click "+ Add Product" to add featured insurance products.</p>
      </div>

      <div v-else class="carousel-list">
        <div
          v-for="(item, index) in carouselItems"
          :key="item.id ?? index"
          class="carousel-card"
        >
          <div class="card-order">
            <span class="order-badge">{{ index + 1 }}</span>
            <div class="order-btns">
              <button class="btn-sm" :disabled="index === 0" title="Move up" @click="moveUp(index)">↑</button>
              <button
                class="btn-sm"
                :disabled="index === carouselItems.length - 1"
                title="Move down"
                @click="moveDown(index)"
              >↓</button>
            </div>
          </div>

          <div class="card-fields">
            <div class="form-group">
              <label>Post</label>
              <select v-model="item.postId">
                <option v-for="post in availablePosts" :key="post.id" :value="post.id">
                  {{ post.title }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Image URL</label>
              <input
                v-model="item.imageUrl"
                type="text"
                placeholder="https://example.com/image.jpg or /uploads/image.jpg"
              />
            </div>

            <div class="form-group form-group-inline">
              <label>
                <input v-model="item.active" type="checkbox" true-value="1" false-value="0" />
                Active (show in carousel)
              </label>
            </div>
          </div>

          <div class="card-preview" v-if="item.imageUrl">
            <img :src="item.imageUrl" :alt="getPostTitle(item.postId)" />
          </div>
          <div v-else class="card-preview card-preview--empty">
            <span>No image</span>
          </div>

          <button class="btn-remove" title="Remove" @click="removeItem(index)">✕</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.carousel-view h1 { font-size: 1.75rem; margin: 0; }
.subtitle { color: #666; margin: 0.25rem 0 0; }
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;
}
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
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary:hover:not(:disabled) { background: #f9fafb; }
.btn-sm {
  padding: 0.2rem 0.45rem; border-radius: 6px; border: 1px solid #d1d5db;
  background: #fff; font-size: 0.78rem; cursor: pointer;
}
.btn-sm:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-sm:hover:not(:disabled) { background: #f3f4f6; }

.loading-state, .error-state, .empty-state {
  background: #fff; padding: 3rem; border-radius: 12px; text-align: center;
  color: #999; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.error-state { color: #c53030; }
.empty-state p { margin: 0; }

.info-banner {
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
  padding: 1rem 1.25rem; margin-bottom: 1rem; color: #1e40af; font-size: 0.9rem;
}
.info-banner p { margin: 0; }

.carousel-list { display: flex; flex-direction: column; gap: 1rem; }

.carousel-card {
  display: flex; align-items: flex-start; gap: 1rem;
  background: #fff; border-radius: 12px; padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08); position: relative;
}

.card-order {
  display: flex; flex-direction: column; align-items: center; gap: 0.35rem; flex-shrink: 0;
}
.order-badge {
  width: 28px; height: 28px; border-radius: 50%; background: #e0e7ff; color: #3730a3;
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;
}
.order-btns { display: flex; flex-direction: column; gap: 0.2rem; }

.card-fields { flex: 1; display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.75rem; align-items: start; }

.form-group { display: flex; flex-direction: column; gap: 0.3rem; }
.form-group label { font-size: 0.82rem; font-weight: 500; color: #374151; }
.form-group input,
.form-group select {
  padding: 0.45rem 0.65rem; border: 1px solid #d1d5db; border-radius: 7px;
  font-size: 0.87rem; background: #fff;
}
.form-group input:focus, .form-group select:focus {
  outline: none; border-color: #1a56db;
}
.form-group-inline { justify-content: flex-end; padding-top: 1.4rem; }
.form-group-inline label { display: flex; align-items: center; gap: 0.4rem; font-weight: 400; cursor: pointer; }

.card-preview {
  width: 100px; height: 75px; border-radius: 8px; overflow: hidden; flex-shrink: 0;
  background: #f3f4f6; border: 1px solid #e5e7eb;
}
.card-preview img { width: 100%; height: 100%; object-fit: cover; }
.card-preview--empty {
  display: flex; align-items: center; justify-content: center;
  color: #aaa; font-size: 0.78rem;
}

.btn-remove {
  position: absolute; top: 0.75rem; right: 0.75rem;
  padding: 0.2rem 0.45rem; border-radius: 6px; border: 1px solid #fca5a5;
  background: #fff; color: #dc2626; font-size: 0.78rem; cursor: pointer;
}
.btn-remove:hover { background: #fef2f2; }

@media (max-width: 768px) {
  .card-fields { grid-template-columns: 1fr; }
}
</style>
