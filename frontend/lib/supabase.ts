import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://anvgqeyghquwrvsjmivj.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudmdxZXlnaHF1d3J2c2ptaXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mjg4MzcsImV4cCI6MjA4NzQwNDgzN30.Lwr3BWTRDyaxN9kEGdj26i-P82Aw_h052e_Ia31WBk0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
