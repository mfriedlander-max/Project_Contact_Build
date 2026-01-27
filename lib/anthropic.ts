import Anthropic from '@anthropic-ai/sdk'
import { prismadb } from './prisma'

/**
 * Get Anthropic client with API key from database or environment
 */
export async function anthropicHelper(userId: string): Promise<Anthropic | null> {
  // Check if the App instance has an Anthropic key stored
  const anthropicKey = await prismadb.systemServices.findFirst({
    where: {
      name: 'anthropicKey',
    },
  })

  // Check if the user has a private Anthropic key
  // Note: This uses the existing openAi_keys table for compatibility
  // In future, consider creating an anthropic_keys table
  const userAnthropicKey = await prismadb.openAi_keys.findFirst({
    where: {
      user: userId,
    },
  })

  let apiKey = anthropicKey?.serviceKey || userAnthropicKey?.api_key

  if (!apiKey) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('No Anthropic API key found in the environment')
      return null
    }
    apiKey = process.env.ANTHROPIC_API_KEY
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  })

  return anthropic
}
