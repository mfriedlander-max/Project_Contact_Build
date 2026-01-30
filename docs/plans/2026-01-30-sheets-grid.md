# Sheets Grid Implementation Plan

> **For Claude:** You are an ARCHITECT running subagent-driven development. Use `superpowers:subagent-driven-development` to execute this plan task-by-task.

**Goal:** Build the Sheets page with a data grid showing contacts filtered by pipeline stage, with stage-move behavior, column customization, and saved views.

**Architecture:** Sheets page already has skeleton with stage tabs and ContactList. This plan replaces the simple list with a full data grid, adds drag-to-move-stage, column visibility controls, and saved view persistence.

**Tech Stack:** Next.js 15, React 19, TailwindCSS, Prisma/MongoDB, Zod

---

## File Ownership (DO NOT touch files outside this list)

```
OWNED FILES:
  app/(app)/sheets/page.tsx
  app/(app)/sheets/__tests__/
  src/ui/components/contacts/ContactList.tsx
  src/ui/components/contacts/ContactCard.tsx
  src/ui/components/contacts/StageBadge.tsx
  src/ui/components/contacts/ContactGrid.tsx (NEW)
  src/ui/components/contacts/ColumnSelector.tsx (NEW)
  src/ui/components/contacts/StageTab.tsx (NEW)
  src/ui/components/contacts/__tests__/*
  src/ui/hooks/useContacts.ts
  src/ui/hooks/useSavedViews.ts
  src/ui/hooks/__tests__/useContacts.test.ts
  src/ui/hooks/__tests__/useSavedViews.test.ts
  app/api/contacts/route.ts (modify GET only — add filter/sort query params)
  app/api/contacts/[id]/route.ts (modify PATCH only — stage updates)
  app/api/saved-views/route.ts
  app/api/custom-fields/route.ts

DO NOT TOUCH:
  app/(app)/home/*
  app/(app)/settings/*
  src/ui/components/chat/*
  src/ui/components/staging/*
  src/ui/components/settings/*
  src/ui/components/toast/*
  src/ui/components/error/*
  src/ui/components/upload/*
  src/server/actions/*
  src/server/integrations/*
```

## Reference Files (read-only)

- `prisma/schema.prisma` — crm_Contacts, SavedView, CustomFieldDefinition models
- `src/lib/types/enums.ts` — ConnectionStage enum, STAGE_ORDER
- `src/lib/types/contact.ts` — Contact interface

---

## Task 1: Contacts API — Filter & Sort Query Params

**Files:**
- Modify: `app/api/contacts/route.ts` (GET handler)
- Test: `app/api/contacts/__tests__/route.test.ts`

**What to build:**
- GET `/api/contacts?stage=DRAFTED&sort=name&order=asc&search=john&campaignId=xxx`
- Filter by: `stage` (ConnectionStage enum), `campaignId`, `search` (name/company/email partial match)
- Sort by: `name`, `company`, `email_status`, `connection_stage`, `createdAt`
- Pagination: `page` (default 1), `limit` (default 50, max 200)
- Returns: `{ contacts: Contact[], total: number, page: number, totalPages: number }`

**Step 1:** Write failing tests for each filter/sort/pagination combo

**Step 2:** Run tests, verify they fail

**Step 3:** Implement with Prisma `findMany` + `where` + `orderBy` + `skip/take`

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: contacts API with filter, sort, pagination`

---

## Task 2: Contact Stage Update API

**Files:**
- Modify: `app/api/contacts/[id]/route.ts` (PATCH handler)
- Test: `app/api/contacts/[id]/__tests__/route.test.ts`

**What to build:**
- PATCH `/api/contacts/:id` with `{ connection_stage: "CONNECTED" }`
- Validate stage is valid ConnectionStage enum value
- Return updated contact

**Step 1:** Write failing tests (valid stage change, invalid stage rejected)

**Step 2:** Run tests, verify they fail

**Step 3:** Implement with Prisma `update`

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: contact stage update endpoint`

---

## Task 3: Saved Views API — CRUD

**Files:**
- Modify: `app/api/saved-views/route.ts`
- Test: `app/api/saved-views/__tests__/route.test.ts`

**What to build:**
- GET: List saved views for user
- POST: Create view (name, filtersJson, sortJson, columns[])
- PATCH: Update view
- DELETE: Delete view

**Step 1:** Write failing tests

**Step 2:** Run tests, verify they fail

**Step 3:** Implement with Prisma `SavedView` model

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: saved views CRUD API`

---

## Task 4: useContacts Hook Enhancement

**Files:**
- Modify: `src/ui/hooks/useContacts.ts`
- Test: `src/ui/hooks/__tests__/useContacts.test.ts`

**What to build:**
- Accept params: `{ stage?, campaignId?, search?, sort?, order?, page?, limit? }`
- Returns: `{ contacts, total, page, totalPages, isLoading, error, refetch, updateContactStage }`
- `updateContactStage(id, newStage)` calls PATCH and optimistically moves contact

**Step 1:** Write failing tests with fetch mocks

**Step 2:** Run tests, verify they fail

**Step 3:** Implement hook

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: useContacts hook with filters and stage update`

---

## Task 5: useSavedViews Hook Enhancement

**Files:**
- Modify: `src/ui/hooks/useSavedViews.ts`
- Test: `src/ui/hooks/__tests__/useSavedViews.test.ts`

**What to build:**
- Returns: `{ savedViews, createView, updateView, deleteView, isLoading }`
- CRUD operations against `/api/saved-views`

**Step 1:** Write failing tests

**Step 2:** Run tests, verify they fail

**Step 3:** Implement hook

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: useSavedViews hook with CRUD`

---

## Task 6: ContactGrid Component

**Files:**
- Create: `src/ui/components/contacts/ContactGrid.tsx`
- Test: `src/ui/components/contacts/__tests__/ContactGrid.test.tsx`

**What to build:**
- Table/grid layout with fixed columns: Name, Company, Email, Stage, Email Status
- Optional columns: Phone, LinkedIn, Campaign, Confidence, Insert Preview, Custom Fields
- Row click → expand/detail panel (or link to contact detail)
- Column header click → sort toggle (asc/desc)
- Responsive: horizontal scroll on narrow screens

**Props:**
```typescript
interface ContactGridProps {
  contacts: Contact[]
  visibleColumns: string[]
  sortColumn?: string
  sortOrder?: 'asc' | 'desc'
  onSort: (column: string) => void
  onStageChange: (contactId: string, newStage: ConnectionStage) => void
  isLoading: boolean
}
```

**Step 1:** Write failing tests: renders headers, renders rows, sort click calls onSort

**Step 2:** Run tests, verify they fail

**Step 3:** Implement grid with TailwindCSS table

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: ContactGrid component with sorting`

---

## Task 7: Stage Move Behavior

**Files:**
- Modify: `src/ui/components/contacts/ContactGrid.tsx`
- Modify: `src/ui/components/contacts/StageBadge.tsx`
- Test: `src/ui/components/contacts/__tests__/ContactGrid.test.tsx`

**What to build:**
- Stage badge in each row is a dropdown select
- Selecting a new stage calls `onStageChange(contactId, newStage)`
- Stage badge color-coded: DRAFTED=gray, MESSAGE_SENT=blue, DIDNT_CONNECT=yellow, CONNECTED=green, IN_TOUCH=purple
- Confirmation dialog for backward moves (e.g., CONNECTED → DRAFTED)

**Step 1:** Write tests: dropdown renders stages, selection calls handler, backward move shows confirm

**Step 2:** Run tests, verify they fail

**Step 3:** Implement dropdown + confirmation

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: stage move dropdown with confirmation`

---

## Task 8: ColumnSelector Component

**Files:**
- Create: `src/ui/components/contacts/ColumnSelector.tsx`
- Test: `src/ui/components/contacts/__tests__/ColumnSelector.test.tsx`

**What to build:**
- Popover/dropdown with checkboxes for each available column
- Fixed columns (Name, Email, Stage) always visible, cannot be unchecked
- Optional columns togglable
- Column order drag-and-drop (stretch goal — skip if complex)
- Persist selection to localStorage

**Step 1:** Write tests: renders all column options, fixed columns disabled, toggle works

**Step 2:** Run tests, verify they fail

**Step 3:** Implement popover with checkboxes

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: column selector with persistence`

---

## Task 9: Saved Views UI

**Files:**
- Create: `src/ui/components/contacts/SavedViewSelector.tsx` (NEW)
- Test: `src/ui/components/contacts/__tests__/SavedViewSelector.test.tsx`

**What to build:**
- Dropdown showing saved views
- "Save Current View" button that captures current filters/sort/columns
- Name input dialog for new views
- Delete view button (with confirm)
- Selecting a view applies its filters/sort/columns

**Step 1:** Write tests: renders saved views, selecting applies filters, save creates new

**Step 2:** Run tests, verify they fail

**Step 3:** Implement using `useSavedViews` hook

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: saved view selector UI`

---

## Task 10: Sheets Page Assembly

**Files:**
- Modify: `app/(app)/sheets/page.tsx`
- Modify: `app/(app)/__tests__/sheets.test.tsx`

**What to build:**
- Wire together: StageTab bar → ContactGrid → ColumnSelector → SavedViewSelector
- Stage tabs filter the grid
- Search bar above grid
- Pagination controls below grid
- Loading skeleton while fetching

**Step 1:** Write integration test: page renders grid, tab switching filters, search works

**Step 2:** Run tests, verify they fail

**Step 3:** Implement full page

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: sheets page with grid, tabs, search, pagination`

---

## Verification

After all tasks:
```bash
npm run build
npm run test -- --reporter=verbose
```

All tests must pass. Build must succeed.
