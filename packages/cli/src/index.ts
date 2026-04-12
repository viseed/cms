#!/usr/bin/env bun

import { runDbCommand } from './commands/db'
import { initProject } from './commands/init'
import { installPlugin, uninstallPlugin } from './commands/plugin'
import { installTheme, uninstallTheme } from './commands/theme'

const [command, ...args] = process.argv.slice(2)

async function main(): Promise<void> {
  switch (command) {
    case 'init': {
      const name = args[0]
      if (!name) {
        console.error('Usage: hanabi init <project-name>')
        process.exit(1)
      }
      await initProject(name)
      break
    }

    case 'db': {
      const subcommand = args[0]
      if (!subcommand) {
        console.error('Usage: hanabi db <push|generate|migrate>')
        process.exit(1)
      }
      await runDbCommand(subcommand)
      break
    }

    case 'migrate': {
      console.log('Note: "hanabi migrate" is deprecated. Use "hanabi db migrate" instead.')
      await runDbCommand('migrate')
      break
    }

    case 'plugin': {
      const action = args[0]
      const packageName = args[1]
      if (!action || !packageName) {
        console.error('Usage: hanabi plugin <install|uninstall> <package-name>')
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

    case 'theme': {
      const action = args[0]
      const packageName = args[1]
      if (!action || !packageName) {
        console.error('Usage: hanabi theme <install|uninstall> <package-name>')
        process.exit(1)
      }
      if (action === 'install') {
        await installTheme(packageName)
      } else if (action === 'uninstall') {
        await uninstallTheme(packageName)
      } else {
        console.error(`Unknown theme action: ${action}`)
        process.exit(1)
      }
      break
    }

    default:
      console.log('Hanabi CMS CLI')
      console.log('')
      console.log('Commands:')
      console.log('  init <name>                     Create a new Hana CMS project')
      console.log('  db push                         Push schema to database (dev)')
      console.log('  db generate                     Generate SQL migration files (prod)')
      console.log('  db migrate                      Apply pending migrations (prod)')
      console.log('  plugin install <package>         Install a plugin')
      console.log('  plugin uninstall <package>       Uninstall a plugin')
      console.log('  theme install <package>          Install a theme')
      console.log('  theme uninstall <package>        Uninstall a theme')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
