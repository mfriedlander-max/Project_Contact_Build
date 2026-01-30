# Orchestration Status

## Current Sprint
**Goal**: Parallel feature build — Settings (gap fill), Sheets Grid, Upload Contacts, Error Handling UX
**Started**: 2026-01-30
**Strategy**: File ownership (no worktrees), all on main branch

## Active Agents

| Window | Feature | Status | Plan | Last Update |
|--------|---------|--------|------|-------------|
| 1 | Settings Page (gap fill) | 🟡 In Progress | `docs/plans/2026-01-30-settings-page.md` | Filling 7 gaps in existing implementation |
| 2 | Sheets Grid | 🟡 In Progress | `docs/plans/2026-01-30-sheets-grid.md` | Self-corrected paths, skipping done work |
| 3 | Upload Contacts | 🟡 In Progress | `docs/plans/2026-01-30-upload-contacts.md` | Started |
| 4 | Error Handling UX | 🟡 In Progress | `docs/plans/2026-01-30-error-handling-ux.md` | Started |

## File Ownership (Current Sprint)

| Window | Owned Files |
|--------|-------------|
| 1 | `app/(app)/settings/*`, `app/api/settings/*`, `app/api/templates/*`, `app/api/integrations/*`, `src/ui/components/settings/*`, `src/ui/hooks/useSettings.ts`, `src/ui/hooks/useTemplates.ts`, `src/ui/hooks/useIntegrations.ts` |
| 2 | `app/(app)/sheets/*`, `app/api/crm/contacts/*`, `app/api/saved-views/*`, `app/api/custom-fields/*`, `src/ui/components/contacts/*`, `src/ui/hooks/useContacts.ts`, `src/ui/hooks/useSavedViews.ts` |
| 3 | `src/ui/components/upload/*`, `src/server/services/uploadParser.ts`, `app/api/contacts/upload/*` |
| 4 | `src/ui/components/toast/*`, `src/ui/components/error/*`, `src/ui/hooks/useToast.ts`, `src/ui/components/UndoToast.tsx`, `app/(app)/layout.tsx` |

## Notes
- Window 1: Settings was partially built in UI rebuild. Agent filling specific gaps (PATCH route, optimistic updates, template editing, availability block, tabbed nav).
- Window 2: Plan had wrong API paths. Agent self-corrected to `app/api/crm/contacts/`. Saved views CRUD already existed — skipped.

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

## Completed
- [x] Initial setup of orchestration system
- [x] Created `ui-rebuild` branch
- [x] Tagged `pre-ui-rebuild` rollback point
- [x] **Phase 0 Complete** - 209 tests passing across all agents
- [x] **Phase 0 Reviews** - All agents self-reviewed, Agent C fixed constants extraction
- [x] **Phase 1 Complete** - Prisma schema, APIs, UI shell, search provider, action schemas
- [x] **Phase 2 Complete** - UI components, services, integrations, AI orchestration (67 files, 4902 lines)
- [x] **Phase 3 Complete** - Full integration: UI wired to APIs, all action handlers, pipeline stages, Prisma-backed stores (48 files, 3879 lines)
