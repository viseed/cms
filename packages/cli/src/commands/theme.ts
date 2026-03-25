import { spawn } from 'node:child_process'

function runShell(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true })
    child.on('close', (code) => resolve(code ?? 0))
    child.on('error', reject)
  })
}

export async function installTheme(packageName: string): Promise<void> {
  console.log(`Installing theme: ${packageName}`)
  const code = await runShell('bun', ['add', packageName])
  if (code !== 0) {
    throw new Error(`Failed to install ${packageName}`)
  }
  console.log(`Theme "${packageName}" installed. Restart your server to apply.`)
}

export async function uninstallTheme(packageName: string): Promise<void> {
  console.log(`Uninstalling theme: ${packageName}`)
  const code = await runShell('bun', ['remove', packageName])
  if (code !== 0) {
    throw new Error(`Failed to uninstall ${packageName}`)
  }
  console.log(`Theme "${packageName}" removed. Restart your server to apply.`)
}
