import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Upserts a key=value line in the `.env` file at `process.cwd()/.env`.
 *
 * - If a line `KEY=<anything>` already exists it is replaced.
 * - If no such line exists the entry is appended.
 *
 * Does NOT throw when the file cannot be written — callers should handle
 * the thrown error themselves (e.g. log a warning and continue).
 */
export function upsertEnvFile(key: string, value: string): void {
  const filePath = resolve(process.cwd(), '.env')
  let content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''

  const linePattern = new RegExp(`^${key}=.*$`, 'm')
  const newLine = `${key}=${value}`

  if (linePattern.test(content)) {
    content = content.replace(linePattern, newLine)
  } else {
    const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : ''
    content = `${content}${separator}${newLine}\n`
  }

  writeFileSync(filePath, content, 'utf8')
}
