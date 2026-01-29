import { prismadb } from '@/lib/prisma'
import { escapeHtml } from '@/src/lib/sanitize'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  isDefault: z.boolean().optional(),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
})

type CreateTemplateInput = z.infer<typeof createTemplateSchema>
type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>

interface TemplateContact {
  first_name?: string | null
  company?: string | null
  personalized_insert?: string | null
}

interface RenderedTemplate {
  subject: string
  body: string
}

function replacePlaceholders(
  text: string,
  contact: TemplateContact,
  availability: string
): string {
  return text
    .replace(/\{\{first_name\}\}/g, escapeHtml(contact.first_name ?? ''))
    .replace(/\{\{company\}\}/g, escapeHtml(contact.company ?? ''))
    .replace(/\{\{personalized_insert\}\}/g, escapeHtml(contact.personalized_insert ?? ''))
    .replace(/\{\{availability\}\}/g, escapeHtml(availability))
}

export const templateService = {
  async getTemplates(userId: string) {
    return prismadb.template.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
  },

  async getDefaultTemplate(userId: string) {
    return prismadb.template.findFirst({
      where: { userId, isDefault: true },
    })
  },

  async createTemplate(userId: string, data: CreateTemplateInput) {
    const validated = createTemplateSchema.parse(data)

    return prismadb.$transaction(async (tx) => {
      if (validated.isDefault) {
        await tx.template.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.template.create({
        data: {
          userId,
          name: validated.name,
          subject: validated.subject,
          body: validated.body,
          isDefault: validated.isDefault ?? false,
        },
      })
    })
  },

  async updateTemplate(userId: string, templateId: string, data: UpdateTemplateInput) {
    const validated = updateTemplateSchema.parse(data)

    const existing = await prismadb.template.findFirst({
      where: { id: templateId, userId },
    })

    if (!existing) {
      throw new Error('Template not found')
    }

    return prismadb.$transaction(async (tx) => {
      if (validated.isDefault) {
        await tx.template.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.template.update({
        where: { id: templateId },
        data: validated,
      })
    })
  },

  async deleteTemplate(userId: string, templateId: string) {
    const existing = await prismadb.template.findFirst({
      where: { id: templateId, userId },
    })

    if (!existing) {
      throw new Error('Template not found')
    }

    return prismadb.template.delete({
      where: { id: templateId },
    })
  },

  renderTemplate(
    template: { subject: string; body: string },
    contact: TemplateContact,
    availability: string
  ): RenderedTemplate {
    const subjectVariants = template.subject.split('|').map((s) => s.trim())
    const selectedSubject =
      subjectVariants[Math.floor(Math.random() * subjectVariants.length)]

    return {
      subject: replacePlaceholders(selectedSubject, contact, availability),
      body: replacePlaceholders(template.body, contact, availability),
    }
  },
}
