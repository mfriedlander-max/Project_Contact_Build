import { describe, it, expect, vi } from 'vitest'
import {
  handleFindContacts,
  type SearchProvider,
  type StagingService,
  type FindContactsContext,
} from '../handlers/findContacts'
import { AiMode } from '@/lib/types/enums'

function createMockSearchProvider(overrides: Partial<SearchProvider> = {}): SearchProvider {
  return {
    search: vi.fn().mockResolvedValue([
      { name: 'Alice', company: 'Acme', url: 'https://acme.com', snippet: 'CEO of Acme' },
      { name: 'Bob', company: 'Beta', url: 'https://beta.com', snippet: 'CTO of Beta' },
    ]),
    ...overrides,
  }
}

function createMockStagingService(overrides: Partial<StagingService> = {}): StagingService {
  return {
    stageContacts: vi.fn().mockResolvedValue([
      { id: 's-1', name: 'Alice', company: 'Acme', url: 'https://acme.com', snippet: 'CEO of Acme' },
      { id: 's-2', name: 'Bob', company: 'Beta', url: 'https://beta.com', snippet: 'CTO of Beta' },
    ]),
    ...overrides,
  }
}

const baseContext: FindContactsContext = {
  userId: 'u-1',
  currentMode: AiMode.CONTACT_FINDER,
}

describe('handleFindContacts', () => {
  it('should validate payload and reject invalid query', async () => {
    const result = await handleFindContacts(
      { query: 'ab' },
      baseContext,
      { searchProvider: createMockSearchProvider(), stagingService: createMockStagingService() }
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should reject when mode is not CONTACT_FINDER', async () => {
    const result = await handleFindContacts(
      { query: 'tech founders', maxResults: 10 },
      { ...baseContext, currentMode: AiMode.GENERAL_MANAGER },
      { searchProvider: createMockSearchProvider(), stagingService: createMockStagingService() }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('CONTACT_FINDER')
  })

  it('should call search provider with query and maxResults', async () => {
    const searchProvider = createMockSearchProvider()
    const stagingService = createMockStagingService()

    await handleFindContacts(
      { query: 'tech founders', maxResults: 15 },
      baseContext,
      { searchProvider, stagingService }
    )

    expect(searchProvider.search).toHaveBeenCalledWith('tech founders', 15)
  })

  it('should default maxResults to 30', async () => {
    const searchProvider = createMockSearchProvider()
    const stagingService = createMockStagingService()

    await handleFindContacts(
      { query: 'tech founders' },
      baseContext,
      { searchProvider, stagingService }
    )

    expect(searchProvider.search).toHaveBeenCalledWith('tech founders', 30)
  })

  it('should stage search results and return them', async () => {
    const searchProvider = createMockSearchProvider()
    const stagingService = createMockStagingService()

    const result = await handleFindContacts(
      { query: 'tech founders' },
      baseContext,
      { searchProvider, stagingService }
    )

    expect(result.success).toBe(true)
    expect(stagingService.stageContacts).toHaveBeenCalled()
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0]).toHaveProperty('id', 's-1')
  })

  it('should handle search provider errors', async () => {
    const searchProvider = createMockSearchProvider({
      search: vi.fn().mockRejectedValue(new Error('API rate limit')),
    })
    const stagingService = createMockStagingService()

    const result = await handleFindContacts(
      { query: 'tech founders' },
      baseContext,
      { searchProvider, stagingService }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('API rate limit')
  })
})
