import crypto from 'crypto'

/**
 * Verifies a Svix-signed webhook (Resend uses Svix under the hood) without the
 * `svix` SDK, using only Node's crypto. Returns true when the payload is
 * authentic and recent.
 *
 * Scheme: signedContent = `${svix-id}.${svix-timestamp}.${rawBody}`
 *   signature = base64( HMAC_SHA256(decodedSecret, signedContent) )
 * The `svix-signature` header is a space-separated list of `v1,<sig>` tokens;
 * a match against any one is sufficient.
 */
export function verifySvixSignature(params: {
  secret: string
  rawBody: string
  headers: {
    id?: string | string[]
    timestamp?: string | string[]
    signature?: string | string[]
  }
  toleranceSeconds?: number
}): boolean {
  const { secret, rawBody, headers, toleranceSeconds = 300 } = params

  const id = first(headers.id)
  const timestamp = first(headers.timestamp)
  const signatureHeader = first(headers.signature)
  if (!id || !timestamp || !signatureHeader) return false

  // Reject stale payloads to blunt replay attacks.
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  const skew = Math.abs(Date.now() / 1000 - ts)
  if (skew > toleranceSeconds) return false

  // Secret is `whsec_<base64>`; the HMAC key is the decoded base64 portion.
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', key).update(signedContent).digest('base64')

  // Header may carry several versioned signatures: "v1,<sig> v1,<sig2>".
  return signatureHeader.split(' ').some((token) => {
    const sig = token.includes(',') ? token.split(',')[1] : token
    return timingSafeEqual(sig, expected)
  })
}

function first(v?: string | string[]): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}
