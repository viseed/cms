<script setup lang="ts">
import AdminLayout from './layouts/AdminLayout.vue'
</script>

<template>
  <AdminLayout>
    <router-view />
  </AdminLayout>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a2e;
  background: #f8f9fa;
}
</style>
