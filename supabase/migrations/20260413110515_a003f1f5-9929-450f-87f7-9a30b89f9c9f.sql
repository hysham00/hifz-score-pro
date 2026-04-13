
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'judge');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles policies
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  max_memorization INTEGER NOT NULL DEFAULT 20,
  max_tajweed INTEGER NOT NULL DEFAULT 10,
  max_voice INTEGER NOT NULL DEFAULT 10,
  max_dressing INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view participants" ON public.participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage participants" ON public.participants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles table (for display names)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Scores table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memorization_mistakes INTEGER NOT NULL DEFAULT 0,
  memorization_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  tajweed_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  voice_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  dressing_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participant_id, judge_id)
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view scores" ON public.scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Judges can insert own scores" ON public.scores
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = judge_id AND public.has_role(auth.uid(), 'judge')
  );

CREATE POLICY "Judges can update own scores" ON public.scores
  FOR UPDATE TO authenticated
  USING (auth.uid() = judge_id AND public.has_role(auth.uid(), 'judge'));

CREATE POLICY "Admins can manage all scores" ON public.scores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
