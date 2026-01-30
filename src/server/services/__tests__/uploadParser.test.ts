import { describe, it, expect } from 'vitest'
import {
  parseCSV,
  parseXLSX,
  applyMapping,
  validateContacts,
  type ParsedUpload,
  type ColumnMapping,
} from '../uploadParser'

describe('parseCSV', () => {
  it('parses valid CSV with headers and rows', () => {
    const csv = 'First,Last,Email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com'
    const result = parseCSV(csv)

    expect(result.headers).toEqual(['First', 'Last', 'Email'])
    expect(result.rows).toHaveLength(2)
    expect(result.rowCount).toBe(2)
    expect(result.errors).toEqual([])
    expect(result.rows[0]).toEqual({ First: 'John', Last: 'Doe', Email: 'john@example.com' })
  })

  it('handles BOM prefix', () => {
    const csv = '\uFEFFName,Email\nAlice,alice@test.com'
    const result = parseCSV(csv)

    expect(result.headers).toEqual(['Name', 'Email'])
    expect(result.rows).toHaveLength(1)
  })

  it('detects semicolon delimiter', () => {
    const csv = 'Name;Email\nBob;bob@test.com'
    const result = parseCSV(csv)

    expect(result.headers).toEqual(['Name', 'Email'])
    expect(result.rows[0]).toEqual({ Name: 'Bob', Email: 'bob@test.com' })
  })

  it('handles malformed CSV with missing values', () => {
    const csv = 'A,B,C\n1,2\n4,5,6'
    const result = parseCSV(csv)

    expect(result.rowCount).toBe(2)
    // PapaParse omits missing trailing values
    expect(result.rows[0]).toMatchObject({ A: '1', B: '2' })
  })

  it('returns empty result for empty string', () => {
    const result = parseCSV('')
    expect(result.headers).toEqual([])
    expect(result.rows).toEqual([])
    expect(result.rowCount).toBe(0)
  })

  it('trims whitespace from headers', () => {
    const csv = ' Name , Email \nAlice,a@b.com'
    const result = parseCSV(csv)

    expect(result.headers).toEqual(['Name', 'Email'])
  })
})

describe('parseXLSX', () => {
  it('parses a valid XLSX buffer', () => {
    // Build a minimal XLSX using SheetJS
    const XLSX = require('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
      ['First', 'Last', 'Email'],
      ['John', 'Doe', 'john@example.com'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))

    const result = parseXLSX(buffer)

    expect(result.headers).toEqual(['First', 'Last', 'Email'])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toEqual({ First: 'John', Last: 'Doe', Email: 'john@example.com' })
    expect(result.rowCount).toBe(1)
    expect(result.errors).toEqual([])
  })

  it('takes the first sheet only', () => {
    const XLSX = require('xlsx')
    const ws1 = XLSX.utils.aoa_to_sheet([['A'], ['1']])
    const ws2 = XLSX.utils.aoa_to_sheet([['B'], ['2']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'First')
    XLSX.utils.book_append_sheet(wb, ws2, 'Second')
    const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))

    const result = parseXLSX(buffer)

    expect(result.headers).toEqual(['A'])
    expect(result.rows[0]).toEqual({ A: '1' })
  })
})

describe('applyMapping', () => {
  it('maps source columns to contact fields', () => {
    const parsed: ParsedUpload = {
      headers: ['First', 'Last', 'Email'],
      rows: [
        { First: 'John', Last: 'Doe', Email: 'john@example.com' },
      ],
      rowCount: 1,
      errors: [],
    }
    const mapping: ColumnMapping = {
      First: 'first_name',
      Last: 'last_name',
      Email: 'email',
    }

    const result = applyMapping(parsed, mapping)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      connection_stage: 'DRAFTED',
      v: 0,
    })
  })

  it('ignores unmapped columns', () => {
    const parsed: ParsedUpload = {
      headers: ['Name', 'Extra'],
      rows: [{ Name: 'Alice', Extra: 'ignore' }],
      rowCount: 1,
      errors: [],
    }
    const mapping: ColumnMapping = { Name: 'last_name' }

    const result = applyMapping(parsed, mapping)

    expect(result[0]).not.toHaveProperty('Extra')
    expect(result[0]).toMatchObject({ last_name: 'Alice' })
  })

  it('sets default connection_stage and v', () => {
    const parsed: ParsedUpload = {
      headers: ['Last'],
      rows: [{ Last: 'Smith' }],
      rowCount: 1,
      errors: [],
    }

    const result = applyMapping(parsed, { Last: 'last_name' })

    expect(result[0].connection_stage).toBe('DRAFTED')
    expect(result[0].v).toBe(0)
  })
})

describe('validateContacts', () => {
  it('passes valid contacts', () => {
    const contacts = [
      { last_name: 'Doe', email: 'john@example.com', connection_stage: 'DRAFTED' as const, v: 0 },
    ]

    const result = validateContacts(contacts)

    expect(result.valid).toHaveLength(1)
    expect(result.errors).toEqual([])
  })

  it('rejects contacts missing last_name', () => {
    const contacts = [
      { last_name: '', email: 'a@b.com', connection_stage: 'DRAFTED' as const, v: 0 },
    ]

    const result = validateContacts(contacts)

    expect(result.valid).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('last_name')
  })

  it('rejects contacts with invalid email format', () => {
    const contacts = [
      { last_name: 'Doe', email: 'not-an-email', connection_stage: 'DRAFTED' as const, v: 0 },
    ]

    const result = validateContacts(contacts)

    expect(result.valid).toHaveLength(0)
    expect(result.errors[0].message).toContain('email')
  })

  it('allows contacts with no email (email is optional)', () => {
    const contacts = [
      { last_name: 'Doe', connection_stage: 'DRAFTED' as const, v: 0 },
    ]

    const result = validateContacts(contacts)

    expect(result.valid).toHaveLength(1)
  })

  it('caps at 200 rows', () => {
    const contacts = Array.from({ length: 250 }, (_, i) => ({
      last_name: `Person${i}`,
      connection_stage: 'DRAFTED' as const,
      v: 0,
    }))

    const result = validateContacts(contacts)

    expect(result.valid).toHaveLength(200)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('200')
  })

  it('returns both valid and invalid contacts separately', () => {
    const contacts = [
      { last_name: 'Good', email: 'good@test.com', connection_stage: 'DRAFTED' as const, v: 0 },
      { last_name: '', email: 'bad@test.com', connection_stage: 'DRAFTED' as const, v: 0 },
      { last_name: 'Also Good', connection_stage: 'DRAFTED' as const, v: 0 },
    ]

    const result = validateContacts(contacts)

    expect(result.valid).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
  })
})
