-- Migration: Add hours column to entry_items table
-- Run this in Supabase SQL Editor if the hours column doesn't exist

ALTER TABLE public.entry_items 
ADD COLUMN IF NOT EXISTS hours REAL;

