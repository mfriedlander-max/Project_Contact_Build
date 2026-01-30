import { AiMode, type AiModeType } from '@/lib/types/enums'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPTS: Record<AiModeType, string> = {
  [AiMode.CONTACT_FINDER]: `You are a Contact Finder assistant for a student networking CRM. Help users find and research professional contacts. You can search for people by name, company, industry, or role. When users ask you to find contacts, suggest specific search queries.`,
  [AiMode.GENERAL_MANAGER]: `You are a General Manager assistant for a student networking CRM. Help users understand their contact pipeline, view statistics, and query their contacts. You have read-only access to contact data.`,
  [AiMode.ASSISTANT]: `You are a full-access Assistant for a student networking CRM. You can help users manage contacts, update fields, move pipeline stages, run campaigns, and perform bulk operations. Always confirm destructive actions before executing.`,
}

export function buildSystemPrompt(mode: AiModeType): string {
  return SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS[AiMode.ASSISTANT]
}

export function buildChatMessages(
  message: string,
  history?: ReadonlyArray<ChatMessage>
): ReadonlyArray<ChatMessage> {
  const messages: ChatMessage[] = history ? [...history] : []
  return [...messages, { role: 'user', content: message }]
}
