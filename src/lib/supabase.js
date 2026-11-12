import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkuuxwgtnfhqwjupdgu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna3V1eHdndG5maHF3anVwZGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MzY3NDUsImV4cCI6MjEwOTExMjc0NX0.84-fksPaDalhKoHOgb6YX8j0LoZ9FST759eV5DKH9to'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'dr-gondhane-admin-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})