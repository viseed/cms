import type { LayoutContext, LayoutHelpers } from '@viseed/types'

/**
 * Subset of the SEO meta-tag shape persisted by plugin-pages / plugin-blog.
 * Kept loose because we read it from arbitrary layout data.
 */
interface MetaSeoLike {
  metaTitle?: string | null
  metaDescription?: string | null
  ogImage?: string | null
  canonicalUrl?: string | null
}

/** A schema.org JSON-LD item (already JSON-serialisable). */
type SchemaOrgItemLike = Record<string, unknown>

interface SeoSubject {
  /** Best-effort human title for the current page. */
  title?: string
  /** Best-effort plain-text description for the current page. */
  description?: string
  /** Image URL (already absolute or absolute-able). */
  image?: string
  /** Canonical path or URL. */
  canonical?: string
  /** Open Graph type, e.g. `website`, `article`. */
  ogType: 'website' | 'article'
  /** JSON-LD blocks to emit. */
  jsonLd: SchemaOrgItemLike[]
}

const ABSOLUTE_URL_RE = /^([a-z][a-z0-9+.-]*:)?\/\//i

function getOrigin(requestUrl: string): string {
  try {
    return new URL(requestUrl).origin
  } catch {
    return ''
  }
}

function buildAbsoluteUrl(origin: string, pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return ''
  const trimmed = String(pathOrUrl).trim()
  if (!trimmed) return ''
  if (ABSOLUTE_URL_RE.test(trimmed)) return trimmed
  if (!origin) return trimmed
  if (trimmed.startsWith('/')) return `${origin}${trimmed}`
  return `${origin}/${trimmed}`
}

function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function buildExcerpt(input: string | null | undefined, maxLength = 160): string {
  if (!input) return ''
  const text = stripHtml(String(input))
  if (text.length <= maxLength) return text
  const slice = text.slice(0, maxLength)
  const lastSpace = slice.lastIndexOf(' ')
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Stringify a value for safe embedding inside `<script type="application/ld+json">`. */
function escapeJsonLd(value: unknown): string {
  // Replace `</` to prevent breaking out of the script tag and unicode-escape line separators.
  return JSON.stringify(value ?? null)
    .replace(/<\//g, '<\\/')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function pickString(...values: Array<unknown>): string | undefined {
  for (const v of values) {
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed) return trimmed
    }
  }
  return undefined
}

/** Read a string-typed field off an arbitrary record, tolerating `null`/missing values. */
function readStr(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' ? value : undefined
}

function readMetaSeo(source: unknown): MetaSeoLike | undefined {
  if (!source || typeof source !== 'object') return undefined
  const obj = source as Record<string, unknown>
  const candidate = obj.metaSeo
  return candidate && typeof candidate === 'object' ? (candidate as MetaSeoLike) : undefined
}

function readSchemaOrg(source: unknown): SchemaOrgItemLike[] {
  if (!source || typeof source !== 'object') return []
  const obj = source as Record<string, unknown>
  const candidate = obj.schemaOrg
  return Array.isArray(candidate) ? (candidate as SchemaOrgItemLike[]) : []
}

function resolveSubject(context: LayoutContext): SeoSubject {
  const data = context.data as Record<string, unknown>
  const settings = context.settings as Record<string, unknown>

  const siteName =
    pickString(settings['general.siteName'], settings['general.siteTitle'], settings.siteTitle) ??
    'Viseed CMS'
  const siteDescription = pickString(settings['general.siteDescription'], settings.siteDescription)

  const post = data.post as Record<string, unknown> | undefined
  const page = data.page as Record<string, unknown> | undefined
  const category = data.category as Record<string, unknown> | undefined

  if (post) {
    const meta = readMetaSeo(post)
    const title = pickString(meta?.metaTitle, readStr(post, 'title')) ?? siteName
    const description =
      pickString(meta?.metaDescription, readStr(post, 'excerpt')) ??
      pickString(buildExcerpt(readStr(post, 'body'))) ??
      siteDescription
    return {
      title: `${title} — ${siteName}`,
      description,
      image: pickString(meta?.ogImage, readStr(post, 'coverImage')),
      canonical:
        pickString(meta?.canonicalUrl) ?? `/post/${pickString(readStr(post, 'slug')) ?? ''}`,
      ogType: 'article',
      jsonLd: readSchemaOrg(post),
    }
  }

  if (page) {
    const meta = readMetaSeo(page)
    const title = pickString(meta?.metaTitle, readStr(page, 'title')) ?? siteName
    const description =
      pickString(meta?.metaDescription) ??
      pickString(buildExcerpt(readStr(page, 'body'))) ??
      siteDescription
    return {
      title: `${title} — ${siteName}`,
      description,
      image: pickString(meta?.ogImage),
      canonical: pickString(meta?.canonicalUrl) ?? `/${pickString(readStr(page, 'slug')) ?? ''}`,
      ogType: 'article',
      jsonLd: readSchemaOrg(page),
    }
  }

  if (category) {
    const name = pickString(readStr(category, 'name')) ?? siteName
    return {
      title: `${name} — ${siteName}`,
      description: pickString(readStr(category, 'description')) ?? siteDescription,
      canonical: `/category/${pickString(readStr(category, 'slug')) ?? ''}`,
      ogType: 'website',
      jsonLd: [],
    }
  }

  return {
    title: siteName,
    description: siteDescription,
    canonical: '/',
    ogType: 'website',
    jsonLd: [],
  }
}

/**
 * Render a complete SEO `<head>` fragment from the layout context.
 * Output is HTML-safe and intended to be injected with Eta's raw output operator (`<%~ %>`).
 */
export function renderSeoHead(context: LayoutContext): string {
  const subject = resolveSubject(context)
  const origin = getOrigin(context.request?.url ?? '')

  const lines: string[] = []
  const push = (line: string) => {
    if (line) lines.push(line)
  }

  if (subject.title) {
    push(`<title>${escapeHtmlText(subject.title)}</title>`)
  }

  if (subject.description) {
    const desc = escapeHtmlAttr(subject.description)
    push(`<meta name="description" content="${desc}">`)
    push(`<meta property="og:description" content="${desc}">`)
    push(`<meta name="twitter:description" content="${desc}">`)
  }

  if (subject.title) {
    const title = escapeHtmlAttr(subject.title)
    push(`<meta property="og:title" content="${title}">`)
    push(`<meta name="twitter:title" content="${title}">`)
  }

  push(`<meta property="og:type" content="${subject.ogType}">`)

  const canonicalAbs = buildAbsoluteUrl(origin, subject.canonical)
  if (canonicalAbs) {
    const canonical = escapeHtmlAttr(canonicalAbs)
    push(`<link rel="canonical" href="${canonical}">`)
    push(`<meta property="og:url" content="${canonical}">`)
  }

  const imageAbs = buildAbsoluteUrl(origin, subject.image)
  if (imageAbs) {
    const image = escapeHtmlAttr(imageAbs)
    push(`<meta property="og:image" content="${image}">`)
    push(`<meta name="twitter:image" content="${image}">`)
    push(`<meta name="twitter:card" content="summary_large_image">`)
  } else {
    push(`<meta name="twitter:card" content="summary">`)
  }

  for (const item of subject.jsonLd) {
    if (!item || typeof item !== 'object') continue
    const withContext = '@context' in item ? item : { '@context': 'https://schema.org', ...item }
    push(`<script type="application/ld+json">${escapeJsonLd(withContext)}</script>`)
  }

  return lines.join('\n')
}

/** Build the helper bag exposed on `LayoutContext.helpers`. */
export function createLayoutHelpers(requestUrl: string): LayoutHelpers {
  const origin = getOrigin(requestUrl)
  return {
    seoHead: (ctx) => renderSeoHead(ctx),
    absoluteUrl: (pathOrUrl) => buildAbsoluteUrl(origin, pathOrUrl ?? ''),
    excerpt: (input, maxLength) => buildExcerpt(input, maxLength),
    escapeJsonLd: (value) => escapeJsonLd(value),
  }
}
