<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p class="subtitle">Welcome to Hanabi CMS</p>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">0</span>
        <span class="stat-label">Posts</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">0</span>
        <span class="stat-label">Media Files</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">0</span>
        <span class="stat-label">Plugins</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #6c63ff;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}
</style>
