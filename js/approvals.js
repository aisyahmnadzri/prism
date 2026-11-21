// PRISM — Approvals: who approves what (no self-approval, delegation, escalation), decision dialogs with
// required reasons, Go / No-Go recommendation step, approval history and the Approvals page.
// Loaded before app.js; app.js helpers (find, log, commit, esc, icon, render…) are used at call time only.

const DEFAULT_APPROVAL_RULES = { remindDays: 2, escalateDays: 5, recommendGoNoGo: true };
const CLOSE_REASONS = ['No clear business case', 'Agency withdrew or deprioritised', 'Technical feasibility not proven', 'Budget or procurement blocked', 'Data not available or not usable', 'Other'];
const DECISIONS = {
  approved: { label: 'Approved', cls: 'b-ontrack' }, returned: { label: 'Returned', cls: 'b-atrisk' },
  converted: { label: 'Converted', cls: 'b-converted' }, extended: { label: 'Extended', cls: 'b-pending' },
  closed: { label: 'Closed', cls: 'b-closed' }, withdrawn: { label: 'Withdrawn', cls: 'b-onhold' },
  recommended: { label: 'Recommended', cls: 'b-pending' }, skipped: { label: 'Skipped', cls: 'b-onhold' },
};
const apvUI = { tab: null };

const approvalRules = () => ({ ...DEFAULT_APPROVAL_RULES, ...(((loadSettings().workspace || {}).approvalRules) || {}) });
const waitDays = a => a.pending ? Math.floor((Date.now() - new Date(a.pending.at)) / 86400000) : 0;
const firstName = id => nameOf(id).split(' ')[0];
function delegationOf(uid) {
  const d = (loadSettings().delegations || {})[uid];
  return d && d.to && d.until && ymd(new Date()) <= d.until && userById(d.to) ? d : null;
}

// ---------- Routing: who must act on a pending request ----------
function approvalRoute(a) {
  if (!a || !a.pending || a.outcome) return null;
  const rules = approvalRules(), requester = a.pending.by;
  const ofRole = r => USERS.filter(u => u.role === r && (r !== 'AM' || u.id === a.am)).map(u => u.id).filter(id => id !== requester);
  let step = 'approve', role = stageOf(a).approver, note = '';
  if (a.stage === 10 && rules.recommendGoNoGo && !a.pending.recommendation) {
    if (ofRole('TL').length) { step = 'recommend'; role = 'TL'; }
    else note = 'The Team Lead made this request, so it goes straight to the decision.';
  }
  let primary = ofRole(role);
  if (!primary.length) { // nobody else can approve: no one holds the role yet, or the requester is the only one
    const nobody = !USERS.some(u => u.role === role && (role !== 'AM' || u.id === a.am));
    for (const r of ['TL', 'HM']) {
      primary = ofRole(r);
      if (primary.length) {
        note = nobody ? `Nobody has the ${ROLES[role].label} role yet, so this goes to the ${ROLES[r].label}.` : `Sent to ${ROLES[r].label} because requesters can't approve their own request.`;
        break;
      }
    }
  }
  const people = new Set(primary), delegates = [];
  primary.forEach(id => {
    const d = delegationOf(id);
    if (d && d.to !== requester) { people.add(d.to); delegates.push({ for: id, to: d.to, until: d.until }); }
  });
  const escalated = waitDays(a) >= rules.escalateDays;
  if (escalated) ofRole('TL').forEach(id => people.add(id)); // long waits pull in the Team Lead
  return { step, role, primary, people: [...people], delegates, escalated, note };
}
function canApprove(a) { const r = approvalRoute(a); return !!r && r.people.includes(user.id); }
const canWithdraw = a => !!(a && a.pending && !a.outcome && (a.pending.by === user.id || user.role === 'TL'));
const approverNames = a => { const r = approvalRoute(a); return r ? r.people.map(nameOf).join(', ') : ''; };
// Why the signed-in person can act (shown on the card)
function actingAs(a, r) {
  if (r.primary.includes(user.id)) return '';
  const d = r.delegates.find(x => x.to === user.id);
  if (d) return `On behalf of ${nameOf(d.for)} (away until ${fmtDay(parseYmd(d.until))})`;
  if (r.escalated) return `Escalated to you after ${waitDays(a)} days`;
  return '';
}

function recordDecision(a, decision, extra = {}) {
  (a.approvals = a.approvals || []).unshift({ stage: a.stage, decision, by: user.id, at: new Date().toISOString(),
    requestedBy: a.pending ? a.pending.by : null, requestedAt: a.pending ? a.pending.at : null, ...extra });
}

// ---------- Buttons ----------
function decisionButtons(a) {
  const r = approvalRoute(a);
  if (!r || !r.people.includes(user.id)) return '';
  if (r.step === 'recommend') return `<button class="btn btn-primary btn-sm" data-act="recommend" data-id="${a.id}">Give recommendation</button>`;
  return a.stage === 10
    ? `<button class="btn btn-success btn-sm" data-act="Converted" data-id="${a.id}">Convert to project</button>
       <button class="btn btn-sm" data-act="Extended" data-id="${a.id}">Extend POC</button>
       <button class="btn btn-sm" data-act="Closed" data-id="${a.id}">Close</button>`
    : `<button class="btn btn-success btn-sm" data-act="approve" data-id="${a.id}">Approve</button>
       <button class="btn btn-sm" data-act="return" data-id="${a.id}">Return for rework</button>`;
}

// Notice on the account page while a request is pending
function pendingNotice(a) {
  const r = approvalRoute(a), w = waitDays(a), rules = approvalRules();
  const rec = a.pending.recommendation;
  const who = r.step === 'recommend' ? `a recommendation from <b>${esc(r.people.map(nameOf).join(', '))}</b>` : `<b>${esc(r.people.map(nameOf).join(', '))}</b>`;
  return `<div class="notice ${w >= rules.remindDays ? 'late' : ''}">⏳ Waiting for ${who} · requested by ${esc(nameOf(a.pending.by))} ${w ? `${w} day${w === 1 ? '' : 's'} ago` : 'today'}
      ${r.note ? `<div class="sub">${esc(r.note)}</div>` : ''}${r.escalated ? `<div class="sub">Escalated to the Team Lead after ${w} days.</div>` : ''}
      ${rec ? `<div class="rec-box">${icon('sparkles')} <b>${esc(nameOf(rec.by))} recommends ${esc(rec.verdict)}</b>: ${esc(rec.note)}</div>` : ''}</div>
    <div class="actions">${decisionButtons(a)}${canWithdraw(a) ? `<button class="btn btn-sm" data-act="withdraw" data-id="${a.id}">Withdraw request</button>` : ''}</div>`;
}

// ---------- Dialogs ----------
function decisionSummary(a) {
  const s = stageOf(a), next = a.stage < 10 ? STAGES[a.stage].name : 'Go / No-Go decision';
  const docs = s.deliverables.map((d, i) => { const m = (a.evidenceBy || [])[i];
    return `<li><span class="ok">✔</span><span>${esc(d)}<small>${esc(a.evidence[i] || '')}${m ? ` · ${esc(nameOf(m.by))}, ${fmtDay(new Date(m.at))}` : ''}</small></span></li>`; }).join('');
  return `<div class="dlg-summary"><div class="move"><span>${s.id}. ${esc(s.name)}</span><span class="arrow">→</span><span>${esc(next)}</span></div>
    <div class="sub">Requested by ${esc(nameOf(a.pending.by))} · ${fmtDay(new Date(a.pending.at))} · waiting ${waitDays(a)}d</div>
    <ul class="checklist">${docs}</ul></div>`;
}
const dlgActions = (submit, cls = 'btn-primary') => `<div class="actions dlg-actions full"><span style="flex:1"></span>
  <button type="button" class="btn" data-sch="close">Cancel</button><button type="submit" class="btn ${cls}">${submit}</button></div>`;

function approve(id, decision) { // opens the right dialog; nothing changes until it's confirmed
  const a = find(id);
  if (!a || !canApprove(a)) return;
  const r = approvalRoute(a);
  if (r.step === 'recommend') return openRecommend(a);
  if (a.stage === 10 && decision) return openDecision(a, decision);
  openDialog(`${dialogHead('Approve this stage?', esc(a.name))}${decisionSummary(a)}
    <form id="apvForm" class="dlg-form" data-kind="approve" data-id="${a.id}" novalidate>
      <label class="full"><span>Comment or conditions <span class="sub">(optional)</span></span>
        <textarea name="comment" rows="3" maxlength="600" placeholder="e.g. Approved on condition the NDA is countersigned by Friday"></textarea></label>
      <p class="sub full">The account moves to the next stage and the requester is notified.</p>
      ${dlgActions('Approve', 'btn-success')}</form>`);
}

function returnForRework(id) {
  const a = find(id);
  if (!a || !canApprove(a)) return;
  openDialog(`${dialogHead('Return for rework', esc(a.name))}${decisionSummary(a)}
    <form id="apvForm" class="dlg-form" data-kind="return" data-id="${a.id}" novalidate>
      <div class="error" id="apvError"></div>
      <label class="full"><span>What needs to change? <span class="req">*</span></span>
        <textarea name="comment" rows="4" maxlength="800" placeholder="Explain what's missing or needs fixing so the team can resubmit"></textarea></label>
      ${dlgActions('Return for rework')}</form>`);
}

function openDecision(a, kind) {
  const rec = a.pending.recommendation;
  const recBox = rec ? `<div class="rec-box">${icon('sparkles')} <b>${esc(nameOf(rec.by))} recommends ${esc(rec.verdict)}</b><br>${esc(rec.note)}</div>` : '';
  const minDate = ymd(addDays(new Date(), 7));
  const body = {
    Converted: `<label class="full"><span>Next steps <span class="sub">(optional)</span></span><textarea name="comment" rows="3" maxlength="600" placeholder="e.g. Start procurement planning with the agency"></textarea></label>
      <p class="sub full">The POC is marked <b>Converted</b> and leaves the active pipeline.</p>`,
    Closed: `<div class="error" id="apvError"></div>
      <label class="full"><span>Reason <span class="req">*</span></span><select name="reason"><option value="">Choose a reason…</option>${CLOSE_REASONS.map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="full"><span>Explanation <span class="req">*</span></span><textarea name="comment" rows="3" maxlength="800" placeholder="What did we learn, and is there anything to revisit later?"></textarea></label>
      <p class="sub full">The POC is marked <b>Closed</b>. This can't be undone.</p>`,
    Extended: `<div class="error" id="apvError"></div>
      <label><span>Extend until <span class="req">*</span></span><input type="date" name="until" min="${minDate}" value="${ymd(addDays(new Date(), 30))}"></label>
      <label class="full"><span>Revised scope <span class="req">*</span></span><textarea name="comment" rows="3" maxlength="800" placeholder="What will the extension prove that the POC hasn't yet?"></textarea></label>
      <p class="sub full">The POC goes back to <b>POC Development</b> and its plan is re-dated from today.</p>`,
  }[kind];
  openDialog(`${dialogHead({ Converted: 'Convert to project?', Closed: 'Close this POC?', Extended: 'Extend this POC?' }[kind], esc(a.name))}${decisionSummary(a)}${recBox}
    <form id="apvForm" class="dlg-form" data-kind="${kind}" data-id="${a.id}" novalidate>${body}
      ${dlgActions({ Converted: 'Convert to project', Closed: 'Close POC', Extended: 'Extend POC' }[kind], kind === 'Closed' ? 'btn-danger-solid' : kind === 'Converted' ? 'btn-success' : 'btn-primary')}</form>`);
}

function openRecommend(a) {
  openDialog(`${dialogHead('Recommend a Go / No-Go decision', `${esc(a.name)} · Higher Management decides after your recommendation`)}${decisionSummary(a)}
    <form id="apvForm" class="dlg-form" data-kind="recommend" data-id="${a.id}" novalidate>
      <div class="error" id="apvError"></div>
      <div class="full rec-choice">${['Convert', 'Extend', 'Close'].map((v, i) => `<label class="fb-type" style="--k:${['#16a34a', '#0ea5e9', '#64748b'][i]}"><input type="radio" name="verdict" value="${v}"><span>${v}</span></label>`).join('')}</div>
      <label class="full"><span>Why? <span class="req">*</span></span><textarea name="comment" rows="3" maxlength="800" placeholder="Summarise the evidence behind your recommendation"></textarea></label>
      ${dlgActions('Send recommendation')}</form>`);
}

function withdrawRequest(id) {
  const a = find(id);
  if (!canWithdraw(a) || !confirm('Withdraw this approval request? Documents become editable again and you can resubmit later.')) return;
  recordDecision(a, 'withdrawn');
  a.pending = null;
  log(a, 'Withdrew the approval request');
  commit('Request withdrawn');
}

// Re-date the plan after an extension: Development runs until the new date, later stages follow on.
function replanFrom(a, until) {
  a.plan = a.plan || {};
  a.plan[6] = { start: ymd(new Date()), end: until };
  let start = parseYmd(until);
  for (let id = 7; id <= 10; id++) { const e = addDays(start, STAGES[id - 1].targetDays); a.plan[id] = { start: ymd(start), end: ymd(e) }; start = e; }
}

function applyDecision(form) {
  const a = find(form.dataset.id), kind = form.dataset.kind, f = form.elements;
  if (!a || !canApprove(a)) return;
  const err = m => { const el = document.getElementById('apvError'); if (el) { el.textContent = m; el.style.display = 'block'; } };
  const comment = (f.comment ? f.comment.value : '').trim();
  const from = stageOf(a).name;
  if (kind === 'approve') {
    recordDecision(a, 'approved', { comment });
    moveToStage(a, a.stage + 1);
    log(a, `Approved: ${from} → ${stageOf(a).name}${comment ? ` (${comment})` : ''}`);
    dialogEl().close(); return commit(`${a.name} moved to “${stageOf(a).name}”`);
  }
  if (kind === 'return') {
    if (comment.length < 10) return err('Explain what needs to change (at least 10 characters) so the team can fix it.');
    recordDecision(a, 'returned', { comment });
    a.pending = null;
    log(a, `Returned for rework at ${from}: ${comment}`);
    dialogEl().close(); return commit(`${a.name} returned for rework`);
  }
  if (kind === 'recommend') {
    const verdict = (form.querySelector('input[name=verdict]:checked') || {}).value;
    if (!verdict) return err('Choose Convert, Extend or Close.');
    if (comment.length < 10) return err('Add a short reason for your recommendation.');
    a.pending.recommendation = { by: user.id, at: new Date().toISOString(), verdict, note: comment };
    recordDecision(a, 'recommended', { comment, verdict });
    log(a, `Recommended “${verdict}” for the Go / No-Go decision: ${comment}`);
    dialogEl().close(); return commit('Recommendation sent to Higher Management');
  }
  if (kind === 'Closed') {
    const reason = f.reason.value;
    if (!reason) return err('Choose a reason for closing the POC.');
    if (comment.length < 10) return err('Add a short explanation (at least 10 characters).');
    recordDecision(a, 'closed', { comment, reason });
    a.outcome = 'Closed'; a.pending = null;
    log(a, `Decision: POC closed. Reason: ${reason}. ${comment}`);
    dialogEl().close(); return commit(`${a.name}: Closed`);
  }
  if (kind === 'Extended') {
    const until = f.until.value;
    if (!until || until <= ymd(new Date())) return err('Choose an end date after today.');
    if (comment.length < 10) return err('Describe the revised scope (at least 10 characters).');
    recordDecision(a, 'extended', { comment, until });
    moveToStage(a, 6); a.status = 'On Track';
    a.extension = { until, scope: comment, at: new Date().toISOString(), by: user.id };
    replanFrom(a, until);
    log(a, `Decision: POC extended until ${fmtDay(parseYmd(until))}, back to POC Development. Scope: ${comment}`);
    dialogEl().close(); return commit(`${a.name}: Extended`);
  }
  if (kind === 'Converted') {
    recordDecision(a, 'converted', { comment });
    a.outcome = 'Converted'; a.pending = null;
    log(a, `Decision: POC converted${comment ? `. Next steps: ${comment}` : ''}`);
    dialogEl().close(); return commit(`${a.name}: Converted`);
  }
}

// ---------- Approvals page ----------
function stageMoveLabel(r) {
  const s = STAGES[r.stage - 1];
  if (!s) return '';
  if (['converted', 'extended', 'closed', 'recommended'].includes(r.decision)) return `${s.id}. ${s.name}`;
  return r.stage < 10 ? `${s.id}. ${s.name} → ${STAGES[r.stage].name}` : `${s.id}. ${s.name}`;
}

function approvalCard(a) {
  const r = approvalRoute(a), s = stageOf(a), w = waitDays(a), rules = approvalRules();
  const next = a.stage < 10 ? STAGES[a.stage].name : (r.step === 'recommend' ? 'Your recommendation' : 'Final decision');
  const upd = a.updates[0];
  const acting = actingAs(a, r);
  const docs = s.deliverables.map((d, i) => { const m = (a.evidenceBy || [])[i];
    return a.evidence[i]
      ? `<li><span class="ok">✔</span><span>${esc(d)}<small>📄 ${esc(a.evidence[i])}${m ? ` · ${esc(firstName(m.by))}, ${fmtDay(new Date(m.at))}` : ''}</small></span></li>`
      : `<li><span class="missing">✖</span>${esc(d)} <span class="badge b-delayed">missing</span></li>`; }).join('');
  const rec = a.pending.recommendation;
  return `<div class="card approval ${w >= rules.remindDays ? 'late' : ''}">
    <div class="apv-top"><h3><a href="${accountLink(a)}">${esc(a.name)}</a></h3><span class="badge ${statusClass(a.status)}">${a.status}</span></div>
    <div class="meta">${esc(a.useCase)}</div>
    <div class="apv-chips">
      <span class="apv-wait ${w >= rules.escalateDays ? 'bad' : w >= rules.remindDays ? 'warn' : ''}">${icon('clock')} ${w ? `Waiting ${w} day${w === 1 ? '' : 's'}` : 'Requested today'}</span>
      <span class="apv-chip">Requested by ${esc(nameOf(a.pending.by))}</span>
      ${acting ? `<span class="apv-chip accent">${esc(acting)}</span>` : ''}
      ${r.step === 'recommend' ? '<span class="apv-chip accent">Recommendation step</span>' : ''}
    </div>
    ${r.note ? `<div class="sub apv-note">${esc(r.note)}</div>` : ''}
    <div class="move"><span>${s.id}. ${esc(s.name)}</span><span class="arrow">→</span><span>${esc(next)}</span></div>
    <div class="apv-context">
      <div><span>Progress</span><b><span class="progress"><i style="width:${a.progress}%"></i></span>${a.progress}%</b></div>
      <div><span>Time in stage</span><b class="${isOverdue(a) ? 'overdue' : ''}">${daysIn(a)} / ${s.targetDays} days</b></div>
      <div class="full"><span>Latest update${upd ? ` · ${esc(firstName(upd.by))}, ${fmtDay(new Date(upd.at))}` : ''}</span><b class="apv-upd">${upd ? esc(upd.note) : '<span class="sub">No updates yet</span>'}</b>
        ${upd && upd.blockers ? `<div class="blocker">⚠ ${esc(upd.blockers)}</div>` : ''}</div>
    </div>
    ${rec ? `<div class="rec-box">${icon('sparkles')} <b>${esc(nameOf(rec.by))} recommends ${esc(rec.verdict)}</b><br>${esc(rec.note)}</div>` : ''}
    <h4>Documents</h4><ul class="checklist">${docs}</ul>
    <div class="actions">${decisionButtons(a)}</div>
  </div>`;
}

function requestCard(a) {
  const r = approvalRoute(a), w = waitDays(a), rules = approvalRules();
  return `<div class="card approval mine ${w >= rules.remindDays ? 'late' : ''}">
    <div class="apv-top"><h3><a href="${accountLink(a)}">${esc(a.name)}</a></h3><span class="apv-wait ${w >= rules.escalateDays ? 'bad' : w >= rules.remindDays ? 'warn' : ''}">${icon('clock')} ${w ? `${w}d` : 'today'}</span></div>
    <div class="move"><span>${a.stage}. ${esc(stageOf(a).name)}</span><span class="arrow">→</span><span>${a.stage < 10 ? esc(STAGES[a.stage].name) : 'Go / No-Go decision'}</span></div>
    <div class="sub">Waiting for ${r.step === 'recommend' ? 'a recommendation from ' : ''}<b>${esc(r.people.map(nameOf).join(', '))}</b>${r.escalated ? ' · escalated' : ''}</div>
    ${r.note ? `<div class="sub apv-note">${esc(r.note)}</div>` : ''}
    <div class="actions"><button class="btn btn-sm" data-act="withdraw" data-id="${a.id}">Withdraw request</button></div></div>`;
}

function decisionRows(records) {
  if (!records.length) return '<div class="empty">No decisions yet.</div>';
  return `<div class="card apv-history"><table class="aud-table apv-table"><thead><tr><th>Date</th><th>Account</th><th>Stage</th><th>Decision</th><th>By</th><th>Comment</th></tr></thead><tbody>
    ${records.map(({ r, a }) => { const d = DECISIONS[r.decision] || { label: r.decision, cls: '' };
      const extra = [r.verdict && `Recommends ${r.verdict}`, r.reason, r.until && `Until ${fmtDay(parseYmd(r.until))}`].filter(Boolean).join(' · ');
      return `<tr><td data-label="Date" class="aud-time">${fmtDay(new Date(r.at))}</td>
        <td data-label="Account"><a href="${accountLink(a)}">${esc(a.name)}</a></td>
        <td data-label="Stage">${esc(stageMoveLabel(r))}</td>
        <td data-label="Decision"><span class="badge ${d.cls}">${d.label}</span></td>
        <td data-label="By">${esc(nameOf(r.by))}${r.requestedBy ? `<div class="sub">requested by ${esc(firstName(r.requestedBy))}</div>` : ''}</td>
        <td data-label="Comment">${extra ? `<b>${esc(extra)}</b><br>` : ''}${esc(r.comment || '') || '<span class="sub">—</span>'}</td></tr>`; }).join('')}
    </tbody></table></div>`;
}

function approvalsPage() {
  const tabs = [['waiting', 'Waiting for me'], ...(user.role === 'HM' ? [] : [['requests', 'My requests']]), ['mine', 'Decided by me'], ['all', 'All decisions']];
  if (!apvUI.tab) apvUI.tab = new URLSearchParams(location.search).get('tab') || 'waiting';
  if (!tabs.some(([k]) => k === apvUI.tab)) apvUI.tab = 'waiting';
  const waiting = myApprovals().sort((x, y) => x.pending.at.localeCompare(y.pending.at)); // oldest first
  const requests = accounts.filter(a => a.pending && !a.outcome && a.pending.by === user.id);
  const visible = accounts.filter(a => user.role === 'HM' || user.role === 'TL' || canView(a));
  const records = visible.flatMap(a => (a.approvals || []).map(r => ({ r, a }))).sort((x, y) => y.r.at.localeCompare(x.r.at));
  const counts = { waiting: waiting.length, requests: requests.length, mine: records.filter(x => x.r.by === user.id).length, all: records.length };
  const bar = `<div class="seg apv-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${apvUI.tab === k}" class="${apvUI.tab === k ? 'on' : ''}" data-apv-tab="${k}">${l}${counts[k] ? `<span class="n">${counts[k]}</span>` : ''}</button>`).join('')}</div>`;
  const rules = approvalRules();
  let body;
  if (apvUI.tab === 'waiting') body = waiting.length
    ? `<p class="sub apv-hint">Oldest first. Requests waiting ${rules.remindDays}+ days are highlighted; after ${rules.escalateDays} days the Team Lead is brought in.</p><div class="approvals">${waiting.map(approvalCard).join('')}</div>`
    : '<div class="empty">Nothing is waiting for your approval. 🎉</div>';
  else if (apvUI.tab === 'requests') body = requests.length ? `<div class="approvals">${requests.map(requestCard).join('')}</div>` : '<div class="empty">You have no open approval requests.</div>';
  else if (apvUI.tab === 'mine') body = decisionRows(records.filter(x => x.r.by === user.id));
  else body = decisionRows(records);
  return bar + body;
}

// ---------- Events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-apv-tab]');
  if (t) { apvUI.tab = t.dataset.apvTab; history.replaceState(null, '', `approvals.html?tab=${apvUI.tab}`); render(); }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'apvForm') { e.preventDefault(); applyDecision(e.target); }
});
