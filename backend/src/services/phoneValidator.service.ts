import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'
import { getSession, setSession, ParsedRow } from './fileParser.service'

export interface PhoneValidationResult {
  valid: Array<{ name: string; phone: string }>
  invalid: Array<{ name: string; phone: string; reason: string }>
  counts: { valid: number; invalid: number }
}

export async function validatePhones(sessionId: string): Promise<PhoneValidationResult> {
  const rows = await getSession(sessionId)
  if (!rows) throw new Error('Session not found or expired')

  const phoneRows = rows.filter((r): r is ParsedRow & { phone: string } => !!r.phone)

  const result: PhoneValidationResult = { valid: [], invalid: [], counts: { valid: 0, invalid: 0 } }

  for (const row of phoneRows) {
    try {
      // Try with US as default country, then try as international
      const isValid =
        isValidPhoneNumber(row.phone, 'US') ||
        isValidPhoneNumber(row.phone)

      if (isValid) {
        const parsed = parsePhoneNumber(row.phone, 'US')
        result.valid.push({ name: row.name, phone: parsed.format('E.164') })
      } else {
        result.invalid.push({ name: row.name, phone: row.phone, reason: 'Invalid format' })
      }
    } catch {
      result.invalid.push({ name: row.name, phone: row.phone, reason: 'Could not parse' })
    }
  }

  result.counts = { valid: result.valid.length, invalid: result.invalid.length }

  // Overwrite session with only valid phones — invalid are skipped on send
  await setSession(
    sessionId,
    result.valid.map((r) => ({ name: r.name, phone: r.phone }))
  )

  return result
}
