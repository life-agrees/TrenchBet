import { createClient } from '@supabase/supabase-js';

// We use import.meta.env for Vite variables.
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://hergbyxuzklautqgwgjb.supabase.co';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.warn('Warning: VITE_SUPABASE_ANON_KEY is not defined in the environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

