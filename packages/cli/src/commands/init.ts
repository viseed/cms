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
        '@viseed/cms': 'latest',
        '@viseed/plugin-auth': 'latest',
        '@viseed/plugin-blog': 'latest',
      },
    },
    null,
    2,
  )

const STARTER_INDEX = `import { createCMS } from '@viseed/cms'
import { authPlugin } from '@viseed/plugin-auth'
import { blogPlugin } from '@viseed/plugin-blog'

const cms = createCMS({
  db: {
    driver: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/hana',
  },
  admin: {
    bootstrapAdmin:
      process.env.HANANO_ADMIN_EMAIL && process.env.HANANO_ADMIN_PASSWORD
        ? {
            email: process.env.HANANO_ADMIN_EMAIL,
            password: process.env.HANANO_ADMIN_PASSWORD,
            name: process.env.HANANO_ADMIN_NAME ?? 'Administrator',
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
  console.log(`  # Set your PostgreSQL connection string:`)
  console.log(`  export DATABASE_URL="postgresql://user:password@localhost:5432/hana"`)
  console.log(`  # Push schema to database:`)
  console.log(`  bunx viseed db push`)
  console.log(`  # Dev default admin is auto-seeded on first run:`)
  console.log(`  # email: admin@local.dev`)
  console.log(`  # password: 12345678`)
  console.log(`  # Optional override: HANANO_ADMIN_EMAIL / HANANO_ADMIN_PASSWORD / HANANO_ADMIN_NAME`)
  console.log(`  bun run dev`)
}
