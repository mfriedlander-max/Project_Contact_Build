import { describe, it, expect } from 'vitest'
import {
  EmailConfidence,
  InsertConfidence,
  EmailStatus,
  ConnectionLevel,
  type Contact,
  type ContactCustomFields,
  isValidEmailConfidence,
  isValidInsertConfidence,
  isValidEmailStatus,
  isValidConnectionLevel,
} from '../contact'

describe('Contact Types', () => {
  describe('EmailConfidence enum', () => {
    it('should have HIGH, MEDIUM, LOW values', () => {
      expect(EmailConfidence.HIGH).toBe('HIGH')
      expect(EmailConfidence.MEDIUM).toBe('MEDIUM')
      expect(EmailConfidence.LOW).toBe('LOW')
    })
  })

  describe('InsertConfidence enum', () => {
    it('should have HIGH, MEDIUM, LOW values', () => {
      expect(InsertConfidence.HIGH).toBe('HIGH')
      expect(InsertConfidence.MEDIUM).toBe('MEDIUM')
      expect(InsertConfidence.LOW).toBe('LOW')
    })
  })

  describe('EmailStatus enum', () => {
    it('should have BLANK, DRAFTED, SENT values', () => {
      expect(EmailStatus.BLANK).toBe('BLANK')
      expect(EmailStatus.DRAFTED).toBe('DRAFTED')
      expect(EmailStatus.SENT).toBe('SENT')
    })
  })

  describe('ConnectionLevel enum', () => {
    it('should have progression values', () => {
      expect(ConnectionLevel.NONE).toBe('NONE')
      expect(ConnectionLevel.MESSAGE_SENT).toBe('MESSAGE_SENT')
      expect(ConnectionLevel.CONNECTED).toBe('CONNECTED')
      expect(ConnectionLevel.IN_TOUCH).toBe('IN_TOUCH')
      expect(ConnectionLevel.FRIENDS).toBe('FRIENDS')
    })
  })

  describe('isValidEmailConfidence', () => {
    it('should return true for valid values', () => {
      expect(isValidEmailConfidence('HIGH')).toBe(true)
      expect(isValidEmailConfidence('MEDIUM')).toBe(true)
      expect(isValidEmailConfidence('LOW')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidEmailConfidence('INVALID')).toBe(false)
      expect(isValidEmailConfidence('')).toBe(false)
      expect(isValidEmailConfidence(null)).toBe(false)
    })
  })

  describe('isValidInsertConfidence', () => {
    it('should return true for valid values', () => {
      expect(isValidInsertConfidence('HIGH')).toBe(true)
      expect(isValidInsertConfidence('MEDIUM')).toBe(true)
      expect(isValidInsertConfidence('LOW')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidInsertConfidence('INVALID')).toBe(false)
    })
  })

  describe('isValidEmailStatus', () => {
    it('should return true for valid values', () => {
      expect(isValidEmailStatus('BLANK')).toBe(true)
      expect(isValidEmailStatus('DRAFTED')).toBe(true)
      expect(isValidEmailStatus('SENT')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidEmailStatus('PENDING')).toBe(false)
    })
  })

  describe('isValidConnectionLevel', () => {
    it('should return true for valid values', () => {
      expect(isValidConnectionLevel('NONE')).toBe(true)
      expect(isValidConnectionLevel('MESSAGE_SENT')).toBe(true)
      expect(isValidConnectionLevel('CONNECTED')).toBe(true)
      expect(isValidConnectionLevel('IN_TOUCH')).toBe(true)
      expect(isValidConnectionLevel('FRIENDS')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidConnectionLevel('BEST_FRIENDS')).toBe(false)
    })
  })

  describe('Contact type', () => {
    it('should allow valid contact with workflow fields', () => {
      const contact: Contact = {
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        company: 'Acme Inc',
        position: 'Software Engineer',
        email_confidence: EmailConfidence.HIGH,
        personalized_insert: 'I noticed you worked on the React migration...',
        insert_confidence: InsertConfidence.MEDIUM,
        email_status: EmailStatus.DRAFTED,
        draft_created_at: new Date(),
        connection_level: ConnectionLevel.MESSAGE_SENT,
        campaign: 'Tech Outreach Q1',
        custom_fields: {
          industry: 'Technology',
          linkedin_url: 'https://linkedin.com/in/johndoe',
        },
      }

      expect(contact.first_name).toBe('John')
      expect(contact.email_confidence).toBe(EmailConfidence.HIGH)
      expect(contact.connection_level).toBe(ConnectionLevel.MESSAGE_SENT)
    })

    it('should allow optional fields to be undefined', () => {
      const minimalContact: Contact = {
        id: '123',
        last_name: 'Doe',
      }

      expect(minimalContact.email).toBeUndefined()
      expect(minimalContact.email_confidence).toBeUndefined()
      expect(minimalContact.custom_fields).toBeUndefined()
    })
  })

  describe('ContactCustomFields type', () => {
    it('should allow arbitrary string key-value pairs', () => {
      const customFields: ContactCustomFields = {
        industry: 'Finance',
        notes: 'Met at conference',
        linkedin_url: 'https://linkedin.com/in/someone',
        referral_source: 'Alumni network',
      }

      expect(customFields.industry).toBe('Finance')
      expect(customFields.notes).toBe('Met at conference')
    })
  })
})
