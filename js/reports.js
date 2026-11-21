// PRISM — Reports: a printable POC status summary, downloadable as PDF (browser "Save as PDF") or Excel (.xlsx).
// Also holds the small file-download helpers used by the audit trail and feedback pages.
// Loaded before app.js; app.js helpers are used at call time only.

const SHEETJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const repUI = { scope: 'active', am: 'all' }; // scope: active | decided (active + converted/closed) | all (incl. archived)

// ---------- Download helpers ----------
function downloadBlob(filename, mime, content) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function toCsv(rows) {
  const cell = v => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n'); // BOM so Excel reads accents correctly
}
const todayStamp = () => ymd(new Date());
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return window.XLSX ? res() : setTimeout(() => (window.XLSX ? res() : rej()), 1500);
    const s = Object.assign(document.createElement('script'), { src, onload: res, onerror: rej });
    document.head.appendChild(s);
  });
}

// ---------- Data ----------
// Higher Management sees every account in reports (they're the audience for management meetings).
function reportAccounts() {
  let list = accounts.filter(a => user.role === 'HM' || canView(a));
  if (repUI.scope === 'active') list = list.filter(a => !a.outcome && !a.archived);
  else if (repUI.scope === 'decided') list = list.filter(a => !a.archived);
  if (repUI.am !== 'all') list = list.filter(a => a.am === repUI.am);
  return list.sort((x, y) => (x.outcome ? 1 : 0) - (y.outcome ? 1 : 0) || x.stage - y.stage || x.name.localeCompare(y.name));
}
const lastUpdate = a => a.updates[0] ? a.updates[0].at : null;
const statusOf = a => a.outcome || a.status;

function reportData() {
  const list = reportAccounts();
  const active = list.filter(a => !a.outcome);
  const decided = list.filter(a => a.outcome);
  // Conversion rate always uses every decided POC (including archived) so management sees the overall rate.
  const allDecided = accounts.filter(a => (user.role === 'HM' || canView(a)) && a.outcome && (repUI.am === 'all' || a.am === repUI.am));
  const converted = allDecided.filter(a => a.outcome === 'Converted').length, closed = allDecided.filter(a => a.outcome === 'Closed').length;
  const attention = active.filter(a => isOverdue(a) || a.status === 'At Risk' || a.status === 'Delayed');
  const horizon = addDays(new Date(), 30);
  const upcoming = active.map(a => ({ a, due: stageDue(a) })).filter(x => x.due <= horizon).sort((x, y) => x.due - y.due);
  return {
    list, active, decided, attention, upcoming,
    pending: active.filter(a => a.pending),
    decidedAll: allDecided.length,
    onTrack: active.filter(a => a.status === 'On Track').length,
    conversion: converted + closed ? Math.round((converted / (converted + closed)) * 100) : null,
    byStage: STAGES.map(s => ({ s, items: active.filter(a => a.stage === s.id) })),
    byStatus: Object.keys(STATUS_COLOR).map(st => ({ st, n: active.filter(a => a.status === st).length })),
  };
}

// ---------- Page ----------
function reportsPage() {
  const d = reportData();
  const scopeLabel = { active: 'Active POCs', decided: 'Active and decided POCs', all: 'All POCs, including archived' }[repUI.scope];
  const amLabel = repUI.am === 'all' ? '' : ` · ${nameOf(repUI.am)}'s accounts`;
  const ams = USERS.filter(u => u.role === 'AM');
  const pct = (n, t) => t ? Math.round((n / t) * 100) : 0;
  const kpis = [
    ['Active POCs', d.active.length, ''],
    ['On track', `${pct(d.onTrack, d.active.length)}%`, `${d.onTrack} of ${d.active.length}`],
    ['Need attention', d.attention.length, 'At risk, delayed or overdue'],
    ['Awaiting approval', d.pending.length, ''],
    ['Conversion rate', d.conversion === null ? '—' : `${d.conversion}%`, `${d.decidedAll} decided POCs overall`],
  ];
  const stageRows = d.byStage.map(({ s, items }) => `<tr><td><span class="pl-num">${s.id}</span>${esc(s.name)}</td><td class="num">${items.length}</td>
      <td>${items.map(a => esc(a.name)).join(', ') || '<span class="sub">—</span>'}</td></tr>`).join('');
  const maxStatus = Math.max(1, ...d.byStatus.map(x => x.n));
  const statusBars = d.byStatus.map(({ st, n }) => `<div class="bar-row"><span class="bar-label">${st}</span>
      <span class="bar-track"><i style="width:${(n / maxStatus) * 100}%;background:${STATUS_COLOR[st]}"></i></span><span class="bar-val">${n}</span></div>`).join('');
  const attention = d.attention.map(a => {
    const why = [isOverdue(a) && `${-daysLeft(a)}d past Stage ${a.stage} target`, a.status !== 'On Track' && a.status].filter(Boolean).join(' · ');
    const blocker = a.updates[0] && a.updates[0].blockers;
    return `<li><b>${esc(a.name)}</b> <span class="sub">· ${esc(stageOf(a).name)}</span><div class="r-why">${esc(why)}</div>${blocker ? `<div class="r-blocker">Blocker: ${esc(blocker)}</div>` : ''}</li>`;
  }).join('') || '<li class="sub">Nothing needs attention.</li>';
  const upcoming = d.upcoming.map(({ a, due }) => `<tr><td>${fmtDate(due.toISOString())}</td><td>${esc(a.name)}</td><td>Stage ${a.stage} · ${esc(stageOf(a).name)} target</td>
      <td>${ROLES[stageOf(a).approver].label}</td></tr>`).join('') || '<tr><td colspan="4" class="sub">No stage targets in the next 30 days.</td></tr>';
  const accountRows = d.list.map(a => `<tr><td><b>${esc(a.name)}</b><div class="sub">${esc(a.useCase)}</div></td>
      <td>${a.outcome ? '—' : `${a.stage}. ${esc(stageOf(a).name)}`}</td>
      <td><span class="badge ${statusClass(statusOf(a))}">${statusOf(a)}</span>${a.archived ? ' <span class="badge b-onhold">Archived</span>' : ''}</td>
      <td class="num">${a.progress}%</td><td>${esc(nameOf(a.am))}</td>
      <td class="num">${a.outcome ? '—' : `${daysIn(a)}/${stageOf(a).targetDays}d`}</td>
      <td>${lastUpdate(a) ? fmtDate(lastUpdate(a)) : '<span class="sub">None</span>'}</td></tr>`).join('');

  const controls = `<div class="rep-bar no-print">
      <label><span>Include</span><select data-rep="scope">
        ${[['active', 'Active POCs'], ['decided', 'Active + decided'], ['all', 'All, including archived']].map(([v, l]) => `<option value="${v}" ${repUI.scope === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${user.role !== 'AM' ? `<label><span>Account Manager</span><select data-rep="am"><option value="all">Everyone</option>
        ${ams.map(u => `<option value="${u.id}" ${repUI.am === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>` : ''}
      <span style="flex:1"></span>
      <button type="button" class="btn" data-rep-act="pdf">${icon('download')} Download PDF</button>
      <button type="button" class="btn btn-primary" data-rep-act="xlsx">${icon('download')} Download Excel</button>
    </div>`;
  return `${controls}
  <article class="report card" id="report">
    <header class="r-head">
      <div class="r-brand">${LOGO}<div><b>PRISM</b><span>POC status report</span></div></div>
      <div class="r-meta"><b>${esc(scopeLabel)}${esc(amLabel)}</b><span>Generated ${fmtLong(new Date())} · ${esc(user.name)}, ${ROLES[user.role].label}</span></div>
    </header>
    <section class="r-kpis">${kpis.map(([l, v, s]) => `<div><span>${l}</span><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`).join('')}</section>
    <div class="r-two">
      <section><h3>Status of active POCs</h3><div class="bars">${statusBars}</div></section>
      <section><h3>Needs attention</h3><ul class="r-list">${attention}</ul></section>
    </div>
    <section><h3>Pipeline by stage</h3><table class="r-table"><thead><tr><th>Stage</th><th class="num">POCs</th><th>Accounts</th></tr></thead><tbody>${stageRows}</tbody></table></section>
    <section><h3>Stage targets in the next 30 days</h3><table class="r-table"><thead><tr><th>Date</th><th>Account</th><th>Milestone</th><th>Approver</th></tr></thead><tbody>${upcoming}</tbody></table></section>
    <section class="r-break"><h3>All accounts in this report (${d.list.length})</h3>
      <table class="r-table"><thead><tr><th>Account</th><th>Stage</th><th>Status</th><th class="num">Progress</th><th>Account Manager</th><th class="num">Days in stage</th><th>Last update</th></tr></thead>
      <tbody>${accountRows || '<tr><td colspan="7" class="sub">No accounts match.</td></tr>'}</tbody></table></section>
    <footer class="r-foot">PRISM · Project Reporting &amp; Insight System Manager · Prototype data</footer>
  </article>`;
}

// ---------- Exports ----------
function downloadPdf() {
  const prev = document.title;
  document.title = `PRISM-POC-report-${todayStamp()}`; // becomes the suggested PDF file name
  window.print();
  setTimeout(() => { document.title = prev; }, 500);
}

function reportSheets() {
  const d = reportData();
  const summary = [
    ['PRISM POC status report'], ['Generated', fmtLong(new Date())], ['Prepared by', `${user.name} (${ROLES[user.role].label})`],
    ['Scope', { active: 'Active POCs', decided: 'Active and decided POCs', all: 'All POCs, including archived' }[repUI.scope] + (repUI.am === 'all' ? '' : ` · ${nameOf(repUI.am)}`)],
    [], ['Active POCs', d.active.length], ['On track', d.onTrack], ['Need attention', d.attention.length], ['Awaiting approval', d.pending.length],
    ['Conversion rate', d.conversion === null ? '—' : `${d.conversion}%`], [],
    ['Stage', 'Active POCs'], ...d.byStage.map(({ s, items }) => [`${s.id}. ${s.name}`, items.length]), [],
    ['Status', 'Active POCs'], ...d.byStatus.map(({ st, n }) => [st, n]),
  ];
  const accountsSheet = [['ID', 'Account', 'Sector', 'Use case', 'Stage', 'Stage name', 'Status', 'Outcome', 'Archived', 'Progress %', 'Days in stage', 'Stage target days',
    'Overdue', 'Account Manager', 'Developers', 'Waiting for approval from', 'Last update', 'Latest blocker'],
    ...d.list.map(a => [a.id, a.name, a.sector, a.useCase, a.stage, stageOf(a).name, a.status, a.outcome || '', a.archived ? 'Yes' : 'No', a.progress,
      a.outcome ? '' : daysIn(a), stageOf(a).targetDays, isOverdue(a) ? 'Yes' : 'No', nameOf(a.am), a.devs.map(nameOf).join(', '),
      a.pending && !a.outcome ? ROLES[stageOf(a).approver].label : '', lastUpdate(a) ? fmtDate(lastUpdate(a)) : '', (a.updates[0] && a.updates[0].blockers) || ''])];
  const pendingSheet = [['Account', 'Stage', 'Moving to', 'Approver', 'Requested by', 'Requested on'],
    ...d.pending.map(a => [a.name, `${a.stage}. ${stageOf(a).name}`, a.stage < 10 ? STAGES[a.stage].name : 'Go / No-Go decision', ROLES[stageOf(a).approver].label, nameOf(a.pending.by), fmtDate(a.pending.at)])];
  const upcomingSheet = [['Date', 'Account', 'Milestone', 'Approver'],
    ...d.upcoming.map(({ a, due }) => [ymd(due), a.name, `Stage ${a.stage} · ${stageOf(a).name} target`, ROLES[stageOf(a).approver].label])];
  return { Summary: summary, Accounts: accountsSheet, 'Pending approvals': pendingSheet, 'Next 30 days': upcomingSheet };
}

async function downloadExcel(btn) {
  const sheets = reportSheets();
  btn.disabled = true; const label = btn.innerHTML; btn.innerHTML = 'Preparing…';
  try {
    await loadScript(SHEETJS_URL);
    const wb = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([name, rows]) => {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const widths = rows.reduce((w, r) => r.map((c, i) => Math.max(w[i] || 8, Math.min(60, String(c ?? '').length + 2))), []);
      ws['!cols'] = widths.map(wch => ({ wch }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, `PRISM-POC-report-${todayStamp()}.xlsx`);
    toast('Excel report downloaded');
  } catch (e) {
    // Offline or blocked: fall back to a CSV of the accounts sheet, which Excel opens too.
    downloadBlob(`PRISM-accounts-${todayStamp()}.csv`, 'text/csv;charset=utf-8', toCsv(sheets.Accounts));
    toast("Couldn't build the Excel file offline, so a CSV was downloaded instead");
  } finally { btn.disabled = false; btn.innerHTML = label; }
}

// ---------- Events ----------
document.addEventListener('change', e => {
  if (!isEl(e.target, '[data-rep]')) return;
  repUI[e.target.dataset.rep] = e.target.value;
  render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rep-act]');
  if (!b) return;
  if (b.dataset.repAct === 'pdf') downloadPdf();
  else if (b.dataset.repAct === 'xlsx') downloadExcel(b);
});
