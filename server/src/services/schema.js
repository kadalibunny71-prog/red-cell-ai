import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

function projectRef() {
  if (config.supabaseProjectRef) return config.supabaseProjectRef;
  try {
    return new URL(config.supabaseUrl).hostname.split('.')[0];
  } catch {
    return null;
  }
}

export async function applySchema() {
  const ref = projectRef();
  if (!config.supabaseAccessToken) {
    throw new Error('SUPABASE_ACCESS_TOKEN is required for automatic table creation through the Supabase Management API. A service_role key cannot run database DDL by itself.');
  }
  if (!ref) throw new Error('Could not determine SUPABASE_PROJECT_REF from SUPABASE_URL.');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sql = await fs.readFile(path.resolve(here, '../../../supabase/001_redcell_schema.sql'), 'utf8');
  const response = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabaseAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase schema setup failed (${response.status}): ${body}`);
  return { projectRef: ref, result: body ? JSON.parse(body) : null };
}
