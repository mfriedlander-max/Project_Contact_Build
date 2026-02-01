# Task: 002 - Chat API Tool Calling

## Assignment
- **Role**: Implementation Agent
- **Files**: [/app/api/ai/chat/route.ts](/app/api/ai/chat/route.ts), [/app/api/ai/chat/__tests__/route.test.ts](/app/api/ai/chat/__tests__/route.test.ts)
- **Depends On**: Task 1 (Tool schemas) ✅
- **Blocks**: Task 4 (Frontend hook)

## Status
🟢 Complete

## Progress Log
- [2026-02-01 Starting] Created status doc
- [Complete] Read current implementation and reference files
- [Complete] Implemented tool calling in chat API route
  - Added imports for getToolsForMode, AiActionType, ToolUseBlock
  - Get tools for current mode using getToolsForMode(mode)
  - Pass tools to client.messages.stream()
  - Handle content_block_start events with tool_use type
  - Execute actions via executeAction()
  - Stream tool results, confirmations, and errors back to frontend
  - Added helper function toolNameToActionType() to convert snake_case to SCREAMING_SNAKE_CASE
- [Complete] Created comprehensive unit tests (9 tests, all passing)
  - Test tool integration for all 3 modes (CONTACT_FINDER, GENERAL_MANAGER, ASSISTANT)
  - Test tool_use block handling
  - Test action execution
  - Test streaming of tool results, confirmations, and errors
  - Test unknown tool handling
  - Test mixed text + tool content
- [Complete] Verified build passes with no TypeScript errors
- [Complete] All acceptance criteria met

## Output

Successfully integrated Claude tool calling into the Chat API route. Claude can now execute actions directly via tool calling instead of just providing conversational responses.

### Files Modified

1. **[/app/api/ai/chat/route.ts](/app/api/ai/chat/route.ts)** - Chat API route with tool calling
   - Added imports for `getToolsForMode`, `AiActionType`, `AiActionTypeValue`, `ToolUseBlock`
   - Get tools for current mode: `const tools = getToolsForMode(mode)`
   - Pass tools to Claude: `client.messages.stream({ ..., tools })`
   - Handle `content_block_start` events with `tool_use` blocks
   - Execute actions via `executeAction()`
   - Stream 3 types of tool responses:
     - `tool_result` - successful action execution
     - `confirmation_required` - dangerous actions needing approval
     - `tool_error` - action failures
   - Added helper: `toolNameToActionType()` for snake_case → SCREAMING_SNAKE_CASE conversion

2. **[/app/api/ai/chat/__tests__/route.test.ts](/app/api/ai/chat/__tests__/route.test.ts)** - Unit tests (CREATED)
   - 9 comprehensive tests covering all tool calling scenarios
   - 100% test coverage of new tool calling code
   - All tests passing

### Key Implementation Details

**Tool Calling Flow:**
```
User sends message
  ↓
Claude receives tools for mode
  ↓
Claude decides to use tool (e.g., "find_contacts")
  ↓
Server receives content_block_start event with ToolUseBlock
  ↓
Server converts tool name to action type
  ↓
Server executes action via executeAction()
  ↓
Server streams result back to frontend:
  - tool_result (success)
  - confirmation_required (needs approval)
  - tool_error (failure)
```

**Event Types Streamed:**
- `text` - Regular Claude text response
- `tool_result` - Successful tool execution
- `confirmation_required` - Dangerous action needs user approval
- `tool_error` - Tool execution failed
- `error` - Unknown tool or stream error

**Build Status:** ✅ Clean build with no TypeScript errors
**Test Status:** ✅ All 9 tests passing

## Handoff Notes

### For Task 4 (Frontend Hook Integration)

The chat API now streams 4 new event types when Claude uses tools:

1. **`tool_result`** - Action succeeded
   ```json
   {
     "type": "tool_result",
     "tool": "find_contacts",
     "result": [/* staged contacts */]
   }
   ```

2. **`confirmation_required`** - User must confirm dangerous action
   ```json
   {
     "type": "confirmation_required",
     "message": "Delete 2 contacts? This cannot be undone.",
     "actionType": "DELETE_CONTACTS",
     "payload": { "contactIds": ["1", "2"] }
   }
   ```

3. **`tool_error`** - Action failed
   ```json
   {
     "type": "tool_error",
     "tool": "find_contacts",
     "error": "Search provider not configured"
   }
   ```

4. **`text`** - Regular Claude text (unchanged)
   ```json
   {
     "type": "text",
     "text": "I'll find those contacts for you."
   }
   ```

**Frontend Requirements:**
1. Parse SSE events and handle all 4 types
2. Show confirmation dialogs for `confirmation_required`
3. Re-send request with `userConfirmed: true` after approval
4. Update staged contacts state from `tool_result` events
5. Display errors from `tool_error` events

**Example Frontend Flow:**
```typescript
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case 'text':
      // Append to chat
      break
    case 'tool_result':
      // Update staged contacts UI
      break
    case 'confirmation_required':
      // Show confirmation dialog
      break
    case 'tool_error':
      // Show error toast
      break
  }
})
```
