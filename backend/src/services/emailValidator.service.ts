import axios from 'axios'
import { env } from '../config/env'
import { getSession, setSession, ParsedRow } from './fileParser.service'

export interface EmailValidationResult {
  valid: Array<{ name: string; email: string }>
  invalid: Array<{ name: string; email: string; reason: string }>
  risky: Array<{ name: string; email: string }>
  counts: { valid: number; invalid: number; risky: number }
}

const PLACEHOLDER_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
const BATCH_SIZE = 20

export async function validateEmails(sessionId: string): Promise<EmailValidationResult> {
  const rows = await getSession(sessionId)
  if (!rows) throw new Error('Session not found or expired')

  const emailRows = rows.filter((r): r is ParsedRow & { email: string } => !!r.email)

  // If no real API key configured, treat all as valid (key is added later)
  if (!env.ABSTRACT_API_KEY || env.ABSTRACT_API_KEY === PLACEHOLDER_KEY) {
    const valid = emailRows.map((r) => ({ name: r.name, email: r.email }))
    // Overwrite session with valid-only entries so /send uses clean data
    await setSession(sessionId, valid.map((r) => ({ name: r.name, email: r.email })))
    return {
      valid,
      invalid: [],
      risky: [],
      counts: { valid: valid.length, invalid: 0, risky: 0 },
    }
  }

  const result: EmailValidationResult = { valid: [], invalid: [], risky: [], counts: { valid: 0, invalid: 0, risky: 0 } }

  // Process in parallel batches of 20
  for (let i = 0; i < emailRows.length; i += BATCH_SIZE) {
    const batch = emailRows.slice(i, i + BATCH_SIZE)

    const settled = await Promise.allSettled(
      batch.map((row) => checkAbstractApi(row.email))
    )

    settled.forEach((res, idx) => {
      const row = batch[idx]!
      if (res.status === 'rejected') {
        result.risky.push({ name: row.name, email: row.email })
        return
      }
      const deliverability = res.value
      if (deliverability === 'DELIVERABLE') {
        result.valid.push({ name: row.name, email: row.email })
      } else if (deliverability === 'UNDELIVERABLE') {
        result.invalid.push({ name: row.name, email: row.email, reason: 'Undeliverable' })
      } else {
        result.risky.push({ name: row.name, email: row.email })
      }
    })
  }

  result.counts = {
    valid: result.valid.length,
    invalid: result.invalid.length,
    risky: result.risky.length,
  }

  // Overwrite session with only valid recipients — invalid + risky are skipped
  await setSession(sessionId, result.valid.map((r) => ({ name: r.name, email: r.email })))

  return result
}

async function checkAbstractApi(email: string): Promise<string> {
  const { data } = await axios.get<{ deliverability: string }>(
    'https://emailvalidation.abstractapi.com/v1/',
    {
      params: { api_key: env.ABSTRACT_API_KEY, email },
      timeout: 10_000,
    }
  )
  return data.deliverability
}
