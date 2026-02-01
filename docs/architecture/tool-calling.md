# Claude Tool Calling Architecture

**Last Updated:** 2026-02-01
**Status:** ✅ Working end-to-end with SerpAPI integration

## Overview

This system enables Claude to execute actions in the CRM by calling tools during chat conversations. When a user asks "Find 5 CTOs in San Francisco", Claude uses the `find_contacts` tool to search SerpAPI, stage results in the database, and return them to the UI.

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (User UI)  │
└──────┬──────┘
       │ POST /api/ai/chat
       ↓
┌──────────────────────────────────────────────────────┐
│  app/api/ai/chat/route.ts                            │
│  - Receives user message                             │
│  - Calls Claude Messages API with tools              │
│  - Streams SSE events back to browser                │
└──────┬───────────────────────────────────────────────┘
       │ stream events
       ↓
┌──────────────────────────────────────────────────────┐
│  Claude Messages API                                 │
│  - Decides to use find_contacts tool                 │
│  - Returns tool_use block with input                 │
└──────┬───────────────────────────────────────────────┘
       │ tool_use event
       ↓
┌──────────────────────────────────────────────────────┐
│  Executor (src/server/actions/executor.ts)           │
│  - Validates mode & payload                          │
│  - Routes to handler                                 │
│  - Returns result                                    │
└──────┬───────────────────────────────────────────────┘
       │ execute FIND_CONTACTS
       ↓
┌──────────────────────────────────────────────────────┐
│  findContacts Handler                                │
│  (src/server/actions/handlers/findContacts.ts)       │
│  - Calls searchProvider.search()                     │
│  - Filters duplicates                                │
│  - Calls stagingService.stageContacts()              │
│  - Returns staged contacts                           │
└──────┬──────────────────┬────────────────────────────┘
       │                  │
       ↓                  ↓
┌──────────────┐   ┌─────────────────────────────────┐
│ Search       │   │ stagingService                  │
│ Provider     │   │ (src/server/services/...)       │
│ Adapter      │   │ - Saves to database             │
│              │   │ - Returns with IDs              │
└──────────────┘   └─────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│  SerpAPI Integration                                 │
│  (src/server/integrations/searchProvider.ts)         │
│  - Fetches from SerpAPI                              │
│  - Returns raw results (title, snippet, url)         │
└──────────────────────────────────────────────────────┘
```

## Key Components

### 1. Chat API Route (`app/api/ai/chat/route.ts`)

**Purpose:** Bridge between UI and executor system

**Flow:**
1. Receives user message + mode (CONTACT_FINDER, GENERAL_MANAGER, ASSISTANT)
2. Calls Claude Messages API with mode-specific tools
3. Streams events via Server-Sent Events (SSE):
   - `text` - Claude's text response
   - `tool_result` - Successful tool execution
   - `tool_error` - Failed tool execution
   - `confirmation_required` - Needs user approval

**Critical Code:**
```typescript
// Initialize executor once at module level
const executor = createExecutor({
  searchProvider: searchProviderAdapter,  // ← Uses adapter!
  stagingService,
  approveService,
  campaignRunner,
  stageExecutors,
  contactService,
  savedViewService,
  logger,
})

// Accumulate tool input across delta events
if (event.type === 'content_block_delta' &&
    event.delta.type === 'input_json_delta') {
  currentToolUse.inputJson += event.delta.partial_json
}

// Execute when complete
if (event.type === 'content_block_stop' && currentToolUse) {
  const toolInput = JSON.parse(currentToolUse.inputJson)
  const result = await executor.execute(actionRequest, context)
}
```

### 2. The Adapter Pattern ⭐ **CRITICAL**

**Problem:** searchProvider returns SerpAPI format, but handlers expect domain format

**SerpAPI Format:**
```typescript
{ title: string, snippet: string, url: string, position: number }
```

**Domain Format:**
```typescript
{ name: string, company: string, url: string, snippet: string }
```

**Solution:** `searchProviderAdapter.ts`

Located: `src/server/integrations/searchProviderAdapter.ts`

```typescript
export const searchProviderAdapter: SearchProvider = {
  search: async (query: string, maxResults: number) => {
    const rawResults = await rawSearchProvider.search({ query, numResults: maxResults })

    return rawResults.map((result) => ({
      name: result.title || 'Unknown',
      company: extractCompanyFromSnippet(result.snippet) || 'Unknown Company',
      url: result.url,
      snippet: result.snippet || '',
    }))
  },
}
```

**Why this matters:** Components built at different times with different interfaces can integrate cleanly without modifying either side.

### 3. Executor (`src/server/actions/executor.ts`)

**Purpose:** Central orchestrator for all AI actions

**Responsibilities:**
- Validates mode permissions (CONTACT_FINDER can't delete contacts)
- Validates payloads against schemas
- Checks confirmation requirements (delete, send emails)
- Routes to appropriate handler
- Logs all actions

**Factory Pattern:**
```typescript
export function createExecutor(deps: ExecutorDeps) {
  const handlers = buildHandlers(deps)
  return {
    execute: (request, context) => executeAction(request, context, handlers)
  }
}
```

### 4. Handlers (`src/server/actions/handlers/`)

Each action type has a handler:

| Handler | File | Purpose |
|---------|------|---------|
| `handleFindContacts` | `findContacts.ts` | Search & stage contacts |
| `handleShowStagedResults` | `showStagedResults.ts` | Retrieve staged list |
| `handleApproveStagedList` | `approveStagedList.ts` | Create campaign |
| `handleRunCampaignStage` | `runCampaignStage.ts` | Execute pipeline stage |
| `handleQueryContacts` | `queryContacts.ts` | Query CRM contacts |
| `handleMoveStage` | `mutationHandlers.ts` | Move pipeline stage |
| `handleUpdateField` | `mutationHandlers.ts` | Update contact field |
| `handleBulkUpdate` | `mutationHandlers.ts` | Bulk update contacts |
| `handleDeleteContacts` | `mutationHandlers.ts` | Delete contacts |
| `handleCreateSavedView` | `createSavedView.ts` | Save filter view |

### 5. Services Layer

**Dependency Injection Pattern:** Handlers depend on service interfaces, not implementations

| Service | Interface | Implementation | Purpose |
|---------|-----------|----------------|---------|
| `stagingService` | `StagingService` | Prisma-backed | Stage search results |
| `approveService` | `ApproveServiceDeps` | Prisma-backed | Create campaigns |
| `contactService` | `ContactServiceDeps` | Stub | Query/mutate contacts |
| `savedViewService` | `SavedViewServiceDeps` | Stub | Save views |
| `campaignRunner` | `CampaignRunnerDeps` | Prisma-backed | Run pipeline stages |

**Critical Interface Contracts:**

```typescript
// stagingService MUST implement
interface StagingService {
  stageContacts(userId: string, contacts: SearchResult[]): Promise<StagedContact[]>
  findExistingContacts(userId: string, candidates: StagedContactInput[]): Promise<Set<number>>
}

// approveService MUST implement
interface ApproveServiceDeps {
  approve(input: { userId: string, campaignName: string, keptContactIds: string[] }): Promise<Campaign>
}
```

### 6. Tool Schemas (`lib/ai/tool-schemas.ts`)

Maps AI action types to Claude tool definitions:

```typescript
const TOOL_SCHEMAS: Record<AiActionTypeValue, ToolSchema> = {
  FIND_CONTACTS: {
    name: 'find_contacts',
    description: 'Search for contacts and stage results',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g., "CTO San Francisco")' },
        maxResults: { type: 'number', description: 'Maximum results (1-30)', default: 10 }
      },
      required: ['query']
    }
  }
}
```

**Mode-based Filtering:**

| Mode | Tools Available | Count |
|------|----------------|-------|
| CONTACT_FINDER | find_contacts, show_staged_results, delete_staged_row, approve_staged_list | 4 |
| GENERAL_MANAGER | show_staged_results, query_contacts, create_saved_view | 3 |
| ASSISTANT | All tools | 14 |

## Data Flow: Find Contacts Example

**User:** "Find 5 CTOs in San Francisco"

**Step-by-step:**

1. **UI → Chat API**
   - POST `/api/ai/chat` with message + mode=CONTACT_FINDER

2. **Chat API → Claude**
   - Calls `client.messages.stream()` with 4 tools
   - System prompt: "ALWAYS use find_contacts when users ask to find contacts"

3. **Claude → Tool Use**
   - Returns `tool_use` block: `{ name: 'find_contacts', input: { query: 'CTO San Francisco', maxResults: 5 } }`

4. **Chat API → Executor**
   - Accumulates input JSON across `input_json_delta` events
   - Parses complete JSON
   - Calls `executor.execute({ type: 'FIND_CONTACTS', payload: {...} })`

5. **Executor → Handler**
   - Validates mode (✓ CONTACT_FINDER allows FIND_CONTACTS)
   - Validates payload (✓ query is string, maxResults is number)
   - Calls `handleFindContacts(payload, context, deps)`

6. **Handler → Search Provider Adapter**
   - Calls `searchProviderAdapter.search('CTO San Francisco', 5)`
   - Adapter calls raw searchProvider
   - Adapter transforms results to domain format

7. **Handler → Duplicate Detection**
   - Calls `stagingService.findExistingContacts(candidates)`
   - Filters out duplicates by email, LinkedIn, or name+company

8. **Handler → Smart Backfill**
   - If < 5 unique results, searches again (max 3 iterations)
   - Accumulates unique contacts

9. **Handler → Stage Contacts**
   - Calls `stagingService.stageContacts(userId, uniqueContacts)`
   - Saves to Prisma database
   - Returns contacts with IDs

10. **Executor → Chat API**
    - Returns `{ success: true, data: stagedContacts }`

11. **Chat API → UI**
    - Streams `tool_result` event with staged contacts
    - UI displays in StagingPanel below chat

## Interface Contracts

### SearchProvider Interface

**Defined by:** `findContacts.ts` (consumer)
**Implemented by:** `searchProviderAdapter.ts`

```typescript
export interface SearchProvider {
  search(query: string, maxResults: number): Promise<ReadonlyArray<SearchResult>>
}

export interface SearchResult {
  name: string      // Person's name
  company: string   // Company name
  url: string       // Source URL
  snippet: string   // Preview text
}
```

### StagingService Interface

**Defined by:** `findContacts.ts` (consumer)
**Implemented by:** `stagingService.ts`

```typescript
export interface StagingService {
  stageContacts(
    userId: string,
    contacts: ReadonlyArray<SearchResult>
  ): Promise<ReadonlyArray<StagedContact>>

  findExistingContacts?(
    userId: string,
    candidates: ReadonlyArray<StagedContactInput>
  ): Promise<Set<number>>  // Indices of duplicates
}
```

### ExecutorDeps Interface

**Defined by:** `executor.ts`
**Required for initialization:**

```typescript
export interface ExecutorDeps {
  searchProvider: SearchProvider           // ← searchProviderAdapter
  stagingService: StagingService & StagingServiceDeps
  approveService: ApproveServiceDeps
  campaignRunner: ReturnType<typeof createCampaignRunner>
  stageExecutors: StageExecutors
  contactService: ContactServiceDeps
  savedViewService: SavedViewServiceDeps
  logger: ReturnType<typeof createActionLogger>
}
```

## Common Issues & Solutions

### Issue 1: "stageContacts is not a function"

**Cause:** stagingService doesn't implement the required interface

**Solution:** Add the method:
```typescript
async stageContacts(userId: string, contacts: SearchResult[]) {
  // Convert SearchResult to StagedContactInput
  // Save to database
  // Return with IDs
}
```

### Issue 2: "Cannot read properties of undefined (reading 'trim')"

**Cause:** searchProvider returns `title` but handler expects `name`

**Solution:** Use the adapter pattern (already implemented)

### Issue 3: Interface signature mismatch

**Cause:** Service method signature doesn't match interface

**Example:**
```typescript
// ❌ Wrong
create: async (name: string, filters: unknown) => {...}

// ✅ Correct (matches SavedViewServiceDeps)
create: async (userId: string, input: { name: string, filters: Record<string, unknown> }) => {...}
```

**Solution:** Always check the interface definition in `handlers/interfaces.ts`

## Environment Variables

Required in `.env.local`:

```bash
SERPAPI_API_KEY="your-real-serpapi-key-here"
```

Get a key from: https://serpapi.com

## Testing

**Manual Testing:**
1. Start dev server: `npm run dev`
2. Navigate to `/home`
3. Send: "Find 5 CTOs in San Francisco"
4. Check terminal for logs: `🎯 Tool started`, `✅ Action result: success`
5. Verify contacts appear in staging panel below chat

**Unit Tests:**
- Tool schemas: `lib/ai/__tests__/tool-schemas.test.ts` (18 tests)
- Chat API: `app/api/ai/chat/__tests__/route.test.ts` (9 tests)
- Frontend hook: `src/ui/hooks/__tests__/useChatApi.test.ts` (25 tests)
- Staging service: `src/server/services/__tests__/stagingService.test.ts` (18 tests)
- Handlers: `src/server/actions/handlers/__tests__/` (6 tests)

**Total:** 149 tests

## Related Documentation

- [Integration Fixes (2026-02-01)](../changes/2026-02-01-integration-fixes.md) - Issues discovered and fixed
- [Original Plan](../plans/2026-01-31-claude-tool-calling.md) - Initial sprint plan
- [Orchestration](../../status/ORCHESTRATION.md) - Sprint tracking
- [Phase 3 Integration](../../status/phase-3-integration.md) - Integration test results

## Future Improvements

1. **Real ContactService** - Replace stub with Prisma implementation
2. **Real SavedViewService** - Persist saved views to database
3. **Enhanced Company Extraction** - Better heuristics in adapter
4. **Streaming Progress** - Show search progress in real-time
5. **Tool Result Caching** - Cache search results for same queries
6. **Error Recovery** - Retry failed SerpAPI requests

## Key Learnings

1. **Always use adapters** when integrating components built at different times
2. **Map all interfaces upfront** before wiring dependencies
3. **Dependency injection** makes testing and swapping implementations easy
4. **Stream accumulation** is critical for Claude tool calling (input arrives incrementally)
5. **Mode-based tool filtering** provides safety (CONTACT_FINDER can't delete contacts)
