# Upload Contacts Implementation Plan

> **For Claude:** You are an ARCHITECT running subagent-driven development. Use `superpowers:subagent-driven-development` to execute this plan task-by-task.

**Goal:** Build CSV/Excel contact upload flow: file picker, column mapping, preview, and bulk import into CRM.

**Architecture:** Upload UI in a modal/dialog from AI Home. Backend parses CSV/XLSX, maps columns to contact fields, validates, and bulk-creates contacts via Prisma.

**Tech Stack:** Next.js 15, React 19, TailwindCSS, Prisma/MongoDB, Zod, Papa Parse (CSV), SheetJS (XLSX)

---

## File Ownership (DO NOT touch files outside this list)

```
OWNED FILES:
  src/ui/components/upload/UploadDialog.tsx (NEW)
  src/ui/components/upload/ColumnMapper.tsx (NEW)
  src/ui/components/upload/UploadPreview.tsx (NEW)
  src/ui/components/upload/__tests__/*
  src/server/services/uploadParser.ts (NEW)
  src/server/services/__tests__/uploadParser.test.ts
  app/api/contacts/upload/route.ts (NEW)
  app/api/contacts/upload/__tests__/route.test.ts

DO NOT TOUCH:
  app/(app)/home/*
  app/(app)/settings/*
  app/(app)/sheets/*
  src/ui/components/chat/*
  src/ui/components/staging/*
  src/ui/components/settings/*
  src/ui/components/contacts/*
  src/ui/components/toast/*
  src/ui/components/error/*
  src/server/actions/*
  src/server/integrations/*
```

## Reference Files (read-only)

- `prisma/schema.prisma` — crm_Contacts model
- `src/lib/types/contact.ts` — Contact interface, required fields
- `src/lib/types/enums.ts` — ConnectionStage (uploaded contacts default to DRAFTED)

---

## Task 1: Install Dependencies

**Step 1:** Install `papaparse` and `@types/papaparse` for CSV parsing, `xlsx` for Excel parsing

```bash
npm install papaparse xlsx
npm install -D @types/papaparse
```

**Step 2:** Commit: `chore: add papaparse and xlsx dependencies`

---

## Task 2: Upload Parser Service

**Files:**
- Create: `src/server/services/uploadParser.ts`
- Test: `src/server/services/__tests__/uploadParser.test.ts`

**What to build:**
```typescript
interface ParsedUpload {
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
  errors: Array<{ row: number; message: string }>
}

interface ColumnMapping {
  [sourceColumn: string]: string // maps to contact field name
}

function parseCSV(content: string): ParsedUpload
function parseXLSX(buffer: Buffer): ParsedUpload
function applyMapping(parsed: ParsedUpload, mapping: ColumnMapping): ContactCreateInput[]
function validateContacts(contacts: ContactCreateInput[]): { valid: ContactCreateInput[], errors: ValidationError[] }
```

- `parseCSV`: Use PapaParse, handle BOM, detect delimiter
- `parseXLSX`: Use SheetJS, take first sheet
- `applyMapping`: Transform source columns → contact fields
- `validateContacts`: Ensure required fields (name), validate email format, cap at 200 rows

**Step 1:** Write failing tests for each function (valid CSV, malformed CSV, XLSX, mapping, validation)

**Step 2:** Run tests, verify they fail

**Step 3:** Implement all functions

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: upload parser service with CSV/XLSX support`

---

## Task 3: Upload API Route

**Files:**
- Create: `app/api/contacts/upload/route.ts`
- Test: `app/api/contacts/upload/__tests__/route.test.ts`

**What to build:**
- POST `/api/contacts/upload` — multipart form data
  - `file`: CSV or XLSX file (max 5MB)
  - `mapping`: JSON string of column mapping
  - `campaignId`: optional campaign to associate
- Response: `{ created: number, errors: ValidationError[], contacts: Contact[] }`
- Uses `uploadParser` service to parse → map → validate → bulk create

**Step 1:** Write failing tests (valid upload, invalid file type, too large, validation errors)

**Step 2:** Run tests, verify they fail

**Step 3:** Implement route with file parsing and Prisma `createMany`

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: contact upload API endpoint`

---

## Task 4: ColumnMapper Component

**Files:**
- Create: `src/ui/components/upload/ColumnMapper.tsx`
- Test: `src/ui/components/upload/__tests__/ColumnMapper.test.tsx`

**What to build:**
- Two-column layout: Source Column (from file) → Target Field (contact field)
- Each source column gets a dropdown of available contact fields
- Auto-detect common mappings: "Name"→name, "Email"→email, "Company"→company
- "Skip" option to ignore a column
- Shows preview of first 3 rows for each mapping

**Props:**
```typescript
interface ColumnMapperProps {
  headers: string[]
  sampleRows: Record<string, string>[]
  onMappingChange: (mapping: ColumnMapping) => void
}
```

**Step 1:** Write tests: renders headers, auto-detects name/email, dropdown changes update mapping

**Step 2:** Run tests, verify they fail

**Step 3:** Implement component

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: column mapper with auto-detection`

---

## Task 5: UploadPreview Component

**Files:**
- Create: `src/ui/components/upload/UploadPreview.tsx`
- Test: `src/ui/components/upload/__tests__/UploadPreview.test.tsx`

**What to build:**
- Shows mapped data in a preview table (first 10 rows)
- Highlights validation errors in red (missing name, invalid email)
- Summary: "X contacts ready to import, Y errors"
- "Import" button (enabled only when valid contacts > 0)
- "Back" button to return to column mapper

**Step 1:** Write tests: renders preview rows, shows error count, import button state

**Step 2:** Run tests, verify they fail

**Step 3:** Implement component

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: upload preview with validation display`

---

## Task 6: UploadDialog Component (Full Flow)

**Files:**
- Create: `src/ui/components/upload/UploadDialog.tsx`
- Test: `src/ui/components/upload/__tests__/UploadDialog.test.tsx`

**What to build:**
- Modal dialog with 3-step wizard:
  1. **Select File** — drag-and-drop zone + file picker button, accepts .csv/.xlsx
  2. **Map Columns** — ColumnMapper component
  3. **Preview & Import** — UploadPreview component
- Progress indicator (step 1/2/3)
- Close button, cancel confirms if file is selected
- On import success: close dialog, show success message

**Props:**
```typescript
interface UploadDialogProps {
  open: boolean
  onClose: () => void
  campaignId?: string
  onImportComplete: (count: number) => void
}
```

**Step 1:** Write tests: dialog opens, file selection advances to step 2, full flow works

**Step 2:** Run tests, verify they fail

**Step 3:** Implement 3-step wizard

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: upload dialog with 3-step wizard flow`

---

## Verification

After all tasks:
```bash
npm run build
npm run test -- --reporter=verbose
```

All tests must pass. Build must succeed.
