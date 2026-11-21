// PRISM — Feedback: everyone can share ideas, improvements and bugs and vote for others' ideas.
// The Team Lead sets the status of each item. Prototype: stored in this browser (shared once there's a backend).
// Loaded before app.js; app.js helpers are used at call time only.

const FB_KEY = 'prism_feedback_v1';
const FB_TYPES = { idea: { label: 'New idea', color: '#7c3aed' }, improvement: { label: 'Improvement', color: '#0ea5e9' }, bug: { label: 'Bug', color: '#e11d48' }, other: { label: 'Other', color: '#64748b' } };
const FB_STATUSES = { new: 'New', review: 'Under review', planned: 'Planned', done: 'Done', declined: 'Not planned' };
const FB_IMPACT = { nice: 'Nice to have', important: 'Important', critical: 'Critical' };
const FB_AREAS = ['General', 'Dashboard', 'Pipeline', 'Schedule', 'Approvals', 'Messages', 'Accounts', 'Reports', 'Notifications', 'Settings', 'Phone app'];
const fbUI = { type: 'all', status: 'open', sort: 'top' };

function seedFeedback() {
  const at = d => new Date(Date.now() - d * 86400000).toISOString();
  return { items: [
    { id: 'F1', by: 'u2', at: at(6), type: 'idea', area: 'Reports', impact: 'important', status: 'planned', votes: ['u2', 'u1', 'u3', 'u6'],
      title: 'Monthly report emailed to management automatically', details: 'Send the POC status report as a PDF to Higher Management on the first working day of every month.' },
    { id: 'F2', by: 'u4', at: at(4), type: 'improvement', area: 'Accounts', impact: 'nice', status: 'review', votes: ['u4', 'u5'],
      title: 'Upload several documents at once', details: 'Stage 4 needs two documents; it would be quicker to drop both files together.' },
    { id: 'F3', by: 'u5', at: at(2), type: 'bug', area: 'Schedule', impact: 'important', status: 'new', votes: ['u5'],
      title: 'Timeline labels overlap for long agency names', details: 'On a small laptop screen the account name runs into the bars on the timeline view.' },
    { id: 'F4', by: 'u3', at: at(1), type: 'idea', area: 'Pipeline', impact: 'nice', status: 'new', votes: ['u3', 'u2'],
      title: 'Drag a POC card to request the next stage', details: 'Dragging a card to the next column could open the approval request with the checklist.' },
  ] };
}
function loadFb() { try { const s = JSON.parse(localStorage.getItem(FB_KEY)); if (s) return s; } catch (e) { /* ignore */ } const s = seedFeedback(); saveFb(s); return s; }
function saveFb(s) { try { localStorage.setItem(FB_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }

function feedbackPage() {
  const s = loadFb();
  const open = i => !['done', 'declined'].includes(i.status);
  let items = s.items.filter(i => (fbUI.type === 'all' || i.type === fbUI.type) &&
    (fbUI.status === 'all' || (fbUI.status === 'open' ? open(i) : fbUI.status === 'mine' ? i.by === user.id : i.status === fbUI.status)));
  items = items.sort(fbUI.sort === 'top' ? (x, y) => y.votes.length - x.votes.length || y.at.localeCompare(x.at) : (x, y) => y.at.localeCompare(x.at));
  const opt = (v, l, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`;
  const counts = { open: s.items.filter(open).length, mine: s.items.filter(i => i.by === user.id).length };
  const isTL = user.role === 'TL';

  const form = `<div class="card fb-form-card">
    <div class="panel-head"><span class="panel-ic">${icon('bulb')}</span><div><h3 class="card-title">Share an idea</h3><p class="hint">What would make PRISM better for you?</p></div></div>
    <form id="fbForm" class="fb-form" novalidate>
      <div class="error" id="fbError"></div>
      <div class="fb-types" role="radiogroup" aria-label="Type">${Object.entries(FB_TYPES).map(([k, v], i) => `<label class="fb-type" style="--k:${v.color}">
        <input type="radio" name="type" value="${k}" ${i === 0 ? 'checked' : ''}><span>${v.label}</span></label>`).join('')}</div>
      <label><span>Title <span class="req">*</span></span><input name="title" maxlength="90" placeholder="A short summary of your idea"></label>
      <label><span>Details <span class="req">*</span></span><textarea name="details" rows="4" maxlength="1500" placeholder="What problem does it solve? How would it work?"></textarea></label>
      <div class="fb-row">
        <label><span>Part of PRISM</span><select name="area">${FB_AREAS.map(a => `<option>${a}</option>`).join('')}</select></label>
        <label><span>How important?</span><select name="impact">${Object.entries(FB_IMPACT).map(([k, v]) => opt(k, v, 'important')).join('')}</select></label>
      </div>
      <button type="submit" class="btn btn-primary">${icon('bulb')} Submit feedback</button>
      <p class="sub fb-note">Everyone on the team can see and vote on ideas. The Team Lead updates their status.</p>
    </form></div>`;

  const cards = items.map(i => {
    const t = FB_TYPES[i.type], voted = i.votes.includes(user.id), mine = i.by === user.id;
    const statusCtl = isTL
      ? `<select class="fb-status-select st-${i.status}" data-fb="status" data-id="${i.id}" aria-label="Status">${Object.entries(FB_STATUSES).map(([k, v]) => opt(k, v, i.status)).join('')}</select>`
      : `<span class="fb-status st-${i.status}">${FB_STATUSES[i.status]}</span>`;
    return `<article class="card fb-card">
      <button type="button" class="fb-vote ${voted ? 'on' : ''}" data-fb="vote" data-id="${i.id}" aria-pressed="${voted}" aria-label="${voted ? 'Remove your vote' : 'Vote for this'}">
        ${icon('up')}<b>${i.votes.length}</b></button>
      <div class="fb-body">
        <div class="fb-tags"><span class="fb-tag" style="--k:${t.color}">${t.label}</span><span class="fb-area">${esc(i.area)}</span>
          ${i.impact === 'critical' ? '<span class="badge b-delayed">Critical</span>' : i.impact === 'important' ? '<span class="badge b-atrisk">Important</span>' : ''}</div>
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.details)}</p>
        <div class="fb-foot"><span class="avatar mini role-${(userById(i.by) || {}).role}" data-u="${i.by}">${esc(initials(nameOf(i.by)))}</span>
          <span class="sub">${mine ? 'You' : esc(nameOf(i.by))} · ${relTime(i.at)}</span><span style="flex:1"></span>
          ${mine && i.status === 'new' ? `<button type="button" class="link-btn" data-fb="delete" data-id="${i.id}">Delete</button>` : ''}
          ${statusCtl}</div>
      </div></article>`;
  }).join('');

  const board = `<div class="fb-board">
    <div class="fb-bar">
      <div class="n-chips">${[['open', 'Open', counts.open], ['all', 'All', s.items.length], ['done', 'Done'], ['mine', 'Mine', counts.mine]].map(([k, l, n]) =>
        `<button type="button" class="chip-btn ${fbUI.status === k ? 'on' : ''}" data-fb="filter" data-f="${k}">${l}${n ? `<span>${n}</span>` : ''}</button>`).join('')}</div>
      <select data-fb-sel="type" aria-label="Type">${opt('all', 'All types', fbUI.type)}${Object.entries(FB_TYPES).map(([k, v]) => opt(k, v.label, fbUI.type)).join('')}</select>
      <select data-fb-sel="sort" aria-label="Sort">${opt('top', 'Most votes', fbUI.sort)}${opt('new', 'Newest', fbUI.sort)}</select>
      ${isTL ? `<button type="button" class="btn btn-sm" data-fb="csv">${icon('download')} Export</button>` : ''}
    </div>
    ${cards || `<div class="empty">${fbUI.status === 'mine' ? "You haven't shared any feedback yet. Use the form to send your first idea." : 'No feedback here yet.'}</div>`}
  </div>`;
  return `<div class="fb-layout">${form}${board}</div>`;
}

function submitFeedback(form) {
  const f = form.elements;
  const v = { type: (form.querySelector('input[name=type]:checked') || {}).value || 'idea', title: f.title.value.trim(), details: f.details.value.trim(), area: f.area.value, impact: f.impact.value };
  const err = m => { const el = document.getElementById('fbError'); el.textContent = m; el.style.display = 'block'; };
  if (v.title.length < 5) return err('Give your feedback a short title (at least 5 characters).');
  if (v.details.length < 10) return err('Add a few details so the team understands the idea.');
  const s = loadFb();
  s.items.unshift({ id: 'F' + Date.now().toString(36), by: user.id, at: new Date().toISOString(), status: 'new', votes: [user.id], ...v });
  saveFb(s);
  fbUI.status = 'mine';
  toast('Thanks! Your feedback has been shared with the team');
  render();
}

function exportFeedbackCsv() {
  const rows = [['Date', 'Type', 'Area', 'Title', 'Details', 'Importance', 'Status', 'Votes', 'From'],
    ...loadFb().items.map(i => [ymd(new Date(i.at)), FB_TYPES[i.type].label, i.area, i.title, i.details, FB_IMPACT[i.impact], FB_STATUSES[i.status], i.votes.length, nameOf(i.by)])];
  downloadBlob(`PRISM-feedback-${todayStamp()}.csv`, 'text/csv;charset=utf-8', toCsv(rows));
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-fb]');
  if (!b || b.tagName === 'SELECT') return;
  const act = b.dataset.fb, s = loadFb(), item = s.items.find(i => i.id === b.dataset.id);
  if (act === 'vote' && item) {
    item.votes = item.votes.includes(user.id) ? item.votes.filter(id => id !== user.id) : [...item.votes, user.id];
    saveFb(s); render();
  } else if (act === 'delete' && item && item.by === user.id && item.status === 'new') {
    if (!confirm('Delete this feedback?')) return;
    s.items = s.items.filter(i => i !== item); saveFb(s); toast('Feedback deleted'); render();
  } else if (act === 'filter') { fbUI.status = b.dataset.f; render(); }
  else if (act === 'csv') exportFeedbackCsv();
});
document.addEventListener('change', e => {
  if (isEl(e.target, '[data-fb-sel]')) { fbUI[e.target.dataset.fbSel] = e.target.value; render(); return; }
  if (isEl(e.target, '[data-fb="status"]') && user.role === 'TL') {
    const s = loadFb(), item = s.items.find(i => i.id === e.target.dataset.id);
    if (!item) return;
    item.status = e.target.value; saveFb(s);
    toast(`Status set to “${FB_STATUSES[item.status]}”`); render();
  }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'fbForm') { e.preventDefault(); submitFeedback(e.target); }
});
