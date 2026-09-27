-- Migration: Add full_name column to public.profiles and update signup trigger
-- Description: Stores user's Full Name from signup metadata into public.profiles table

-- 1. Add full_name column to profiles if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Update handle_new_user trigger function to populate full_name from auth user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE 
      WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name <> '' THEN EXCLUDED.full_name 
      ELSE public.profiles.full_name 
    END;
  RETURN NEW;
END;
$$;
