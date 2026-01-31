# Claude Tool Calling Implementation

**Date:** 2026-01-31
**Status:** Design
**Complexity:** Medium (2-3 hours)

## Problem Statement

The AI chat currently streams conversational responses but cannot execute actions. When users ask to "find contacts," Claude gives advice instead of actually searching. The action executor system exists but isn't connected to Claude's tool calling API.

## Root Cause

The `/api/ai/chat` endpoint calls Claude's Messages API without defining any tools. Claude has no way to trigger the 14 available action handlers.

## Architecture Overview

### Current Flow (Broken)
```
User: "Find software engineers"
  ↓
Claude API (no tools defined)
  ↓
Conversational text response
  ↓
No actions executed ❌
```

### Desired Flow
```
User: "Find software engineers"
  ↓
Claude API (with FIND_CONTACTS tool defined)
  ↓
Claude returns tool_use block
  ↓
Execute handleFindContacts()
  ↓
Return staged contacts
  ↓
StagingPanel renders ✅
```

## Tool Definitions by Mode

### CONTACT_FINDER Mode
**Tools:**
1. `find_contacts` - Search for new professional contacts
   - Input: `{ query: string, maxResults?: number }`
   - Output: Array of staged contacts

2. `show_staged_results` - View currently staged contacts
   - Input: `{}`
   - Output: List of staged contacts

3. `delete_staged_row` - Remove contact from staging
   - Input: `{ stagedContactId: string }`
   - Output: Success confirmation

4. `approve_staged_list` - Create campaign from staged contacts
   - Input: `{ campaignName: string, keptContactIds: string[] }`
   - Output: Campaign created
   - **Requires confirmation**

### GENERAL_MANAGER Mode (Read-only)
**Tools:**
1. `query_contacts` - Search existing contacts in CRM
   - Input: `{ filters: { stage?, campaignId?, industry?, search? } }`
   - Output: Matching contacts

2. `show_staged_results` - View staged contacts

3. `create_saved_view` - Save current filter configuration
   - Input: `{ name: string, filters: object, sort?: object }`
   - Output: Saved view created

### ASSISTANT Mode (Full access)
**All tools from GENERAL_MANAGER + CONTACT_FINDER +:**

Campaign execution:
4. `run_email_finding` - Execute email finding stage
   - Input: `{ campaignId: string }`

5. `run_inserts` - Execute insert generation stage
   - Input: `{ campaignId: string }`

6. `run_drafts` - Execute draft generation stage
   - Input: `{ campaignId: string, templateId: string }`

7. `send_emails` - Send campaign emails
   - Input: `{ campaignId: string }`
   - **Requires confirmation**

Contact mutations:
8. `move_stage` - Update contact pipeline stage
   - Input: `{ contactId: string, newStage: string }`

9. `update_field` - Update single contact field
   - Input: `{ contactId: string, field: string, value: any }`

10. `bulk_update` - Update multiple contacts
    - Input: `{ contactIds: string[], updates: object }`
    - **Requires confirmation**

11. `delete_contacts` - Delete contacts
    - Input: `{ contactIds: string[] }`
    - **Requires confirmation**

## Implementation Plan

### Step 1: Create Tool Schema Generator
**File:** `/lib/ai/tool-schemas.ts`

Generate Claude-compatible tool definitions from our action types:
```typescript
export function getToolsForMode(mode: AiModeType): ToolDefinition[] {
  // Map AiActionType → Claude tool schema
  // Filter by ACTION_MODE_REQUIREMENTS
}
```

### Step 2: Update Chat API Route
**File:** `/app/api/ai/chat/route.ts`

Changes:
1. Add `tools` parameter to `client.messages.stream()` call
2. Handle `tool_use` content blocks in stream
3. Execute actions via `executeAction()`
4. Handle confirmations (return to user for approval)
5. Stream tool results back to Claude

### Step 3: Update Frontend Hook
**File:** `/src/ui/hooks/useChatApi.ts`

Changes:
1. Handle tool_use responses in SSE stream
2. Show confirmation dialogs for dangerous actions
3. Re-send with `userConfirmed: true` after approval
4. Update staged contacts state from tool results

### Step 4: Update System Prompts
**File:** `/lib/ai/stream-chat.ts`

Change prompts from "suggest queries" to "use tools":
```typescript
[AiMode.CONTACT_FINDER]: `You are a Contact Finder assistant.
When users ask to find contacts, use the find_contacts tool to search.
When they want to approve contacts, use approve_staged_list.`
```

## Duplicate Detection & Smart Backfill

**CRITICAL FEATURE:** Skip duplicates entirely and backfill to meet requested count.

**Matching strategy:**
1. **Email match** (primary) - Check `email` and `personal_email` fields
2. **LinkedIn URL match** - Check `social_linkedin` field
3. **Name + Company match** (fuzzy) - Check `first_name` + `last_name` + `company`

**Implementation: Smart Backfill (Option B)**
```
User asks for 10 contacts
→ Search for 10 contacts
→ Filter out 3 duplicates → 7 unique
→ Automatically search for 3 more
→ Repeat until we have 10 unique (or search exhausted)
→ Stage all 10 unique contacts
```

**Future Enhancement (Phase 2):**
Claude evaluates results against user criteria. If prompt wasn't specific enough, asks for refinement:
```
"Found 10 CTOs, but 3 are in healthcare instead of tech.
Want me to search specifically for tech CTOs?"
```

## Contact Data Fields

**Staged contacts show minimal data:**
- Name
- Company
- Role/Position
- 1-sentence summary (what they do)

**Nothing else** - keep it clean and scannable.

## Search Quality Filtering

**Before staging:** Claude filters search results by relevance to user's query.
- Removes obviously irrelevant results (wrong title, wrong location, wrong industry)
- Only stages contacts that match the criteria

## Contact Updates for Duplicates

When duplicate detected with new info:
```
Claude: "Found Jane Smith at TechCo, but she's already in your CRM.
However, her title changed from 'VP Engineering' to 'CTO'.
Want me to update her record?"
```

User can approve update without re-staging.

## Partial Approval Workflow

Staging panel includes:
- **"Select All"** checkbox
- Individual checkboxes per contact
- **"Create Campaign"** button (approves selected, removes from staging)
- Selected contacts moved to CRM, unselected remain staged

## Edge Cases

1. **Tool execution fails** - Return error to Claude, let it retry or explain
2. **Confirmation required** - Send tool_use back to frontend, wait for user approval
3. **Multiple tool calls** - Execute sequentially, stream results
4. **Streaming + tools** - Use tool results in continued conversation
5. **Rate limiting** - Apply same rate limits as current chat
6. **Duplicate contacts** - Mark with warning badge, let user decide to keep/remove

## Testing Strategy

### Unit Tests
- Tool schema generation for each mode
- Tool_use response parsing
- Action execution with mocked deps
- Confirmation flow

### Integration Tests
- Full flow: user message → tool call → action → staged contacts
- Each mode's tools work correctly
- Confirmation prompts appear for dangerous actions

### Manual Testing
Per mode:
- CONTACT_FINDER: "Find 5 CTOs in SF" → sees staged panel
- GENERAL_MANAGER: "Show contacts in pipeline stage 2" → sees list
- ASSISTANT: "Move contact X to stage 3" → updates successfully
- ASSISTANT: "Delete these 10 contacts" → shows confirmation first

## Files to Modify

### Tool Calling (Core feature)
1. **New:** `/lib/ai/tool-schemas.ts` - Tool definition generator
2. **Edit:** `/app/api/ai/chat/route.ts` - Add tool calling logic
3. **Edit:** `/src/ui/hooks/useChatApi.ts` - Handle tool responses
4. **Edit:** `/lib/ai/stream-chat.ts` - Update system prompts
5. **New:** `/lib/ai/__tests__/tool-schemas.test.ts` - Tests
6. **Edit:** `/app/api/ai/chat/__tests__/route.test.ts` - Extended tests

### Duplicate Detection (Critical addition)
7. **Edit:** `/src/server/services/stagingService.ts` - Add `findExistingContacts()` function
8. **Edit:** `/src/server/actions/handlers/findContacts.ts` - Call duplicate detection before staging
9. **Edit:** `/src/ui/components/staging/StagingRow.tsx` - Show duplicate warning badge
10. **Edit:** `/src/lib/schemas/staging.ts` - Add `isDuplicate` fields to schema

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude hallucinates invalid tool calls | Zod validation before execution |
| User bypasses confirmation | Server enforces `userConfirmed` check |
| Tool calls are slow | Stream partial results, show loading states |
| Breaking existing chat | Feature flag to toggle tool calling |

## Success Criteria

✅ User asks "Find engineers in NYC" → contacts appear in staging panel
✅ User asks "Show my pipeline" → sees contact list
✅ User asks "Delete contact X" → confirmation dialog appears
✅ All 14 action types are accessible via tools
✅ Mode restrictions enforced (FIND_CONTACTS only in CONTACT_FINDER)
✅ Dangerous actions require explicit confirmation

## Timeline Estimate

- Tool schema generator: 30 min
- Chat API updates: 1 hour
- Frontend hook updates: 45 min
- System prompt updates: 15 min
- **Duplicate detection:** 45 min
  - Database queries (20 min)
  - UI warning badges (15 min)
  - Schema updates (10 min)
- Testing: 45 min

**Total: 3.5-4 hours**
