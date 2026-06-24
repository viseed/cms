<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MenuItemRow from './MenuItemRow.vue'

interface MenuItem {
  id: string
  menuId: string
  parentId: string | null
  label: string
  url: string
  target: string
  sortOrder: number
}

interface MenuItemNode {
  id: string
  label: string
  url: string
  target: string
  sortOrder: number
  parentId: string | null
  children: MenuItemNode[]
  _isNew?: boolean
}

interface Menu {
  id: string
  name: string
  zone: string
  siteId: string
}

const ZONES = [
  { value: 'main', label: 'Main Navigation' },
  { value: 'footer', label: 'Footer Navigation' },
]

const menus = ref<Menu[]>([])
const selectedMenuId = ref<string | null>(null)
const flatItems = ref<MenuItem[]>([])
const treeItems = ref<MenuItemNode[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const showCreateMenu = ref(false)
const newMenuForm = ref({ name: '', zone: 'main' })
let tempItemCounter = 0

const selectedMenu = computed(() => menus.value.find((m) => m.id === selectedMenuId.value) ?? null)

function createTempItemId(): string {
  tempItemCounter += 1
  return `temp-menu-item-${Date.now()}-${tempItemCounter}`
}

function buildTree(items: MenuItem[]): MenuItemNode[] {
  const roots: MenuItemNode[] = []
  const byId = new Map<string, MenuItemNode>()

  for (const item of items) {
    byId.set(item.id, {
      id: item.id,
      label: item.label,
      url: item.url,
      target: item.target ?? '_self',
      sortOrder: item.sortOrder,
      parentId: item.parentId,
      children: [],
    })
  }

  for (const item of items) {
    const node = byId.get(item.id)
    if (!node) continue

    if (item.parentId) {
      const parent = byId.get(item.parentId)
      if (parent) {
        parent.children.push(node)
        continue
      }
    }

    roots.push(node)
  }

  return roots
}

function flattenTree(nodes: MenuItemNode[], parentId: string | null = null): MenuItemNode[] {
  const result: MenuItemNode[] = []
  nodes.forEach((node, idx) => {
    result.push({ ...node, parentId, sortOrder: idx, children: [] })
    result.push(...flattenTree(node.children, node.id))
  })
  return result
}

async function fetchMenus() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/menus', { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    menus.value = data.menus ?? []
    if (menus.value.length > 0 && !selectedMenuId.value) {
      selectedMenuId.value = menus.value[0].id
      await loadMenuItems(menus.value[0].id)
    }
  } catch {
    error.value = 'Failed to load menus'
  } finally {
    loading.value = false
  }
}

async function loadMenuItems(menuId: string) {
  error.value = ''
  try {
    const res = await fetch(`/api/menus/${menuId}/items`, { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    flatItems.value = data.items ?? []
    treeItems.value = buildTree(flatItems.value)
  } catch {
    error.value = 'Failed to load menu items'
    flatItems.value = []
    treeItems.value = []
  }
}

async function selectMenu(menuId: string) {
  selectedMenuId.value = menuId
  await loadMenuItems(menuId)
}

async function createMenu() {
  if (!newMenuForm.value.name || !newMenuForm.value.zone) return
  saving.value = true
  error.value = ''
  try {
    const res = await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newMenuForm.value),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    menus.value.push(data.menu)
    selectedMenuId.value = data.menu.id
    flatItems.value = []
    treeItems.value = []
    showCreateMenu.value = false
    newMenuForm.value = { name: '', zone: 'main' }
  } catch {
    error.value = 'Failed to create menu'
  } finally {
    saving.value = false
  }
}

async function deleteMenu(menu: Menu) {
  if (!confirm(`Delete menu "${menu.name}"? All its items will also be removed.`)) return
  try {
    const res = await fetch(`/api/menus/${menu.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    menus.value = menus.value.filter((m) => m.id !== menu.id)
    if (selectedMenuId.value === menu.id) {
      selectedMenuId.value = menus.value[0]?.id ?? null
      if (selectedMenuId.value) await loadMenuItems(selectedMenuId.value)
      else {
        flatItems.value = []
        treeItems.value = []
      }
    }
  } catch {
    error.value = 'Failed to delete menu'
  }
}

function addTopLevelItem() {
  treeItems.value.push({
    id: createTempItemId(),
    label: 'New Item',
    url: '/',
    target: '_self',
    sortOrder: treeItems.value.length,
    parentId: null,
    children: [],
    _isNew: true,
  })
}

function addChildItem(parent: MenuItemNode) {
  parent.children.push({
    id: createTempItemId(),
    label: 'New Sub-item',
    url: '/',
    target: '_self',
    sortOrder: parent.children.length,
    parentId: parent.id,
    children: [],
    _isNew: true,
  })
}

function removeItem(nodes: MenuItemNode[], target: MenuItemNode): boolean {
  const idx = nodes.indexOf(target)
  if (idx !== -1) {
    nodes.splice(idx, 1)
    return true
  }
  for (const node of nodes) {
    if (removeItem(node.children, target)) return true
  }
  return false
}

function moveUp(nodes: MenuItemNode[], item: MenuItemNode): boolean {
  const idx = nodes.indexOf(item)
  if (idx > 0) {
    nodes.splice(idx, 1)
    nodes.splice(idx - 1, 0, item)
    return true
  }
  for (const node of nodes) {
    if (moveUp(node.children, item)) return true
  }
  return false
}

function moveDown(nodes: MenuItemNode[], item: MenuItemNode): boolean {
  const idx = nodes.indexOf(item)
  if (idx !== -1 && idx < nodes.length - 1) {
    nodes.splice(idx, 1)
    nodes.splice(idx + 1, 0, item)
    return true
  }
  for (const node of nodes) {
    if (moveDown(node.children, item)) return true
  }
  return false
}

async function saveItems() {
  if (!selectedMenuId.value) return
  saving.value = true
  error.value = ''
  try {
    const flat = flattenTree(treeItems.value)
    const res = await fetch(`/api/menus/${selectedMenuId.value}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ items: flat }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    flatItems.value = data.items ?? []
    treeItems.value = buildTree(flatItems.value)
  } catch {
    error.value = 'Failed to save menu items'
  } finally {
    saving.value = false
  }
}

function getZoneLabel(zone: string): string {
  return ZONES.find((z) => z.value === zone)?.label ?? zone
}

onMounted(() => {
  fetchMenus()
})
</script>

<template>
  <div class="menus-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Menus</h1>
        <p class="subtitle">Manage navigation menus for your site</p>
      </div>
      <button class="btn-primary" @click="showCreateMenu = !showCreateMenu">
        {{ showCreateMenu ? 'Cancel' : '+ New Menu' }}
      </button>
    </div>

    <!-- Create menu form -->
    <div v-if="showCreateMenu" class="create-menu-card">
      <h3>Create New Menu</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Name</label>
          <input v-model="newMenuForm.name" type="text" placeholder="e.g. Main Navigation" />
        </div>
        <div class="form-group">
          <label>Zone</label>
          <select v-model="newMenuForm.zone">
            <option v-for="z in ZONES" :key="z.value" :value="z.value">{{ z.label }}</option>
          </select>
        </div>
        <button
          class="btn-primary"
          :disabled="saving || !newMenuForm.name"
          style="align-self:flex-end"
          @click="createMenu"
        >
          {{ saving ? 'Creating...' : 'Create' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-state">{{ error }}</div>

    <div v-if="loading" class="loading-state">Loading menus...</div>

    <div v-else-if="menus.length === 0" class="empty-state">
      <p>No menus yet. Create your first menu to get started.</p>
    </div>

    <div v-else class="menus-layout">
      <!-- Sidebar: menu list -->
      <aside class="menu-list-sidebar">
        <div
          v-for="menu in menus"
          :key="menu.id"
          class="menu-list-item"
          :class="{ active: selectedMenuId === menu.id }"
          @click="selectMenu(menu.id)"
        >
          <div class="menu-list-item-info">
            <span class="menu-name">{{ menu.name }}</span>
            <span class="menu-zone-badge">{{ getZoneLabel(menu.zone) }}</span>
          </div>
          <button
            class="btn-sm btn-danger"
            title="Delete menu"
            @click.stop="deleteMenu(menu)"
          >✕</button>
        </div>
      </aside>

      <!-- Main: menu item editor -->
      <div class="menu-editor">
        <div v-if="!selectedMenu" class="empty-state">
          Select a menu to edit
        </div>
        <template v-else>
          <div class="editor-header">
            <div>
              <h2>{{ selectedMenu.name }}</h2>
              <span class="menu-zone-badge large">{{ getZoneLabel(selectedMenu.zone) }}</span>
            </div>
            <div class="editor-actions">
              <button class="btn-secondary" @click="addTopLevelItem">+ Add Item</button>
              <button class="btn-primary" :disabled="saving" @click="saveItems">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>

          <div v-if="treeItems.length === 0" class="empty-state">
            <p>No items yet. Click "Add Item" to start building the menu.</p>
          </div>

          <div v-else class="item-tree">
            <MenuItemRow
              v-for="item in treeItems"
              :key="item.id"
              :item="item"
              :depth="0"
              @remove="removeItem(treeItems, $event)"
              @move-up="moveUp(treeItems, $event)"
              @move-down="moveDown(treeItems, $event)"
              @add-child="addChildItem"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menus-view h1 { font-size: 1.75rem; margin: 0; }
.subtitle { color: #666; margin: 0.25rem 0 0; }
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;
}

.create-menu-card {
  background: #fff; border-radius: 12px; padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 1.5rem;
}
.create-menu-card h3 { margin: 0 0 1rem; font-size: 1rem; }
.form-row { display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
.form-group { display: flex; flex-direction: column; gap: 0.35rem; min-width: 180px; flex: 1; }
.form-group label { font-size: 0.85rem; font-weight: 500; color: #374151; }
.form-group input,
.form-group select {
  padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 0.9rem; background: #fff; color: #1e293b;
}
.form-group input:focus, .form-group select:focus {
  outline: none; border-color: #1a56db; box-shadow: 0 0 0 3px rgba(26,86,219,0.1);
}

.btn-primary {
  padding: 0.5rem 1rem; border-radius: 8px; border: none;
  background: #1a56db; color: #fff; font-weight: 500; cursor: pointer; white-space: nowrap;
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
.empty-state p { margin: 0; }

.menus-layout {
  display: grid; grid-template-columns: 260px 1fr; gap: 1.5rem; align-items: start;
}

.menu-list-sidebar {
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.menu-list-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}
.menu-list-item:last-child { border-bottom: none; }
.menu-list-item:hover { background: #f9fafb; }
.menu-list-item.active { background: #eff6ff; border-left: 3px solid #1a56db; }
.menu-list-item-info { display: flex; flex-direction: column; gap: 0.2rem; }
.menu-name { font-weight: 500; font-size: 0.9rem; }

.menu-zone-badge {
  display: inline-block; padding: 0.1rem 0.45rem; border-radius: 9999px;
  font-size: 0.7rem; font-weight: 500; background: #e0e7ff; color: #3730a3;
}
.menu-zone-badge.large { font-size: 0.8rem; padding: 0.2rem 0.6rem; }

.menu-editor {
  background: #fff; border-radius: 12px; padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.editor-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;
}
.editor-header h2 { margin: 0 0 0.3rem; font-size: 1.1rem; }
.editor-actions { display: flex; gap: 0.5rem; }
.item-tree { display: flex; flex-direction: column; gap: 0.5rem; }

@media (max-width: 768px) {
  .menus-layout { grid-template-columns: 1fr; }
}
</style>
