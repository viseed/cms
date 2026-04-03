import { defineWorkspace } from 'bunup'

export default defineWorkspace(
  [
    { name: 'types', root: 'packages/types' },
    {
      name: 'validator', 
      root: 'packages/validator',
      config: {
        dts: false,
      },
    },
    {
      name: 'schema',
      root: 'packages/schema',
      config: {
        dts: false,
      },
    },
    {
      name: 'core',
      root: 'packages/core',
      config: { format: ['esm', 'cjs'] },
    },
    {
      name: 'registry',
      root: 'packages/registry',
      config: { format: ['esm', 'cjs'] },
    },
    { name: 'ui', root: 'packages/ui' },
    {
      name: 'cli',
      root: 'packages/cli',
      config: { format: ['esm'] },
    },
    { name: 'plugin-auth', root: 'plugins/plugin-auth' },
    { name: 'plugin-blog', root: 'plugins/plugin-blog' },
    { name: 'plugin-media', root: 'plugins/plugin-media' },
  ],
  {
    format: ['esm'],
    dts: true,
  },
)
