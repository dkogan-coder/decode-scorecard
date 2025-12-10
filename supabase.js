import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qmvtklemligxkicygfeq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtdnRrbGVtbGlneGtpY3lnZmVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMjc1MjMsImV4cCI6MjA4MDkwMzUyM30.2_tQmEv4jPDhW_7VEASkcsMKwYG7RDSDR1m73CP1OVU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
