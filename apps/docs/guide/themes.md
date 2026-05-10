# Themes

Themes control the visual presentation of your site — HTML templates, static assets (CSS, JS, images), layout definitions, and menu zones. Themes are completely separate from plugins; they handle rendering, not data or business logic.

---

## Using a Theme

Install a theme package and register it in your CMS config:

```typescript
import { createCMS } from '@viseed/core'
import { blogTheme } from 'viseed-theme-blog'

const cms = createCMS({
  db: { driver: 'postgres', url: process.env.DATABASE_URL! },
  themes: [blogTheme()],
  defaultTheme: 'blog',
})
```

### Built-in Themes

| Package                   | Function             | Description                          |
|---------------------------|----------------------|--------------------------------------|
| `viseed-theme-blog`        | `blogTheme()`        | Clean blog layout with post listings |
| `viseed-theme-insurance`   | `insuranceTheme()`   | Insurance company landing pages      |

```bash
bun add viseed-theme-blog
```

---

## Multiple Themes

You can register several themes at once. The active theme is stored in the database and can be switched from the admin panel without redeploying.

```typescript
import { blogTheme } from 'viseed-theme-blog'
import { insuranceTheme } from 'viseed-theme-insurance'

const cms = createCMS({
  db: { driver: 'postgres', url: process.env.DATABASE_URL! },
  themes: [blogTheme(), insuranceTheme()],
  defaultTheme: 'blog',   // used when no active theme is set in the DB
})
```

`defaultTheme` must match the `name` field of one of the registered themes. If omitted, the first entry in `themes` is used.

### Hot-Swap

Switching the active theme from the admin panel takes effect immediately. A server restart is only needed if the new theme introduces a companion plugin (see below).

---

## Theme Layouts

Each theme defines a set of layouts — named templates that correspond to different page types. The required layouts are:

| Layout key   | Used for                                  |
|--------------|-------------------------------------------|
| `home`       | Site homepage                             |
| `post`       | Single blog post                          |
| `category`   | Blog category listing                     |
| `page`       | Standalone page (from `plugin-pages`)     |
| `404`        | Not-found error page                      |

Themes may define additional layouts beyond these.

---

## Menu Zones

Themes declare named menu zones where navigation menus can be rendered. Common zones:

| Zone          | Typical location      |
|---------------|-----------------------|
| `menuMain`    | Primary navigation    |
| `menuFooter`  | Footer navigation     |

Menus are managed in the admin panel under **Menus** (requires `viseed-plugin-menu`).

---

## Companion Plugins

A theme can bundle a **companion plugin** — a plugin that is automatically activated alongside the theme. This is used when a theme requires its own data model or routes.

```typescript
// Example: theme-blog ships with a built-in companion
const theme = blogTheme()
// theme.companionPlugin is automatically registered when the theme is active
```

You do not need to call `cms.use(companionPlugin)` manually — the CMS handles it.

---

## `CMSTheme` Interface

For building custom themes:

```typescript
interface CMSTheme {
  name: string
  version: string
  templateRoot?: string              // Absolute path to .eta template files
  staticRoot?: string                // Absolute path to static assets (css, js, images)
  layouts: Record<string, string>    // Map of layout key → template filename
  menuZones?: Record<string, string> // Declared menu zones
  settingsSchema?: ThemeSettingsSchema
  assets?: ThemeAssets
  staticAssetFingerprint?: string    // Cache-busting token for /theme/static/* URLs
  hooks?: Partial<CMSThemeHooks>
  companionPlugin?: CMSPlugin
}
```

Templates use [Eta](https://eta.js.org/) syntax (`.eta` files).

---

## Theme Hooks

| Hook                    | When                          | Arguments                     |
|-------------------------|-------------------------------|-------------------------------|
| `theme:beforeRender`    | Before each page is rendered  | `LayoutContext`               |
| `theme:afterRender`     | After HTML is generated       | `html: string`                |

```typescript
const myTheme: CMSTheme = {
  name: 'my-theme',
  version: '1.0.0',
  // ...
  hooks: {
    'theme:beforeRender': (context) => {
      // Inject extra data into the layout context
      return { ...context, extra: { year: new Date().getFullYear() } }
    },
    'theme:afterRender': (html) => {
      // Post-process rendered HTML
      return html.replace('</body>', '<script>console.log("hi")</script></body>')
    },
  },
}
```
