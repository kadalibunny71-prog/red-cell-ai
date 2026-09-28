import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase.js';
import { asyncHandler, AppError } from '../utils/http.js';

const router = express.Router();
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const components = ['Whole Blood', 'Packed Red Cells', 'Platelets', 'Plasma'];
const urgency = ['critical', 'urgent', 'standard'];
const itemSchema = z.object({
  type: z.enum(['request', 'availability']).default('request'),
  bloodGroup: z.enum(bloodGroups),
  component: z.enum(components).default('Whole Blood'),
  unitsNeeded: z.coerce.number().int().min(1).max(50),
  hospitalName: z.string().trim().max(150).optional().or(z.literal('')),
  location: z.string().trim().min(2, 'Please add a city or locality.').max(200),
  contactPhone: z.string().trim().max(40).optional().or(z.literal('')),
  urgency: z.enum(urgency).default('standard'),
  neededBy: z.string().trim().max(40).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  aiSummary: z.string().trim().max(2000).optional().or(z.literal(''))
});

function toDatabase(input) {
  const needed = input.neededBy ? new Date(input.neededBy) : null;
  if (needed && Number.isNaN(needed.getTime())) throw AppError('Please provide a valid required-by date and time.', 400, 'INVALID_DATE');
  return {
    type: input.type,
    blood_group: input.bloodGroup,
    component: input.component,
    units_needed: input.unitsNeeded,
    hospital_name: input.hospitalName || null,
    location: input.location,
    contact_phone: input.contactPhone || null,
    urgency: input.urgency,
    needed_by: needed?.toISOString() || null,
    description: input.description || '',
    ai_summary: input.aiSummary || null,
    title: `${input.type === 'availability' ? 'Available' : 'Need'}: ${input.bloodGroup} ${input.component}`
  };
}

function serialise(item) {
  return {
    ...item,
    requester: item.requester ? {
      id: item.requester.id,
      fullName: item.requester.full_name,
      organizationName: item.requester.organization_name,
      role: item.requester.role
    } : null,
    acceptedByProfile: item.accepted_by_profile ? {
      id: item.accepted_by_profile.id,
      fullName: item.accepted_by_profile.full_name,
      organizationName: item.accepted_by_profile.organization_name,
      role: item.accepted_by_profile.role
    } : null
  };
}

const feedSelect = `*, requester:profiles!items_user_id_fkey(id, full_name, organization_name, role), accepted_by_profile:profiles!items_accepted_by_fkey(id, full_name, organization_name, role)`;
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'open';
  const bloodGroup = typeof req.query.bloodGroup === 'string' ? req.query.bloodGroup : '';
  const mine = req.query.mine === 'true';
  if (!['all', 'open', 'matched', 'delivered', 'cancelled'].includes(status)) throw AppError('Invalid status filter.');
  if (bloodGroup && !bloodGroups.includes(bloodGroup)) throw AppError('Invalid blood group filter.');

  let query = getSupabase().from('items').select(feedSelect).order('created_at', { ascending: false }).limit(100);
  if (status !== 'all') query = query.eq('status', status);
  if (bloodGroup) query = query.eq('blood_group', bloodGroup);
  if (mine) query = query.eq('user_id', req.user.id);
  const { data, error } = await query;
  if (error) throw AppError('Could not load the live network. Please refresh.', 503, 'DATABASE_UNAVAILABLE');
  res.json({ items: (data || []).map(serialise) });
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const supabase = getSupabase();
  const [open, mine, matched] = await Promise.all([
    supabase.from('items').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('items').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id),
    supabase.from('items').select('id', { count: 'exact', head: true }).eq('status', 'matched')
  ]);
  if (open.error || mine.error || matched.error) throw AppError('Could not load network stats.', 503, 'DATABASE_UNAVAILABLE');
  res.json({ open: open.count || 0, mine: mine.count || 0, matched: matched.count || 0 });
}));

router.post('/', asyncHandler(async (req, res) => {
  const payload = toDatabase(itemSchema.parse(req.body));
  const { data, error } = await getSupabase().from('items').insert({ ...payload, user_id: req.user.id }).select(feedSelect).single();
  if (error) throw AppError('Could not publish your request. Please try again.', 503, 'DATABASE_UNAVAILABLE');
  res.status(201).json({ item: serialise(data) });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const payload = toDatabase(itemSchema.parse(req.body));
  const { data: current, error: findError } = await getSupabase().from('items').select('id, user_id, status').eq('id', req.params.id).maybeSingle();
  if (findError) throw AppError('Could not find this request.', 503, 'DATABASE_UNAVAILABLE');
  if (!current) throw AppError('This request no longer exists.', 404, 'NOT_FOUND');
  if (current.user_id !== req.user.id) throw AppError('Only the requester can edit this item.', 403, 'FORBIDDEN');
  if (!['open', 'matched'].includes(current.status)) throw AppError('Delivered or cancelled items cannot be edited.', 409, 'ITEM_LOCKED');
  const { data, error } = await getSupabase().from('items').update(payload).eq('id', current.id).eq('user_id', req.user.id).select(feedSelect).single();
  if (error) throw AppError('Could not save your changes. Please try again.', 503, 'DATABASE_UNAVAILABLE');
  res.json({ item: serialise(data) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await getSupabase().from('items').delete().eq('id', req.params.id).eq('user_id', req.user.id).select('id').maybeSingle();
  if (error) throw AppError('Could not delete this request. Please try again.', 503, 'DATABASE_UNAVAILABLE');
  if (!data) throw AppError('Only the requester can delete this item.', 404, 'NOT_FOUND');
  res.status(204).send();
}));

router.post('/:id/accept', asyncHandler(async (req, res) => {
  if (req.user.role === 'hospital') throw AppError('Only donor centres or donors can confirm availability.', 403, 'ROLE_NOT_ALLOWED');
  const { data: item, error: findError } = await getSupabase().from('items').select('id, user_id, status').eq('id', req.params.id).maybeSingle();
  if (findError) throw AppError('Could not load this request.', 503, 'DATABASE_UNAVAILABLE');
  if (!item) throw AppError('This request no longer exists.', 404, 'NOT_FOUND');
  if (item.user_id === req.user.id) throw AppError('You cannot accept your own request.', 400, 'OWN_ITEM');
  if (item.status !== 'open') throw AppError('This request has already been actioned.', 409, 'ALREADY_ACTIONED');
  const { data, error } = await getSupabase().from('items').update({
    status: 'matched', accepted_by: req.user.id, accepted_at: new Date().toISOString()
  }).eq('id', item.id).eq('status', 'open').is('accepted_by', null).select(feedSelect).maybeSingle();
  if (error) throw AppError('Could not confirm availability. Please try again.', 503, 'DATABASE_UNAVAILABLE');
  if (!data) throw AppError('Someone else just accepted this request.', 409, 'ALREADY_ACTIONED');
  res.json({ item: serialise(data) });
}));

router.post('/:id/deliver', asyncHandler(async (req, res) => {
  const { data, error } = await getSupabase().from('items').update({
    status: 'delivered', delivered_at: new Date().toISOString()
  }).eq('id', req.params.id).eq('user_id', req.user.id).eq('status', 'matched').select(feedSelect).maybeSingle();
  if (error) throw AppError('Could not mark this as delivered. Please try again.', 503, 'DATABASE_UNAVAILABLE');
  if (!data) throw AppError('Only the requester can mark a matched request as delivered.', 409, 'DELIVERY_NOT_ALLOWED');
  res.json({ item: serialise(data) });
}));

export default router;
