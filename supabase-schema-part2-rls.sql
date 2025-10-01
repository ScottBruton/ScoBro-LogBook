-- Part 2: Row Level Security (RLS) Policies
-- Run this after Part 1

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
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_actions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

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

-- Tags policies
CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- People policies
CREATE POLICY "Users can view own people" ON public.people
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own people" ON public.people
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own people" ON public.people
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own people" ON public.people
  FOR DELETE USING (auth.uid() = user_id);

-- Jira refs policies
CREATE POLICY "Users can view own jira refs" ON public.jira_refs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = jira_refs.entry_item_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own jira refs" ON public.jira_refs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = jira_refs.entry_item_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own jira refs" ON public.jira_refs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = jira_refs.entry_item_id 
      AND entries.user_id = auth.uid()
    )
  );

-- Item tags policies
CREATE POLICY "Users can view own item tags" ON public.item_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = item_tags.entry_item_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item tags" ON public.item_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = item_tags.entry_item_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item tags" ON public.item_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = item_tags.entry_item_id 
      AND entries.user_id = auth.uid()
    )
  );

-- Item people policies
CREATE POLICY "Users can view own item people" ON public.item_people
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = item_people.entry_item_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item people" ON public.item_people
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = item_people.entry_item_id 
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item people" ON public.item_people
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.entry_items 
      JOIN public.entries ON entries.id = entry_items.entry_id
      WHERE entry_items.id = item_people.entry_item_id 
      AND entries.user_id = auth.uid()
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

-- Meetings policies
CREATE POLICY "Users can view own meetings" ON public.meetings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings" ON public.meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings" ON public.meetings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings" ON public.meetings
  FOR DELETE USING (auth.uid() = user_id);

-- Meeting attendees policies
CREATE POLICY "Users can view own meeting attendees" ON public.meeting_attendees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_attendees.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own meeting attendees" ON public.meeting_attendees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_attendees.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own meeting attendees" ON public.meeting_attendees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_attendees.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own meeting attendees" ON public.meeting_attendees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_attendees.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

-- Meeting actions policies
CREATE POLICY "Users can view own meeting actions" ON public.meeting_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_actions.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own meeting actions" ON public.meeting_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_actions.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own meeting actions" ON public.meeting_actions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_actions.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own meeting actions" ON public.meeting_actions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_actions.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );
