# Hana CMS Starter

A starter template for building with Hana CMS.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## Add Plugins

```bash
bun add @hana/plugin-media
```

Then register in `src/index.ts`:

```typescript
import { mediaPlugin } from '@hana/plugin-media'

cms.use(mediaPlugin())
```
