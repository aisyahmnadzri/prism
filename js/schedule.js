// PRISM — Schedule: calendar of events + stage timeline (Gantt).
// Only the AI Team Lead adds/edits events and stage plans; everyone else views the accounts they can see.
// Loaded before app.js; everything here runs at call time, so app.js helpers (esc, icon, render, …) are available.

const EVENT_TYPES = {
  'Meeting': '#6366f1', 'Workshop': '#0ea5e9', 'Client demo': '#f59e0b',
  'Site visit': '#10b981', 'Internal review': '#a855f7', 'Other': '#64748b',
};
const TIMELINE_DAYS = 120;
const sch = { view: 'calendar', month: null, from: null, acc: 'all' };
const canPlan = () => user.role === 'TL';
const DAY_MS = 86400000;
const fmtDay = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fmtLong = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS);

function schAccounts() {
  const list = visibleAccounts();
  return sch.acc === 'all' ? list : list.filter(a => a.id === sch.acc);
}
function allEvents(list) {
  return list.flatMap(a => (a.events || []).map(e => ({ ...e, a })))
    .sort((x, y) => (x.date + (x.start || '')).localeCompare(y.date + (y.start || '')));
}
// Target date of the current stage (same rule as "overdue" elsewhere: stage start + target days)
const stageDue = a => startOfDay(addDays(new Date(a.stageSince), stageOf(a).targetDays));

// ---------- Page ----------
function schedulePage() {
  const today = startOfDay(new Date());
  if (!sch.month) sch.month = new Date(today.getFullYear(), today.getMonth(), 1);
  if (!sch.from) sch.from = addDays(today, -30);
  const visible = visibleAccounts();
  if (sch.acc !== 'all' && !visible.some(a => a.id === sch.acc)) sch.acc = 'all';
  const label = sch.view === 'calendar'
    ? sch.month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : `${fmtDay(sch.from)} – ${fmtDay(addDays(sch.from, TIMELINE_DAYS))} ${addDays(sch.from, TIMELINE_DAYS).getFullYear()}`;
  const bar = `<div class="sch-bar">
    <div class="seg" role="group" aria-label="View">${[['calendar', 'Calendar', 'calendar'], ['timeline', 'Timeline', 'kanban']]
      .map(([k, l, ic]) => `<button type="button" data-sch="view" data-v="${k}" class="${sch.view === k ? 'on' : ''}">${icon(ic)} ${l}</button>`).join('')}</div>
    <div class="sch-nav">
      <button type="button" class="nav-arrow" data-sch="prev" aria-label="Previous">‹</button>
      <b>${label}</b>
      <button type="button" class="nav-arrow" data-sch="next" aria-label="Next">›</button>
      <button type="button" class="btn btn-sm" data-sch="today">Today</button>
    </div>
    <select data-sch-filter aria-label="Account"><option value="all">All accounts</option>
      ${visible.map(a => `<option value="${a.id}" ${sch.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
    ${canPlan() ? `<button type="button" class="btn btn-primary sch-add" data-sch="add">${icon('plus')} Add event</button>` : ''}
  </div>`;
  return bar + (sch.view === 'calendar' ? calendarView() : timelineView());
}

// ---------- Calendar ----------
function calendarView() {
  const list = schAccounts();
  const events = allEvents(list);
  const m = sch.month;
  const gridStart = addDays(m, -((m.getDay() + 6) % 7)); // weeks start on Monday
  const todayKey = ymd(new Date());
  const dues = list.filter(a => !a.outcome).map(a => ({ a, key: ymd(stageDue(a)) }));
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i), key = ymd(d);
    if (i === 35 && d.getMonth() !== m.getMonth()) break; // drop a 6th row that is entirely next month
    const items = [
      ...dues.filter(x => x.key === key).map(x => `<button type="button" class="cal-item due ${key < todayKey ? 'past' : ''}" data-sch="open-acc" data-id="${x.a.id}"
          title="${esc(x.a.name)} — Stage ${x.a.stage} (${esc(stageOf(x.a).name)}) target date">◆ ${esc(short(x.a.name, 16))} · S${x.a.stage}</button>`),
      ...events.filter(e => e.date === key).map(e => `<button type="button" class="cal-item" style="--t:${EVENT_TYPES[e.type] || EVENT_TYPES.Other}" data-sch="event" data-id="${e.a.id}" data-ev="${e.id}"
          title="${esc(e.title)} · ${esc(e.a.name)}">${e.start ? `<span class="t">${e.start}</span>` : ''}${esc(e.title)}</button>`),
    ];
    const more = items.length > 3 ? `<button type="button" class="cal-more" data-sch="day" data-date="${key}">+${items.length - 3} more</button>` : '';
    cells += `<div class="cal-cell ${d.getMonth() !== m.getMonth() ? 'out' : ''} ${key === todayKey ? 'today' : ''}">
      <div class="cal-day"><button type="button" class="cal-num" data-sch="day" data-date="${key}" aria-label="${fmtLong(d)}">${d.getDate()}</button>
        ${canPlan() ? `<button type="button" class="cal-add" data-sch="add" data-date="${key}" title="Add event on ${fmtLong(d)}" aria-label="Add event">+</button>` : ''}</div>
      ${items.slice(0, 3).join('')}${more}</div>`;
  }
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div class="cal-dow">${x}</div>`).join('');
  const key = legend([...Object.entries(EVENT_TYPES).map(([t, c]) => [c, t]), ['var(--red)', '◆ Stage target date']]);
  return `<div class="sch-grid">
    <div class="card cal-card"><div class="cal-scroll"><div class="cal">${dow}${cells}</div></div>${key}</div>
    ${agendaPanel(events, list)}</div>`;
}

function agendaItem(x) {
  if (x.kind === 'due') {
    return `<button type="button" class="ag-item" data-sch="open-acc" data-id="${x.a.id}">
      <i class="ag-dot due"></i><span class="ag-time">Target</span>
      <span><b>${esc(x.a.name)}</b><small>Stage ${x.a.stage} · ${esc(stageOf(x.a).name)} due</small></span></button>`;
  }
  const e = x.e;
  return `<button type="button" class="ag-item" data-sch="event" data-id="${e.a.id}" data-ev="${e.id}">
    <i class="ag-dot" style="background:${EVENT_TYPES[e.type] || EVENT_TYPES.Other}"></i><span class="ag-time">${e.start || 'All day'}</span>
    <span><b>${esc(e.title)}</b><small>${esc(e.type)} · ${esc(e.a.name)}${e.location ? ` · ${esc(e.location)}` : ''}</small></span></button>`;
}

function agendaPanel(events, list) {
  const today = startOfDay(new Date()), end = addDays(today, 14);
  const items = [
    ...events.filter(e => { const d = parseYmd(e.date); return d >= today && d <= end; }).map(e => ({ key: e.date, t: e.start || '00:00', kind: 'event', e })),
    ...list.filter(a => !a.outcome).filter(a => { const d = stageDue(a); return d >= today && d <= end; })
      .map(a => ({ key: ymd(stageDue(a)), t: '23:59', kind: 'due', a })),
  ].sort((x, y) => (x.key + x.t).localeCompare(y.key + y.t));
  const groups = {};
  items.forEach(x => (groups[x.key] = groups[x.key] || []).push(x));
  const body = Object.keys(groups).length ? Object.entries(groups).map(([k, xs]) => {
    const d = parseYmd(k), diff = dayDiff(d, today);
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' });
    return `<div class="ag-group"><div class="ag-date"><b>${label}</b><span>${fmtDay(d)}</span></div>${xs.map(agendaItem).join('')}</div>`;
  }).join('') : '<p class="sub">Nothing scheduled in the next 14 days.</p>';
  return `<div class="card panel agenda"><div class="panel-head"><span class="panel-ic">${icon('clock')}</span>
    <div><h3 class="card-title">Upcoming</h3><p class="hint">Next 14 days</p></div></div>${body}</div>`;
}

// ---------- Timeline (Gantt) ----------
function timelineView() {
  const list = schAccounts().filter(a => !a.outcome);
  const from = startOfDay(sch.from), to = addDays(from, TIMELINE_DAYS), now = startOfDay(new Date());
  const pct = d => (dayDiff(d, from) / TIMELINE_DAYS) * 100;
  const clamp = v => Math.max(0, Math.min(100, v));

  let months = '';
  for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d < to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const l = clamp(pct(d)), r = clamp(pct(new Date(d.getFullYear(), d.getMonth() + 1, 1)));
    if (r - l > 2) months += `<span class="gm" style="left:${l}%;width:${r - l}%">${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>`;
  }
  let weeks = '';
  for (let w = addDays(from, (8 - from.getDay()) % 7); w < to; w = addDays(w, 7)) weeks += `<i class="gw" style="left:${pct(w)}%"></i>`;
  const todayIn = now >= from && now <= to;
  const todayLine = todayIn ? `<i class="gtoday" style="left:${pct(now)}%"></i>` : '';

  const rows = list.map(a => {
    const plan = a.plan || {};
    const segs = STAGES.map(s => {
      const p = plan[s.id];
      if (!p) return '';
      const st = parseYmd(p.start), en = parseYmd(p.end);
      if (en <= from || st >= to) return '';
      const l = clamp(pct(st)), r = clamp(pct(en));
      const ph = PHASES.find(x => x.stages.includes(s.id));
      const state = s.id < a.stage ? 'past' : s.id === a.stage ? 'cur' : '';
      return `<div class="gseg ${state}" style="left:${l}%;width:${r - l}%;--c:${ph.color}" title="Stage ${s.id} · ${esc(s.name)} — planned ${fmtDay(st)} to ${fmtDay(en)}">${r - l > 3.2 ? `S${s.id}` : ''}</div>`;
    }).join('');
    const cp = plan[a.stage];
    const actualStart = startOfDay(new Date(a.stageSince));
    const behind = cp ? Math.max(0, dayDiff(now, parseYmd(cp.end))) : 0;
    const late = cp ? dayDiff(actualStart, parseYmd(cp.start)) : 0;
    const status = !cp ? '<span class="badge b-onhold">Not planned</span>'
      : behind > 0 ? `<span class="badge b-delayed">Behind plan ${behind}d</span>`
      : late > 0 ? `<span class="badge b-atrisk">Started ${late}d late</span>`
      : '<span class="badge b-ontrack">On plan</span>';
    const al = clamp(pct(actualStart)), ar = clamp(pct(now));
    const actual = ar > al || (al > 0 && al < 100)
      ? `<div class="gact ${behind > 0 ? 'bad' : ''}" style="left:${al}%;width:${Math.max(ar - al, 0.8)}%" title="Actual: in Stage ${a.stage} since ${fmtDay(actualStart)}"></div>` : '';
    const evs = (a.events || []).filter(e => { const d = parseYmd(e.date); return d >= from && d <= to; })
      .map(e => `<button type="button" class="gev" style="left:${pct(parseYmd(e.date))}%;background:${EVENT_TYPES[e.type] || EVENT_TYPES.Other}"
        data-sch="event" data-id="${a.id}" data-ev="${e.id}" title="${esc(e.title)} · ${fmtDay(parseYmd(e.date))}" aria-label="${esc(e.title)}"></button>`).join('');
    return `<div class="grow">
      <div class="glabel"><a href="${accountLink(a)}">${esc(a.name)}</a><small>S${a.stage} · ${esc(stageOf(a).name)}</small></div>
      <div class="gtrack">${weeks}${todayLine}${segs}${actual}${evs}</div>
      <div class="gstat">${status}${canPlan() ? `<button type="button" class="link-plain" data-sch="plan" data-id="${a.id}">Edit plan</button>` : ''}</div>
    </div>`;
  }).join('');

  const head = `<div class="grow ghead"><div class="glabel"><small>Account</small></div>
    <div class="gtrack">${months}${todayIn ? `<span class="gtoday-label" style="left:${pct(now)}%">Today</span>` : ''}</div><div class="gstat"><small>Against plan</small></div></div>`;
  const key = legend([
    ...PHASES.map(p => [p.color, `${p.name} (planned)`]),
    ['var(--green)', 'Actual time in current stage'], ['var(--red)', 'Actual, past planned end'],
    ['var(--accent); border-radius:50%', 'Event'],
  ]);
  return `<div class="card gantt-card"><div class="gantt-scroll"><div class="gantt">${head}${rows || '<p class="sub" style="padding:16px">No active accounts.</p>'}</div></div>${key}</div>`;
}

// ---------- Account page card ----------
function accountSchedulePanel(a) {
  const today = startOfDay(new Date());
  const up = (a.events || []).filter(e => parseYmd(e.date) >= today).sort((x, y) => (x.date + (x.start || '')).localeCompare(y.date + (y.start || ''))).slice(0, 4);
  const cp = a.plan && a.plan[a.stage];
  const planLine = a.outcome ? '' : cp
    ? `<div class="plan-line">${icon('calendar')}<span>Stage ${a.stage} planned <b>${fmtDay(parseYmd(cp.start))} – ${fmtDay(parseYmd(cp.end))}</b></span></div>`
    : '<div class="plan-line"><span class="sub">No stage plan yet.</span></div>';
  const items = up.map(e => agendaItem({ kind: 'event', e: { ...e, a } })).join('') || '<p class="sub">No upcoming events.</p>';
  return `<div class="card"><h3 class="card-title">Schedule</h3>${planLine}<div class="acc-sched">${items}</div>
    <div class="actions" style="margin-top:12px"><a class="btn btn-sm" href="schedule.html">${icon('calendar')} Open schedule</a>
      ${canPlan() && !a.outcome ? `<button type="button" class="btn btn-sm" data-sch="add" data-acc="${a.id}">${icon('plus')} Add event</button>
      <button type="button" class="btn btn-sm" data-sch="plan" data-id="${a.id}">Edit plan</button>` : ''}</div></div>`;
}

// ---------- Dialogs ----------
function dialogEl() {
  let d = document.getElementById('schDialog');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'schDialog';
    d.className = 'sch-dialog';
    document.body.appendChild(d);
    d.addEventListener('click', e => { if (e.target === d) d.close(); }); // click on backdrop closes
  }
  return d;
}
function openDialog(html) { const d = dialogEl(); d.innerHTML = html; if (!d.open) d.showModal(); return d; }
const dialogHead = (title, sub) => `<div class="dlg-head"><div><h3>${title}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
  <button type="button" class="dlg-x" data-sch="close" aria-label="Close">×</button></div>`;
const findEvent = (accId, evId) => { const a = find(accId); return a ? { a, e: (a.events || []).find(x => x.id === evId) } : {}; };

function eventDialog({ accId, evId, date } = {}) {
  const { a: evAcc, e } = evId ? findEvent(accId, evId) : {};
  if (evId && !e) return;
  if (!canPlan() && !e) return; // only the Team Lead can add events
  if (!canPlan()) { // read-only details
    const d = parseYmd(e.date);
    return openDialog(`${dialogHead(esc(e.title), `<span class="type-pill" style="--t:${EVENT_TYPES[e.type] || EVENT_TYPES.Other}">${esc(e.type)}</span>`)}
      <dl class="dlg-facts">
        <div><dt>Account</dt><dd><a href="${accountLink(evAcc)}">${esc(evAcc.name)}</a></dd></div>
        <div><dt>When</dt><dd>${fmtLong(d)}${e.start ? ` · ${e.start}${e.end ? `–${e.end}` : ''}` : ' · All day'}</dd></div>
        ${e.location ? `<div><dt>Where</dt><dd>${esc(e.location)}</dd></div>` : ''}
        ${e.notes ? `<div><dt>Notes</dt><dd>${esc(e.notes)}</dd></div>` : ''}
        <div><dt>Scheduled by</dt><dd>${esc(nameOf(e.by))}</dd></div>
      </dl>
      <div class="actions dlg-actions"><button type="button" class="btn" data-sch="close">Close</button></div>`);
  }
  const v = e || { title: '', type: 'Meeting', date: date || ymd(new Date()), start: '', end: '', location: '', notes: '' };
  const accChoice = evAcc ? evAcc.id : (accId || (sch.acc !== 'all' ? sch.acc : ''));
  const opts = visibleAccounts().filter(x => !x.outcome || x.id === accChoice)
    .map(x => `<option value="${x.id}" ${x.id === accChoice ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  openDialog(`${dialogHead(e ? 'Edit event' : 'Add event', e ? esc(evAcc.name) : 'Schedule a meeting, workshop, demo or visit')}
    <form id="eventForm" class="dlg-form" data-acc="${evAcc ? evAcc.id : ''}" data-ev="${e ? e.id : ''}" novalidate>
      <div class="error" id="evError"></div>
      <label class="full"><span>Title <span class="req">*</span></span><input name="title" value="${esc(v.title)}" maxlength="120" placeholder="Weekly check-in with agency IT"></label>
      <label><span>Account <span class="req">*</span></span><select name="acc"><option value="">Select…</option>${opts}</select></label>
      <label><span>Type</span><select name="type">${Object.keys(EVENT_TYPES).map(t => `<option ${t === v.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label><span>Date <span class="req">*</span></span><input type="date" name="date" value="${v.date}"></label>
      <div class="time-row"><label><span>Start</span><input type="time" name="start" value="${v.start || ''}"></label>
        <label><span>End</span><input type="time" name="end" value="${v.end || ''}"></label></div>
      <label class="full"><span>Location <span class="sub">(optional)</span></span><input name="location" value="${esc(v.location || '')}" maxlength="120" placeholder="Agency HQ, meeting room or Online"></label>
      <label class="full"><span>Notes <span class="sub">(optional)</span></span><textarea name="notes" rows="2" placeholder="Agenda, attendees, preparation">${esc(v.notes || '')}</textarea></label>
      <div class="actions dlg-actions full">
        ${e ? `<button type="button" class="btn btn-danger" data-sch="delete" data-id="${evAcc.id}" data-ev="${e.id}">Delete</button>` : ''}
        <span style="flex:1"></span>
        <button type="button" class="btn" data-sch="close">Cancel</button>
        <button type="submit" class="btn btn-primary">${e ? 'Save changes' : 'Add event'}</button>
      </div>
    </form>`);
}

function saveEvent(form) {
  if (!canPlan()) return;
  const f = form.elements;
  const err = msg => { const el = document.getElementById('evError'); el.textContent = msg; el.style.display = 'block'; };
  const v = { title: f.title.value.trim(), type: f.type.value, date: f.date.value, start: f.start.value, end: f.end.value, location: f.location.value.trim(), notes: f.notes.value.trim() };
  const target = find(f.acc.value);
  if (!v.title) return err('Enter a title for the event.');
  if (!target) return err('Choose which account this event is for.');
  if (!v.date) return err('Choose a date.');
  if (v.start && v.end && v.end <= v.start) return err('The end time must be after the start time.');
  const { a: oldAcc, e } = form.dataset.ev ? findEvent(form.dataset.acc, form.dataset.ev) : {};
  if (e) {
    Object.assign(e, v);
    if (oldAcc !== target) { oldAcc.events = oldAcc.events.filter(x => x !== e); target.events.push(e); }
    log(target, `Updated event “${v.title}” (${fmtDay(parseYmd(v.date))})`);
  } else {
    target.events.push({ id: 'EV-' + Date.now().toString(36), ...v, by: user.id });
    log(target, `Scheduled ${v.type.toLowerCase()} “${v.title}” on ${fmtDay(parseYmd(v.date))}`);
  }
  saveAccounts(accounts);
  dialogEl().close();
  toast(e ? 'Event updated' : 'Event added');
  render();
}

function deleteEvent(accId, evId) {
  if (!canPlan()) return;
  const { a, e } = findEvent(accId, evId);
  if (!e || !confirm(`Delete “${e.title}”? This can't be undone.`)) return;
  a.events = a.events.filter(x => x !== e);
  log(a, `Removed event “${e.title}”`);
  saveAccounts(accounts);
  dialogEl().close();
  toast('Event deleted');
  render();
}

function dayDialog(key) {
  const d = parseYmd(key);
  const list = schAccounts();
  const items = [
    ...list.filter(a => !a.outcome && ymd(stageDue(a)) === key).map(a => agendaItem({ kind: 'due', a })),
    ...allEvents(list).filter(e => e.date === key).map(e => agendaItem({ kind: 'event', e })),
  ];
  openDialog(`${dialogHead(fmtLong(d), `${items.length} item${items.length === 1 ? '' : 's'}`)}
    <div class="acc-sched">${items.join('') || '<p class="sub">Nothing scheduled.</p>'}</div>
    <div class="actions dlg-actions"><span style="flex:1"></span>
      ${canPlan() ? `<button type="button" class="btn btn-primary" data-sch="add" data-date="${key}">${icon('plus')} Add event</button>` : ''}
      <button type="button" class="btn" data-sch="close">Close</button></div>`);
}

function planDialog(accId) {
  const a = find(accId);
  if (!a || !canPlan()) return;
  const plan = a.plan || {};
  const rows = STAGES.map(s => `<tr class="${s.id === a.stage ? 'cur' : s.id < a.stage ? 'past' : ''}">
      <td><span class="pl-num">${s.id}</span>${esc(s.name)}${s.id === a.stage ? ' <span class="badge b-pending">Current</span>' : ''}</td>
      <td><input type="date" name="s${s.id}" value="${plan[s.id] ? plan[s.id].start : ''}" aria-label="Stage ${s.id} start"></td>
      <td><input type="date" name="e${s.id}" value="${plan[s.id] ? plan[s.id].end : ''}" aria-label="Stage ${s.id} end"></td>
      <td class="sub">${s.targetDays}d</td></tr>`).join('');
  openDialog(`${dialogHead('Stage plan', `${esc(a.name)} · currently Stage ${a.stage}`)}
    <form id="planForm" data-id="${a.id}" novalidate>
      <div class="error" id="plError"></div>
      <div class="plan-scroll"><table class="plan-table"><thead><tr><th>Stage</th><th>Planned start</th><th>Planned end</th><th>Target</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="actions dlg-actions">
        <button type="button" class="btn" data-sch="autofill" data-id="${a.id}" title="Chain every stage from the current stage's start using target days">${icon('refresh')} Auto-fill from current stage</button>
        <span style="flex:1"></span>
        <button type="button" class="btn" data-sch="close">Cancel</button>
        <button type="submit" class="btn btn-primary">Save plan</button>
      </div>
    </form>`);
}

function autofillPlan(accId) {
  const a = find(accId), form = document.getElementById('planForm');
  if (!a || !form) return;
  const plan = autoPlan(a.stage, new Date(a.stageSince));
  STAGES.forEach(s => { form.elements['s' + s.id].value = plan[s.id].start; form.elements['e' + s.id].value = plan[s.id].end; });
}

function savePlan(form) {
  const a = find(form.dataset.id);
  if (!a || !canPlan()) return;
  const err = msg => { const el = document.getElementById('plError'); el.textContent = msg; el.style.display = 'block'; };
  const plan = {};
  for (const s of STAGES) {
    const st = form.elements['s' + s.id].value, en = form.elements['e' + s.id].value;
    if (!st && !en) continue;
    if (!st || !en) return err(`Stage ${s.id}: enter both a start and an end date, or leave both empty.`);
    if (en < st) return err(`Stage ${s.id}: the end date must be on or after the start date.`);
    plan[s.id] = { start: st, end: en };
  }
  a.plan = Object.keys(plan).length ? plan : null;
  log(a, 'Updated the stage plan');
  saveAccounts(accounts);
  dialogEl().close();
  toast('Plan saved');
  render();
}

// ---------- Events (delegated, registered once) ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sch]');
  if (!b) return;
  const act = b.dataset.sch;
  if (act === 'view') { sch.view = b.dataset.v; render(); }
  else if (act === 'prev' || act === 'next') {
    const dir = act === 'next' ? 1 : -1;
    if (sch.view === 'calendar') sch.month = new Date(sch.month.getFullYear(), sch.month.getMonth() + dir, 1);
    else sch.from = addDays(sch.from, dir * 30);
    render();
  }
  else if (act === 'today') { sch.month = null; sch.from = null; render(); }
  else if (act === 'add') eventDialog({ date: b.dataset.date, accId: b.dataset.acc });
  else if (act === 'event') eventDialog({ accId: b.dataset.id, evId: b.dataset.ev });
  else if (act === 'day') dayDialog(b.dataset.date);
  else if (act === 'open-acc') location.href = accountLink({ id: b.dataset.id });
  else if (act === 'plan') planDialog(b.dataset.id);
  else if (act === 'autofill') autofillPlan(b.dataset.id);
  else if (act === 'delete') deleteEvent(b.dataset.id, b.dataset.ev);
  else if (act === 'close') dialogEl().close();
});
document.addEventListener('change', e => {
  if (isEl(e.target, '[data-sch-filter]')) { sch.acc = e.target.value; render(); }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'eventForm') { e.preventDefault(); saveEvent(e.target); }
  else if (e.target.id === 'planForm') { e.preventDefault(); savePlan(e.target); }
});
