<script setup lang="ts">
import type { Permission, RoleSummary } from '@viseed/types'
import { computed, onMounted, ref } from 'vue'
import { useAdminAuthContext } from '../composables/useAdminAuthContext'
import { adminFetch } from '../lib/admin-api'

const { permissions: actorPermissions } = useAdminAuthContext()

const roles = ref<RoleSummary[]>([])
const allPermissions = ref<Permission[]>([])
const loading = ref(true)
const error = ref('')

const showModal = ref(false)
const editingRole = ref<RoleSummary | null>(null)
const saving = ref(false)
const busyRole = ref<string | null>(null)

const form = ref({
  slug: '',
  name: '',
  description: '',
  permissions: [] as string[],
})

const canManage = computed(() => actorPermissions.value.includes('platform.users.manage'))

// The admin role is always full access and its permission set cannot be edited.
const isPermissionsLocked = computed(() => editingRole.value?.slug === 'admin')

async function loadRoles() {
  try {
    const res = await adminFetch('/api/admin/roles')
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    roles.value = data.roles ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load roles'
  }
}

async function loadPermissions() {
  try {
    const res = await adminFetch('/api/admin/permissions')
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    allPermissions.value = data.permissions ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load permissions'
  }
}

onMounted(async () => {
  await Promise.all([loadRoles(), loadPermissions()])
  loading.value = false
})

function openCreate() {
  editingRole.value = null
  form.value = { slug: '', name: '', description: '', permissions: [] }
  error.value = ''
  showModal.value = true
}

function openEdit(role: RoleSummary) {
  editingRole.value = role
  form.value = {
    slug: role.slug,
    name: role.name,
    description: role.description ?? '',
    permissions: [...role.permissions],
  }
  error.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function togglePermission(permission: string, checked: boolean) {
  if (checked) {
    if (!form.value.permissions.includes(permission)) {
      form.value.permissions.push(permission)
    }
  } else {
    form.value.permissions = form.value.permissions.filter((p) => p !== permission)
  }
}

async function saveRole() {
  const name = form.value.name.trim()
  if (!name) {
    error.value = 'Role name is required.'
    return
  }

  saving.value = true
  error.value = ''
  try {
    const isEdit = editingRole.value !== null
    const url = isEdit ? `/api/admin/roles/${editingRole.value!.slug}` : '/api/admin/roles'
    const method = isEdit ? 'PUT' : 'POST'

    const body: Record<string, unknown> = {
      name,
      description: form.value.description.trim() || null,
    }
    if (!isEdit) body.slug = form.value.slug.trim()
    // Don't send a locked permission set for the admin role.
    if (!isPermissionsLocked.value) body.permissions = form.value.permissions

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    await loadRoles()
    closeModal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save role'
  } finally {
    saving.value = false
  }
}

async function deleteRole(role: RoleSummary) {
  if (!confirm(`Delete role "${role.name}"?`)) return
  busyRole.value = role.slug
  error.value = ''
  try {
    const res = await adminFetch(`/api/admin/roles/${role.slug}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    await loadRoles()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete role'
  } finally {
    busyRole.value = null
  }
}
</script>

<template>
  <div class="roles-tab">
    <div class="tab-actions">
      <button v-if="canManage" class="btn-primary" @click="openCreate">New Role</button>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div v-if="loading" class="loading-state">Loading roles…</div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Role</th>
          <th>Permissions</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="role in roles" :key="role.slug">
          <td class="cell-name">
            {{ role.name }}
            <span class="slug">{{ role.slug }}</span>
            <span v-if="role.isSystem" class="badge badge-system">System</span>
          </td>
          <td class="cell-perms">
            <span class="muted">{{ role.permissions.length }} permission(s)</span>
          </td>
          <td class="cell-actions">
            <template v-if="canManage">
              <button class="btn-icon" title="Edit" @click="openEdit(role)">✎</button>
              <button
                class="btn-icon btn-danger"
                title="Delete"
                :disabled="role.isSystem || busyRole === role.slug"
                @click="deleteRole(role)"
              >
                ✕
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-overlay" @mousedown.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingRole ? 'Edit Role' : 'New Role' }}</h2>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="error" class="error-banner">{{ error }}</div>

          <div v-if="!editingRole" class="field">
            <label>Slug <span class="required">*</span></label>
            <input
              v-model="form.slug"
              type="text"
              class="input"
              placeholder="e.g. editor (lowercase, - or _)"
            />
          </div>

          <div class="field">
            <label>Name <span class="required">*</span></label>
            <input v-model="form.name" type="text" class="input" placeholder="e.g. Editor" />
          </div>

          <div class="field">
            <label>Description</label>
            <input v-model="form.description" type="text" class="input" placeholder="Optional" />
          </div>

          <div class="field">
            <label>Permissions</label>
            <p v-if="isPermissionsLocked" class="locked-note">
              The admin role always has full access and cannot be narrowed.
            </p>
            <div v-else class="permissions-grid">
              <label
                v-for="permission in allPermissions"
                :key="permission"
                class="permission-item"
              >
                <input
                  type="checkbox"
                  :checked="form.permissions.includes(permission)"
                  @change="togglePermission(permission, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ permission }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn-primary" :disabled="saving" @click="saveRole">
            {{ saving ? 'Saving…' : 'Save Role' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.loading-state {
  color: #666;
  padding: 2rem 0;
  text-align: center;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th {
  text-align: left;
  padding: 0.5rem 1rem;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.cell-name {
  font-weight: 500;
}

.slug {
  color: #9ca3af;
  font-size: 0.8rem;
  margin-left: 0.5rem;
  font-family: monospace;
}

.muted {
  color: #9ca3af;
}

.cell-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 0.5rem;
}

.badge-system {
  background: #ede9fe;
  color: #6d28d9;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-icon {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: #374151;
  transition: all 0.15s;
}
.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
}
.btn-icon.btn-danger:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fca5a5;
}
.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: white;
  border-radius: 10px;
  width: 540px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #9ca3af;
}
.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.field {
  margin-bottom: 1.25rem;
}

.field label {
  /* display: block; */
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.375rem;
}

.required {
  color: #dc2626;
}

.input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;

}
.input:focus {
  outline: none;
  border-color: #2563eb;
}

.locked-note {
  color: #6b7280;
  font-size: 0.85rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
}

.permissions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-top: 0.5rem;
  gap: 0.5rem;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 400;
  color: #374151;
  margin-bottom: 0;
}

.permission-item span {
  font-family: monospace;
  font-size: 0.8rem;
}

.permission-item input {
  cursor: pointer;
}
</style>
