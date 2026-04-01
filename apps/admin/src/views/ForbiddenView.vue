<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="forbidden">
    <div class="card">
      <div class="code">403</div>
      <h1>Access denied</h1>
      <p class="lead">
        You do not have permission to open this page. If you need access, ask a platform administrator.
      </p>
      <div class="actions">
        <button type="button" class="btn primary" @click="router.push('/')">Back to dashboard</button>
        <button type="button" class="btn ghost" @click="router.back()">Go back</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forbidden {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 1rem;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 2.5rem 2rem;
  max-width: 420px;
  text-align: center;
}

.code {
  font-size: 2.5rem;
  font-weight: 800;
  color: #6c63ff;
  letter-spacing: -0.04em;
  line-height: 1;
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 1.35rem;
  margin-bottom: 0.75rem;
  color: #1a1a2e;
}

.lead {
  color: #666;
  font-size: 0.95rem;
  line-height: 1.55;
  margin-bottom: 1.75rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  border-radius: 8px;
  padding: 0.6rem 1.1rem;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.btn.primary {
  background: #6c63ff;
  color: #fff;
}

.btn.primary:hover {
  background: #5a52e0;
}

.btn.ghost {
  background: transparent;
  color: #555;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.btn.ghost:hover {
  background: rgba(0, 0, 0, 0.04);
}
</style>
