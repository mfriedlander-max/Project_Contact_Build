/**
 * Claude Tool Schema Generator
 * Maps AI action types to Claude-compatible tool definitions
 */

import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js'
import {
  AiActionType,
  type AiModeType,
  type AiActionTypeValue,
} from '@/lib/types/enums'
import {
  ACTION_MODE_REQUIREMENTS,
  ACTION_PAYLOAD_SCHEMAS,
} from '@/src/server/actions/types'

/**
 * Tool metadata (name and description) for each action type
 * Names use snake_case to match Claude's tool calling convention
 */
const TOOL_METADATA: Record<
  AiActionTypeValue,
  { name: string; description: string }
> = {
  [AiActionType.FIND_CONTACTS]: {
    name: 'find_contacts',
    description:
      'Search for new professional contacts matching specific criteria. Results are staged for review before being added to the CRM. Use this when the user asks to find, search for, or discover new contacts.',
  },
  [AiActionType.SHOW_STAGED_RESULTS]: {
    name: 'show_staged_results',
    description:
      'View currently staged contacts that are awaiting approval. Use this when the user asks to see what contacts are staged or wants to review staged results.',
  },
  [AiActionType.DELETE_STAGED_ROW]: {
    name: 'delete_staged_row',
    description:
      'Remove a specific contact from the staging area. Use this when the user wants to remove or discard a staged contact.',
  },
  [AiActionType.APPROVE_STAGED_LIST]: {
    name: 'approve_staged_list',
    description:
      'Create a campaign from staged contacts. This action requires user confirmation. Use this when the user is ready to approve staged contacts and create a campaign.',
  },
  [AiActionType.RUN_EMAIL_FINDING]: {
    name: 'run_email_finding',
    description:
      'Execute the email finding stage for a campaign. This searches for email addresses for contacts in the campaign.',
  },
  [AiActionType.RUN_INSERTS]: {
    name: 'run_inserts',
    description:
      'Execute the insert generation stage for a campaign. This generates personalized message inserts for each contact.',
  },
  [AiActionType.RUN_DRAFTS]: {
    name: 'run_drafts',
    description:
      'Generate email drafts for a campaign using a template. This creates personalized email drafts by combining the template with contact-specific inserts.',
  },
  [AiActionType.SEND_EMAILS]: {
    name: 'send_emails',
    description:
      'Send campaign emails. This action requires user confirmation. Use this when the user is ready to send emails for a campaign.',
  },
  [AiActionType.QUERY_CONTACTS]: {
    name: 'query_contacts',
    description:
      'Search existing contacts in the CRM with filters. Use this when the user wants to find contacts already in their CRM, filter by stage, campaign, industry, or search by name/company.',
  },
  [AiActionType.MOVE_STAGE]: {
    name: 'move_stage',
    description:
      "Update a contact's pipeline stage. Use this when the user wants to move a contact to a different stage in the relationship pipeline (e.g., from DRAFTED to MESSAGE_SENT).",
  },
  [AiActionType.UPDATE_FIELD]: {
    name: 'update_field',
    description:
      'Update a single field on a contact record. Use this when the user wants to modify a specific field like name, company, title, or custom field.',
  },
  [AiActionType.BULK_UPDATE]: {
    name: 'bulk_update',
    description:
      'Update multiple contacts at once. This action requires user confirmation. Use this when the user wants to make the same change to multiple contacts simultaneously.',
  },
  [AiActionType.DELETE_CONTACTS]: {
    name: 'delete_contacts',
    description:
      'Delete contacts from the CRM. This action requires user confirmation. Use this when the user wants to permanently remove contacts.',
  },
  [AiActionType.CREATE_SAVED_VIEW]: {
    name: 'create_saved_view',
    description:
      'Save current filter configuration as a reusable view. Use this when the user wants to save a specific set of filters for later use.',
  },
}

/**
 * Get Claude-compatible tool definitions for the specified AI mode
 *
 * @param mode - The AI mode (CONTACT_FINDER, GENERAL_MANAGER, or ASSISTANT)
 * @returns Array of tool definitions that can be used with Claude Messages API
 *
 * @example
 * ```typescript
 * const tools = getToolsForMode(AiMode.CONTACT_FINDER)
 * const response = await client.messages.create({
 *   model: 'claude-sonnet-4-5-20250929',
 *   messages: [{ role: 'user', content: 'Find engineers in NYC' }],
 *   tools,
 * })
 * ```
 */
export function getToolsForMode(mode: AiModeType): Tool[] {
  const tools: Tool[] = []

  // Iterate through all action types
  for (const actionType of Object.values(AiActionType)) {
    // Check if this action is allowed in the current mode
    const allowedModes = ACTION_MODE_REQUIREMENTS[actionType]
    if (!allowedModes.includes(mode)) {
      continue
    }

    // Get the Zod schema for this action's payload
    const zodSchema = ACTION_PAYLOAD_SCHEMAS[actionType]

    // Convert Zod schema to JSON Schema (OpenAPI 3.0 format)
    const jsonSchema = zodToJsonSchema(zodSchema, {
      target: 'openApi3',
      $refStrategy: 'none',
    })

    // Get tool metadata
    const { name, description } = TOOL_METADATA[actionType]

    // Create tool definition
    tools.push({
      name,
      description,
      input_schema: jsonSchema as Tool.InputSchema,
    })
  }

  return tools
}
