import { describe, it, expect, vi, beforeEach } from 'vitest'
import { templateService } from '../templateService'

const mockTx = {
  template: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    template: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}))

import { prismadb } from '@/lib/prisma'

const mockPrisma = vi.mocked(prismadb)
const USER_ID = 'user-123'

const mockTemplate = {
  id: 'tpl-1',
  v: 0,
  userId: USER_ID,
  name: 'Intro Email',
  subject: 'Hello {{first_name}}|Nice to meet you {{first_name}}',
  body: 'Hi {{first_name}}, I saw you work at {{company}}. {{personalized_insert}} {{availability}}',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: null,
}

describe('templateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('returns all templates for user', async () => {
      mockPrisma.template.findMany.mockResolvedValue([mockTemplate])

      const result = await templateService.getTemplates(USER_ID)

      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      })
      expect(result).toEqual([mockTemplate])
    })
  })

  describe('getDefaultTemplate', () => {
    it('returns the default template', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate)

      const result = await templateService.getDefaultTemplate(USER_ID)

      expect(mockPrisma.template.findFirst).toHaveBeenCalledWith({
        where: { userId: USER_ID, isDefault: true },
      })
      expect(result).toEqual(mockTemplate)
    })

    it('returns null when no default template', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null)

      const result = await templateService.getDefaultTemplate(USER_ID)

      expect(result).toBeNull()
    })
  })

  describe('createTemplate', () => {
    it('creates a template in a transaction', async () => {
      mockTx.template.create.mockResolvedValue(mockTemplate)

      const result = await templateService.createTemplate(USER_ID, {
        name: 'Intro Email',
        subject: 'Hello {{first_name}}',
        body: 'Hi there',
      })

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockTx.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          name: 'Intro Email',
        }),
      })
      expect(result).toEqual(mockTemplate)
    })

    it('unsets other defaults when creating a default template', async () => {
      mockTx.template.updateMany.mockResolvedValue({ count: 1 })
      mockTx.template.create.mockResolvedValue(mockTemplate)

      await templateService.createTemplate(USER_ID, {
        name: 'Default',
        subject: 'Hi',
        body: 'Body',
        isDefault: true,
      })

      expect(mockTx.template.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, isDefault: true },
        data: { isDefault: false },
      })
    })
  })

  describe('updateTemplate', () => {
    it('updates a template in a transaction', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate)
      mockTx.template.update.mockResolvedValue({
        ...mockTemplate,
        name: 'Updated',
      })

      const result = await templateService.updateTemplate(USER_ID, 'tpl-1', {
        name: 'Updated',
      })

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(result.name).toBe('Updated')
    })

    it('throws when template not found', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null)

      await expect(
        templateService.updateTemplate(USER_ID, 'nonexistent', { name: 'X' })
      ).rejects.toThrow('Template not found')
    })
  })

  describe('deleteTemplate', () => {
    it('deletes a template', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate)
      mockPrisma.template.delete.mockResolvedValue(mockTemplate)

      await templateService.deleteTemplate(USER_ID, 'tpl-1')

      expect(mockPrisma.template.delete).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
      })
    })

    it('throws when template not found', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null)

      await expect(
        templateService.deleteTemplate(USER_ID, 'nonexistent')
      ).rejects.toThrow('Template not found')
    })
  })

  describe('renderTemplate', () => {
    it('replaces all placeholders with HTML-escaped values', () => {
      const contact = {
        first_name: 'John',
        company: 'Acme',
        personalized_insert: 'Great work on the project!',
      }
      const availability = 'I am free Tuesday at 2pm.'

      const result = templateService.renderTemplate(
        mockTemplate,
        contact,
        availability
      )

      expect(result.body).toContain('John')
      expect(result.body).toContain('Acme')
      expect(result.body).toContain('Great work on the project!')
      expect(result.body).toContain('I am free Tuesday at 2pm.')
    })

    it('HTML-escapes contact values to prevent XSS', () => {
      const contact = {
        first_name: '<script>alert("xss")</script>',
        company: 'Corp & Co',
      }

      const result = templateService.renderTemplate(
        { subject: 'Hi {{first_name}}', body: 'At {{company}}' },
        contact,
        ''
      )

      expect(result.subject).toContain('&lt;script&gt;')
      expect(result.subject).not.toContain('<script>')
      expect(result.body).toContain('Corp &amp; Co')
      expect(result.body).not.toContain('Corp & Co')
    })

    it('picks a random subject variant from pipe-separated subjects', () => {
      const contact = { first_name: 'Jane', company: 'Corp' }
      const result = templateService.renderTemplate(mockTemplate, contact, '')

      const possibleSubjects = [
        'Hello Jane',
        'Nice to meet you Jane',
      ]
      expect(possibleSubjects).toContain(result.subject)
    })

    it('handles missing contact fields gracefully', () => {
      const contact = { first_name: undefined, company: undefined }
      const result = templateService.renderTemplate(mockTemplate, contact, '')

      expect(result.body).not.toContain('{{first_name}}')
    })
  })
})
