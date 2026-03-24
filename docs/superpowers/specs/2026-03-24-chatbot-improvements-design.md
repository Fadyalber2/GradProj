# Chatbot Improvements Design
**Date:** 2026-03-24
**Status:** Approved

## Problem Statement

Two issues with the AXIOM AI chatbot:

1. **No website context** — the model doesn't know what AXIOM is, has no platform identity, and when the RAG knowledge_chunks table returns no results, the fallback prompt actively signals "no data available" — causing the model to improvise and potentially reference external websites (Aqarmap, Bayut, etc.).

2. **Bad output format** — responses are long, formal, and structured like Wikipedia articles (numbered lists, bold headers, lengthy intros). Inappropriate for a 380px floating chat drawer. Raw markdown symbols (`**bold**`, `- list`) also render as plain text.

---

## Approved Design

### Section 1 — Backend: System Prompt Rewrite (`backend/app/ai/router.py`)

**When RAG context exists (`context_str` is non-empty):**

```
You are AXIOM AI — the assistant built into AXIOM, Egypt's real estate platform.
Users are already on the AXIOM website browsing properties.

PLATFORM:
- AXIOM lists properties across Egypt: Cairo, Giza, Alexandria, New Capital,
  North Coast, Hurghada, Sharm El Sheikh
- Categories: apartments for rent, homes for sale, shared housing rooms
- Users can message landlords, save favorites, and apply to listings

BEHAVIOR:
- Answer from the verified database records below ONLY
- When a listing is relevant, describe it naturally (title, location, price)
  — do NOT expose raw UUIDs to the user
- If the user's need isn't in the records, say "I don't see that in our listings
  right now" — never send them to another website
- Ask one clarifying question if the query is vague (e.g. no city or budget given)

STYLE — CRITICAL:
- Short and conversational: 1-2 sentences for simple questions
- Use bullet points ONLY when listing 3+ properties or features
- Never use numbered lists, markdown headers (##), or bold (**) for chat replies
- Never open with "Great question!" or "Of course!" or any filler phrase
- Match the user's language (Arabic or English)

VERIFIED DATABASE RECORDS:
{context_str}
```

Note: `{context_str}` is the Python f-string variable from the existing `rag_retriever.build_context(chunks)` call.

**When no RAG context (`context_str` is empty — fallback):**

```
You are AXIOM AI — the assistant built into AXIOM, Egypt's real estate platform.
Answer general Egyptian real estate questions (pricing norms, neighborhood guides,
lease terms, buying process). Stay focused on helping the user find what they need
on AXIOM. Never mention or link to Aqarmap, Bayut, Property Finder, or any other
platform. Do not assert specific listing availability, prices, or addresses —
you don't have live listing data for this query. Keep answers to 2-3 sentences.
Match the user's language.
```

**Key improvements over current prompt:**
- Model knows what AXIOM is and that users are already on the website
- Raw UUIDs never shown to users — listings described naturally
- Clarifying question rule prevents vague queries producing walls of text
- Filler phrase ban explicitly stated
- Fallback explicitly bans hallucinating specific listing data while still being helpful

---

### Section 2 — Frontend: Markdown Renderer (`frontend/src/components/ai/ChatMessage.tsx`)

A lightweight internal (unexported) `MessageContent` function component co-located in `ChatMessage.tsx`. No new dependency. Handles exactly 3 cases:

| Input | Rendered output |
|---|---|
| `**text**` | `<strong>text</strong>` (bold) |
| `- item\n- item` | `<ul><li>` bullet list |
| `\n\n` | paragraph break |

Does NOT handle: `##` headers, `---` rules, code blocks, links. These are banned in the system prompt.

**Streaming tolerance:** The renderer must handle incomplete markdown at SSE token boundaries gracefully. If a closing delimiter (e.g. the second `**`) has not yet arrived in the stream, render the text as plain text and re-evaluate on the next render cycle when more tokens arrive. Never produce broken half-rendered markdown mid-stream.

Replaces the `{message.content}` expression inside the text bubble `<div>` (the one with `px-3.5 py-2.5 rounded-2xl` class):

```tsx
// Before
{message.content}

// After
<MessageContent content={message.content} />
```

`MessageContent` is an internal (unexported) pure function — no export needed since it is only used inside the same file.

---

### Section 3 — Frontend: Suggestion Chips (`frontend/src/components/ai/ChatDrawer.tsx`)

Three clickable pill chips rendered below the welcome message bubble.

**Chip content:**

| Label | Message sent |
|---|---|
| 🏠 Apartments in New Cairo | "Show me apartments for rent in New Cairo" |
| 💰 Under 10,000 EGP/month | "What's available for rent under 10,000 EGP per month?" |
| 🏘️ Compare neighborhoods | "What are the best neighborhoods in Cairo to live in?" |

**Visibility condition:** `messages.length === 1 && messages[0].id === "welcome"`. This correctly shows chips only on fresh sessions and after chat clear, and correctly hides them once the user sends their first message.

**Click behavior — important implementation detail:**

`sendMessage` in `ChatDrawer.tsx` reads `input` from its closure. Calling `setInput(text)` then `sendMessage()` in the same handler will silently fail because React state updates are asynchronous — `sendMessage` would see the old empty `input`.

The correct approach: refactor `sendMessage` to accept an optional `override?: string` parameter:

```ts
const sendMessage = useCallback(async (override?: string) => {
  const text = (override ?? input).trim();
  if (!text || isTyping) return;
  // rest of function unchanged — uses `text` not `input` directly
  ...
}, [input, isTyping, messages]);
```

Chip click handlers then call `sendMessage(chipMessage)` directly, bypassing `setInput` entirely.

**Existing call sites to update:** The send button currently uses `onClick={sendMessage}`. After the refactor this must become `onClick={() => sendMessage()}` to prevent the synthetic `MouseEvent` from being passed as the `override` argument (which would cause a runtime crash when `.trim()` is called on it).

**Style:** Small pill buttons matching existing citation pill style — `bg-primary/10 border-primary/20 text-primary text-xs font-medium rounded-full px-3 py-1.5`. Placed directly below the welcome message bubble, left-aligned, wrapped in a `flex flex-wrap gap-2` container.

---

## Files Changed

| File | Change |
|---|---|
| `backend/app/ai/router.py` | Rewrite `system` string in the `chat` endpoint's with-context and fallback branches |
| `frontend/src/components/ai/ChatMessage.tsx` | Add internal `MessageContent` component, replace `{message.content}` in bubble div |
| `frontend/src/components/ai/ChatDrawer.tsx` | Refactor `sendMessage` to accept `override?` arg; add suggestion chips below welcome message |

## Out of Scope
- Changing the streaming SSE protocol
- Adding new API endpoints
- Modifying citation pill logic
- Any changes to RAG retrieval or embedding pipeline
