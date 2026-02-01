# Task: 004 - Frontend Hook

## Assignment
- **Role**: Implementation Agent
- **Files**: [/src/ui/hooks/useChatApi.ts](/src/ui/hooks/useChatApi.ts), [/src/ui/hooks/__tests__/useChatApi.test.ts](/src/ui/hooks/__tests__/useChatApi.test.ts)
- **Depends On**: Task 2 (Chat API) ✅
- **Blocks**: Phase 3 integration testing

## Status
🟢 Complete

## Progress Log
- [2026-02-01 Starting] Created status doc
- [Complete] Read Task 2 handoff notes and current implementation
- [Complete] Updated readSSEStream to handle 4 event types with callbacks
- [Complete] Added confirmation dialog state management (pendingConfirmation, showConfirmDialog)
- [Complete] Updated sendMessage signature to accept optional confirmationData parameter
- [Complete] Implemented confirmation flow (handleConfirm, handleCancel)
- [Complete] Created 25 comprehensive unit tests (15 new + 10 existing)
- [Complete] Verified build passes with no TypeScript errors
- [Complete] All tests passing (25/25)

## Output

Successfully integrated tool calling event handling into the frontend hook. The `useChatApi` hook now handles all 4 event types from the Chat API and provides confirmation dialog state management.

### Files Modified

1. **[/src/ui/hooks/useChatApi.ts](/src/ui/hooks/useChatApi.ts)** - Frontend hook with tool calling support
   - Added `SSEEvent` interface for type-safe event parsing
   - Added `StreamCallbacks` interface for event handlers
   - Added `PendingConfirmation` interface for confirmation state
   - Updated `readSSEStream()` to accept callbacks and handle 4 event types:
     - `text` - Accumulated text response
     - `tool_result` - Updates staged contacts for find_contacts tool
     - `confirmation_required` - Shows confirmation dialog
     - `tool_error` - Sets error state
   - Added new state: `pendingConfirmation`, `showConfirmDialog`
   - Updated `sendMessage()` signature to accept optional `confirmationData`
   - Added `handleConfirm()` - Re-sends request with `userConfirmed: true`
   - Added `handleCancel()` - Clears confirmation state
   - Updated return value to expose new state and handlers

2. **[/src/ui/hooks/__tests__/useChatApi.test.ts](/src/ui/hooks/__tests__/useChatApi.test.ts)** - Comprehensive unit tests
   - Added 15 new tests for tool calling functionality
   - Total: 25 tests (all passing)
   - Coverage includes:
     - Tool result handling and staged contacts updates
     - Confirmation flow (show → approve → re-send)
     - Confirmation cancel flow
     - Tool error handling
     - Mixed event streams
     - Edge cases (non-array results, multiple errors, etc.)

### Key Implementation Details

**Event Handling Flow:**
```
SSE Event arrives
  ↓
readSSEStream parses event type
  ↓
Callback handler invoked:
  - onText: Accumulates text
  - onToolResult: Updates staged contacts (if find_contacts)
  - onConfirmationRequired: Shows dialog, stores pending action
  - onToolError: Sets error state
  - onError: Sets error state
```

**Confirmation Flow:**
```
User sends dangerous action
  ↓
Chat API sends confirmation_required event
  ↓
Hook sets pendingConfirmation and showConfirmDialog
  ↓
UI shows dialog
  ↓
User clicks Confirm:
  - handleConfirm() re-sends with userConfirmed: true
  - Clears confirmation state

User clicks Cancel:
  - handleCancel() clears state
  - No re-send
```

**Build Status:** ✅ Clean build with no TypeScript errors
**Test Status:** ✅ All 25 tests passing

## Handoff Notes

### For Phase 3 (Integration Testing)

The frontend hook is ready for integration testing. Key integration points:

1. **Confirmation Dialog UI**
   - Use `showConfirmDialog` state to control dialog visibility
   - Display `pendingConfirmation.message` to user
   - Call `handleConfirm()` on approve button
   - Call `handleCancel()` on cancel button

2. **Staged Contacts Updates**
   - `stagedContacts` automatically updates when `find_contacts` tool returns results
   - `stagingQuery` stores the original search query

3. **Error Display**
   - `error` state contains tool errors and stream errors
   - Display using toast or inline error message

4. **Loading State**
   - `isLoading` works as before for all chat operations

### Example Integration

```typescript
const {
  sendMessage,
  stagedContacts,
  error,
  showConfirmDialog,
  pendingConfirmation,
  handleConfirm,
  handleCancel,
} = useChatApi()

// Send message
await sendMessage('Find contacts at Google', AiMode.CONTACT_FINDER)

// Confirmation dialog
{showConfirmDialog && (
  <ConfirmationDialog
    message={pendingConfirmation?.message}
    onConfirm={handleConfirm}
    onCancel={handleCancel}
  />
)}

// Display errors
{error && <Toast message={error} />}

// Display staged contacts
{stagedContacts.length > 0 && <StagedContactsTable contacts={stagedContacts} />}
```

### Testing Recommendations

1. Test find_contacts tool with real search queries
2. Test dangerous actions (delete, bulk update) that require confirmation
3. Verify confirmation approve flow works end-to-end
4. Verify confirmation cancel flow properly aborts action
5. Test error handling with invalid queries or misconfigured tools
6. Test mixed streams (text + tool results in same response)
