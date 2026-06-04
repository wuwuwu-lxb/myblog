---
name: llm-selfwiki-code-style
description: Code style and architecture conventions for llm-selfwiki. Use when modifying this repository, adding features, refactoring UI, touching database/API/auth code, or deciding where new code should live.
---

# llm-selfwiki Code Style

## Product Shape

llm-selfwiki is not a generic CMS. Treat it as a personal knowledge operating system with four surfaces:

- public blog
- public self-LLM
- private writing dashboard
- private taxonomy/content management

The public surfaces should feel readable, distinctive, and knowledge-rich. The private surfaces should feel like a focused workbench.

## Tech Stack

- Next.js App Router
- React Server Components by default
- Client components only when interactivity is required
- TypeScript strict mode
- SQLite through `node:sqlite`
- Local uploaded assets under `storage/uploads`
- Signed cookie auth in `lib/auth.ts`

## File Placement

- App routes live under `app/`.
- Route handlers live under `app/api/**/route.ts`.
- Shared server modules live under `lib/`.
- Product/design docs live under `docs/`.
- Reusable project skills live under `docs/skill/`.
- Uploaded runtime data must not be committed.

## Server and Client Boundaries

Prefer server components for:

- reading SQLite
- loading content lists
- rendering public blog pages
- checking auth in private pages

Use client components for:

- forms
- uploads
- chat state
- optimistic UI
- local interaction state

Do not import `lib/db.ts` or `lib/auth.ts` into client components.

## Data Model Rules

Content has separate concepts:

- `type`: workflow role, such as `entry`, `note`, `post`, `memory`
- `category`: one controlled primary classification
- `tags`: many controlled topic labels
- `visibility`: `private`, `draft`, or `public`

Do not reintroduce free-form category/tag inputs in content forms. Categories and tags must be created in the taxonomy system first.

## Auth Rules

Public routes:

- `/`
- `/blog/**`
- `/self`
- `/api/chat`

Private routes:

- `/dashboard/**`
- content write APIs
- asset upload API
- taxonomy management APIs

Keep GitHub OAuth configuration in environment variables. Never commit `.env.local`.

## UI Rules

Avoid generic SaaS dashboard visuals and template blog layouts.

Prefer:

- dense but calm information design
- strong hierarchy without oversized cards everywhere
- restrained color palette with one or two clear accents
- text that sounds like a personal system, not marketing copy
- source cards, timeline elements, inspectors, command surfaces, and knowledge panels

Avoid:

- gradient blob backgrounds
- generic AI chat landing page composition
- huge decorative hero cards
- excessive rounded cards nested inside other cards
- free-form category/tag typing

## CSS Rules

Current styling uses `app/globals.css`.

- Keep tokens in `:root`.
- Reuse existing variables before adding colors.
- Keep cards at `8px` radius unless there is a clear reason.
- Do not scale typography with viewport width except controlled `clamp()` on true hero text.
- Ensure mobile layouts do not overflow.

If the project later adopts shadcn/Radix, keep the same product style instead of accepting default component aesthetics blindly.

## API Rules

Route handlers should:

- validate input explicitly
- return JSON errors with appropriate status codes
- call `requireApiUser()` for private mutations
- keep public read APIs intentionally public
- avoid leaking internal fields like `tagsJson`

## Database Rules

Schema migrations are currently handled in `lib/db.ts`.

- Keep migrations backward-compatible.
- Preserve existing local data when adding columns or tables.
- Use controlled taxonomy tables for categories and tags.
- Avoid adding an ORM until the schema becomes too complex to maintain directly.

## Verification

Before committing meaningful changes:

```bash
npx tsc --noEmit
npm run build
```

For frontend-heavy work, also verify in the browser at desktop and mobile widths before considering the task done.

