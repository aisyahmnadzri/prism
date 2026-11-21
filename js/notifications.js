// PRISM — Notifications: a bell in the header, a dropdown of recent items, a full page and per-person preferences.
// The feed is derived from what already happened in PRISM (approvals, history, messages, schedule, deadlines),
// so nothing has to be "sent". Only read state and preferences are stored. Loaded before app.js.

const NOTIF_KEY = 'prism_notifs_v3';
const NOTIF_KINDS = {
  approval: { label: 'Approvals', icon: 'check', color: '#7c3aed', desc: 'Someone needs your approval to move a POC forward' },
  stage: { label: 'Stage updates', icon: 'kanban', color: '#0ea5e9', desc: 'Requests, approvals, returns and decisions on your accounts' },
  account: { label: 'Assignments', icon: 'users', color: '#14b8a6', desc: "You're added to or reassigned on an account" },
  mention: { label: 'Mentions', icon: 'at', color: '#f43f5e', desc: 'Someone @mentions you in a conversation' },
  message: { label: 'Messages', icon: 'chat', color: '#6366f1', desc: 'New direct, group and account-thread messages' },
  schedule: { label: 'Schedule', icon: 'calendar', color: '#f59e0b', desc: 'A reminder the day before events on your accounts' },
  alert: { label: 'Deadlines', icon: 'alert', color: '#e11d48', desc: 'A stage target is coming up or has passed' },
  ticket: { label: 'Tickets', icon: 'ticket', color: '#0d9488', desc: 'Tickets assigned to you, comments, status changes and due dates' },
};
const notifUI = { open: false, filter: 'all', seen: null };
const HISTORY_WINDOW_DAYS = 14;

// ---------- Store (per person: read items, "mark all read" time, preferences) ----------
function notifStore() { try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}; } catch (e) { return {}; } }
function saveNotif(s) { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
const blankMe = () => ({ readIds: {}, readAllAt: new Date(0).toISOString(), prefs: {} });
function notifMe() { return notifStore()[user.id] || blankMe(); }
function updateMe(fn) { const s = notifStore(); s[user.id] = s[user.id] || blankMe(); fn(s[user.id]); saveNotif(s); }
const prefOn = k => notifMe().prefs[k] !== false;
const isUnread = (i, me = notifMe()) => !me.readIds[i.id] && i.at > me.readAllAt;
// Which accounts a person follows. Higher Management follows accounts sitting at their approval stages.
const followsAccount = a => user.role === 'HM' ? !a.outcome && stageOf(a).approver === 'HM' : canView(a);

// ---------- Feed ----------
function buildFeed({ includeMuted = false } = {}) {
  const items = [], now = Date.now(), horizon = now - HISTORY_WINDOW_DAYS * 86400000;
  const add = o => { const t = new Date(o.at).getTime(); if (t >= horizon && t <= now + 60000) items.push(o); };
  const acc = a => `<span class="n-acc">${esc(a.name)}</span>`;

  accounts.filter(a => !a.archived).forEach(a => {
    if (canApprove(a)) {
      const route = approvalRoute(a), rules = approvalRules(), w = waitDays(a);
      const move = a.stage === 10 ? 'Go / No-Go decision' : `${esc(stageOf(a).name)} → ${esc(STAGES[a.stage].name)}`;
      const ask = route.step === 'recommend' ? 'needs your recommendation' : 'needs your approval';
      add({ id: `apr:${a.id}:${a.pending.at}:${route.step}`, kind: 'approval', at: (a.pending.recommendation || {}).at || a.pending.at, href: 'approvals.html',
        html: `<b>${esc(nameOf(a.pending.by))}</b> ${ask}: ${move} ${acc(a)}` });
      // Reminder once a request has waited too long, and an alert when it's escalated to the Team Lead
      const responsible = route.primary.includes(user.id) || route.delegates.some(d => d.to === user.id);
      if (w >= rules.remindDays && responsible) add({ id: `rem:${a.id}:${a.pending.at}`, kind: 'approval', href: 'approvals.html',
        at: addDays(new Date(a.pending.at), rules.remindDays).toISOString(),
        html: `<b>Reminder:</b> ${acc(a)} has waited <b>${w} days</b> for your ${route.step === 'recommend' ? 'recommendation' : 'approval'}` });
      if (route.escalated && !route.primary.includes(user.id)) add({ id: `esc:${a.id}:${a.pending.at}`, kind: 'approval', href: 'approvals.html',
        at: addDays(new Date(a.pending.at), rules.escalateDays).toISOString(),
        html: `<b>Escalated to you:</b> ${acc(a)} has waited ${w} days for ${esc(route.primary.map(nameOf).join(', '))}` });
    }
    if (!followsAccount(a)) return;

    a.history.forEach((h, i) => {
      if (h.by === user.id) return;
      const t = h.text;
      let kind = null;
      if (/^(Approved:|Returned for rework|Decision:|Skipped optional stage|Withdrew|Recommended)/.test(t)) kind = 'stage';
      else if (/^Requested (approval|Go)/.test(t) && !canApprove(a)) kind = 'stage';
      else if (t === 'Account created' && (a.am === user.id || a.devs.includes(user.id))) kind = 'account';
      else if (t.startsWith('Account Manager changed:') && t.endsWith('→ ' + user.name)) kind = 'account';
      else if (t.startsWith('Developers updated:') && t.includes(user.name)) kind = 'account';
      else if (t.startsWith('Posted a progress update') && (user.role === 'TL' || a.am === user.id)) kind = 'stage';
      if (kind) add({ id: `h:${a.id}:${h.at}:${i}`, kind, at: h.at, href: accountLink(a), html: `<b>${esc(nameOf(h.by))}</b> · ${esc(t)} ${acc(a)}` });
    });

    if (!a.outcome && user.role !== 'HM') {
      const due = stageDue(a), left = dayDiff(due, new Date());
      if (left < 0) add({ id: `od:${a.id}:${a.stage}`, kind: 'alert', at: due.toISOString(), href: accountLink(a),
        html: `<b>${esc(a.name)}</b> is past its Stage ${a.stage} target · <b>${-left}d over</b>` });
      else if (left <= 2) add({ id: `ds:${a.id}:${a.stage}`, kind: 'alert', at: addDays(due, -2).toISOString(), href: accountLink(a),
        html: `<b>${esc(a.name)}</b> Stage ${a.stage} target is <b>${left === 0 ? 'today' : left === 1 ? 'tomorrow' : 'in 2 days'}</b>` });
    }

    (a.events || []).forEach(e => {
      const d = parseYmd(e.date), diff = dayDiff(d, new Date());
      if (diff < 0 || diff > 1) return;
      const remindAt = addDays(d, -1); remindAt.setHours(8, 0, 0, 0); // 08:00 the day before
      add({ id: `ev:${e.id}:${e.date}`, kind: 'schedule', at: remindAt.toISOString(), href: 'schedule.html',
        html: `${diff === 0 ? 'Today' : 'Tomorrow'}${e.start ? ` at ${e.start}` : ''}: <b>${esc(e.title)}</b> ${acc(a)}` });
    });
  });

  myThreads().forEach(th => {
    const href = `messages.html?t=${encodeURIComponent(th.key)}`;
    threadMsgs(th.key).forEach(m => {
      if (m.by !== user.id && mentionsMe(m)) add({ id: `mn:${m.id}`, kind: 'mention', at: m.at, href,
        html: `<b>${esc(nameOf(m.by))}</b> mentioned you in <b>${esc(th.title)}</b>: “${esc(short(m.text, 90))}”` });
    });
    const fresh = unreadIn(th.key).filter(m => !mentionsMe(m));
    if (fresh.length) {
      const last = fresh[fresh.length - 1];
      add({ id: `msg:${th.key}:${last.id}`, kind: 'message', at: last.at, href,
        html: fresh.length === 1
          ? `<b>${esc(nameOf(last.by))}</b> ${th.kind === 'dm' ? 'sent you a message' : `in <b>${esc(th.title)}</b>`}: “${esc(short(last.text, 80))}”`
          : `<b>${fresh.length} new messages</b> ${th.kind === 'dm' ? 'from' : 'in'} <b>${esc(th.title)}</b>` });
    }
  });

  if (typeof ticketFeed === 'function') ticketFeed().forEach(add);
  return items.filter(i => includeMuted || prefOn(i.kind)).sort((x, y) => y.at.localeCompare(x.at));
}

function relTime(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  const days = dayDiff(new Date(), new Date(iso));
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function notifItemHtml(i, me) {
  const k = NOTIF_KINDS[i.kind], unread = isUnread(i, me);
  return `<a class="n-item ${unread ? 'unread' : ''}" href="${i.href}" data-notif="open" data-id="${esc(i.id)}">
    <span class="n-ic" style="--k:${k.color}">${icon(k.icon)}</span>
    <span class="n-text">${i.html}<small>${k.label} · ${relTime(i.at)}</small></span>
    ${unread ? '<i class="n-dot" aria-label="Unread"></i>' : ''}</a>`;
}

// ---------- Bell + dropdown ----------
function bellHtml() {
  return `<div class="notif-wrap">
    <button type="button" class="bell" id="bellBtn" data-notif="toggle" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
      ${icon('bell')}<span class="bell-count" id="bellCount" hidden></span></button>
    <div class="notif-panel" id="notifPanel" hidden></div></div>`;
}

function renderPanel(feed, me) {
  const p = document.getElementById('notifPanel');
  if (!p) return;
  const unread = feed.filter(i => isUnread(i, me)).length;
  p.innerHTML = `<div class="n-head"><b>Notifications</b>${unread ? `<span class="t-badge">${unread}</span>` : ''}
      <span style="flex:1"></span>${unread ? '<button type="button" class="link-plain" data-notif="readall">Mark all as read</button>' : ''}</div>
    <div class="n-list">${feed.slice(0, 8).map(i => notifItemHtml(i, me)).join('') || `<div class="n-empty">${icon('check')}<b>You're all caught up</b><span>New notifications will show up here.</span></div>`}</div>
    <a class="n-foot" href="notifications.html">View all notifications ${icon('arrow')}</a>`;
}

function renderBell() {
  const c = document.getElementById('bellCount');
  if (!c) return;
  const feed = buildFeed(), me = notifMe();
  const n = feed.filter(i => isUnread(i, me)).length;
  c.hidden = !n;
  c.textContent = n > 9 ? '9+' : n;
  document.getElementById('bellBtn').setAttribute('aria-label', n ? `Notifications, ${n} unread` : 'Notifications');
  if (notifUI.open) renderPanel(feed, me);
  popNew(feed, me);
}

// Pop up anything that arrived while this page is open (e.g. a mention sent from another tab).
function popNew(feed, me) {
  const unread = feed.filter(i => isUnread(i, me));
  if (!notifUI.seen) { notifUI.seen = new Set(unread.map(i => i.id)); return; }
  const fresh = unread.filter(i => !notifUI.seen.has(i.id));
  fresh.forEach(i => notifUI.seen.add(i.id));
  if (fresh.length && typeof toast === 'function') {
    const tmp = document.createElement('div'); tmp.innerHTML = fresh[0].html;
    toast(`🔔 ${tmp.textContent.trim().slice(0, 90)}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`);
  }
}

function setPanel(open) {
  notifUI.open = open;
  const p = document.getElementById('notifPanel'), b = document.getElementById('bellBtn');
  if (!p) return;
  p.hidden = !open;
  b.setAttribute('aria-expanded', String(open));
  b.classList.toggle('on', open);
  if (open) renderPanel(buildFeed(), notifMe());
}

function markAllRead() {
  updateMe(me => { me.readAllAt = new Date().toISOString(); me.readIds = {}; });
  renderBell();
  if (page === 'notifications') render();
}

// ---------- Notifications page ----------
function notificationsPage() {
  const me = notifMe(), feed = buildFeed();
  const unreadCount = feed.filter(i => isUnread(i, me)).length;
  const filters = [['all', 'All', feed.length], ['unread', 'Unread', unreadCount],
    ...Object.entries(NOTIF_KINDS).map(([k, v]) => [k, v.label, feed.filter(i => i.kind === k).length])];
  const shown = feed.filter(i => notifUI.filter === 'all' || (notifUI.filter === 'unread' ? isUnread(i, me) : i.kind === notifUI.filter));
  const groups = {};
  shown.forEach(i => {
    const diff = dayDiff(new Date(), new Date(i.at));
    const label = diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : 'Earlier';
    (groups[label] = groups[label] || []).push(i);
  });
  const muted = notifUI.filter in NOTIF_KINDS && !prefOn(notifUI.filter);
  const list = shown.length
    ? Object.entries(groups).map(([l, xs]) => `<div class="n-group"><div class="n-group-head">${l}</div>${xs.map(i => notifItemHtml(i, me)).join('')}</div>`).join('')
    : `<div class="n-empty big">${icon(muted ? 'bell' : 'check')}<b>${muted ? "You've turned these off" : 'Nothing here'}</b>
        <span>${muted ? 'Switch them back on under Preferences.' : notifUI.filter === 'unread' ? "You're all caught up." : 'Notifications from the last two weeks show up here.'}</span></div>`;
  const prefs = Object.entries(NOTIF_KINDS).map(([k, v]) => `<label class="pref-row">
      <span class="n-ic" style="--k:${v.color}">${icon(v.icon)}</span>
      <span class="pref-text"><b>${v.label}</b><small>${v.desc}</small></span>
      <input type="checkbox" class="switch" data-notif-pref="${k}" ${prefOn(k) ? 'checked' : ''} aria-label="${v.label}"></label>`).join('');
  return `<div class="notif-page">
    <div class="card n-main">
      <div class="n-toolbar"><div class="n-chips">${filters.map(([k, l, n]) => `<button type="button" class="chip-btn ${notifUI.filter === k ? 'on' : ''}" data-notif="filter" data-f="${k}">${l}${n ? `<span>${n}</span>` : ''}</button>`).join('')}</div>
        ${unreadCount ? `<button type="button" class="btn btn-sm" data-notif="readall">${icon('check')} Mark all as read</button>` : ''}</div>
      ${list}
    </div>
    <aside class="card n-prefs"><div class="panel-head"><span class="panel-ic">${icon('bell')}</span><div><h3 class="card-title">Preferences</h3><p class="hint">Choose what notifies you</p></div></div>${prefs}
      <p class="sub n-note">Notifications cover the last ${HISTORY_WINDOW_DAYS} days. Email and phone alerts come with the backend.</p></aside>
  </div>`;
}

// ---------- Events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-notif]');
  if (!b) {
    if (notifUI.open && !e.target.closest('.notif-wrap')) setPanel(false);
    return;
  }
  const act = b.dataset.notif;
  if (act === 'toggle') setPanel(!notifUI.open);
  else if (act === 'readall') markAllRead();
  else if (act === 'open') updateMe(me => { me.readIds[b.dataset.id] = true; }); // link then navigates
  else if (act === 'filter') { notifUI.filter = b.dataset.f; render(); }
});
document.addEventListener('change', e => {
  if (!isEl(e.target, '[data-notif-pref]')) return;
  const k = e.target.dataset.notifPref, on = e.target.checked;
  updateMe(me => { me.prefs[k] = on; });
  toast(`${NOTIF_KINDS[k].label} notifications ${on ? 'on' : 'off'}`);
  render();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && notifUI.open) { setPanel(false); document.getElementById('bellBtn')?.focus(); } });
// Changes made in another tab: refresh accounts and the bell (messaging.js reloads its own store first).
window.addEventListener('storage', e => {
  if (![STORE_KEY, MSG_KEY, NOTIF_KEY].includes(e.key) || typeof render !== 'function') return;
  if (e.key === STORE_KEY) accounts = loadAccounts();
  if (page === 'notifications') render(); else renderBell();
});
