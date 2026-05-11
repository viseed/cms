import { Node, type Node as TiptapNode } from '@tiptap/core'
import { Color } from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import { annotateHeadings, buildTocHtml } from './toc'

/**
 * TipTap node that represents a reusable widget instance embedded in content.
 * Server-side rendering emits a placeholder `<div>` that the public widget
 * runtime (`/api/public/widget-runtime.js`) replaces with a live Vue component.
 */
export const WidgetEmbedExtension: TiptapNode = Node.create({
  name: 'widgetEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      widgetId: { default: null },
      widgetType: { default: null },
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
})

const baseExtensions = [
  StarterKit,
  // Link.configure({ openOnClick: false }),
  Image,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  // Underline,
  Table.configure({ resizable: false, HTMLAttributes: { class: 'tiptap-table' } }),
  TableRow,
  TableHeader,
  TableCell,
  TextStyle,
  Color,
  WidgetEmbedExtension,
]

/**
 * Patches the rendered HTML so that <h1>..<h6> elements include the `id`
 * attribute that TipTap's default Heading extension drops.
 *
 * We rely on the heading order in the JSON matching the heading order in the
 * generated HTML (which is the case for sequential block-level rendering).
 */
function injectHeadingIds(html: string, ids: string[]): string {
  if (ids.length === 0) return html
  let index = 0
  return html.replace(/<(h[1-6])(\s[^>]*)?>/g, (match, tag: string, attrs: string | undefined) => {
    if (index >= ids.length) return match
    const id = ids[index++]
    const existingAttrs = attrs ?? ''
    if (/\sid=/.test(existingAttrs)) return `<${tag}${existingAttrs}>`
    return `<${tag} id="${id}"${existingAttrs}>`
  })
}

export function renderBody(json: string | null | undefined): string {
  if (!json) return ''
  try {
    const parsed = JSON.parse(json)
    return generateHTML(parsed, baseExtensions)
  } catch {
    return json ?? ''
  }
}

export interface RenderBodyResult {
  bodyHtml: string
  tocHtml: string
}

/**
 * Renders the TipTap JSON body to HTML and, when requested, also produces a
 * Table of Contents HTML snippet derived from the document headings. Heading
 * elements in the resulting body HTML receive matching `id` anchors.
 */
export function renderBodyWithToc(
  json: string | null | undefined,
  options: { withToc?: boolean } = {},
): RenderBodyResult {
  if (!json) return { bodyHtml: '', tocHtml: '' }
  try {
    const parsed = JSON.parse(json)
    if (!options.withToc) {
      return { bodyHtml: generateHTML(parsed, baseExtensions), tocHtml: '' }
    }
    const headings = annotateHeadings(parsed)
    const rawHtml = generateHTML(parsed, baseExtensions)
    const bodyHtml = injectHeadingIds(
      rawHtml,
      headings.map((h) => h.id),
    )
    const tocHtml = buildTocHtml(headings)
    return { bodyHtml, tocHtml }
  } catch {
    return { bodyHtml: json ?? '', tocHtml: '' }
  }
}
