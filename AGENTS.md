# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

TeamSphere is a full-stack project/task management app.
- **Backend**: Node.js + Express + MongoDB (Mongoose), CJS modules, port 4000
- **Frontend**: React 18 + Vite + MUI v5 + Redux Toolkit, ESM modules, port 2000
- Two independent sub-projects (`backend/`, `frontend/`). Run all commands from the respective subdirectory.

## Commands

All commands must be run from their subdirectory (not the repo root).

```bash
# Backend (from backend/)
npm run dev          # nodemon src/server.js
npm test             # jest --forceExit --detectOpenHandles
npm run lint         # eslint src/**/*.js

# Run a single test file
npx jest path/to/file.test.js --forceExit

# Frontend (from frontend/)
npm run dev          # vite (port 2000)
npm run build        # vite build
npm run lint         # eslint src --ext .js,.jsx

# Full stack via Docker (from repo root)
docker compose up --build
```

## Critical Architecture

### Backend
- **Entry**: `src/server.js` starts HTTP immediately (healthcheck passes before DB connects); `connectDB()` runs in background.
- **All async route handlers** must be wrapped with `asyncHandler` from `src/utils/asyncHandler.js` — errors are forwarded to `next()` automatically.
- **Input validation**: Use `express-validator` body validators inline in route arrays + the `validate` middleware from `src/middleware/validate.js`. Returns **422** on failure.
- **Auth middleware** (`src/middleware/auth.js`): attaches `req.user = { id, email, systemRole }` where `id` is the MongoDB `_id` (JWT `sub` field).
- **Project RBAC**: `requireRole('Member'|'Admin')` middleware also attaches `req.project` and `req.membership` — downstream handlers can rely on these without re-querying.
- **Task routes** use `mergeParams: true` — `req.params.id` is the project ID throughout task handlers.
- **Error responses** always use `{ success: false, message }` shape; success responses use `{ success: true, data }`.
- MongoDB connection forces `family: 4` (IPv4) to avoid Docker NAT64 issues.

### Auth Flow
- Dual auth: local email/password (bcrypt, `User.comparePassword()`) **and** AWS Cognito OIDC.
- Cognito tokens are decoded with `jwt.decode` (no JWKS verification). After Cognito auth, a TeamSphere-issued JWT is returned to the client.
- JWT payload: `{ sub: user._id, email, systemRole }` — signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN`.
- Invite flow creates a stub `User` (`password: null`, no `cognitoSub`). Registration checks for this stub and completes the profile instead of rejecting with 409.

### Frontend
- **API client**: `src/api/axios.js` — auto-attaches JWT from `localStorage['ts_access_token']`; 401 clears tokens and hard-redirects to `/login`.
- **All API calls** go through named service functions in `src/api/services.js` — never call `api` directly from components.
- **Auth state** stored in Redux (`src/store/slices/authSlice.js`) AND mirrored to `localStorage` keys `ts_access_token` + `ts_user`.
- UI notifications: dispatch `showSnackbar({ message, severity })` from `uiSlice` — never use `alert()`.
- `AuthCallbackPage` uses a `useRef(false)` guard to prevent React StrictMode double-invoking the Cognito code exchange.
- Vite dev server proxies `/api/*` → `http://localhost:4000` — no CORS configuration needed in development.

## Data Model Notes
- **User.systemRole**: `'admin' | 'user'` (lowercase) — system-wide role.
- **Project member role**: `'Admin' | 'Member'` (Title Case) — project-scoped role, distinct from systemRole.
- `Project` pre-save hook auto-adds the owner to `members` with role `'Admin'` if not already present.
- `Task.status` values: `'Backlog' | 'To Do' | 'In Progress' | 'Blocked' | 'Done'`.
- `Task.priority` values: `'Low' | 'Medium' | 'High'`.
- Task ordering is per-status-column via integer `order` field; `reorderTasks` uses `Task.bulkWrite`.

## Code Style
- **Backend**: CommonJS (`require`/`module.exports`), no TypeScript.
- **Frontend**: ESM (`import`/`export`), JSX in `.jsx` files, `.js` for non-JSX.
- Log using `logger` (winston) from `src/utils/logger.js` — never `console.log` in backend.
- Section dividers in files use `// ── Description ─────` style comments.

## Environment Variables
- Backend `.env` keys: `PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`, `APP_URL`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`.
- Frontend Vite vars: `VITE_API_BASE_URL` (defaults to `/api/v1`), `VITE_APP_URL`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`.
- `APP_URL` (backend) must match the Cognito allowed callback URL — used to build `redirectUri` in `cognito.service.js`.
