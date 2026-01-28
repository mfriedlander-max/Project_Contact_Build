# Task: Agent A Phase 3 — UI Integration

## Assignment
- **Role**: Implementation (TDD)
- **Assigned Files**: `app/(app)/home/page.tsx`, `app/(app)/sheets/page.tsx`, `app/(app)/settings/page.tsx`, `app/(app)/layout.tsx`, `src/ui/**/*`
- **Depends On**: Phase 2 complete (all agents)
- **Blocks**: Final integration review

## Status
🟢 Complete

## Progress Log
- [2026-01-28] Status doc created by Architect
- [2026-01-28] Explored Phase 2 components and API routes
- [2026-01-28] Created 6 custom hooks with TDD (RED → GREEN)
  - useChatApi, useContacts, useSettings, useIntegrations, useTemplates, useSavedViews
- [2026-01-28] Wired Home Page: ChatProvider + useChatApi → StagingPanel integration
- [2026-01-28] Wired Sheets Page: stage tabs, ContactList, saved views dropdown
- [2026-01-28] Wired Settings Page: IntegrationsSection with Hunter API key input, TemplatesSection with CRUD, AutomationSection with toggles
- [2026-01-28] Updated IntegrationsSection, TemplatesSection, AutomationSection to accept data/callback props
- [2026-01-28] All 45 new tests passing (23 hook + 22 page tests)
- [2026-01-28] All 29 existing component tests still pass

## Output

### New Files (8)
- `src/ui/hooks/useChatApi.ts` — Chat API + staging state management
- `src/ui/hooks/useContacts.ts` — Contact fetching with stage/filter params
- `src/ui/hooks/useSettings.ts` — Settings fetch/update
- `src/ui/hooks/useIntegrations.ts` — Integration CRUD + connection status
- `src/ui/hooks/useTemplates.ts` — Template CRUD
- `src/ui/hooks/useSavedViews.ts` — Saved views fetch
- `src/ui/hooks/index.ts` — Barrel export

### Modified Files (6)
- `app/(app)/home/page.tsx` — Wired to useChatApi, ChatProvider, StagingPanel
- `app/(app)/sheets/page.tsx` — Stage tabs, ContactList, saved views, loading/error states
- `app/(app)/settings/page.tsx` — Connected to hooks for integrations, templates, automation
- `src/ui/components/settings/IntegrationsSection.tsx` — Added props, Hunter API key input
- `src/ui/components/settings/TemplatesSection.tsx` — Added props, create form, template list with delete
- `src/ui/components/settings/AutomationSection.tsx` — Added props, settings-driven toggle state

### Test Files (10)
- 6 hook test files (23 tests)
- 4 page test files (22 tests)

## Issues Found
- 9 pre-existing test failures in `src/server/actions/__tests__/campaignRunner.test.ts` (Prisma ObjectID issues) — not related to Phase 3 UI work

## Handoff Notes
- Home page reads AI mode from localStorage (shared with ModeSwitch/AppShell)
- Chat endpoint `/api/ai/chat` is mocked with fallback — Agent D needs to create this endpoint
- Gmail connect button navigates to `/api/auth/gmail/connect` — Agent B needs to create this route
- All hooks use standard fetch patterns with error handling and loading states
- Settings components now accept optional props, remaining backward-compatible when called without props
