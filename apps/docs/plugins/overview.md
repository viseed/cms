# Plugins Overview

Hana CMS ships with four official plugins covering the most common CMS needs. All are optional — install only what your project requires.

---

## Official Plugins

| Package                 | Function          | What it provides                                              |
|-------------------------|-------------------|---------------------------------------------------------------|
| `hanano-plugin-auth`     | `authPlugin()`    | User authentication, sessions, and role-based access control  |
| `hanano-plugin-blog`     | `blogPlugin()`    | Blog posts and categories with admin UI                       |
| `hanano-plugin-menu`     | `menuPlugin()`    | Navigation menus with admin UI and theme menu injection       |
| `hanano-plugin-pages`    | `pagesPlugin()`   | Standalone pages with TOC support and admin UI                |

---

## Installation

Install the packages you need:

```bash
bun add hanano-plugin-auth hanano-plugin-blog hanano-plugin-menu hanano-plugin-pages
```

Register them in your entry file before calling `cms.launch()`:

```typescript
import { createCMS } from '@hanano/core'
import { authPlugin } from 'hanano-plugin-auth'
import { blogPlugin } from 'hanano-plugin-blog'
import { menuPlugin } from 'hanano-plugin-menu'
import { pagesPlugin } from 'hanano-plugin-pages'

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
bunx hanabi db push      # development
bunx hanabi db generate  # production — generates migration files
bunx hanabi db migrate   # production — applies migrations
```

---

## Plugin Details

### `hanano-plugin-auth`

Provides user authentication and session management.

- Creates `users`, `sessions`, and `user_site_roles` tables
- Handles login, logout, and session validation
- Role-based access control per site

### `hanano-plugin-blog`

Adds a full blog system with admin management.

- Creates `blog_posts` and `blog_categories` tables
- Registers admin UI for creating and editing posts and categories
- Injects post data into theme layouts (`home`, `post`, `category`)

### `hanano-plugin-menu`

Provides navigation menu management.

- Creates `menu_items` table
- Registers admin UI for building menus
- Injects `menuMain` and `menuFooter` data into theme layout context

### `hanano-plugin-pages`

Adds standalone content pages.

- Creates `pages` table
- Registers admin UI for managing pages
- Supports Table of Contents (TOC) generation from headings
- Injects page data into the `page` theme layout

---

## Using the CLI

You can also install and uninstall plugins using the `hanabi` CLI:

```bash
bunx hanabi plugin install hanano-plugin-pages
bunx hanabi plugin uninstall hanano-plugin-pages
```

See the [CLI Reference](/guide/cli) for details.
