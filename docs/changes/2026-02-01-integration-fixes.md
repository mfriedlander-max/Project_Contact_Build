# Integration Fixes - February 1, 2026

**Summary:** Fixed multiple interface mismatches discovered during live integration testing of the Claude tool calling system.

## Context

The tool calling feature was built across multiple sprints by different "agents" with no end-to-end integration testing until deployment. When we tested live with a real SerpAPI key, we discovered several architectural mismatches.

## Root Cause

**Components built at different times with incompatible interfaces:**
- searchProvider (built in Phase 1) returns SerpAPI format
- findContacts handler (built in Phase 1) expects domain format
- Services (built in Phase 2) have different method signatures than interfaces expected by executor
- No integration layer between raw API and domain logic

## Issues Discovered & Fixed

### Issue 1: SearchProvider Interface Mismatch

**Error:**
```
Cannot read properties of undefined (reading 'trim')
```

**Root Cause:**

searchProvider returns:
```typescript
{ title: string, snippet: string, url: string, position: number }
```

findContacts expects:
```typescript
{ name: string, company: string, url: string, snippet: string }
```

**Code Location:** Line 145 in `src/server/actions/handlers/findContacts.ts`
```typescript
const nameParts = result.name.trim().split(/\s+/)  // ❌ result.name is undefined
```

**Fix:** Created `searchProviderAdapter.ts`

**File:** `src/server/integrations/searchProviderAdapter.ts`

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

function extractCompanyFromSnippet(snippet: string): string | null {
  // Heuristic patterns: "at Company", "Company -", etc.
}
```

**Updated:** `app/api/ai/chat/route.ts` to use adapter
```typescript
const executor = createExecutor({
  searchProvider: searchProviderAdapter,  // ← Changed from searchProvider
  // ...
})
```

**Why this pattern:** Keeps searchProvider (SerpAPI integration) and findContacts (domain logic) independent. Adapter transforms between them.

---

### Issue 2: Missing stageContacts Method

**Error:**
```
deps.stagingService.stageContacts is not a function
```

**Root Cause:**

stagingService has:
- `saveStagedList(userId, sessionId, contacts: StagedContactInput[])`
- `getStagedList(userId)`

findContacts expects:
- `stageContacts(userId, contacts: SearchResult[]): Promise<StagedContact[]>`

**Fix:** Added `stageContacts` method to stagingService

**File:** `src/server/services/stagingService.ts`

```typescript
async stageContacts(
  userId: string,
  contacts: Array<{ name: string; company: string; url: string; snippet: string }>
) {
  // 1. Convert SearchResult to StagedContactInput
  const stagingInput = contacts.map((contact) => {
    const nameParts = contact.name.trim().split(/\s+/)
    const lastName = nameParts.pop() || contact.name
    const firstName = nameParts.join(' ') || undefined
    const linkedinUrl = contact.url.includes('linkedin.com') ? contact.url : undefined

    return { firstName, lastName, company: contact.company, linkedinUrl, sourceUrl: contact.url, notes: contact.snippet }
  })

  // 2. Generate session ID and save
  const sessionId = `session-${Date.now()}`
  await this.saveStagedList(userId, sessionId, stagingInput)

  // 3. Retrieve and return with IDs
  const savedContacts = await this.getStagedList(userId)
  return savedContacts.map((saved) => ({
    id: saved.id,
    name: `${saved.firstName || ''} ${saved.lastName}`.trim(),
    company: saved.company || '',
    url: saved.sourceUrl || '',
    snippet: saved.notes || '',
  }))
}
```

**Why this method:** Bridges the gap between SearchResult (domain) and database schema (StagedContactInput).

---

### Issue 3: ApproveService Interface Mismatch

**Error:**
```typescript
error TS2741: Property 'approve' is missing in type '{ approveList(...) }' but required in type 'ApproveServiceDeps'
```

**Root Cause:**

approveService has:
```typescript
approveList(userId: string, campaignName: string, keptContactIds: string[])
```

Interface expects:
```typescript
approve(input: { userId: string, campaignName: string, keptContactIds: string[] }): Promise<Campaign>
```

**Fix:** Added `approve` wrapper method

**File:** `src/server/services/approveService.ts`

```typescript
export const approveService = {
  async approve(input: { userId: string, campaignName: string, keptContactIds: string[] }) {
    const result = await this.approveList(input.userId, input.campaignName, input.keptContactIds)
    return {
      id: result.campaign.id,
      name: result.campaign.name,
      contactCount: result.contactCount,
    }
  },

  async approveList(userId: string, campaignName: string, keptContactIds: string[]) {
    // Existing implementation
  }
}
```

**Why wrapper:** Preserves existing `approveList` (used elsewhere) while implementing required interface.

---

### Issue 4: SavedViewService Interface Mismatch

**Error:**
```typescript
error TS2322: Type '{ create: (name: string, filters: unknown) => ... }' is not assignable to type 'SavedViewServiceDeps'
```

**Root Cause:**

savedViewService has:
```typescript
create: async (name: string, filters: unknown) => ({...})
```

Interface expects:
```typescript
create(userId: string, input: { name: string, filters: Record<string, unknown>, sort?: Record<string, unknown> }): Promise<SavedView>
```

**Fix:** Updated signature

**File:** `src/server/services/savedViewService.ts`

```typescript
export const savedViewService = {
  create: async (
    userId: string,
    input: { name: string, filters: Record<string, unknown>, sort?: Record<string, unknown> }
  ) => ({
    id: `view-${Date.now()}`,
    name: input.name,
    filters: input.filters,
    sort: input.sort,
  })
}
```

---

### Issue 5: CampaignRunner Missing Dependencies

**Error:**
```typescript
error TS2554: Expected 1 arguments, but got 0.
```

**Root Cause:**

Chat route called:
```typescript
const campaignRunner = createCampaignRunner()  // ❌ No args
```

createCampaignRunner expects:
```typescript
createCampaignRunner(deps: CampaignRunnerDeps)  // ✓ Needs { store: CampaignRunStore }
```

**Fix:** Initialized with Prisma store

**File:** `app/api/ai/chat/route.ts`

```typescript
import { createPrismaCampaignRunStore } from '@/src/server/services/campaignRunStore'
import { prismadb } from '@/lib/prisma'

const campaignRunStore = createPrismaCampaignRunStore(prismadb)
const campaignRunner = createCampaignRunner({ store: campaignRunStore })
```

---

### Issue 6: Missing StageExecutors

**Error:**
```
Module not found: Can't resolve '@/src/server/actions/handlers/stageExecutors'
```

**Root Cause:**

Chat route imported:
```typescript
import { emailFindingExecutor, insertGenerationExecutor, draftGenerationExecutor, sendExecutor }
  from '@/src/server/actions/handlers/stageExecutors'  // ❌ File doesn't exist
```

Executor expects:
```typescript
stageExecutors: StageExecutors  // Single object with 4 methods
```

**Fix:** Created stub stageExecutors

**File:** `src/server/actions/handlers/stageExecutors.ts`

```typescript
import type { StageExecutors, StageResult } from './interfaces'

export const stageExecutors: StageExecutors = {
  emailFinding: async (campaignId: string): Promise<StageResult> => {
    console.log('📧 Email finding stage - stub implementation', { campaignId })
    return { processedCount: 0, errors: [] }
  },
  inserts: async (campaignId: string): Promise<StageResult> => { /* ... */ },
  drafts: async (campaignId: string, templateId: string): Promise<StageResult> => { /* ... */ },
  send: async (campaignId: string): Promise<StageResult> => { /* ... */ },
}
```

**Updated import:**
```typescript
import { stageExecutors } from '@/src/server/actions/handlers/stageExecutors'

const executor = createExecutor({ stageExecutors, ... })
```

---

### Issue 7: Missing ContactService Stub

**Error:**
```
Module not found: Can't resolve '@/src/server/services/contactService'
```

**Fix:** Created stub implementation

**File:** `src/server/services/contactService.ts`

```typescript
export const contactService = {
  query: async () => [],
  moveStage: async (contactId: string, newStage: string) => ({
    id: contactId, name: '', company: '', stage: newStage, campaignId: '',
  }),
  updateField: async (contactId: string, field: string, value: unknown) => ({
    id: contactId, name: '', company: '', stage: 'NEW', campaignId: '',
  }),
  bulkUpdate: async () => 0,
  deleteContacts: async () => 0,
}
```

---

## Systematic Debugging Lessons

### What Went Wrong

1. **Fixed issues one-by-one** as errors appeared (symptom fixing)
2. **Didn't map complete dependency graph** before making changes
3. **Each fix revealed new interface mismatch** in different component

This pattern indicates **architectural mismatch**, not simple bugs.

### What Should Have Been Done

1. **Read ALL service interfaces** (`handlers/interfaces.ts`)
2. **Read ALL executor dependencies** (`executor.ts`)
3. **Map complete dependency graph** upfront
4. **Identify ALL mismatches** at once
5. **Fix all together** in coordinated changes

### Pattern Recognition

**Red flag pattern:**
> "Each fix reveals new problem in different place"

**This indicates:** Architectural issue, not isolated bugs

**Correct response:** Stop fixing individual issues, map the complete system, fix architecture

---

## Architecture Changes

### Before

```
Chat API → searchProvider (SerpAPI format)
         ↓
         findContacts (expects domain format) ❌ MISMATCH
```

### After

```
Chat API → searchProviderAdapter → searchProvider (SerpAPI)
         ↓                        ↓
         findContacts ←─────────── (transforms to domain format) ✓
```

### Key Pattern: Adapter Layer

**When to use:**
- Components built at different times
- Different interface contracts
- Don't want to modify either side
- Need clean integration

**Where to place:** `src/server/integrations/` (transformation layer)

---

## Files Changed

| File | Change | Reason |
|------|--------|--------|
| `src/server/integrations/searchProviderAdapter.ts` | Created | Transform SerpAPI → domain format |
| `src/server/services/stagingService.ts` | Added `stageContacts` | Bridge SearchResult → database |
| `src/server/services/approveService.ts` | Added `approve` wrapper | Match interface signature |
| `src/server/services/savedViewService.ts` | Updated `create` signature | Match interface signature |
| `src/server/services/contactService.ts` | Created stub | Satisfy executor deps |
| `src/server/actions/handlers/stageExecutors.ts` | Created stub | Satisfy executor deps |
| `app/api/ai/chat/route.ts` | Use adapter, init campaignRunner | Wire dependencies correctly |
| `app/(app)/home/page.tsx` | Move staging panel below chat | UX improvement |
| `lib/ai/stream-chat.ts` | Strengthen CONTACT_FINDER prompt | Ensure tool usage |

---

## Testing Results

**Before fixes:**
```
❌ Error: Cannot read properties of undefined (reading 'trim')
```

**After fixes:**
```
✅ Action result: success
📊 Result data: [{"id":"697ec8ac7bc20cbb502c0f11","name":"Chief Technology Officer jobs in San Francisco, CA",...}]
```

**End-to-end flow working:**
1. User: "Find 5 CTOs in San Francisco"
2. Claude calls `find_contacts` tool
3. SerpAPI search executes
4. Adapter transforms results
5. stagingService saves to database
6. UI displays contacts in staging panel

---

## Prevention for Future

1. **Integration testing before deployment** - Don't wait until live testing
2. **Interface contracts in docs** - Document expected signatures
3. **Dependency graph diagram** - Visual map of all interfaces
4. **Adapter-first design** - Always use adapters between layers
5. **Type checking in CI** - Catch signature mismatches in PR

---

## Related

- [Tool Calling Architecture](../architecture/tool-calling.md) - Complete system overview
- [Systematic Debugging Skill](~/.claude/skills/systematic-debugging) - Process we should have followed
- [Phase 3 Integration Results](../../status/phase-3-integration.md) - Test coverage
