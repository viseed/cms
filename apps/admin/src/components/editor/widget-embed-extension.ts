import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import WidgetEmbedView from './WidgetEmbedView.vue'

/**
 * TipTap block node that embeds a reusable widget instance by ID.
 * The node is atomic (non-editable internally) and renders as a drag-able card
 * in the editor, and as a `<div data-widget-id>` placeholder in server HTML.
 */
export const WidgetEmbedExtension = Node.create({
  name: 'widgetEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      widgetId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-widget-id'),
      },
      widgetType: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-widget-type'),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-widget-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-widget-id': HTMLAttributes.widgetId ?? '',
        'data-widget-type': HTMLAttributes.widgetType ?? '',
        class: 'cms-widget-embed',
      },
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(WidgetEmbedView)
  },
})
