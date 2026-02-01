# Frontend Hook Implementation - Task 4

## Your Role
You are an Implementation Agent working on the frontend hook for Claude tool calling integration.

## Task Assignment
- **Task ID**: 004
- **Role**: Implementation Agent
- **Files Owned**: `/src/ui/hooks/useChatApi.ts`, related tests
- **Depends On**: Task 2 ✅ (Chat API completed)
- **Blocks**: Phase 3 integration testing

## Background

Agent A (Task 2) just completed the Chat API tool calling integration. The chat API now streams **4 event types** when Claude uses tools:

1. **`tool_result`** - Action succeeded
2. **`confirmation_required`** - User must confirm dangerous action
3. **`tool_error`** - Action failed
4. **`text`** - Regular Claude text (unchanged)

**Your job**: Update `useChatApi` hook to handle these new event types.

## Requirements

### Event Handling

The hook must parse SSE events and handle all 4 types:

**1. `tool_result` Events**
```json
{
  "type": "tool_result",
  "tool": "find_contacts",
  "result": [/* staged contacts */]
}
```
- Update staged contacts state from result
- Append confirmation message to chat: "✓ Found 5 contacts"

**2. `confirmation_required` Events**
```json
{
  "type": "confirmation_required",
  "message": "Delete 2 contacts? This cannot be undone.",
  "actionType": "DELETE_CONTACTS",
  "payload": { "contactIds": ["1", "2"] }
}
```
- Show confirmation dialog to user
- Store pending action (actionType + payload)
- On approval: Re-send request with `userConfirmed: true`
- On cancel: Append "Action cancelled" to chat

**3. `tool_error` Events**
```json
{
  "type": "tool_error",
  "tool": "find_contacts",
  "error": "Search provider not configured"
}
```
- Display error toast
- Append error to chat with retry suggestion

**4. `text` Events** (unchanged)
```json
{
  "type": "text",
  "text": "I'll find those contacts for you."
}
```
- Continue appending to chat as before

### State Management

Add new state to the hook:

```typescript
// Existing state
const [messages, setMessages] = useState<ChatMessage[]>([])
const [isLoading, setIsLoading] = useState(false)
const [stagedContacts, setStagedContacts] = useState<StagedContact[]>([])

// New state needed
const [pendingConfirmation, setPendingConfirmation] = useState<{
  actionType: string
  payload: unknown
  message: string
} | null>(null)

const [showConfirmDialog, setShowConfirmDialog] = useState(false)
```

### Confirmation Flow

When `confirmation_required` event arrives:

1. Store action in `pendingConfirmation` state
2. Show confirmation dialog (`setShowConfirmDialog(true)`)
3. Dialog has 2 buttons:
   - **Confirm**: Call `handleConfirm()` → re-send with `userConfirmed: true`
   - **Cancel**: Call `handleCancel()` → clear state, append "Action cancelled"

**Example confirmation handler:**
```typescript
const handleConfirm = async () => {
  if (!pendingConfirmation) return

  setShowConfirmDialog(false)

  // Re-send last message with confirmation
  await sendMessage(lastMessage, {
    userConfirmed: true,
    actionType: pendingConfirmation.actionType,
    payload: pendingConfirmation.payload
  })

  setPendingConfirmation(null)
}
```

### API Changes

Update the `sendMessage` function signature:

```typescript
// Before
const sendMessage = async (message: string) => { ... }

// After
const sendMessage = async (
  message: string,
  confirmationData?: {
    userConfirmed: boolean
    actionType: string
    payload: unknown
  }
) => {
  const body = {
    message,
    mode,
    history,
    ...confirmationData  // Spread confirmation fields if present
  }

  // ... rest of POST to /api/ai/chat
}
```

## Acceptance Criteria

- [ ] Hook handles all 4 event types (`text`, `tool_result`, `confirmation_required`, `tool_error`)
- [ ] Staged contacts update from `tool_result` events
- [ ] Confirmation dialog shown for `confirmation_required` events
- [ ] Re-send with `userConfirmed: true` on approval
- [ ] Error toasts shown for `tool_error` events
- [ ] Unit tests for all event types (aim for 15+ tests)
- [ ] Build passes with no TypeScript errors
- [ ] All existing chat functionality still works

## Testing Requirements

Create comprehensive tests:

1. **Tool result handling** - Verify staged contacts update
2. **Confirmation flow** - Show dialog, approve, re-send
3. **Confirmation cancel** - Clear state, append message
4. **Error handling** - Toast shown, error in chat
5. **Mixed events** - Handle text + tool results in same stream
6. **Existing behavior** - Chat still works without tools

## Status Doc

Update your progress in: `/status/task-004-frontend-hook.md`

Use this format:
```markdown
# Task: 004 - Frontend Hook

## Status
🟡 In Progress

## Progress Log
- [Time] Started task, read Task 2 handoff notes
- [Time] Updated event handling in useChatApi
- [Time] Added confirmation dialog state
- [Time] Implemented re-send with userConfirmed
- [Time] Created unit tests
- [Time] Verified build passes

## Output
[Summary of changes]

## Handoff Notes for Phase 3
[What integration testing needs to verify]
```

## When Complete

1. Update status doc to 🟢 Complete
2. Commit changes: `feat(task-004): frontend tool calling hook`
3. Notify user: "✅ Task 004 complete. Frontend hook ready. Status doc updated."

## When Blocked

1. Update status doc to 🔴 Blocked
2. Describe the issue clearly
3. Notify user immediately
4. STOP and wait for architect guidance

## File Ownership Reminder

**You OWN:**
- `/src/ui/hooks/useChatApi.ts`
- `/src/ui/hooks/__tests__/useChatApi.test.ts`

**You DO NOT TOUCH:**
- `/app/api/ai/chat/` (Agent A's domain)
- `/src/server/services/` (Agent B's domain)
- `/lib/ai/tool-schemas.ts` (Agent A's domain)

## Reference

**Task 2 Handoff Notes**: [/status/task-002-chat-api.md](/status/task-002-chat-api.md)

**Key Integration Points**:
- Chat API streams 4 event types via SSE
- Tool names use snake_case (e.g., `find_contacts`)
- Dangerous actions require `userConfirmed: true` in request body

## Questions?

If anything is unclear, escalate immediately. Don't guess.

---

**Ready to start? Read the Task 2 status doc, then begin implementation.**
