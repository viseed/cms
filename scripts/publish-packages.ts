/**
 * Publish workspace packages with Changesets, with a fix for Bun's
 * `workspace:*` protocol.
 *
 * Why this wrapper exists:
 * Changesets has no native Bun support, so `changeset publish` shells out to
 * `npm publish`, which does NOT replace the `workspace:` protocol. That ships
 * literal `workspace:*` ranges to npm and breaks every external install.
 *
 * What this does:
 * 1. Resolve every `workspace:` range in all package manifests to the real
 *    version (the same mapping `bun publish` would apply).
 * 2. Run `changeset publish` (Changesets still owns tagging, dist-tags and the
 *    "already published" idempotency check).
 * 3. Restore the original manifests so the working tree keeps `workspace:*`
 *    for local development.
 *
 * The rewrite is transient and never committed.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

interface PackageManifest {
  name?: string
  version?: string
  [field: string]: unknown
}

interface WorkspacePackage {
  manifestPath: string
  manifest: PackageManifest
  rawContent: string
}

async function getWorkspaceGlobs(): Promise<string[]> {
  const root = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8')) as {
    workspaces?: string[]
  }
  return root.workspaces ?? []
}

async function expandWorkspaceDirs(globs: string[]): Promise<string[]> {
  const dirs: string[] = []
  for (const glob of globs) {
    if (!glob.endsWith('/*')) {
      dirs.push(join(repoRoot, glob))
      continue
    }
    const base = join(repoRoot, glob.slice(0, -2))
    const entries = await readdir(base, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (entry.isDirectory()) dirs.push(join(base, entry.name))
    }
  }
  return dirs
}

async function loadWorkspacePackages(): Promise<WorkspacePackage[]> {
  const dirs = await expandWorkspaceDirs(await getWorkspaceGlobs())
  const packages: WorkspacePackage[] = []
  for (const dir of dirs) {
    const manifestPath = join(dir, 'package.json')
    const rawContent = await readFile(manifestPath, 'utf8').catch(() => null)
    if (rawContent === null) continue
    const manifest = JSON.parse(rawContent) as PackageManifest
    if (!manifest.name || !manifest.version) continue
    packages.push({ manifestPath, manifest, rawContent })
  }
  return packages
}

/**
 * Resolve a single `workspace:` range to a publishable version, matching the
 * behaviour documented for `bun publish`:
 *   workspace:*       -> 1.2.3
 *   workspace:^       -> ^1.2.3
 *   workspace:~       -> ~1.2.3
 *   workspace:^1.2.3  -> ^1.2.3 (explicit range wins)
 */
function resolveWorkspaceRange(range: string, version: string): string {
  const spec = range.slice('workspace:'.length)
  if (spec === '*') return version
  if (spec === '^') return `^${version}`
  if (spec === '~') return `~${version}`
  return spec
}

function rewriteManifest(manifest: PackageManifest, versions: Map<string, string>): boolean {
  let changed = false
  for (const field of DEPENDENCY_FIELDS) {
    const deps = manifest[field] as Record<string, string> | undefined
    if (!deps) continue
    for (const [depName, range] of Object.entries(deps)) {
      if (!range.startsWith('workspace:')) continue
      const version = versions.get(depName)
      if (!version) {
        throw new Error(
          `Cannot resolve "${depName}": "${range}" — not a known workspace package.`,
        )
      }
      deps[depName] = resolveWorkspaceRange(range, version)
      changed = true
    }
  }
  return changed
}

function runChangesetPublish(): Promise<number> {
  const proc = Bun.spawn(['bun', 'x', 'changeset', 'publish'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  return proc.exited
}

function printResolvedDependencies(pkg: WorkspacePackage): void {
  console.log(`\n${pkg.manifest.name}@${pkg.manifest.version}`)
  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg.manifest[field] as Record<string, string> | undefined
    if (!deps) continue
    for (const [depName, range] of Object.entries(deps)) {
      if (versionsHasWorkspaceTarget(depName)) console.log(`  ${field}: ${depName} -> ${range}`)
    }
  }
}

let workspaceNames: Set<string> = new Set()
function versionsHasWorkspaceTarget(depName: string): boolean {
  return workspaceNames.has(depName)
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  const packages = await loadWorkspacePackages()
  const versions = new Map(
    packages.map((pkg) => [pkg.manifest.name as string, pkg.manifest.version as string]),
  )
  workspaceNames = new Set(versions.keys())

  const rewritten: WorkspacePackage[] = []
  for (const pkg of packages) {
    if (rewriteManifest(pkg.manifest, versions)) rewritten.push(pkg)
  }

  if (dryRun) {
    console.log(`[dry-run] Would resolve workspace: protocol in ${rewritten.length} manifest(s):`)
    for (const pkg of rewritten) printResolvedDependencies(pkg)
    console.log('\n[dry-run] No files written, no packages published.')
    return
  }

  for (const pkg of rewritten) {
    await writeFile(pkg.manifestPath, `${JSON.stringify(pkg.manifest, null, 2)}\n`)
  }
  console.log(`Resolved workspace: protocol in ${rewritten.length} package manifest(s).`)

  try {
    const exitCode = await runChangesetPublish()
    process.exitCode = exitCode
  } finally {
    await Promise.all(rewritten.map((pkg) => writeFile(pkg.manifestPath, pkg.rawContent)))
    console.log(`Restored ${rewritten.length} package manifest(s) to workspace: protocol.`)
  }
}

await main()
