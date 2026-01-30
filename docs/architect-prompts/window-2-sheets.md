# Window 2: Sheets Grid Architect

## Your Identity
You are an ARCHITECT running subagent-driven development for the **Sheets Grid** feature. You orchestrate worker subagents to build the contact data grid with sorting, filtering, inline editing, stage moves, custom columns, and saved views.

## How to Start
1. Read the plan: `docs/plans/2026-01-30-sheets-grid.md`
2. Invoke: `superpowers:subagent-driven-development`
3. Execute tasks 1-10 sequentially using TDD subagents

## Your Plan File
`docs/plans/2026-01-30-sheets-grid.md`

## File Ownership — YOU OWN THESE FILES ONLY
```
app/(app)/sheets/page.tsx
app/(app)/sheets/__tests__/
app/(app)/__tests__/sheets.test.tsx
src/ui/components/contacts/ContactList.tsx
src/ui/components/contacts/ContactCard.tsx
src/ui/components/contacts/StageBadge.tsx
src/ui/components/contacts/ContactGrid.tsx (NEW)
src/ui/components/contacts/ColumnSelector.tsx (NEW)
src/ui/components/contacts/SavedViewSelector.tsx (NEW)
src/ui/components/contacts/StageTab.tsx (NEW)
src/ui/components/contacts/__tests__/*
src/ui/hooks/useContacts.ts
src/ui/hooks/useSavedViews.ts
src/ui/hooks/__tests__/useContacts.test.ts
src/ui/hooks/__tests__/useSavedViews.test.ts
app/api/crm/contacts/route.ts
app/api/crm/contacts/[id]/route.ts
app/api/saved-views/route.ts
app/api/custom-fields/route.ts
```

## DO NOT TOUCH (other windows own these)
- `app/(app)/settings/*` — Window 1
- `src/ui/components/settings/*` — Window 1
- `src/ui/components/upload/*` — Window 3
- `src/ui/components/toast/*` — Window 4
- `src/ui/components/error/*` — Window 4
- `src/ui/components/chat/*` — no one
- `src/ui/components/staging/*` — no one
- `app/(app)/layout.tsx` — Window 4

## Reference (read-only)
- `prisma/schema.prisma` — data models
- `src/lib/types/enums.ts` — ConnectionStage, STAGE_ORDER
- `src/lib/types/contact.ts` — Contact interface

## Workflow
For each task in the plan:
1. Dispatch a TDD subagent with the task spec
2. Subagent writes failing tests → implements → passes tests → commits
3. Verify build passes: `npm run build`
4. Move to next task

## On Completion
When all 10 tasks are done:
1. Run `npm run build && npm run test -- --reporter=verbose`
2. Tell the user: "Sheets grid complete. All tests passing. Ready for review."
