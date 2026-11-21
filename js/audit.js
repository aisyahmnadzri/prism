// PRISM — Audit trail (Team Lead only): every change across all accounts plus workspace changes,
// with filters and a CSV export. Loaded before app.js; app.js helpers are used at call time only.

const AUDIT_TYPES = {
  stage: { label: 'Stages & approvals', color: '#7c3aed' },
  docs: { label: 'Documents', color: '#0ea5e9' },
  update: { label: 'Progress updates', color: '#16a34a' },
  details: { label: 'Account details', color: '#f59e0b' },
  schedule: { label: 'Schedule', color: '#ec4899' },
  archive: { label: 'Archive', color: '#64748b' },
  workspace: { label: 'Workspace settings', color: '#e11d48' },
};
const audUI = { q: '', person: 'all', account: 'all', type: 'all', range: '30', limit: 60 };

function auditType(text) {
  if (/^(Scheduled|Updated event|Removed event|Updated the stage plan)/.test(text)) return 'schedule';
  if (/^(Archived|Restored)/.test(text)) return 'archive';
  if (/^(Approved:|Returned for rework|Decision:|Skipped optional stage|Requested (approval|Go))/.test(text)) return 'stage';
  if (/^(Submitted “|Removed “)/.test(text)) return 'docs';
  if (/^Posted a progress update/.test(text)) return 'update';
  return 'details';
}

function auditEntries() {
  const fromAccounts = accounts.flatMap(a => a.history.map(h => ({ at: h.at, by: h.by, text: h.text, a, type: auditType(h.text) })));
  const fromWorkspace = loadAudit().map(w => ({ ...w, a: null, type: 'workspace' }));
  return [...fromAccounts, ...fromWorkspace].sort((x, y) => y.at.localeCompare(x.at));
}

function auditFiltered() {
  const q = audUI.q.trim().toLowerCase();
  const since = audUI.range === 'all' ? '' : new Date(Date.now() - Number(audUI.range) * 86400000).toISOString();
  return auditEntries().filter(e =>
    (!since || e.at >= since) &&
    (audUI.person === 'all' || e.by === audUI.person) &&
    (audUI.account === 'all' || (audUI.account === 'workspace' ? !e.a : e.a && e.a.id === audUI.account)) &&
    (audUI.type === 'all' || e.type === audUI.type) &&
    (!q || `${e.text} ${nameOf(e.by)} ${e.a ? e.a.name : 'workspace'}`.toLowerCase().includes(q)));
}

function auditPage() {
  if (user.role !== 'TL') return '<div class="empty">Only the AI Team Lead can see the audit trail.</div>';
  const list = auditFiltered();
  const people = new Set(list.map(e => e.by)), touched = new Set(list.filter(e => e.a).map(e => e.a.id));
  const counts = {}; list.forEach(e => { counts[e.by] = (counts[e.by] || 0) + 1; });
  const top = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`;
  const filters = `<div class="aud-bar">
      <span class="search">${icon('search')}<input type="search" data-aud="q" value="${esc(audUI.q)}" placeholder="Search changes…" aria-label="Search changes"></span>
      <select data-aud="range" aria-label="Date range">${[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['all', 'All time']].map(([v, l]) => opt(v, l, audUI.range)).join('')}</select>
      <select data-aud="person" aria-label="Person">${opt('all', 'Everyone', audUI.person)}${USERS.map(u => opt(u.id, u.name, audUI.person)).join('')}</select>
      <select data-aud="account" aria-label="Account">${opt('all', 'All accounts', audUI.account)}${opt('workspace', 'Workspace settings', audUI.account)}${accounts.map(a => opt(a.id, a.name, audUI.account)).join('')}</select>
      <select data-aud="type" aria-label="Type">${opt('all', 'All types', audUI.type)}${Object.entries(AUDIT_TYPES).map(([k, v]) => opt(k, v.label, audUI.type)).join('')}</select>
      <button type="button" class="btn" data-aud-act="csv">${icon('download')} Export CSV</button>
    </div>`;
  const stats = `<div class="aud-stats">
      <div><b>${list.length}</b><span>changes</span></div><div><b>${people.size}</b><span>people</span></div>
      <div><b>${touched.size}</b><span>accounts touched</span></div>
      <div><b>${top ? esc(nameOf(top[0]).split(' ')[0]) : '—'}</b><span>${top ? `most active · ${top[1]} changes` : 'most active'}</span></div></div>`;
  let lastDay = null;
  const rows = list.slice(0, audUI.limit).map(e => {
    const day = fmtDate(e.at);
    const head = day !== lastDay ? `<tr class="aud-day"><td colspan="4">${dayLabel(e.at) === day ? day : `${dayLabel(e.at)} · ${day}`}</td></tr>` : '';
    lastDay = day;
    const u = userById(e.by) || { name: 'Former member', role: 'DEV' };
    const t = AUDIT_TYPES[e.type];
    return `${head}<tr>
      <td class="aud-time" data-label="Time">${new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
      <td data-label="Person"><span class="aud-person"><span class="avatar mini role-${u.role}" data-u="${e.by}">${esc(initials(u.name))}</span>${esc(u.name)}</span></td>
      <td data-label="Account">${e.a ? `<a href="${accountLink(e.a)}">${esc(e.a.name)}</a>${e.a.archived ? ' <span class="badge b-onhold">Archived</span>' : ''}` : '<span class="sub">Workspace</span>'}</td>
      <td data-label="Change"><span class="aud-type" style="--k:${t.color}">${t.label}</span> ${esc(e.text)}</td></tr>`;
  }).join('');
  const more = list.length > audUI.limit ? `<div class="aud-more"><button type="button" class="btn" data-aud-act="more">Show ${Math.min(60, list.length - audUI.limit)} more</button>
      <span class="sub">Showing ${audUI.limit} of ${list.length}</span></div>` : '';
  return `${filters}${stats}<div class="card aud-card"><div class="aud-wrap"><table class="aud-table">
      <thead><tr><th>Time</th><th>Person</th><th>Account</th><th>Change</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4"><div class="empty">No changes match these filters.</div></td></tr>'}</tbody></table></div>${more}</div>`;
}

function exportAuditCsv() {
  const rows = [['Date', 'Time', 'Person', 'Role', 'Account', 'Type', 'Change'],
    ...auditFiltered().map(e => { const u = userById(e.by); const d = new Date(e.at);
      return [ymd(d), d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), nameOf(e.by), u ? ROLES[u.role].label : '', e.a ? e.a.name : 'Workspace', AUDIT_TYPES[e.type].label, e.text]; })];
  downloadBlob(`PRISM-audit-trail-${todayStamp()}.csv`, 'text/csv;charset=utf-8', toCsv(rows));
  toast(`Exported ${rows.length - 1} changes`);
}

// ---------- Events ----------
let audTimer = null;
document.addEventListener('input', e => {
  if (!isEl(e.target, '[data-aud="q"]')) return;
  audUI.q = e.target.value; audUI.limit = 60;
  clearTimeout(audTimer);
  audTimer = setTimeout(() => { render(); const i = document.querySelector('[data-aud="q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200);
});
document.addEventListener('change', e => {
  if (!isEl(e.target, 'select[data-aud]')) return;
  audUI[e.target.dataset.aud] = e.target.value; audUI.limit = 60;
  render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-aud-act]');
  if (!b) return;
  if (b.dataset.audAct === 'csv') exportAuditCsv();
  else if (b.dataset.audAct === 'more') { audUI.limit += 60; render(); }
});
