## What's actually happening

When you (the admin) click **Add Judge**, the code calls `supabase.auth.signUp(...)` from the browser. Supabase's client library treats every successful `signUp` as "log this new user in on this device" — so:

1. Your admin session is silently replaced by the new judge's session.
2. The `AuthContext` listener picks up the change, your `role` flips from `admin` → `judge`.
3. The route guard on `/dashboard/categories` (admin-only) kicks you out to `/dashboard`, which now renders the judge view.

So there isn't a literal "redirect-after-add" line to delete — the navigation is a side-effect of the auth swap. To "remove it entirely" we need to create the judge **without** logging the admin out.

## Plan

### 1. Add a backend function to create judges
Create a new edge function `create-judge` that:
- Verifies the caller is an authenticated admin (checks `user_roles` for `role = 'admin'`).
- Uses the Supabase **service-role** key (server-side only) to call `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.
- Inserts the `judge` row into `user_roles` for the new user.
- Returns `{ user_id }` on success, or a clear error.

Because this runs server-side with the admin API, the admin's browser session is never touched.

### 2. Update `src/pages/Judges.tsx`
- Replace the `supabase.auth.signUp(...)` + `user_roles.insert(...)` block in `createJudgeMutation` with a single `supabase.functions.invoke('create-judge', { body: { email, password, full_name } })` call.
- Remove the 2-second `setTimeout` workaround (no longer needed).
- Keep the existing toast + dialog-close behavior. No navigation calls anywhere — admin stays exactly where they are.

### 3. Improve the Judges table while we're here (small, optional)
- Show the judge's **email** in the table (returned from the edge function and refetched), since right now it only shows name + opaque user_id. Skip if you'd rather keep it minimal — say the word.

### 4. Nothing else changes
- `AuthContext`, `App.tsx` routes, `Login.tsx` admin bootstrap, and `DashboardLayout` stay as-is.
- No DB schema changes. Existing RLS policies remain valid (the edge function bypasses RLS via service role only for the two specific inserts it needs).

## Files touched

- **New**: `supabase/functions/create-judge/index.ts`
- **New**: `supabase/config.toml` — add `[functions.create-judge]` block with `verify_jwt = true` (so we can read the caller's JWT to confirm they're admin)
- **Modified**: `src/pages/Judges.tsx` — swap signUp call for edge function invoke

## Result

After approval and implementation: clicking **Add Judge** creates the judge in the background, shows a success toast, closes the dialog, and leaves you on whatever admin page you were on (Categories, Judges, etc.) with your admin session fully intact.