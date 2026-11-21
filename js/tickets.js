// PRISM — Tickets: units of work with a status flow, comments and history, plus a team Workload view
// (open / in progress / pending / overdue / done per person, load meter, throughput, resolution time).
// Prototype: tickets are stored in this browser. Loaded before app.js; app.js helpers are used at call time only.

const TK_KEY = 'prism_tickets_v2';
const TK_STATUS = {
  open: { label: 'Open', color: '#6366f1' }, progress: { label: 'In progress', color: '#0ea5e9' },
  pending: { label: 'Pending', color: '#f59e0b' }, resolved: { label: 'Resolved', color: '#16a34a' }, closed: { label: 'Closed', color: '#64748b' },
};
const TK_PRIORITY = { urgent: { label: 'Urgent', w: 4, cls: 'b-delayed' }, high: { label: 'High', w: 3, cls: 'b-atrisk' }, medium: { label: 'Medium', w: 2, cls: 'b-pending' }, low: { label: 'Low', w: 1, cls: 'b-onhold' } };
const TK_TYPES = ['Task', 'Bug', 'Request', 'Support', 'Documentation'];
const TK_PENDING = ['Waiting on agency', 'Waiting on a team member', 'Waiting for approval', 'Waiting for data or access', 'Other'];
const TK_CAPACITY = 12; // load points a person can carry comfortably (Urgent 4 · High 3 · Medium 2 · Low 1; pending counts half)
const tkUI = { view: null, scope: 'mine', q: '', status: 'all', priority: 'all', account: 'all', assignee: 'all', person: null, init: false };
const isDone = t => t.status === 'resolved' || t.status === 'closed';
const isActive = t => !isDone(t);

// ---------- Store ----------
function seedTickets() {
  const D = n => new Date(Date.now() - n * 86400000).toISOString();
  const due = n => ymd(addDays(new Date(), n));
  let n = 100;
  const T = (o) => {
    const id = 'TKT-' + (++n);
    const created = o.created ?? 10;
    const t = { id, type: 'Task', priority: 'medium', status: 'open', account: null, description: '', pendingReason: '', resolution: '', comments: [], ...o,
      createdAt: D(created), updatedAt: D(o.updated ?? Math.min(created, 1)), due: o.due === undefined ? null : due(o.due) };
    t.history = [{ by: t.reporter, at: t.createdAt, text: `Created and assigned to ${nameOf(t.assignee)}`, kind: 'created' }];
    if (t.status !== 'open') t.history.unshift({ by: t.assignee, at: D(Math.max(created - 1, 0.5)), text: 'Started work', kind: 'status' });
    if (t.status === 'pending') t.history.unshift({ by: t.assignee, at: t.updatedAt, text: `Marked pending: ${t.pendingReason}`, kind: 'status' });
    if (isDone(t)) { t.resolvedAt = D(o.resolvedDaysAgo ?? 2); t.history.unshift({ by: t.assignee, at: t.resolvedAt, text: `Resolved${t.resolution ? `: ${t.resolution}` : ''}`, kind: 'status' }); }
    if (t.status === 'closed') { t.closedAt = D(Math.max((o.resolvedDaysAgo ?? 2) - 1, 0.2)); t.history.unshift({ by: t.reporter, at: t.closedAt, text: 'Closed', kind: 'status' }); }
    o.comments && (t.comments = o.comments.map(([by, ago, text]) => ({ by, at: D(ago), text })));
    return t;
  };
  return { items: [
    T({ title: 'Fine-tune summariser on second batch of clinical notes', account: 'ACC-001', assignee: 'u4', reporter: 'u2', priority: 'high', status: 'progress', created: 6, due: 4,
      description: 'Use the second batch from MOH IT to push accuracy above 90%.', comments: [['u2', 2, 'Agency asked for an update by Friday.'], ['u4', 1, 'At 87% now, trying a larger context window.']] }),
    T({ title: 'Prepare evaluation dashboard for MOH review', account: 'ACC-001', assignee: 'u4', reporter: 'u1', status: 'open', created: 3, due: 9 }),
    T({ title: 'Passport scan accuracy split by document type', account: 'ACC-003', assignee: 'u5', reporter: 'u2', priority: 'urgent', status: 'progress', created: 4, due: 1,
      description: 'Evaluation panel needs accuracy per document type before sign-off.' }),
    T({ title: 'Confirm evaluation panel members with agency', account: 'ACC-003', assignee: 'u2', reporter: 'u1', priority: 'high', status: 'pending', created: 8, due: -2,
      pendingReason: 'Waiting on agency', updated: 3 }),
    T({ title: 'Fix OCR failing on rotated passport images', account: 'ACC-003', type: 'Bug', assignee: 'u4', reporter: 'u5', priority: 'high', status: 'resolved', created: 12, resolvedDaysAgo: 5,
      resolution: 'Added auto-rotation before OCR; tested on 300 samples.' }),
    T({ title: 'Draft POC proposal for road defect detection', account: 'ACC-002', type: 'Documentation', assignee: 'u3', reporter: 'u1', status: 'closed', created: 20, resolvedDaysAgo: 9 }),
    T({ title: 'Tighten false-positive success criterion', account: 'ACC-002', assignee: 'u3', reporter: 'u6', priority: 'high', status: 'progress', created: 2, due: 3 }),
    T({ title: 'Label 500 road images for baseline model', account: 'ACC-002', assignee: 'u5', reporter: 'u3', status: 'open', created: 1, due: 12 }),
    T({ title: 'Second use-case workshop materials', account: 'ACC-004', type: 'Documentation', assignee: 'u3', reporter: 'u3', status: 'progress', created: 5, due: 2 }),
    T({ title: 'Get sample lesson plans from MOE curriculum team', account: 'ACC-004', type: 'Request', assignee: 'u5', reporter: 'u3', status: 'pending', created: 9, due: -1,
      pendingReason: 'Waiting for data or access', updated: 4 }),
    T({ title: 'Collect land title search FAQs', account: 'ACC-005', type: 'Request', assignee: 'u2', reporter: 'u1', priority: 'low', status: 'open', created: 2, due: 14 }),
    T({ title: 'Cost estimate for procurement', account: 'ACC-006', assignee: 'u3', reporter: 'u6', priority: 'urgent', status: 'open', created: 1, due: 4,
      comments: [['u6', 0.5, 'Needed before Friday\'s Go / No-Go meeting.']] }),
    T({ title: 'Security clearance follow-up with DOSM', account: 'ACC-007', type: 'Support', assignee: 'u5', reporter: 'u2', priority: 'high', status: 'pending', created: 11, due: -4,
      pendingReason: 'Waiting on agency', updated: 6 }),
    T({ title: 'Set up cloud environment for survey cleaning', account: 'ACC-007', assignee: 'u5', reporter: 'u1', status: 'open', created: 9, due: -1 }),
    T({ title: 'Client demo rehearsal for City Council', account: 'ACC-008', assignee: 'u4', reporter: 'u3', status: 'progress', created: 2, due: 5 }),
    T({ title: 'Complaint classifier: add Malay language samples', account: 'ACC-008', assignee: 'u4', reporter: 'u3', priority: 'high', status: 'closed', created: 18, resolvedDaysAgo: 11 }),
    T({ title: 'Model card template for all POCs', type: 'Documentation', assignee: 'u1', reporter: 'u1', priority: 'low', status: 'progress', created: 7, due: 10 }),
    T({ title: 'Quarterly POC review deck', type: 'Documentation', assignee: 'u1', reporter: 'u6', status: 'resolved', created: 15, resolvedDaysAgo: 3 }),
    T({ title: 'Renew GPU instance reservations', type: 'Support', assignee: 'u1', reporter: 'u4', priority: 'medium', status: 'closed', created: 25, resolvedDaysAgo: 20 }),
    T({ title: 'Data sharing agreement for Immigration', account: 'ACC-003', type: 'Request', assignee: 'u2', reporter: 'u4', status: 'closed', created: 30, resolvedDaysAgo: 22 }),
    T({ title: 'Update risk register for MOH', account: 'ACC-001', assignee: 'u2', reporter: 'u1', priority: 'low', status: 'resolved', created: 6, resolvedDaysAgo: 1 }),
    T({ title: 'Tax enquiry triage: retrain with new categories', account: 'ACC-006', assignee: 'u4', reporter: 'u3', status: 'closed', created: 35, resolvedDaysAgo: 27 }),
    T({ title: 'Benchmark summariser latency', account: 'ACC-001', assignee: 'u5', reporter: 'u4', priority: 'low', status: 'closed', created: 40, resolvedDaysAgo: 34 }),
    T({ title: 'City hall demo room booking', account: 'ACC-008', type: 'Request', assignee: 'u3', reporter: 'u4', priority: 'low', status: 'open', created: 1, due: 6 }),
  ] };
}
function loadTickets() { try { const s = JSON.parse(localStorage.getItem(TK_KEY)); if (s) return s; } catch (e) { /* ignore */ } const s = { items: [] }; saveTickets(s); return s; }
function saveTickets(s) { try { localStorage.setItem(TK_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
const findTicket = (s, id) => s.items.find(t => t.id === id);

// ---------- Access ----------
function canSeeTicket(t) {
  if (user.role === 'TL' || user.role === 'HM') return true;
  if (t.assignee === user.id || t.reporter === user.id) return true;
  const a = t.account && find(t.account);
  return !!(a && canView(a));
}
const canWorkTickets = () => user.role !== 'HM';
const canEditTicket = t => canWorkTickets() && (user.role === 'TL' || t.reporter === user.id || t.assignee === user.id);
const canCloseTicket = t => canWorkTickets() && (user.role === 'TL' || t.reporter === user.id);
const assignable = () => USERS.filter(u => u.role !== 'HM');
const visibleTickets = () => loadTickets().items.filter(canSeeTicket);
const tkOverdue = t => isActive(t) && t.due && t.due < ymd(new Date());
const tkDueSoon = t => isActive(t) && t.due && !tkOverdue(t) && dayDiff(parseYmd(t.due), new Date()) <= 2;

// ---------- Workload numbers ----------
function personStats(uid, list) {
  const mine = list.filter(t => t.assignee === uid);
  const active = mine.filter(isActive);
  const by = st => mine.filter(t => t.status === st).length;
  const since30 = Date.now() - 30 * 86400000;
  const done30 = mine.filter(t => t.resolvedAt && new Date(t.resolvedAt) >= since30);
  const resolvedAll = mine.filter(t => t.resolvedAt);
  const avg = resolvedAll.length ? Math.round(resolvedAll.reduce((s, t) => s + (new Date(t.resolvedAt) - new Date(t.createdAt)) / 86400000, 0) / resolvedAll.length * 10) / 10 : null;
  const load = active.reduce((s, t) => s + TK_PRIORITY[t.priority].w * (t.status === 'pending' ? 0.5 : 1), 0);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = Date.now() - (7 - i) * 7 * 86400000, start = end - 7 * 86400000;
    return mine.filter(t => t.resolvedAt && new Date(t.resolvedAt) > start && new Date(t.resolvedAt) <= end).length;
  });
  return { mine, active, open: by('open'), progress: by('progress'), pending: by('pending'), resolved: by('resolved'), closed: by('closed'),
    overdue: active.filter(tkOverdue).length, done30: done30.length, avg, load, loadPct: Math.round((load / TK_CAPACITY) * 100), weeks,
    completion: mine.length ? Math.round((mine.filter(isDone).length / mine.length) * 100) : 0 };
}
const loadLevel = pct => pct > 90 ? ['heavy', 'Heavy'] : pct >= 45 ? ['ok', 'Balanced'] : ['light', 'Light'];

// ---------- Small renderers ----------
const tkStatusBadge = st => `<span class="tk-status" style="--k:${TK_STATUS[st].color}">${TK_STATUS[st].label}</span>`;
const tkPrio = p => `<span class="badge ${TK_PRIORITY[p].cls}">${TK_PRIORITY[p].label}</span>`;
const tkAvatar = (uid, size = 'mini') => { const u = userById(uid) || { name: 'Former member', role: 'DEV' }; return `<span class="avatar ${size} role-${u.role}" data-u="${uid}" title="${esc(u.name)}">${esc(initials(u.name))}</span>`; };
function tkDue(t) {
  if (!t.due) return '';
  const d = dayDiff(parseYmd(t.due), new Date());
  if (isDone(t)) return `<span class="tk-due">${fmtDay(parseYmd(t.due))}</span>`;
  const cls = d < 0 ? 'bad' : d <= 2 ? 'warn' : '';
  return `<span class="tk-due ${cls}">${icon('calendar')}${d < 0 ? `${-d}d overdue` : d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `Due ${fmtDay(parseYmd(t.due))}`}</span>`;
}
function tkCard(t) {
  const a = t.account && find(t.account);
  return `<button type="button" class="tk-card p-${t.priority} ${tkOverdue(t) ? 'late' : ''}" data-tk="open" data-id="${t.id}">
    <span class="tk-card-top"><span class="tk-id">${t.id}</span>${tkPrio(t.priority)}</span>
    <b>${esc(t.title)}</b>
    ${a ? `<span class="tk-acc">${icon('building')}${esc(a.name)}</span>` : ''}
    ${t.status === 'pending' && t.pendingReason ? `<span class="tk-pend">${icon('clock')}${esc(t.pendingReason)}</span>` : ''}
    <span class="tk-card-foot">${tkAvatar(t.assignee)}${tkDue(t)}${t.comments.length ? `<span class="tk-cmt">${icon('chat')}${t.comments.length}</span>` : ''}</span>
  </button>`;
}

// ---------- Page ----------
function ticketsPage() {
  const params = new URLSearchParams(location.search);
  if (!tkUI.init) {
    tkUI.init = true;
    tkUI.view = params.get('view') || (params.get('person') ? 'workload' : user.role === 'TL' || user.role === 'HM' ? 'workload' : 'board');
    tkUI.scope = user.role === 'TL' || user.role === 'HM' ? 'all' : 'mine';
    if (params.get('person')) tkUI.person = params.get('person');
    if (params.get('account')) { tkUI.account = params.get('account'); tkUI.scope = 'all'; tkUI.view = 'list'; }
    if (params.get('t')) setTimeout(() => openTicket(params.get('t')), 0);
  }
  const tabs = [['workload', 'Workload', 'users'], ['board', 'Board', 'kanban'], ['list', 'List', 'listcheck']];
  const head = `<div class="tk-head">
    <div class="seg" role="tablist">${tabs.map(([k, l, ic]) => `<button type="button" role="tab" aria-selected="${tkUI.view === k}" class="${tkUI.view === k ? 'on' : ''}" data-tk="view" data-v="${k}">${icon(ic)} ${l}</button>`).join('')}</div>
    ${canWorkTickets() ? `<button type="button" class="btn btn-primary" data-tk="new">${icon('plus')} New ticket</button>` : ''}</div>`;
  const body = tkUI.view === 'workload' ? (tkUI.person ? personView(tkUI.person) : workloadView()) : tkUI.view === 'board' ? boardView() : listView();
  return head + body;
}

function workloadView() {
  const list = visibleTickets();
  const people = assignable().filter(u => user.role === 'TL' || user.role === 'HM' || list.some(t => t.assignee === u.id));
  const active = list.filter(isActive);
  const since7 = Date.now() - 7 * 86400000, since30 = Date.now() - 30 * 86400000;
  const kpis = [
    ['Open', active.filter(t => t.status === 'open').length, ''], ['In progress', active.filter(t => t.status === 'progress').length, ''],
    ['Pending', active.filter(t => t.status === 'pending').length, 'warn'], ['Overdue', active.filter(tkOverdue).length, 'bad'],
    ['Resolved · 7 days', list.filter(t => t.resolvedAt && new Date(t.resolvedAt) >= since7).length, 'good'], ['Closed · 30 days', list.filter(t => t.closedAt && new Date(t.closedAt) >= since30).length, ''],
  ];
  const cards = people.map(u => {
    const st = personStats(u.id, list);
    const [lvl, lvlLabel] = loadLevel(st.loadPct);
    const total = st.open + st.progress + st.pending || 1;
    const maxW = Math.max(1, ...st.weeks);
    const top = st.active.sort((x, y) => TK_PRIORITY[y.priority].w - TK_PRIORITY[x.priority].w || (x.due || '9').localeCompare(y.due || '9')).slice(0, 3);
    return `<article class="card wl-card">
      <div class="wl-head">${tkAvatar(u.id, '')}<div><b>${esc(u.name)}</b><span>${ROLES[u.role].label}</span></div>
        <span class="wl-level ${lvl}" title="${st.load} of ${TK_CAPACITY} load points">${lvlLabel}</span></div>
      <div class="wl-meter" title="Load: ${st.loadPct}% of capacity"><i class="${lvl}" style="width:${Math.min(100, st.loadPct)}%"></i></div>
      <div class="wl-nums">
        <div><b>${st.open}</b><span>Open</span></div><div><b>${st.progress}</b><span>In progress</span></div>
        <div><b class="${st.pending ? 'warn' : ''}">${st.pending}</b><span>Pending</span></div><div><b class="${st.overdue ? 'bad' : ''}">${st.overdue}</b><span>Overdue</span></div>
      </div>
      <div class="wl-mix">${['open', 'progress', 'pending'].map(s => st[s] ? `<i style="width:${(st[s] / total) * 100}%;background:${TK_STATUS[s].color}" title="${TK_STATUS[s].label}: ${st[s]}"></i>` : '').join('')}</div>
      <div class="wl-perf">
        <div><span>Done · 30 days</span><b>${st.done30}</b></div>
        <div><span>Avg. resolution</span><b>${st.avg === null ? '—' : `${st.avg}d`}</b></div>
        <div class="wl-spark" title="Tickets resolved per week, last 8 weeks">${st.weeks.map(w => `<i style="height:${Math.max(8, (w / maxW) * 100)}%" class="${w ? '' : 'zero'}"></i>`).join('')}</div>
      </div>
      <ul class="wl-top">${top.map(t => `<li><button type="button" data-tk="open" data-id="${t.id}">${tkPrio(t.priority)}<span>${esc(t.title)}</span>${tkDue(t)}</button></li>`).join('') || '<li class="sub">No open tickets</li>'}</ul>
      <button type="button" class="btn btn-sm wl-more" data-tk="person" data-id="${u.id}">View ${esc(u.name.split(' ')[0])}'s tickets ${icon('arrow')}</button>
    </article>`;
  }).join('');
  return `<div class="tk-kpis">${kpis.map(([l, v, c]) => `<div class="${c}"><b>${v}</b><span>${l}</span></div>`).join('')}</div>
    <p class="sub tk-legend">Load counts open work by priority (Urgent 4 · High 3 · Medium 2 · Low 1, pending counts half) against ${TK_CAPACITY} points per person.</p>
    <div class="wl-grid">${cards || '<div class="empty">No tickets yet.</div>'}</div>`;
}

function personView(uid) {
  const u = userById(uid);
  if (!u) { tkUI.person = null; return workloadView(); }
  const list = visibleTickets(), st = personStats(uid, list);
  const [lvl, lvlLabel] = loadLevel(st.loadPct);
  const maxW = Math.max(1, ...st.weeks);
  const group = (title, items, hint = '') => `<section class="pv-group"><h3>${title} <span class="n">${items.length}</span>${hint ? `<small class="sub">${hint}</small>` : ''}</h3>
    <div class="pv-list">${items.map(tkCard).join('') || '<p class="sub">None</p>'}</div></section>`;
  const sortAct = arr => arr.sort((x, y) => (tkOverdue(y) - tkOverdue(x)) || TK_PRIORITY[y.priority].w - TK_PRIORITY[x.priority].w || (x.due || '9').localeCompare(y.due || '9'));
  const recentDone = st.mine.filter(isDone).sort((x, y) => (y.resolvedAt || '').localeCompare(x.resolvedAt || '')).slice(0, 8);
  const weekLabels = st.weeks.map((_, i) => fmtDay(new Date(Date.now() - (7 - i) * 7 * 86400000)));
  return `<button type="button" class="link-plain pv-back" data-tk="person" data-id="">← All people</button>
    <div class="card pv-head">
      <div class="wl-head">${tkAvatar(uid, 'xl')}<div><b>${esc(u.name)}</b><span>${ROLES[u.role].label}${profileOf(uid).title ? ` · ${esc(profileOf(uid).title)}` : ''}</span></div>
        <span class="wl-level ${lvl}">${lvlLabel} load · ${st.loadPct}%</span></div>
      <div class="pv-stats">
        ${[['Open', st.open], ['In progress', st.progress], ['Pending', st.pending, st.pending ? 'warn' : ''], ['Overdue', st.overdue, st.overdue ? 'bad' : ''],
          ['Resolved', st.resolved], ['Closed', st.closed], ['Done · 30 days', st.done30, 'good'], ['Avg. resolution', st.avg === null ? '—' : `${st.avg}d`]]
          .map(([l, v, c]) => `<div><b class="${c || ''}">${v}</b><span>${l}</span></div>`).join('')}
      </div>
      <div class="pv-chart"><span class="sub">Resolved per week</span>
        <div class="pv-bars">${st.weeks.map((w, i) => `<div title="Week to ${weekLabels[i]}: ${w}"><i style="height:${(w / maxW) * 100}%"></i><b>${w}</b><small>${weekLabels[i]}</small></div>`).join('')}</div></div>
      <div class="pv-complete"><span class="sub">Completion</span><span class="wl-meter"><i class="ok" style="width:${st.completion}%"></i></span><b>${st.completion}%</b><span class="sub">of ${st.mine.length} assigned tickets done</span></div>
    </div>
    <div class="pv-groups">
      ${group('In progress', sortAct(st.mine.filter(t => t.status === 'progress')))}
      ${group('Open', sortAct(st.mine.filter(t => t.status === 'open')))}
      ${group('Pending', sortAct(st.mine.filter(t => t.status === 'pending')), 'waiting on someone else')}
      ${group('Recently done', recentDone)}
    </div>`;
}

function filteredTickets() {
  const q = tkUI.q.trim().toLowerCase();
  return visibleTickets().filter(t =>
    (tkUI.scope === 'all' || (tkUI.scope === 'mine' ? t.assignee === user.id : t.reporter === user.id)) &&
    (tkUI.priority === 'all' || t.priority === tkUI.priority) &&
    (tkUI.account === 'all' || (tkUI.account === 'none' ? !t.account : t.account === tkUI.account)) &&
    (tkUI.assignee === 'all' || t.assignee === tkUI.assignee) &&
    (!q || `${t.id} ${t.title} ${t.description} ${nameOf(t.assignee)}`.toLowerCase().includes(q)));
}

function filterBar(withStatus) {
  const opt = (v, l, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`;
  const accs = accounts.filter(a => user.role === 'HM' || canView(a));
  return `<div class="tk-filters">
    <span class="search">${icon('search')}<input type="search" data-tkf="q" value="${esc(tkUI.q)}" placeholder="Search tickets…" aria-label="Search tickets"></span>
    <select data-tkf="scope" aria-label="Whose tickets">${opt('mine', 'Assigned to me', tkUI.scope)}${opt('reported', 'Reported by me', tkUI.scope)}${opt('all', 'All tickets I can see', tkUI.scope)}</select>
    ${withStatus ? `<select data-tkf="status" aria-label="Status">${opt('all', 'Any status', tkUI.status)}${opt('active', 'Not done', tkUI.status)}${Object.entries(TK_STATUS).map(([k, v]) => opt(k, v.label, tkUI.status)).join('')}</select>` : ''}
    <select data-tkf="priority" aria-label="Priority">${opt('all', 'Any priority', tkUI.priority)}${Object.entries(TK_PRIORITY).map(([k, v]) => opt(k, v.label, tkUI.priority)).join('')}</select>
    <select data-tkf="assignee" aria-label="Assignee">${opt('all', 'Anyone', tkUI.assignee)}${assignable().map(u => opt(u.id, u.name, tkUI.assignee)).join('')}</select>
    <select data-tkf="account" aria-label="Account">${opt('all', 'All accounts', tkUI.account)}${opt('none', 'No account', tkUI.account)}${accs.map(a => opt(a.id, a.name, tkUI.account)).join('')}</select>
  </div>`;
}

function boardView() {
  const list = filteredTickets();
  const recentCut = Date.now() - 14 * 86400000;
  const cols = Object.entries(TK_STATUS).map(([k, v]) => {
    let items = list.filter(t => t.status === k);
    if (k === 'closed') items = items.filter(t => new Date(t.closedAt || t.updatedAt) >= recentCut);
    items.sort((x, y) => (tkOverdue(y) - tkOverdue(x)) || TK_PRIORITY[y.priority].w - TK_PRIORITY[x.priority].w);
    return `<section class="tk-col" style="--k:${v.color}"><header><span>${v.label}</span><span class="n">${items.length}</span></header>
      ${k === 'closed' ? '<small class="sub tk-col-note">Last 14 days</small>' : ''}${items.map(tkCard).join('') || '<div class="col-empty">Nothing here</div>'}</section>`;
  }).join('');
  return filterBar(false) + `<div class="tk-board">${cols}</div>`;
}

function listView() {
  let list = filteredTickets().filter(t => tkUI.status === 'all' || (tkUI.status === 'active' ? isActive(t) : t.status === tkUI.status));
  list.sort((x, y) => (isDone(x) - isDone(y)) || (tkOverdue(y) - tkOverdue(x)) || TK_PRIORITY[y.priority].w - TK_PRIORITY[x.priority].w || y.updatedAt.localeCompare(x.updatedAt));
  const rows = list.map(t => { const a = t.account && find(t.account);
    return `<tr class="tk-row" data-tk="open" data-id="${t.id}">
      <td class="c-name"><span class="tk-id">${t.id}</span><b>${esc(t.title)}</b><div class="sub">${esc(t.type)}</div></td>
      <td data-label="Account">${a ? esc(a.name) : '<span class="sub">—</span>'}</td>
      <td data-label="Assignee"><span class="aud-person">${tkAvatar(t.assignee)}${esc(nameOf(t.assignee))}</span></td>
      <td data-label="Priority">${tkPrio(t.priority)}</td>
      <td data-label="Status">${tkStatusBadge(t.status)}</td>
      <td data-label="Due">${tkDue(t) || '<span class="sub">—</span>'}</td>
      <td data-label="Updated">${relTime(t.updatedAt)}</td></tr>`; }).join('');
  return filterBar(true) + `<div class="table-wrap tk-table"><table><thead><tr><th>Ticket</th><th>Account</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due</th><th>Updated</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7" class="sub">No tickets match these filters.</td></tr>'}</tbody></table></div>`;
}

// ---------- Ticket detail ----------
function statusActions(t) {
  if (!canEditTicket(t) && !canCloseTicket(t)) return '';
  const b = (act, label, cls = '') => `<button type="button" class="btn btn-sm ${cls}" data-tk="${act}" data-id="${t.id}">${label}</button>`;
  const edit = canEditTicket(t);
  return {
    open: edit ? b('start', '▶ Start work', 'btn-primary') + b('pend', 'Mark pending') + b('resolve', 'Resolve', 'btn-success') : '',
    progress: edit ? b('resolve', 'Resolve', 'btn-success') + b('pend', 'Mark pending') + b('stop', 'Move back to open') : '',
    pending: edit ? b('start', '▶ Resume work', 'btn-primary') + b('resolve', 'Resolve', 'btn-success') : '',
    resolved: (canCloseTicket(t) ? b('close', 'Close ticket', 'btn-primary') : '') + (edit ? b('reopen', 'Reopen') : ''),
    closed: canCloseTicket(t) ? b('reopen', 'Reopen') : '',
  }[t.status];
}

function openTicket(id) {
  const s = loadTickets(), t = findTicket(s, id);
  if (!t || !canSeeTicket(t)) { toast("That ticket doesn't exist or you can't see it"); return; }
  const a = t.account && find(t.account);
  const facts = [
    ['Assignee', `<span class="aud-person">${tkAvatar(t.assignee)}${esc(nameOf(t.assignee))}</span>`],
    ['Reporter', esc(nameOf(t.reporter))],
    ['Account', a ? `<a href="${accountLink(a)}">${esc(a.name)}</a>` : '<span class="sub">None</span>'],
    ['Due', t.due ? `${fmtDay(parseYmd(t.due))} ${tkOverdue(t) ? '<span class="overdue">overdue</span>' : ''}` : '<span class="sub">No due date</span>'],
    ['Created', fmtDate(t.createdAt)], ['Type', esc(t.type)],
  ];
  const timeline = [...t.comments.map(c => ({ ...c, kind: 'comment' })), ...t.history.filter(h => h.kind !== 'comment')]
    .sort((x, y) => y.at.localeCompare(x.at))
    .map(e => e.kind === 'comment'
      ? `<li class="tk-comment">${tkAvatar(e.by)}<div><b>${esc(nameOf(e.by))}</b> <span class="sub">${relTime(e.at)}</span><p>${esc(e.text)}</p></div></li>`
      : `<li class="tk-event"><span class="dot"></span><span><b>${esc(nameOf(e.by))}</b> ${esc(e.text)} <span class="sub">· ${relTime(e.at)}</span></span></li>`).join('');
  openDialog(`<div class="tk-dlg">
    <div class="dlg-head"><div><span class="tk-id">${t.id}</span><h3>${esc(t.title)}</h3>
      <div class="tk-tags">${tkStatusBadge(t.status)}${tkPrio(t.priority)}${t.status === 'pending' && t.pendingReason ? `<span class="tk-pend">${icon('clock')}${esc(t.pendingReason)}</span>` : ''}</div></div>
      <button type="button" class="dlg-x" data-sch="close" aria-label="Close">×</button></div>
    <dl class="tk-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${t.description ? `<p class="tk-desc">${esc(t.description)}</p>` : ''}
    ${t.resolution && isDone(t) ? `<div class="rec-box">${icon('check')} <b>Resolution:</b> ${esc(t.resolution)}</div>` : ''}
    <div class="actions tk-actions">${statusActions(t)}${canEditTicket(t) ? `<span style="flex:1"></span><button type="button" class="btn btn-sm" data-tk="edit" data-id="${t.id}">Edit details</button>` : ''}</div>
    <div id="tkSub"></div>
    ${canWorkTickets() ? `<form id="tkCommentForm" class="tk-comment-form" data-id="${t.id}" novalidate>
      <textarea name="text" rows="2" maxlength="1000" placeholder="Add a comment or update…" aria-label="Comment"></textarea>
      <button type="submit" class="btn btn-primary btn-sm">Comment</button></form>` : ''}
    <ul class="tk-timeline">${timeline}</ul></div>`);
  const d = dialogEl(); d.classList.add('wide');
  d.addEventListener('close', () => d.classList.remove('wide'), { once: true });
}

function subForm(id, kind) {
  const box = document.getElementById('tkSub');
  if (!box) return;
  box.innerHTML = kind === 'pend'
    ? `<form id="tkPendForm" class="tk-sub" data-id="${id}" novalidate><div class="error" id="tkSubErr"></div>
        <label><span>Waiting for…</span><select name="reason">${TK_PENDING.map(r => `<option>${r}</option>`).join('')}</select></label>
        <label><span>Note <span class="sub">(optional)</span></span><input name="note" maxlength="200" placeholder="Who or what you're waiting on"></label>
        <div class="actions"><button type="button" class="btn btn-sm" data-tk="sub-cancel">Cancel</button><button type="submit" class="btn btn-sm btn-primary">Mark pending</button></div></form>`
    : `<form id="tkResolveForm" class="tk-sub" data-id="${id}" novalidate><div class="error" id="tkSubErr"></div>
        <label class="full"><span>How was it resolved?</span><textarea name="note" rows="2" maxlength="500" placeholder="A short note for the reporter"></textarea></label>
        <div class="actions"><button type="button" class="btn btn-sm" data-tk="sub-cancel">Cancel</button><button type="submit" class="btn btn-sm btn-success">Resolve</button></div></form>`;
  box.querySelector('select, textarea, input')?.focus();
}

function mutateTicket(id, fn, msg) {
  const s = loadTickets(), t = findTicket(s, id);
  if (!t) return;
  fn(t);
  t.updatedAt = new Date().toISOString();
  saveTickets(s);
  if (msg) toast(msg);
  render();
  openTicket(id);
}
const tkLog = (t, text, kind = 'status', extra = {}) => t.history.unshift({ by: user.id, at: new Date().toISOString(), text, kind, ...extra });

function setStatus(id, status, text, extra = {}) {
  mutateTicket(id, t => {
    t.status = status;
    if (status !== 'pending') t.pendingReason = '';
    if (status === 'resolved') t.resolvedAt = new Date().toISOString();
    if (status === 'closed') t.closedAt = new Date().toISOString();
    if (status === 'open' || status === 'progress') { if (extra.reopen) { t.resolvedAt = null; t.closedAt = null; t.resolution = ''; } }
    Object.assign(t, extra.fields || {});
    tkLog(t, text);
  }, `${id}: ${TK_STATUS[status].label}`);
}

// ---------- Create / edit ----------
function ticketForm(id, preset = {}) {
  if (!canWorkTickets()) return;
  const s = loadTickets(), t = id ? findTicket(s, id) : null;
  if (id && (!t || !canEditTicket(t))) return;
  const v = t || { title: '', description: '', type: 'Task', priority: 'medium', account: preset.account || '', assignee: preset.assignee || user.id, due: ymd(addDays(new Date(), 7)) };
  const opt = (val, label, cur) => `<option value="${esc(val)}" ${val === cur ? 'selected' : ''}>${esc(label)}</option>`;
  const accs = accounts.filter(a => !a.archived && (user.role === 'TL' || canView(a)));
  openDialog(`${dialogHead(t ? `Edit ${t.id}` : 'New ticket', t ? esc(t.title) : 'Assign a piece of work to someone on the team')}
    <form id="tkForm" class="dlg-form" data-id="${t ? t.id : ''}" novalidate>
      <div class="error" id="tkErr"></div>
      <label class="full"><span>Title <span class="req">*</span></span><input name="title" value="${esc(v.title)}" maxlength="120" placeholder="What needs doing?"></label>
      <label class="full"><span>Description <span class="sub">(optional)</span></span><textarea name="description" rows="3" maxlength="1500" placeholder="Context, links, acceptance criteria">${esc(v.description || '')}</textarea></label>
      <label><span>Assignee <span class="req">*</span></span><select name="assignee">${assignable().map(u => opt(u.id, `${u.name} · ${ROLES[u.role].label}`, v.assignee)).join('')}</select></label>
      <label><span>Account <span class="sub">(optional)</span></span><select name="account">${opt('', 'No account', v.account || '')}${accs.map(a => opt(a.id, a.name, v.account || '')).join('')}</select></label>
      <label><span>Type</span><select name="type">${TK_TYPES.map(x => opt(x, x, v.type)).join('')}</select></label>
      <label><span>Priority</span><select name="priority">${Object.entries(TK_PRIORITY).map(([k, p]) => opt(k, p.label, v.priority)).join('')}</select></label>
      <label><span>Due date <span class="sub">(optional)</span></span><input type="date" name="due" value="${v.due || ''}"></label>
      <div class="actions dlg-actions full"><span style="flex:1"></span><button type="button" class="btn" data-sch="close">Cancel</button>
        <button type="submit" class="btn btn-primary">${t ? 'Save changes' : 'Create ticket'}</button></div>
    </form>`);
}

function saveTicketForm(form) {
  const f = form.elements, err = m => { const el = document.getElementById('tkErr'); el.textContent = m; el.style.display = 'block'; };
  const v = { title: f.title.value.trim(), description: f.description.value.trim(), assignee: f.assignee.value, account: f.account.value || null, type: f.type.value, priority: f.priority.value, due: f.due.value || null };
  if (v.title.length < 4) return err('Give the ticket a title (at least 4 characters).');
  if (!userById(v.assignee)) return err('Choose who should work on it.');
  const s = loadTickets(), now = new Date().toISOString();
  if (form.dataset.id) {
    const t = findTicket(s, form.dataset.id);
    if (!t || !canEditTicket(t)) return;
    const changes = [];
    if (t.assignee !== v.assignee) { changes.push(`reassigned to ${nameOf(v.assignee)}`); tkLog(t, `Reassigned to ${nameOf(v.assignee)}`, 'assigned', { to: v.assignee }); }
    if (t.priority !== v.priority) changes.push(`priority ${TK_PRIORITY[v.priority].label}`);
    if ((t.due || null) !== v.due) changes.push(v.due ? `due ${fmtDay(parseYmd(v.due))}` : 'no due date');
    if (t.title !== v.title || (t.description || '') !== v.description || t.type !== v.type || (t.account || null) !== v.account) changes.push('details');
    Object.assign(t, v, { updatedAt: now });
    const other = changes.filter(c => !c.startsWith('reassigned'));
    if (other.length) tkLog(t, `Updated ${other.join(', ')}`, 'edit');
    saveTickets(s); toast('Ticket updated'); render(); openTicket(t.id);
  } else {
    const next = Math.max(100, ...s.items.map(t => parseInt(t.id.replace(/\D/g, ''), 10) || 0)) + 1;
    const t = { id: 'TKT-' + next, ...v, status: 'open', reporter: user.id, createdAt: now, updatedAt: now, pendingReason: '', resolution: '', comments: [],
      history: [{ by: user.id, at: now, text: `Created and assigned to ${nameOf(v.assignee)}`, kind: 'created', to: v.assignee }] };
    s.items.unshift(t); saveTickets(s);
    toast(`${t.id} created${v.assignee !== user.id ? ` and assigned to ${nameOf(v.assignee)}` : ''}`);
    render(); openTicket(t.id);
  }
}

// ---------- Account page card ----------
function accountTicketsCard(a) {
  const list = visibleTickets().filter(t => t.account === a.id);
  const active = list.filter(isActive).sort((x, y) => (tkOverdue(y) - tkOverdue(x)) || TK_PRIORITY[y.priority].w - TK_PRIORITY[x.priority].w);
  return `<div class="card"><div class="discuss-head"><h3 class="card-title">Tickets <span class="sub">${active.length} open · ${list.length - active.length} done</span></h3>
      <a class="btn btn-sm" href="tickets.html?account=${encodeURIComponent(a.id)}">View all</a></div>
    <div class="acc-tickets">${active.slice(0, 5).map(tkCard).join('') || '<p class="sub">No open tickets for this account.</p>'}</div>
    ${canWorkTickets() && !a.archived ? `<div class="actions" style="margin-top:10px"><button type="button" class="btn btn-sm" data-tk="new" data-account="${a.id}">${icon('plus')} New ticket</button></div>` : ''}</div>`;
}

// ---------- Notifications, search, audit ----------
function ticketFeed() {
  const items = [];
  visibleTickets().forEach(t => {
    const mineA = t.assignee === user.id, mineR = t.reporter === user.id;
    if (!mineA && !mineR) return;
    const href = `tickets.html?t=${t.id}`, ref = `<b>${t.id}</b> ${esc(short(t.title, 60))}`;
    t.history.forEach((h, i) => {
      if (h.by === user.id) return;
      if ((h.kind === 'created' || h.kind === 'assigned') && (h.to || t.assignee) === user.id) items.push({ id: `tk:${t.id}:${h.at}:${i}`, kind: 'ticket', at: h.at, href, html: `<b>${esc(nameOf(h.by))}</b> assigned you ${ref}` });
      else if (h.kind === 'status' && (mineR || mineA)) items.push({ id: `tk:${t.id}:${h.at}:${i}`, kind: 'ticket', at: h.at, href, html: `<b>${esc(nameOf(h.by))}</b> · ${esc(h.text)} · ${ref}` });
    });
    t.comments.forEach((c, i) => { if (c.by !== user.id) items.push({ id: `tkc:${t.id}:${c.at}:${i}`, kind: 'ticket', at: c.at, href, html: `<b>${esc(nameOf(c.by))}</b> commented on ${ref}: “${esc(short(c.text, 70))}”` }); });
    if (mineA && tkOverdue(t)) items.push({ id: `tko:${t.id}:${t.due}`, kind: 'ticket', at: parseYmd(t.due).toISOString(), href, html: `${ref} is <b>overdue</b> (due ${fmtDay(parseYmd(t.due))})` });
    else if (mineA && tkDueSoon(t)) items.push({ id: `tks:${t.id}:${t.due}`, kind: 'ticket', at: addDays(parseYmd(t.due), -2).toISOString(), href, html: `${ref} is due <b>${fmtDay(parseYmd(t.due))}</b>` });
  });
  return items;
}
function ticketSearch(q) {
  const t0 = q.trim().toLowerCase();
  return visibleTickets().filter(t => `${t.id} ${t.title} ${t.description}`.toLowerCase().includes(t0))
    .sort((x, y) => (isDone(x) - isDone(y)) || y.updatedAt.localeCompare(x.updatedAt))
    .map(t => ({ href: `tickets.html?t=${t.id}`, ic: 'ticket', title: `${t.id} · ${mark(t.title, q)}`, sub: `${TK_STATUS[t.status].label} · ${esc(nameOf(t.assignee))}`, badge: tkPrio(t.priority) }));
}
function ticketAuditEntries() {
  return loadTickets().items.flatMap(t => [...t.history, ...t.comments.map(c => ({ ...c, text: `Commented: ${short(c.text, 80)}` }))]
    .map(h => ({ at: h.at, by: h.by, text: `${t.id} ${short(t.title, 50)} — ${h.text}`, a: t.account ? find(t.account) : null, type: 'tickets' })));
}

// ---------- Events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tk]');
  if (!b) return;
  const act = b.dataset.tk, id = b.dataset.id;
  if (act === 'view') { tkUI.view = b.dataset.v; tkUI.person = null; render(); }
  else if (act === 'person') { tkUI.view = 'workload'; tkUI.person = id || null; render(); window.scrollTo(0, 0); }
  else if (act === 'open') openTicket(id);
  else if (act === 'new') ticketForm(null, { account: b.dataset.account });
  else if (act === 'edit') ticketForm(id);
  else if (act === 'start') { const t = findTicket(loadTickets(), id); setStatus(id, 'progress', t && t.status === 'pending' ? 'Resumed work' : 'Started work'); }
  else if (act === 'stop') setStatus(id, 'open', 'Moved back to open');
  else if (act === 'pend') subForm(id, 'pend');
  else if (act === 'resolve') subForm(id, 'resolve');
  else if (act === 'close') setStatus(id, 'closed', 'Closed');
  else if (act === 'reopen') setStatus(id, 'open', 'Reopened', { reopen: true });
  else if (act === 'sub-cancel') { const box = document.getElementById('tkSub'); if (box) box.innerHTML = ''; }
});
document.addEventListener('input', e => {
  if (!isEl(e.target, '[data-tkf="q"]')) return;
  tkUI.q = e.target.value;
  clearTimeout(tkUI.timer);
  tkUI.timer = setTimeout(() => { render(); const i = document.querySelector('[data-tkf="q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200);
});
document.addEventListener('change', e => {
  if (!isEl(e.target, 'select[data-tkf]')) return;
  tkUI[e.target.dataset.tkf] = e.target.value;
  render();
});
document.addEventListener('submit', e => {
  const f = e.target;
  if (f.id === 'tkForm') { e.preventDefault(); saveTicketForm(f); }
  else if (f.id === 'tkCommentForm') {
    e.preventDefault();
    const text = f.elements.text.value.trim();
    if (!text) return;
    mutateTicket(f.dataset.id, t => { t.comments.push({ by: user.id, at: new Date().toISOString(), text }); }, 'Comment added');
  } else if (f.id === 'tkPendForm') {
    e.preventDefault();
    const reason = f.elements.reason.value, note = f.elements.note.value.trim();
    const label = note ? `${reason} (${note})` : reason;
    setStatus(f.dataset.id, 'pending', `Marked pending: ${label}`, { fields: { pendingReason: label } });
  } else if (f.id === 'tkResolveForm') {
    e.preventDefault();
    const note = f.elements.note.value.trim();
    setStatus(f.dataset.id, 'resolved', `Resolved${note ? `: ${note}` : ''}`, { fields: { resolution: note } });
  }
});
