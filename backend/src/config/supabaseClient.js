import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase Configuration (Backend - Server Side)
const supabaseUrl = process.env.SUPABASE_URL || "https://jgtjkqwephakgpxvvxsr.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in environment variables');
}

// Initialize Supabase client for backend (with service role key for admin operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: { 'x-connection-encrypted': 'true' }
  }
});

// Initialize regular Supabase client (for non-admin operations)
const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

export { supabase, supabaseAdmin };
export default supabase;
