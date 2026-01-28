/**
 * Insert Generator
 * Generates personalized email inserts using Anthropic Claude
 *
 * Implementation for Phase 2 (Task 23)
 */

import Anthropic from '@anthropic-ai/sdk'

export interface ContactInfo {
  firstName: string
  lastName: string
  company: string
}

export interface InsertResult {
  insert: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

function determineConfidence(contentLength: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (contentLength > 500) return 'HIGH'
  if (contentLength > 100) return 'MEDIUM'
  return 'LOW'
}

/**
 * Generate a personalized insert for an outreach email.
 * Uses Anthropic Claude to create a 1-2 sentence reference
 * to something specific about the contact.
 */
export async function generateInsert(
  contactInfo: ContactInfo,
  pageContent: string
): Promise<InsertResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const client = new Anthropic({ apiKey })

  const prompt = `Given this person's page content, write a 1-2 sentence personalized insert that references something specific about them.

Person: ${contactInfo.firstName} ${contactInfo.lastName} at ${contactInfo.company}

Page content:
${pageContent}

Write ONLY the insert text, no quotes or explanation.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const insert = textBlock && 'text' in textBlock ? textBlock.text.trim() : ''

    return {
      insert,
      confidence: determineConfidence(pageContent.length),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Insert generation failed: ${message}`)
  }
}
