# Settings Page Implementation Plan

> **For Claude:** You are an ARCHITECT running subagent-driven development. Use `superpowers:subagent-driven-development` to execute this plan task-by-task.

**Goal:** Build the full Settings page with Gmail OAuth connect UI, template manager, and availability text block.

**Architecture:** Settings page already has skeleton sections (IntegrationsSection, TemplatesSection, AutomationSection). This plan fills them out with real functionality: form inputs, OAuth flows, template CRUD, and automation toggles.

**Tech Stack:** Next.js 15, React 19, TailwindCSS, Prisma/MongoDB, NextAuth, Zod

---

## File Ownership (DO NOT touch files outside this list)

```
OWNED FILES:
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

DO NOT TOUCH:
  app/(app)/home/*
  app/(app)/sheets/*
  src/ui/components/chat/*
  src/ui/components/staging/*
  src/ui/components/contacts/*
  src/ui/components/toast/*
  src/ui/components/error/*
  src/ui/components/upload/*
  src/server/actions/*
  src/server/integrations/*
```

## Reference Files (read-only, do not modify)

- `prisma/schema.prisma` — Settings, Template, IntegrationConnection models
- `src/lib/types/enums.ts` — IntegrationProvider enum
- `src/lib/types/contact.ts` — Contact interface (for template placeholders)

---

## Task 1: Settings API Route — GET & PATCH

**Files:**
- Modify: `app/api/settings/route.ts`
- Test: `app/api/settings/__tests__/route.test.ts`

**What to build:**
- GET: Return user settings (authenticated via NextAuth session)
- PATCH: Update settings fields (Zod validated)
- Fields: `availabilityBlock` (string), `autoRunEmailFinding` (bool), `autoRunInserts` (bool), `autoRunDrafts` (bool), `didntConnectEnabled` (bool), `didntConnectDays` (int), `defaultTemplateId` (string|null)

**Step 1:** Write failing tests for GET (unauthenticated → 401, authenticated → returns settings) and PATCH (validates input, updates, returns updated)

**Step 2:** Run tests, verify they fail

**Step 3:** Implement the route handlers using Prisma `Settings` model with `upsert` for PATCH

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: settings API GET and PATCH routes`

---

## Task 2: Templates API Route — CRUD

**Files:**
- Modify: `app/api/templates/route.ts`
- Test: `app/api/templates/__tests__/route.test.ts`

**What to build:**
- GET: List all templates for user
- POST: Create template (name, subjectVariants[], body, isDefault)
- PATCH: Update template by ID
- DELETE: Delete template by ID

**Step 1:** Write failing tests for each CRUD operation

**Step 2:** Run tests, verify they fail

**Step 3:** Implement using Prisma `Template` model. When setting `isDefault=true`, unset previous default.

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: templates CRUD API routes`

---

## Task 3: useSettings Hook Enhancement

**Files:**
- Modify: `src/ui/hooks/useSettings.ts`
- Test: `src/ui/hooks/__tests__/useSettings.test.ts`

**What to build:**
- `useSettings()` hook that fetches from `/api/settings` on mount
- Returns: `{ settings, updateSettings, isLoading, error }`
- `updateSettings(partial)` calls PATCH and optimistically updates local state

**Step 1:** Write failing tests with fetch mocks

**Step 2:** Run tests, verify they fail

**Step 3:** Implement hook with `useState` + `useEffect` + `fetch`

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: useSettings hook with optimistic updates`

---

## Task 4: useTemplates Hook Enhancement

**Files:**
- Modify: `src/ui/hooks/useTemplates.ts`
- Test: `src/ui/hooks/__tests__/useTemplates.test.ts`

**What to build:**
- `useTemplates()` hook that fetches from `/api/templates` on mount
- Returns: `{ templates, createTemplate, updateTemplate, deleteTemplate, isLoading, error }`

**Step 1:** Write failing tests

**Step 2:** Run tests, verify they fail

**Step 3:** Implement hook

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: useTemplates hook with CRUD operations`

---

## Task 5: IntegrationsSection UI — Hunter API Key

**Files:**
- Modify: `src/ui/components/settings/IntegrationsSection.tsx`
- Test: `src/ui/components/settings/__tests__/IntegrationsSection.test.tsx`

**What to build:**
- Input field for Hunter API key (masked, with show/hide toggle)
- Save button that calls `/api/integrations` to store key
- Status indicator: connected (green) / not connected (gray)
- Test key button that calls Hunter API to verify

**Step 1:** Write failing render tests (input exists, save button exists, status indicator)

**Step 2:** Run tests, verify they fail

**Step 3:** Implement component using `useIntegrations` hook

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: Hunter API key integration UI`

---

## Task 6: IntegrationsSection UI — Gmail OAuth

**Files:**
- Modify: `src/ui/components/settings/IntegrationsSection.tsx`
- Modify: `app/api/integrations/gmail/connect/route.ts`
- Test: `src/ui/components/settings/__tests__/IntegrationsSection.test.tsx`

**What to build:**
- "Connect Gmail" button that initiates OAuth flow
- Connected state shows email address and "Disconnect" button
- OAuth flow: button → `/api/integrations/gmail/connect` → Google consent → `/api/integrations/gmail/callback` → redirect back to settings

**Step 1:** Write tests for both states (connected vs not connected)

**Step 2:** Run tests, verify they fail

**Step 3:** Implement OAuth initiation and connected state display

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: Gmail OAuth connect UI`

---

## Task 7: TemplatesSection UI

**Files:**
- Modify: `src/ui/components/settings/TemplatesSection.tsx`
- Test: `src/ui/components/settings/__tests__/TemplatesSection.test.tsx`

**What to build:**
- List of templates with name, subject preview, "Set Default" button
- Create template form: name input, subject variants (add/remove), body textarea
- Placeholder chips: `{{first_name}}`, `{{company}}`, `{{personalized_insert}}`, `{{availability}}`
- Edit/delete buttons per template
- "Default" badge on current default template

**Step 1:** Write tests: renders template list, create form works, placeholder chips render

**Step 2:** Run tests, verify they fail

**Step 3:** Implement component using `useTemplates` hook

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: template manager UI with placeholder chips`

---

## Task 8: AutomationSection UI — Availability Block + Toggles

**Files:**
- Modify: `src/ui/components/settings/AutomationSection.tsx`
- Test: `src/ui/components/settings/__tests__/AutomationSection.test.tsx`

**What to build:**
- Availability text block: textarea for free-text availability (e.g., "Free Tuesday and Thursday afternoons")
- Auto-run toggles: Email Finding, Inserts, Drafts (each a checkbox/switch)
- "Didn't Connect" rule: enable toggle + days input (default 14)
- All persist via `useSettings` hook

**Step 1:** Write tests: textarea renders, toggles render, values persist

**Step 2:** Run tests, verify they fail

**Step 3:** Implement component

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: automation settings with availability block`

---

## Task 9: Settings Page Assembly + Integration Test

**Files:**
- Modify: `app/(app)/settings/page.tsx`
- Test: `app/(app)/settings/__tests__/settings.test.tsx`

**What to build:**
- Wire all three sections into the page
- Tab navigation between sections (Integrations | Templates | Automation)
- Loading states for each section
- Error boundaries per section

**Step 1:** Write integration test: page renders all 3 tabs, switching works

**Step 2:** Run tests, verify they fail

**Step 3:** Implement tabbed layout

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: settings page with tabbed sections`

---

## Verification

After all tasks:
```bash
npm run build
npm run test -- --reporter=verbose
```

All tests must pass. Build must succeed.
