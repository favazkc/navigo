# Project Coding Rules (Non-Obvious Only)

- Wrap every async route handler with `asyncHandler` from `backend/src/utils/asyncHandler.js` — omitting it means unhandled promise rejections crash silently.
- Add `express-validator` body validators inline in the route array, then pass the shared `validate` middleware from `backend/src/middleware/validate.js` — returns 422, not 400.
- All backend responses must use `{ success: true, data }` or `{ success: false, message }` — no deviations.
- Log via `logger` from `backend/src/utils/logger.js` (Winston). Never use `console.log` in backend code.
- Task routes router is created with `mergeParams: true` — `req.params.id` is always the project ID, not the task's.
- `requireRole` middleware attaches `req.project` and `req.membership` — use these in handlers instead of re-querying the project.
- `User.systemRole` is lowercase (`'admin'`/`'user'`); project member `role` is Title Case (`'Admin'`/`'Member'`). These are different systems.
- When adding a new page to the frontend, add it as a `lazy()` import in `frontend/src/App.jsx` — all pages are lazy-loaded via Suspense.
- Never call `api` directly from React components — all HTTP calls must go through named exports in `frontend/src/api/services.js`.
- Dispatch `showSnackbar({ message, severity })` from `uiSlice` for user-facing notifications — no `alert()` or `console.error` in frontend.
- Frontend ESM (`import`/`export`); backend CJS (`require`/`module.exports`) — do not mix.
- JWT `sub` in the backend is the MongoDB `_id` string, not a Cognito sub. `req.user.id` is the MongoDB `_id`.
