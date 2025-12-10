import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kcmepfywnhozfilpdrfn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbWVwZnl3bmhvemZpbHBkcmZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDEwMzksImV4cCI6MjA4MDk3NzAzOX0.5CCUg17D1e6Q0uXfTpiZjWBy3AolgdOI6cctkibg4rE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
