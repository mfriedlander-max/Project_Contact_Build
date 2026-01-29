# Task: Agent D Phase 1 - Enum Reconciliation + Action Schema

## Assignment
- **Role**: AI/Orchestration Agent (TDD)
- **Command**: `/tdd`
- **Assigned Files**:
  - `src/server/actions/types.ts`
  - `src/server/actions/executor.ts`
  - `src/server/actions/campaignRunner.ts`
  - `src/server/actions/__tests__/*`
- **Depends On**: Agent B's enums (lib/types/enums.ts)
- **Blocks**: Phase 2 action implementations

## Status
🟢 Complete

## Progress Log
- [12:32] Started task - explored existing codebase
- [12:33] Reconciled enums in types.ts - imported AiMode, AiActionType from @/lib/types/enums
- [12:33] Fixed type annotations to use AiModeType and AiActionTypeValue (as const objects, not enums)
- [12:33] Reconciled enums in campaignRunner.ts - imported CampaignRunState, CAMPAIGN_RUN_STATE_TRANSITIONS
- [12:33] Updated campaignRunner tests to match central state machine (stricter transitions)
- [12:34] All existing tests passing (102 tests)
- [12:35] Added failing tests for new Zod schemas (RED phase)
- [12:35] Implemented all Zod schemas for action payloads (GREEN phase)
- [12:35] Added tests for validateActionPayload helper function
- [12:36] All 138 tests passing with types.ts at 100% coverage

## Output

### Files Changed
1. **src/server/actions/types.ts**
   - Removed local `AiMode` and `AiActionType` enum definitions
   - Added imports from `@/lib/types/enums`
   - Re-exported types for consumers
   - Updated type annotations to use `AiModeType` and `AiActionTypeValue`
   - Changed `AiActionPayloads` from interface to type (for string keys)
   - Added 11 new Zod schemas for ALL action payloads:
     - `ShowStagedResultsPayloadSchema`
     - `DeleteStagedRowPayloadSchema`
     - `CampaignIdPayloadSchema` (shared by RUN_EMAIL_FINDING, RUN_INSERTS, SEND_EMAILS)
     - `RunDraftsPayloadSchema`
     - `QueryContactsPayloadSchema`
     - `MoveStagePayloadSchema`
     - `UpdateFieldPayloadSchema`
     - `BulkUpdatePayloadSchema`
     - `DeleteContactsPayloadSchema`
     - `CreateSavedViewPayloadSchema`
   - Added `ACTION_PAYLOAD_SCHEMAS` map for all action types
   - Added `validateActionPayload` helper function

2. **src/server/actions/executor.ts**
   - Updated imports to include type aliases
   - Updated `ExecutorContext` interface to use `AiModeType`
   - Updated function signatures to use `AiActionTypeValue` and `AiModeType`

3. **src/server/actions/campaignRunner.ts**
   - Removed local `CampaignRunState` enum definition
   - Added imports from `@/lib/types/enums`
   - Re-exported types for consumers
   - Using `CAMPAIGN_RUN_STATE_TRANSITIONS` as source for `VALID_TRANSITIONS`
   - Updated all type annotations to use `CampaignRunStateType`

4. **src/server/actions/__tests__/types.test.ts**
   - Added imports for all new schemas
   - Added 30 new tests for Zod schemas validation
   - Added tests for `ACTION_PAYLOAD_SCHEMAS` completeness
   - Added tests for `validateActionPayload` function

5. **src/server/actions/__tests__/campaignRunner.test.ts**
   - Updated test for DRAFTS_RUNNING transitions (now only SENDING_RUNNING or FAILED)
   - Updated test for IDLE transitions (now allows INSERTS_RUNNING as well)

### Test Results
```
Test Files  4 passed (4)
Tests       138 passed (138)

Coverage for types.ts: 100% statements, 100% branches, 100% functions
```

### State Machine Changes
The central `CAMPAIGN_RUN_STATE_TRANSITIONS` has slightly different transitions than the previous local definition:
- `IDLE` can now go directly to `INSERTS_RUNNING` (skipping email finding)
- `DRAFTS_RUNNING` can only go to `SENDING_RUNNING` or `FAILED` (not directly to COMPLETE)

These are intentional design decisions in the central enum file.

## Issues Found
- Pre-existing TypeScript errors in `app/api/campaigns/__tests__/route.test.ts` and `app/api/settings/__tests__/route.test.ts` (missing `v` and `templateId` properties in mock data) - these are outside Agent D's scope

## Handoff Notes
- All action payloads now have Zod validation schemas
- Use `validateActionPayload(actionType, payload)` to validate any action payload
- Use `ACTION_PAYLOAD_SCHEMAS[actionType]` to get the schema directly
- The executor can now validate payloads before execution in Phase 2
- All enums and constants should be imported from `@/lib/types/enums` (or re-exported from types.ts)
