<template>
  <div class="media-view">
    <h1>Media Library</h1>
    <p class="subtitle">Upload and manage files</p>

    <div class="empty-state">
      <p>No media files uploaded yet.</p>
      <button class="upload-btn">Upload File</button>
    </div>
  </div>
</template>

<style scoped>
.media-view h1 {
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-btn {
  padding: 0.5rem 1.5rem;
  background: #6c63ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
