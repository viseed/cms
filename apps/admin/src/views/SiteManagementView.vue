<script setup lang="ts">
import { computed } from 'vue'
import { useAdminSiteContext } from '../composables/useAdminSiteContext'

const { displayActiveSite, accessibleSites, loading, error, degraded, refresh, payload } =
  useAdminSiteContext()

const siteRows = computed(() => {
  const list = accessibleSites.value
  const activeId = displayActiveSite.value.id
  return list.map((s) => ({
    ...s,
    isActive: s.id === activeId,
  }))
})
</script>

<template>
  <div class="site-mgmt">
    <header class="page-head">
      <div>
        <h1>Sites</h1>
        <p class="subtitle">Platform scope — create and map domains in a future release.</p>
      </div>
      <button type="button" class="btn-refresh" :disabled="loading" @click="refresh">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    <p v-if="degraded" class="banner warn">
      Admin session could not be loaded. Fix authentication or API connectivity before managing sites.
    </p>
    <p v-else-if="error && payload" class="banner err">{{ error }}</p>

    <div class="panel">
      <h2>Accessible sites</h2>
      <p class="hint">
        Active site for this session is highlighted. Use the header switcher to change context when multiple
        sites are available.
      </p>

      <div v-if="loading && siteRows.length === 0" class="empty">Loading sites…</div>

      <ul v-else class="site-list">
        <li v-for="row in siteRows" :key="row.id" class="site-row" :class="{ active: row.isActive }">
          <div class="site-main">
            <span class="name">{{ row.name }}</span>
            <span class="slug">/{{ row.slug }}</span>
            <span v-if="row.isDefault" class="pill default">default</span>
            <span v-if="row.isActive" class="pill active">active</span>
          </div>
          <code class="id">{{ row.id }}</code>
        </li>
      </ul>

      <p v-if="!loading && siteRows.length === 0" class="empty">No sites returned for your account.</p>
    </div>
  </div>
</template>

<style scoped>
.site-mgmt {
  max-width: 720px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
  color: #1a1a2e;
}

.subtitle {
  color: #666;
  font-size: 0.95rem;
}

.btn-refresh {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  color: #333;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: #f3f4f6;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.banner {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.banner.warn {
  background: #fff8e6;
  color: #7a5a00;
  border: 1px solid #f5e0a0;
}

.banner.err {
  background: #fff0f0;
  color: #9b1c1c;
  border: 1px solid #f5c2c2;
}

.panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
}

.panel h2 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #1a1a2e;
}

.hint {
  color: #666;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.site-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.site-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  border: 1px solid #e8e8ec;
  background: #fafafa;
}

.site-row.active {
  border-color: #c4bfff;
  background: #f5f3ff;
}

.site-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.name {
  font-weight: 600;
  color: #1a1a2e;
}

.slug {
  color: #888;
  font-size: 0.875rem;
}

.pill {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}

.pill.default {
  background: #e8e8ec;
  color: #555;
}

.pill.active {
  background: #6c63ff;
  color: #fff;
}

.id {
  font-size: 0.75rem;
  color: #888;
  background: rgba(0, 0, 0, 0.04);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.empty {
  color: #888;
  font-size: 0.9rem;
  padding: 1rem 0;
}
</style>
