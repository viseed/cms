<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { markSetupComplete } from '../main'

const router = useRouter()

const siteName = ref('')
const domain = ref(typeof window !== 'undefined' ? window.location.host : '')
const adminName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

// biome-ignore lint/correctness/noUnusedVariables: used in Vue template
const handleSetup = async () => {
  error.value = null

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }

  loading.value = true
  try {
    const response = await fetch('/api/admin/setup', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value.trim().toLowerCase(),
        password: password.value,
        name: adminName.value.trim(),
        siteName: siteName.value.trim(),
        domain: domain.value.trim(),
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      error.value = (body as { error?: string }).error ?? 'Setup failed. Please try again.'
      return
    }

    success.value = true
    markSetupComplete()
    setTimeout(() => {
      router.replace('/login')
    }, 1800)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Network error. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="setup-page">
    <form v-if="!success" class="setup-card" @submit.prevent="handleSetup">
      <div class="setup-header">
        <h1>Welcome to Viseed CMS</h1>
        <p class="subtitle">Complete the setup to get started.</p>
      </div>

      <section class="section">
        <h2>Site</h2>

        <label class="field">
          <span>Site Name <small class="hint">(leave blank to use default)</small></span>
          <input v-model="siteName" type="text" placeholder="My Website" autocomplete="off">
        </label>

        <label class="field">
          <span>Domain <small class="hint">(leave blank to skip)</small></span>
          <input v-model="domain" type="text" placeholder="example.com" autocomplete="off">
        </label>
      </section>

      <section class="section">
        <h2>Admin Account</h2>

        <label class="field">
          <span>Your Name</span>
          <input v-model="adminName" type="text" placeholder="Jane Doe" required autocomplete="name">
        </label>

        <label class="field">
          <span>Email</span>
          <input v-model="email" type="email" placeholder="admin@example.com" required autocomplete="email">
        </label>

        <label class="field">
          <span>Password <small class="hint">(min. 8 characters)</small></span>
          <input
            v-model="password"
            type="password"
            minlength="8"
            required
            autocomplete="new-password"
          >
        </label>

        <label class="field">
          <span>Confirm Password</span>
          <input
            v-model="confirmPassword"
            type="password"
            minlength="8"
            required
            autocomplete="new-password"
          >
        </label>
      </section>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading" class="submit-btn">
        {{ loading ? 'Setting up…' : 'Complete Setup' }}
      </button>
    </form>

    <div v-else class="setup-card success-card">
      <div class="success-icon">✓</div>
      <h1>Setup complete!</h1>
      <p class="subtitle">Redirecting to login…</p>
    </div>
  </div>
</template>

<style scoped>
.setup-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: #f3f4f6;
}

.setup-card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  padding: 2rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.setup-header {
  margin-bottom: 0.25rem;
}

h1 {
  font-size: 1.45rem;
  color: #111827;
  margin: 0 0 0.25rem;
}

h2 {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9ca3af;
  margin: 0 0 0.75rem;
}

.subtitle {
  color: #6b7280;
  margin: 0;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid #f3f4f6;
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

.hint {
  font-weight: 400;
  color: #9ca3af;
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
  margin: 0;
}

.submit-btn {
  border: none;
  border-radius: 8px;
  background: #6c63ff;
  color: #fff;
  font-weight: 600;
  padding: 0.65rem 0.8rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.success-card {
  align-items: center;
  text-align: center;
  gap: 0.75rem;
}

.success-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #ecfdf5;
  color: #059669;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  font-weight: 700;
}
</style>
