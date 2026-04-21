export interface TocHeading {
  id: string
  level: number
  text: string
}

interface TipTapNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  text?: string
  marks?: unknown[]
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function ensureUniqueSlug(base: string, used: Set<string>): string {
  const root = base || 'section'
  if (!used.has(root)) {
    used.add(root)
    return root
  }
  let counter = 2
  while (used.has(`${root}-${counter}`)) counter++
  const final = `${root}-${counter}`
  used.add(final)
  return final
}

function extractText(node: TipTapNode): string {
  if (node.text) return node.text
  if (!Array.isArray(node.content)) return ''
  return node.content.map(extractText).join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Walks the TipTap document, assigns unique slug IDs to all heading nodes
 * (mutating the JSON in place), and returns the collected headings.
 */
export function annotateHeadings(doc: TipTapNode): TocHeading[] {
  const headings: TocHeading[] = []
  const used = new Set<string>()

  function visit(node: TipTapNode): void {
    if (node.type === 'heading') {
      const text = extractText(node).trim()
      const level = Number(node.attrs?.level) || 1
      const existingId =
        typeof node.attrs?.id === 'string' && node.attrs.id ? (node.attrs.id as string) : null
      const id = existingId
        ? ensureUniqueSlug(existingId, used)
        : ensureUniqueSlug(slugify(text), used)
      node.attrs = { ...(node.attrs ?? {}), level, id }
      headings.push({ id, level, text })
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) visit(child)
    }
  }

  visit(doc)
  return headings
}

/**
 * Builds a nested <ul> Table of Contents HTML from a flat list of headings.
 * Each item is a link to the corresponding heading anchor.
 */
export function buildTocHtml(headings: TocHeading[]): string {
  if (headings.length === 0) return ''

  let html = ''
  const stack: number[] = []

  for (const heading of headings) {
    const level = heading.level

    while (stack.length > 0 && (stack[stack.length - 1] ?? 0) > level) {
      html += '</li></ul>'
      stack.pop()
    }

    const top = stack[stack.length - 1]
    if (stack.length > 0 && top === level) {
      html += '</li>'
    } else {
      const cls = stack.length === 0 ? 'toc-list' : 'toc-sublist'
      html += `<ul class="${cls}">`
      stack.push(level)
    }

    html += `<li class="toc-item toc-item-h${level}"><a href="#${heading.id}">${escapeHtml(
      heading.text,
    )}</a>`
  }

  while (stack.length > 0) {
    html += '</li></ul>'
    stack.pop()
  }

  return `<nav class="toc" aria-label="Table of contents">${html}</nav>`
}
