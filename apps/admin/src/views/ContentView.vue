<template>
  <div class="content-view">
    <h1>Content</h1>
    <p class="subtitle">Manage your content entries</p>

    <div class="empty-state">
      <p>No content entries yet. Install a content plugin to get started.</p>
    </div>
  </div>
</template>

<style scoped>
.content-view h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.empty-state {
  background: #fff;
  padding: 3rem;
  border-radius: 12px;
  text-align: center;
  color: #999;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
