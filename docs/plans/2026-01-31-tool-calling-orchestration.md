# Tool Calling Implementation - Orchestration Plan

**Date:** 2026-01-31
**Architect:** Claude (this session)
**Design Doc:** [2026-01-31-claude-tool-calling.md](./2026-01-31-claude-tool-calling.md)

## Strategy

**Branch:** `feature/claude-tool-calling`
**Parallel execution** with **file ownership** to prevent conflicts.
All agents work on the same feature branch (no worktrees needed - tasks are independent).

## Task Breakdown

### Task 1: Tool Schema Generator (Backend)
**Role:** Implementation Agent
**Files Owned:**
- `/lib/ai/tool-schemas.ts` (new)
- `/lib/ai/__tests__/tool-schemas.test.ts` (new)

**Deliverables:**
1. `getToolsForMode(mode)` - Returns Claude tool definitions for given mode
2. Tool definitions for all 14 action types
3. Schema validation using existing Zod schemas
4. Unit tests (100% coverage)

**Dependencies:** None (can start immediately)

---

### Task 2: Chat API Tool Calling (Backend)
**Role:** Implementation Agent
**Files Owned:**
- `/app/api/ai/chat/route.ts` (edit)
- `/app/api/ai/chat/__tests__/route.test.ts` (edit)

**Deliverables:**
1. Add `tools` parameter to Claude Messages API call
2. Handle `tool_use` content blocks in SSE stream
3. Execute actions via `executeAction()`
4. Stream tool results back to Claude
5. Handle confirmation flow (return to user for approval)
6. Extended integration tests

**Dependencies:** Task 1 (needs tool schemas)

---

### Task 3: Duplicate Detection + Smart Backfill (Backend)
**Role:** Implementation Agent
**Files Owned:**
- `/src/server/services/stagingService.ts` (edit)
- `/src/server/actions/handlers/findContacts.ts` (edit)
- `/src/server/services/__tests__/stagingService.test.ts` (edit)

**Deliverables:**
1. `findExistingContacts()` - Check email, LinkedIn, name+company matches
2. Smart backfill logic in `handleFindContacts()`:
   - Search → filter duplicates → backfill until target count
   - Max 3 search iterations to prevent infinite loops
3. Return duplicate info when found (for Claude to offer updates)
4. Unit tests for duplicate detection

**Dependencies:** None (can start immediately)

---

### Task 4: Frontend Tool Response Handling (Frontend)
**Role:** Implementation Agent
**Files Owned:**
- `/src/ui/hooks/useChatApi.ts` (edit)
- `/src/ui/hooks/__tests__/useChatApi.test.ts` (edit)

**Deliverables:**
1. Parse `tool_use` responses from SSE stream
2. Show confirmation dialogs for dangerous actions (delete, bulk update, send emails)
3. Re-send with `userConfirmed: true` after user approval
4. Update staged contacts state from tool results
5. Unit tests for confirmation flow

**Dependencies:** Task 2 (needs API contract)

---

### Task 5: Staging Panel UI Updates (Frontend)
**Role:** Implementation Agent
**Files Owned:**
- `/src/ui/components/staging/StagingPanel.tsx` (edit)
- `/src/ui/components/staging/StagingRow.tsx` (edit)
- `/src/ui/components/staging/StagingHeader.tsx` (edit)
- `/src/ui/components/staging/__tests__/*.test.tsx` (edit)

**Deliverables:**
1. Add "Select All" checkbox to header
2. Add individual checkboxes per row
3. Change "Approve" → "Create Campaign" button
4. Only approve selected contacts (not all)
5. Show minimal fields: name, company, role, 1-sentence summary
6. Unit tests for selection behavior

**Dependencies:** None (UI-only changes)

---

### Task 6: System Prompt Updates (Backend)
**Role:** Implementation Agent (quick task)
**Files Owned:**
- `/lib/ai/stream-chat.ts` (edit)

**Deliverables:**
1. Update CONTACT_FINDER prompt to tell Claude to use tools
2. Update GENERAL_MANAGER prompt for read-only queries
3. Update ASSISTANT prompt for full mutations
4. Include guidance on when to ask for confirmation

**Dependencies:** None (can start immediately)

---

## Parallel Execution Plan

### Phase 1: Independent Tasks (All in parallel)
Start simultaneously:
- **Agent A:** Task 1 (Tool schemas)
- **Agent B:** Task 3 (Duplicate detection)
- **Agent C:** Task 5 (Staging panel UI)
- **Agent D:** Task 6 (System prompts) - Quick, should finish first

**No conflicts** - all own different files.

### Phase 2: Dependent Tasks
After Task 1 completes:
- **Agent A:** Task 2 (Chat API) - depends on Task 1

After Task 2 completes:
- **Agent C:** Task 4 (Frontend hook) - depends on Task 2

### Phase 3: Integration Testing
After all tasks complete:
- **Agent A:** Full integration test (all modes, all tools)
- Verify: CONTACT_FINDER finds contacts → stages → approves
- Verify: GENERAL_MANAGER queries work
- Verify: ASSISTANT mutations work with confirmations
- Verify: Duplicate detection prevents re-staging

---

## File Ownership Matrix

| Agent | Task | Files | Touches |
|-------|------|-------|---------|
| **A** | 1, 2 | Tool schemas, Chat API | `/lib/ai/`, `/app/api/ai/chat/` |
| **B** | 3 | Duplicate detection | `/src/server/services/`, `/src/server/actions/handlers/` |
| **C** | 4, 5 | Frontend hook, Staging UI | `/src/ui/hooks/`, `/src/ui/components/staging/` |
| **D** | 6 | System prompts | `/lib/ai/stream-chat.ts` |

**No overlap** - agents can work independently without conflicts.

---

## Status Documentation

Each agent maintains:
- `/status/task-tool-calling-[N]-[name].md`

Example:
- `task-tool-calling-1-schemas.md` (Agent A, Task 1)
- `task-tool-calling-2-chat-api.md` (Agent A, Task 2)
- `task-tool-calling-3-duplicates.md` (Agent B, Task 3)
- `task-tool-calling-4-frontend-hook.md` (Agent C, Task 4)
- `task-tool-calling-5-staging-ui.md` (Agent C, Task 5)
- `task-tool-calling-6-prompts.md` (Agent D, Task 6)

---

## Handoff Protocol

**Phase 1 → Phase 2:**
1. Agent A completes Task 1 (tool schemas)
2. Agent A updates status doc to 🟢 Complete
3. Agent A notifies: "Task 1 complete - tool schemas ready"
4. **User relays to Architect:** "Agent A finished task 1"
5. **Architect:** Reads status doc, tells Agent A to start Task 2
6. Agent A begins Task 2 (chat API)

**Phase 2 → Phase 3:**
1. Agent A completes Task 2
2. Agent A notifies completion
3. **User relays to Architect**
4. **Architect:** Tells Agent C to start Task 4 (frontend hook)

**Integration:**
1. All agents complete their tasks
2. Each updates status to 🟢
3. **User relays to Architect:** "All agents finished"
4. **Architect:** Reviews all status docs
5. **Architect:** Assigns integration testing to Agent A
6. Agent A runs full E2E tests

---

## Success Criteria

### Per-Task
- ✅ All unit tests pass
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ Status doc updated to 🟢 Complete

### Integration
- ✅ User: "Find 5 CTOs in SF" → 5 contacts appear in staging panel
- ✅ Duplicates skipped automatically, backfill runs
- ✅ Staging panel shows: Select All, checkboxes, minimal fields
- ✅ "Create Campaign" only approves selected contacts
- ✅ GENERAL_MANAGER mode can query contacts
- ✅ ASSISTANT mode shows confirmation for delete/bulk actions
- ✅ All 14 action types accessible via tools
- ✅ Mode restrictions enforced

---

## Timeline

### Phase 1 (Parallel): 1.5 hours
- Task 1: 30 min (schemas)
- Task 3: 45 min (duplicates)
- Task 5: 30 min (staging UI)
- Task 6: 15 min (prompts)

### Phase 2 (Sequential): 2 hours
- Task 2: 1 hour (chat API)
- Task 4: 45 min (frontend hook)

### Phase 3 (Integration): 30 min
- Integration testing: 30 min

**Total: 4 hours** (3.5 hours with perfect parallelism)

---

## Agent Prompts

Ready to generate copy-paste prompts for each agent window once approved.

## Blockers

- [ ] None currently - all dependencies mapped

## Notes

- Using file ownership strategy (no worktrees needed)
- All work on main branch
- Agents commit incrementally (not just at end)
- Each agent follows TDD workflow (/tdd command)
