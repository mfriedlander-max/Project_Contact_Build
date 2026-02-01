# Manual Test Plan - Claude Tool Calling

**Last Updated:** 2026-02-01
**Status:** In Progress
**Related:** [Tool Calling Architecture](../architecture/tool-calling.md)

## Overview

This document outlines manual end-to-end tests for the Claude tool calling system. These tests verify the complete user flow from chat input to database persistence.

**Prerequisites:**
- Dev server running: `npm run dev`
- SERPAPI_API_KEY configured in `.env.local`
- Browser open to `http://localhost:3000/home`
- User authenticated

## Test Status Legend

- ✅ **Passed** - Verified working
- ❌ **Failed** - Not working, needs fix
- ⏳ **Pending** - Not yet tested
- 🚧 **Blocked** - Waiting on other work

---

## High Priority Tests

### Test 1: Find Contacts Flow (CONTACT_FINDER Mode)

**Status:** ✅ Passed (2026-02-01)

**Steps:**
1. Navigate to `/home`
2. Ensure mode is CONTACT_FINDER (check localStorage or mode selector)
3. Send message: "Find 5 CTOs in San Francisco"
4. Wait for response

**Expected Results:**
- ✅ Claude responds with tool usage confirmation
- ✅ Terminal shows: `🎯 Tool started: find_contacts`
- ✅ Terminal shows: `✅ Action result: success`
- ✅ Staging panel appears below chat
- ✅ 5 contacts displayed with: name, company, url
- ✅ All contacts have selection checkboxes
- ✅ "Create Campaign" and "Clear All" buttons visible

**Terminal Logs to Check:**
```
🔧 Tools for mode CONTACT_FINDER : 4 tools
🎯 Tool started: find_contacts
🔨 Tool complete: find_contacts
📦 Full input JSON: {"query": "CTO San Francisco", "maxResults": 5}
⚡ Executing action: FIND_CONTACTS
✅ Action result: success
📊 Result data: [{"id":"...","name":"...","company":"..."}]
```

**Database Verification:**
```sql
SELECT * FROM stagedContactList WHERE userId = 'your-user-id';
-- Should see 5 rows
```

---

### Test 2: Create Campaign (Approval Flow)

**Status:** ⏳ Pending

**Setup:**
- Complete Test 1 first (have staged contacts)

**Steps:**
1. In staging panel, ensure some/all contacts are selected
2. Click "Create Campaign" button
3. Wait for confirmation

**Expected Results:**
- [ ] Campaign created in database
- [ ] Staged contacts cleared from staging panel
- [ ] Staging panel disappears (no contacts to show)
- [ ] Success message shown
- [ ] Campaign appears in campaigns list (if navigating to `/campaigns`)

**Terminal Logs to Check:**
```
⚡ Executing action: APPROVE_STAGED_LIST
✅ Action result: success
```

**Database Verification:**
```sql
-- Check campaign created
SELECT * FROM Campaign WHERE userId = 'your-user-id' ORDER BY createdAt DESC LIMIT 1;

-- Check contacts moved to CRM
SELECT * FROM crm_Contacts WHERE campaignId = 'campaign-id-from-above';
-- Should see X contacts (X = number selected)

-- Check staged list cleared
SELECT * FROM stagedContactList WHERE userId = 'your-user-id';
-- Should be empty
```

**Possible Issues:**
- Button doesn't work → Check `onApprove` handler wired correctly
- Campaign not created → Check `approveService.approve()` implementation
- Contacts not moved → Check transaction in `approveList()`

---

### Test 3: Delete Staged Contact

**Status:** ⏳ Pending

**Setup:**
- Complete Test 1 first (have staged contacts)

**Steps:**
1. In staging panel, locate any contact
2. Click the X (delete) button on that contact's row
3. Wait for update

**Expected Results:**
- [ ] Contact removed from staging panel
- [ ] Other contacts still visible
- [ ] If last contact deleted, staging panel disappears
- [ ] Terminal shows successful deletion

**Terminal Logs to Check:**
```
⚡ Executing action: DELETE_STAGED_ROW
✅ Action result: success
```

**Database Verification:**
```sql
SELECT * FROM stagedContactList WHERE id = 'contact-id' AND userId = 'your-user-id';
-- Should have isDeleted = true OR be hard deleted
```

---

### Test 4: Clear All Staged Contacts

**Status:** ⏳ Pending

**Setup:**
- Complete Test 1 first (have staged contacts)

**Steps:**
1. In staging panel, click "Clear All" button
2. Wait for update

**Expected Results:**
- [ ] All contacts removed from staging panel
- [ ] Staging panel disappears
- [ ] Confirmation shown (optional, depending on implementation)

**Database Verification:**
```sql
SELECT * FROM stagedContactList WHERE userId = 'your-user-id' AND isDeleted = false;
-- Should be empty
```

---

### Test 5: Duplicate Detection

**Status:** ⏳ Pending

**Steps:**
1. Send: "Find 3 CTOs in San Francisco"
2. Wait for results (note the names/companies)
3. Send again: "Find 5 CTOs in San Francisco"
4. Check staging panel

**Expected Results:**
- [ ] No duplicate contacts appear
- [ ] Terminal logs show duplicate detection:
  ```
  Checking X candidates for duplicates
  Found Y duplicates (skipped)
  ```
- [ ] New unique contacts added to existing staged list
- [ ] Total contacts = (first search) + (new unique from second search)

**Duplicate Matching Strategies to Verify:**
- Email match (if contacts have same email)
- LinkedIn URL match (if contacts have same LinkedIn URL)
- Name + Company match (if both first name, last name, and company are identical)

**Database Check:**
```sql
SELECT email, linkedinUrl, CONCAT(firstName, ' ', lastName, ' - ', company)
FROM stagedContactList
WHERE userId = 'your-user-id' AND isDeleted = false;
-- Should see no duplicates
```

---

### Test 6: Smart Backfill

**Status:** ⏳ Pending

**Steps:**
1. Send: "Find 20 CTOs in a small city" (e.g., "Find 20 CTOs in Boise Idaho")
2. Watch terminal logs
3. Check staging panel

**Expected Results:**
- [ ] Terminal shows multiple search iterations:
  ```
  Iteration 1: Searching for 20 contacts
  Found 8 results, 2 duplicates, 6 unique
  Iteration 2: Searching for 14 more contacts (20 - 6)
  Found 7 results, 1 duplicate, 6 unique (total: 12)
  Iteration 3: Searching for 8 more contacts
  Found 5 results, 0 duplicates, 5 unique (total: 17)
  Max iterations reached (3)
  ```
- [ ] Staging panel shows <= 20 contacts (may be less if search exhausted)
- [ ] Backend stops after max 3 iterations

**Code Reference:**
```typescript
// In findContacts.ts
const MAX_ITERATIONS = 3
while (uniqueContacts.length < targetCount && iteration < MAX_ITERATIONS) {
  iteration++
  // ...search and filter...
}
```

---

## Medium Priority Tests

### Test 7: GENERAL_MANAGER Mode - Query Contacts

**Status:** ⏳ Pending

**Steps:**
1. Switch mode to GENERAL_MANAGER
   - Check localStorage: `localStorage.setItem('aiMode', 'GENERAL_MANAGER')`
   - Or use mode selector UI if implemented
2. Send: "Show me all contacts in NEW stage"
3. Wait for response

**Expected Results:**
- [ ] Claude uses `query_contacts` tool
- [ ] Terminal shows: `🎯 Tool started: query_contacts`
- [ ] Results displayed in chat or UI
- [ ] No staging panel (query is read-only)

**Verify Mode Restrictions:**
- [ ] Send: "Delete all contacts" → Should fail with mode error
- [ ] Terminal: `❌ Error: Action "DELETE_CONTACTS" requires mode: ASSISTANT`

**Available Tools in GENERAL_MANAGER:**
- query_contacts ✓
- show_staged_results ✓
- create_saved_view ✓
- find_contacts ✗
- delete_contacts ✗
- move_stage ✗

---

### Test 8: GENERAL_MANAGER Mode - Show Staged Results

**Status:** ⏳ Pending

**Setup:**
- Have staged contacts (switch to CONTACT_FINDER, run Test 1, then switch back)

**Steps:**
1. Ensure mode is GENERAL_MANAGER
2. Send: "Show me the staged contacts"
3. Wait for response

**Expected Results:**
- [ ] Claude uses `show_staged_results` tool
- [ ] Staged contacts displayed
- [ ] Read-only view (no approve button)

---

### Test 9: GENERAL_MANAGER Mode - Create Saved View

**Status:** ⏳ Pending

**Steps:**
1. Ensure mode is GENERAL_MANAGER
2. Send: "Save a view for contacts in NEW stage with the name 'New Leads'"
3. Wait for response

**Expected Results:**
- [ ] Claude uses `create_saved_view` tool
- [ ] Terminal shows success
- [ ] View saved (check database or saved views UI)

**Database Verification:**
```sql
-- If using real implementation:
SELECT * FROM savedViews WHERE userId = 'your-user-id' AND name = 'New Leads';
```

**Note:** Currently stub implementation, so may just return success without persisting.

---

### Test 10: ASSISTANT Mode - Move Contact Stage

**Status:** ⏳ Pending

**Prerequisites:**
- Have a contact in CRM with known ID

**Steps:**
1. Switch mode to ASSISTANT
2. Send: "Move contact [contact-id] to CONTACTED stage"
3. Wait for response

**Expected Results:**
- [ ] Claude uses `move_stage` tool
- [ ] Terminal shows success
- [ ] Contact stage updated in database

**Database Verification:**
```sql
SELECT id, connection_stage FROM crm_Contacts WHERE id = 'contact-id';
-- connection_stage should be 'CONTACTED'
```

**Note:** Currently stub implementation.

---

### Test 11: ASSISTANT Mode - Update Contact Field

**Status:** ⏳ Pending

**Steps:**
1. Switch mode to ASSISTANT
2. Send: "Update the email for contact [contact-id] to newemail@example.com"
3. Wait for response

**Expected Results:**
- [ ] Claude uses `update_field` tool
- [ ] Terminal shows success
- [ ] Field updated in database

**Note:** Currently stub implementation.

---

### Test 12: ASSISTANT Mode - Bulk Update

**Status:** ⏳ Pending

**Steps:**
1. Switch mode to ASSISTANT
2. Send: "Update all contacts in NEW stage to set their status to REVIEWED"
3. Wait for confirmation dialog
4. Confirm action

**Expected Results:**
- [ ] Claude uses `bulk_update` tool
- [ ] **Confirmation dialog appears** (dangerous action)
- [ ] After confirmation, bulk update executes
- [ ] Terminal shows count: `Updated X contacts`

**Note:** Currently stub implementation.

---

### Test 13: ASSISTANT Mode - Delete Contacts (Confirmation Flow)

**Status:** ⏳ Pending

**Steps:**
1. Switch mode to ASSISTANT
2. Send: "Delete contact [contact-id]"
3. Wait for confirmation dialog
4. Test both scenarios:
   a. Click "Cancel" → action NOT executed
   b. Click "Confirm" → action executed

**Expected Results:**

**Scenario A (Cancel):**
- [ ] Confirmation dialog shows: "Delete 1 contact? This cannot be undone."
- [ ] Click Cancel
- [ ] Action does NOT execute
- [ ] Contact still exists in database

**Scenario B (Confirm):**
- [ ] Confirmation dialog shows
- [ ] Click Confirm
- [ ] Terminal shows: `⚡ Executing action: DELETE_CONTACTS` (second request with userConfirmed: true)
- [ ] Contact deleted from database

**Database Verification:**
```sql
SELECT * FROM crm_Contacts WHERE id = 'contact-id';
-- Should be deleted (or status = false)
```

**Code Flow:**
1. First request: `{ type: 'DELETE_CONTACTS', userConfirmed: false }`
2. Backend returns: `{ requiresConfirmation: true, confirmationMessage: "..." }`
3. Frontend shows dialog
4. User confirms
5. Second request: `{ type: 'DELETE_CONTACTS', userConfirmed: true }`
6. Backend executes deletion

**Note:** Currently stub implementation for contactService.

---

## Low Priority Tests

### Test 14: Error Handling - Invalid Query

**Status:** ⏳ Pending

**Steps:**
1. Send: "" (empty string)
2. Or send: "Find 0 contacts"

**Expected Results:**
- [ ] Validation error shown
- [ ] No search executed
- [ ] User-friendly error message

---

### Test 15: Error Handling - SerpAPI Failure

**Status:** ⏳ Pending

**Steps:**
1. Temporarily break SERPAPI_API_KEY in `.env.local`
2. Restart server
3. Send: "Find 5 CTOs"

**Expected Results:**
- [ ] Terminal shows: `❌ Error: SerpAPI request failed: 401 Unauthorized`
- [ ] Frontend shows tool_error event
- [ ] User sees error message in chat
- [ ] Chat continues working (no crash)

---

### Test 16: Error Handling - Approve with No Contacts

**Status:** ⏳ Pending

**Steps:**
1. Ensure staging panel is empty (no contacts)
2. Try to trigger approve action (if possible via chat)

**Expected Results:**
- [ ] Error message: "No staged contacts found"
- [ ] No campaign created

---

### Test 17: Edge Case - Zero Search Results

**Status:** ⏳ Pending

**Steps:**
1. Send: "Find CTOs in XYZ123NonExistentCity"

**Expected Results:**
- [ ] Terminal shows: `Found 0 results`
- [ ] No staging panel appears
- [ ] Claude responds: "No results found" or similar

---

### Test 18: Edge Case - Maximum Results (30+)

**Status:** ⏳ Pending

**Steps:**
1. Send: "Find 50 CTOs in San Francisco"

**Expected Results:**
- [ ] Backend caps at 30 results (hard limit)
- [ ] Terminal shows: `Capped maxResults from 50 to 30`
- [ ] 30 contacts in staging panel

**Code Reference:**
```typescript
const targetCount = Math.min(maxResults, 30) // Hard limit of 30
```

---

### Test 19: Edge Case - Special Characters in Query

**Status:** ⏳ Pending

**Steps:**
1. Send: "Find CTOs in São Paulo"
2. Send: "Find CTOs at company 'O'Reilly Media'"

**Expected Results:**
- [ ] Special characters handled correctly
- [ ] Search executes without error
- [ ] Results returned

---

### Test 20: Edge Case - Rapid Successive Searches

**Status:** ⏳ Pending

**Steps:**
1. Send: "Find 5 CTOs in SF"
2. Immediately send: "Find 5 CTOs in NYC" (before first completes)
3. Immediately send: "Find 5 CTOs in Austin"

**Expected Results:**
- [ ] All three searches execute
- [ ] No race conditions
- [ ] Staging panel shows combined unique results from all three
- [ ] Or: Each search replaces previous (depending on implementation)

---

### Test 21: Edge Case - Browser Refresh During Search

**Status:** ⏳ Pending

**Steps:**
1. Send: "Find 20 CTOs in San Francisco"
2. Immediately refresh browser (before results arrive)

**Expected Results:**
- [ ] Search completes on backend
- [ ] After refresh, staged contacts may or may not appear (depends on persistence)
- [ ] No crashes or errors
- [ ] Can perform new search

---

### Test 22: Selection - Select All / Deselect All

**Status:** ⏳ Pending

**Setup:**
- Complete Test 1 (have staged contacts)

**Steps:**
1. Click "Select All" checkbox in header
2. Verify all contacts selected
3. Click again to deselect all
4. Verify all contacts deselected

**Expected Results:**
- [ ] Select All: All contact checkboxes checked
- [ ] Deselect All: All contact checkboxes unchecked
- [ ] Individual selections still work after select/deselect all

---

### Test 23: Selection - Partial Selection

**Status:** ⏳ Pending

**Setup:**
- Complete Test 1 (have 5+ staged contacts)

**Steps:**
1. Select contacts 1, 3, and 5 (skip 2 and 4)
2. Click "Create Campaign"

**Expected Results:**
- [ ] Only selected contacts (1, 3, 5) moved to campaign
- [ ] Unselected contacts (2, 4) remain in staging panel
- [ ] Campaign has exactly 3 contacts

**Database Verification:**
```sql
SELECT COUNT(*) FROM crm_Contacts WHERE campaignId = 'new-campaign-id';
-- Should be 3
```

---

## Test Execution Guide

### Quick Smoke Test (10 minutes)

Run these tests in order:
1. Test 1: Find Contacts Flow ✅
2. Test 2: Create Campaign ⏳
3. Test 3: Delete Staged Contact ⏳

### Standard Test Suite (30 minutes)

Add these to quick smoke test:
4. Test 5: Duplicate Detection ⏳
5. Test 7: GENERAL_MANAGER Mode ⏳
6. Test 13: Confirmation Flow ⏳

### Comprehensive Test (1 hour)

Run all High Priority tests (1-6) plus:
- Test 7-9: GENERAL_MANAGER mode
- Test 13: Confirmation flow
- Test 22-23: Selection flows

### Full Regression (2+ hours)

Run all tests in this document.

---

## Known Issues

### Issue 1: Stub Services

**Affected Tests:** 8, 9, 10, 11, 12, 13

**Status:** 🚧 Blocked

**Description:**
- `contactService` is currently a stub (always returns empty data)
- `savedViewService` is currently a stub (doesn't persist)
- `stageExecutors` are stubs (don't process campaigns)

**Impact:**
- ASSISTANT mode tools (move_stage, update_field, bulk_update, delete_contacts) won't actually modify database
- GENERAL_MANAGER saved views won't persist
- Campaign pipeline stages won't execute

**Resolution:** Implement real services with Prisma

---

## Testing Tools

### Database Queries (Useful for Verification)

```sql
-- Check staged contacts
SELECT * FROM stagedContactList WHERE userId = 'your-user-id' AND isDeleted = false;

-- Check campaigns
SELECT * FROM Campaign WHERE userId = 'your-user-id' ORDER BY createdAt DESC;

-- Check CRM contacts
SELECT * FROM crm_Contacts WHERE assigned_to = 'your-user-id';

-- Check campaign runs
SELECT * FROM campaignRun WHERE campaignId = 'campaign-id';

-- Clear staged contacts (for fresh test)
DELETE FROM stagedContactList WHERE userId = 'your-user-id';
```

### Terminal Log Patterns to Watch

```bash
# Successful tool call
🔧 Tools for mode CONTACT_FINDER : 4 tools
🎯 Tool started: find_contacts
🔨 Tool complete: find_contacts
⚡ Executing action: FIND_CONTACTS
✅ Action result: success
📊 Result data: [...]

# Failed tool call
❌ Error: <error message>

# Confirmation required
🎯 Tool started: delete_contacts
⚡ Executing action: DELETE_CONTACTS
⚠️ Confirmation required: Delete 5 contacts? This cannot be undone.
```

---

## Next Steps

1. **Execute High Priority Tests (1-6)**
   - Mark status as ✅ Passed or ❌ Failed
   - Document any issues found
   - Fix critical bugs

2. **Implement Real Services**
   - Replace contactService stub
   - Replace savedViewService stub
   - Unblock Tests 8-13

3. **Create Automated E2E Tests**
   - Use Playwright for critical flows
   - Convert Tests 1, 2, 5, 13 to automated tests
   - Run in CI/CD

4. **Document Test Results**
   - Update this document with findings
   - Create bug reports for failures
   - Update architecture doc with learnings

---

## Related Documentation

- [Tool Calling Architecture](../architecture/tool-calling.md) - System overview
- [Integration Fixes](../changes/2026-02-01-integration-fixes.md) - Issues fixed during integration
- [Orchestration Status](../../status/ORCHESTRATION.md) - Sprint tracking
