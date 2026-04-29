## Goal

Make **Admin** the single coordinator (hardcoded, not publicly registrable). Admin manages judges (creates them and assigns role) from their dashboard. Judges log in and see their own dashboard. Everything else stays the same.

## Changes

### 1. Remove public registration
- Delete the public **Register** page and its `/register` route.
- Remove the "Don't have an account? Register" link from the Login page.
- Replace it with a small note: *"Judges: use the credentials provided by your admin."*

### 2. Hardcoded admin (seeded in code)
- Define a fixed admin email + password as constants (e.g. `admin@musabaqa.com` / `Admin@12345`) — you can tell me preferred values, otherwise I'll use these defaults and show them on the login page in a small "Admin credentials" hint card you can remove later.
- On app first load, the Login page will attempt a one-time silent **bootstrap**: if the admin account doesn't exist yet, it signs it up and inserts the `admin` role row. This makes the admin "registered in the code" — no manual signup needed.
- After bootstrap, admin just logs in normally with those credentials.

### 3. Admin-only judge creation (already mostly built)
- Keep the existing **Judges** page (`/dashboard/judges`) where admin adds judges via email + password + full name. This already:
  - Creates the auth account
  - Inserts the `judge` role into `user_roles`
- I'll improve it slightly:
  - Show each judge's **email** in the table (not just user_id)
  - Add a **Delete judge** action (removes the role row so they lose access)
  - Better success message: "Judge created. Share these login credentials with them."

### 4. Judge dashboard (keep as-is, minor polish)
- Judges already get their own dashboard view via `DashboardLayout` with judge-only links: Dashboard, Score Participants, Results.
- I'll tweak the judge Dashboard to show a personalized greeting ("Welcome, {name}") and quick stats relevant to them (participants to score, scores submitted).

### 5. AuthContext cleanup
- Remove the public `signUp` method from `AuthContext` (no longer needed for self-signup).
- Keep an internal helper used only by the Judges page to create judge accounts.
- Keep the admin bootstrap logic isolated in the Login page.

### 6. Routing
- `/register` route → removed.
- `/` → Login (unchanged).
- `/dashboard/*` → unchanged role-gated routes.

## Files touched

- `src/pages/Register.tsx` — **delete**
- `src/App.tsx` — remove `/register` route and import
- `src/pages/Login.tsx` — remove register link, add admin bootstrap on mount, add credentials hint
- `src/contexts/AuthContext.tsx` — remove public `signUp`
- `src/pages/Judges.tsx` — show email column, add delete action, polish copy
- `src/pages/Dashboard.tsx` — judge-specific greeting/stats branch

## Database

No schema changes needed. Existing RLS policies already cover everything:
- Admin manages `user_roles`, `categories`, `participants`, `scores`
- Judges insert/update only their own scores
- The "Users can insert own role on signup" policy stays (needed for the admin bootstrap insert) but is harmless because only the hardcoded admin account ever uses it.

## What I need from you (optional)

- Preferred admin email & password? If you don't reply, I'll use `admin@musabaqa.com` / `Admin@12345`.

## Out of scope (ask if you want them)

- Password reset / forgot password flow
- Admin being able to edit a judge's password
- Multiple admins
