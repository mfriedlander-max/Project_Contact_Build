# Task: 001 - Tool Schema Generator

## Assignment
- **Role**: Implementation Agent
- **Files**: /lib/ai/tool-schemas.ts, /lib/ai/__tests__/tool-schemas.test.ts
- **Depends On**: None
- **Blocks**: Task 2 (Chat API)

## Status
🟢 Complete

## Progress Log
- [2026-01-31 Started] Created status doc
- [In Progress] Reading reference files and understanding requirements
- [Complete] Implemented /lib/ai/tool-schemas.ts with getToolsForMode()
- [Complete] Created comprehensive unit tests (18 tests, all passing)
- [Complete] Verified build passes with no TypeScript errors
- [Complete] All acceptance criteria met

## Output

Successfully implemented the Claude tool schema generator that maps all 14 AI action types to Anthropic-compatible tool definitions.

### Files Created
1. **[/lib/ai/tool-schemas.ts](/lib/ai/tool-schemas.ts)** - Tool schema generator
   - Exports `getToolsForMode(mode: AiModeType): Tool[]` function
   - Maps all 14 action types to Claude tool format
   - Filters tools by mode using `ACTION_MODE_REQUIREMENTS`
   - Uses `zodToJsonSchema` to convert Zod schemas to JSON Schema
   - Includes detailed descriptions for each tool

2. **[/lib/ai/__tests__/tool-schemas.test.ts](/lib/ai/__tests__/tool-schemas.test.ts)** - Unit tests
   - 18 tests covering all modes and requirements
   - 100% code coverage of getToolsForMode()
   - Tests for CONTACT_FINDER, GENERAL_MANAGER, and ASSISTANT modes
   - Validates tool schema structure and filtering logic

### Key Implementation Details

**Tool Count by Mode:**
- CONTACT_FINDER: 4 tools (find_contacts, show_staged_results, delete_staged_row, approve_staged_list)
- GENERAL_MANAGER: 3 tools (show_staged_results, query_contacts, create_saved_view)
- ASSISTANT: 12 tools (all except find_contacts and show_staged_results)

**Tool Definition Format:**
```typescript
{
  name: string           // snake_case (e.g., "find_contacts")
  description: string    // Detailed description for Claude
  input_schema: {        // JSON Schema from Zod
    type: "object"
    properties: { ... }
    required: [...]
  }
}
```

**All Tests Passing:** ✅
- Mode filtering works correctly
- Tool schemas match Zod validation schemas
- All required fields present
- 100% coverage

**Build Status:** ✅ Clean build with no TypeScript errors

## Handoff Notes

### For Task 2 (Chat API Integration)

The tool schema generator is ready for use. Import and use it like this:

```typescript
import { getToolsForMode } from '@/lib/ai/tool-schemas'
import { AiMode } from '@/lib/types/enums'

// In your chat API route
const tools = getToolsForMode(AiMode.CONTACT_FINDER)

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  messages: [...],
  tools, // Pass tools here
})
```

**Important Notes:**
1. Tool names use snake_case (e.g., `find_contacts`)
2. Each mode gets a filtered set of tools based on `ACTION_MODE_REQUIREMENTS`
3. The `input_schema` is JSON Schema compatible with Claude's tool calling API
4. Tool descriptions are detailed to help Claude understand when to use each tool

**Next Steps for Chat API:**
1. Import `getToolsForMode()` in `/app/api/ai/chat/route.ts`
2. Pass the tools to `client.messages.stream()`
3. Handle `tool_use` blocks in the stream
4. Execute actions via the action executor
5. Return tool results back to Claude
