# Plugins Overview

Viseed CMS ships with four official plugins covering the most common CMS needs. All are optional — install only what your project requires.

---

## Official Plugins

| Package                 | Function          | What it provides                                              |
|-------------------------|-------------------|---------------------------------------------------------------|
| `viseed-plugin-auth`     | `authPlugin()`    | User authentication, sessions, and role-based access control  |
| `viseed-plugin-blog`     | `blogPlugin()`    | Blog posts and categories with admin UI                       |
| `viseed-plugin-menu`     | `menuPlugin()`    | Navigation menus with admin UI and theme menu injection       |
| `viseed-plugin-pages`    | `pagesPlugin()`   | Standalone pages with TOC support and admin UI                |

---

## Installation

Install the packages you need:

```bash
bun add viseed-plugin-auth viseed-plugin-blog viseed-plugin-menu viseed-plugin-pages
```

Register them in your entry file before calling `cms.launch()`:

```typescript
import { createCMS } from '@viseed/core'
import { authPlugin } from 'viseed-plugin-auth'
import { blogPlugin } from 'viseed-plugin-blog'
import { menuPlugin } from 'viseed-plugin-menu'
import { pagesPlugin } from 'viseed-plugin-pages'

const cms = createCMS({
  db: { driver: 'postgres', url: process.env.DATABASE_URL! },
})

cms.use(authPlugin())
cms.use(blogPlugin())
cms.use(menuPlugin())
cms.use(pagesPlugin())

const app = await cms.launch()
```

After adding a new plugin, update the database schema:

```bash
bunx viseed db push      # development
bunx viseed db generate  # production — generates migration files
bunx viseed db migrate   # production — applies migrations
```

---

## Plugin Details

### `viseed-plugin-auth`

Provides user authentication and session management.

- Creates `users`, `sessions`, and `user_site_roles` tables
- Handles login, logout, and session validation
- Role-based access control per site

### `viseed-plugin-blog`

Adds a full blog system with admin management.

- Creates `blog_posts` and `blog_categories` tables
- Registers admin UI for creating and editing posts and categories
- Injects post data into theme layouts (`home`, `post`, `category`)

### `viseed-plugin-menu`

Provides navigation menu management.

- Creates `menu_items` table
- Registers admin UI for building menus
- Injects `menuMain` and `menuFooter` data into theme layout context

### `viseed-plugin-pages`

Adds standalone content pages.

- Creates `pages` table
- Registers admin UI for managing pages
- Supports Table of Contents (TOC) generation from headings
- Injects page data into the `page` theme layout

---

## Using the CLI

You can also install and uninstall plugins using the `viseed` CLI:

```bash
bunx viseed plugin install viseed-plugin-pages
bunx viseed plugin uninstall viseed-plugin-pages
```

See the [CLI Reference](/guide/cli) for details.
