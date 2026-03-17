/**
 * Verify SHA-256 integrity of a bundle fetched from a remote URL.
 * Returns true if the computed hash matches the expected hash.
 */
export async function verifyBundleIntegrity(
  bundleUrl: string,
  expectedHash: string,
): Promise<boolean> {
  const response = await fetch(bundleUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch bundle from ${bundleUrl}: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return computedHash === expectedHash.replace(/^sha256-/, '')
}
