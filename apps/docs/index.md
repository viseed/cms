---
layout: home
hero:
  name: Viseed CMS
  text: Lightweight & Extensible
  tagline: A plugin-based CMS framework built on Hono + Drizzle + Bun
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/viseed-cms/viseed
features:
  - title: Plugin Architecture
    details: Add capabilities with official plugins for auth, blog, menus, and pages. Register via cms.use() — no configuration files needed.
  - title: Bun-Native Performance
    details: Built for the Bun runtime with its built-in PostgreSQL driver. Fast startup, zero cold starts, and no separate pg client required.
  - title: Theme System
    details: Swap themes at runtime from the admin panel. Themes use Eta templates and can carry companion plugins for their own data needs.
  - title: Admin Dashboard
    details: Built-in Vue 3 admin panel for managing content, media, menus, plugins, and themes — served at /admin with zero extra setup.
  - title: Media Library
    details: Upload, serve, and manage files out of the box. The media API is built into core — no plugin installation required.
  - title: Developer-First CLI
    details: Scaffold projects, push schemas, generate migrations, and manage plugins with the viseed CLI.
---
