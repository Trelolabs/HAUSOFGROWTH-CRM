import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import { redisClient } from '../config/redis'
import { ApiError } from '../utils/ApiError'

export type CampaignFileType = 'email' | 'sms'
export interface ParsedRow {
  name: string
  email?: string
  phone?: string
}

const SESSION_TTL_SECONDS = 60 * 60 // 1 hour

const NAME_HEADERS = ['name', 'fullname', 'full name', 'full_name', 'contact name']
const EMAIL_HEADERS = ['email', 'email address', 'emailaddress', 'e-mail']
const PHONE_HEADERS = ['phone', 'phone number', 'phonenumber', 'whatsapp', 'mobile', 'number']

function validateHeaders(headers: string[], type: CampaignFileType): void {
  const normalized = headers.map((h) => h.toLowerCase().trim())
  const hasName = NAME_HEADERS.some((h) => normalized.includes(h))
  const hasContact =
    type === 'email'
      ? EMAIL_HEADERS.some((h) => normalized.includes(h))
      : PHONE_HEADERS.some((h) => normalized.includes(h))

  if (!hasName && !hasContact) {
    const required = type === 'email' ? '"name" and "email"' : '"name" and "phone"'
    throw ApiError.badRequest(
      `Missing required columns: ${required}. Please check your file headers and try again.`,
      []
    )
  }
  if (!hasName) {
    throw ApiError.badRequest(
      'Missing required column: "name". Please add a name column to your file.',
      []
    )
  }
  if (!hasContact) {
    const col = type === 'email' ? '"email"' : '"phone"'
    throw ApiError.badRequest(
      `Missing required column: ${col}. Please add a ${type} column to your file.`,
      []
    )
  }
}

function normalizeRow(
  headers: string[],
  values: string[],
  type: CampaignFileType
): ParsedRow | null {
  const map: Record<string, string> = {}
  headers.forEach((h, i) => {
    map[h.toLowerCase().trim()] = String(values[i] ?? '').trim()
  })

  const name =
    map['name'] ??
    map['fullname'] ??
    map['full name'] ??
    map['full_name'] ??
    map['contact name'] ??
    ''

  if (!name) return null

  if (type === 'email') {
    const email =
      map['email'] ?? map['email address'] ?? map['emailaddress'] ?? map['e-mail'] ?? ''
    if (!email || !email.includes('@')) return null
    return { name, email }
  } else {
    const phone =
      map['phone'] ??
      map['phone number'] ??
      map['phonenumber'] ??
      map['whatsapp'] ??
      map['mobile'] ??
      map['number'] ??
      ''
    if (!phone) return null
    return { name, phone }
  }
}

function parseCsv(
  filePath: string,
  type: CampaignFileType,
  rows: ParsedRow[]
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let headers: string[] = []
    let isFirst = true

    const stream = fs.createReadStream(filePath)
    Papa.parse(stream as unknown as File, {
      worker: false,
      step: (result: { data: string[] }) => {
        if (isFirst) {
          headers = result.data.map((h) => String(h))
          isFirst = false
          return
        }
        const row = normalizeRow(headers, result.data, type)
        if (row) rows.push(row)
      },
      complete: () => resolve(headers),
      error: (err: Error) => reject(err),
    })
  })
}

function parseExcel(filePath: string, type: CampaignFileType, rows: ParsedRow[]): string[] {
  const wb = XLSX.readFile(filePath, {
    cellFormula: false,
    cellHTML: false,
    cellText: false,
    cellDates: false,
    sheetStubs: false,
  })

  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []

  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []

  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
  if (data.length < 1) return []

  const headers = (data[0] as string[]).map((h) => String(h))

  if (data.length < 2) return headers

  for (let i = 1; i < data.length; i++) {
    const values = (data[i] as string[]).map((v) => String(v))
    const row = normalizeRow(headers, values, type)
    if (row) rows.push(row)
  }

  return headers
}

export async function parseFile(
  filePath: string,
  type: CampaignFileType
): Promise<{ sessionId: string; total: number; preview: ParsedRow[] }> {
  const ext = path.extname(filePath).toLowerCase()
  const rows: ParsedRow[] = []
  let headers: string[] = []

  try {
    if (ext === '.csv') {
      headers = await parseCsv(filePath, type, rows)
    } else {
      headers = parseExcel(filePath, type, rows)
    }
  } finally {
    fs.unlink(filePath, () => {})
  }

  validateHeaders(headers, type)

  const sessionId = uuidv4()
  await redisClient.setex(`session:${sessionId}`, SESSION_TTL_SECONDS, JSON.stringify(rows))

  return { sessionId, total: rows.length, preview: rows.slice(0, 10) }
}

export async function getSession(sessionId: string): Promise<ParsedRow[] | null> {
  const raw = await redisClient.get(`session:${sessionId}`)
  if (!raw) return null
  return JSON.parse(raw) as ParsedRow[]
}

export async function setSession(sessionId: string, rows: ParsedRow[]): Promise<void> {
  await redisClient.setex(`session:${sessionId}`, SESSION_TTL_SECONDS, JSON.stringify(rows))
}
