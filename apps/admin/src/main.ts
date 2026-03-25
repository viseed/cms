import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: [
    { path: '/', component: () => import('./views/DashboardView.vue') },
    { path: '/plugins', component: () => import('./views/PluginsView.vue') },
    { path: '/themes', component: () => import('./views/ThemesView.vue') },
    { path: '/content', component: () => import('./views/ContentView.vue') },
    { path: '/media', component: () => import('./views/MediaView.vue') },
  ],
})

const app = createApp(App)
app.use(router)
app.mount('#app')
