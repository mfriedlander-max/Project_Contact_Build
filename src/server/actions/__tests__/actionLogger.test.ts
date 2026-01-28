import { describe, it, expect, beforeEach } from 'vitest'
import { createActionLogger } from '../actionLogger'
import { AiActionType } from '@/lib/types/enums'

describe('Action Logger', () => {
  let logger: ReturnType<typeof createActionLogger>

  beforeEach(() => {
    logger = createActionLogger()
  })

  describe('logAction', () => {
    it('should log a successful action', () => {
      logger.logAction({
        actionType: AiActionType.FIND_CONTACTS,
        userId: 'u-1',
        success: true,
      })

      const recent = logger.getRecentActions('u-1', 10)
      expect(recent).toHaveLength(1)
      expect(recent[0].actionType).toBe(AiActionType.FIND_CONTACTS)
      expect(recent[0].success).toBe(true)
      expect(recent[0].timestamp).toBeInstanceOf(Date)
    })

    it('should log a failed action with error', () => {
      logger.logAction({
        actionType: AiActionType.SEND_EMAILS,
        userId: 'u-1',
        success: false,
        error: 'Rate limit exceeded',
      })

      const recent = logger.getRecentActions('u-1', 10)
      expect(recent).toHaveLength(1)
      expect(recent[0].success).toBe(false)
      expect(recent[0].error).toBe('Rate limit exceeded')
    })

    it('should store timestamp automatically', () => {
      const before = new Date()
      logger.logAction({
        actionType: AiActionType.QUERY_CONTACTS,
        userId: 'u-1',
        success: true,
      })
      const after = new Date()

      const recent = logger.getRecentActions('u-1', 10)
      expect(recent[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(recent[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('getRecentActions', () => {
    it('should return only actions for specified user', () => {
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.QUERY_CONTACTS, userId: 'u-2', success: true })
      logger.logAction({ actionType: AiActionType.MOVE_STAGE, userId: 'u-1', success: true })

      const recent = logger.getRecentActions('u-1', 10)
      expect(recent).toHaveLength(2)
      expect(recent.every((a) => a.userId === 'u-1')).toBe(true)
    })

    it('should respect limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: true })
      }

      const recent = logger.getRecentActions('u-1', 3)
      expect(recent).toHaveLength(3)
    })

    it('should return most recent actions first', () => {
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.QUERY_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.MOVE_STAGE, userId: 'u-1', success: true })

      const recent = logger.getRecentActions('u-1', 10)
      expect(recent[0].actionType).toBe(AiActionType.MOVE_STAGE)
      expect(recent[2].actionType).toBe(AiActionType.FIND_CONTACTS)
    })

    it('should return empty array for unknown user', () => {
      const recent = logger.getRecentActions('unknown', 10)
      expect(recent).toEqual([])
    })
  })

  describe('getActionStats', () => {
    it('should return counts by action type', () => {
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.QUERY_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: false })

      const stats = logger.getActionStats('u-1')

      expect(stats.totalActions).toBe(4)
      expect(stats.byType[AiActionType.FIND_CONTACTS]).toBe(3)
      expect(stats.byType[AiActionType.QUERY_CONTACTS]).toBe(1)
    })

    it('should calculate success rate', () => {
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: false })
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: false })

      const stats = logger.getActionStats('u-1')

      expect(stats.successRate).toBe(0.5)
    })

    it('should return zero stats for unknown user', () => {
      const stats = logger.getActionStats('unknown')

      expect(stats.totalActions).toBe(0)
      expect(stats.successRate).toBe(0)
      expect(stats.byType).toEqual({})
    })

    it('should only count actions for specified user', () => {
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-1', success: true })
      logger.logAction({ actionType: AiActionType.FIND_CONTACTS, userId: 'u-2', success: true })

      const stats = logger.getActionStats('u-1')
      expect(stats.totalActions).toBe(1)
    })
  })
})
