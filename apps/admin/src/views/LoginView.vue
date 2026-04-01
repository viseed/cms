<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuthContext } from '../composables/useAdminAuthContext'

const router = useRouter()
const route = useRoute()
const auth = useAdminAuthContext()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const redirectTo = computed(() => {
  const raw = route.query.redirect
  if (typeof raw === 'string' && raw.startsWith('/')) {
    return raw
  }
  return '/'
})

async function handleLogin() {
  error.value = null
  loading.value = true

  try {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value.trim().toLowerCase(),
        password: password.value,
      }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      error.value = body.error ?? 'Unable to sign in.'
      return
    }

    await auth.refresh()
    await router.replace(redirectTo.value)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Unable to sign in.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="handleLogin">
      <h1>Admin Login</h1>
      <p class="subtitle">Sign in to Hana CMS admin.</p>

      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" required>
      </label>

      <label class="field">
        <span>Password</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          minlength="8"
          required
        >
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading" class="submit-btn">
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: #f3f4f6;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

h1 {
  font-size: 1.4rem;
  color: #111827;
}

.subtitle {
  color: #6b7280;
  margin-bottom: 0.2rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field span {
  font-size: 0.85rem;
  color: #374151;
}

.field input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-size: 0.95rem;
}

.field input:focus {
  outline: none;
  border-color: #6c63ff;
  box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.12);
}

.error {
  color: #b91c1c;
  font-size: 0.85rem;
}

.submit-btn {
  margin-top: 0.25rem;
  border: none;
  border-radius: 8px;
  background: #6c63ff;
  color: #fff;
  font-weight: 600;
  padding: 0.6rem 0.8rem;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
