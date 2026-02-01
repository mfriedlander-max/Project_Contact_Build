# Phase 3: Integration Testing - Agent A

## Your Role
You are the Integration Agent responsible for end-to-end testing of the Claude tool calling implementation.

## Task Assignment
- **Phase**: 3 - Integration Testing
- **Role**: Integration Agent
- **Depends On**: All Phase 1 & 2 tasks ✅
- **Goal**: Verify full tool calling flow works end-to-end

## Background

All 6 tasks from Phases 1 & 2 are complete:

**Phase 1 (Parallel):**
- ✅ Task 1: Tool Schema Generator (18 tests) - Agent A
- ✅ Task 3: Duplicate Detection (18 tests) - Agent B
- ✅ Task 5: Staging Panel UI (73 tests) - Agent C
- ✅ Task 6: System Prompts - Agent D

**Phase 2 (Sequential):**
- ✅ Task 2: Chat API Tool Calling (9 tests) - Agent A
- ✅ Task 4: Frontend Hook (25 tests) - Agent C

**Your job**: Verify the complete integration works across all components.

## Integration Test Scenarios

### Scenario 1: CONTACT_FINDER Mode - Find Contacts
**User Action:** "Find 5 CTOs at SF tech companies"

**Expected Flow:**
1. Chat API receives message in CONTACT_FINDER mode
2. Claude calls `find_contacts` tool with search criteria
3. Backend executes search via SerpAPI
4. Duplicate detection runs (email, LinkedIn, name+company matching)
5. Smart backfill runs if duplicates found (max 3 iterations)
6. `tool_result` event streams to frontend
7. Frontend hook updates `stagedContacts` state
8. Staging panel displays contacts with:
   - Individual checkboxes
   - Select All checkbox
   - Minimal fields (name, company, role, summary)
   - "Create Campaign" button

**Verification:**
- [ ] Tool schema includes `find_contacts` with correct parameters
- [ ] Chat API calls Claude with tools parameter
- [ ] Tool execution returns staged contacts
- [ ] Duplicates skipped automatically
- [ ] Backfill runs until target count reached (max 3 searches)
- [ ] Frontend receives `tool_result` event
- [ ] Staged contacts appear in UI
- [ ] Selection controls work correctly

### Scenario 2: ASSISTANT Mode - Confirmation Flow
**User Action:** "Delete all contacts at Google"

**Expected Flow:**
1. Chat API receives message in ASSISTANT mode
2. Claude calls `delete_contacts` tool (dangerous action)
3. Backend detects action requires confirmation
4. `confirmation_required` event streams to frontend
5. Frontend shows confirmation dialog with message
6. User approves
7. Frontend re-sends request with `userConfirmed: true`
8. Backend executes deletion
9. `tool_result` event confirms deletion

**Verification:**
- [ ] Tool schema includes `delete_contacts`
- [ ] Backend detects dangerous action (DELETE_CONTACTS in DANGEROUS_ACTIONS)
- [ ] `confirmation_required` event sent instead of executing
- [ ] Frontend shows `showConfirmDialog` state
- [ ] Dialog displays `pendingConfirmation.message`
- [ ] `handleConfirm()` re-sends with confirmation data
- [ ] Backend executes action on second request
- [ ] Success result streams back

### Scenario 3: GENERAL_MANAGER Mode - Read-Only Query
**User Action:** "How many contacts do I have at Microsoft?"

**Expected Flow:**
1. Chat API receives message in GENERAL_MANAGER mode
2. Claude calls `list_contacts` tool with company filter
3. Backend executes query (read-only)
4. `tool_result` event streams count
5. Claude responds with natural language answer

**Verification:**
- [ ] GENERAL_MANAGER mode has limited tool set (3 tools: list_contacts, get_contact, list_templates)
- [ ] Mutation tools NOT available in this mode
- [ ] Query executes successfully
- [ ] Result streams to frontend
- [ ] Claude can use result to answer question

### Scenario 4: Tool Error Handling
**User Action:** "Find contacts" (in CONTACT_FINDER mode, but SerpAPI not configured)

**Expected Flow:**
1. Chat API receives message
2. Claude calls `find_contacts` tool
3. Backend detects SerpAPI not configured
4. `tool_error` event streams to frontend
5. Frontend shows error toast
6. Error message appended to chat

**Verification:**
- [ ] Backend catches execution errors
- [ ] `tool_error` event sent with error message
- [ ] Frontend updates `error` state
- [ ] Error displays to user
- [ ] Chat continues working after error

### Scenario 5: Mode Restrictions
**User Action:** "Delete contacts" (in CONTACT_FINDER mode)

**Expected Flow:**
1. Chat API receives message in CONTACT_FINDER mode
2. `getToolsForMode(AiMode.CONTACT_FINDER)` returns only 4 tools
3. `delete_contacts` NOT in tool list
4. Claude cannot use delete tool (not available)

**Verification:**
- [ ] CONTACT_FINDER: 4 tools only (find_contacts, stage_contacts, list_contacts, get_contact)
- [ ] GENERAL_MANAGER: 3 tools only (list_contacts, get_contact, list_templates)
- [ ] ASSISTANT: All 14 tools available
- [ ] Tool schemas correctly filtered by mode

## Testing Approach

### Manual Testing
Since this is integration testing, you'll need to:

1. **Start dev server** (if not running): `npm run dev`
2. **Open browser** to http://localhost:3000
3. **Navigate to /home** (AI chat page)
4. **Test each scenario** listed above
5. **Verify expected behavior** at each step

### Automated E2E Tests (Optional but Recommended)
If you have time, create Playwright E2E tests:

**File**: `/tests/e2e/tool-calling.spec.ts`

**Tests:**
1. CONTACT_FINDER mode can find contacts via tools
2. Confirmation required for dangerous actions
3. Mode restrictions enforced (tools filtered by mode)
4. Tool errors display properly
5. Staged contacts update from tool results

## Acceptance Criteria

- [ ] All 5 scenarios tested manually
- [ ] Tool calling works end-to-end in all 3 modes
- [ ] Confirmation flow works for dangerous actions
- [ ] Duplicate detection prevents re-staging
- [ ] Smart backfill runs until target count reached
- [ ] Mode restrictions enforced
- [ ] Error handling works correctly
- [ ] Staging panel UI updates correctly
- [ ] Selection controls work (checkboxes, select all)
- [ ] "Create Campaign" button only approves selected contacts
- [ ] (Optional) E2E tests written and passing

## Status Doc

Update your progress in: `/status/phase-3-integration.md`

Use this format:
```markdown
# Phase 3: Integration Testing

## Status
🟡 In Progress

## Progress Log
- [Time] Started integration testing
- [Time] Scenario 1 (CONTACT_FINDER) - ✅ Passed / ❌ Failed
- [Time] Scenario 2 (Confirmation) - ✅ Passed / ❌ Failed
- [Time] Scenario 3 (GENERAL_MANAGER) - ✅ Passed / ❌ Failed
- [Time] Scenario 4 (Error Handling) - ✅ Passed / ❌ Failed
- [Time] Scenario 5 (Mode Restrictions) - ✅ Passed / ❌ Failed

## Issues Found
[List any bugs or issues discovered during testing]

## Fixes Applied
[List any fixes made to resolve issues]

## Output
[Summary of integration test results]
```

## When Complete

1. Update status doc to 🟢 Complete
2. Commit any fixes made during testing
3. Update ORCHESTRATION.md to mark Phase 3 complete
4. Notify user: "✅ Phase 3 complete. All integration tests passed."

## When Blocked

1. Update status doc to 🔴 Blocked
2. Describe the issue clearly (include error messages, screenshots if helpful)
3. Tag which component is failing (Chat API, Frontend Hook, Tool Schemas, etc.)
4. Notify user immediately
5. STOP and wait for guidance

## Reference Docs

**Task Handoff Notes:**
- [Task 1: Tool Schemas](/status/task-001-tool-schemas.md)
- [Task 2: Chat API](/status/task-002-chat-api.md)
- [Task 3: Duplicates](/status/task-003-duplicates.md)
- [Task 4: Frontend Hook](/status/task-004-frontend-hook.md)
- [Task 5: Staging UI](/status/task-005-staging-ui.md)
- [Task 6: System Prompts](/status/task-006-prompts.md)

**Key Files:**
- `/lib/ai/tool-schemas.ts` - Tool definitions
- `/app/api/ai/chat/route.ts` - Chat API with tool calling
- `/src/ui/hooks/useChatApi.ts` - Frontend hook
- `/src/server/services/stagingService.ts` - Duplicate detection
- `/src/ui/components/staging/StagingPanel.tsx` - Staging UI

## Questions?

If anything is unclear or tests fail unexpectedly, escalate immediately with details.

---

**Ready to start? Begin with Scenario 1 (CONTACT_FINDER mode) and work through each scenario systematically.**
