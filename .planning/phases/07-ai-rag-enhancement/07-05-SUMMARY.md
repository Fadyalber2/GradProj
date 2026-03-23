---
phase: 07-ai-rag-enhancement
plan: "05"
subsystem: ui
tags: [react, typescript, sse, rag, citations, nextjs]

# Dependency graph
requires:
  - phase: 07-04
    provides: Citations SSE event in chat endpoint, /api/ai/search endpoint
provides:
  - Citation and CitationSourceType types exported from types/index.ts
  - ChatMessageData extended with optional citations field
  - ChatDrawer parses citations SSE event with snake_case to camelCase mapping
  - Citation pills rendering below assistant messages (max 3 + overflow)
  - isSearching indicator in ChatDrawer header subtitle
  - ragSearchMutation and RAGSearchResponse exported from queries.ts
affects: [07-06, 07-07, future-ui-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Citation pills render below assistant messages as anchor tags, max 3 visible with +N more overflow"
    - "isSearching state flips on sendMessage, clears on first token or finally block"
    - "SSE parsed.citations maps snake_case (source_type, source_id) to camelCase via explicit .map()"
    - "Citation type import is type-only (import type) per project conventions"

key-files:
  created: []
  modified:
    - frontend/src/types/index.ts
    - frontend/src/lib/queries.ts
    - frontend/src/components/ai/ChatMessage.tsx
    - frontend/src/components/ai/ChatDrawer.tsx

key-decisions:
  - "Citation pills use anchor <a> tags (not Link) — citations can point to external URLs for neighborhood/blog sources"
  - "isSearching resets in finally block to guarantee cleanup even if SSE errors out"
  - "Citation rendering lives in ChatDrawer, not ChatMessage — keeps ChatMessage stateless and focused on text/listing_refs"
  - "ragSearchMutation inlines the result shape rather than importing ListingBrief — avoids coupling queries.ts to api.ts for a standalone AI endpoint"

patterns-established:
  - "RAG citation flow: SSE event parsed in ChatDrawer → mapped to Citation[] → stored on message → rendered as pills"
  - "isSearching indicator: set true with setIsTyping, cleared on first token or finally"

requirements-completed:
  - REQ-RAG-05
  - REQ-RAG-08

# Metrics
duration: 7min
completed: 2026-03-23
---

# Phase 7 Plan 05: RAG Frontend Citation UI Summary

**ChatDrawer citation pills with snake-to-camelCase SSE parsing, isSearching indicator, and typed ragSearchMutation — completing the user-facing RAG experience**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-23T19:17:46Z
- **Completed:** 2026-03-23T19:23:57Z
- **Tasks:** 3/3 (Task 3 checkpoint:human-verify — approved 2026-03-23)
- **Files modified:** 4

## Accomplishments
- Added `Citation` and `CitationSourceType` types to `types/index.ts` with camelCase fields (sourceType, sourceId, title, url)
- Extended `ChatMessageData` with optional `citations?: Citation[]` field in ChatMessage.tsx
- Updated ChatDrawer to parse `{"citations": [...]}` SSE events, map snake_case backend format to camelCase, and attach to the last assistant message
- Rendered citation pills below assistant messages: up to 3 visible, "+N more" overflow chip, `max-w-[160px]` truncation
- Added `isSearching` state that shows "Searching database..." in the header subtitle during RAG retrieval
- Added `ragSearchMutation` and `RAGSearchResponse` to `queries.ts` for `/api/ai/search`

## Task Commits

1. **Task 1: Add Citation type and RAGSearchResponse + ragSearchMutation** - `c492796` (feat)
2. **Task 2: Add RAG citation UI to ChatDrawer** - `4c9d8bb` (feat)

## Files Created/Modified
- `frontend/src/types/index.ts` - Added CitationSourceType and Citation interface (10 lines)
- `frontend/src/lib/queries.ts` - Added RAGSearchResponse interface and ragSearchMutation export (35 lines)
- `frontend/src/components/ai/ChatMessage.tsx` - Added Citation import, extended ChatMessageData with optional citations field
- `frontend/src/components/ai/ChatDrawer.tsx` - Citation type import, isSearching state, citations SSE parsing, pill rendering, header indicator

## Decisions Made
- Citation pills use `<a>` tags (not Next.js `<Link>`) — citations can point to `/find-homes?location=...` for neighborhoods and `/blog/{id}` for posts, not just internal routes that require a router
- `isSearching` resets both on first token arrival and in the `finally` block — guarantees cleanup on errors, timeout, or normal stream completion
- Citation rendering placed in ChatDrawer (wrapping ChatMessage), not inside ChatMessage — preserves ChatMessage as a stateless presentation component focused on text bubbles and listing_refs
- `ragSearchMutation` inlines the result shape rather than re-importing from api.ts — this is an AI-only endpoint and the shape is self-contained

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Backend already serves citations from Plan 07-04. If `knowledge_chunks` table is empty, no citation pills will appear (expected behavior — plan verification instructions note this).

## Next Phase Readiness

- RAG frontend UI is complete. Users can now see clickable citation pills below grounded responses.
- Human verification checkpoint (Task 3) approved: TypeScript compiles clean, SSE parser verified at line 194, "Searching database..." indicator at line 278, citation pills at lines 304-318.
- Phase 7 is fully complete (7/7 plans).

---
*Phase: 07-ai-rag-enhancement*
*Completed: 2026-03-23*
