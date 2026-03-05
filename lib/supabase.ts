import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://placeholder.supabase.co';
const DEFAULT_KEY = 'placeholder';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

// Initialize with environment variables or placeholders to prevent crash
export let supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Allows updating the global supabase client at runtime if credentials are provided via UI
 */
export const updateSupabaseConfig = (url: string, key: string) => {
    if (url && key) {
        supabase = createClient(url, key);
    }
};
