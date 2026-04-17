-- Manual admin promotion fallback
--
-- Use this only as an operational fallback when you need to promote an account
-- directly in the database. The normal bootstrap path is environment-based via
-- ADMIN_EMAILS on the server.
--
-- Replace the email below before running.

update public.profiles
set role = 'admin',
    updated_at = timezone('utc', now())
where email = 'admin@example.com';
