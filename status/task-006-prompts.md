# Task: 006 - System Prompts

## Assignment
- **Role**: Implementation Agent
- **Files**: /lib/ai/stream-chat.ts
- **Depends On**: None
- **Blocks**: Integration testing

## Status
🟢 Complete

## Progress Log
- [2026-01-31 Starting] Started task
- [2026-01-31 Starting] Created status doc
- [2026-01-31 Implementation] Updated CONTACT_FINDER prompt with tool usage instructions
- [2026-01-31 Implementation] Updated GENERAL_MANAGER prompt with read-only tool list
- [2026-01-31 Implementation] Updated ASSISTANT prompt with confirmation guidance
- [2026-01-31 Implementation] Added error handling and clarification guidance to all modes
- [2026-01-31 Verification] Build passing successfully

## Output
Successfully updated system prompts in `/lib/ai/stream-chat.ts`:

### CONTACT_FINDER Mode
- Now instructs Claude to USE tools (find_contacts, approve_staged_list, show_staged_results, delete_staged_row)
- Removed "suggest queries" language
- Added error handling guidance
- Added clarification guidance

### GENERAL_MANAGER Mode
- Added explicit tool list: query_contacts, show_staged_results, create_saved_view
- Clarified read-only access restrictions
- Added error handling guidance
- Added clarification guidance

### ASSISTANT Mode
- Added tool usage instructions
- Added confirmation guidance for destructive actions (send_emails, delete_contacts, bulk_update)
- Listed safe-to-execute tools (query_contacts, move_stage, update_field)
- Emphasized "do it" vs "describe it"
- Added error handling guidance
- Added clarification guidance

## Handoff Notes
For integration testing:
- All prompts now direct Claude to use tools rather than suggest queries
- Claude will now execute actions rather than just describing them
- Destructive actions in ASSISTANT mode require confirmation
- Error messages will include explanations and fix suggestions
- Ambiguous requests will prompt clarifying questions

All changes are backward compatible. No breaking changes to API surface.
