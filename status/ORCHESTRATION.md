# Orchestration Status

## Current Sprint: Claude Tool Calling Implementation
**Goal**: Enable AI chat to execute actions via Claude tool calling (14 tools across 3 modes)
**Started**: 2026-01-31
**Branch**: `feature/claude-tool-calling`
**Strategy**: File ownership, parallel Phase 1 execution
**Plan**: [docs/plans/2026-01-31-tool-calling-orchestration.md](../docs/plans/2026-01-31-tool-calling-orchestration.md)

### Phase 1: Parallel Execution (✅ COMPLETE - All 4 tasks done)

| Agent | Task | Status | Files | Progress |
|-------|------|--------|-------|----------|
| **A** | Task 1: Tool Schema Generator | 🟢 Complete | `/lib/ai/tool-schemas.ts`, tests | 18 tests passing, ready for Task 2 ✅ |
| **B** | Task 3: Duplicate Detection | 🟢 Complete | `stagingService.ts`, `findContacts.ts`, tests | All strategies implemented, 18 tests passing ✅ |
| **C** | Task 5: Staging Panel UI | 🟢 Complete | `StagingPanel.tsx`, `StagingRow.tsx`, `StagingHeader.tsx`, tests | 73 tests passing, selection + partial approval ✅ |
| **D** | Task 6: System Prompts | 🟢 Complete | `/lib/ai/stream-chat.ts` | All 3 mode prompts updated ✅ |

### Phase 2: Sequential (✅ COMPLETE - All 2 tasks done)

| Agent | Task | Depends On | Status |
|-------|------|------------|--------|
| **A** | Task 2: Chat API Tool Calling | Task 1 ✅ | 🟢 Complete - 9 tests, commit a0a4e7c |
| **C** | Task 4: Frontend Hook | Task 2 ✅ | 🟢 Complete - 25 tests, commit 581f847 |

### Phase 3: Integration Testing (🟡 Ready to Start)

| Agent | Task | Depends On | Status |
|-------|------|------------|--------|
| **A** | Full E2E Integration | All tasks ✅ | 🟡 Ready to Start |

### Completed This Sprint
- [x] Agent A (Task 1): Tool Schema Generator - 18 tests, maps all 14 actions to Claude tools
- [x] Agent A (Task 2): Chat API Tool Calling - 9 tests, 4 event types (tool_result, confirmation_required, tool_error, text)
- [x] Agent B (Task 3): Duplicate Detection - Smart backfill with 3 matching strategies
- [x] Agent C (Task 4): Frontend Hook - 25 tests, handles all 4 event types with confirmation flow
- [x] Agent C (Task 5): Staging Panel UI - All components + tests complete
- [x] Agent D (Task 6): System prompts updated for all 3 modes
- [x] Agent C (Task 5): Staging Panel UI - All components + tests complete

### Key Features
- **Tool Calling**: 14 action types mapped to Claude tool definitions
- **Mode Restrictions**: CONTACT_FINDER (4 tools), GENERAL_MANAGER (3 tools), ASSISTANT (14 tools)
- **Duplicate Detection**: Email, LinkedIn, Name+Company matching with smart backfill
- **Staging UI**: Select all, individual checkboxes, "Create Campaign" button, minimal fields
- **Confirmations**: Destructive actions (send_emails, delete_contacts, bulk_update) require user approval

### File Ownership (No Conflicts)

| Agent | Owns | Does NOT Touch |
|-------|------|----------------|
| **A** | `/lib/ai/tool-schemas.ts`, `/lib/ai/__tests__/`, `/app/api/ai/chat/` | Staging, UI components |
| **B** | `/src/server/services/stagingService.ts`, `/src/server/actions/handlers/findContacts.ts` | UI, tool schemas |
| **C** | `/src/ui/components/staging/*`, `/src/ui/hooks/useChatApi.ts` | Backend services |
| **D** | `/lib/ai/stream-chat.ts` | Everything else (task complete) |

### Status Docs
- `/status/task-001-tool-schemas.md` - Agent A ✅
- `/status/task-002-chat-api.md` - Agent A ✅
- `/status/task-003-duplicates.md` - Agent B ✅
- `/status/task-004-frontend-hook.md` - Agent C ✅
- `/status/task-005-staging-ui.md` - Agent C ✅
- `/status/task-006-prompts.md` - Agent D ✅

---

## Previous Sprint: Feature Build (Settings, Sheets, Upload, Error Handling)
**Goal**: Parallel feature build — Settings (gap fill), Sheets Grid, Upload Contacts, Error Handling UX
**Started**: 2026-01-30
**Status**: 🟢 Complete
**Strategy**: File ownership (no worktrees), all on main branch

### Completed Agents

| Window | Feature | Status | Plan | Output |
|--------|---------|--------|------|--------|
| 1 | Settings Page (gap fill) | 🟢 Complete | `docs/plans/2026-01-30-settings-page.md` | 88 tests, 7 gaps filled (PATCH, optimistic updates, templates UI, automation, tabs) |
| 2 | Sheets Grid | 🟢 Complete | `docs/plans/2026-01-30-sheets-grid.md` | 923 tests total, 10 tasks (grid, sort, filter, stage moves, saved views, column selector) |
| 3 | Upload Contacts | 🟢 Complete | `docs/plans/2026-01-30-upload-contacts.md` | 53 tests, 6 tasks done (parser, API, ColumnMapper, UploadPreview, UploadDialog) |
| 4 | Error Handling UX | 🟢 Complete | `docs/plans/2026-01-30-error-handling-ux.md` | 7 tasks done (Toast, ErrorBoundary, RetryButton, UndoToast refactor, layout wiring) |

## Blockers
- [ ] None currently

## Phase 3 Results (COMPLETE)

| Agent | Key Output |
|-------|------------|
| A | Wired Home/Sheets/Settings pages, 6 custom hooks (useChatApi, useContacts, useSettings, useTemplates, useIntegrations, useSavedViews), 45 tests |
| B | CampaignRunStore (Prisma-backed), campaign run API routes, /api/ai/chat bridge endpoint |
| C | 4 pipeline stage executors (emailFinding, insert, draft, send), Gmail polling sync |
| D | 13 remaining action handlers, createExecutor factory with DI, action logging integration |

## Phase 2 Results (COMPLETE)

| Agent | Tests | Key Output |
|-------|-------|------------|
| A | 109 | ModeSwitch, Chat UI (Context/Message/Input/Panel), Staging Panel, Contact Cards, UndoToast |
| B | 41 | Staging/Approve/Hunter/Template services + staging API routes |
| C | 88 | PageFetcher, InsertGenerator, GmailService, HunterService implementations |
| D | 181 | Campaign Runner with DI, FIND_CONTACTS handler, Action Logger, Executor enhancements |

## Phase 1 Results (COMPLETE)

| Agent | Tests | Key Output |
|-------|-------|------------|
| A | 53 | AppShell, Sidebar, TopBar, ModeSwitch, Settings sections |
| B | 409 | 8 Prisma models, 6 CRUD APIs, auth middleware |
| C | 20 | searchProvider with SerpAPI implemented |
| D | 138 | Enum reconciliation, 14 Zod schemas, validateActionPayload |

## Phase 0 Results (COMPLETE)

| Agent | Tests | Key Output |
|-------|-------|------------|
| A | 15 passing | Routes: /login, /home, /sheets, /settings + src/ui/ structure |
| B | 35 passing | `lib/types/enums.ts` - ConnectionStage, AiMode, CampaignRunState, etc |
| C | 57 passing | `src/server/integrations/` stubs, isSafeUrl() implemented |
| D | 102 passing | `src/server/actions/` types, executor, campaignRunner stubs |

**Total: 209 tests passing**

## Task Dependencies

```
Phase 0 (All Parallel):
├── Agent A: Task 2, 3a (Routes + UI folder)
├── Agent B: Task 3b, 4 (Services + Enums) ──┐
├── Agent C: Task 3c (Integration stubs)     │
└── Agent D: Task 3d (Action stubs)          │
                                             │
Phase 1 (B Blocking):                        │
├── Agent B: Task 5 (Prisma) ◄───────────────┘
│     └── Task 6, 7, 8 (Indexes, APIs, Auth)
├── Agent A: Task 9, 10 (Settings, Shell) [can mock APIs]
├── Agent C: Task 20 (Search) [can mock APIs]
└── Agent D: Task 13 (Action Schema) [can mock APIs]

Phase 2 (Full Parallel):
├── Agent A: 11, 12, 15, 18, 19 (Mode, Chat, Staging, Cards, Toast)
├── Agent B: 14, 16, 24, 27b (Staging DB, Approve, Hunter, Templates)
├── Agent C: 22, 23, 25, 29 (Fetch, Inserts, Email, Drafts)
└── Agent D: 17, 21, 40, 42 (Runner, Find, Enforce, Logging)

Phase 3 (Integration):
├── AI Home flow: A + B + D
├── Campaign Runner: B + C + D
├── Sheets Grid: A + B
├── Settings: A + B + C
└── Gmail Sync: C
```

## File Ownership (Conflict Prevention)

| Agent | Owns | Does NOT Touch |
|-------|------|----------------|
| A | `app/(app)/*`, `src/ui/*`, `app/(auth)/*` | `prisma/*`, `src/server/*`, `app/api/*` |
| B | `prisma/*`, `app/api/*`, `src/server/services/*`, `src/lib/*` | `src/ui/*`, `app/(app)/*` |
| C | `src/server/integrations/*`, `lib/gmail.ts`, `lib/hunter.ts` | `src/ui/*`, `app/(app)/*` |
| D | `src/server/actions/*` | `src/ui/*`, `prisma/*` |

**Shared files** (coordinate via status docs):
- `package.json` - Only Agent B adds dependencies
- `tailwind.config.ts` - Only Agent A modifies

## Blockers
- [x] ~~Enum duplication~~ - Agent D to reconcile (import from Agent B's lib/types/enums.ts)

## Post-Build: Code Review + Deploy (2026-01-30)

### Code Review Fixes (commit 73928f8)
- **CRITICAL**: Added Zod input validation on contacts API POST/PUT (`contactBodySchema`)
- **CRITICAL**: Forced `assigned_to = userId` on contact creation (security fix)
- **CRITICAL**: Fixed silent parse error in UploadDialog — now shows alert
- **CRITICAL**: Changed `console.log` to `console.error` in API error handlers
- **HIGH**: Fixed stale closure in `useContacts.updateContactStage` via `contactsRef` pattern
- **HIGH**: Extracted shared `COLUMNS` constant to `src/ui/components/contacts/columns.ts`
- **HIGH**: Replaced unsafe double-cast in ContactGrid with typed `CONTACT_FIELD_MAP`
- **HIGH**: Removed re-thrown error in UploadDialog `handleImport`
- **MEDIUM**: Memoized ToastProvider context value with `useMemo`
- 925/925 unit tests passing after all fixes

### E2E Tests Written (commit 73928f8)
- `tests/e2e/helpers/auth.ts` — NextAuth session mock helper
- `tests/e2e/sheets.spec.ts` — 7 tests (unauth redirect + authenticated grid)
- `tests/e2e/settings.spec.ts` — 7 tests (unauth redirect + authenticated tabs)
- `tests/e2e/error-handling.spec.ts` — 2 tests (API error alert, toast container)
- Run manually with `npx playwright test` (requires dev server)

### Vercel Deploy
- Removed `pnpm-lock.yaml` (was causing Vercel to use pnpm instead of npm)
- Added `.npmrc` with `legacy-peer-deps=true` for React 19 peer dep conflicts
- Fixed build command: removed `prisma db push` and `prisma db seed` from `npm run build`
- Added `globals.css` with Tailwind directives + CSS variables (was missing, causing unstyled UI)
- Updated root `app/layout.tsx` to import `globals.css`
- Root `/` redirects to `/sheets`
- Env vars set on Vercel: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, JWT_SECRET, GOOGLE_ID, GOOGLE_SECRET, ANTHROPIC_API_KEY, HUNTER_API_KEY
- Google OAuth redirect URI added for Vercel domain
- **Production URL**: https://project-contact-build.vercel.app
- **Note**: Google OAuth returning `invalid_client` on Vercel — works locally on localhost:3000. Needs fresh OAuth client or credential debugging.

### Remaining Work
- [ ] App shell sidebar/topbar polish
- [ ] Fix Google OAuth on Vercel production
- [ ] Rotate exposed secrets (NEXTAUTH_SECRET, GOOGLE_SECRET, ANTHROPIC_API_KEY, HUNTER_API_KEY)

### Recently Completed (2026-01-31)
- [x] AI Home page (`/home`) — Fixed SSE streaming bug, chat now works
- [x] "Didn't Connect" rule builder UI — Agent 2 built rule builder with action selector
- [x] Template manager in Settings (full CRUD) — Wired up "Set Default" button
- [x] Gmail OAuth connect flow in Settings — Agent 3 built Gmail status check and connect button

## Completed
- [x] Initial setup of orchestration system
- [x] Created `ui-rebuild` branch
- [x] Tagged `pre-ui-rebuild` rollback point
- [x] **Phase 0 Complete** - 209 tests passing across all agents
- [x] **Phase 0 Reviews** - All agents self-reviewed, Agent C fixed constants extraction
- [x] **Phase 1 Complete** - Prisma schema, APIs, UI shell, search provider, action schemas
- [x] **Phase 2 Complete** - UI components, services, integrations, AI orchestration (67 files, 4902 lines)
- [x] **Phase 3 Complete** - Full integration: UI wired to APIs, all action handlers, pipeline stages, Prisma-backed stores (48 files, 3879 lines)
- [x] **Feature Sprint Complete** - Settings, Sheets Grid, Upload Contacts, Error Handling (925 tests)
- [x] **Code Review + Fixes** - 4 CRITICAL, 5 HIGH issues resolved
- [x] **E2E Tests Written** - 16 tests across 3 spec files
- [x] **Vercel Deploy** - Production live with Tailwind CSS fix
