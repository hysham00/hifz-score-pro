-- Allow newly registered users to insert their own role
CREATE POLICY "Users can insert own role on signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);