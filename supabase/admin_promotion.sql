-- Run this query once in your Supabase SQL Editor after signing up a user account:
-- Replace 'admin@example.com' with your registered user's email address.

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';

-- Verification query to confirm the user was updated to admin:
SELECT id, email, role, created_at
FROM public.profiles
WHERE email = 'admin@example.com';
