# Task: Agent C Phase 0 - Integration Stubs

## Assignment
- **Role**: Integrations Agent (TDD)
- **Command**: `/tdd`
- **Assigned Files**:
  - `src/server/integrations/searchProvider.ts`
  - `src/server/integrations/pageFetcher.ts`
  - `src/server/integrations/gmailService.ts`
  - `src/server/integrations/hunterService.ts`
  - `src/server/integrations/index.ts`
  - `src/server/integrations/__tests__/*.test.ts`
- **Depends On**: None
- **Blocks**: Phase 2 integration work (Tasks 20, 22, 23, 25, 29)

## Status
🟢 Complete

## Progress Log
- [2026-01-28 11:54] Started task
- [2026-01-28 11:54] Checked existing project structure (Vitest, existing lib/hunter.ts, lib/gmail.ts)
- [2026-01-28 11:54] Created `src/server/integrations/` directory structure
- [2026-01-28 11:54] Created interface definitions and stubs for all 4 services
- [2026-01-28 11:54] Wrote comprehensive test suites following TDD methodology
- [2026-01-28 11:54] Fixed `isSafeUrl` to only allow http/https protocols (security improvement)
- [2026-01-28 11:55] All 57 tests passing
- [2026-01-28 11:55] Installed @vitest/coverage-v8 dependency
- [2026-01-28 11:55] Achieved 100% test coverage
- [2026-01-28 11:55] TypeScript type check passes for integration files

## Output

### Files Created
```
src/server/integrations/
├── searchProvider.ts          # Search provider stub (SerpAPI/Google)
├── pageFetcher.ts             # Page fetcher stub + isSafeUrl helper
├── gmailService.ts            # Gmail service stub
├── hunterService.ts           # Hunter.io service stub
├── index.ts                   # Barrel exports
└── __tests__/
    ├── searchProvider.test.ts
    ├── pageFetcher.test.ts
    ├── gmailService.test.ts
    ├── hunterService.test.ts
    └── index.test.ts
```

### Interfaces Defined

**searchProvider**:
- `SearchResult`: { title, snippet, url, position }
- `SearchOptions`: { query, numResults?, excludeDomains? }
- Methods: `search()`, `isConfigured()`

**pageFetcher**:
- `FetchedPage`: { url, title, text, fetchedAt }
- `FetchOptions`: { urls, maxPagesPerContact?, timeoutMs? }
- Methods: `fetchPages()`, `isSafeUrl()` (fully implemented)

**gmailService**:
- `GmailDraft`: { id, threadId, messageId }
- `CreateDraftOptions`: { to, subject, body, labelNames }
- `SendOptions`: { draftId }
- Methods: `isConnected()`, `ensureLabels()`, `createDraft()`, `sendDraft()`, `isDraftSent()`, `syncSentStatus()`

**hunterService**:
- `EmailFindResult`: { email, confidence, sources }
- `EmailFindOptions`: { firstName, lastName, company, domain? }
- Methods: `isConfigured()`, `findEmail()`, `inferDomain()`

### Test Results
```
 ✓ src/server/integrations/__tests__/gmailService.test.ts (15 tests)
 ✓ src/server/integrations/__tests__/hunterService.test.ts (11 tests)
 ✓ src/server/integrations/__tests__/pageFetcher.test.ts (11 tests)
 ✓ src/server/integrations/__tests__/searchProvider.test.ts (7 tests)
 ✓ src/server/integrations/__tests__/index.test.ts (13 tests)

Test Files: 5 passed
Tests: 57 passed
Coverage: 100%
```

### Implementation Notes

1. **`isSafeUrl()` is fully implemented** - This helper function validates URLs:
   - Only allows `http:` and `https:` protocols
   - Blocks all LinkedIn domains (linkedin.com, www.linkedin.com)
   - Returns false for invalid URLs or unsafe protocols (javascript:, ftp:, file:, etc.)

2. **All other methods throw "Not implemented - Phase 2"** - These are intentional stubs that will be implemented in Phase 2 tasks:
   - Task 20: searchProvider implementation
   - Task 22: pageFetcher implementation
   - Task 25: hunterService implementation
   - Tasks 29-31: gmailService implementation

3. **Existing `lib/hunter.ts` and `lib/gmail.ts` preserved** - These files were NOT modified. The new services are wrappers that will extend these in Phase 2.

4. **Dependency added**: `@vitest/coverage-v8` for test coverage reporting

## Issues Found
- Pre-existing TypeScript error in `src/server/actions/__tests__/campaignRunner.test.ts` (not related to this task - references missing module `../campaignRunner`)

## Handoff Notes
- All integration stubs are ready for Phase 2 implementation
- The `isSafeUrl()` helper is production-ready and can be used immediately
- Tests verify both interface shapes and stub behavior (throwing errors)
- When implementing in Phase 2, update stubs to real implementations - tests will need adjustment to mock external APIs
- Import all services via: `import { searchProvider, pageFetcher, gmailService, hunterService } from '@/src/server/integrations'`
