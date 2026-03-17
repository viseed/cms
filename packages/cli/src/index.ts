#!/usr/bin/env bun

import { initProject } from './commands/init'
import { runMigrations } from './commands/migrate'
import { installPlugin, uninstallPlugin } from './commands/plugin'

const [command, ...args] = process.argv.slice(2)

async function main(): Promise<void> {
  switch (command) {
    case 'init': {
      const name = args[0]
      if (!name) {
        console.error('Usage: hana init <project-name>')
        process.exit(1)
      }
      await initProject(name)
      break
    }

    case 'migrate': {
      await runMigrations()
      break
    }

    case 'plugin': {
      const action = args[0]
      const packageName = args[1]
      if (!action || !packageName) {
        console.error('Usage: hana plugin <install|uninstall> <package-name>')
        process.exit(1)
      }
      if (action === 'install') {
        await installPlugin(packageName)
      } else if (action === 'uninstall') {
        await uninstallPlugin(packageName)
      } else {
        console.error(`Unknown plugin action: ${action}`)
        process.exit(1)
      }
      break
    }

    default:
      console.log('Hana CMS CLI')
      console.log('')
      console.log('Commands:')
      console.log('  init <name>                     Create a new Hana CMS project')
      console.log('  migrate                         Run database migrations')
      console.log('  plugin install <package>         Install a plugin')
      console.log('  plugin uninstall <package>       Uninstall a plugin')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
