ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordinator';

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lga text,
  ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS judge_code text UNIQUE;

CREATE SEQUENCE IF NOT EXISTS public.judge_code_seq START 1;

CREATE OR REPLACE FUNCTION public.next_judge_code()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'JUDGE' || lpad(nextval('public.judge_code_seq')::text, 3, '0');
$$;

-- Backfill codes for existing judges, ordered by profile creation
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'judge'
    WHERE p.judge_code IS NULL
    ORDER BY p.created_at
  LOOP
    UPDATE public.profiles SET judge_code = public.next_judge_code() WHERE id = r.id;
  END LOOP;
END $$;