# @viseed/plugin-r2

Cloudflare R2 media storage provider for Viseed CMS.

Install the plugin, then configure the account ID, bucket and credentials in
**Admin > Media > Settings**. All settings are stored (encrypted at rest) in the
system database — nothing needs to be passed in code.

```ts
import { createCMS } from '@viseed/cms'
import { r2Plugin } from '@viseed/plugin-r2'

createCMS({ plugins: [r2Plugin()] })
```

## Prerequisites

### `VISEED_ENCRYPTION_KEY`

The plugin encrypts your R2 `secretAccessKey` with AES-256-GCM before saving it
to the database. You must set this env var before starting the server — the CMS
will refuse to save storage credentials without it.

**Generate a key (pick one):**

```bash
# OpenSSL (recommended — available on macOS, Linux, WSL, Git Bash)
openssl rand -base64 32

# Node / Bun
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the output to your `.env`:

```env
VISEED_ENCRYPTION_KEY=<paste generated value here>
```

> **Important:** treat this key like a password. If you lose it, any
> `secretAccessKey` already stored in the database cannot be decrypted and you
> will need to re-enter your R2 credentials. Never commit the real value to
> source control.
