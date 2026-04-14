<script setup lang="ts">
interface MenuItemNode {
  id?: string
  label: string
  url: string
  target: string
  sortOrder: number
  parentId: string | null
  children: MenuItemNode[]
  _isNew?: boolean
}

const props = defineProps<{
  item: MenuItemNode
  depth: number
}>()

const emit = defineEmits<{
  remove: [item: MenuItemNode]
  moveUp: [item: MenuItemNode]
  moveDown: [item: MenuItemNode]
  addChild: [item: MenuItemNode]
}>()
</script>

<template>
  <div class="item-row-wrap" :style="{ marginLeft: `${depth * 24}px` }">
    <div class="item-row">
      <span class="drag-handle">⋮⋮</span>
      <div class="item-fields">
        <input v-model="props.item.label" type="text" placeholder="Label" class="field-label" />
        <input v-model="props.item.url" type="text" placeholder="URL e.g. /about" class="field-url" />
        <select v-model="props.item.target" class="field-target">
          <option value="_self">Same tab</option>
          <option value="_blank">New tab</option>
        </select>
      </div>
      <div class="item-actions">
        <button class="btn-sm" title="Move up" @click="emit('moveUp', props.item)">↑</button>
        <button class="btn-sm" title="Move down" @click="emit('moveDown', props.item)">↓</button>
        <button
          v-if="depth < 2"
          class="btn-sm"
          title="Add sub-item"
          @click="emit('addChild', props.item)"
        >+ Sub</button>
        <button class="btn-sm btn-danger" title="Remove" @click="emit('remove', props.item)">✕</button>
      </div>
    </div>

    <!-- Recursive children -->
    <MenuItemRow
      v-for="child in props.item.children"
      :key="child.id ?? child.label + child.sortOrder"
      :item="child"
      :depth="depth + 1"
      @remove="emit('remove', $event)"
      @move-up="emit('moveUp', $event)"
      @move-down="emit('moveDown', $event)"
      @add-child="emit('addChild', $event)"
    />
  </div>
</template>

<style scoped>
.item-row-wrap { display: flex; flex-direction: column; gap: 0.4rem; }
.item-row {
  display: flex; align-items: center; gap: 0.5rem;
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem 0.75rem;
}
.drag-handle { color: #aaa; cursor: grab; font-size: 1rem; user-select: none; }
.item-fields { display: flex; gap: 0.5rem; flex: 1; flex-wrap: wrap; }
.field-label { flex: 2; min-width: 120px; }
.field-url { flex: 3; min-width: 160px; }
.field-target { flex: 1; min-width: 100px; }
.item-fields input,
.item-fields select {
  padding: 0.35rem 0.6rem; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 0.85rem; background: #fff;
}
.item-fields input:focus, .item-fields select:focus {
  outline: none; border-color: #1a56db;
}
.item-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
.btn-sm {
  padding: 0.25rem 0.45rem; border-radius: 6px; border: 1px solid #d1d5db;
  background: #fff; font-size: 0.78rem; cursor: pointer; white-space: nowrap;
}
.btn-sm:hover { background: #f3f4f6; }
.btn-danger { color: #dc2626; border-color: #fca5a5; }
.btn-danger:hover { background: #fef2f2; }
</style>
