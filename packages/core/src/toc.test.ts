import { describe, expect, test } from 'bun:test'
import { annotateHeadings, buildTocHtml, type TocHeading } from './toc'

function heading(level: number, text: string, attrs?: Record<string, unknown>) {
  return {
    type: 'heading',
    attrs: { level, ...attrs },
    content: [{ type: 'text', text }],
  }
}

describe('annotateHeadings', () => {
  test('collects headings and assigns slug ids', () => {
    const doc = { type: 'doc', content: [heading(2, 'Hello World')] }
    const headings = annotateHeadings(doc)

    expect(headings).toEqual([{ id: 'hello-world', level: 2, text: 'Hello World' }])
  })

  test('slugifies Vietnamese text by removing diacritics', () => {
    const doc = { type: 'doc', content: [heading(2, 'Bài viết Đặc biệt')] }
    const headings = annotateHeadings(doc)

    expect(headings[0]?.id).toBe('bai-viet-dac-biet')
  })

  test('disambiguates duplicate slugs with numeric suffixes', () => {
    const doc = {
      type: 'doc',
      content: [heading(2, 'Intro'), heading(2, 'Intro'), heading(2, 'Intro')],
    }
    const headings = annotateHeadings(doc)

    expect(headings.map((h) => h.id)).toEqual(['intro', 'intro-2', 'intro-3'])
  })

  test('keeps an existing id when present', () => {
    const doc = { type: 'doc', content: [heading(2, 'Hello', { id: 'custom-id' })] }
    const headings = annotateHeadings(doc)

    expect(headings[0]?.id).toBe('custom-id')
  })

  test('mutates heading attrs in place with id and level', () => {
    const node = heading(3, 'Section')
    const doc = { type: 'doc', content: [node] }
    annotateHeadings(doc)

    expect(node.attrs).toMatchObject({ id: 'section', level: 3 })
  })

  test('returns an empty list for a document with no headings', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ text: 'x' }] }] }
    expect(annotateHeadings(doc)).toEqual([])
  })
})

describe('buildTocHtml', () => {
  test('returns an empty string when there are no headings', () => {
    expect(buildTocHtml([])).toBe('')
  })

  test('wraps output in a nav element', () => {
    const headings: TocHeading[] = [{ id: 'a', level: 2, text: 'A' }]
    const html = buildTocHtml(headings)

    expect(html.startsWith('<nav class="toc" aria-label="Table of contents">')).toBe(true)
    expect(html.endsWith('</nav>')).toBe(true)
    expect(html).toContain('<a href="#a">A</a>')
  })

  test('escapes heading text', () => {
    const headings: TocHeading[] = [{ id: 'a', level: 2, text: '<b>&"' }]
    const html = buildTocHtml(headings)

    expect(html).toContain('&lt;b&gt;&amp;&quot;')
  })

  test('nests sublists for deeper levels', () => {
    const headings: TocHeading[] = [
      { id: 'a', level: 2, text: 'A' },
      { id: 'b', level: 3, text: 'B' },
    ]
    const html = buildTocHtml(headings)

    expect(html).toContain('toc-sublist')
  })
})
