# Project Architecture Rules (Non-Obvious Only)

- There is no monorepo tooling — `backend/` and `frontend/` are completely independent Node projects with separate `package.json`/`node_modules`. Commands must be run from their own directory.
- Two distinct role systems coexist: system-wide `User.systemRole` (`admin`/`user` lowercase) and project-scoped member `role` (`Admin`/`Member` Title Case). They do not interact in the current code.
- Task edit permissions are fine-grained: Admins can edit anything; Creators can edit all their task fields; Assignees (non-creator) can only edit `status` and `description`; unassigned Members fall in the same bucket as assignees. `DELETE` is Admin-only.
- Drag-and-drop reorder (`PATCH /tasks/reorder`) uses MongoDB `bulkWrite` for atomic batch updates. Only the "dragged" task (one whose `status` changes) requires an ownership check — bystander tasks in the destination column are exempt.
- Cognito Cognito App Client is configured **without** a client secret — the token exchange in `cognito.service.js` sends no `client_secret`. Changing this requires updating the Cognito App Client settings AND the service code.
- The frontend build produces three manual chunks: `vendor` (React/Router), `mui` (MUI), `redux` (RTK) — configured in `vite.config.js`. Avoid adding large new libraries without considering chunk strategy.
- MongoDB connection uses `family: 4` to force IPv4 — required for Docker networking. Removing this breaks connectivity inside containers on IPv6-default systems.
- Backend HTTP server lifecycle: server starts → healthcheck `/health` responds immediately → `connectDB()` resolves in background → full service available. New features that need the DB must not assume it's ready at process start.
- No test files exist yet — Jest and Supertest are installed but the test suite is empty. Tests must be placed in `backend/` (not a shared location) and run with `npm test` from `backend/`.
