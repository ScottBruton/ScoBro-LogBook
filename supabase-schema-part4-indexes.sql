-- Part 4: Indexes for Performance
-- Run this after Part 3

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
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON public.people(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON public.meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_actions_meeting_id ON public.meeting_actions(meeting_id);
