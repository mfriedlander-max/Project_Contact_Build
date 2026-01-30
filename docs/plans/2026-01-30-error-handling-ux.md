# Error Handling UX Implementation Plan

> **For Claude:** You are an ARCHITECT running subagent-driven development. Use `superpowers:subagent-driven-development` to execute this plan task-by-task.

**Goal:** Build a toast notification system and error handling UX with retry buttons across the app.

**Architecture:** Global toast provider at app layout level. Toast hook for any component to trigger notifications. Error boundary components for graceful failures. Retry logic for failed API calls.

**Tech Stack:** Next.js 15, React 19, TailwindCSS

---

## File Ownership (DO NOT touch files outside this list)

```
OWNED FILES:
  src/ui/components/toast/ToastProvider.tsx (NEW)
  src/ui/components/toast/Toast.tsx (NEW)
  src/ui/components/toast/__tests__/*
  src/ui/hooks/useToast.ts (NEW)
  src/ui/hooks/__tests__/useToast.test.ts
  src/ui/components/error/ErrorBoundary.tsx (NEW)
  src/ui/components/error/RetryButton.tsx (NEW)
  src/ui/components/error/ErrorFallback.tsx (NEW)
  src/ui/components/error/__tests__/*
  src/ui/components/UndoToast.tsx (existing - refactor to use new toast system)
  app/(app)/layout.tsx (add ToastProvider wrapper ONLY)

DO NOT TOUCH:
  app/(app)/home/*
  app/(app)/settings/*
  app/(app)/sheets/*
  src/ui/components/chat/*
  src/ui/components/staging/*
  src/ui/components/settings/*
  src/ui/components/contacts/*
  src/ui/components/upload/*
  src/server/*
  app/api/*
```

## Reference Files (read-only)

- `src/ui/components/UndoToast.tsx` - existing undo toast (will be refactored)
- `app/(app)/layout.tsx` - app shell where ToastProvider will be added

---

## Task 1: Toast Context & Hook

**Files:**
- Create: `src/ui/hooks/useToast.ts`
- Test: `src/ui/hooks/__tests__/useToast.test.ts`

**What to build:**
```typescript
interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'undo'
  message: string
  duration?: number // ms, default 5000
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string, retry?: () => void) => void
  undo: (message: string, onUndo: () => void, duration?: number) => void
}
```

- React Context + Provider pattern
- Auto-dismiss after duration (configurable)
- Max 5 toasts visible at once (oldest dismissed first)
- Undo toasts default to 5 second duration

**Step 1:** Write failing tests: addToast adds to list, removeToast removes, auto-dismiss after timeout, max 5 limit

**Step 2:** Run tests, verify they fail

**Step 3:** Implement context + hook

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: toast context and useToast hook`

---

## Task 2: Toast Component

**Files:**
- Create: `src/ui/components/toast/Toast.tsx`
- Test: `src/ui/components/toast/__tests__/Toast.test.tsx`

**What to build:**
- Visual toast notification component
- Variants: success (green), error (red), warning (yellow), info (blue), undo (gray)
- Close button (X)
- Optional action button (for retry/undo)
- Slide-in animation from bottom-right
- Progress bar showing time remaining

**Step 1:** Write tests: renders message, correct variant styles, close button works, action button works

**Step 2:** Run tests, verify they fail

**Step 3:** Implement with TailwindCSS + CSS transitions

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: Toast component with variants and animations`

---

## Task 3: ToastProvider Component

**Files:**
- Create: `src/ui/components/toast/ToastProvider.tsx`
- Test: `src/ui/components/toast/__tests__/ToastProvider.test.tsx`

**What to build:**
- Renders toast list in a fixed position container (bottom-right)
- Uses portal to render outside component tree
- Stacks toasts vertically with spacing
- Wraps children with ToastContext.Provider

**Step 1:** Write tests: renders children, toasts appear in portal, stacking works

**Step 2:** Run tests, verify they fail

**Step 3:** Implement provider with portal

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: ToastProvider with portal rendering`

---

## Task 4: ErrorBoundary Component

**Files:**
- Create: `src/ui/components/error/ErrorBoundary.tsx`
- Create: `src/ui/components/error/ErrorFallback.tsx`
- Test: `src/ui/components/error/__tests__/ErrorBoundary.test.tsx`

**What to build:**
- React Error Boundary (class component) that catches render errors
- ErrorFallback: "Something went wrong" message with:
  - Error details (collapsible, dev only)
  - "Try Again" button that resets the boundary
  - "Go Home" link
- Customizable fallback via prop

**Step 1:** Write tests: catches error, shows fallback, retry resets

**Step 2:** Run tests, verify they fail

**Step 3:** Implement error boundary

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: ErrorBoundary with retry fallback`

---

## Task 5: RetryButton Component

**Files:**
- Create: `src/ui/components/error/RetryButton.tsx`
- Test: `src/ui/components/error/__tests__/RetryButton.test.tsx`

**What to build:**
- Button that retries a failed async operation
- States: idle, loading (spinner), success (checkmark, 1s), error (shake + show error)
- Exponential backoff: 1s, 2s, 4s (max 3 retries)
- Props: `onRetry: () => Promise<void>`, `maxRetries?: number`

**Step 1:** Write tests: initial state, loading state, success after retry, max retries exhausted

**Step 2:** Run tests, verify they fail

**Step 3:** Implement with state machine

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `feat: RetryButton with exponential backoff`

---

## Task 6: Refactor UndoToast to Use New System

**Files:**
- Modify: `src/ui/components/UndoToast.tsx`

**What to build:**
- Replace standalone UndoToast with a wrapper that uses `useToast().undo()`
- Maintain same external API for backward compatibility
- Remove internal timer logic (now handled by toast system)

**Step 1:** Write tests verifying existing behavior still works through new system

**Step 2:** Run tests, verify they fail

**Step 3:** Refactor to delegate to useToast

**Step 4:** Run tests, verify they pass

**Step 5:** Commit: `refactor: UndoToast delegates to toast system`

---

## Task 7: Wire ToastProvider into App Layout

**Files:**
- Modify: `app/(app)/layout.tsx` (MINIMAL change - add ToastProvider wrapper)

**What to build:**
- Wrap existing layout children with `<ToastProvider>`
- Single line change

**Step 1:** Verify build passes with ToastProvider added

**Step 2:** Commit: `feat: add ToastProvider to app layout`

---

## Verification

After all tasks:
```bash
npm run build
npm run test -- --reporter=verbose
```

All tests must pass. Build must succeed.
