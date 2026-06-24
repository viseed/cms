<script setup lang="ts">
import { computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import MediaPickerModal from './components/MediaPickerModal.vue'
import { useAdminSiteContext } from './composables/useAdminSiteContext'
import { useMediaPicker } from './composables/useMediaPicker'
import AdminLayout from './layouts/AdminLayout.vue'

const { activeSiteId } = useAdminSiteContext()
const route = useRoute()

const routeViewKey = computed(() => activeSiteId.value)
const useAdminLayout = computed(() => route.path !== '/login' && route.path !== '/setup')

const { openMediaPicker } = useMediaPicker()
provide('imagePicker', openMediaPicker)
</script>

<template>
  <AdminLayout v-if="useAdminLayout">
    <router-view :key="routeViewKey" />
  </AdminLayout>
  <router-view v-else />
  <!-- Global media picker modal — must be mounted once at root -->
  <MediaPickerModal />
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
