import { createClient } from '@supabase/supabase-js';

// We use import.meta.env for Vite variables.
// If VITE_SUPABASE_URL isn't set, we fall back to process.env for Node compatibility (useful for testing)
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.SUPABASE_URL || 'https://hergbyxuzklautqgwgjb.supabase.co';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcmdieXh1emtsYXV0cWd3Z2piIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3Mzg5NCwiZXhwIjoyMDg1NjQ5ODk0fQ.0Q9UzauLESx0C_WswTsi7E8hfUGPDU22gP5SOH8snwg';

export const supabase = createClient(supabaseUrl, supabaseKey);
