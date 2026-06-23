import { afterEach, describe, expect, test } from 'bun:test'
import { verifyBundleIntegrity } from './integrity'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function mockFetch(bytes: Uint8Array, ok = true, status = 200): void {
  globalThis.fetch = (async () =>
    ({
      ok,
      status,
      arrayBuffer: async () => bytes.buffer,
    }) as unknown as Response) as typeof fetch
}

describe('verifyBundleIntegrity', () => {
  test('returns true when the computed hash matches', async () => {
    const bytes = new TextEncoder().encode('plugin-bundle-contents')
    const expected = await sha256Hex(bytes)
    mockFetch(bytes)

    expect(await verifyBundleIntegrity('https://cdn.example.com/p.js', expected)).toBe(true)
  })

  test('strips the sha256- prefix from the expected hash', async () => {
    const bytes = new TextEncoder().encode('plugin-bundle-contents')
    const expected = await sha256Hex(bytes)
    mockFetch(bytes)

    expect(await verifyBundleIntegrity('https://cdn.example.com/p.js', `sha256-${expected}`)).toBe(
      true,
    )
  })

  test('returns false when the hash does not match', async () => {
    const bytes = new TextEncoder().encode('plugin-bundle-contents')
    mockFetch(bytes)

    expect(await verifyBundleIntegrity('https://cdn.example.com/p.js', 'deadbeef')).toBe(false)
  })

  test('throws when the fetch response is not ok', async () => {
    mockFetch(new Uint8Array(), false, 404)

    await expect(
      verifyBundleIntegrity('https://cdn.example.com/missing.js', 'whatever'),
    ).rejects.toThrow('Failed to fetch bundle')
  })
})
