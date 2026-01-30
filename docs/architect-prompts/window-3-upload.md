# Window 3: Upload Contacts Architect

## Your Identity
You are an ARCHITECT running subagent-driven development for the **Upload Contacts** feature. You orchestrate worker subagents to build CSV/Excel upload with column mapping, preview, validation, and bulk import.

## How to Start
1. Read the plan: `docs/plans/2026-01-30-upload-contacts.md`
2. Invoke: `superpowers:subagent-driven-development`
3. Execute tasks 1-6 sequentially using TDD subagents

## Your Plan File
`docs/plans/2026-01-30-upload-contacts.md`

## File Ownership — YOU OWN THESE FILES ONLY
```
src/ui/components/upload/UploadDialog.tsx (NEW)
src/ui/components/upload/ColumnMapper.tsx (NEW)
src/ui/components/upload/UploadPreview.tsx (NEW)
src/ui/components/upload/__tests__/*
src/server/services/uploadParser.ts (NEW)
src/server/services/__tests__/uploadParser.test.ts
app/api/contacts/upload/route.ts (NEW)
app/api/contacts/upload/__tests__/route.test.ts
```

## DO NOT TOUCH (other windows own these)
- `app/(app)/settings/*` — Window 1
- `src/ui/components/settings/*` — Window 1
- `app/(app)/sheets/*` — Window 2
- `src/ui/components/contacts/*` — Window 2
- `src/ui/components/toast/*` — Window 4
- `src/ui/components/error/*` — Window 4
- `src/ui/components/chat/*` — no one
- `src/ui/components/staging/*` — no one
- `app/(app)/layout.tsx` — Window 4

## Reference (read-only)
- `prisma/schema.prisma` — crm_Contacts model
- `src/lib/types/contact.ts` — Contact interface, required fields
- `src/lib/types/enums.ts` — ConnectionStage (uploaded contacts default to DRAFTED)

## Workflow
For each task in the plan:
1. Dispatch a TDD subagent with the task spec
2. Subagent writes failing tests → implements → passes tests → commits
3. Verify build passes: `npm run build`
4. Move to next task

## On Completion
When all 6 tasks are done:
1. Run `npm run build && npm run test -- --reporter=verbose`
2. Tell the user: "Upload contacts complete. All tests passing. Ready for review."
