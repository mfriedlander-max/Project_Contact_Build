# Task: C-Phase3 - Pipeline Stage Executors

## Assignment
- **Role**: Implementation (TDD)
- **Assigned Files**: `src/server/integrations/stages/**/*`, barrel update in `src/server/integrations/index.ts`
- **Depends On**: Phase 2 services (complete)
- **Blocks**: Agent D (campaign runner wiring)

## Status
🟢 Complete

## Progress Log
- Created shared stage types (`types.ts`)
- TDD: emailFindingStage — 6 tests, all passing
- TDD: insertStage — 5 tests, all passing
- TDD: draftStage — 6 tests, all passing
- TDD: sendStage — 5 tests, all passing
- TDD: gmailSync (reply detection) — 6 tests, all passing
- Updated barrel exports in `index.ts`
- All 28 tests pass, 100% statement/line/function coverage

## Output

### Files Created
- `src/server/integrations/stages/types.ts` — Shared types (StageError, result interfaces, ProgressCallback)
- `src/server/integrations/stages/emailFindingStage.ts` — Batch email finding via Hunter
- `src/server/integrations/stages/insertStage.ts` — Page fetch + AI insert generation
- `src/server/integrations/stages/draftStage.ts` — Template composition + Gmail draft creation
- `src/server/integrations/stages/sendStage.ts` — Gmail draft sending
- `src/server/integrations/stages/gmailSync.ts` — Thread-based reply detection
- 5 test files in `__tests__/`

### Files Modified
- `src/server/integrations/index.ts` — Added barrel exports for all stage executors

### Key Design Decisions
- Stage executors mutate the passed Contact objects (email, insert, status fields) so downstream stages see updates
- Each stage collects per-contact errors without failing the batch
- Progress callbacks report (processed, total) after each contact
- gmailSync uses Gmail Threads API (format=minimal) to count messages — >1 message means reply detected
- Contacts without required fields (no company for email finding, no URL for inserts, no email/insert for drafts) are skipped with count

## Handoff Notes
- All stage executors are exported from `src/server/integrations/index.ts`
- Agent D can import: `executeEmailFindingStage`, `executeInsertStage`, `executeDraftStage`, `executeSendStage`, `checkForReplies`
- Draft stage accepts a `TemplateInput` (subject + body with `{{first_name}}`, `{{insert}}`, `{{availability}}` placeholders)
- Send stage reads `gmail_draft_id` from `contact.custom_fields` — draft stage should store it there
- Gmail sync reads `gmail_thread_id` from `contact.custom_fields`

## Commit
`68ef46f feat(integrations): wire Phase 3 pipeline stage executors`
