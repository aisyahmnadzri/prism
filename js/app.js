// PRISM — app shell + pages (role-based). Each HTML page sets <body data-page="...">.
const user = requireAuth();
let accounts = loadAccounts();

const PAGES = {
  dashboard: { file: 'dashboard.html', label: 'Dashboard', roles: ['TL', 'AM', 'DEV'], group: 'Workspace' },
  pipeline: { file: 'pipeline.html', label: 'Pipeline', roles: ['TL', 'AM', 'DEV'], group: 'Workspace' },
  schedule: { file: 'schedule.html', label: 'Schedule', roles: ['TL', 'AM', 'DEV'], group: 'Workspace' },
  approvals: { file: 'approvals.html', label: 'Approvals', roles: ['TL', 'AM', 'HM'], group: 'Workspace' },
  messages: { file: 'messages.html', label: 'Messages', roles: ['TL', 'AM', 'DEV', 'HM'], group: 'Workspace' },
  accounts: { file: 'accounts.html', label: 'Accounts', roles: ['TL', 'AM', 'DEV'], group: 'Workspace' },
  account: { file: 'account.html', label: 'Account', roles: ['TL', 'AM', 'DEV', 'HM'], hidden: true },
  'account-form': { file: 'account-form.html', label: 'Account form', roles: ['TL', 'AM'], hidden: true },
  notifications: { file: 'notifications.html', label: 'Notifications', roles: ['TL', 'AM', 'DEV', 'HM'], hidden: true },
  reports: { file: 'reports.html', label: 'Reports', roles: ['TL', 'AM', 'HM'], group: 'Insights' },
  audit: { file: 'audit.html', label: 'Audit trail', roles: ['TL'], group: 'Insights' },
  feedback: { file: 'feedback.html', label: 'Feedback', roles: ['TL', 'AM', 'DEV', 'HM'], group: 'General' },
  settings: { file: 'settings.html', label: 'Settings', roles: ['TL', 'AM', 'DEV', 'HM'], group: 'General' },
};

const page = document.body.dataset.page;
const navPages = Object.keys(PAGES).filter(k => PAGES[k].roles.includes(user.role) && !PAGES[k].hidden);

// Send users to a page they are allowed to see (e.g. Higher Management → Approvals).
const redirecting = !PAGES[page] || !PAGES[page].roles.includes(user.role);
if (redirecting) window.location.replace(PAGES[navPages[0]].file);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stageOf = a => STAGES[a.stage - 1];
const daysIn = a => Math.floor((Date.now() - new Date(a.stageSince)) / 86400000);
const isOverdue = a => !a.outcome && daysIn(a) > stageOf(a).targetDays;
const statusClass = s => 'b-' + s.toLowerCase().replace(/\s/g, '');
const initials = n => n.split(' ').map(p => p[0]).slice(0, 2).join('');
const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const nameOf = id => (userById(id) || { name: '—' }).name;
const accountLink = a => `account.html?id=${encodeURIComponent(a.id)}`;
const evidenceComplete = a => stageOf(a).deliverables.every((_, i) => a.evidence && a.evidence[i]);
const STATUSES = ['On Track', 'At Risk', 'Delayed', 'On Hold'];

// ---- Icons (inline SVG, Lucide-style outlines) ----
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  kanban: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7v7M12 7v4M16 7v10"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 5-5"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8.5 7h.01M12 7h.01M15.5 7h.01M8.5 11h.01M12 11h.01M15.5 11h.01"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/><path d="M3.5 12h5l1-2 2 4.5 2-6 1.5 3.5h5.5"/>',
  funnel: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  hourglass: '<path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  listcheck: '<path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 16v5M16.5 18.5h5"/>',
  arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a6 6 0 0 0 6-6c0-4.9-4.5-8.6-10-8.6Z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8M8 13h5"/>',
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const LOGO = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><defs>
  <linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c4b5fd"/><stop offset=".5" stop-color="#818cf8"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
  <linearGradient id="lgB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a78bfa"/><stop offset=".35" stop-color="#22d3ee"/><stop offset=".7" stop-color="#fbbf24"/><stop offset="1" stop-color="#fb7185"/></linearGradient></defs>
  <rect width="40" height="40" rx="11" fill="#1c1f45"/><path d="M18 8 29 29H7Z" fill="url(#lgA)"/><path d="M18 8 21 29h-6Z" fill="#fff" opacity=".35"/>
  <path d="M24 19.5 36 16v7Z" fill="url(#lgB)" opacity=".95"/></svg>`;

const HERO_ART = `<svg class="hero-art" viewBox="0 0 340 180" aria-hidden="true"><defs>
  <linearGradient id="hBeam" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient>
  <linearGradient id="hPrism" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient>
  <linearGradient id="hFade" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient>
  <mask id="hMask"><rect x="190" y="0" width="150" height="180" fill="url(#hFade)"/></mask></defs>
  <path d="M0 98 L136 92" stroke="url(#hBeam)" stroke-width="3" stroke-linecap="round"/>
  <g mask="url(#hMask)">
    <path d="M196 89 L340 26 L340 44 Z" fill="#a78bfa"/><path d="M196 91 L340 48 L340 66 Z" fill="#60a5fa"/>
    <path d="M196 93 L340 70 L340 88 Z" fill="#22d3ee"/><path d="M196 95 L340 92 L340 110 Z" fill="#34d399"/>
    <path d="M196 97 L340 114 L340 132 Z" fill="#fbbf24"/><path d="M196 99 L340 136 L340 154 Z" fill="#fb7185"/></g>
  <path d="M136 92 L196 94" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
  <path d="M166 30 L218 132 L114 132 Z" fill="url(#hPrism)" stroke="rgba(255,255,255,.6)" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M166 30 L174 132 L158 132 Z" fill="#fff" opacity=".12"/></svg>`;

const PANEL_ICON = {
  'Portfolio health': 'heart', 'Pipeline funnel': 'funnel', 'Risk map': 'target', 'Deadline timeline': 'calendar',
  'Approval aging': 'hourglass', 'POC outcomes': 'trophy', 'Time in stage vs target': 'gauge', 'Workload by status': 'users',
  'Team activity': 'activity', 'My to-dos': 'listcheck',
};
const NAV_ICON = { dashboard: 'grid', pipeline: 'kanban', schedule: 'calendar', approvals: 'check', messages: 'chat', accounts: 'building', reports: 'chart', audit: 'history', feedback: 'bulb', settings: 'gear' };

// ---- Access rules ----
function canView(a) {
  if (user.role === 'TL' || user.role === 'HM') return true;
  if (user.role === 'AM') return a.am === user.id;
  return a.devs.includes(user.id);
}

// Higher Management never edits; they only approve their stages.
const canEdit = a => !a.outcome && user.role !== 'HM' && canView(a);

// Account details: Team Lead edits everything; an Account Manager edits the details of their own accounts
// but cannot reassign people. Only the Team Lead creates accounts.
const canEditDetails = a => user.role === 'TL' || (user.role === 'AM' && a.am === user.id);
const canCreate = user.role === 'TL';

// Active views leave archived accounts out; pass { archived: true } to include them.
function visibleAccounts({ archived = false } = {}) {
  const list = user.role === 'HM' ? [] : accounts.filter(canView);
  return archived ? list : list.filter(a => !a.archived);
}
// Only decided POCs (Converted / Closed) can be archived, and only by the Team Lead.
const canArchive = a => user.role === 'TL' && !!a.outcome;

function archiveAccount(id, ask = true) {
  const a = find(id);
  if (!a || !canArchive(a) || a.archived) return false;
  if (ask && !confirm(`Archive ${a.name}? It will be hidden from active views. Its history is kept and you can restore it any time.`)) return false;
  a.archived = { at: new Date().toISOString(), by: user.id };
  log(a, 'Archived the account');
  return true;
}
function restoreAccount(id) {
  const a = find(id);
  if (!a || user.role !== 'TL' || !a.archived) return;
  a.archived = null;
  log(a, 'Restored the account from the archive');
  commit(`${a.name} restored`);
}
function archiveAllDecided() {
  const decided = visibleAccounts().filter(a => a.outcome);
  if (!decided.length || !confirm(`Archive ${decided.length} decided POC${decided.length === 1 ? '' : 's'}? Their history is kept and you can restore them any time.`)) return;
  decided.forEach(a => archiveAccount(a.id, false));
  commit(`${decided.length} account${decided.length === 1 ? '' : 's'} archived`);
}

function canApprove(a) {
  if (!a.pending || a.outcome) return false;
  if (stageOf(a).approver !== user.role) return false;
  if (user.role === 'AM' && a.am !== user.id) return false;
  return true;
}

const myApprovals = () => accounts.filter(canApprove);
const approves = PAGES.approvals.roles.includes(user.role);

// ---- Actions ----
function find(id) { return accounts.find(x => x.id === id); }
function log(a, text) { a.history.unshift({ by: user.id, at: new Date().toISOString(), text }); }
function commit(msg) { saveAccounts(accounts); if (msg) toast(msg); render(); }

function moveToStage(a, stageId) {
  a.stage = stageId;
  a.evidence = STAGES[stageId - 1].deliverables.map(() => null);
  a.stageSince = new Date().toISOString();
  a.pending = null;
}

function approve(id, decision) {
  const a = find(id);
  if (!a || !canApprove(a) || !evidenceComplete(a)) return;
  const from = stageOf(a).name;
  if (a.stage === 10) {
    if (decision === 'Extended') { moveToStage(a, 6); a.status = 'On Track'; log(a, 'Decision: POC extended — back to POC Development'); }
    else { a.outcome = decision; a.pending = null; log(a, `Decision: POC ${decision.toLowerCase()}`); }
    return commit(`${a.name}: ${decision}`);
  }
  moveToStage(a, a.stage + 1);
  log(a, `Approved: ${from} → ${stageOf(a).name}`);
  commit(`${a.name} moved to “${stageOf(a).name}”`);
}

function returnForRework(id) {
  const a = find(id);
  if (!a || !canApprove(a)) return;
  a.pending = null;
  log(a, `Returned for rework at ${stageOf(a).name}`);
  commit(`${a.name} returned for rework`);
}

function requestApproval(id) {
  const a = find(id);
  if (!a || !canEdit(a) || a.pending || !evidenceComplete(a)) return;
  a.pending = { by: user.id, at: new Date().toISOString() };
  log(a, a.stage === 10 ? 'Requested Go / No-Go decision' : `Requested approval to move to ${STAGES[a.stage].name}`);
  commit(`Approval requested from ${ROLES[stageOf(a).approver].label}`);
}

function skipStage(id) {
  const a = find(id);
  if (!a || user.role !== 'TL' || !canEdit(a) || a.pending || !stageOf(a).skippable) return;
  const from = stageOf(a).name;
  moveToStage(a, a.stage + 1);
  log(a, `Skipped optional stage: ${from}`);
  commit(`${from} skipped`);
}

function attachEvidence(id, idx, fileName) {
  const a = find(id);
  if (!a || !canEdit(a) || a.pending) return;
  a.evidence[idx] = fileName;
  log(a, `Submitted “${stageOf(a).deliverables[idx]}” (${fileName})`);
  commit('Document submitted');
}

function removeEvidence(id, idx) {
  const a = find(id);
  if (!a || !canEdit(a) || a.pending) return;
  log(a, `Removed “${stageOf(a).deliverables[idx]}”`);
  a.evidence[idx] = null;
  commit('Document removed');
}

function addUpdate(id, form) {
  const a = find(id);
  if (!a || !canEdit(a)) return;
  const progress = Math.max(0, Math.min(100, parseInt(form.progress.value, 10) || 0));
  const note = form.note.value.trim();
  if (!note) { toast('Please write what happened this week'); return; }
  a.status = form.status.value;
  a.progress = progress;
  a.updates.unshift({ by: user.id, at: new Date().toISOString(), status: a.status, progress, note, blockers: form.blockers.value.trim() });
  log(a, `Posted a progress update (${progress}%)`);
  commit('Update posted');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---- Page: Dashboard ----
// Charts are drawn as plain SVG/HTML (no chart library) so they work offline and follow light/dark mode.
const STATUS_COLOR = { 'On Track': 'var(--green)', 'At Risk': 'var(--amber)', 'Delayed': 'var(--red)', 'On Hold': 'var(--grey)' };
const daysSince = iso => Math.floor((Date.now() - new Date(iso)) / 86400000);
const daysLeft = a => stageOf(a).targetDays - daysIn(a);
const STALE_DAYS = 14;      // "no recent update" threshold
const DEADLINE_WINDOW = 14; // deadline timeline range (days either side of today)
const short = (s, n = 18) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const accLink = a => `<a href="${accountLink(a)}">${esc(a.name)}</a>`;
const isStale = a => !a.updates.length || daysSince(a.updates[0].at) > STALE_DAYS;

function panel(title, body, hint, cls = '') {
  return `<div class="card panel ${cls}"><div class="panel-head"><span class="panel-ic">${icon(PANEL_ICON[title] || 'grid')}</span>
    <div><h3 class="card-title">${title}</h3>${hint ? `<p class="hint">${hint}</p>` : ''}</div></div>${body}</div>`;
}
function legend(items) {
  return `<div class="viz-legend">${items.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;
}
// rows: [{ label, value, display?, target?, cls? }] — horizontal bars with optional target marker
function bars(rows) {
  const max = Math.max(1, ...rows.map(r => Math.max(r.value, r.target || 0)));
  return `<div class="bars">${rows.map(r => `<div class="bar-row">
      <span class="bar-label" title="${esc(r.label)}">${esc(r.label)}</span>
      <span class="bar-track"><i class="${r.cls || ''}" style="width:${(r.value / max) * 100}%"></i>${r.target ? `<b class="bar-target" style="left:${(r.target / max) * 100}%" title="Target ${r.target}d"></b>` : ''}</span>
      <span class="bar-val">${r.display ?? r.value}</span>
    </div>`).join('')}</div>`;
}
// rows: [{ label, parts: [{ value, color, title }] }] — stacked horizontal bars
function stackedBars(rows) {
  const max = Math.max(1, ...rows.map(r => r.parts.reduce((t, p) => t + p.value, 0)));
  return `<div class="bars">${rows.map(r => {
    const total = r.parts.reduce((t, p) => t + p.value, 0);
    return `<div class="bar-row">
      <span class="bar-label" title="${esc(r.label)}">${esc(r.label)}</span>
      <span class="bar-track stacked">${r.parts.filter(p => p.value).map(p => `<i style="width:${(p.value / max) * 100}%;background:${p.color}" title="${esc(p.title)}"></i>`).join('')}</span>
      <span class="bar-val">${total}</span></div>`;
  }).join('')}</div>`;
}
function donut(segs, center, sub, label) {
  const r = 42, C = 2 * Math.PI * r, total = segs.reduce((t, s) => t + s.value, 0);
  let off = 0;
  const arcs = segs.filter(s => s.value).map(s => {
    const len = (s.value / total) * C;
    const el = `<circle r="${r}" cx="60" cy="60" fill="none" style="stroke:${s.color}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"><title>${esc(s.label)}: ${s.value}</title></circle>`;
    off += len;
    return el;
  }).join('');
  return `<svg viewBox="0 0 120 120" class="donut" role="img" aria-label="${esc(label)}">
    <g transform="rotate(-90 60 60)"><circle r="${r}" cx="60" cy="60" fill="none" style="stroke:var(--surface-2)" stroke-width="16"/>${arcs}</g>
    <text x="60" y="62" text-anchor="middle" class="donut-num">${center}</text>
    <text x="60" y="80" text-anchor="middle" class="donut-sub">${sub}</text></svg>`;
}
function ring(pct, label) {
  const r = 26, C = 2 * Math.PI * r;
  return `<svg viewBox="0 0 64 64" class="ring" role="img" aria-label="${esc(label)}">
    <circle r="${r}" cx="32" cy="32" fill="none" style="stroke:var(--surface-2)" stroke-width="8"/>
    <circle r="${r}" cx="32" cy="32" fill="none" style="stroke:var(--accent)" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${(pct / 100) * C} ${C}" transform="rotate(-90 32 32)"/>
    <text x="32" y="37" text-anchor="middle" class="ring-num">${pct}%</text></svg>`;
}

// 1. KPI tiles
function kpiTiles(list, active) {
  const risky = active.filter(a => a.status === 'At Risk' || a.status === 'Delayed').length;
  const overdue = active.filter(isOverdue).length;
  const mix = Object.keys(STATUS_COLOR).map(s => [s, active.filter(a => a.status === s).length]).filter(([, n]) => n);
  const statusBar = `<span class="kpi-bar">${mix.map(([s, n]) => `<i style="width:${(n / active.length) * 100}%;background:${STATUS_COLOR[s]}" title="${s}: ${n}"></i>`).join('')}</span>`;
  const tiles = [
    { label: user.role === 'TL' ? 'Active POCs' : 'My active POCs', value: active.length, href: 'accounts.html', ic: 'layers', tone: 'tone-violet', extra: active.length ? statusBar : '' },
    { label: 'At risk / delayed', value: risky, cls: risky ? 'warn' : '', href: 'accounts.html', ic: 'alert', tone: 'tone-amber', foot: risky ? 'Needs a closer look' : 'All healthy' },
    { label: 'Overdue in stage', value: overdue, cls: overdue ? 'bad' : '', href: 'pipeline.html', ic: 'clock', tone: 'tone-red', foot: overdue ? 'Past the stage target' : 'Everything on time' },
  ];
  if (approves) tiles.push({ label: 'Awaiting my approval', value: myApprovals().length, cls: 'accent', href: 'approvals.html', ic: 'check', tone: 'tone-cyan', foot: myApprovals().length ? 'Open approvals →' : 'Nothing waiting' });
  return `<div class="cards">${tiles.map(t => `<a class="card stat ${t.tone} ${t.cls || ''}" href="${t.href}">
      <div class="stat-top"><span class="stat-ic">${icon(t.ic)}</span><span class="label">${t.label}</span></div>
      <div class="value">${t.value}</div>${t.extra || ''}${t.foot ? `<span class="stat-foot">${t.foot}</span>` : ''}</a>`).join('')}</div>`;
}

// 2. Status donut
function statusDonut(active) {
  const segs = Object.keys(STATUS_COLOR).map(s => ({ label: s, value: active.filter(a => a.status === s).length, color: STATUS_COLOR[s] }));
  return panel('Portfolio health', `<div class="donut-wrap">${donut(segs, active.length, 'active', 'Accounts by status')}
    <ul class="donut-legend">${segs.map(s => `<li><i style="background:${s.color}"></i>${s.label}<b>${s.value}</b></li>`).join('')}</ul></div>`);
}

// 3. Pipeline funnel by phase
function phaseFunnel(list, active) {
  const rows = PHASES.map((ph, i) => ({
    name: ph.name, color: ph.color, w: 100 - i * 13,
    n: active.filter(a => ph.stages.includes(a.stage)).length,
    detail: ph.stages.map(id => `S${id}: ${active.filter(a => a.stage === id).length}`).join(' · '),
  }));
  const decided = list.filter(a => a.outcome).length;
  rows.push({ name: 'Decided', color: '#16a34a', w: 61, n: decided, detail: 'Converted or closed' });
  return panel('Pipeline funnel', `<div class="funnel">${rows.map(r => `<a class="funnel-row" href="pipeline.html" style="--c:${r.color};width:${r.w}%">
      <b>${r.name}</b><small>${r.detail}</small><span class="funnel-n">${r.n}</span></a>`).join('')}</div>`, 'accounts in each phase · click to open the pipeline');
}

// 4. Risk map: time used of stage target (x) vs progress (y)
function riskMap(active) {
  if (!active.length) return panel('Risk map', '<p class="sub">No active accounts.</p>');
  const narrow = window.innerWidth < 640;
  const W = narrow ? 360 : 600, H = narrow ? 300 : 270, L = narrow ? 38 : 46, R = narrow ? 10 : 18, T = 14, B = 40, pw = W - L - R, ph = H - T - B, maxX = 200;
  const x = v => L + (Math.min(v, maxX) / maxX) * pw;
  const y = v => T + (1 - v / 100) * ph;
  const grid = [0, 50, 100, 150, 200].map(v => `<line x1="${x(v)}" y1="${T}" x2="${x(v)}" y2="${T + ph}" class="grid"/>
      <text x="${x(v)}" y="${T + ph + 16}" text-anchor="middle" class="axis">${v}%${v === maxX ? '+' : ''}</text>`).join('')
    + [0, 50, 100].map(v => `<line x1="${L}" y1="${y(v)}" x2="${L + pw}" y2="${y(v)}" class="grid"/>
      <text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${v}%</text>`).join('');
  const zones = `<rect x="${x(75)}" y="${T}" width="${x(100) - x(75)}" height="${ph}" class="zone-warn"/>
    <rect x="${x(100)}" y="${T}" width="${x(maxX) - x(100)}" height="${ph}" class="zone-bad"/>
    <text x="${x(150)}" y="${T + 14}" text-anchor="middle" class="zone-label">Over stage target</text>`;
  const dots = active.map(a => {
    const used = Math.round((daysIn(a) / stageOf(a).targetDays) * 100);
    const cx = x(used), cy = y(a.progress), stale = isStale(a);
    const right = cx > W - (narrow ? 110 : 150);
    const tip = `${a.name} — ${a.status}, ${used}% of stage time used, ${a.progress}% progress${stale ? ', no update in 14 days' : ''}`;
    return `<a href="${accountLink(a)}" class="dot"><title>${esc(tip)}</title>
      ${stale ? `<circle cx="${cx}" cy="${cy}" r="12" class="stale-ring"/>` : ''}
      <circle cx="${cx}" cy="${cy}" r="7" style="fill:${STATUS_COLOR[a.status]}"/>
      <text x="${right ? cx - 16 : cx + 16}" y="${cy + 4}" text-anchor="${right ? 'end' : 'start'}" class="dot-label">${esc(short(a.name, narrow ? 13 : 18))}</text></a>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Risk map of accounts by time used and progress">
    ${zones}${grid}
    <text x="${L + pw / 2}" y="${H - 4}" text-anchor="middle" class="axis-title">Time used of stage target →</text>
    <text x="12" y="${T + ph / 2}" text-anchor="middle" class="axis-title" transform="rotate(-90 12 ${T + ph / 2})">Progress →</text>
    ${dots}</svg>`;
  return panel('Risk map', svg + legend([
    ...Object.entries(STATUS_COLOR).map(([s, c]) => [c, s]),
    ['transparent; border:1.5px dashed var(--muted)', 'No update in 14 days'],
  ]), 'right = running out of time · low = little progress', 'span-wide');
}

// 5. Deadline timeline (overdue to the left of today)
function deadlineTimeline(active) {
  const rows = active.filter(a => daysLeft(a) <= DEADLINE_WINDOW).sort((p, q) => daysLeft(p) - daysLeft(q));
  const pos = d => ((Math.max(-DEADLINE_WINDOW, Math.min(DEADLINE_WINDOW, d)) + DEADLINE_WINDOW) / (2 * DEADLINE_WINDOW)) * 100;
  const scale = `<div class="lane lane-scale"><span></span><span class="lane-track">
      <em style="left:0">−${DEADLINE_WINDOW}d</em><em style="left:50%">today</em><em style="left:100%">+${DEADLINE_WINDOW}d</em></span><span></span></div>`;
  const body = rows.length ? scale + rows.map(a => {
    const d = daysLeft(a);
    const c = d < 0 ? 'var(--red)' : d <= 7 ? 'var(--amber)' : 'var(--green)';
    const from = Math.min(pos(0), pos(d)), width = Math.abs(pos(d) - pos(0));
    const txt = d < 0 ? `${-d}d over` : d === 0 ? 'today' : `${d}d left`;
    return `<a class="lane" href="${accountLink(a)}" title="${esc(a.name)} · ${esc(stageOf(a).name)} · ${txt}">
      <span class="lane-name">${esc(short(a.name, 22))}</span>
      <span class="lane-track"><i class="lane-today"></i><i class="lane-span" style="left:${from}%;width:${width}%;background:${c}"></i><b class="lane-dot" style="left:${pos(d)}%;background:${c}"></b></span>
      <span class="lane-val" style="color:${c}">${txt}</span></a>`;
  }).join('') : '<p class="sub">No stage targets in the next 14 days.</p>';
  return panel('Deadline timeline', body + legend([['var(--red)', 'Overdue'], ['var(--amber)', '≤ 7 days'], ['var(--green)', '8–14 days']]), 'stage targets ±14 days');
}

// 6. Approval aging
function approvalAging(active) {
  const buckets = [['0–2 days', 'var(--green)', d => d <= 2], ['3–5 days', 'var(--amber)', d => d >= 3 && d <= 5], ['Over 5 days', 'var(--red)', d => d > 5]];
  const rows = ['TL', 'AM', 'HM'].map(r => {
    const waits = active.filter(a => a.pending && stageOf(a).approver === r).map(a => daysSince(a.pending.at));
    return { label: ROLES[r].label, parts: buckets.map(([l, c, f]) => ({ value: waits.filter(f).length, color: c, title: `${waits.filter(f).length} waiting ${l}` })) };
  });
  return panel('Approval aging', stackedBars(rows) + legend(buckets.map(([l, c]) => [c, l])), 'pending approvals by approver');
}

// 7. Outcomes donut
function outcomesDonut(list) {
  const converted = list.filter(a => a.outcome === 'Converted').length;
  const closed = list.filter(a => a.outcome === 'Closed').length;
  const extended = list.reduce((n, a) => n + a.history.filter(h => h.text.startsWith('Decision: POC extended')).length, 0);
  const rate = converted + closed ? Math.round((converted / (converted + closed)) * 100) + '%' : '—';
  const segs = [{ label: 'Converted', value: converted, color: 'var(--accent)' }, { label: 'Closed', value: closed, color: 'var(--grey)' }];
  return panel('POC outcomes', `<div class="donut-wrap">${donut(segs, rate, 'converted', 'POC outcomes')}
    <ul class="donut-legend">${segs.map(s => `<li><i style="background:${s.color}"></i>${s.label}<b>${s.value}</b></li>`).join('')}
      <li><i style="background:transparent;border:1.5px dashed var(--muted)"></i>Extended<b>${extended}</b></li></ul></div>`);
}

// 8. Time in stage vs target (bullet chart)
function stageTiming(active) {
  const rows = STAGES.map(s => {
    const here = active.filter(a => a.stage === s.id);
    const avg = here.length ? Math.round(here.reduce((t, a) => t + daysIn(a), 0) / here.length) : 0;
    return { label: `${s.id}. ${s.name}`, value: avg, target: s.targetDays, display: here.length ? `${avg}/${s.targetDays}d` : `—/${s.targetDays}d`, cls: avg > s.targetDays ? 'bad' : '' };
  });
  return panel('Time in stage vs target', bars(rows), 'avg days now · line = target');
}

// 9. Workload by status (Team Lead only)
function workload(active) {
  const row = u => ({ label: u.name, parts: Object.entries(STATUS_COLOR).map(([s, c]) => {
    const n = active.filter(a => a.status === s && (u.role === 'AM' ? a.am === u.id : a.devs.includes(u.id))).length;
    return { value: n, color: c, title: `${s}: ${n}` };
  }) });
  return panel('Workload by status', `<h4>Account Managers</h4>${stackedBars(USERS.filter(u => u.role === 'AM').map(row))}
    <h4>Developers</h4>${stackedBars(USERS.filter(u => u.role === 'DEV').map(row))}`, 'active accounts per person');
}

// 10. Activity heatmap (last 8 weeks) + latest actions
function activityPanel(list) {
  const events = list.flatMap(a => a.history.map(h => ({ ...h, a })));
  const DAYS = 56, today = new Date(); today.setHours(0, 0, 0, 0);
  const start = today.getTime() - (DAYS - 1) * 86400000;
  const counts = Array(DAYS).fill(0);
  events.forEach(e => { const d = new Date(e.at); d.setHours(0, 0, 0, 0); const i = Math.round((d - start) / 86400000); if (i >= 0 && i < DAYS) counts[i]++; });
  const max = Math.max(1, ...counts), cell = 15, gap = 3;
  const cells = counts.map((n, i) => {
    const day = new Date(start + i * 86400000);
    return `<rect x="${Math.floor(i / 7) * (cell + gap)}" y="${(i % 7) * (cell + gap)}" width="${cell}" height="${cell}" rx="3"
      class="${n ? 'heat' : 'heat-empty'}" style="${n ? `fill-opacity:${0.25 + 0.75 * (n / max)}` : ''}"><title>${fmtDate(day.toISOString())}: ${n} action${n === 1 ? '' : 's'}</title></rect>`;
  }).join('');
  const w = 8 * (cell + gap), h = 7 * (cell + gap);
  const heat = `<svg viewBox="0 0 ${w} ${h + 14}" class="heatmap" role="img" aria-label="Team activity over the last 8 weeks">${cells}
    <text x="0" y="${h + 12}" class="axis">8 weeks ago</text><text x="${w - gap}" y="${h + 12}" text-anchor="end" class="axis">today</text></svg>`;
  const feed = events.sort((p, q) => new Date(q.at) - new Date(p.at)).slice(0, 5)
    .map(e => `<li><span class="when">${fmtDate(e.at)}</span><span>${accLink(e.a)} — ${esc(e.text)}</span></li>`).join('');
  return panel('Team activity', `<div class="activity">${heat}<ul class="timeline compact">${feed || '<li class="sub">No activity yet.</li>'}</ul></div>`, 'actions per day');
}

// 11. My to-dos with progress ring
function todoPanel(list, active) {
  const mine = active.filter(a => canEdit(a) && !a.pending);
  const required = mine.reduce((t, a) => t + stageOf(a).deliverables.length, 0);
  const done = mine.reduce((t, a) => t + stageOf(a).deliverables.filter((_, i) => a.evidence[i]).length, 0);
  const pct = required ? Math.round((done / required) * 100) : 100;
  const todos = [];
  myApprovals().filter(a => list.includes(a)).forEach(a => todos.push(`<li><span class="todo-ic appr">✓</span><span>Approve ${accLink(a)}<span class="sub"> · ${esc(stageOf(a).name)}</span></span></li>`));
  mine.forEach(a => {
    const missing = stageOf(a).deliverables.filter((_, i) => !a.evidence[i]);
    if (missing.length) missing.forEach(d => todos.push(`<li><span class="todo-ic up">↑</span><span>Upload ${esc(d)}<span class="sub"> · </span>${accLink(a)}</span></li>`));
    else todos.push(`<li><span class="todo-ic req">→</span><span>Request approval<span class="sub"> · </span>${accLink(a)}</span></li>`);
  });
  const more = todos.length > 5 ? `<li class="sub">+ ${todos.length - 5} more</li>` : '';
  return panel('My to-dos', `<div class="todo-head">${ring(pct, 'Documents submitted for current stages')}
      <div><b>${done} of ${required}</b><span class="sub">documents submitted for current stages</span></div></div>
    <ul class="todo-list">${todos.slice(0, 5).join('') || '<li class="sub">You are all caught up.</li>'}${more}</ul>`);
}

function heroBanner(active) {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const appr = approves ? myApprovals().length : 0;
  const overdue = active.filter(isOverdue).length;
  const risky = active.filter(a => a.status === 'At Risk' || a.status === 'Delayed').length;
  const bits = [];
  if (appr) bits.push(`<b>${appr} approval${appr === 1 ? '' : 's'}</b> waiting for you`);
  if (overdue) bits.push(`<b>${overdue} account${overdue === 1 ? '' : 's'}</b> past the stage target`);
  if (risky) bits.push(`<b>${risky}</b> at risk or delayed`);
  const summary = bits.length
    ? `Here's what needs you today: ${bits.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`
    : `All ${active.length} active POC${active.length === 1 ? ' is' : 's are'} on track. Nice work.`;
  return `<section class="hero">
    <div><span class="eyebrow">${icon('sparkles')} ${ROLES[user.role].label} · ${active.length} active POCs</span>
      <h2>${greet}, ${esc(user.name.split(' ')[0])}</h2><p>${summary}</p>
      <div class="hero-actions">
        ${appr ? `<a class="btn btn-light" href="approvals.html">Review approvals ${icon('arrow')}</a>` : ''}
        <a class="btn ${appr ? 'btn-ghost-light' : 'btn-light'}" href="pipeline.html">${icon('kanban')} Open pipeline</a>
      </div></div>
    ${HERO_ART}</section>`;
}

function dashboardPage(list) {
  const active = list.filter(a => !a.outcome);
  return `${heroBanner(active)}${kpiTiles(list, active)}
    <div class="viz-row r-1-2">${statusDonut(active)}${phaseFunnel(list, active)}</div>
    <div class="viz-row r-3-2">${riskMap(active)}${deadlineTimeline(active)}</div>
    <div class="viz-row r-3">${approvalAging(active)}${outcomesDonut(visibleAccounts({ archived: true }))}${stageTiming(active)}</div>
    <div class="viz-row ${user.role === 'TL' ? 'r-3' : 'r-2'}">${user.role === 'TL' ? workload(active) : ''}${activityPanel(list)}${todoPanel(list, active)}</div>`;
}

// ---- Page: Pipeline ----
// The 10 stages grouped into three phases, plus a final Outcomes lane.
const PHASES = [
  { name: 'Pre-POC', desc: 'Qualify & agree', color: '#8b5cf6', stages: [1, 2, 3, 4] },
  { name: 'Build', desc: 'Prepare & develop', color: '#0ea5e9', stages: [5, 6, 7] },
  { name: 'Evaluate & decide', desc: 'Prove value & close', color: '#f59e0b', stages: [8, 9, 10] },
];
const pf = { q: '', status: 'all', am: 'all', flag: 'all' }; // pipeline filters
const ROLE_SHORT = { TL: 'Team Lead', AM: 'AM', HM: 'Mgmt', DEV: 'Dev' };

function pipelineFiltered(list) {
  const q = pf.q.trim().toLowerCase();
  return list.filter(a =>
    (!q || `${a.name} ${a.useCase} ${a.id}`.toLowerCase().includes(q)) &&
    (pf.status === 'all' || a.status === pf.status) &&
    (pf.am === 'all' || a.am === pf.am) &&
    (pf.flag === 'all' || (pf.flag === 'pending' && a.pending && !a.outcome) || (pf.flag === 'overdue' && isOverdue(a))));
}

function avatars(a) {
  const people = [{ id: a.am, cls: 'am', role: 'Account Manager' }, ...a.devs.map(id => ({ id, cls: 'dev', role: 'Developer' }))];
  return `<span class="avs">${people.map(p => `<span class="av ${p.cls}" data-u="${p.id}" title="${esc(nameOf(p.id))} · ${p.role}">${esc(initials(nameOf(p.id)))}</span>`).join('')}</span>`;
}

function pipelineCard(a) {
  const s = stageOf(a);
  const statusKey = (a.outcome || a.status).toLowerCase().replace(/\s/g, '');
  const tags = [];
  if (!a.outcome) tags.push(`<span class="badge ${statusClass(a.status)}">${a.status}</span>`);
  else tags.push(`<span class="badge ${statusClass(a.outcome)}">${a.outcome}</span>`);
  if (isOverdue(a)) tags.push(`<span class="badge b-delayed">Overdue ${-daysLeft(a)}d</span>`);
  if (a.pending && !a.outcome) tags.push(`<span class="badge b-pending" title="Waiting for ${ROLES[s.approver].label}">⏳ ${ROLE_SHORT[s.approver]} approval</span>`);

  let time;
  if (a.outcome) {
    time = `<div class="pcard-time">Decided ${fmtDate(a.stageSince)}</div>`;
  } else {
    const pct = Math.min(100, (daysIn(a) / s.targetDays) * 100);
    const cls = pct >= 100 ? 'bad' : pct >= 75 ? 'warn' : '';
    time = `<div class="pcard-time" title="Days in stage vs ${s.targetDays}-day target"><span class="mini-track"><i class="${cls}" style="width:${pct}%"></i></span><span>${daysIn(a)}/${s.targetDays}d</span></div>`;
  }
  return `<a class="pcard s-${statusKey}" href="${accountLink(a)}">
    <div class="pcard-name">${esc(a.name)}</div>
    <div class="pcard-uc">${esc(a.useCase)}</div>
    <div class="pcard-tags">${tags.join('')}</div>
    ${time}
    <div class="pcard-foot">${avatars(a)}<span class="pcard-pct">${a.progress}%</span></div>
  </a>`;
}

function pipelineColumn(title, sub, num, items, extraCls = '') {
  const overdue = items.filter(isOverdue).length;
  return `<div class="pcol ${extraCls}">
    <div class="col-head">
      <span class="col-num">${num}</span>
      <div><b>${title}</b><small>${sub}</small></div>
      <span class="col-count ${overdue ? 'warn' : ''}" title="${overdue ? `${overdue} overdue` : ''}">${items.length}</span>
    </div>
    ${items.length ? items.map(pipelineCard).join('') : '<div class="col-empty">No accounts</div>'}
  </div>`;
}

function pipelineBoard(list) {
  const shown = pipelineFiltered(list);
  const phases = PHASES.map(ph => {
    const cols = ph.stages.map(id => {
      const s = STAGES[id - 1];
      const items = shown.filter(a => !a.outcome && a.stage === id)
        .sort((x, y) => (isOverdue(y) - isOverdue(x)) || (daysLeft(x) - daysLeft(y)));
      const sub = `${ROLE_SHORT[s.approver]} approves · ${s.targetDays}d target${s.skippable ? ' · optional' : ''}`;
      return pipelineColumn(esc(s.name), sub, id, items);
    }).join('');
    const count = shown.filter(a => !a.outcome && ph.stages.includes(a.stage)).length;
    return `<section class="phase" style="--phase:${ph.color}">
      <div class="phase-head"><b>${ph.name}</b><span>${ph.desc} · stages ${ph.stages[0]}–${ph.stages[ph.stages.length - 1]} · ${count} account${count === 1 ? '' : 's'}</span></div>
      <div class="phase-cols" style="--cols:${ph.stages.length}">${cols}</div>
    </section>`;
  }).join('');
  const decided = pf.flag === 'all' ? shown.filter(a => a.outcome) : [];
  const outcomes = pf.flag === 'all' ? `<section class="phase" style="--phase:#16a34a">
      <div class="phase-head"><b>Outcomes</b><span>Converted or closed</span></div>
      <div class="phase-cols" style="--cols:1">${pipelineColumn('Decided POCs', 'After Go / No-Go', '✔', decided, 'outcome-col')}</div>
    </section>` : '';
  const none = shown.length ? '' : '<div class="empty" style="margin-bottom:14px">No accounts match these filters.</div>';
  return none + `<div class="board">${phases}${outcomes}</div>`;
}

function pipelinePage(list) {
  const active = list.filter(a => !a.outcome);
  const seg = [
    ['all', 'All', active.length],
    ['pending', 'Awaiting approval', active.filter(a => a.pending).length],
    ['overdue', 'Overdue', active.filter(isOverdue).length],
  ];
  const amFilter = user.role === 'TL' ? `<select data-filter="am" aria-label="Account Manager">
      <option value="all">All Account Managers</option>${USERS.filter(u => u.role === 'AM').map(u => `<option value="${u.id}" ${pf.am === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>` : '';
  return `<div class="pf-bar">
      <span class="search">${icon('search')}<input type="search" data-filter="q" placeholder="Search account or use case…" value="${esc(pf.q)}" aria-label="Search"></span>
      <select data-filter="status" aria-label="Status"><option value="all">All statuses</option>${STATUSES.map(s => `<option ${pf.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      ${amFilter}
      <div class="seg" role="group">${seg.map(([k, l, n]) => `<button type="button" data-flag="${k}" class="${pf.flag === k ? 'on' : ''}">${l}<span class="n">${n}</span></button>`).join('')}</div>
    </div>
    <div class="legend">
      <span class="jump">Jump to ${[...PHASES, { name: 'Outcomes', color: '#16a34a' }].map((ph, i) => `<button type="button" data-jump="${i}" style="--phase:${ph.color}">${ph.name}</button>`).join('')}</span>
      <span><i style="background:var(--green)"></i>On Track</span><span><i style="background:var(--amber)"></i>At Risk</span>
      <span><i style="background:var(--red)"></i>Delayed</span><span><i style="background:var(--grey)"></i>On Hold</span>
      <span><span class="mini-track legend-track"><i class="warn" style="width:80%"></i></span>Time used of stage target</span>
    </div>
    <div id="board">${pipelineBoard(list)}</div>`;
}

function drawBoard() {
  document.getElementById('board').innerHTML = pipelineBoard(visibleAccounts());
  document.querySelectorAll('.seg [data-flag]').forEach(b => b.classList.toggle('on', b.dataset.flag === pf.flag));
}

// ---- Approve / decision buttons (shared by Approvals page and Account page) ----
function decisionButtons(a) {
  const ready = evidenceComplete(a);
  const dis = ready ? '' : 'disabled title="All required items must be submitted first"';
  return a.stage === 10
    ? `<button class="btn btn-success btn-sm" data-act="Converted" data-id="${a.id}" ${dis}>Convert to project</button>
       <button class="btn btn-sm" data-act="Extended" data-id="${a.id}" ${dis}>Extend POC</button>
       <button class="btn btn-sm" data-act="Closed" data-id="${a.id}" ${dis}>Close</button>`
    : `<button class="btn btn-success btn-sm" data-act="approve" data-id="${a.id}" ${dis}>Approve</button>
       <button class="btn btn-sm" data-act="return" data-id="${a.id}">Return for rework</button>`;
}

// ---- Page: Approvals ----
function approvalCard(a) {
  const s = stageOf(a);
  const next = a.stage < 10 ? STAGES[a.stage].name : 'Final decision';
  const checklist = s.deliverables.map((d, i) => a.evidence[i]
    ? `<li><span class="ok">✔</span>${esc(d)}</li>`
    : `<li><span class="missing">✖</span>${esc(d)} <span class="badge b-delayed">missing</span></li>`).join('');
  return `<div class="card approval">
    <h3><a href="${accountLink(a)}">${esc(a.name)}</a></h3>
    <div class="meta">${esc(a.useCase)} · requested by ${esc(nameOf(a.pending.by))}</div>
    <div class="move"><span>${s.id}. ${esc(s.name)}</span><span class="arrow">→</span><span>${esc(next)}</span></div>
    <ul class="checklist">${checklist}</ul>
    <div class="actions">${decisionButtons(a)}</div>
  </div>`;
}

function approvalsPage() {
  const list = myApprovals();
  return list.length ? `<div class="approvals">${list.map(approvalCard).join('')}</div>` : `<div class="empty">Nothing waiting for your approval.</div>`;
}

// ---- Page: Accounts ----
function accountsPage(activeList) {
  const view = new URLSearchParams(location.search).get('view') === 'archived' ? 'archived' : 'active';
  const archivedList = visibleAccounts({ archived: true }).filter(a => a.archived);
  const list = view === 'archived' ? archivedList : activeList;
  const tabs = `<div class="acc-bar"><div class="seg" role="tablist">
      <a href="accounts.html" role="tab" class="seg-link ${view === 'active' ? 'on' : ''}">Active<span class="n">${activeList.length}</span></a>
      <a href="accounts.html?view=archived" role="tab" class="seg-link ${view === 'archived' ? 'on' : ''}">${icon('archive')} Archived<span class="n">${archivedList.length}</span></a></div>
    ${canCreate && view === 'active' ? `<a class="btn btn-primary" href="account-form.html">${icon('plus')} New account</a>` : ''}</div>`;
  const decided = activeList.filter(a => a.outcome);
  const hint = view === 'active' && user.role === 'TL' && decided.length
    ? `<div class="archive-hint">${icon('archive')}<span><b>${decided.length} decided POC${decided.length === 1 ? '' : 's'}</b> (converted or closed) can be moved to the archive to keep active views focused.</span>
        <button type="button" class="btn btn-sm" data-act="archive-all">Archive ${decided.length === 1 ? 'it' : 'all'}</button></div>` : '';
  const rows = list.map(a => {
    const s = stageOf(a);
    const devs = a.devs.map(nameOf).join(', ') || '<span class="sub">Unassigned</span>';
    const status = a.outcome ? `<span class="badge ${statusClass(a.outcome)}">${a.outcome}</span>` : `<span class="badge ${statusClass(a.status)}">${a.status}</span>`;
    const pend = a.pending && !a.outcome ? ` <span class="badge b-pending">Pending ${ROLES[s.approver].label}</span>` : '';
    return `<tr class="row-link" data-href="${accountLink(a)}">
      <td class="c-name"><a href="${accountLink(a)}"><b>${esc(a.name)}</b></a><div class="sub">${a.id} · ${a.sector} sector</div></td>
      <td class="c-use" data-label="Use case">${esc(a.useCase)}</td>
      <td class="c-stage" data-label="Stage">${s.id}. ${esc(s.name)}${pend}</td>
      <td class="c-status" data-label="Status">${status}</td>
      <td data-label="Progress"><span class="progress"><i style="width:${a.progress}%"></i></span>${a.progress}%</td>
      <td data-label="Days in stage">${a.outcome ? '—' : `${daysIn(a)} / ${s.targetDays}d${isOverdue(a) ? ' <span class="overdue">overdue</span>' : ''}`}</td>
      <td data-label="Account Manager">${esc(nameOf(a.am))}</td>
      <td data-label="Developers">${devs}</td>
      ${view === 'archived' ? `<td data-label="Archived">${fmtDate(a.archived.at)}<div class="sub">by ${esc(nameOf(a.archived.by))}</div>
        ${user.role === 'TL' ? `<button type="button" class="btn btn-sm restore-btn" data-act="restore" data-id="${a.id}">Restore</button>` : ''}</td>` : ''}
    </tr>`;
  }).join('');
  const empty = view === 'archived' ? 'No archived accounts. Converted or closed POCs can be archived by the Team Lead.' : 'No accounts assigned.';
  return `${tabs}${hint}<div class="table-wrap"><table>
      <thead><tr><th>Account</th><th>Use case</th><th>Stage</th><th>Status</th><th>Progress</th><th>Days in stage</th><th>Account Manager</th><th>Developers</th>${view === 'archived' ? '<th>Archived</th>' : ''}</tr></thead>
      <tbody>${rows || `<tr><td colspan="9" class="sub">${empty}</td></tr>`}</tbody>
    </table></div>`;
}

// ---- Page: Account detail ----
function currentAccount() {
  const id = new URLSearchParams(location.search).get('id');
  const a = find(id);
  return a && canView(a) ? a : null;
}

function stepper(a) {
  return `<ol class="stepper">${STAGES.map(s => {
    const state = a.outcome || s.id < a.stage ? 'done' : s.id === a.stage ? 'current' : 'todo';
    return `<li class="${state}" title="${esc(s.name)} · approver: ${ROLES[s.approver].label}">
      <span class="dot">${state === 'done' ? '✔' : s.id}</span><span class="lbl">${esc(s.name)}</span></li>`;
  }).join('')}</ol>`;
}

function stagePanel(a) {
  if (a.outcome) {
    return `<div class="card"><h3 class="card-title">POC outcome</h3>
      <p><span class="badge ${statusClass(a.outcome)}">${a.outcome}</span> ${a.outcome === 'Converted' ? 'This POC is proceeding to a full project.' : 'This POC is not proceeding.'}</p></div>`;
  }
  const s = stageOf(a);
  const editable = canEdit(a) && !a.pending;
  const docs = s.deliverables.map((d, i) => {
    const file = a.evidence[i];
    const right = file
      ? `<span class="file">📄 ${esc(file)}</span>${editable ? ` <button class="link-btn" data-act="remove-doc" data-id="${a.id}" data-idx="${i}">Remove</button>` : ''}`
      : editable ? `<button class="btn btn-sm" data-act="attach" data-id="${a.id}" data-idx="${i}">Upload</button>` : '<span class="sub">Not submitted</span>';
    return `<li class="doc-row"><span>${file ? '<span class="ok">✔</span>' : '<span class="missing">○</span>'} ${esc(d)}</span><span class="doc-right">${right}</span></li>`;
  }).join('');

  let footer;
  if (a.pending) {
    footer = `<div class="notice">⏳ Waiting for <b>${ROLES[s.approver].label}</b> approval · requested by ${esc(nameOf(a.pending.by))} on ${fmtDate(a.pending.at)}</div>
      ${canApprove(a) ? `<div class="actions">${decisionButtons(a)}</div>` : ''}`;
  } else if (canEdit(a)) {
    const ready = evidenceComplete(a);
    footer = `<div class="actions">
      <button class="btn btn-primary btn-sm" data-act="request" data-id="${a.id}" ${ready ? '' : 'disabled'}>${a.stage === 10 ? 'Request Go / No-Go decision' : 'Request approval to move on'}</button>
      ${s.skippable && user.role === 'TL' ? `<button class="btn btn-sm" data-act="skip" data-id="${a.id}">Skip this optional stage</button>` : ''}
    </div>${ready ? '' : '<p class="sub">Upload every required document to request approval.</p>'}`;
  } else {
    footer = '<p class="sub">No approval requested yet.</p>';
  }

  return `<div class="card">
    <h3 class="card-title">Stage ${s.id}: ${esc(s.name)}</h3>
    <div class="sub">Approver: ${ROLES[s.approver].label} · target ${s.targetDays} days · ${daysIn(a)} days so far${isOverdue(a) ? ' · <span class="overdue">overdue</span>' : ''}</div>
    <h4>Required before moving on</h4>
    <ul class="doc-list">${docs}</ul>
    ${footer}
  </div>`;
}

function updatesPanel(a) {
  const form = canEdit(a) ? `<form class="update-form" id="updateForm" data-id="${a.id}">
      <div class="form-row">
        <label>Status<select name="status">${STATUSES.map(s => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label>Progress %<input name="progress" type="number" min="0" max="100" value="${a.progress}"></label>
      </div>
      <label>What happened<textarea name="note" rows="2" placeholder="Progress since the last update"></textarea></label>
      <label>Blockers <span class="sub">(optional)</span><textarea name="blockers" rows="2" placeholder="Anything stopping progress"></textarea></label>
      <button class="btn btn-primary btn-sm" type="submit">Post update</button>
    </form>` : '';
  const items = a.updates.map(u => `<li class="update">
      <div class="update-head"><b>${esc(nameOf(u.by))}</b><span class="sub">${fmtDate(u.at)}</span>
        <span class="badge ${statusClass(u.status)}">${u.status}</span><span class="sub">${u.progress}%</span></div>
      <p>${esc(u.note)}</p>
      ${u.blockers ? `<p class="blocker">⚠ ${esc(u.blockers)}</p>` : ''}
    </li>`).join('');
  return `<div class="card"><h3 class="card-title">Progress updates</h3>${form}
    <ul class="updates">${items || '<li class="sub">No updates yet.</li>'}</ul></div>`;
}

function historyPanel(a) {
  const items = a.history.map(h => `<li><span class="when">${fmtDate(h.at)}</span><span>${esc(h.text)}<br><span class="sub">${esc(nameOf(h.by))}</span></span></li>`).join('');
  return `<div class="card"><h3 class="card-title">Activity</h3><ul class="timeline">${items || '<li class="sub">No activity yet.</li>'}</ul></div>`;
}

function accountPage() {
  const a = currentAccount();
  if (!a) return `<div class="empty">Account not found, or you don't have access to it.</div>`;
  const s = stageOf(a);
  const status = a.outcome ? `<span class="badge ${statusClass(a.outcome)}">${a.outcome}</span>` : `<span class="badge ${statusClass(a.status)}">${a.status}</span>`;
  const facts = [
    ['Stage', `${s.id}. ${esc(s.name)}`],
    ['Progress', `<span class="progress"><i style="width:${a.progress}%"></i></span>${a.progress}%`],
    ['Account Manager', esc(nameOf(a.am))],
    ['Developers', a.devs.map(nameOf).map(esc).join(', ') || '<span class="sub">Unassigned</span>'],
    ['Sector', `${a.sector} sector`],
  ];
  if (a.contact) facts.push(['Agency contact', esc(a.contact)]);
  const editBtn = canEditDetails(a) && !a.archived ? `<a class="btn btn-sm" href="account-form.html?id=${encodeURIComponent(a.id)}">Edit details</a>` : '';
  const archiveBtn = canArchive(a) && !a.archived ? `<button type="button" class="btn btn-sm" data-act="archive" data-id="${a.id}">${icon('archive')} Archive</button>` : '';
  const banner = a.archived ? `<div class="archived-banner">${icon('archive')}<span><b>Archived</b> on ${fmtDate(a.archived.at)} by ${esc(nameOf(a.archived.by))}. It's hidden from active views; everything below is kept for reference.</span>
      ${user.role === 'TL' ? `<button type="button" class="btn btn-sm" data-act="restore" data-id="${a.id}">Restore</button>` : ''}</div>` : '';
  return `${banner}
    <div class="card detail-head">
      <div class="detail-title"><div><div class="sub">${a.id}</div><div class="use-case">${esc(a.useCase)}</div>
        ${a.description ? `<p class="description">${esc(a.description)}</p>` : ''}</div>
        <div class="head-actions">${status}${editBtn}${archiveBtn}</div></div>
      <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </div>
    <section class="section"><h2>POC lifecycle</h2><div class="card">${stepper(a)}</div></section>
    <div class="detail-grid section">
      <div class="col">${stagePanel(a)}${updatesPanel(a)}</div>
      <div class="col">${accountDiscussionCard(a)}${accountSchedulePanel(a)}${historyPanel(a)}</div>
    </div>
    <input type="file" id="fileInput" hidden>`;
}

// ---- Page: Add / edit account ----
function formAccount() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return { mode: 'new', a: null, ok: canCreate };
  const a = find(id);
  return { mode: 'edit', a, ok: !!a && canEditDetails(a) };
}

function accountFormPage() {
  const { mode, a, ok } = formAccount();
  if (!ok) return `<div class="empty">${mode === 'new' ? 'Only the AI Team Lead can create accounts.' : "Account not found, or you can't edit it."}</div>`;
  const v = a || { name: '', sector: 'Public', useCase: '', description: '', contact: '', am: '', devs: [] };
  const lock = user.role !== 'TL';
  const opt = (val, label, cur) => `<option value="${esc(val)}" ${val === cur ? 'selected' : ''}>${esc(label)}</option>`;
  const cancel = a ? accountLink(a) : 'accounts.html';
  return `<form class="card form-card" id="accountForm" data-id="${a ? a.id : ''}" novalidate>
    <div class="error" id="formError"></div>
    <div class="form-grid">
      <label><span>Agency / client name <span class="req">*</span></span><input name="accName" value="${esc(v.name)}" placeholder="e.g. Ministry of Health" maxlength="120"></label>
      <label><span>Sector</span><select name="sector">${opt('Public', 'Public sector', v.sector)}${opt('Private', 'Private sector', v.sector)}</select></label>
      <label class="full"><span>POC use case <span class="req">*</span></span><input name="useCase" value="${esc(v.useCase)}" placeholder="e.g. Clinical notes summarisation" maxlength="160"></label>
      <label class="full"><span>Problem statement <span class="sub">(optional)</span></span><textarea name="description" rows="3" placeholder="What problem does the agency want AI to solve?">${esc(v.description || '')}</textarea></label>
      <label><span>Agency contact person <span class="sub">(optional)</span></span><input name="contact" value="${esc(v.contact || '')}" placeholder="Name and role" maxlength="120"></label>
      <label><span>Account Manager <span class="req">*</span></span><select name="am" ${lock ? 'disabled' : ''}>
        ${opt('', 'Select…', v.am)}${USERS.filter(u => u.role === 'AM').map(u => opt(u.id, u.name, v.am)).join('')}</select></label>
      <fieldset class="full" ${lock ? 'disabled' : ''}><legend>Developers</legend>
        <div class="check-grid">${USERS.filter(u => u.role === 'DEV').map(u => `<label class="check"><input type="checkbox" name="devs" value="${u.id}" ${v.devs.includes(u.id) ? 'checked' : ''}> ${esc(u.name)}</label>`).join('')}</div>
      </fieldset>
    </div>
    ${lock ? '<p class="sub">Only the AI Team Lead can change the Account Manager or Developers.</p>' : ''}
    ${mode === 'new' ? '<p class="sub">New accounts start at Stage 1: Opportunity Identified.</p>' : ''}
    <div class="actions"><button class="btn btn-primary" type="submit">${mode === 'new' ? 'Create account' : 'Save changes'}</button><a class="btn" href="${cancel}">Cancel</a></div>
  </form>`;
}

function saveAccountForm(form) {
  const { mode, a, ok } = formAccount();
  if (!ok) return;
  const f = form.elements;
  const err = msg => { const e = document.getElementById('formError'); e.textContent = msg; e.style.display = 'block'; e.scrollIntoView({ block: 'center' }); };
  const v = {
    name: f.accName.value.trim(), sector: f.sector.value, useCase: f.useCase.value.trim(),
    description: f.description.value.trim(), contact: f.contact.value.trim(),
  };
  if (!v.name) return err('Please enter the agency or client name.');
  if (!v.useCase) return err('Please enter the POC use case.');
  if (accounts.some(x => x !== a && x.name.trim().toLowerCase() === v.name.toLowerCase())) return err('An account with this name already exists.');

  let am = a ? a.am : '', devs = a ? a.devs : [];
  if (user.role === 'TL') {
    am = f.am.value;
    devs = [...form.querySelectorAll('input[name=devs]:checked')].map(i => i.value);
    if (!am) return err('Please choose an Account Manager.');
  }

  let target;
  if (mode === 'new') {
    const next = Math.max(0, ...accounts.map(x => parseInt(x.id.replace(/\D/g, ''), 10) || 0)) + 1;
    target = acct({ id: 'ACC-' + String(next).padStart(3, '0'), ...v, am, devs, stage: 1, status: 'On Track', progress: 0,
      stageSince: new Date().toISOString(), evidence: STAGES[0].deliverables.map(() => null) });
    target.plan = autoPlan(1, new Date());
    accounts.push(target);
    log(target, 'Account created');
  } else {
    target = a;
    const labels = { name: 'Name', sector: 'Sector', useCase: 'Use case', description: 'Problem statement', contact: 'Agency contact' };
    const changed = Object.keys(labels).filter(k => (a[k] || '') !== v[k]);
    Object.assign(a, v);
    if (changed.length) log(a, `Edited details: ${changed.map(k => labels[k]).join(', ')}`);
    if (am !== a.am) { log(a, `Account Manager changed: ${nameOf(a.am)} → ${nameOf(am)}`); a.am = am; }
    if ([...devs].sort().join() !== [...a.devs].sort().join()) { a.devs = devs; log(a, `Developers updated: ${devs.map(nameOf).join(', ') || 'none'}`); }
  }
  saveAccounts(accounts);
  location.href = `${accountLink(target)}&saved=${mode === 'new' ? 'created' : 'updated'}`;
}

// ---- Page titles and subtitles ----
function pageHeading() {
  const mine = user.role === 'TL' ? 'every POC account under the AI Team' : user.role === 'DEV' ? 'the accounts you are assigned to' : 'your accounts';
  const back = user.role === 'HM' ? ['approvals.html', 'Approvals'] : ['accounts.html', 'Accounts'];
  return {
    dashboard: ['Dashboard', `Overview of ${mine}.`],
    pipeline: ['POC pipeline', `Where ${mine} sit across stages 1 → 10. Click an account to open it.`],
    schedule: ['Schedule', user.role === 'TL' ? 'Plan stage dates and team events for every POC.' : `Events and stage dates for ${mine}.`],
    approvals: ['Approvals', user.role === 'HM'
      ? 'Stages that need Higher Management sign-off: POC Proposal & Scoping, and the Go / No-Go Decision.'
      : 'Approve is enabled only when every required item is submitted.'],
    accounts: [user.role === 'TL' ? 'All accounts' : 'My accounts', `Details of ${mine}. Click an account to open it.`],
    messages: ['Messages', 'Account discussions, direct messages and group chats.'],
    notifications: ['Notifications', 'Everything that needs your attention from the last two weeks.'],
    reports: ['Reports', 'A POC status summary for management meetings. Download it as PDF or Excel.'],
    audit: ['Audit trail', 'Every change across PRISM: who did what, and when.'],
    feedback: ['Feedback', 'Share ideas to make PRISM better, and vote for the ones you want most.'],
    settings: ['Settings', user.role === 'TL' ? 'Your profile, how PRISM looks, and how the workspace is set up.' : 'Your profile and how PRISM looks for you.'],
    account: ['Account details', `<a href="${back[0]}">← Back to ${back[1]}</a>`],
    'account-form': formAccount().mode === 'new'
      ? ['New account', '<a href="accounts.html">← Back to Accounts</a>']
      : ['Edit account', formAccount().a ? `<a href="${accountLink(formAccount().a)}">← Back to ${esc(formAccount().a.name)}</a>` : ''],
  }[page];
}

// ---- Shell ----
function buildShell() {
  document.body.insertAdjacentHTML('afterbegin', `
  <div class="app">
    <aside class="sidebar">
      <a class="brand" href="${PAGES[navPages[0]].file}" style="text-decoration:none">${LOGO}
        <div><span class="brand-name">PRISM</span><small>AI Team · POC tracker</small></div></a>
      <nav class="nav" id="nav" aria-label="Main"></nav>
      <div class="nav-sheet" id="navSheet" hidden></div>
      <div class="sidebar-foot">
        <div class="me">
          <div class="avatar" data-u="${user.id}">${esc(initials(user.name))}</div>
          <div class="who"><b>${esc(user.name)}</b><span>${ROLES[user.role].label}</span></div>
          <button class="icon-btn" id="logoutBtn" type="button" title="Log out" aria-label="Log out">${icon('logout')}</button>
        </div>
        <button class="reset-link install-link" type="button" data-pwa-install>${icon('plus')} Install PRISM app</button>
        <button class="reset-link" id="resetBtn" type="button">${icon('refresh')} Reset demo data</button>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div><div class="crumb" id="crumb"></div><h1 id="pageTitle"></h1><p class="sub" id="pageSub"></p></div>
        <div class="top-actions">${searchHtml()}${bellHtml()}<span class="date-chip">${icon('calendar')} ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      </header>
      <div id="content"></div>
    </main>
  </div>
  <div class="toast" id="toast"></div>`);

  const content = document.getElementById('content');
  document.getElementById('logoutBtn').onclick = logout;
  document.getElementById('resetBtn').onclick = () => {
    resetAccounts(); accounts = loadAccounts();
    updateSettings(s => { delete s.workspace; }); applyWorkspace(); Object.assign(user, userById(user.id) || {});
    try { localStorage.removeItem(MSG_KEY); localStorage.removeItem(NOTIF_KEY); localStorage.removeItem(FB_KEY); } catch (e) { /* ignore */ }
    notifUI.seen = null;
    reloadMsgs(); render(); toast('Demo data reset');
  };

  // Pipeline filters: redraw only the board so the search box keeps focus while typing.
  content.addEventListener('input', e => {
    const k = e.target.dataset.filter;
    if (k) { pf[k] = e.target.value; drawBoard(); }
  });

  content.addEventListener('click', e => {
    const flag = e.target.closest('[data-flag]');
    if (flag) { pf.flag = flag.dataset.flag; drawBoard(); return; }
    const jump = e.target.closest('[data-jump]');
    if (jump) {
      const target = document.querySelectorAll('.board .phase')[Number(jump.dataset.jump)];
      if (target) target.scrollIntoView({ block: 'start' });
      return;
    }
    const b = e.target.closest('button[data-act]');
    if (!b) {
      const row = e.target.closest('tr.row-link');
      if (row && !e.target.closest('a, button')) location.href = row.dataset.href;
      return;
    }
    const { act, id } = b.dataset;
    const idx = Number(b.dataset.idx);
    if (act === 'approve') approve(id);
    else if (act === 'return') returnForRework(id);
    else if (act === 'request') requestApproval(id);
    else if (act === 'skip') skipStage(id);
    else if (act === 'remove-doc') removeEvidence(id, idx);
    else if (act === 'archive') { if (archiveAccount(id)) commit('Account archived'); }
    else if (act === 'archive-all') archiveAllDecided();
    else if (act === 'restore') restoreAccount(id);
    else if (act === 'attach') {
      const input = document.getElementById('fileInput');
      input.dataset.id = id; input.dataset.idx = idx; input.value = '';
      input.click();
    }
    else approve(id, act); // Converted / Extended / Closed
  });

  // Prototype: only the file name is recorded; real file storage comes with the backend.
  content.addEventListener('change', e => {
    if (e.target.id === 'fileInput' && e.target.files[0]) attachEvidence(e.target.dataset.id, Number(e.target.dataset.idx), e.target.files[0].name);
  });

  content.addEventListener('submit', e => {
    if (e.target.id === 'updateForm') { e.preventDefault(); addUpdate(e.target.dataset.id, e.target); }
    else if (e.target.id === 'accountForm') { e.preventDefault(); saveAccountForm(e.target); }
  });
}

const MOBILE_ORDER = ['dashboard', 'approvals', 'messages', 'pipeline', 'schedule', 'accounts', 'reports', 'audit', 'feedback', 'settings'];
function setSheet(open) {
  const s = document.getElementById('navSheet'), b = document.querySelector('[data-nav="more"]');
  if (!s) return;
  s.hidden = !open;
  if (b) b.setAttribute('aria-expanded', String(open));
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-nav="more"]')) { const s = document.getElementById('navSheet'); setSheet(s.hidden); return; }
  if (!e.target.closest('#navSheet')) setSheet(false);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') setSheet(false); });

function renderNav() {
  const count = myApprovals().length;
  const active = page === 'account-form' ? 'accounts' : page === 'account' ? (user.role === 'HM' ? 'approvals' : 'accounts') : page;
  const badge = k => k === 'approvals' ? count : k === 'messages' ? totalUnread() : 0;
  // Phones show a bottom tab bar: the 4 most-used pages, the rest under "More".
  const ranked = [...navPages].sort((a, b) => MOBILE_ORDER.indexOf(a) - MOBILE_ORDER.indexOf(b));
  const extra = ranked.length <= 5 ? [] : ranked.slice(4);
  const link = k => `<a href="${PAGES[k].file}" class="${k === active ? 'active' : ''} ${extra.includes(k) ? 'nav-extra' : ''}" style="--mo:${ranked.indexOf(k)}"
      ${k === active ? 'aria-current="page"' : ''}>${icon(NAV_ICON[k])}<span class="nav-label-text">${PAGES[k].label}</span>${badge(k) ? `<span class="count">${badge(k)}</span>` : ''}</a>`;
  const extraCount = extra.reduce((n, k) => n + badge(k), 0);
  const more = extra.length ? `<button type="button" class="nav-more ${extra.includes(active) ? 'active' : ''}" data-nav="more" aria-expanded="false" aria-controls="navSheet" style="--mo:99">
      ${icon('dots')}<span class="nav-label-text">More</span>${extraCount ? `<span class="count">${extraCount}</span>` : ''}</button>` : '';
  let lastGroup = null;
  const withGroups = navPages.map(k => { const g = PAGES[k].group; const head = g && g !== lastGroup ? `<div class="nav-group">${g}</div>` : ''; lastGroup = g; return head + link(k); }).join('');
  document.getElementById('nav').innerHTML = withGroups + more;
  document.getElementById('navSheet').innerHTML = `<div class="sheet-grip"></div>${extra.map(k => `<a href="${PAGES[k].file}" class="${k === active ? 'active' : ''}">${icon(NAV_ICON[k])}<span>${PAGES[k].label}</span>${badge(k) ? `<span class="count">${badge(k)}</span>` : ''}</a>`).join('')}
    <a href="notifications.html" class="${page === 'notifications' ? 'active' : ''}">${icon('bell')}<span>Notifications</span></a>`;
  renderBell();
}

function render() {
  const list = visibleAccounts();
  let [title, sub] = pageHeading();
  if (page === 'account') { const a = currentAccount(); if (a) title = a.name; }
  document.title = `PRISM — ${title}`;
  document.getElementById('pageTitle').textContent = title;
  const section = page === 'account' || page === 'account-form' ? (user.role === 'HM' ? 'Approvals' : 'Accounts') : PAGES[page].label;
  document.getElementById('crumb').textContent = `PRISM · ${section}`;
  document.getElementById('pageSub').innerHTML = page.startsWith('account') && page !== 'accounts' ? sub : esc(sub);
  document.getElementById('content').innerHTML = {
    dashboard: () => dashboardPage(list),
    pipeline: () => pipelinePage(list),
    schedule: () => schedulePage(),
    approvals: () => approvalsPage(),
    accounts: () => accountsPage(list),
    messages: () => messagesPage(),
    notifications: () => notificationsPage(),
    settings: () => settingsPage(),
    reports: () => reportsPage(),
    audit: () => auditPage(),
    feedback: () => feedbackPage(),
    account: () => accountPage(),
    'account-form': () => accountFormPage(),
  }[page]();
  renderNav();
  // On narrow screens the lifecycle tracker scrolls sideways: bring the current stage into view.
  const stepper = document.querySelector('.stepper'), current = stepper && stepper.querySelector('li.current');
  if (current && stepper.scrollWidth > stepper.clientWidth) {
    const offset = current.getBoundingClientRect().left - stepper.getBoundingClientRect().left;
    stepper.scrollLeft += offset - stepper.clientWidth / 2 + current.offsetWidth / 2;
  }
}

if (!redirecting) {
  buildShell();
  render();
}

// Confirmation after saving the account form
const saved = new URLSearchParams(location.search).get('saved');
if (saved && !redirecting) {
  toast(saved === 'created' ? 'Account created' : 'Changes saved');
  history.replaceState(null, '', location.pathname + location.search.replace(/[&?]saved=\w+/, ''));
}
