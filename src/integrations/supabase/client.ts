import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

const isBrowser = typeof window !== 'undefined';
const devBypass = isBrowser && window.localStorage.getItem('DEV_AUTH') === 'true';

const KEY_TO_USE = devBypass && SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY : ANON_KEY;

export const supabase = createClient(SUPABASE_URL, KEY_TO_USE, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});