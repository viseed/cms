// ---------------------------------------------------------------------------
// Required layout keys — every theme MUST provide these
// ---------------------------------------------------------------------------
export type RequiredLayoutKey = 'home' | 'post' | 'category' | 'page' | '404'

// ---------------------------------------------------------------------------
// Optional layout keys — themes MAY provide these
// ---------------------------------------------------------------------------
export type OptionalLayoutKey = 'tag' | 'author' | 'search' | 'archive'

// ---------------------------------------------------------------------------
// All recognised layout keys (required + optional)
// ---------------------------------------------------------------------------
export type ThemeLayoutKey = RequiredLayoutKey | OptionalLayoutKey

// ---------------------------------------------------------------------------
// Layout data contracts — core uses these to fetch the right data per layout
// ---------------------------------------------------------------------------

export interface HomeLayoutData {
  posts: unknown[]
  categories: unknown[]
}

export interface PostLayoutData {
  post: unknown
  relatedPosts: unknown[]
  comments?: unknown[]
}

export interface CategoryLayoutData {
  category: unknown
  posts: unknown[]
}

export interface PageLayoutData {
  page: unknown
}

export type NotFoundLayoutData = Record<string, never>

/**
 * Maps each required layout key to its data contract.
 * Core relies on this map to know what to fetch before rendering.
 */
export interface LayoutDataMap {
  home: HomeLayoutData
  post: PostLayoutData
  category: CategoryLayoutData
  page: PageLayoutData
  '404': NotFoundLayoutData
}

// ---------------------------------------------------------------------------
// Menu zones — theme declares which zones it supports; admin fills the items
// ---------------------------------------------------------------------------

export type RequiredMenuZone = 'primary' | 'footer'
export type OptionalMenuZone = 'mobile'
export type ThemeMenuZone = RequiredMenuZone | OptionalMenuZone

export interface ThemeMenuItem {
  label: string
  url: string
  target?: '_self' | '_blank'
  children?: ThemeMenuItem[]
}

/**
 * Theme declares the menu zones it renders.
 * Actual menu items are managed by admin UI / plugins at runtime.
 */
export type ThemeMenuDeclaration = RequiredMenuZone[] | ThemeMenuZone[]

// ---------------------------------------------------------------------------
// Layout variant convention (reserved, NOT implemented in this plan)
//
// Future plans may allow keys like "post.default", "post.fullWidth".
// For now every layout key maps to exactly one ThemeLayoutEntry.
// ---------------------------------------------------------------------------
