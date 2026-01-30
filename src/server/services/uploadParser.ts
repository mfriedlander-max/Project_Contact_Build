import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParsedUpload {
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
  errors: Array<{ row: number; message: string }>
}

export interface ColumnMapping {
  [sourceColumn: string]: string
}

export interface ContactCreateInput {
  last_name: string
  first_name?: string
  email?: string
  company?: string
  position?: string
  connection_stage: 'DRAFTED' | 'MESSAGE_SENT' | 'DIDNT_CONNECT' | 'CONNECTED' | 'IN_TOUCH'
  campaignId?: string
  v: number
  [key: string]: string | number | undefined
}

export interface ValidationError {
  row: number
  message: string
}

export function parseCSV(content: string): ParsedUpload {
  if (!content.trim()) {
    return { headers: [], rows: [], rowCount: 0, errors: [] }
  }

  const cleaned = content.replace(/^\uFEFF/, '')

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  })

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    rowCount: result.data.length,
    errors: result.errors.map((e) => ({
      row: e.row ?? 0,
      message: e.message,
    })),
  }
}

export function parseXLSX(buffer: Buffer): ParsedUpload {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    return { headers: [], rows: [], rowCount: 0, errors: [] }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })

  if (jsonData.length === 0) {
    return { headers: [], rows: [], rowCount: 0, errors: [] }
  }

  const headers = Object.keys(jsonData[0])
  const rows = jsonData.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, val]) => [key, String(val)])
    )
  )

  return { headers, rows, rowCount: rows.length, errors: [] }
}

export function applyMapping(
  parsed: ParsedUpload,
  mapping: ColumnMapping
): ContactCreateInput[] {
  return parsed.rows.map((row) => {
    const mapped = Object.entries(mapping).reduce<Record<string, string>>(
      (acc, [sourceCol, targetField]) => ({
        ...acc,
        [targetField]: row[sourceCol] ?? '',
      }),
      {}
    )

    return {
      ...mapped,
      connection_stage: (mapped.connection_stage ?? 'DRAFTED') as ContactCreateInput['connection_stage'],
      v: 0,
      last_name: mapped.last_name ?? '',
    } as ContactCreateInput
  })
}

export function validateContacts(
  contacts: ContactCreateInput[]
): { valid: ContactCreateInput[]; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  if (contacts.length > 200) {
    errors.push({
      row: -1,
      message: `Upload exceeds maximum of 200 rows (got ${contacts.length})`,
    })
  }

  const capped = contacts.slice(0, 200)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const valid = capped.filter((contact, index) => {
    if (!contact.last_name || contact.last_name.trim() === '') {
      errors.push({
        row: index,
        message: `Row ${index}: last_name is required`,
      })
      return false
    }

    if (contact.email && !emailRegex.test(contact.email)) {
      errors.push({
        row: index,
        message: `Row ${index}: invalid email format`,
      })
      return false
    }

    return true
  })

  return { valid, errors }
}
