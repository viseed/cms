<script setup lang="ts">
import { ref } from 'vue'
import RolesTab from './RolesTab.vue'
import UsersTab from './UsersTab.vue'

const activeTab = ref<'users' | 'roles'>('users')
</script>

<template>
  <div class="users-roles-view">
    <div class="view-header">
      <div>
        <h1>Users &amp; Roles</h1>
        <p class="subtitle">Manage platform users, role assignments, and permissions</p>
      </div>
    </div>

    <div class="tabs">
      <button
        type="button"
        class="tab"
        :class="{ 'is-active': activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        Users
      </button>
      <button
        type="button"
        class="tab"
        :class="{ 'is-active': activeTab === 'roles' }"
        @click="activeTab = 'roles'"
      >
        Roles
      </button>
    </div>

    <UsersTab v-if="activeTab === 'users'" />
    <RolesTab v-else />
  </div>
</template>

<style scoped>
.users-roles-view {
  padding: 2rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.view-header h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.tab {
  padding: 0.6rem 1rem;
  border: none;
  background: none;
  font-size: 0.95rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab.is-active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}
</style>
