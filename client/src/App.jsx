import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, Bot, Building2, CalendarClock, Check,
  ChevronRight, ClipboardCheck, Droplets, Edit3, HeartHandshake,
  Info, LocateFixed, LogOut, MapPin, Menu, Navigation, PackageCheck, Plus, Radio, RefreshCw,
  Search, ShieldCheck, Sparkles, Timer, Trash2, Truck, Users, X
} from 'lucide-react';
import { api, ApiError, sessionStore } from './api.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Whole Blood', 'Packed Red Cells', 'Platelets', 'Plasma'];
const ROLE_LABELS = { hospital: 'Hospital', donor_center: 'Donor centre', donor: 'Donor' };

function cn(...classes) { return classes.filter(Boolean).join(' '); }
function relativeTime(value) {
  if (!value) return 'Just now';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
function formatDeadline(value) {
  if (!value) return 'Timing to be confirmed';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
function displayName(user) { return user?.full_name || user?.fullName || 'Network member'; }
function organization(user) { return user?.organization_name || user?.organizationName || ROLE_LABELS[user?.role] || 'Network member'; }
const DELIVERY_STEPS = [
  ['preparing', 'Preparing'], ['collected', 'Collected'], ['in_transit', 'In transit'], ['arrived', 'Arrived'], ['delivered', 'Delivered']
];
function deliveryLabel(status) { return DELIVERY_STEPS.find(([value]) => value === status)?.[1] || 'Not started'; }
function formatDuration(start, end = new Date()) {
  if (!start) return '—';
  const minutes = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60); const remainder = minutes % 60;
  return `${hours}h${remainder ? ` ${remainder}m` : ''}`;
}
function normalizeItem(item) {
  return { ...item, requester: item.requester || null, acceptedByProfile: item.acceptedByProfile || null };
}

function Brand({ dark = false }) {
  return <div className="flex items-center gap-2.5">
    <div className={cn('grid h-9 w-9 place-items-center rounded-xl shadow-lg', dark ? 'bg-white/15 text-white' : 'bg-rose-600 text-white shadow-rose-200')}>
      <Droplets size={19} fill="currentColor" strokeWidth={2.5} />
    </div>
    <div className={cn('text-lg font-black tracking-tight', dark ? 'text-white' : 'text-slate-900')}>
      <span className="text-rose-500">red</span> cell<span className={dark ? 'text-slate-200' : 'text-slate-500'}>.ai</span>
    </div>
  </div>;
}

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return <div className="fixed bottom-5 left-4 right-4 z-[80] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:left-auto sm:right-6">
    <div className={cn('mt-0.5 rounded-full p-1.5', toast.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600')}>
      {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} strokeWidth={3} />}
    </div>
    <p className="flex-1 text-sm font-medium leading-5 text-slate-700">{toast.message}</p>
    <button onClick={onDismiss} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss"><X size={18} /></button>
  </div>;
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [portal, setPortal] = useState('hospital');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', organizationName: '', contactPerson: '', phone: '', address: '', city: '', state: '', postalCode: '', registrationNumber: '', role: 'hospital' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isSignUp = mode === 'signup';
  const portalInfo = portal === 'hospital'
    ? { label: 'Hospital portal', short: 'hospital', description: 'Post patient requests and track each coordination handoff.', Icon: Building2 }
    : { label: 'Donor centre portal', short: 'donor centre', description: 'View live needs and confirm available blood components.', Icon: HeartHandshake };

  const choosePortal = (nextPortal) => {
    setPortal(nextPortal);
    setForm((current) => ({ ...current, role: nextPortal }));
    setError('');
  };
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true); setError('');
    try {
      const result = isSignUp
        ? await api.register({ ...form, role: portal })
        : await api.login({ email: form.email, password: form.password, portal });
      sessionStore.setToken(result.token);
      onAuthenticated(result.user);
    } catch (err) {
      setError(err.message || 'Could not continue. Please try again.');
    } finally { setSubmitting(false); }
  };

  return <main className="relative min-h-screen overflow-x-hidden bg-slate-50 px-4 py-5 sm:p-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
    <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-rose-200/45 blur-3xl" />
    <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-100 blur-3xl" />
    <section className="relative mx-auto hidden max-w-xl lg:block">
      <Brand />
      <div className="mt-16">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white/80 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-rose-600 shadow-sm"><Radio size={14} className="animate-pulse" /> Live coordination network</div>
        <h1 className="max-w-lg text-5xl font-black leading-[1.08] tracking-tight text-slate-900">When every minute matters, <span className="text-rose-600">make the right connection.</span></h1>
        <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">Dedicated workspaces for hospitals and donor centres to coordinate urgent blood requests.</p>
      </div>
      <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
        {[['Broadcast', 'to the network', Radio], ['Match', 'availability fast', HeartHandshake], ['Track', 'every handoff', ClipboardCheck]].map(([title, copy, Icon]) => <div key={title} className="glass rounded-2xl p-4">
          <Icon className="text-rose-500" size={21} /><p className="mt-5 text-sm font-extrabold text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
        </div>)}
      </div>
      <p className="mt-12 max-w-lg text-xs leading-5 text-slate-500"><ShieldCheck className="mr-1 inline text-emerald-600" size={14} /> Operational coordination only. Always follow your local blood-bank protocols and verify compatibility.</p>
    </section>

    <section className="relative mx-auto w-full max-w-md lg:mx-0">
      <div className="mb-8 lg:hidden"><Brand /></div>
      <div className="card p-6 sm:p-8">
        <div className="mb-6"><p className="text-sm font-bold text-rose-600">Choose your workspace</p><h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{portalInfo.label}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{portalInfo.description}</p></div>
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Choose login section">
          {[['hospital', 'Hospital', Building2], ['donor_center', 'Donor centre', HeartHandshake]].map(([value, label, Icon]) => <button key={value} type="button" role="tab" aria-selected={portal === value} onClick={() => choosePortal(value)} className={cn('flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-extrabold transition sm:text-sm', portal === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}><Icon size={16} className={portal === value ? 'text-rose-600' : ''} />{label}</button>)}
        </div>
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => { setMode('login'); setError(''); }} className={cn('rounded-lg px-3 py-2 text-sm font-bold transition', !isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>Sign in</button>
          <button type="button" onClick={() => { setMode('signup'); setError(''); }} className={cn('rounded-lg px-3 py-2 text-sm font-bold transition', isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>Create account</button>
        </div>
        {error && <div className="mb-5 flex gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700"><AlertCircle className="mt-0.5 shrink-0" size={17} />{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          {isSignUp && <><div><label className="label">Your full name</label><input className="field" required value={form.fullName} placeholder="Your name" onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><label className="label">{portal === 'hospital' ? 'Hospital / clinic name' : 'Donor centre / blood bank name'}</label><input className="field" required value={form.organizationName} placeholder={portal === 'hospital' ? 'e.g. City Care Hospital' : 'e.g. City Blood Bank'} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Operational contact</label><input className="field" required value={form.contactPerson} placeholder="Coordinator name" onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div><div><label className="label">Contact number</label><input className="field" required type="tel" value={form.phone} placeholder="Primary phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div></div>
          <div><label className="label">Organisation address</label><input className="field" required value={form.address} placeholder="Street, area, building" onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-3"><div><label className="label">City</label><input className="field" required value={form.city} placeholder="City" onChange={(e) => setForm({ ...form, city: e.target.value })} /></div><div><label className="label">State</label><input className="field" required value={form.state} placeholder="State" onChange={(e) => setForm({ ...form, state: e.target.value })} /></div><div><label className="label">Postal code</label><input className="field" required value={form.postalCode} placeholder="PIN / ZIP" onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div></div>
          <div><label className="label">{portal === 'hospital' ? 'Hospital registration / licence number' : 'Blood-bank registration / licence number'}</label><input className="field" required value={form.registrationNumber} placeholder="Registration or licence ID" onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} /></div></>}
          <div><label className="label">{portalInfo.label} email</label><input className="field" required type="email" autoComplete="email" value={form.email} placeholder="you@example.com" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Password</label><input className="field" required minLength="8" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={form.password} placeholder={isSignUp ? 'At least 8 characters' : 'Your password'} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <button disabled={submitting} className="btn-primary mt-2 w-full py-3">{submitting ? <RefreshCw className="animate-spin" size={18} /> : <portalInfo.Icon size={18} />}{submitting ? 'Please wait…' : isSignUp ? `Create ${portalInfo.short} account` : `Enter ${portalInfo.short} portal`}<ArrowRight size={17} /></button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Accounts are role-specific. Use the same section you selected when your account was created.</p>
      </div>
    </section>
  </main>;
}

function Metric({ icon: Icon, value, label, tone = 'rose' }) {
  const toneClass = { rose: 'bg-rose-50 text-rose-600', violet: 'bg-violet-50 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600' }[tone];
  return <div className="card flex items-center gap-3 p-4 sm:p-5"><div className={cn('rounded-2xl p-3', toneClass)}><Icon size={21} /></div><div><p className="text-2xl font-black tracking-tight text-slate-900">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div>;
}

function BloodBadge({ group, large = false }) { return <div className={cn('grid shrink-0 place-items-center rounded-2xl bg-rose-50 font-black text-rose-600', large ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm')}>{group}</div>; }

function StatusBadge({ status, urgency }) {
  const lookup = {
    open: ['Open', 'bg-sky-50 text-sky-700'], matched: ['Matched', 'bg-violet-50 text-violet-700'], delivered: ['Delivered', 'bg-emerald-50 text-emerald-700'], cancelled: ['Cancelled', 'bg-slate-100 text-slate-600']
  };
  const [label, style] = lookup[status] || lookup.open;
  const critical = urgency === 'critical';
  return <span className={cn('status', critical && status === 'open' ? 'bg-rose-100 text-rose-700' : style)}><span className={cn('h-1.5 w-1.5 rounded-full', critical && status === 'open' ? 'bg-rose-500 animate-pulse' : 'bg-current opacity-70')} />{critical && status === 'open' ? 'Critical' : label}</span>;
}

function RequestCard({ item, user, onEdit, onDelete, onAccept, onDeliver, onTrack, busy }) {
  const mine = item.user_id === user.id;
  const canAccept = !mine && item.status === 'open' && user.role !== 'hospital';
  const canDeliver = mine && item.status === 'matched';
  const canTrackDelivery = ['matched', 'delivered'].includes(item.status) && (mine || item.accepted_by === user.id);
  return <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-24px_rgba(15,23,42,.35)]">
    <div className={cn('h-1.5', item.urgency === 'critical' ? 'bg-rose-500' : item.urgency === 'urgent' ? 'bg-amber-400' : 'bg-sky-400')} />
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start gap-3"><BloodBadge group={item.blood_group} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} urgency={item.urgency} /><span className="text-xs font-semibold text-slate-400">{relativeTime(item.created_at)}</span></div><h3 className="mt-2 truncate text-base font-black text-slate-900">{item.component}</h3><p className="mt-0.5 text-xs font-semibold text-slate-500">{item.type === 'availability' ? 'Availability posted' : `${item.units_needed} ${item.units_needed === 1 ? 'unit' : 'units'} requested`}</p></div></div>
      <div className="my-4 space-y-2.5 text-sm text-slate-600"><p className="flex items-center gap-2"><Building2 size={15} className="text-slate-400" /><span className="truncate">{item.hospital_name || organization(item.requester)}</span></p><p className="flex items-center gap-2"><MapPin size={15} className="text-slate-400" /><span className="truncate">{item.location}</span></p><p className="flex items-center gap-2"><CalendarClock size={15} className="text-slate-400" /><span>{formatDeadline(item.needed_by)}</span></p></div>
      {item.description && <p className="mb-4 line-clamp-2 text-sm leading-6 text-slate-500">{item.description}</p>}
      {item.status === 'matched' && <div className="mb-4 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold leading-5 text-violet-700"><HeartHandshake className="mr-1 inline" size={14} /> Availability confirmed by {displayName(item.acceptedByProfile)}.</div>}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">{mine ? 'You posted this' : displayName(item.requester)}</p><p className="text-[11px] text-slate-400">{mine ? ROLE_LABELS[user.role] : organization(item.requester)}</p></div>
        <div className="flex shrink-0 gap-1">
          {mine && item.status !== 'delivered' && <button title="Edit request" onClick={() => onEdit(item)} className="btn-quiet !p-2"><Edit3 size={16} /></button>}
          {mine && <button title="Delete request" onClick={() => onDelete(item)} className="btn-quiet !p-2 hover:!bg-rose-50 hover:!text-rose-600"><Trash2 size={16} /></button>}
          {canAccept && <button disabled={busy} onClick={() => onAccept(item)} className="btn-primary !px-3 !py-2 text-xs"><HeartHandshake size={15} />Confirm</button>}
          {canTrackDelivery && <button title="Track delivery" onClick={() => onTrack(item)} className="btn-secondary !p-2 text-rose-600"><Navigation size={16} /></button>}
          {canDeliver && <button disabled={busy} onClick={() => onDeliver(item)} className="btn-primary !px-3 !py-2 text-xs"><PackageCheck size={15} />Delivered</button>}
        </div>
      </div>
    </div>
  </article>;
}

const initialRequest = { type: 'request', bloodGroup: 'O+', component: 'Whole Blood', unitsNeeded: 1, hospitalName: '', location: '', contactPhone: '', urgency: 'standard', neededBy: '', description: '', aiSummary: '' };
function itemToForm(item) {
  return { type: item.type, bloodGroup: item.blood_group, component: item.component, unitsNeeded: item.units_needed, hospitalName: item.hospital_name || '', location: item.location || '', contactPhone: item.contact_phone || '', urgency: item.urgency, neededBy: item.needed_by ? new Date(item.needed_by).toISOString().slice(0, 16) : '', description: item.description || '', aiSummary: item.ai_summary || '' };
}

function RequestModal({ item, onClose, onSaved, toast }) {
  const [form, setForm] = useState(item ? itemToForm(item) : initialRequest);
  const [saving, setSaving] = useState(false);
  const [aiWorking, setAiWorking] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const useAI = async (action) => {
    setAiWorking(true); setError('');
    try {
      const { text } = await api.generateAI({ action, details: form });
      if (action === 'draft') set('description', text);
      else { set('aiSummary', text); if (action === 'summarize') set('description', form.description || text); }
      toast('AI assistance added to your draft.');
    } catch (err) { setError(err.message); } finally { setAiWorking(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { const result = item ? await api.updateItem(item.id, form) : await api.createItem(form); onSaved(normalizeItem(result.item), Boolean(item)); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/35 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={item ? 'Edit request' : 'Post a request'}>
    <div className="card mx-auto my-2 max-w-3xl overflow-hidden sm:my-8"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7"><div><p className="text-xs font-black uppercase tracking-widest text-rose-600">Network broadcast</p><h2 className="mt-0.5 text-xl font-black text-slate-900">{item ? 'Update request' : 'Post a blood request'}</h2></div><button onClick={onClose} className="btn-quiet !rounded-xl !p-2" aria-label="Close"><X size={20} /></button></div>
      <form onSubmit={submit} className="p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Post type</label><select className="field" value={form.type} onChange={(e) => set('type', e.target.value)}><option value="request">I need blood</option><option value="availability">I have availability</option></select></div>
        <div><label className="label">Urgency</label><select className="field" value={form.urgency} onChange={(e) => set('urgency', e.target.value)}><option value="critical">Critical — immediate</option><option value="urgent">Urgent — today</option><option value="standard">Standard</option></select></div>
        <div><label className="label">Blood group</label><select className="field" value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></div>
        <div><label className="label">Component</label><select className="field" value={form.component} onChange={(e) => set('component', e.target.value)}>{COMPONENTS.map((component) => <option key={component}>{component}</option>)}</select></div>
        <div><label className="label">Units {form.type === 'availability' ? 'available' : 'needed'}</label><input className="field" required type="number" min="1" max="50" value={form.unitsNeeded} onChange={(e) => set('unitsNeeded', e.target.value)} /></div>
        <div><label className="label">Required by <span className="normal-case tracking-normal text-slate-400">optional</span></label><input className="field" type="datetime-local" value={form.neededBy} onChange={(e) => set('neededBy', e.target.value)} /></div>
        <div><label className="label">Hospital / organisation</label><input className="field" value={form.hospitalName} placeholder="e.g. City Care Hospital" onChange={(e) => set('hospitalName', e.target.value)} /></div>
        <div><label className="label">City or locality</label><input className="field" required value={form.location} placeholder="e.g. Visakhapatnam" onChange={(e) => set('location', e.target.value)} /></div>
      </div>
      <div className="mt-4"><label className="label">Contact number <span className="normal-case tracking-normal text-slate-400">visible to the network</span></label><input className="field" value={form.contactPhone} placeholder="Primary coordination contact" onChange={(e) => set('contactPhone', e.target.value)} /></div>
      <div className="mt-4"><div className="mb-1.5 flex flex-wrap items-center justify-between gap-2"><label className="label !mb-0">Logistics note <span className="normal-case tracking-normal text-slate-400">optional</span></label><button type="button" disabled={aiWorking} onClick={() => useAI('draft')} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-600 hover:text-rose-700 disabled:opacity-50"><Sparkles size={14} />{aiWorking ? 'Writing…' : 'Draft with AI'}</button></div><textarea className="field min-h-28 resize-y" maxLength="2000" value={form.description} placeholder="Share the essential non-clinical logistics for the coordination team." onChange={(e) => set('description', e.target.value)} /></div>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-800"><Info size={15} className="mt-0.5 shrink-0" />AI helps with operational wording only. Confirm blood group, compatibility and clinical requirements with your blood bank.</div>
      {error && <div className="mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="shrink-0" size={17} />{error}</div>}
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving && <RefreshCw className="animate-spin" size={16} />}{saving ? 'Saving…' : item ? 'Save changes' : 'Broadcast request'}<ArrowRight size={16} /></button></div>
      </form>
    </div>
  </div>;
}


function DeliveryTrackerModal({ item, onClose, onItemUpdated, toast }) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    deliveryStatus: ['preparing', 'collected', 'in_transit', 'arrived'].includes(item.delivery_status) ? item.delivery_status : 'preparing',
    location: item.delivery_last_location || '', eta: item.delivery_eta ? new Date(item.delivery_eta).toISOString().slice(0, 16) : '', note: ''
  });
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setTracking(await api.getDelivery(item.id)); }
    catch (err) { setError(err.message || 'Could not load delivery tracking.'); }
    finally { setLoading(false); }
  }, [item.id]);
  useEffect(() => { load(); }, [load]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError('Location access is not available in this browser. Enter an operational location manually.'); return; }
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setForm((current) => ({ ...current, location: `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` })),
      () => setError('Location permission was not granted. Enter an operational location manually.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const result = await api.addDeliveryEvent(item.id, form);
      setTracking((current) => ({ item: result.item, events: [...(current?.events || []), result.event] }));
      onItemUpdated({ ...item, ...result.item });
      setForm((current) => ({ ...current, location: result.item.delivery_last_location || current.location, eta: result.item.delivery_eta ? new Date(result.item.delivery_eta).toISOString().slice(0, 16) : current.eta, note: '' }));
      toast('Private delivery update saved for the matched organisations.');
    } catch (err) { setError(err.message || 'Could not save the delivery update.'); }
    finally { setSaving(false); }
  };

  const current = tracking?.item || item;
  const currentIndex = DELIVERY_STEPS.findIndex(([value]) => value === current.delivery_status);
  const canUpdate = current.status === 'matched';
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/35 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Delivery tracking">
    <div className="card mx-auto my-2 max-w-3xl overflow-hidden sm:my-8"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7"><div><p className="text-xs font-black uppercase tracking-widest text-rose-600">Private delivery tracking</p><h2 className="mt-0.5 text-xl font-black text-slate-900">{item.blood_group} {item.component}</h2></div><button onClick={onClose} className="btn-quiet !rounded-xl !p-2" aria-label="Close"><X size={20} /></button></div>
      <div className="p-5 sm:p-7">{loading ? <div className="grid min-h-64 place-items-center"><RefreshCw className="animate-spin text-rose-600" size={24} /></div> : <>
        <div className="rounded-2xl bg-slate-50 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-900">Current stage: <span className="text-rose-600">{deliveryLabel(current.delivery_status)}</span></p><p className="mt-1 text-sm text-slate-600">{current.delivery_last_location || 'No operational location shared yet.'}</p></div><span className="status bg-rose-50 text-rose-700"><Truck size={13} />{deliveryLabel(current.delivery_status)}</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-3"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Matched</p><p className="mt-1 text-sm font-bold text-slate-700">{current.accepted_at ? formatDeadline(current.accepted_at) : '—'}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Elapsed</p><p className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-700"><Timer size={14} className="text-rose-500" />{formatDuration(current.accepted_at, current.delivered_at || new Date())}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Estimated arrival</p><p className="mt-1 text-sm font-bold text-slate-700">{current.delivery_eta ? formatDeadline(current.delivery_eta) : 'Not shared'}</p></div></div>
          <div className="mt-5 grid grid-cols-5 gap-1">{DELIVERY_STEPS.map(([value, label], index) => <div key={value} className="text-center"><div className={cn('mx-auto grid h-7 w-7 place-items-center rounded-full text-[10px] font-black', index <= currentIndex ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500')}>{index < currentIndex ? <Check size={14} strokeWidth={3} /> : index + 1}</div><p className={cn('mt-1 text-[10px] font-bold leading-3', index <= currentIndex ? 'text-rose-700' : 'text-slate-400')}>{label}</p></div>)}</div>
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-800"><Info size={15} className="mt-0.5 shrink-0" />Location sharing is optional and visible only to the hospital requester and matched donor centre. Share operational transport updates only; do not track or enter private home locations.</div>
        {canUpdate && <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Add delivery update</h3><p className="mt-1 text-xs text-slate-500">The timestamp is recorded automatically.</p></div><Navigation className="text-rose-500" size={20} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="label">Current stage</label><select className="field" value={form.deliveryStatus} onChange={(e) => setForm({ ...form, deliveryStatus: e.target.value })}>{DELIVERY_STEPS.slice(0, 4).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="label">Estimated arrival <span className="normal-case tracking-normal text-slate-400">optional</span></label><input className="field" type="datetime-local" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} /></div></div><div className="mt-4"><div className="mb-1.5 flex items-center justify-between gap-3"><label className="label !mb-0">Operational location</label><button type="button" onClick={useCurrentLocation} className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-600 hover:text-rose-700"><LocateFixed size={14} />Use my device location</button></div><input className="field" required value={form.location} placeholder="e.g. Blood bank dispatch desk, en route to hospital" onChange={(e) => setForm({ ...form, location: e.target.value })} /></div><div className="mt-4"><label className="label">Coordination note <span className="normal-case tracking-normal text-slate-400">optional</span></label><textarea className="field min-h-20 resize-y" value={form.note} maxLength="800" placeholder="Non-clinical handoff note for the matched organisation." onChange={(e) => setForm({ ...form, note: e.target.value })} /></div><div className="mt-4 flex justify-end"><button disabled={saving} className="btn-primary">{saving && <RefreshCw className="animate-spin" size={16} />}{saving ? 'Saving…' : 'Save private update'}</button></div></form>}
        {error && <div className="mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="shrink-0" size={17} />{error}</div>}
        <div className="mt-6"><div className="flex items-center justify-between"><h3 className="font-black text-slate-900">Time-stamped handoffs</h3><button onClick={load} className="btn-quiet !px-2 !py-1 text-xs"><RefreshCw size={14} />Refresh</button></div><div className="mt-3 space-y-3">{tracking?.events?.length ? tracking.events.map((entry) => <div key={entry.id} className="flex gap-3 rounded-xl border border-slate-100 p-3"><div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600"><MapPin size={15} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><p className="text-sm font-extrabold text-slate-800">{deliveryLabel(entry.delivery_status)} <span className="font-medium text-slate-400">by {displayName(entry.actor)}</span></p><time className="text-[11px] font-semibold text-slate-400">{formatDeadline(entry.occurred_at)}</time></div>{entry.location && <p className="mt-1 text-xs font-semibold text-slate-600"><MapPin className="mr-1 inline text-slate-400" size={12} />{entry.location}</p>}{entry.eta && <p className="mt-1 text-xs text-slate-500">ETA: {formatDeadline(entry.eta)}</p>}{entry.note && <p className="mt-1 text-sm leading-5 text-slate-500">{entry.note}</p>}</div></div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No private delivery updates have been shared yet.</p>}</div></div>
      </>}</div>
    </div>
  </div>;
}

function Dashboard({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ open: 0, mine: 0, matched: 0 });
  const [filter, setFilter] = useState({ status: 'open', bloodGroup: '', mine: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalItem, setModalItem] = useState(undefined);
  const [trackingItem, setTrackingItem] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [toastState, setToastState] = useState(null);
  const notify = (message, type = 'success') => { setToastState({ message, type }); window.setTimeout(() => setToastState(null), 4500); };

  const refresh = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true); setError('');
    try {
      const [feed, summary] = await Promise.all([api.getItems(filter), api.getStats()]);
      setItems((feed.items || []).map(normalizeItem)); setStats(summary);
    } catch (err) {
      setError(err.message || 'Unable to load the network.');
      if (err.status === 401) { sessionStore.setToken(''); onLogout(); }
    } finally { if (showSpinner) setLoading(false); }
  }, [filter, onLogout]);
  useEffect(() => { refresh(); }, [refresh]);

  const saveItem = (saved, wasEditing) => {
    setModalItem(undefined);
    setItems((current) => wasEditing ? current.map((existing) => existing.id === saved.id ? saved : existing) : [saved, ...current]);
    setStats((current) => ({ ...current, open: wasEditing ? current.open : current.open + 1, mine: wasEditing ? current.mine : current.mine + 1 }));
    notify(wasEditing ? 'Your request has been updated.' : 'Request broadcast to the network.');
  };
  const perform = async (action, item) => {
    const labels = { delete: 'delete this request', accept: 'confirm availability for this request', deliver: 'mark this request as delivered' };
    if (action === 'delete' && !window.confirm(`Are you sure you want to ${labels[action]}?`)) return;
    setBusyId(item.id);
    try {
      if (action === 'delete') { await api.deleteItem(item.id); setItems((current) => current.filter((x) => x.id !== item.id)); setStats((current) => ({ ...current, mine: Math.max(0, current.mine - 1), open: item.status === 'open' ? Math.max(0, current.open - 1) : current.open })); notify('Request deleted.'); }
      else { const result = action === 'accept' ? await api.acceptItem(item.id) : await api.deliverItem(item.id); const next = normalizeItem(result.item); setItems((current) => current.map((x) => x.id === item.id ? next : x)); setStats((current) => ({ ...current, open: action === 'accept' ? Math.max(0, current.open - 1) : current.open, matched: action === 'accept' ? current.matched + 1 : Math.max(0, current.matched - 1) })); notify(action === 'accept' ? 'Availability confirmed. Coordinate directly with the requester.' : 'Marked as delivered.'); }
    } catch (err) { notify(err.message, 'error'); } finally { setBusyId(''); }
  };

  const nav = <><button onClick={() => { setFilter({ status: 'open', bloodGroup: '', mine: false }); setMobileOpen(false); }} className="flex w-full items-center gap-3 rounded-xl bg-rose-50 px-3 py-2.5 text-left text-sm font-bold text-rose-700"><Activity size={17} />Live network</button><button onClick={() => { setFilter({ status: 'all', bloodGroup: '', mine: true }); setMobileOpen(false); }} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-100"><ClipboardCheck size={17} />My activity</button></>;
  return <div className="min-h-screen bg-slate-50"><header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl"><div className="shell flex h-[72px] items-center justify-between"><Brand /><div className="flex items-center gap-2 sm:gap-4"><button onClick={() => setModalItem(null)} className="btn-primary hidden sm:inline-flex"><Plus size={18} />Post request</button><div className="hidden border-l border-slate-200 pl-4 sm:block"><p className="max-w-36 truncate text-right text-sm font-extrabold text-slate-800">{displayName(user)}</p><p className="text-right text-[11px] font-medium text-slate-500">{ROLE_LABELS[user.role]}</p></div><button title="Sign out" onClick={onLogout} className="btn-quiet !p-2.5"><LogOut size={18} /></button><button onClick={() => setMobileOpen(!mobileOpen)} className="btn-quiet !p-2.5 md:hidden"><Menu size={20} /></button></div></div>{mobileOpen && <div className="shell border-t border-slate-100 py-3 md:hidden">{nav}</div>}</header>
    <div className="shell grid gap-7 py-7 md:grid-cols-[190px_minmax(0,1fr)] lg:gap-10 lg:py-9"><aside className="hidden md:block"><div className="sticky top-24">{nav}<div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><ShieldCheck className="text-emerald-600" size={20} /><p className="mt-3 text-sm font-extrabold text-emerald-900">Coordinate safely</p><p className="mt-1 text-xs leading-5 text-emerald-800">Verify every clinical requirement with your blood bank.</p></div></div></aside>
      <main className="min-w-0"><section className="relative overflow-hidden rounded-3xl bg-slate-900 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9"><div className="absolute -right-8 -top-16 h-56 w-56 rounded-full bg-rose-500/35 blur-3xl" /><div className="absolute bottom-0 right-1/4 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />Network live</div><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Good to see you, {displayName(user).split(' ')[0]}.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Coordinate an urgent request, confirm availability, and keep every handoff clear.</p></div><button onClick={() => setModalItem(null)} className="btn-primary shrink-0"><Plus size={18} />Post request</button></div></section>
        <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><Metric icon={Radio} value={stats.open} label="Open on network" tone="rose" /><Metric icon={ClipboardCheck} value={stats.mine} label="Posted by you" tone="violet" /><Metric icon={HeartHandshake} value={stats.matched} label="Being coordinated" tone="emerald" /></section>
        <section className="mt-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.15em] text-rose-600">Coordination feed</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{filter.mine ? 'My activity' : 'Live blood requests'}</h2></div><div className="grid grid-cols-2 gap-2 sm:flex"><select aria-label="Filter by status" className="field !py-2.5 text-sm" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="open">Open requests</option><option value="matched">Matched</option><option value="delivered">Delivered</option><option value="all">All statuses</option></select><select aria-label="Filter by blood group" className="field !py-2.5 text-sm" value={filter.bloodGroup} onChange={(e) => setFilter({ ...filter, bloodGroup: e.target.value })}><option value="">All groups</option>{BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select></div></div>
          {error && <div className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800"><div className="flex gap-2"><AlertCircle className="mt-0.5 shrink-0" size={17} />{error}</div><button onClick={() => refresh()} className="font-bold underline">Retry</button></div>}
          {loading ? <div className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="card h-72 animate-pulse bg-slate-100" />)}</div> : items.length ? <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <RequestCard key={item.id} item={item} user={user} busy={busyId === item.id} onEdit={setModalItem} onDelete={(x) => perform('delete', x)} onAccept={(x) => perform('accept', x)} onDeliver={(x) => perform('deliver', x)} onTrack={setTrackingItem} />)}</div> : <div className="card mt-5 grid min-h-72 place-items-center p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Search size={24} /></div><h3 className="mt-4 text-lg font-black text-slate-900">Nothing here yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{filter.mine ? 'You have not posted any requests that match this view.' : 'There are no live requests matching these filters. Check back soon or post one.'}</p><button onClick={() => setModalItem(null)} className="btn-primary mt-5"><Plus size={17} />Post a request</button></div></div>}
        </section>
        <footer className="mt-10 border-t border-slate-200 py-6 text-xs leading-5 text-slate-500">red cell.ai is an operational coordination tool, not a replacement for hospital blood-bank verification, compatibility testing, emergency services, or clinical advice.</footer>
      </main></div>
    {modalItem !== undefined && <RequestModal item={modalItem || null} onClose={() => setModalItem(undefined)} onSaved={saveItem} toast={notify} />}
    {trackingItem && <DeliveryTrackerModal item={trackingItem} onClose={() => setTrackingItem(null)} onItemUpdated={(updated) => { setTrackingItem(updated); setItems((current) => current.map((existing) => existing.id === updated.id ? { ...existing, ...updated } : existing)); }} toast={notify} />}
    <Toast toast={toastState} onDismiss={() => setToastState(null)} />
  </div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  useEffect(() => { let active = true; (async () => { if (!sessionStore.getToken()) { if (active) setBooting(false); return; } try { const result = await api.me(); if (active) setUser(result.user); } catch { sessionStore.setToken(''); } finally { if (active) setBooting(false); } })(); return () => { active = false; }; }, []);
  const logout = useCallback(async () => { try { await api.logout(); } catch { /* local logout still succeeds */ } finally { sessionStore.setToken(''); setUser(null); } }, []);
  if (booting) return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-600 text-white shadow-glow"><Droplets fill="currentColor" size={23} /></div><p className="mt-4 text-sm font-bold text-slate-500">Opening the network…</p></div></div>;
  return user ? <Dashboard user={user} onLogout={logout} /> : <AuthScreen onAuthenticated={setUser} />;
}
