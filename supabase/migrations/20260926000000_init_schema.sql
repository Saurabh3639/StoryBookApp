-- Migration: Initial Schema for StoryBook App
-- Author: StoryBook Team
-- Description: Creates profiles, categories, books tables, RLS policies, storage bucket configs, and automatic profile trigger.

-- 1. ENUMS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BOOKS
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  pdf_path TEXT NOT NULL,
  cover_path TEXT,
  page_count INTEGER,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. HELPER FUNCTIONS FOR RLS (Security Definer avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- Profiles RLS
DROP POLICY IF EXISTS "Users can read own profile or admins read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admins read all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Categories RLS
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.categories;
CREATE POLICY "Authenticated users can read categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Books RLS
DROP POLICY IF EXISTS "Authenticated users can read books" ON public.books;
CREATE POLICY "Authenticated users can read books"
  ON public.books FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert books" ON public.books;
CREATE POLICY "Admins can insert books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update books" ON public.books;
CREATE POLICY "Admins can update books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete books" ON public.books;
CREATE POLICY "Admins can delete books"
  ON public.books FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 6. AUTOMATIC PROFILE TRIGGER ON NEW AUTH SIGNUP
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. INITIAL CATEGORIES SEED DATA
INSERT INTO public.categories (name, slug)
VALUES 
  ('Fairy Tales', 'fairy-tales'),
  ('Adventure', 'adventure'),
  ('Animals', 'animals'),
  ('Bedtime', 'bedtime')
ON CONFLICT (slug) DO NOTHING;

-- 8. STORAGE BUCKETS SETUP & STORAGE POLICIES
-- Note: Insert into storage.buckets if using Supabase SQL editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('storybooks', 'storybooks', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Objects Policies for storybooks (Private PDF Bucket)
DROP POLICY IF EXISTS "Admins have full storage access to storybooks" ON storage.objects;
CREATE POLICY "Admins have full storage access to storybooks"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'storybooks' AND public.is_admin())
  WITH CHECK (bucket_id = 'storybooks' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated users read access to storybooks" ON storage.objects;
CREATE POLICY "Authenticated users read access to storybooks"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'storybooks');

-- Storage Objects Policies for covers (Public Thumbnail Bucket)
DROP POLICY IF EXISTS "Public view covers" ON storage.objects;
CREATE POLICY "Public view covers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "Admins manage covers" ON storage.objects;
CREATE POLICY "Admins manage covers"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'covers' AND public.is_admin())
  WITH CHECK (bucket_id = 'covers' AND public.is_admin());
