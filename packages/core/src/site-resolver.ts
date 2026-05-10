import { siteDomains, sites } from '@viseed/schema'
import type { SiteContext } from '@viseed/types'
import { SINGLE_SITE_CONTEXT } from '@viseed/types'
import { eq } from 'drizzle-orm'
import type { DatabaseInstance } from './database'

const DEFAULT_SITE_ID = SINGLE_SITE_CONTEXT.id
const EXPLICIT_SITE_FALLBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export interface SiteResolutionResult {
  site: SiteContext | null
  usedFallback: boolean
  error: string | null
}

function toSiteContext(row: { id: string; slug: string; name: string }): SiteContext {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isDefault: row.id === DEFAULT_SITE_ID,
  }
}

function normalizeHost(rawHostHeader: string | undefined): string | null {
  if (!rawHostHeader) {
    return null
  }

  const value = rawHostHeader.trim().toLowerCase()
  if (!value) {
    return null
  }

  if (value.startsWith('[')) {
    const end = value.indexOf(']')
    if (end <= 0) {
      return null
    }
    return value.slice(1, end)
  }

  const [host] = value.split(':')
  if (!host) {
    return null
  }

  return host.replace(/\.$/, '')
}

async function resolveDefaultSite(db: DatabaseInstance): Promise<SiteContext> {
  const [defaultSite] = await db.select().from(sites).where(eq(sites.id, DEFAULT_SITE_ID))

  if (!defaultSite) {
    return { ...SINGLE_SITE_CONTEXT }
  }

  return toSiteContext(defaultSite)
}

export async function resolveSiteContextByHost(
  db: DatabaseInstance,
  rawHostHeader: string | undefined,
): Promise<SiteResolutionResult> {
  const normalizedHost = normalizeHost(rawHostHeader)

  if (!normalizedHost || EXPLICIT_SITE_FALLBACK_HOSTS.has(normalizedHost)) {
    const fallbackSite = await resolveDefaultSite(db)
    return {
      site: fallbackSite,
      usedFallback: true,
      error: null,
    }
  }

  const [domain] = await db
    .select({
      siteId: siteDomains.siteId,
    })
    .from(siteDomains)
    .where(eq(siteDomains.domain, normalizedHost))

  if (!domain) {
    return {
      site: null,
      usedFallback: false,
      error: `Host "${normalizedHost}" is not mapped to any site.`,
    }
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, domain.siteId))

  if (!site) {
    return {
      site: null,
      usedFallback: false,
      error: `Site "${domain.siteId}" configured for host "${normalizedHost}" does not exist.`,
    }
  }

  if (site.status !== 'active') {
    return {
      site: null,
      usedFallback: false,
      error: `Site "${site.slug}" is not active.`,
    }
  }

  return {
    site: toSiteContext(site),
    usedFallback: false,
    error: null,
  }
}
