// This module creates and exports a Supabase client instance. To use
// Supabase, set the environment variables VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY in a `.env` file at the root of the
// project. These values are injected into the client via Vite's
// import.meta.env API.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are provided
// This prevents errors when running without Supabase configuration
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
