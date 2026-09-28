import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config, isProduction } from '../config.js';
import { getSupabase } from '../services/supabase.js';
import { createSession, revokeSession } from '../services/sessions.js';
import { asyncHandler, AppError, publicProfile } from '../utils/http.js';
import { requireAuth, tokenFromRequest } from '../middleware/auth.js';

const router = express.Router();
const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(100),
  email: z.string().trim().email('Please enter a valid email address.').max(254),
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(128),
  organizationName: z.string().trim().max(120).optional().or(z.literal('')),
  role: z.enum(['hospital', 'donor_center', 'donor'])
});
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
  portal: z.enum(['hospital', 'donor_center']).optional()
});

function setSessionCookie(res, token, expiresAt) {
  res.cookie('redcell_session', token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
    expires: expiresAt,
    path: '/'
  });
}

function authResponse(res, { token, expiresAt, user }, status = 200) {
  setSessionCookie(res, token, expiresAt);
  // The client also keeps the signed session token so authenticated calls remain reliable
  // in browsers that block third-party cookies between Vercel and Render.
  return res.status(status).json({ token, expiresAt, user: publicProfile(user) });
}

router.post('/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const email = input.email.toLowerCase();
  const supabase = getSupabase();
  const { data: existing, error: findError } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  if (findError) throw AppError('Could not validate that email. Please try again.', 503, 'DATABASE_UNAVAILABLE');
  if (existing) throw AppError('An account already exists for that email. Please sign in instead.', 409, 'EMAIL_IN_USE');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const { data: user, error: insertError } = await supabase.from('profiles').insert({
    email,
    full_name: input.fullName,
    organization_name: input.organizationName || null,
    role: input.role,
    password_hash: passwordHash
  }).select('id, email, full_name, organization_name, role, created_at').single();
  if (insertError) {
    if (insertError.code === '23505') throw AppError('An account already exists for that email. Please sign in instead.', 409, 'EMAIL_IN_USE');
    throw AppError('We could not create your account. Please try again.', 503, 'DATABASE_UNAVAILABLE');
  }
  const session = await createSession(user.id);
  return authResponse(res, { ...session, user }, 201);
}));

router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { data: profile, error } = await getSupabase().from('profiles')
    .select('id, email, full_name, organization_name, role, created_at, password_hash')
    .eq('email', input.email.toLowerCase()).maybeSingle();
  if (error) throw AppError('Could not sign you in right now. Please try again.', 503, 'DATABASE_UNAVAILABLE');
  const valid = profile && await bcrypt.compare(input.password, profile.password_hash);
  if (!valid) throw AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
  if (input.portal && profile.role !== input.portal) {
    const registeredAs = profile.role === 'donor_center' ? 'donor centre' : profile.role;
    throw AppError(`This account is registered as a ${registeredAs}. Please use the ${registeredAs} portal.`, 403, 'PORTAL_MISMATCH');
  }
  const session = await createSession(profile.id);
  return authResponse(res, { ...session, user: profile });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: publicProfile(req.user) });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const token = tokenFromRequest(req);
  if (token) await revokeSession(token);
  res.clearCookie('redcell_session', { httpOnly: true, secure: isProduction(), sameSite: isProduction() ? 'none' : 'lax', path: '/' });
  res.status(204).send();
}));

export default router;
