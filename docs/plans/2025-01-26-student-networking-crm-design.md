# Student Networking CRM - Design Document

**Created:** 2025-01-26
**Status:** Approved

## Overview

Build a networking CRM for college students by extending NextCRM with:
- Hunter API for email finding
- AI-powered personalized inserts
- Gmail draft creation
- Customizable columns
- Sent email detection

## Architecture

```
NextCRM (forked)
├── Core CRM functionality (contacts, auth, UI)
├── MongoDB database
└── shadcn components

Custom additions:
├── /api/hunter/find-email     → Hunter API
├── /api/personalization       → OpenAI/Anthropic
├── /api/drafts/create-gmail   → Gmail API
└── /api/gmail/sync-sent       → Sent detection
```

## Schema: crm_Contacts

### Locked Columns (system-defined)
- first_name, last_name (required)
- email
- email_confidence (HIGH/MEDIUM/LOW)
- company
- position (title)
- personalized_insert
- insert_confidence (HIGH/MEDIUM/LOW)
- email_status (blank/drafted/sent)
- draft_created_at
- sent_at
- connection_level (Message Sent/Connected/In Touch/Friends)
- campaign

### Custom Columns (user-defined)
- Stored in `custom_fields` JSON field
- Users can add: Industry, Notes, LinkedIn URL, etc.

## Sent Email Detection

**Method:** Gmail API polling + manual fallback

1. On page load (or every 5 min), call Gmail API
2. Get Sent folder messages from last 24 hours
3. Match subject + recipient to contacts with status="drafted"
4. If match → update status="sent", sent_at=now
5. Fallback: "Mark as Sent" button

## Implementation Phases

### Phase 1: Fork & Setup (1 day)
- Fork NextCRM into Project_Contact_Build
- Set up MongoDB Atlas
- Configure environment
- Strip unused features

### Phase 2: Schema + UI (2 days)
- Add workflow fields to prisma schema
- Update contact table columns
- Add connection level dropdown
- Add custom_fields JSON support
- Add "+ Add Column" UI

### Phase 3: Hunter API (2 days)
- Create /api/hunter/find-email endpoint
- Store user's Hunter API key
- "Find Email" button per contact
- Bulk action

### Phase 4: Personalization (2 days)
- Create /api/personalization/generate endpoint
- OpenAI/Anthropic integration
- "Generate Insert" button per contact
- Bulk action

### Phase 5: Gmail Drafts (2 days)
- Add Gmail OAuth
- Create /api/drafts/create-gmail endpoint
- "Create Draft" button per contact
- Update status to "drafted"

### Phase 6: Sent Detection (1 day)
- Create /api/gmail/sync-sent endpoint
- Poll Gmail Sent folder
- Match and update contact status
- "Mark as Sent" manual fallback

### Phase 7: Dashboard + Deploy (2 days)
- Funnel view (Contacts → Drafted → Sent → Connected)
- Connection level tabs/filters
- Deploy to Vercel
- Production MongoDB

## Timeline

| Phase | Days |
|-------|------|
| Setup | 1 |
| Schema + UI | 2 |
| Hunter | 2 |
| Personalization | 2 |
| Gmail Drafts | 2 |
| Sent Detection | 1 |
| Dashboard + Deploy | 2 |
| **Total** | **12 days** |

## Tech Stack

- Framework: Next.js 15
- UI: shadcn + Tailwind
- Database: MongoDB Atlas
- ORM: Prisma
- Auth: Auth.js
- APIs: Hunter, Gmail, OpenAI
- Deploy: Vercel
