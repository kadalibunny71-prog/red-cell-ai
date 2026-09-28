import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getSupabase } from './supabase.js';

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function createSession(userId) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);
  const { error } = await getSupabase().from('sessions').insert({
    id: sessionId,
    user_id: userId,
    token_hash: hash(sessionId),
    expires_at: expiresAt.toISOString()
  });
  if (error) throw new Error(`Could not create session: ${error.message}`);

  const token = jwt.sign({ sub: userId, sid: sessionId, type: 'session' }, config.jwtSecret, {
    expiresIn: `${config.sessionDays}d`,
    issuer: 'red-cell.ai',
    audience: 'red-cell.ai-web'
  });
  return { token, expiresAt };
}

export async function getSessionUser(token) {
  const payload = jwt.verify(token, config.jwtSecret, { issuer: 'red-cell.ai', audience: 'red-cell.ai-web' });
  if (!payload?.sub || !payload?.sid || payload.type !== 'session') return null;

  const { data: session, error: sessionError } = await getSupabase()
    .from('sessions')
    .select('id, user_id, expires_at, revoked_at')
    .eq('id', payload.sid)
    .eq('token_hash', hash(payload.sid))
    .maybeSingle();
  if (sessionError) throw new Error(`Session validation failed: ${sessionError.message}`);
  if (!session || session.user_id !== payload.sub || session.revoked_at || new Date(session.expires_at) <= new Date()) return null;

  const { data: profile, error: profileError } = await getSupabase()
    .from('profiles')
    .select('id, email, full_name, organization_name, role, created_at')
    .eq('id', payload.sub)
    .maybeSingle();
  if (profileError) throw new Error(`Profile lookup failed: ${profileError.message}`);
  return profile || null;
}

export async function revokeSession(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { issuer: 'red-cell.ai', audience: 'red-cell.ai-web' });
    if (payload?.sid) {
      await getSupabase().from('sessions').update({ revoked_at: new Date().toISOString() }).eq('id', payload.sid);
    }
  } catch {
    // Logout remains idempotent if the token is expired or invalid.
  }
}
