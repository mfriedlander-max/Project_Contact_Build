import { describe, it, expect } from 'vitest'
import { columns, WORKFLOW_COLUMN_IDS, getColumnById } from '../columns'

describe('Contact Table Columns', () => {
  describe('column definitions', () => {
    it('should include all workflow columns', () => {
      const columnIds = columns.map((col) => col.id ?? (col as { accessorKey?: string }).accessorKey)

      // Core identity columns
      expect(columnIds).toContain('first_name')
      expect(columnIds).toContain('last_name')
      expect(columnIds).toContain('email')

      // Workflow columns for Student Networking CRM
      expect(columnIds).toContain('company')
      expect(columnIds).toContain('position')
      expect(columnIds).toContain('email_confidence')
      expect(columnIds).toContain('personalized_insert')
      expect(columnIds).toContain('insert_confidence')
      expect(columnIds).toContain('email_status')
      expect(columnIds).toContain('connection_level')
      expect(columnIds).toContain('campaign')
    })

    it('should have actions column', () => {
      const actionsColumn = columns.find((col) => col.id === 'actions')
      expect(actionsColumn).toBeDefined()
    })
  })

  describe('WORKFLOW_COLUMN_IDS constant', () => {
    it('should export workflow column identifiers', () => {
      expect(WORKFLOW_COLUMN_IDS).toBeDefined()
      expect(WORKFLOW_COLUMN_IDS).toContain('company')
      expect(WORKFLOW_COLUMN_IDS).toContain('email_confidence')
      expect(WORKFLOW_COLUMN_IDS).toContain('personalized_insert')
      expect(WORKFLOW_COLUMN_IDS).toContain('email_status')
      expect(WORKFLOW_COLUMN_IDS).toContain('connection_level')
    })
  })

  describe('getColumnById helper', () => {
    it('should return column by id', () => {
      const emailColumn = getColumnById('email')
      expect(emailColumn).toBeDefined()
    })

    it('should return undefined for non-existent column', () => {
      const nonExistent = getColumnById('non_existent_column')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('email_confidence column', () => {
    it('should be sortable', () => {
      const column = getColumnById('email_confidence')
      expect(column?.enableSorting).toBe(true)
    })

    it('should be hideable', () => {
      const column = getColumnById('email_confidence')
      expect(column?.enableHiding).toBe(true)
    })
  })

  describe('email_status column', () => {
    it('should be sortable', () => {
      const column = getColumnById('email_status')
      expect(column?.enableSorting).toBe(true)
    })
  })

  describe('connection_level column', () => {
    it('should be sortable', () => {
      const column = getColumnById('connection_level')
      expect(column?.enableSorting).toBe(true)
    })
  })

  describe('personalized_insert column', () => {
    it('should be hideable', () => {
      const column = getColumnById('personalized_insert')
      expect(column?.enableHiding).toBe(true)
    })
  })
})
