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
        '@viseed/plugin-blog': 'latest',
        '@viseed/theme-blog': 'latest',
        'pg': '^8.21.0',
      },
    },
    null,
    2,
  )

const STARTER_INDEX = `import { createCMS } from '@viseed/cms'
import { blogPlugin } from '@viseed/plugin-blog'
import { blogTheme } from '@viseed/theme-blog'

const cms = createCMS({
  db: {
    driver: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/viseed',
  },
  themes: [blogTheme()],
  defaultTheme: 'blog',
})

cms.use(blogPlugin())

const app = await cms.launch()

export default {
  port: 3000,
  fetch: app.fetch,
}
`

const ENV_FILE = `DATABASE_URL=postgresql://postgres:admin@localhost:5432/viseed`

const VISEED_CONFIG = `export default {
}
`

export async function initProject(projectName: string): Promise<void> {
  const projectDir = join(process.cwd(), projectName)

  await mkdir(join(projectDir, 'src'), { recursive: true })
  await writeFile(join(projectDir, 'package.json'), STARTER_PACKAGE_JSON(projectName))
  await writeFile(join(projectDir, 'src', 'index.ts'), STARTER_INDEX)
  await writeFile(join(projectDir, '.env'), ENV_FILE)
  await writeFile(join(projectDir, 'viseed.config.ts'), VISEED_CONFIG)

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
  console.log(`  export DATABASE_URL="postgresql://user:password@localhost:5432/viseed"`)
  console.log(`  # Push schema to database:`)
  console.log(`  bunx viseed db push`)
  console.log(`  bun run dev`)
}
