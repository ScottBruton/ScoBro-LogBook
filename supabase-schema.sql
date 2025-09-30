-- ScoBro Logbook Supabase Schema
-- This schema matches the local SQLite structure for seamless sync

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create entries table
CREATE TABLE IF NOT EXISTS public.entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create entry_items table
CREATE TABLE IF NOT EXISTS public.entry_items (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES public.entries(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('Action', 'Decision', 'Note', 'Meeting')),
  content TEXT NOT NULL,
  project TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create people table
CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jira_refs table
CREATE TABLE IF NOT EXISTS public.jira_refs (
  id TEXT PRIMARY KEY,
  entry_item_id TEXT REFERENCES public.entry_items(id) ON DELETE CASCADE NOT NULL,
  jira_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create item_tags junction table
CREATE TABLE IF NOT EXISTS public.item_tags (
  entry_item_id TEXT REFERENCES public.entry_items(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_item_id, tag_id)
);

-- Create item_people junction table
CREATE TABLE IF NOT EXISTS public.item_people (
  entry_item_id TEXT REFERENCES public.entry_items(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES public.people(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_item_id, person_id)
);

-- Create projects table (for Phase 2)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0275d8',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Entries policies
CREATE POLICY "Users can view own entries" ON public.entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON public.entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON public.entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON public.entries
  FOR DELETE USING (auth.uid() = user_id);

-- Entry items policies
CREATE POLICY "Users can view own entry items" ON public.entry_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entries 
      WHERE entries.id = entry_items.entry_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own entry items" ON public.entry_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entries 
      WHERE entries.id = entry_items.entry_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own entry items" ON public.entry_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.entries 
      WHERE entries.id = entry_items.entry_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own entry items" ON public.entry_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.entries 
      WHERE entries.id = entry_items.entry_id 
      AND entries.user_id = auth.uid()
    )
  );

-- Tags policies (global read, user-specific write)
CREATE POLICY "Anyone can view tags" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert tags" ON public.tags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tags" ON public.tags
  FOR UPDATE USING (auth.role() = 'authenticated');

-- People policies (global read, user-specific write)
CREATE POLICY "Anyone can view people" ON public.people
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert people" ON public.people
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update people" ON public.people
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Jira refs policies
CREATE POLICY "Users can view own jira refs" ON public.jira_refs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = jira_refs.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own jira refs" ON public.jira_refs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = jira_refs.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own jira refs" ON public.jira_refs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = jira_refs.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own jira refs" ON public.jira_refs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = jira_refs.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

-- Item tags policies
CREATE POLICY "Users can view own item tags" ON public.item_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = item_tags.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item tags" ON public.item_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = item_tags.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item tags" ON public.item_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = item_tags.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

-- Item people policies
CREATE POLICY "Users can view own item people" ON public.item_people
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = item_people.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item people" ON public.item_people
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = item_people.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item people" ON public.item_people
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.entry_items ei
      JOIN public.entries e ON ei.entry_id = e.id
      WHERE ei.id = item_people.entry_item_id 
      AND e.user_id = auth.uid()
    )
  );

-- Projects policies
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Functions and Triggers

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entry_items_updated_at BEFORE UPDATE ON public.entry_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON public.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON public.entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_entry_items_entry_id ON public.entry_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_items_type ON public.entry_items(item_type);
CREATE INDEX IF NOT EXISTS idx_jira_refs_entry_item_id ON public.jira_refs(entry_item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_entry_item_id ON public.item_tags(entry_item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON public.item_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_item_people_entry_item_id ON public.item_people(entry_item_id);
CREATE INDEX IF NOT EXISTS idx_item_people_person_id ON public.item_people(person_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
