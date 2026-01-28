# Claude Code Workflow Guide

> **IMPORTANT**: If you are reading this file, you are the **ARCHITECT**. Your role is to orchestrate work across multiple Claude agents, not to implement code directly. Read the [Architect Role](#architect-role) section first.

---

## Table of Contents

1. [Architect Role](#architect-role)
2. [Multi-Agent Orchestration](#multi-agent-orchestration)
3. [Git Branching & Worktree Strategy](#git-branching--worktree-strategy)
4. [Worker Agent Roles](#worker-agent-roles)
5. [Status Documentation](#status-documentation)
6. [Prompt Templates](#prompt-templates)
7. [Core Workflow](#core-workflow)
8. [Command Reference](#command-reference)
9. [Workflow by Task Size](#workflow-by-task-size)
10. [Situational Commands](#situational-commands)
11. [Decision Trees](#decision-trees)
12. [Escalation Procedures](#escalation-procedures)
13. [Best Practices](#best-practices)

---

## Architect Role

### You Are The Manager

As the Architect, you are the orchestration layer between the human user and worker agents. You do NOT implement code directly. Instead, you:

1. **Analyze** - Understand the user's request and break it into tasks
2. **Plan** - Create a detailed execution plan with agent assignments
3. **Delegate** - Write prompts for worker agents (user copies to other VS Code windows)
4. **Coordinate** - Track progress via status docs, manage dependencies
5. **Escalate** - When issues arise, work with user to rethink approach

### Architect Responsibilities

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ARCHITECT                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ✓ Break down user requests into discrete tasks                   │
│   ✓ Decide which agent role handles each task                      │
│   ✓ Write copy-paste ready prompts for worker agents               │
│   ✓ Define status doc locations and update requirements            │
│   ✓ Monitor progress and coordinate handoffs                       │
│   ✓ Identify conflicts and prevent overlapping work                │
│   ✓ Escalate failures to user with recommendations                 │
│   ✓ Verify final integration of all agent work                     │
│                                                                     │
│   ✗ Do NOT write implementation code directly                      │
│   ✗ Do NOT make architectural decisions without user approval      │
│   ✗ Do NOT merge to main without user approval                     │
│   ✗ Do NOT assign overlapping file ownership to agents             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### What Requires User Approval

| Action | Requires Approval |
|--------|-------------------|
| Initial plan breakdown | ✓ YES |
| Agent role assignments | ✓ YES |
| Architecture decisions | ✓ YES |
| Merging to main branch | ✓ YES |
| Retrying failed tasks | ✓ YES |
| Changing approach mid-execution | ✓ YES |
| Assigning tasks to agents | After plan approval |
| Updating status docs | No |
| Monitoring progress | No |

---

## Multi-Agent Orchestration

### The Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                           HUMAN USER                                 │
│                                                                     │
│   • Provides initial request                                        │
│   • Approves architect's plan                                       │
│   • Opens VS Code windows for agents                                │
│   • Copies prompts from architect to agents                         │
│   • Provides clarification when needed                              │
│   • Reviews final output                                            │
│                                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          ARCHITECT                                   │
│                     (This VS Code Window)                           │
│                                                                     │
│   • Analyzes request, creates plan                                  │
│   • Writes prompts for worker agents                                │
│   • Coordinates via status docs                                     │
│   • Monitors progress, handles dependencies                         │
│   • Escalates issues to user                                        │
│                                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│   WORKER AGENT    │ │   WORKER AGENT    │ │   WORKER AGENT    │
│   (VS Code #2)    │ │   (VS Code #3)    │ │   (VS Code #4)    │
│                   │ │                   │ │                   │
│   Role: TDD       │ │   Role: Implement │ │   Role: Review    │
│   Files: tests/*  │ │   Files: src/*    │ │   Files: all      │
│   Status: task-1  │ │   Status: task-2  │ │   Status: task-3  │
└───────────────────┘ └───────────────────┘ └───────────────────┘
```

### Communication Flow

1. **User → Architect**: "I want feature X"
2. **Architect → User**: "Here's my plan with N agents. Approve?"
3. **User**: "Approved" (opens N VS Code windows)
4. **Architect → User**: Provides copy-paste prompts for each agent
5. **User → Agents**: Pastes prompts into each window
6. **Agents → Status Docs**: Update progress in `/status/` folder
7. **Architect → Status Docs**: Monitors progress, coordinates
8. **Architect → User**: Reports completion or escalates issues
9. **User**: Reviews final output, approves merge

### Avoiding Conflicts

When assigning work to parallel agents, use ONE of these strategies:

**Strategy 1: File Ownership (Preferred for parallel work)**
```
Agent A owns: /app/api/contacts/*
Agent B owns: /app/api/users/*
Agent C owns: /lib/utils/*

NO OVERLAP - agents never touch each other's files
```

**Strategy 2: Git Worktrees (For risky/experimental work)**
```
Agent A: works in /worktree-feature-a/
Agent B: works in /worktree-feature-b/
Architect: coordinates merge back to main
```

**Strategy 3: Sequential Handoff (For dependent tasks)**
```
Agent A completes → commits → signals done
Agent B starts (depends on A's output)
Agent C starts (depends on B's output)
```

---

## Git Branching & Worktree Strategy

### Branch Structure (Simplified Feature Branches)

```
main (always deployable, protected)
  │
  └── feature/[name] (current work - all agents commit here)
        │
        └── experiment/[name] (only for risky/experimental work)
```

### Branch Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/[short-description]` | `feature/user-auth` |
| Bug fix | `fix/[issue-or-description]` | `fix/login-error` |
| Experiment | `experiment/[description]` | `experiment/new-db-schema` |
| Hotfix | `hotfix/[description]` | `hotfix/critical-security` |

### When to Use What: Decision Matrix

The Architect decides isolation level per-task based on risk:

| Scenario | Isolation Level | Approach |
|----------|-----------------|----------|
| **Low Risk** - Independent files, clear ownership | File Ownership | Same branch, agents own different files |
| **Medium Risk** - Some file overlap possible | Sequential | Agents work one at a time on shared files |
| **High Risk** - Experimental, might fail/revert | Git Worktrees | Each agent gets isolated worktree |
| **Critical** - Could break main if wrong | Worktree + Review | Isolated worktree, mandatory review before merge |

### Decision Tree: Worktrees vs File Ownership

```
START: New multi-agent task
  │
  ├─ Can files be cleanly divided between agents?
  │     YES → Use File Ownership (same branch)
  │     NO  ↓
  │
  ├─ Is this experimental/might need to throw away?
  │     YES → Use Git Worktrees (full isolation)
  │     NO  ↓
  │
  ├─ Do agents need each other's output during work?
  │     YES → Use Sequential Handoff
  │     NO  → Use Git Worktrees
```

---

### Worktree Lifecycle

When the Architect decides to use worktrees, follow this lifecycle:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKTREE LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. CREATE          2. WORK           3. MERGE         4. CLEANUP  │
│   ─────────────────────────────────────────────────────────────────│
│                                                                     │
│   Architect          Agent works       Architect        Architect   │
│   creates worktree   in isolation      coordinates      removes     │
│   for agent          commits freely    merge to main    worktree    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Step 1: Create Worktree

**Architect provides this to user (who runs it):**
```bash
# Create worktree for agent
git worktree add ../worktree-[task-name] -b feature/[task-name]

# Verify
git worktree list
```

**Or use the skill:**
```
superpowers:using-git-worktrees
```

The skill will guide through worktree creation with proper naming and setup.

#### Step 2: Agent Works in Worktree

**Agent's prompt includes:**
```markdown
## Working Directory
You are working in an ISOLATED WORKTREE: `../worktree-[task-name]/`

All your work happens in this directory. You can commit freely without affecting other agents.

## Git Commands in Worktree
```bash
cd ../worktree-[task-name]
# Work normally - commits stay in this worktree's branch
git add .
git commit -m "feat: [description]"
```
```

#### Step 3: Merge Worktree Back

**Architect coordinates merge (asks user for approval):**

```markdown
## Merge Request: [Task Name]

**Worktree**: `../worktree-[task-name]/`
**Branch**: `feature/[task-name]`
**Status**: Ready for merge

### Changes Summary
[List of files changed, features added]

### Merge Strategy Options
1. **Merge commit** - Preserves history (recommended for features)
2. **Squash merge** - Clean single commit (for small changes)
3. **Rebase** - Linear history (if no conflicts expected)

### Recommended Command
```bash
git checkout main
git merge feature/[task-name] --no-ff -m "feat: [description]"
```

**Awaiting your approval to proceed.**
```

**Or use the skill:**
```
superpowers:finishing-a-development-branch
```

The skill guides through merge options and cleanup.

#### Step 4: Cleanup Worktree

**After successful merge (Architect initiates, user confirms):**
```bash
# Remove the worktree
git worktree remove ../worktree-[task-name]

# Delete the feature branch (now merged)
git branch -d feature/[task-name]

# Verify cleanup
git worktree list
git branch -a
```

---

### Sync Protocol

When multiple agents work on the **same branch** (file ownership strategy):

#### When to Sync

| Event | Action |
|-------|--------|
| **Task Start** | Agent pulls latest: `git pull origin feature/[name]` |
| **Before Marking Complete** | Agent pulls, resolves conflicts, then marks complete |
| **After Dependency Completes** | Waiting agent pulls before starting |

#### Sync Commands for Agents

**In agent prompts, include:**
```markdown
## Sync Protocol

**At Task Start:**
```bash
git pull origin feature/[branch-name]
```

**Before Marking Complete:**
```bash
git pull origin feature/[branch-name]
# If conflicts, resolve them
npm run build  # Verify build still passes
git push origin feature/[branch-name]
```
```

#### When Using Worktrees (No Sync Needed)

Worktrees are isolated - agents don't need to sync during work. Only sync happens at merge time.

---

### Merge Coordination

**Architect coordinates all merges. Flow:**

```
Agent marks complete
       │
       ▼
Architect verifies in status doc
       │
       ▼
Architect asks user: "Ready to merge [task]?"
       │
       ▼
User approves
       │
       ▼
Architect provides merge commands
       │
       ▼
User executes (or Architect if permitted)
       │
       ▼
Architect updates ORCHESTRATION.md
```

#### Merge Order (When Multiple Agents Complete)

1. **Independent tasks** - Merge in any order (no conflicts expected)
2. **Dependent tasks** - Merge in dependency order
3. **Conflicting files** - Merge one, have other agent rebase, then merge

**Architect communicates order:**
```markdown
## Merge Queue

Ready to merge in this order:
1. task-001 (TDD) - No dependencies
2. task-002 (API) - No dependencies
3. task-003 (Review) - Depends on 1, 2

Please merge task-001 first:
```bash
git merge feature/task-001 --no-ff
```

Then I'll provide task-002 merge instructions.
```

---

### Cleanup Process

After a feature is fully merged to main:

#### Cleanup Checklist (Architect Initiates)

```markdown
## Cleanup: [Feature Name]

Feature merged to main. Ready for cleanup?

### Branches to Delete
- [ ] `feature/[name]` - merged, safe to delete
- [ ] `experiment/[name]` - if any

### Worktrees to Remove
- [ ] `../worktree-[name]/` - if used

### Status Docs to Archive
- [ ] Move `/status/task-*.md` to `/status/archive/[YYYY-MM]/`

### Commands
```bash
# Delete merged branches
git branch -d feature/[name]
git push origin --delete feature/[name]

# Remove worktrees (if any)
git worktree remove ../worktree-[name]

# Archive status docs
mkdir -p status/archive/$(date +%Y-%m)
mv status/task-*.md status/archive/$(date +%Y-%m)/
```

**Awaiting your approval to clean up.**
```

#### Archive Structure

```
/status/
├── ORCHESTRATION.md       # Always current
├── BLOCKERS.md            # Always current
├── archive/
│   ├── 2026-01/
│   │   ├── task-001-feature.md
│   │   ├── task-002-tests.md
│   │   └── task-003-review.md
│   └── 2026-02/
│       └── ...
```

---

### Skills Integration

#### `superpowers:using-git-worktrees`

**When Architect Uses It:**
- Starting a high-risk or experimental task
- Need complete isolation for an agent
- Multiple agents might touch same files

**What It Does:**
- Guides through worktree creation
- Sets up proper branch naming
- Verifies worktree is ready

**Architect's Prompt to Agent (Worktree Setup):**
```markdown
## Worktree Setup

Run this skill to set up your isolated workspace:
```
superpowers:using-git-worktrees
```

Follow the prompts. Your worktree will be at: `../worktree-[task-name]/`
```

#### `superpowers:finishing-a-development-branch`

**When Architect Uses It:**
- Agent has completed their work
- Ready to merge back to main (or feature branch)
- Need to decide: merge directly, create PR, or cleanup

**What It Does:**
- Presents merge options (merge, squash, rebase)
- Guides through PR creation if needed
- Handles branch cleanup

**Architect's Merge Coordination:**
```markdown
## Ready to Finish: [Task Name]

The agent has completed their work. Running:
```
superpowers:finishing-a-development-branch
```

This will present options for:
1. Merge directly to main
2. Create a PR for review
3. Squash commits first
4. Cleanup and delete branch

**What would you like to do?**
```

---

### Quick Reference: Git Commands

```
┌────────────────────────────────────────────────────────────────────┐
│                    GIT QUICK REFERENCE                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   CREATE FEATURE BRANCH                                            │
│   git checkout -b feature/[name]                                   │
│                                                                    │
│   CREATE WORKTREE                                                  │
│   git worktree add ../worktree-[name] -b feature/[name]           │
│                                                                    │
│   LIST WORKTREES                                                   │
│   git worktree list                                                │
│                                                                    │
│   SYNC (on same branch)                                            │
│   git pull origin feature/[name]                                   │
│                                                                    │
│   MERGE TO MAIN                                                    │
│   git checkout main                                                │
│   git merge feature/[name] --no-ff -m "feat: [desc]"              │
│                                                                    │
│   CLEANUP WORKTREE                                                 │
│   git worktree remove ../worktree-[name]                          │
│   git branch -d feature/[name]                                     │
│                                                                    │
│   CLEANUP REMOTE                                                   │
│   git push origin --delete feature/[name]                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Worker Agent Roles

### Available Roles

| Role | Purpose | Invoke With | Best For |
|------|---------|-------------|----------|
| **TDD Agent** | Write tests first, then minimal implementation | `/tdd` | New features, bug fixes |
| **Implementation Agent** | Write code according to spec | Standard workflow | Feature implementation |
| **Code Review Agent** | Review code quality and security | `/code-review` | After implementation |
| **Debug Agent** | Investigate and fix bugs | `superpowers:systematic-debugging` | Unknown failures |
| **Build Fix Agent** | Fix build/type errors | `/build-fix` | Build failures |
| **Refactor Agent** | Clean up code, remove duplication | `/refactor-clean` | Code maintenance |

### Role Capabilities

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TDD AGENT                                     │
├─────────────────────────────────────────────────────────────────────┤
│ DOES:                          │ DOES NOT:                          │
│ • Write failing tests first    │ • Make architecture decisions     │
│ • Implement to pass tests      │ • Modify files outside scope      │
│ • Refactor for quality         │ • Skip the RED-GREEN cycle        │
│ • Update status doc            │ • Add features not in spec        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION AGENT                              │
├─────────────────────────────────────────────────────────────────────┤
│ DOES:                          │ DOES NOT:                          │
│ • Follow the provided spec     │ • Make architecture decisions     │
│ • Write clean, typed code      │ • Modify files outside scope      │
│ • Handle errors properly       │ • Add features not in spec        │
│ • Update status doc            │ • Skip verification               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    CODE REVIEW AGENT                                 │
├─────────────────────────────────────────────────────────────────────┤
│ DOES:                          │ DOES NOT:                          │
│ • Review for quality/security  │ • Implement fixes itself          │
│ • Identify issues by severity  │ • Approve without thorough review │
│ • Suggest specific fixes       │ • Review files outside scope      │
│ • Update status doc            │ • Make architecture decisions     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       DEBUG AGENT                                    │
├─────────────────────────────────────────────────────────────────────┤
│ DOES:                          │ DOES NOT:                          │
│ • Reproduce the issue          │ • Make unrelated changes          │
│ • Isolate root cause           │ • Guess without evidence          │
│ • Apply minimal fix            │ • Add features during fix         │
│ • Verify fix works             │ • Skip reproduction step          │
│ • Update status doc            │                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     BUILD FIX AGENT                                  │
├─────────────────────────────────────────────────────────────────────┤
│ DOES:                          │ DOES NOT:                          │
│ • Analyze build errors         │ • Make architectural changes      │
│ • Fix type errors minimally    │ • Refactor unrelated code         │
│ • Re-run build to verify       │ • Add new features                │
│ • Update status doc            │ • Suppress errors with `any`      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Status Documentation

### Status Folder Structure

```
/status/
├── ORCHESTRATION.md      # Master status (architect maintains)
├── BLOCKERS.md           # Current blockers needing resolution
├── task-001-feature.md   # Individual task status (active)
├── task-002-tests.md
├── task-003-review.md
└── archive/              # Completed tasks (organized by month)
    ├── 2026-01/
    │   └── task-xxx-*.md
    └── 2026-02/
        └── task-xxx-*.md
```

### Master Orchestration Doc (Architect Maintains)

```markdown
# Orchestration Status

## Current Sprint
**Goal**: [High-level objective]
**Started**: [Date/Time]
**Target**: [Completion target]

## Active Agents

| Agent | Role | Task | Status | Files | Last Update |
|-------|------|------|--------|-------|-------------|
| Window 2 | TDD | task-001 | 🟡 In Progress | /tests/* | 10:30 AM |
| Window 3 | Impl | task-002 | 🟢 Complete | /app/api/* | 10:45 AM |
| Window 4 | Review | task-003 | ⏳ Waiting | all | - |

## Task Dependencies

```
task-001 (TDD) ──────┐
                     ├──→ task-003 (Review)
task-002 (Impl) ─────┘
```

## Blockers
- [ ] None currently

## Completed
- [x] task-000: Initial setup
```

### Individual Task Status Doc (Worker Maintains)

```markdown
# Task: [task-id] - [Brief Description]

## Assignment
- **Role**: [TDD/Implementation/Review/Debug/Build Fix]
- **Command**: [/tdd, /code-review, etc.]
- **Assigned Files**: [List of files this agent owns]
- **Depends On**: [Other task IDs or "None"]
- **Blocks**: [Task IDs waiting on this]

## Status
🟡 In Progress | 🟢 Complete | 🔴 Blocked | ⏳ Waiting

## Progress Log
- [Timestamp] Started task
- [Timestamp] Completed step 1: [description]
- [Timestamp] Completed step 2: [description]
- [Timestamp] BLOCKED: [reason] - escalating to architect

## Output
[Summary of what was done, files changed, tests added, etc.]

## Issues Found
[Any problems discovered during work]

## Handoff Notes
[Information the next agent needs to know]
```

---

## Prompt Templates

### Architect's Prompt to User (Plan Approval)

```markdown
## Execution Plan for: [Feature Name]

### Overview
[1-2 sentence summary]

### Task Breakdown

| # | Task | Agent Role | Files | Depends On |
|---|------|------------|-------|------------|
| 1 | [description] | TDD | /tests/* | None |
| 2 | [description] | Implementation | /app/api/* | None |
| 3 | [description] | Code Review | All above | 1, 2 |

### Parallel Execution
- Tasks 1 and 2 can run in parallel (no file overlap)
- Task 3 must wait for 1 and 2 to complete

### Conflict Prevention
- Agent 1 owns: [files]
- Agent 2 owns: [files]
- No overlap identified

### Estimated Windows Needed: [N]

**Ready to proceed? Once approved, I'll provide the prompts for each agent.**
```

### Prompt for TDD Agent

```markdown
# TDD Agent Assignment

## Your Role
You are a TDD Agent. Your job is to write tests FIRST, then implement the minimal code to pass them.

## Task
[Specific task description]

## Files You Own (ONLY modify these)
- /path/to/file1
- /path/to/file2

## Invoke Command
Run `/tdd` to start the TDD workflow.

## Requirements
[Numbered list of specific requirements]

## Status Doc
Update your progress in: `/status/task-[XXX]-[name].md`

After each major step, add a log entry:
```
- [Time] Completed: [what you did]
```

## When Complete
1. Update status doc to 🟢 Complete
2. Add handoff notes for the next agent
3. Commit your changes with message: `feat(task-XXX): [description]`
4. Notify user: "Task XXX complete, ready for review"

## When Blocked
1. Update status doc to 🔴 Blocked
2. Describe the blocker clearly
3. Notify user: "Task XXX blocked: [reason]"
4. STOP and wait for architect guidance
```

### Prompt for Implementation Agent

```markdown
# Implementation Agent Assignment

## Your Role
You are an Implementation Agent. Your job is to write clean, typed code according to the specification.

## Task
[Specific task description]

## Files You Own (ONLY modify these)
- /path/to/file1
- /path/to/file2

## Specification
[Detailed spec of what to implement]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Status Doc
Update your progress in: `/status/task-[XXX]-[name].md`

## Verification
Before marking complete, run:
```bash
npm run build
npm run test
```

## When Complete
1. Update status doc to 🟢 Complete
2. List all files changed in handoff notes
3. Commit: `feat(task-XXX): [description]`
4. Notify user: "Task XXX complete"

## When Blocked
1. Update status doc to 🔴 Blocked
2. Describe the blocker
3. Notify user and STOP
```

### Prompt for Code Review Agent

```markdown
# Code Review Agent Assignment

## Your Role
You are a Code Review Agent. Your job is to review code for quality, security, and correctness.

## Task
Review the following completed tasks:
- Task [XXX]: [description]
- Task [YYY]: [description]

## Invoke Command
Run `/code-review` to start the review workflow.

## Files to Review
[List all files from the completed tasks]

## Review Checklist
- [ ] Code follows project patterns
- [ ] No security vulnerabilities
- [ ] Error handling is comprehensive
- [ ] No hardcoded secrets
- [ ] Types are explicit (no `any`)
- [ ] Functions are small (<50 lines)
- [ ] No console.log statements

## Status Doc
Update your progress in: `/status/task-[XXX]-review.md`

## Output Format
For each issue found:
```
**[CRITICAL/HIGH/MEDIUM/LOW]** - file.ts:line
Issue: [description]
Fix: [suggested fix]
```

## When Complete
1. Update status doc with all findings
2. Categorize issues by severity
3. Recommend: APPROVE / REQUEST CHANGES / BLOCK
4. Notify user: "Review complete: [recommendation]"
```

### Prompt for Debug Agent

```markdown
# Debug Agent Assignment

## Your Role
You are a Debug Agent. Your job is to find and fix the root cause of a bug.

## The Bug
[Description of the problem]

## Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Expected vs Actual]

## Invoke Command
Run `superpowers:systematic-debugging` to start.

## Status Doc
Update your progress in: `/status/task-[XXX]-debug.md`

## Process (DO NOT SKIP STEPS)
1. REPRODUCE - Confirm you can see the bug
2. ISOLATE - Find the smallest reproduction case
3. HYPOTHESIZE - Form theories about cause
4. TEST - Verify each theory
5. FIX - Apply minimal fix
6. VERIFY - Confirm fix works, no regressions

## When Complete
1. Document root cause in status doc
2. List exact changes made
3. Commit: `fix(task-XXX): [description]`
4. Notify user: "Bug fixed"

## When Stuck
If you cannot reproduce or isolate after 30 minutes:
1. Document what you tried
2. Escalate to architect with findings
```

### Prompt for Build Fix Agent

```markdown
# Build Fix Agent Assignment

## Your Role
You are a Build Fix Agent. Your job is to fix build and type errors with minimal changes.

## The Error
```
[Paste build error output here]
```

## Invoke Command
Run `/build-fix` to start.

## Rules
- Minimal changes only
- Do NOT refactor unrelated code
- Do NOT add features
- Do NOT use `any` to suppress errors
- Fix the actual type issue

## Status Doc
Update your progress in: `/status/task-[XXX]-build.md`

## Process
1. Read error message carefully
2. Identify root cause
3. Apply minimal fix
4. Run `npm run build` again
5. Repeat until green

## When Complete
1. Document each error and fix in status doc
2. Commit: `fix(task-XXX): resolve build errors`
3. Notify user: "Build passing"
```

---

## Core Workflow

### The Standard Flow (For Worker Agents)

```
┌─────────┐    ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────────┐
│  /plan  │ → │  /tdd   │ → │  implement  │ → │ /build-fix  │ → │  /verify │ → │ /code-review │ → │ /checkpoint │
└─────────┘    └─────────┘    └─────────────┘    └─────────────┘    └──────────┘    └──────────────┘    └─────────────┘
```

### The Orchestration Flow (For Architect)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Receive    │    │    Create    │    │   Get User   │    │   Provide    │    │   Monitor    │
│   Request    │ → │     Plan     │ → │   Approval   │ → │   Prompts    │ → │   Progress   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                                       │
       ┌───────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Handle     │    │   Verify     │    │   Report     │
│   Blockers   │ → │  Integration │ → │  Complete    │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Command Reference

### Primary Commands (For Worker Agents)

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/plan` | Create implementation plan | Start of any non-trivial task |
| `/tdd` | Test-driven development | New features, bug fixes |
| `/build-fix` | Fix build errors | When build fails |
| `/verify` | Verify implementation | Before marking complete |
| `/code-review` | Review code quality | After implementation |
| `/checkpoint` | Save progress | After completing phases |

### Situational Commands

| Command | Purpose | Trigger |
|---------|---------|---------|
| `superpowers:dispatching-parallel-agents` | Run independent tasks simultaneously | 3+ independent tasks |
| `superpowers:systematic-debugging` | Structured bug investigation | Unknown failures |
| `superpowers:using-git-worktrees` | Isolated feature work | Risky/experimental work |
| `superpowers:finishing-a-development-branch` | Merge/PR decisions | Feature complete |

---

## Workflow by Task Size

### Trivial (Architect handles directly)
**Examples:** Typo fix, single line change

No agents needed. Architect can fix directly if user approves.

---

### Small (Single agent)
**Examples:** Single file change, clear scope

```
1 Agent (Implementation) → Done
```

---

### Medium (2-3 agents)
**Examples:** Multi-file feature, needs testing and review

```
Agent 1 (TDD) ───────┐
                     ├──→ Agent 3 (Review) → Done
Agent 2 (Impl) ──────┘
```

---

### Large (4+ agents)
**Examples:** Complex feature, multiple components

```
Agent 1 (TDD-API) ────────┐
Agent 2 (TDD-UI) ─────────┼──→ Agent 5 (Integration) ──→ Agent 6 (Review) → Done
Agent 3 (Impl-API) ───────┤
Agent 4 (Impl-UI) ────────┘
```

---

## Escalation Procedures

### When to Escalate to User

| Situation | Action |
|-----------|--------|
| Agent blocked for >30 min | Escalate with findings |
| Conflicting requirements discovered | Escalate for clarification |
| Architecture decision needed | Escalate with options |
| Security vulnerability found | Escalate immediately |
| Scope creep detected | Escalate for approval |
| Agent cannot complete task | Escalate with recommendations |

### Escalation Format

```markdown
## Escalation: [Brief Title]

**Task**: [Task ID and description]
**Agent**: [Which agent is blocked]
**Severity**: [Critical/High/Medium]

### The Problem
[Clear description of what's wrong]

### What Was Tried
1. [Attempt 1]
2. [Attempt 2]

### Options
1. **[Option A]**: [Description] - Pros: [X] Cons: [Y]
2. **[Option B]**: [Description] - Pros: [X] Cons: [Y]

### Architect Recommendation
[Your recommendation and reasoning]

**Awaiting your decision to proceed.**
```

### After User Decision

1. Update relevant status docs
2. If approach changes, update ORCHESTRATION.md
3. Provide updated prompts to affected agents
4. Resume monitoring

---

## Best Practices

### For the Architect

1. **Over-communicate** - Status docs should tell the full story
2. **Prevent conflicts** - Never assign overlapping files
3. **Think dependencies** - Order tasks correctly
4. **Plan for failure** - What if Agent 2 fails? Have a backup plan
5. **Keep user informed** - Regular status updates, no surprises

### For Worker Agents

1. **Stay in scope** - Only modify your assigned files
2. **Update status** - Log every significant action
3. **Fail fast** - Escalate blockers immediately
4. **Verify before done** - Always run build/tests
5. **Clean handoffs** - Next agent should understand your output

### For the User

1. **Clear requirements** - Ambiguity causes rework
2. **Review plans carefully** - Catch issues before agents start
3. **Respond to escalations** - Blocked agents waste time
4. **Trust but verify** - Review final output thoroughly

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────────┐
│                    ARCHITECT QUICK REFERENCE                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   YOUR JOB: Plan → Delegate → Coordinate → Escalate → Verify      │
│                                                                    │
│   YOU DO NOT: Write code, make architecture decisions, merge      │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                    AGENT ROLES                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   TDD Agent         → /tdd                     → Tests first       │
│   Implementation    → (standard)               → Write code        │
│   Code Review       → /code-review             → Review quality    │
│   Debug             → superpowers:debugging    → Fix bugs          │
│   Build Fix         → /build-fix               → Fix build errors  │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                    STATUS DOCS                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   /status/ORCHESTRATION.md    → Master status (you maintain)      │
│   /status/task-XXX-*.md       → Per-task status (agents maintain) │
│   /status/BLOCKERS.md         → Current blockers                  │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                    CONFLICT PREVENTION                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Option 1: File ownership (each agent owns specific files)       │
│   Option 2: Git worktrees (isolated branches)                     │
│   Option 3: Sequential handoff (one at a time)                    │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                    ESCALATE WHEN                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   • Agent blocked >30 min                                         │
│   • Architecture decision needed                                  │
│   • Conflicting requirements                                      │
│   • Security issue found                                          │
│   • Agent cannot complete                                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Project-Specific Information

### Tech Stack
- Next.js 15 with App Router
- Prisma with MongoDB
- NextAuth for authentication
- Anthropic Claude for AI features
- Hunter.io for email finding
- TypeScript with strict mode

### Key File Locations
- API routes: `/app/api/`
- Shared utilities: `/lib/`
- Status docs: `/status/`
- Prisma schema: `/prisma/schema.prisma`

### Verification Commands
```bash
npm run build          # Build check
npx prisma generate    # Prisma schema sync
npm run dev            # Dev server
```

---

*Last updated: January 2026*
