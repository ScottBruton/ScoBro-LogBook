-- Jira Projects and Issues Tables for Dashboard Integration
-- These tables store Jira data synced to the dashboard

-- Create jira_projects table
CREATE TABLE IF NOT EXISTS public.jira_projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_key TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_type_key TEXT,
  description TEXT,
  lead TEXT,
  url TEXT,
  is_selected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, project_key)
);

-- Create jira_issues table
CREATE TABLE IF NOT EXISTS public.jira_issues (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_key TEXT NOT NULL,
  issue_key TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT,
  issue_type TEXT,
  assignee TEXT,
  reporter TEXT,
  created TIMESTAMP WITH TIME ZONE,
  updated TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  original_estimate_seconds INTEGER,
  remaining_estimate_seconds INTEGER,
  time_spent_seconds INTEGER,
  labels TEXT[],
  components TEXT[],
  fix_versions TEXT[],
  sprint TEXT,
  epic TEXT,
  story_points INTEGER,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, issue_key)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_jira_projects_user_id ON public.jira_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_projects_project_key ON public.jira_projects(project_key);
CREATE INDEX IF NOT EXISTS idx_jira_issues_user_id ON public.jira_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_issues_project_key ON public.jira_issues(project_key);
CREATE INDEX IF NOT EXISTS idx_jira_issues_issue_key ON public.jira_issues(issue_key);

-- Enable RLS
ALTER TABLE public.jira_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jira_projects
CREATE POLICY "Users can view own jira projects" ON public.jira_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jira projects" ON public.jira_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jira projects" ON public.jira_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jira projects" ON public.jira_projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for jira_issues
CREATE POLICY "Users can view own jira issues" ON public.jira_issues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jira issues" ON public.jira_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jira issues" ON public.jira_issues
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jira issues" ON public.jira_issues
  FOR DELETE USING (auth.uid() = user_id);


