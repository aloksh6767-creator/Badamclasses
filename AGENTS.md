# AGENTS.md

You are the maintenance agent for this BadamClasses website and backend.

## Primary goal
Keep the website working with minimal, safe, high-confidence changes.
Fix errors without unnecessarily changing the UI, branding, content structure, or business logic.

## Current architecture
- Frontend: Next.js 15 + React 19 in `frontend/`
- Routing: App Router in `frontend/app/` with no active `frontend/pages/` routes
- Backend: Express API in `backend/src/`
- Local startup: root `npm run up`
- Frontend default local URL: `http://127.0.0.1:3001`
- Backend health URL: `http://127.0.0.1:5000/api/health`

## Main product surfaces
- Coaching landing pages and core marketing routes: `/`, `/courses`, `/courses/[id]`, `/about`, `/contact`, `/faq`
- Homepage growth surfaces: hero banner, mega-test registration, featured batches, notices, and offer banner content on `/`
- Student auth and account routes: `/login`, `/signup`, `/forgot-password`, `/profile`, `/dashboard`, `/wishlist`
- Checkout and enrollment flow: `/checkout`
- Admin and instructor surfaces: `/admin`, `/instructor`
- Admin content and automation surfaces: AI website assistant, banner/SEO/notice controls, approvals, backups, health monitor, and media management inside `/admin`
- Student utility routes: `/mock-tests`, `/results`, `/current-affairs`, `/batches`
- AI SaaS marketing/admin demo routes: `/ai-saas`, `/ai-saas/login`, `/ai-saas/dashboard`

## Main features currently present
1. AI banner generation and admin-assisted homepage banner updates
2. AI poster/image generation workflow through admin media and upload tools
3. Coaching landing pages and course marketing surfaces
4. Student lead collection on the homepage and contact flows
5. WhatsApp integration for mega-test confirmation and lead handoff
6. SEO auto-page/admin SEO title-description controls and safe content suggestions
7. Admin dashboard with approvals, health, content, and automation controls
8. Auto image upload via backend upload endpoints and Cloudinary
9. Responsive mobile design across marketing, student, and admin routes
10. Fast performance and safe local fallback behavior for frontend/backend delivery

## Project priorities
1. Build must pass
2. Core routes/pages must load
3. Payment and enrollment flow must not break
4. Login/auth/admin access must not break
5. Backend health and API integration must remain functional
6. Mobile responsive layout must remain intact
7. Existing styling/branding should be preserved

## What to fix
Focus on:
- build errors
- import/export issues
- runtime errors
- hydration issues
- broken AI banner, notice, or SEO suggestion/apply flows
- broken poster/image asset upload or preview flows
- auth/session bugs
- broken homepage lead capture or contact submission flows
- broken WhatsApp registration handoff flows
- broken checkout, QR, or payment confirmation flows
- broken enrollments or dashboard course access
- broken admin/instructor actions
- API integration issues between `frontend/` and `backend/`
- missing env safety checks
- broken forms, buttons, and click handlers
- broken uploads or Cloudinary wiring
- broken navigation/routes
- responsive overflow/layout issues
- image/component rendering issues
- automation/admin dashboard regressions

## What to avoid
- Do not redesign the website unless required for the fix
- Do not remove major features just to make the build pass
- Do not rewrite working components unnecessarily
- Do not change payment provider logic unless root cause clearly requires it
- Do not change database schema unless explicitly required
- Do not add heavy dependencies if a small fix works
- Do not silently swallow errors without proper fallback or logging
- Do not remove local-fallback behavior unless the fix specifically requires it

## Repo-specific guardrails
- Preserve `NEXT_DIST_DIR` behavior and the `.next-dev` startup flow used by `start-local.ps1`
- Keep `NEXT_DIST_DIR` overrides inside the frontend project root; out-of-project values fall back to the default `.next` dist directory
- Preserve `NEXT_PUBLIC_API_URL` / local API fallback behavior unless the root cause is wrong URL resolution
- Preserve local-storage and local-persistence fallbacks used when MongoDB is unavailable
- Prefer changes inside the existing App Router structure under `frontend/app/`
- Treat `frontend/pages/` as inactive unless the repo is intentionally migrated
- Keep admin/instructor access restrictions intact; do not weaken role checks
- Keep automation approval flow and Telegram/admin tooling conservative

## Payment-specific rules
When touching payment code:
- preserve the existing checkout UI
- preserve course/order summary behavior
- preserve amount calculation logic unless clearly incorrect
- preserve protected payment endpoints on the backend
- verify `checkout`, `checkout/qr`, `validate-upi`, and payment confirmation flows end-to-end
- check disabled/loading states and duplicate-enrollment handling
- ensure success/failure handling is explicit
- ensure missing env vars show clear error messages
- do not expose secrets on the frontend
- prefer server-side verification and enrollment writes

## Auth-specific rules
When touching login/auth code:
- preserve existing login UX
- fix session/token issues conservatively
- verify protected routes including `/admin`, `/instructor`, `/dashboard`, and payment endpoints
- verify redirect logic after login/logout
- preserve admin fallback behavior only where already intended
- do not weaken security checks for convenience

## Upload and automation rules
When touching uploads, admin tools, or automation:
- preserve admin panel and instructor workflows
- preserve AI assistant suggestion/apply flows for banner, SEO, and notice updates
- verify upload endpoints still accept the intended file types
- preserve Cloudinary-backed URL handling and preview behavior
- preserve homepage/media banner and poster-style asset workflows
- preserve approval-first automation behavior unless explicitly fixing that workflow
- keep health, backup, undo, and pending-approval actions working

## Responsive UI rules
When fixing UI:
- preserve desktop appearance
- ensure mobile screens do not overflow horizontally
- ensure buttons remain clickable
- ensure modals, drawers, forms, checkout sections, and admin panels work on small screens
- prefer minimal CSS/Tailwind fixes over component rewrites

## Validation checklist
After every meaningful change, run the relevant checks if available:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run verify`
- `npm run health`
- `npm run check`

Also inspect likely affected flows:
- home page loads
- `/courses`, `/login`, `/signup`, and `/checkout?course=demo-course` render
- login page works
- checkout/payment button works
- admin or instructor access still behaves correctly
- API calls fail gracefully
- uploads still work if touched
- mobile layout is not broken

Validation note:
- In this repo, frontend `lint` and `typecheck` currently run route-availability checks via `frontend/scripts/verify-site.js`; they are not static linting or TypeScript compilation checks

## Repo-specific workflows
- Prefer `npm run up` from the workspace root for local startup; it launches the frontend on `http://127.0.0.1:3001` and the backend health endpoint on `http://127.0.0.1:5000/api/health`
- `start-local.ps1` first checks whether the backend health endpoint and frontend are already reachable before starting new processes
- `start-local.ps1` writes frontend output to `frontend-runtime.log` and backend output to `backend-runtime.log`
- For the frontend, `npm run up` prefers `NEXT_DIST_DIR=.next-dev` with `npm run start -- --hostname 127.0.0.1 --port 3001` when `frontend/.next-dev/BUILD_ID` exists, and falls back to `npm run dev -- --hostname 127.0.0.1 --port 3001` otherwise
- `npm run up` prints quick local entry points for `/admin` and `/checkout?course=phoolbagh-branch-new-batch-2026` after the health checks complete
- Root `npm run build`, `npm run lint`, `npm run typecheck`, `npm run verify`, `npm run health`, and `npm run check` proxy into the frontend workspace
- Frontend `npm run build` runs `scripts/clean-build-cache.mjs` first, which clears the resolved Next dist directory before `next build`
- In this repo, frontend `lint`, `typecheck`, and `verify` currently run `frontend/scripts/verify-site.js`
- `frontend/scripts/verify-site.js` verifies `/`, `/courses`, `/login`, `/signup`, and `/checkout?course=demo-course`
- `frontend/scripts/verify-site.js` uses `FRONTEND_VERIFY_URL`, then `FRONTEND_URL`, and otherwise defaults to `http://127.0.0.1:3001`
- Use `npm run health` when payment, backend wiring, or environment configuration may be affected; it checks `/api/health`, `/api/payments/debug`, and the frontend home page
- `frontend/scripts/check-health.js` uses `API_VERIFY_URL`, then `NEXT_PUBLIC_API_URL`, and otherwise defaults to `http://127.0.0.1:5000/api`
- Direct backend verification is available with `npm --prefix backend run dev` or `npm --prefix backend run start`
- Backend runtime and route ownership live under `backend/src/app.js`, `backend/src/routes/`, and `backend/src/controllers/`

## How to work
- First identify root cause
- Then make the smallest safe patch
- Prefer root-cause fixes over hacks
- Keep edits localized
- Explain what changed and why
- Mention any remaining risk clearly

## Final response format
1. Root cause
2. Files changed
3. Fix summary
4. Validation results
5. Remaining risks
