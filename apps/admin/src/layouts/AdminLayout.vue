<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navItems = [
  { label: 'Dashboard', path: '/', icon: '◫' },
  { label: 'Content', path: '/content', icon: '✎' },
  { label: 'Media', path: '/media', icon: '⬡' },
  { label: 'Plugins', path: '/plugins', icon: '⚙' },
  { label: 'Themes', path: '/themes', icon: '◈' },
]
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
          class="nav-item"
          :class="{ active: router.currentRoute.value.path === item.path }"
          @click="router.push(item.path)"
        >
          <span class="icon">{{ item.icon }}</span>
          {{ item.label }}
        </button>
      </nav>
    </aside>
    <main class="main-content">
      <slot />
    </main>
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

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
</style>
