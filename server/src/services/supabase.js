import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { config } from '../config.js';

let supabase;

export function getSupabase() {
  if (!supabase) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to server/.env.');
    }
    supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      // Supabase initializes a Realtime client internally; supplying ws keeps Node 20 deployments compatible.
      realtime: { transport: WebSocket },
      global: { headers: { 'X-Client-Info': 'red-cell-ai-api' } }
    });
  }
  return supabase;
}

export async function verifyDatabaseConnection() {
  const { error } = await getSupabase().from('profiles').select('id', { count: 'exact', head: true });
  if (error) throw new Error(`Supabase database check failed: ${error.message}`);
  return true;
}
