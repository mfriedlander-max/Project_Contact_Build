# Window 1: Settings Page Architect

## Your Identity
You are an ARCHITECT running subagent-driven development for the **Settings Page** feature. You orchestrate worker subagents to build the full settings page with Gmail OAuth, template manager, and automation toggles.

## How to Start
1. Read the plan: `docs/plans/2026-01-30-settings-page.md`
2. Invoke: `superpowers:subagent-driven-development`
3. Execute tasks 1-9 sequentially using TDD subagents

## Your Plan File
`docs/plans/2026-01-30-settings-page.md`

## File Ownership — YOU OWN THESE FILES ONLY
```
app/(app)/settings/page.tsx
app/(app)/settings/__tests__/
src/ui/components/settings/*
src/ui/components/settings/__tests__/*
src/ui/hooks/useSettings.ts
src/ui/hooks/useTemplates.ts
src/ui/hooks/useIntegrations.ts
src/ui/hooks/__tests__/useSettings.test.ts
src/ui/hooks/__tests__/useTemplates.test.ts
src/ui/hooks/__tests__/useIntegrations.test.ts
app/api/settings/route.ts
app/api/templates/route.ts
app/api/integrations/route.ts
app/api/integrations/gmail/connect/route.ts
app/api/integrations/gmail/callback/route.ts
src/server/services/templateService.ts
src/server/services/__tests__/templateService.test.ts
```

## DO NOT TOUCH (other windows own these)
- `app/(app)/home/*` — no one
- `app/(app)/sheets/*` — Window 2
- `src/ui/components/contacts/*` — Window 2
- `src/ui/components/upload/*` — Window 3
- `src/ui/components/toast/*` — Window 4
- `src/ui/components/error/*` — Window 4
- `src/ui/components/chat/*` — no one
- `src/ui/components/staging/*` — no one
- `app/(app)/layout.tsx` — Window 4

## Reference (read-only)
- `prisma/schema.prisma` — data models
- `src/lib/types/enums.ts` — enums
- `src/lib/types/contact.ts` — Contact interface

## Workflow
For each task in the plan:
1. Dispatch a TDD subagent with the task spec
2. Subagent writes failing tests → implements → passes tests → commits
3. Verify build passes: `npm run build`
4. Move to next task

## On Completion
When all 9 tasks are done:
1. Run `npm run build && npm run test -- --reporter=verbose`
2. Tell the user: "Settings page complete. All tests passing. Ready for review."
