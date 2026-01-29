# Task: Agent B Phase 1 - Prisma Schema + APIs

## Assignment
- **Role**: Data/API Agent (TDD)
- **Command**: `/tdd`
- **Assigned Files**:
  - `prisma/schema.prisma`
  - `app/api/contacts/*`
  - `app/api/campaigns/*`
  - `app/api/settings/*`
  - `app/api/templates/*`
  - `app/api/saved-views/*`
  - `app/api/custom-fields/*`
  - `app/api/integrations/*`
- **Depends On**: None
- **Blocks**: Phase 2 backend work (CRITICAL PATH)

## Status
🟢 Complete

## Progress Log
- [2026-01-28 10:00] Started task - reviewed existing schema and codebase
- [2026-01-28 10:05] Analyzed existing Prisma models, enums, and type definitions
- [2026-01-28 10:10] Task 5: Added new Prisma models (Campaign, CampaignRun, Settings, Template, SavedView, CustomFieldDefinition, IntegrationConnection, StagedContactList)
- [2026-01-28 10:15] Task 5b: Updated crm_Contacts with campaignId, connection_stage, gmail fields
- [2026-01-28 10:20] Task 6: Added indexes (userId+connectionStage, campaignId, etc.)
- [2026-01-28 10:25] Validated Prisma schema with prisma generate
- [2026-01-28 10:30] Task 7b: Created Campaigns CRUD API with tests
- [2026-01-28 10:35] Task 7c: Created Settings API with tests
- [2026-01-28 10:40] Task 7d: Created Templates CRUD API with tests
- [2026-01-28 10:45] Task 7e: Created Saved-views CRUD API with tests
- [2026-01-28 10:50] Task 7f: Created Custom-fields CRUD API with tests
- [2026-01-28 10:55] Task 7g: Created Integrations CRUD API with tests
- [2026-01-28 11:00] Task 8: Added auth protection via middleware and layout
- [2026-01-28 11:05] All 409 tests pass, build successful

## Output

### New Prisma Models Added
1. **Campaign** - Organizing contact outreach campaigns
2. **CampaignRun** - Tracks individual campaign execution runs (state machine)
3. **Settings** - User preferences and configuration
4. **Template** - Email templates for outreach
5. **SavedView** - Saved filter/sort configurations for contacts table
6. **CustomFieldDefinition** - User-defined columns for contacts
7. **IntegrationConnection** - OAuth tokens and API connections
8. **StagedContactList** - Temporary storage for AI-found contacts

### New Enums Added
- `ConnectionStage` (DRAFTED, MESSAGE_SENT, DIDNT_CONNECT, CONNECTED, IN_TOUCH)
- `CampaignRunState` (IDLE, EMAIL_FINDING_RUNNING, INSERTS_RUNNING, DRAFTS_RUNNING, SENDING_RUNNING, COMPLETE, FAILED)
- `IntegrationProvider` (GMAIL, HUNTER, SEARCH_PROVIDER, OUTLOOK)
- `CustomFieldType` (TEXT, NUMBER, DATE, SELECT)
- `CampaignStatus` (DRAFT, ACTIVE, PAUSED, COMPLETE, ARCHIVED)

### Updated crm_Contacts with
- `campaignId` (relation to Campaign)
- `connection_stage` (new ConnectionStage enum)
- Gmail integration fields: `gmail_thread_id`, `gmail_message_id`, `gmail_draft_id`, `gmail_last_sync`
- Added indexes for performance

### New API Routes Created
- `/api/campaigns` - Full CRUD with tests (16 tests)
- `/api/settings` - GET/PUT with tests (7 tests)
- `/api/templates` - Full CRUD with tests (10 tests)
- `/api/saved-views` - Full CRUD with tests (7 tests)
- `/api/custom-fields` - Full CRUD with tests (10 tests)
- `/api/integrations` - GET/PUT/DELETE with tests (12 tests)

### Auth Protection
- Added `middleware.ts` for Next.js middleware-based auth protection
- Added server-side session check in `app/(app)/layout.tsx`

## Issues Found
- Duplicate email in existing Users table prevented `prisma db push` (data issue, not code issue)
- Fixed JSON type casting for Prisma with MongoDB

## Handoff Notes
- All new models have proper relations to Users via userId
- All API routes include auth protection via getServerSession
- All API routes use Zod validation for input
- Indexes added for common query patterns (userId, campaignId, connection_stage)
- Tests follow existing patterns using vitest and mocks
