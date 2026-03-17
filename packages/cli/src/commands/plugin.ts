import { spawn } from 'node:child_process'

function runShell(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true })
    child.on('close', (code) => resolve(code ?? 0))
    child.on('error', reject)
  })
}

export async function installPlugin(packageName: string): Promise<void> {
  console.log(`Installing plugin: ${packageName}`)
  const code = await runShell('bun', ['add', packageName])
  if (code !== 0) {
    throw new Error(`Failed to install ${packageName}`)
  }
  console.log(`Plugin "${packageName}" installed. Restart your server to apply.`)
}

export async function uninstallPlugin(packageName: string): Promise<void> {
  console.log(`Uninstalling plugin: ${packageName}`)
  const code = await runShell('bun', ['remove', packageName])
  if (code !== 0) {
    throw new Error(`Failed to uninstall ${packageName}`)
  }
  console.log(`Plugin "${packageName}" removed. Restart your server to apply.`)
}
