import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const STARTER_PACKAGE_JSON = (name: string): string =>
  JSON.stringify(
    {
      name,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'bun run src/index.ts',
        build: 'bun build src/index.ts --outdir dist --target bun',
      },
      dependencies: {
        '@hana/core': 'latest',
        '@hana/plugin-auth': 'latest',
        '@hana/plugin-blog': 'latest',
      },
    },
    null,
    2,
  )

const STARTER_INDEX = `import { createCMS } from '@hana/core'
import { authPlugin } from '@hana/plugin-auth'
import { blogPlugin } from '@hana/plugin-blog'

const cms = createCMS({
  db: {
    driver: 'sqlite',
    url: './data.db',
  },
  admin: {
    bootstrapAdmin:
      process.env.HANA_ADMIN_EMAIL && process.env.HANA_ADMIN_PASSWORD
        ? {
            email: process.env.HANA_ADMIN_EMAIL,
            password: process.env.HANA_ADMIN_PASSWORD,
            name: process.env.HANA_ADMIN_NAME ?? 'Administrator',
          }
        : undefined,
  },
})

cms.use(authPlugin())
cms.use(blogPlugin())

const app = await cms.launch()

export default {
  port: 3000,
  fetch: app.fetch,
}
`

export async function initProject(projectName: string): Promise<void> {
  const projectDir = join(process.cwd(), projectName)

  await mkdir(join(projectDir, 'src'), { recursive: true })
  await writeFile(join(projectDir, 'package.json'), STARTER_PACKAGE_JSON(projectName))
  await writeFile(join(projectDir, 'src', 'index.ts'), STARTER_INDEX)
  await writeFile(
    join(projectDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ['src'],
      },
      null,
      2,
    ),
  )

  console.log(`\nProject "${projectName}" created!`)
  console.log(`\nNext steps:`)
  console.log(`  cd ${projectName}`)
  console.log(`  bun install`)
  console.log(`  # Dev default admin is auto-seeded on first run:`)
  console.log(`  # email: admin@local.dev`)
  console.log(`  # password: 12345678`)
  console.log(`  # Optional override: HANA_ADMIN_EMAIL / HANA_ADMIN_PASSWORD / HANA_ADMIN_NAME`)
  console.log(`  bun run dev`)
}
