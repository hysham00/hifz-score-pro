REVOKE EXECUTE ON FUNCTION public.next_judge_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_judge_code() TO service_role;