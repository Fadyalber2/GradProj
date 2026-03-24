# Chatbot Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the AXIOM chatbot's identity/context problem and bad output style via a system prompt rewrite, a markdown renderer, and suggestion chips.

**Architecture:** Three independent changes across two layers — (1) rewrite the backend system prompt so the model knows what AXIOM is and responds concisely; (2) add a lightweight inline markdown renderer to the message bubble component; (3) refactor `sendMessage` to accept an optional text override, then add suggestion chip buttons that use it.

**Tech Stack:** Python/FastAPI (backend prompt), React/TypeScript/Tailwind (frontend components), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-24-chatbot-improvements-design.md`

---

## File Map

| File | Change |
|---|---|
| `backend/app/ai/router.py` | Replace lines 209–225 (the `system =` assignments in the `chat` endpoint) |
| `frontend/src/components/ai/ChatMessage.tsx` | Add `renderInline` + `MessageContent` internal functions; swap `{message.content}` for `<MessageContent>` |
| `frontend/src/components/ai/ChatDrawer.tsx` | Add `SUGGESTION_CHIPS` constant; refactor `sendMessage(override?)` signature; fix `onClick` on send button; render chips below welcome message |

---

## Task 1: Rewrite Backend System Prompt

**Files:**
- Modify: `backend/app/ai/router.py:208-225`

- [ ] **Step 1: Open the file and locate the two system prompt assignments**

  In `backend/app/ai/router.py`, find the `chat` endpoint (around line 188). Inside it, there are two branches:
  - `if context_str:` → `system = (...)` at line ~209
  - `else:` → `system = (...)` at line ~220

- [ ] **Step 2: Replace the with-context system prompt (lines 209–218)**

  Replace the entire `if context_str:` branch's `system = (...)` with:

  ```python
  system = (
      "You are AXIOM AI — the assistant built into AXIOM, Egypt's real estate platform.\n"
      "Users are already on the AXIOM website browsing properties.\n\n"
      "PLATFORM:\n"
      "- AXIOM lists properties across Egypt: Cairo, Giza, Alexandria, New Capital, "
      "North Coast, Hurghada, Sharm El Sheikh\n"
      "- Categories: apartments for rent, homes for sale, shared housing rooms\n"
      "- Users can message landlords, save favorites, and apply to listings\n\n"
      "BEHAVIOR:\n"
      "- Answer from the verified database records below ONLY\n"
      "- When a listing is relevant, describe it naturally (title, location, price) "
      "— do NOT expose raw UUIDs to the user\n"
      "- If the user's need isn't in the records, say 'I don't see that in our listings "
      "right now' — never send them to another website\n"
      "- Ask one clarifying question if the query is vague (e.g. no city or budget given)\n\n"
      "STYLE — CRITICAL:\n"
      "- Short and conversational: 1-2 sentences for simple questions\n"
      "- Use bullet points ONLY when listing 3+ properties or features\n"
      "- Never use numbered lists, markdown headers (##), or bold (**) for chat replies\n"
      "- Never open with 'Great question!' or 'Of course!' or any filler phrase\n"
      "- Match the user's language (Arabic or English)\n\n"
      f"VERIFIED DATABASE RECORDS:\n{context_str}"
  )
  ```

- [ ] **Step 3: Replace the fallback system prompt (lines 220–225)**

  Replace the entire `else:` branch's `system = (...)` with:

  ```python
  system = (
      "You are AXIOM AI — the assistant built into AXIOM, Egypt's real estate platform.\n"
      "Answer general Egyptian real estate questions (pricing norms, neighborhood guides, "
      "lease terms, buying process). Stay focused on helping the user find what they need "
      "on AXIOM. Never mention or link to Aqarmap, Bayut, Property Finder, or any other "
      "platform. Do not assert specific listing availability, prices, or addresses — "
      "you don't have live listing data for this query. "
      "Keep answers to 2-3 sentences. Match the user's language."
  )
  ```

- [ ] **Step 4: Verify backend tests still pass**

  ```bash
  cd backend
  python -m pytest tests/test_ai.py -v
  ```

  Expected: all AI tests pass (no regressions — the prompt change doesn't affect test mocks).

- [ ] **Step 5: Commit**

  ```bash
  git add backend/app/ai/router.py
  git commit -m "feat(ai): rewrite chat system prompt with AXIOM identity and style rules"
  ```

---

## Task 2: Add Markdown Renderer to ChatMessage

**Files:**
- Modify: `frontend/src/components/ai/ChatMessage.tsx`

- [ ] **Step 1: Add `renderInline` helper function**

  Open `frontend/src/components/ai/ChatMessage.tsx`. After the imports (after line 6), add two internal functions before the `ListingRef` interface. These are unexported — internal use only.

  First, add `ReactNode` to the imports at the top of the file. The file currently has no React import — add one:

  ```tsx
  import type { ReactNode } from "react";
  ```

  Add this line at the top of the imports block (before the `Image` import).

  Then, after the full imports block, add:

  ```tsx
  // ── Markdown helpers (internal) ───────────────────────────────────────────────

  function renderInline(text: string): ReactNode {
    // Handles **bold** — streaming-safe: unclosed ** falls through as plain text
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    return (
      <>
        {parts.map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
      </>
    );
  }

  function MessageContent({ content }: { content: string }) {
    const lines = content.split("\n");
    type Group =
      | { type: "bullet"; items: string[] }
      | { type: "text"; text: string }
      | { type: "br" };

    const groups: Group[] = [];

    for (const line of lines) {
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const last = groups[groups.length - 1];
        if (last?.type === "bullet") {
          last.items.push(line.slice(2));
        } else {
          groups.push({ type: "bullet", items: [line.slice(2)] });
        }
      } else if (line === "") {
        if (groups.length > 0 && groups[groups.length - 1].type !== "br") {
          groups.push({ type: "br" });
        }
      } else {
        groups.push({ type: "text", text: line });
      }
    }

    return (
      <>
        {groups.map((group, i) => {
          if (group.type === "bullet") {
            return (
              <ul key={i} className="list-disc list-inside space-y-0.5 mt-1 mb-1">
                {group.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          }
          if (group.type === "br") return <br key={i} />;
          return (
            <span key={i} className="block">
              {renderInline(group.text)}
            </span>
          );
        })}
      </>
    );
  }
  ```

  **Why streaming-safe:** `renderInline` uses the regex `/(\*\*[^*]+\*\*)/` which requires BOTH opening and closing `**` to match. A mid-stream `**unclosed` token will not match and renders as plain text. On the next render cycle, once the closing `**` arrives, it renders as bold. No flicker or crash.

- [ ] **Step 2: Replace `{message.content}` with `<MessageContent>`**

  Find the text bubble `<div>` — it has className containing `px-3.5 py-2.5 rounded-2xl`. Inside it, replace:

  ```tsx
  {message.content}
  ```

  with:

  ```tsx
  <MessageContent content={message.content} />
  ```

- [ ] **Step 3: Run TypeScript check**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/components/ai/ChatMessage.tsx
  git commit -m "feat(chat): add streaming-safe markdown renderer to message bubbles"
  ```

---

## Task 3: Refactor `sendMessage` and Fix Send Button

**Files:**
- Modify: `frontend/src/components/ai/ChatDrawer.tsx`

- [ ] **Step 1: Add `override?` parameter to `sendMessage`**

  In `ChatDrawer.tsx`, find the `sendMessage` callback (around line 102). Change its signature and first line:

  ```tsx
  // Before
  const sendMessage = useCallback(async () => {
    const text = input.trim();

  // After
  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
  ```

  The rest of the function body is unchanged.

- [ ] **Step 2: Fix the send button's `onClick`**

  Find the send button (has `onClick={sendMessage}`, around line 344). Change:

  ```tsx
  // Before
  onClick={sendMessage}

  // After
  onClick={() => sendMessage()}
  ```

  **Why:** After the refactor, React would pass the `MouseEvent` as the first positional argument to `sendMessage`. Since `override` is typed as `string | undefined`, TypeScript rejects `MouseEvent`, and at runtime `.trim()` would throw. Wrapping in an arrow function ensures `sendMessage()` is called with no arguments.

  **Note on `handleKeyDown`:** The keyboard handler at line ~241 already calls `sendMessage()` with no arguments — it is already correct and requires no change:
  ```tsx
  // Already safe — no change needed
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  ```

- [ ] **Step 3: Run TypeScript check**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/components/ai/ChatDrawer.tsx
  git commit -m "refactor(chat): add override param to sendMessage for chip support"
  ```

---

## Task 4: Add Suggestion Chips

**Files:**
- Modify: `frontend/src/components/ai/ChatDrawer.tsx`

- [ ] **Step 1: Add the `SUGGESTION_CHIPS` constant**

  After the `WELCOME_MESSAGE` constant (around line 46), add:

  ```tsx
  const SUGGESTION_CHIPS = [
    {
      label: "🏠 Apartments in New Cairo",
      message: "Show me apartments for rent in New Cairo",
    },
    {
      label: "💰 Under 10,000 EGP/month",
      message: "What's available for rent under 10,000 EGP per month?",
    },
    {
      label: "🏘️ Compare neighborhoods",
      message: "What are the best neighborhoods in Cairo to live in?",
    },
  ] as const;
  ```

- [ ] **Step 2: Render chips below the welcome message**

  In the messages list, find the `{messages.map((msg) => (` block. Inside it, after `<ChatMessage message={msg} />`, add the chips — they appear only when the message is the welcome message AND no other messages exist yet:

  ```tsx
  {messages.map((msg) => (
    <div key={msg.id}>
      <ChatMessage message={msg} />

      {/* Suggestion chips — only on fresh/cleared sessions */}
      {msg.id === "welcome" && messages.length === 1 && (
        <div className="flex flex-wrap gap-2 ml-9 mt-2">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => sendMessage(chip.message)}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium border border-primary/20 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Citation pills (existing — keep exactly as-is) */}
      {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 ml-2">
          {msg.citations.slice(0, 3).map((citation) => (
            <a
              key={citation.sourceId}
              href={citation.url}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors border border-primary/20 truncate max-w-[160px]"
              title={citation.title}
            >
              <span className="truncate">{citation.title}</span>
            </a>
          ))}
          {msg.citations.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
              +{msg.citations.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  ))}
  ```

  **Visibility logic:** `messages.length === 1 && messages[0].id === "welcome"` means chips show only when the chat contains nothing but the welcome message. They disappear the moment the user sends a message (which adds to `messages`). They reappear after `handleClear` resets to `[WELCOME_MESSAGE]` — correct, cleared = fresh start.

- [ ] **Step 3: Run TypeScript check**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/components/ai/ChatDrawer.tsx
  git commit -m "feat(chat): add suggestion chips to welcome message"
  ```

---

## Task 5: Final Verification

- [ ] **Step 1: Run the full backend test suite**

  ```bash
  cd backend
  python -m pytest tests/ -v
  ```

  Expected: all tests pass (same count as before — this plan adds no new endpoints or DB changes).

- [ ] **Step 2: Run the full TypeScript check**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: zero errors.

- [ ] **Step 3: Manual smoke test**

  Start both servers (`uvicorn app.main:app --reload --port 8000` and `npm run dev`), open the chat drawer and verify:
  - Three suggestion chips appear below the welcome message
  - Clicking a chip sends the message immediately (no need to type)
  - Chips disappear after the first message
  - Chips reappear after clicking the clear (↺) button
  - A general question like "what can you help me with?" gets a short 1-2 sentence response, not a numbered list
  - The chatbot never mentions Aqarmap, Bayut, or other platforms
