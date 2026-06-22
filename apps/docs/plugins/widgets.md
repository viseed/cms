# Widgets

Widgets are reusable content blocks that plugins can contribute. A plugin declares **widget types**; users then create named **instances** of those types via the Widgets admin view and embed them into post or page content through the TipTap editor.

Each widget type has:

- An **admin config form** — a Vue component for configuring widget instances in the admin.
- A **public renderer** — a Vue component that renders the widget on the public site.
- An optional **preview component** — a lightweight Vue component shown inline in the TipTap editor.

---

## Declaring widget types in a plugin

Register widget types in the `widgets` array of your `CMSPlugin`:

```typescript
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CMSPlugin } from '@viseed/types'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function myPlugin(): CMSPlugin {
  return {
    name: 'my-plugin',
    version: '1.0.0',
    widgets: [
      {
        id: 'my-plugin/counter',          // unique type id — recommended: '{pluginName}/{name}'
        label: 'Counter',
        icon: '🔢',
        description: 'A simple click counter',
        pluginName: 'my-plugin',           // must match plugin.name
        configComponent: 'CounterConfigForm',  // named export in admin bundle
        previewComponent: 'CounterRenderer',   // optional; named export in admin bundle
        publicComponent: 'CounterRenderer',    // named export in public bundle
        defaultConfig: { start: 0 },
      },
    ],
    admin: {
      menuItems: [],
      bundlePath: resolve(__dirname, '../dist/admin/index.js'),
    },
    public: {
      bundlePath: resolve(__dirname, '../dist/public/index.js'),
    },
  }
}
```

`configComponent`, `previewComponent`, and `publicComponent` are **named export strings** — they must match the exact export names in the respective bundle's entry file.

---

## Creating the admin config form

The config form is a Vue component that uses `v-model` to let users configure a widget instance.

- Props: `modelValue` — the current config object (type matches `defaultConfig`).
- Emits: `update:modelValue` — emit the full updated config on every change.

```vue
<!-- src/admin/CounterConfigForm.vue -->
<script setup lang="ts">
interface CounterConfig {
  start: number
}

const props = defineProps<{ modelValue: CounterConfig }>()
const emit = defineEmits<{ 'update:modelValue': [CounterConfig] }>()

function update(patch: Partial<CounterConfig>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}
</script>

<template>
  <div class="field">
    <label>Start value</label>
    <input
      type="number"
      :value="modelValue.start"
      @input="update({ start: Number(($event.target as HTMLInputElement).value) })"
    />
  </div>
</template>
```

Export the component in `src/admin/index.ts`:

```typescript
// src/admin/index.ts
export { default as CounterConfigForm } from './CounterConfigForm.vue'
// Re-export public renderer to use as previewComponent in TipTap
export { default as CounterRenderer } from '../public/CounterRenderer.vue'
```

::: tip Rich text fields
For config fields that need rich text input, use the `RichTextEditor` component from `@viseed/ui/vue`:

```typescript
import { RichTextEditor } from '@viseed/ui/vue'
```
:::

---

## Building the admin bundle

See [Building the admin bundle](/guide/plugins#building-the-admin-bundle) in the Plugin System guide.
All widget config and preview components must be exported from the same `src/admin/index.ts` entry.

---

## Creating the public renderer

The public renderer is a Vue component that receives the saved config and renders the widget on the public site.

- Props: `config` — the saved config object.
- No emits required.
- Must be self-contained: no admin UI dependencies, no `vue-router`.

```vue
<!-- src/public/CounterRenderer.vue -->
<script setup lang="ts">
interface CounterConfig {
  start: number
}

defineProps<{ config: CounterConfig }>()
</script>

<template>
  <div class="counter-widget">
    Starting at: {{ config.start }}
  </div>
</template>
```

Export the component in `src/public/index.ts`:

```typescript
// src/public/index.ts
export { default as CounterRenderer } from './CounterRenderer.vue'
```

---

## Building the public bundle

Create `build-public.ts` at the plugin root and use the helper from `@viseed/core/build`:

```typescript
// build-public.ts
import { buildPluginPublic } from '@viseed/core/build'

await buildPluginPublic()
```

`buildPluginPublic()` pre-configures Vite with:
- Entry: `src/public/index.ts`
- Output: `dist/public/index.js` (ESM, CSS injected via JS)
- Externals: `vue` only (no `vue-router` — not available on the public site)

Add a script to `package.json`:

```json
{
  "scripts": {
    "build": "bunup && bun run build-admin.ts && bun run build-public.ts",
    "build:admin": "bun run build-admin.ts",
    "build:public": "bun run build-public.ts"
  }
}
```

To override any default (e.g. a custom output directory):

```typescript
await buildPluginPublic({ outDir: 'dist/frontend' })
```

---

## Built-in widgets

These widget types are available out of the box when you install `@viseed/plugin-common-widgets` or `@viseed/plugin-blog`.

### `@viseed/plugin-common-widgets`

```bash
bun add @viseed/plugin-common-widgets
```

```typescript
import { commonWidgetsPlugin } from '@viseed/plugin-common-widgets'
cms.use(commonWidgetsPlugin())
```

| Widget ID               | Label | Description                                              |
|-------------------------|-------|----------------------------------------------------------|
| `common-widgets/tabs`   | Tabs  | Tabbed content panel — vertical or horizontal layout, each tab supports rich text |
| `common-widgets/qa`     | Q&A   | Collapsible question & answer list — single-open accordion, answers support rich text |

### `@viseed/plugin-blog`

| Widget ID              | Label        | Description                              |
|------------------------|--------------|------------------------------------------|
| `blog/latest-posts`    | Latest Posts | Displays a configurable list of the most recent blog posts |
