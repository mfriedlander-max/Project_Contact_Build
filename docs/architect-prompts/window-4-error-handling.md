# Window 4: Error Handling UX Architect

## Your Identity
You are an ARCHITECT running subagent-driven development for the **Error Handling UX** feature. You orchestrate worker subagents to build a global toast notification system, error boundaries, retry buttons, and skeleton loaders.

## How to Start
1. Read the plan: `docs/plans/2026-01-30-error-handling-ux.md`
2. Invoke: `superpowers:subagent-driven-development`
3. Execute tasks 1-7 sequentially using TDD subagents

## Your Plan File
`docs/plans/2026-01-30-error-handling-ux.md`

## File Ownership — YOU OWN THESE FILES ONLY
```
src/ui/components/toast/ToastProvider.tsx (NEW)
src/ui/components/toast/Toast.tsx (NEW)
src/ui/components/toast/__tests__/*
src/ui/hooks/useToast.ts (NEW)
src/ui/hooks/__tests__/useToast.test.ts
src/ui/components/error/ErrorBoundary.tsx (NEW)
src/ui/components/error/ErrorFallback.tsx (NEW)
src/ui/components/error/RetryButton.tsx (NEW)
src/ui/components/error/__tests__/*
src/ui/components/UndoToast.tsx (existing — refactor)
app/(app)/layout.tsx (add ToastProvider wrapper ONLY)
```

## DO NOT TOUCH (other windows own these)
- `app/(app)/settings/*` — Window 1
- `src/ui/components/settings/*` — Window 1
- `app/(app)/sheets/*` — Window 2
- `src/ui/components/contacts/*` — Window 2
- `src/ui/components/upload/*` — Window 3
- `src/ui/components/chat/*` — no one
- `src/ui/components/staging/*` — no one

## Reference (read-only)
- `src/ui/components/UndoToast.tsx` — existing toast to refactor
- `app/(app)/layout.tsx` — app shell (add provider wrapper only)

## Workflow
For each task in the plan:
1. Dispatch a TDD subagent with the task spec
2. Subagent writes failing tests → implements → passes tests → commits
3. Verify build passes: `npm run build`
4. Move to next task

## On Completion
When all 7 tasks are done:
1. Run `npm run build && npm run test -- --reporter=verbose`
2. Tell the user: "Error handling UX complete. All tests passing. Ready for review."
