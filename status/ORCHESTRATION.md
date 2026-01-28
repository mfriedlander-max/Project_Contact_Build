# Orchestration Status

## Current Sprint
**Goal**: UI Rebuild - AI-first Student Networking CRM
**Started**: 2026-01-28
**Target**: Complete Phase 0-3 (Full UI + Integrations)
**Branch**: `ui-rebuild`
**Tag**: `pre-ui-rebuild` (rollback point)

## Active Agents

| Agent | Role | Task | Status | Files | Last Update |
|-------|------|------|--------|-------|-------------|
| Window 2 | Agent A (UI) | Phase 2: Chat + Staging UI | ⏳ Ready | `app/(app)/*`, `src/ui/*` | Phase 1 ✅ |
| Window 3 | Agent B (Data) | Phase 2: Staging DB + Approve | ⏳ Ready | `prisma/*`, `app/api/*`, `src/lib/*` | Phase 1 ✅ |
| Window 4 | Agent C (Integrations) | Phase 2: Page Fetch + Inserts | ⏳ Ready | `src/server/integrations/*` | Phase 1 ✅ |
| Window 5 | Agent D (AI/Orchestration) | Phase 2: Runner + FIND_CONTACTS | ⏳ Ready | `src/server/actions/*` | Phase 1 ✅ |

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
