import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CMSPlugin } from '@viseed/types'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export function commonWidgetsPlugin(): CMSPlugin {
  return {
    name: 'common-widgets',
    version: '0.1.0',
    widgets: [
      {
        id: 'common-widgets/tabs',
        label: 'Tabs',
        icon: '▤',
        description: 'Tabbed content panel — vertical or horizontal layout',
        pluginName: 'common-widgets',
        configComponent: 'TabsConfigForm',
        previewComponent: 'TabsRenderer',
        publicComponent: 'TabsRenderer',
        defaultConfig: {
          orientation: 'horizontal',
          tabs: [
            { id: 'tab-1', title: 'Tab 1', content: '' },
          ],
        },
      },
      {
        id: 'common-widgets/qa',
        label: 'Q&A',
        icon: '❓',
        description: 'Collapsible question & answer list — single-open accordion',
        pluginName: 'common-widgets',
        configComponent: 'QaConfigForm',
        previewComponent: 'QaRenderer',
        publicComponent: 'QaRenderer',
        defaultConfig: {
          items: [
            { id: 'qa-1', question: '', answer: '' },
          ],
        },
      },
    ],
    admin: {
      menuItems: [],
      bundlePath: resolve(__dirname, '../dist/admin/index.js'),
    },
    public: {
      bundlePath: resolve(__dirname, '../dist/public/index.js'),
    },
  }
}
