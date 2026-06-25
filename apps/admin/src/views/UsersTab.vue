<script setup lang="ts">
import type { RoleSummary, UserSummary } from '@viseed/types'
import { computed, onMounted, ref } from 'vue'
import { useAdminAuthContext } from '../composables/useAdminAuthContext'
import { adminFetch } from '../lib/admin-api'

interface AssignmentRow {
  siteId: string
  roleSlug: string
}

const { permissions, accessibleSites, isOwner, currentUserId } = useAdminAuthContext()

const users = ref<UserSummary[]>([])
const roles = ref<RoleSummary[]>([])
const loading = ref(true)
const error = ref('')

const showModal = ref(false)
const editingUser = ref<UserSummary | null>(null)
const saving = ref(false)
const busyUserId = ref<string | null>(null)

const form = ref({
  name: '',
  email: '',
  password: '',
  assignments: [] as AssignmentRow[],
})

const canManage = computed(() => permissions.value.includes('platform.users.manage'))

const sites = computed(() => accessibleSites.value)

const defaultSiteId = computed(() => sites.value[0]?.id ?? 'default')

function roleLabel(slug: string): string {
  return roles.value.find((role) => role.slug === slug)?.name ?? slug
}

function siteLabel(siteId: string): string {
  return sites.value.find((site) => site.id === siteId)?.name ?? siteId
}

async function loadUsers() {
  try {
    const res = await adminFetch('/api/admin/users')
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    users.value = data.users ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load users'
  }
}

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

onMounted(async () => {
  await Promise.all([loadUsers(), loadRoles()])
  loading.value = false
})

function openCreate() {
  editingUser.value = null
  form.value = {
    name: '',
    email: '',
    password: '',
    assignments: [{ siteId: defaultSiteId.value, roleSlug: roles.value[0]?.slug ?? '' }],
  }
  error.value = ''
  showModal.value = true
}

function openEdit(user: UserSummary) {
  editingUser.value = user
  form.value = {
    name: user.name,
    email: user.email,
    password: '',
    assignments: user.assignments.map((assignment) => ({
      siteId: assignment.siteId,
      roleSlug: assignment.role,
    })),
  }
  error.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function addAssignment() {
  form.value.assignments.push({
    siteId: defaultSiteId.value,
    roleSlug: roles.value[0]?.slug ?? '',
  })
}

function removeAssignment(index: number) {
  form.value.assignments.splice(index, 1)
}

async function saveUser() {
  const name = form.value.name.trim()
  const email = form.value.email.trim()
  if (!name || !email) {
    error.value = 'Name and email are required.'
    return
  }
  const assignments = form.value.assignments.filter((row) => row.siteId && row.roleSlug)

  saving.value = true
  error.value = ''
  try {
    const isEdit = editingUser.value !== null
    const url = isEdit ? `/api/admin/users/${editingUser.value!.id}` : '/api/admin/users'
    const method = isEdit ? 'PUT' : 'POST'
    const body: Record<string, unknown> = { name, email, assignments }
    if (!isEdit) body.password = form.value.password

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    await loadUsers()
    closeModal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save user'
  } finally {
    saving.value = false
  }
}

async function deleteUser(user: UserSummary) {
  if (!confirm(`Delete user "${user.name}"?`)) return
  busyUserId.value = user.id
  error.value = ''
  try {
    const res = await adminFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    await loadUsers()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete user'
  } finally {
    busyUserId.value = null
  }
}

async function resetPassword(user: UserSummary) {
  const password = prompt(`Enter a new password for "${user.name}" (min 8 characters):`)
  if (password == null) return
  busyUserId.value = user.id
  error.value = ''
  try {
    const res = await adminFetch(`/api/admin/users/${user.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) throw new Error(await res.text())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to reset password'
  } finally {
    busyUserId.value = null
  }
}

async function transferOwnership(user: UserSummary) {
  if (
    !confirm(
      `Transfer platform ownership to "${user.name}"? You will lose owner privileges and become a regular admin.`,
    )
  ) {
    return
  }
  busyUserId.value = user.id
  error.value = ''
  try {
    const res = await adminFetch(`/api/admin/users/${user.id}/transfer-ownership`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error(await res.text())
    await loadUsers()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to transfer ownership'
  } finally {
    busyUserId.value = null
  }
}
</script>

<template>
  <div class="users-tab">
    <div class="tab-actions">
      <button v-if="canManage" class="btn-primary" @click="openCreate">New User</button>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div v-if="loading" class="loading-state">Loading users…</div>

    <div v-else-if="users.length === 0" class="empty-state">
      <p>No users yet.</p>
    </div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Roles</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td class="cell-name">
            {{ user.name }}
            <span v-if="user.isOwner" class="badge badge-owner">Owner</span>
          </td>
          <td class="cell-email">{{ user.email }}</td>
          <td>
            <span v-if="user.assignments.length === 0" class="muted">—</span>
            <span
              v-for="assignment in user.assignments"
              :key="`${assignment.siteId}:${assignment.role}`"
              class="badge"
            >
              {{ roleLabel(assignment.role) }} @ {{ siteLabel(assignment.siteId) }}
            </span>
          </td>
          <td class="cell-actions">
            <template v-if="canManage">
              <button class="btn-icon" title="Edit" @click="openEdit(user)">✎</button>
              <button
                class="btn-icon"
                title="Reset password"
                :disabled="busyUserId === user.id"
                @click="resetPassword(user)"
              >
                ⟳
              </button>
              <button
                v-if="isOwner && !user.isOwner"
                class="btn-icon"
                title="Transfer ownership"
                :disabled="busyUserId === user.id"
                @click="transferOwnership(user)"
              >
                ★
              </button>
              <button
                class="btn-icon btn-danger"
                title="Delete"
                :disabled="user.isOwner || user.id === currentUserId || busyUserId === user.id"
                @click="deleteUser(user)"
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
          <h2>{{ editingUser ? 'Edit User' : 'New User' }}</h2>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="error" class="error-banner">{{ error }}</div>

          <div class="field">
            <label>Name <span class="required">*</span></label>
            <input v-model="form.name" type="text" class="input" placeholder="Full name" />
          </div>

          <div class="field">
            <label>Email <span class="required">*</span></label>
            <input v-model="form.email" type="email" class="input" placeholder="name@example.com" />
          </div>

          <div v-if="!editingUser" class="field">
            <label>Password <span class="required">*</span></label>
            <input
              v-model="form.password"
              type="password"
              class="input"
              placeholder="At least 8 characters"
            />
          </div>

          <div class="field">
            <label>Role assignments</label>
            <div
              v-for="(assignment, index) in form.assignments"
              :key="index"
              class="assignment-row"
            >
              <select v-model="assignment.roleSlug" class="input">
                <option v-for="role in roles" :key="role.slug" :value="role.slug">
                  {{ role.name }}
                </option>
              </select>
              <span class="at">@</span>
              <select v-model="assignment.siteId" class="input">
                <option v-for="site in sites" :key="site.id" :value="site.id">
                  {{ site.name }}
                </option>
              </select>
              <button class="btn-icon btn-danger" title="Remove" @click="removeAssignment(index)">
                ✕
              </button>
            </div>
            <button class="btn-link" @click="addAssignment">+ Add assignment</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn-primary" :disabled="saving" @click="saveUser">
            {{ saving ? 'Saving…' : 'Save User' }}
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

.loading-state,
.empty-state {
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

.cell-email {
  color: #6b7280;
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
  background: #eff6ff;
  color: #2563eb;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-right: 0.35rem;
}

.badge-owner {
  background: #fef3c7;
  color: #b45309;
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

.btn-link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.25rem 0;
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
  display: block;
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

.assignment-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.assignment-row .input {
  flex: 1;
}

.assignment-row .at {
  color: #9ca3af;
}
</style>
