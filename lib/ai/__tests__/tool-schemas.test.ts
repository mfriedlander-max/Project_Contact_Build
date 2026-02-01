/**
 * Unit tests for Claude tool schema generator
 */

import { describe, it, expect } from 'vitest'
import { getToolsForMode } from '../tool-schemas'
import { AiMode, AiActionType } from '@/lib/types/enums'
import { ACTION_MODE_REQUIREMENTS } from '@/src/server/actions/types'

describe('getToolsForMode', () => {
  describe('CONTACT_FINDER mode', () => {
    it('should return correct tools for CONTACT_FINDER mode', () => {
      const tools = getToolsForMode(AiMode.CONTACT_FINDER)

      // Expected tools for CONTACT_FINDER mode (from ACTION_MODE_REQUIREMENTS)
      const expectedToolNames = [
        'find_contacts',
        'show_staged_results',
        'delete_staged_row',
        'approve_staged_list',
      ]

      expect(tools).toHaveLength(expectedToolNames.length)

      const toolNames = tools.map((t) => t.name)
      expect(toolNames).toEqual(expect.arrayContaining(expectedToolNames))
    })

    it('should not include GENERAL_MANAGER or ASSISTANT-only tools', () => {
      const tools = getToolsForMode(AiMode.CONTACT_FINDER)
      const toolNames = tools.map((t) => t.name)

      // Should NOT include mutation tools (ASSISTANT only)
      expect(toolNames).not.toContain('move_stage')
      expect(toolNames).not.toContain('update_field')
      expect(toolNames).not.toContain('bulk_update')
      expect(toolNames).not.toContain('delete_contacts')

      // Should NOT include campaign runner tools (ASSISTANT only)
      expect(toolNames).not.toContain('run_email_finding')
      expect(toolNames).not.toContain('run_inserts')
      expect(toolNames).not.toContain('run_drafts')
      expect(toolNames).not.toContain('send_emails')
    })
  })

  describe('GENERAL_MANAGER mode', () => {
    it('should return correct tools for GENERAL_MANAGER mode', () => {
      const tools = getToolsForMode(AiMode.GENERAL_MANAGER)

      // Expected tools for GENERAL_MANAGER mode (read-only)
      const expectedToolNames = [
        'show_staged_results',
        'query_contacts',
        'create_saved_view',
      ]

      expect(tools).toHaveLength(expectedToolNames.length)

      const toolNames = tools.map((t) => t.name)
      expect(toolNames).toEqual(expect.arrayContaining(expectedToolNames))
    })

    it('should not include mutation tools', () => {
      const tools = getToolsForMode(AiMode.GENERAL_MANAGER)
      const toolNames = tools.map((t) => t.name)

      // Should NOT include CONTACT_FINDER-only tools
      expect(toolNames).not.toContain('find_contacts')
      expect(toolNames).not.toContain('delete_staged_row')
      expect(toolNames).not.toContain('approve_staged_list')

      // Should NOT include mutation tools
      expect(toolNames).not.toContain('move_stage')
      expect(toolNames).not.toContain('update_field')
      expect(toolNames).not.toContain('bulk_update')
      expect(toolNames).not.toContain('delete_contacts')
    })
  })

  describe('ASSISTANT mode', () => {
    it('should return 14 tools for ASSISTANT mode', () => {
      const tools = getToolsForMode(AiMode.ASSISTANT)

      // ASSISTANT mode has all 14 tools
      expect(tools.length).toBe(14)

      const toolNames = tools.map((t) => t.name)

      // Should include all 14 tools
      const allExpectedTools = [
        'find_contacts',
        'show_staged_results',
        'delete_staged_row',
        'approve_staged_list',
        'run_email_finding',
        'run_inserts',
        'run_drafts',
        'send_emails',
        'query_contacts',
        'move_stage',
        'update_field',
        'bulk_update',
        'delete_contacts',
        'create_saved_view',
      ]

      expect(toolNames).toEqual(expect.arrayContaining(allExpectedTools))
      expect(toolNames.length).toBe(14)
    })

    it('should include all mutation tools', () => {
      const tools = getToolsForMode(AiMode.ASSISTANT)
      const toolNames = tools.map((t) => t.name)

      expect(toolNames).toContain('move_stage')
      expect(toolNames).toContain('update_field')
      expect(toolNames).toContain('bulk_update')
      expect(toolNames).toContain('delete_contacts')
    })

    it('should include all campaign runner tools', () => {
      const tools = getToolsForMode(AiMode.ASSISTANT)
      const toolNames = tools.map((t) => t.name)

      expect(toolNames).toContain('run_email_finding')
      expect(toolNames).toContain('run_inserts')
      expect(toolNames).toContain('run_drafts')
      expect(toolNames).toContain('send_emails')
    })
  })

  describe('Tool schema structure', () => {
    it('should have required fields for each tool', () => {
      const tools = getToolsForMode(AiMode.ASSISTANT)

      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('input_schema')

        expect(typeof tool.name).toBe('string')
        expect(tool.name.length).toBeGreaterThan(0)

        expect(typeof tool.description).toBe('string')
        expect(tool.description.length).toBeGreaterThan(0)

        expect(tool.input_schema).toHaveProperty('type')
        expect(tool.input_schema.type).toBe('object')
      })
    })

    it('should use snake_case for tool names', () => {
      const tools = getToolsForMode(AiMode.ASSISTANT)

      tools.forEach((tool) => {
        // Tool names should be snake_case (lowercase with underscores)
        expect(tool.name).toMatch(/^[a-z_]+$/)
      })
    })

    it('should have descriptive descriptions', () => {
      const tools = getToolsForMode(AiMode.ASSISTANT)

      tools.forEach((tool) => {
        // Descriptions should be meaningful (at least 20 characters)
        expect(tool.description.length).toBeGreaterThanOrEqual(20)
      })
    })
  })

  describe('Input schema validation', () => {
    it('should have valid JSON Schema for find_contacts', () => {
      const tools = getToolsForMode(AiMode.CONTACT_FINDER)
      const findContactsTool = tools.find((t) => t.name === 'find_contacts')

      expect(findContactsTool).toBeDefined()
      expect(findContactsTool!.input_schema).toHaveProperty('properties')
      expect(findContactsTool!.input_schema.properties).toHaveProperty('query')
      expect(findContactsTool!.input_schema.properties).toHaveProperty('maxResults')
      expect(findContactsTool!.input_schema.required).toContain('query')
    })

    it('should have valid JSON Schema for approve_staged_list', () => {
      const tools = getToolsForMode(AiMode.CONTACT_FINDER)
      const approveTool = tools.find((t) => t.name === 'approve_staged_list')

      expect(approveTool).toBeDefined()
      expect(approveTool!.input_schema).toHaveProperty('properties')
      expect(approveTool!.input_schema.properties).toHaveProperty('campaignName')
      expect(approveTool!.input_schema.properties).toHaveProperty('keptContactIds')
      expect(approveTool!.input_schema.required).toContain('campaignName')
      expect(approveTool!.input_schema.required).toContain('keptContactIds')
    })

    it('should have valid JSON Schema for query_contacts', () => {
      const tools = getToolsForMode(AiMode.GENERAL_MANAGER)
      const queryTool = tools.find((t) => t.name === 'query_contacts')

      expect(queryTool).toBeDefined()
      expect(queryTool!.input_schema).toHaveProperty('properties')
      expect(queryTool!.input_schema.properties).toHaveProperty('filters')
      expect(queryTool!.input_schema.required).toContain('filters')
    })

    it('should have valid JSON Schema for move_stage', () => {
      const tools = getToolsForMode(AiMode.ASSISTANT)
      const moveTool = tools.find((t) => t.name === 'move_stage')

      expect(moveTool).toBeDefined()
      expect(moveTool!.input_schema).toHaveProperty('properties')
      expect(moveTool!.input_schema.properties).toHaveProperty('contactId')
      expect(moveTool!.input_schema.properties).toHaveProperty('newStage')
      expect(moveTool!.input_schema.required).toContain('contactId')
      expect(moveTool!.input_schema.required).toContain('newStage')
    })

    it('should handle empty payload schemas (show_staged_results)', () => {
      const tools = getToolsForMode(AiMode.CONTACT_FINDER)
      const showTool = tools.find((t) => t.name === 'show_staged_results')

      expect(showTool).toBeDefined()
      expect(showTool!.input_schema.type).toBe('object')
      // Empty object schema - no required fields
    })
  })

  describe('Mode filtering', () => {
    it('should only return tools allowed for the mode', () => {
      // For each mode, verify that all returned tools are actually allowed
      const modes = [AiMode.CONTACT_FINDER, AiMode.GENERAL_MANAGER, AiMode.ASSISTANT]

      modes.forEach((mode) => {
        const tools = getToolsForMode(mode)

        tools.forEach((tool) => {
          // Find the action type for this tool
          const actionType = Object.values(AiActionType).find((at) => {
            const toolName = tool.name
            const expectedName = toolName.toUpperCase().replace(/_/g, '_')
            return at === expectedName || at.toLowerCase() === toolName.replace(/_/g, '')
          })

          // If we can identify the action type, verify it's allowed in this mode
          if (actionType) {
            const allowedModes = ACTION_MODE_REQUIREMENTS[actionType]
            expect(allowedModes).toContain(mode)
          }
        })
      })
    })

    it('should return different tool sets for different modes', () => {
      const contactFinderTools = getToolsForMode(AiMode.CONTACT_FINDER)
      const generalManagerTools = getToolsForMode(AiMode.GENERAL_MANAGER)
      const assistantTools = getToolsForMode(AiMode.ASSISTANT)

      // CONTACT_FINDER and GENERAL_MANAGER should have different tools
      expect(contactFinderTools).not.toEqual(generalManagerTools)

      // ASSISTANT should have more tools than CONTACT_FINDER
      expect(assistantTools.length).toBeGreaterThan(contactFinderTools.length)

      // ASSISTANT should have more tools than GENERAL_MANAGER
      expect(assistantTools.length).toBeGreaterThan(generalManagerTools.length)
    })
  })

  describe('Coverage of all action types', () => {
    it('should cover all 14 action types across all modes', () => {
      // Collect tools from all modes
      const contactFinderTools = getToolsForMode(AiMode.CONTACT_FINDER)
      const generalManagerTools = getToolsForMode(AiMode.GENERAL_MANAGER)
      const assistantTools = getToolsForMode(AiMode.ASSISTANT)

      // Combine all tool names
      const allToolNames = new Set([
        ...contactFinderTools.map((t) => t.name),
        ...generalManagerTools.map((t) => t.name),
        ...assistantTools.map((t) => t.name),
      ])

      // We should have exactly 14 unique tools (one per action type) across all modes
      expect(allToolNames.size).toBe(14)
    })
  })
})
