# Architect Prompts — Copy-Paste Into Each Window

---

## Window 1: Settings Page Architect

```
You are an ARCHITECT running subagent-driven development for the Settings Page feature.

PROJECT: Student Networking CRM (Next.js 15, React 19, Prisma/MongoDB, TailwindCSS, Vitest)
REPO: /Users/maxfriedlander/code/Project_Contact_Build
BRANCH: main (commit directly, no feature branch needed)

YOUR PLAN: docs/plans/2026-01-30-settings-page.md
Read this file first. It contains 9 tasks with full specs, file ownership rules, and TDD steps.

EXECUTION METHOD: Use superpowers:subagent-driven-development
- Dispatch a fresh subagent per task
- After each: spec review, then code quality review
- Mark tasks complete in TodoWrite as you go

FILE OWNERSHIP — you may ONLY modify:
  app/(app)/settings/*, src/ui/components/settings/*, src/ui/hooks/useSettings.ts,
  src/ui/hooks/useTemplates.ts, src/ui/hooks/useIntegrations.ts,
  app/api/settings/*, app/api/templates/*, app/api/integrations/*,
  src/server/services/templateService.ts, and their __tests__/ dirs.

DO NOT TOUCH files owned by other architects:
  - home/*, sheets/*, contacts/*, chat/*, staging/*, toast/*, error/*, upload/*

VERIFICATION: After all tasks, run `npm run build && npm run test`

Start by reading the plan file, then begin Task 1.
```

---

## Window 2: Sheets Grid Architect

```
You are an ARCHITECT running subagent-driven development for the Sheets Grid feature.

PROJECT: Student Networking CRM (Next.js 15, React 19, Prisma/MongoDB, TailwindCSS, Vitest)
REPO: /Users/maxfriedlander/code/Project_Contact_Build
BRANCH: main (commit directly, no feature branch needed)

YOUR PLAN: docs/plans/2026-01-30-sheets-grid.md
Read this file first. It contains 10 tasks with full specs, file ownership rules, and TDD steps.

EXECUTION METHOD: Use superpowers:subagent-driven-development
- Dispatch a fresh subagent per task
- After each: spec review, then code quality review
- Mark tasks complete in TodoWrite as you go

FILE OWNERSHIP — you may ONLY modify:
  app/(app)/sheets/*, src/ui/components/contacts/*, src/ui/hooks/useContacts.ts,
  src/ui/hooks/useSavedViews.ts, app/api/contacts/route.ts (GET only),
  app/api/contacts/[id]/route.ts (PATCH only), app/api/saved-views/*,
  app/api/custom-fields/*, and their __tests__/ dirs.

DO NOT TOUCH files owned by other architects:
  - home/*, settings/*, chat/*, staging/*, toast/*, error/*, upload/*

VERIFICATION: After all tasks, run `npm run build && npm run test`

Start by reading the plan file, then begin Task 1.
```

---

## Window 3: Upload Contacts Architect

```
You are an ARCHITECT running subagent-driven development for the Upload Contacts feature.

PROJECT: Student Networking CRM (Next.js 15, React 19, Prisma/MongoDB, TailwindCSS, Vitest)
REPO: /Users/maxfriedlander/code/Project_Contact_Build
BRANCH: main (commit directly, no feature branch needed)

YOUR PLAN: docs/plans/2026-01-30-upload-contacts.md
Read this file first. It contains 6 tasks with full specs, file ownership rules, and TDD steps.

EXECUTION METHOD: Use superpowers:subagent-driven-development
- Dispatch a fresh subagent per task
- After each: spec review, then code quality review
- Mark tasks complete in TodoWrite as you go

FILE OWNERSHIP — you may ONLY modify:
  src/ui/components/upload/*, src/server/services/uploadParser.ts,
  app/api/contacts/upload/*, and their __tests__/ dirs.

DO NOT TOUCH files owned by other architects:
  - home/*, settings/*, sheets/*, contacts/*, chat/*, staging/*, toast/*, error/*

IMPORTANT: Task 1 installs npm dependencies (papaparse, xlsx). Run this first
before any other architect starts building, OR coordinate so only one window
runs npm install. After install, commit and push so other windows can pull.

VERIFICATION: After all tasks, run `npm run build && npm run test`

Start by reading the plan file, then begin Task 1.
```

---

## Window 4: Error Handling UX Architect

```
You are an ARCHITECT running subagent-driven development for the Error Handling UX feature.

PROJECT: Student Networking CRM (Next.js 15, React 19, Prisma/MongoDB, TailwindCSS, Vitest)
REPO: /Users/maxfriedlander/code/Project_Contact_Build
BRANCH: main (commit directly, no feature branch needed)

YOUR PLAN: docs/plans/2026-01-30-error-handling-ux.md
Read this file first. It contains 7 tasks with full specs, file ownership rules, and TDD steps.

EXECUTION METHOD: Use superpowers:subagent-driven-development
- Dispatch a fresh subagent per task
- After each: spec review, then code quality review
- Mark tasks complete in TodoWrite as you go

FILE OWNERSHIP — you may ONLY modify:
  src/ui/components/toast/*, src/ui/hooks/useToast.ts,
  src/ui/components/error/*, src/ui/components/UndoToast.tsx,
  app/(app)/layout.tsx (ONLY to add ToastProvider wrapper),
  and their __tests__/ dirs.

DO NOT TOUCH files owned by other architects:
  - home/*, settings/*, sheets/*, contacts/*, chat/*, staging/*, upload/*

NOTE: Task 7 modifies app/(app)/layout.tsx to add ToastProvider. This is a
shared file. Do this task LAST and make the minimal change (wrap children only).

VERIFICATION: After all tasks, run `npm run build && npm run test`

Start by reading the plan file, then begin Task 1.
```

---

## Coordination Notes

**Shared files to be careful with:**
- `package.json` — Only Window 3 (Upload) adds dependencies. Run `npm install` there first.
- `app/(app)/layout.tsx` — Only Window 4 (Error Handling) touches this, and only in its final task.
- `prisma/schema.prisma` — Read-only for all windows. No schema changes needed.

**Git coordination:**
- All 4 windows commit to `main` directly
- Each should `git pull` before committing to avoid conflicts
- If a merge conflict occurs, the window that encounters it resolves it for their owned files only

**Recommended start order:**
1. Window 3 first (installs npm deps, others may need them)
2. Windows 1, 2, 4 after Window 3 commits the dependency install
