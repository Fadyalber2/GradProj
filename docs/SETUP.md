# AXIOM V2 — Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| npm | 10+ | comes with Node |
| Python | 3.11+ | https://python.org |
| Ollama | latest | https://ollama.ai |

---

## 1. Frontend Setup

```bash
cd G:\AI\AXIOM-V2\frontend
npm install
npm run dev
```

Opens at `http://localhost:3000`.

### Environment variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> If `.env.local` is missing, the app still builds and runs — API calls will fail but pages render.

---

## 2. Backend Setup (separate repo / directory)

Backend lives at `G:\AI\Newstart\backend\` (not in this repository).

```bash
cd G:\AI\Newstart\backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt

# Copy and fill environment variables
copy .env.example .env

uvicorn app.main:app --reload --port 8000
```

Backend docs at `http://localhost:8000/docs` (Swagger UI).

### Backend `.env` keys needed:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-supabase-jwt-secret
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=axiom-llm
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...
```

---

## 3. Ollama / AI Setup

```bash
# Install Ollama from https://ollama.ai, then:
ollama pull nomic-embed-text

# Register the AXIOM model (model file at G:\AI\Newstart\ai-training\AXIOM-gguf_gguf\)
# A Modelfile should already exist in that directory
ollama create axiom-llm -f G:\AI\Newstart\ai-training\AXIOM-gguf_gguf\Modelfile

# Verify
ollama list
# Should show: axiom-llm:latest and nomic-embed-text:latest
```

Ollama runs on `http://localhost:11434`. The backend calls it automatically.

> AI is optional — if Ollama is not running, all non-AI endpoints still work.

---

## 4. Supabase Setup

1. Create a project at https://supabase.com
2. Run the schema migration from `G:\AI\Newstart\backend\migrations\schema.sql`
3. Enable Row-Level Security on all user-data tables
4. Copy URL and keys into `.env` files

---

## 5. Verify Everything Works

```bash
# Frontend TypeScript check
cd G:\AI\AXIOM-V2\frontend
npx tsc --noEmit
# Expected: no output (zero errors)

# Frontend build check
npm run build
# Expected: all 20 routes compile successfully

# Backend import check (from backend directory)
cd G:\AI\Newstart\backend
python -c "from app.main import app; print('OK')"
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `Module not found: @/...` | Run `npm install` in `frontend/` |
| API calls return 401 | Supabase JWT not set up — check `.env.local` |
| AI endpoints return 503 | Ollama not running — start with `ollama serve` |
| `npx tsc` errors | Read error output carefully — usually a missing type import |
| Port 3000 in use | Kill the process or use `npm run dev -- -p 3001` |
