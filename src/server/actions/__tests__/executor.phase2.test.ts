import { describe, it, expect, vi } from 'vitest'
import {
  executeAction,
  type ExecutorContext,
  type ActionHandlers,
} from '../executor'
import { AiActionType, AiMode } from '@/lib/types/enums'
import type { AiActionRequest } from '../types'

const baseContext: ExecutorContext = {
  userId: 'u-1',
  currentMode: AiMode.ASSISTANT,
}

describe('Executor Phase 2 - Mode Enforcement & Routing', () => {
  describe('payload validation', () => {
    it('should reject invalid payload', async () => {
      const request: AiActionRequest = {
        type: AiActionType.FIND_CONTACTS,
        payload: { query: '' }, // too short
      }
      const context: ExecutorContext = { ...baseContext, currentMode: AiMode.CONTACT_FINDER }

      const result = await executeAction(request, context)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('confirmation messages', () => {
    it('should include count in APPROVE_STAGED_LIST message', async () => {
      const request: AiActionRequest = {
        type: AiActionType.APPROVE_STAGED_LIST,
        payload: { campaignName: 'My Campaign', keptContactIds: ['a', 'b', 'c'] },
      }
      const context: ExecutorContext = { ...baseContext, currentMode: AiMode.CONTACT_FINDER }

      const result = await executeAction(request, context)

      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toContain('3')
      expect(result.confirmationMessage).toContain('My Campaign')
    })

    it('should include count in SEND_EMAILS message', async () => {
      const request: AiActionRequest = {
        type: AiActionType.SEND_EMAILS,
        payload: { campaignId: 'c-1' },
      }

      const result = await executeAction(request, baseContext)

      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toBeDefined()
    })

    it('should include count in DELETE_CONTACTS message', async () => {
      const request: AiActionRequest = {
        type: AiActionType.DELETE_CONTACTS,
        payload: { contactIds: ['a', 'b'] },
      }

      const result = await executeAction(request, baseContext)

      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toContain('2')
    })

    it('should include count in BULK_UPDATE message', async () => {
      const request: AiActionRequest = {
        type: AiActionType.BULK_UPDATE,
        payload: { contactIds: ['a', 'b', 'c', 'd'], updates: { stage: 'X' } },
      }

      const result = await executeAction(request, baseContext)

      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toContain('4')
    })
  })

  describe('handler routing', () => {
    it('should route to FIND_CONTACTS handler when provided', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true, data: [] })
      const handlers: Partial<ActionHandlers> = {
        [AiActionType.FIND_CONTACTS]: handler,
      }

      const request: AiActionRequest = {
        type: AiActionType.FIND_CONTACTS,
        payload: { query: 'tech founders' },
      }
      const context: ExecutorContext = { ...baseContext, currentMode: AiMode.CONTACT_FINDER }

      const result = await executeAction(request, context, handlers)

      expect(result.success).toBe(true)
      expect(handler).toHaveBeenCalledWith(request, context)
    })

    it('should return not-implemented when no handler exists', async () => {
      const request: AiActionRequest = {
        type: AiActionType.QUERY_CONTACTS,
        payload: { filters: { stage: 'DRAFTED' } },
      }

      const result = await executeAction(request, baseContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not implemented')
    })

    it('should catch handler errors and return failure', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler exploded'))
      const handlers: Partial<ActionHandlers> = {
        [AiActionType.FIND_CONTACTS]: handler,
      }

      const request: AiActionRequest = {
        type: AiActionType.FIND_CONTACTS,
        payload: { query: 'tech founders' },
      }
      const context: ExecutorContext = { ...baseContext, currentMode: AiMode.CONTACT_FINDER }

      const result = await executeAction(request, context, handlers)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Handler exploded')
    })
  })
})
