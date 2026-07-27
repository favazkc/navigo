# Project Documentation Context (Non-Obvious Only)

- Auth has two parallel flows in the same backend: local email/password and AWS Cognito OIDC. Both issue a TeamSphere-signed JWT — the Cognito id_token is only used to extract user info.
- Cognito `id_token` is decoded with `jwt.decode` (no JWKS signature verification) — the backend trusts Cognito implicitly.
- Invite flow creates a "stub" User (`password: null`, no `cognitoSub`). On `/auth/register`, if a stub is found, it completes the account rather than returning 409. This is intentional.
- `Project.owner` and `Project.members` are separate fields. A pre-save hook keeps them in sync — the owner is always added to `members` as Admin automatically.
- `Task.order` is per-status-column, not global. Reordering sends a bulk array of `{ id, order, status }` to `PATCH /projects/:id/tasks/reorder`.
- Backend starts the HTTP server immediately before MongoDB connects (so Docker healthchecks pass during slow cold starts). DB connection happens in the background.
- Frontend auth state is stored in both Redux and `localStorage`. The keys are `ts_access_token` and `ts_user`. The axios interceptor reads from `localStorage`, not Redux.
- The Vite dev proxy (`/api/*` → `localhost:4000`) means CORS is not needed in development. In production, nginx serves the frontend and proxies API requests.
- `AuthCallbackPage` has a `useRef` guard against React StrictMode double-invocation of the Cognito code exchange.
