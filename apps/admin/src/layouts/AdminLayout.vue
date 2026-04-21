<script setup lang="ts">
import type { Permission } from '@hana/types'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminSiteContext } from '../composables/useAdminSiteContext'

type NavMeta = {
  requiresAuth?: boolean
  requiredPermissions?: Permission[]
  navigation?: { label: string; icon: string }
  platformOnly?: boolean
  siteScoped?: boolean
  order?: number
  pluginName?: string
}

const router = useRouter()

const {
  loading,
  switching,
  error,
  switchError,
  degraded,
  displayActiveSite,
  accessibleSites,
  permissions,
  userLabel,
  ensureLoaded,
  logout,
  refresh,
  switchSite,
} = useAdminSiteContext()

function navAllowed(meta: NavMeta): boolean {
  const granted = new Set(permissions.value)
  const required = meta.requiredPermissions ?? []
  for (const p of required) {
    if (!granted.has(p)) return false
  }
  if (meta.platformOnly === true) {
    if (!permissions.value.some((p) => p.startsWith('platform.'))) return false
  }
  return true
}

const navItems = computed(() => {
  const routes = router.getRoutes()
  const items: Array<{ path: string; label: string; icon: string; order: number }> = []
  for (const r of routes) {
    const meta = r.meta as NavMeta
    if (!meta?.navigation) continue
    if (!navAllowed(meta)) continue
    if (!r.path) continue
    const path = r.path.startsWith('/') ? r.path : `/${r.path}`
    items.push({
      path,
      label: meta.navigation.label,
      icon: meta.navigation.icon,
      order: meta.order ?? 50,
    })
  }
  items.sort((a, b) => a.order - b.order)
  return items
})

function isNavActive(path: string): boolean {
  const current = router.currentRoute.value.path
  if (path === '/') {
    return current === '/' || current === ''
  }
  if (path === '/themes') {
    return current === '/themes' || /^\/themes\/[^/]+\/settings/.test(current)
  }
  return current === path || current.startsWith(`${path}/`)
}

function onSelectSite(event: Event) {
  const el = event.target as HTMLSelectElement
  const id = el.value
  if (id) void switchSite(id)
}

async function handleLogout() {
  await logout()
  await router.push('/login')
}

async function handleClickMenuItem(event: MouseEvent, path: string) {
  if (event.ctrlKey || event.metaKey) {
    const routeData = router.resolve(path);
    window.open(routeData.href, '_blank')
    return
  }
  await router.push(path)
}

onMounted(() => {
  void ensureLoaded()
})
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="logo">
        <h2>Hana CMS</h2>
      </div>
      <nav>
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="nav-item"
          :class="{ active: isNavActive(item.path) }"
          @click="handleClickMenuItem($event, item.path)"
        >
          <span class="icon">{{ item.icon }}</span>
          {{ item.label }}
        </button>
      </nav>
    </aside>

    <div class="column">
      <header class="top-bar">
        <div class="top-bar-inner">
          <div class="context-block">
            <span class="label">Site</span>
            <div class="site-control">
              <select
                class="site-select"
                :value="displayActiveSite.id"
                :disabled="switching || loading || accessibleSites.length <= 1"
                :aria-busy="switching"
                @change="onSelectSite"
              >
                <option v-for="s in accessibleSites" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ s.slug }})
                </option>
              </select>
              <span v-if="switching" class="inline-status">Switching…</span>
            </div>
            <p v-if="switchError" class="field-error">{{ switchError }}</p>
          </div>

          <div class="user-block">
            <span class="label">Signed in</span>
            <span class="user-name">{{ userLabel }}</span>
          </div>

          <div class="actions">
            <button
              type="button"
              class="btn-icon"
              title="Refresh context"
              :disabled="loading"
              @click="refresh"
            >
              ↻
            </button>
            <button type="button" class="btn-logout" @click="handleLogout">Sign out</button>
          </div>
        </div>

        <div v-if="loading && !degraded" class="loading-strip" aria-hidden="true">
          <span class="loading-bar" />
        </div>

        <p v-if="error && !degraded" class="banner error">{{ error }}</p>
        <p v-if="degraded" class="banner warn">
          Could not load admin session. Check that you are signed in and the API is reachable.
          <span v-if="error" class="detail">{{ error }}</span>
        </p>
      </header>

      <main class="main-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 1.5rem 0;
  flex-shrink: 0;
}

.logo {
  padding: 0 1.5rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h2 {
  color: #fff;
  font-size: 1.25rem;
}

nav {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  color: #a0a0b0;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.15s ease;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-right: 3px solid #6c63ff;
}

.icon {
  font-size: 1.1rem;
}

.column {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-bar {
  background: #fff;
  border-bottom: 1px solid #e8e8ec;
  flex-shrink: 0;
}

.top-bar-inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.85rem 2rem;
  flex-wrap: wrap;
}

.context-block,
.user-block {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  font-weight: 600;
}

.site-control {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.site-select {
  min-width: 200px;
  max-width: 280px;
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  border: 1px solid #d8d8e0;
  font-size: 0.875rem;
  color: #1a1a2e;
  background: #fafafa;
}

.site-select:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.inline-status {
  font-size: 0.8rem;
  color: #6c63ff;
}

.field-error {
  font-size: 0.75rem;
  color: #c41e3a;
  margin: 0;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a2e;
}

.btn-icon {
  align-self: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 8px;
  border: 1px solid #e0e0e8;
  background: #fafafa;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  color: #555;
  transition: background 0.15s ease;
}

.actions {
  align-self: center;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon:hover:not(:disabled) {
  background: #f0f0f4;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-logout {
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 8px;
  border: 1px solid #e0e0e8;
  background: #fff;
  color: #374151;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-logout:hover {
  background: #f5f5f8;
}

.loading-strip {
  height: 2px;
  background: #f0f0f4;
  overflow: hidden;
}

.loading-bar {
  display: block;
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, #6c63ff, transparent);
  animation: slide 1.1s ease-in-out infinite;
}

@keyframes slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}

.banner {
  margin: 0 2rem 0.75rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
}

.banner.error {
  background: #fff0f0;
  color: #9b1c1c;
  border: 1px solid #f5c2c2;
}

.banner.warn {
  background: #fff8e6;
  color: #7a5a00;
  border: 1px solid #f5e0a0;
}

.banner .detail {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.75rem;
  opacity: 0.9;
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
</style>
